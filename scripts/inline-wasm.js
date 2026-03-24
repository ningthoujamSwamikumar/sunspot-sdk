import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib'; // Import Node's native zipper

const wasmPath = './sunspot-wasm-bridge/sunspot_bridge.wasm';
const outPath = './src/wasmBinary.ts';

console.log("Compressing and Encoding WASM...");
try {
    const wasmBuffer = readFileSync(wasmPath);
    
    // 1. Compress the raw WASM bytes
    const zippedBuffer = gzipSync(wasmBuffer);
    
    // 2. Base64 encode the tiny zipped bytes instead of the massive raw bytes
    const base64String = zippedBuffer.toString('base64');
    
    const tsContent = `// Auto-generated file. Do not edit directly.\nexport const wasmBase64 = "${base64String}";\n`;
    
    writeFileSync(outPath, tsContent);
    console.log(`✅ Compressed WASM embedded successfully into ${outPath}`);
} catch (error) {
    console.error("❌ Failed to encode WASM.", error);
    process.exit(1);
}