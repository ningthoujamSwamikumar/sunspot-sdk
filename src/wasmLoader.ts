//@ts-ignore
import { wasmBase64 } from './wasmBinary';

/**
 * Universally decodes a Base64 string into a Uint8Array in memory.
 */
function decodeBase64(base64: string): Uint8Array {
    const isNodeOrBun = typeof process !== 'undefined' && process.versions &&
        (process.versions.node != null || process.versions.bun != null);

    if (isNodeOrBun) {
        // --- NODE / BUN ---
        // Uses native C++ bindings for instant decoding
        const buffer = Buffer.from(base64, 'base64');
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
        // --- BROWSER ---
        // Uses standard web APIs
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
    // Check if the global Go object exists from your polyfills
    if (typeof (globalThis as any).Go === 'undefined') {
        throw new Error("Go WebAssembly polyfill not found.");
    }

    const go = new (globalThis as any).Go();

    // 1. Decode the embedded string synchronously in memory
    const wasmBytes = decodeBase64(wasmBase64);

    // 2. Feed the raw bytes directly into the WebAssembly engine
    const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
    go.run(result);
}