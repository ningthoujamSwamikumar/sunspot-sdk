import { wasmBase64 } from './wasmBinary';
import { gunzipSync } from 'fflate'; // Import the tiny universal unzipper
import './wasm_exec.js';

function decodeBase64(base64: string): Uint8Array {
    const isNodeOrBun = typeof process !== 'undefined' && process.versions &&
        (process.versions.node != null || process.versions.bun != null);

    if (isNodeOrBun) {
        const buffer = Buffer.from(base64, 'base64');
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
        const binaryString = globalThis.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }
}

export async function loadWasmBinary() {
    if (typeof (globalThis as any).Go === 'undefined') {
        throw new Error("Go WebAssembly polyfill not found.");
    }

    const go = new (globalThis as any).Go();
    const zippedBytes = decodeBase64(wasmBase64);
    const wasmBytes = gunzipSync(zippedBytes);

    // 1. Instantiate the WebAssembly module
    const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
    
    // 2. Safely grab the instance regardless of which API signature was used
    const instance = 'instance' in result ? result.instance : result;
    
    // 3. Boot the Go runtime (Do NOT await this, or it will block forever)
    go.run(instance).catch((err: any) => console.error("Go WASM crashed:", err));

    // 4. The Race Condition Killer: Wait for Go to explicitly attach the function
    let retries = 0;
    while (!(globalThis as any).generateSunspotProof) {
        await new Promise(resolve => setTimeout(resolve, 10)); // wait 10ms
        retries++;
        if (retries > 50) { // Timeout after 500ms
            throw new Error("WASM Boot Timeout: Go failed to register 'generateSunspotProof'. Check main.go!");
        }
    }
}