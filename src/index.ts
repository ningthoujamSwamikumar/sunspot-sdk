import { CompiledCircuit, Noir } from "@noir-lang/noir_js";
import { loadWasmBinary } from "./wasmLoader";
import './polyfills'; // Load this first

export interface ProofResult {
    proof: Uint8Array;
    publicInputs: Uint8Array;
}

export class SunspotSDK {
    private isReady = false;
    private circuitJson: CompiledCircuit;

    constructor(circuitJson: CompiledCircuit) {
        this.circuitJson = circuitJson;
    }

    /**
     * Initializes the WASM prover environment.
     * @param wasmPath Path or URL to the sunspot_bridge.wasm file
     */
    async init(): Promise<void> {
        if (this.isReady) return;
        await loadWasmBinary();
        this.isReady = true;
    }

    /**
     * Generates a witness and a Groth16 proof in one shot.
     */
    async prove(
        inputs: Record<string, any>,
        ccsData: Uint8Array,
        pkData: Uint8Array
    ) {
        if (!this.isReady) throw new Error("SunspotSDK is not initialized. Call init() first.");

        // 1. Generate the Witness using Noir JS
        // This handles the Noir-side execution and returns the .gz bytes
        console.log("Generating witness...");
        const noir = new Noir(this.circuitJson);
        const { witness } = await noir.execute(inputs);

        // 2. Convert Circuit to Bytes for the Go Prover
        const acirBytes = new TextEncoder().encode(JSON.stringify(this.circuitJson));

        // 3. Call the Go WASM function
        const proverFunc = (globalThis as any).generateSunspotProof;
        if (!proverFunc) {
            throw new Error("WASM Bridge failed to load correctly");
        }
        const result = proverFunc(
            acirBytes,
            witness,
            ccsData,
            pkData
        );

        // 4. Handle Go string errors
        if (typeof result === 'string') {
            throw new Error(`WASM Proving Error: ${result}`);
        }

        return {
            proof: result.proof as Uint8Array,
            publicInputs: result.publicInputs as Uint8Array
        };
    }
}