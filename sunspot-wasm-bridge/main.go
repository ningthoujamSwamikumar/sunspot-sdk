package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"syscall/js"

	"sunspot/go/acir"
	"sunspot/go/bn254"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/constraint"
)

func generateProofWrapper(this js.Value, args []js.Value) any {
	// --- 1. ARGUMENT CHECK ---
	if len(args) < 4 {
		return "Error: Expected 4 arguments (acir, witness, ccs, pk)"
	}

	// --- 2. BYTE EXTRACTION (Add this snippet here) ---
	acirBytes := jsToBytes(args[0])
	witnessBytes := jsToBytes(args[1])
	ccsBytes := jsToBytes(args[2])
	pkBytes := jsToBytes(args[3])

	// --- 3. ACIR LOADING ---
	// This SINGLE line parses the JSON, finds the bytecode, base64 decodes it,
	// unzips it, and loads it into memory. Sunspot is doing the heavy lifting here!
	var circuit acir.ACIR[*bn254.BN254Field, constraint.U64]
	if err := json.Unmarshal(acirBytes, &circuit); err != nil {
		return fmt.Sprintf("ACIR Parse Error: %v", err)
	}

	// --- 4. WITNESS LOADING (Memory-Safe) ---
	// We pass the byte array directly into our new Reader function.
	// It handles the stacks and the Gnark conversion internally!
	witness, err := circuit.GetWitnessFromReader(bytes.NewReader(witnessBytes), ecc.BN254.ScalarField())
	if err != nil {
		return fmt.Sprintf("Witness Generation Error: %v", err)
	}

	// --- 5. CCS & PK LOADING ---
	ccs := groth16.NewCS(ecc.BN254)
	if _, err := ccs.ReadFrom(bytes.NewReader(ccsBytes)); err != nil {
		return fmt.Sprintf("CCS Load Error: %v", err)
	}

	pk := groth16.NewProvingKey(ecc.BN254)
	if _, err := pk.ReadFrom(bytes.NewReader(pkBytes)); err != nil {
		return fmt.Sprintf("PK Load Error: %v", err)
	}

	// --- 6. PROOF GENERATION ---
	proof, err := groth16.Prove(ccs, pk, witness)
	if err != nil {
		return fmt.Sprintf("Proving Error: %v", err)
	}

	// --- 7. RESULT EXPORT ---
	pubWitness, _ := witness.Public()
	var pubBuf, proofBuf bytes.Buffer
	pubWitness.WriteTo(&pubBuf)
	proof.WriteRawTo(&proofBuf)

	res := js.Global().Get("Object").New()
	res.Set("proof", toUint8Array(proofBuf.Bytes()))
	res.Set("publicInputs", toUint8Array(pubBuf.Bytes()))
	return res
}

// --- HELPERS (Add these at the bottom of the file) ---

func jsToBytes(v js.Value) []byte {
	buf := make([]byte, v.Length())
	js.CopyBytesToGo(buf, v)
	return buf
}

func toUint8Array(b []byte) js.Value {
	a := js.Global().Get("Uint8Array").New(len(b))
	js.CopyBytesToJS(a, b)
	return a
}

func main() {
	// Export the function to the Global JS scope (window or global)
	js.Global().Set("generateSunspotProof", js.FuncOf(generateProofWrapper))

	// Keep the Go WASM instance alive
	select {}
}
