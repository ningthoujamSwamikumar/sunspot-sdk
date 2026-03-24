import { wasmBase64 } from './wasmBinary';
import { unzlibSync } from 'fflate'; // Import the tiny universal unzipper
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
    
    // 1. Decode the Base64 string back into zipped bytes
    const zippedBytes = decodeBase64(wasmBase64);
    
    // 2. Unzip the bytes in memory instantly using fflate
    const wasmBytes = unzlibSync(zippedBytes);

    // 3. Boot up the WebAssembly engine
    const result = await WebAssembly.instantiate(wasmBytes, go.importObject);
    go.run(result);
}