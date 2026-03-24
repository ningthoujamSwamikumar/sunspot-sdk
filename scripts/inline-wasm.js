import * as fs from 'node:fs';

const wasmPath = './sunspot_bridge.wasm';
const outPath = './src/wasmBinary.ts';

console.log("Encoding WASM to Base64...");
const wasmBuffer = fs.readFileSync(wasmPath);
const base64String = wasmBuffer.toString('base64');

const tsContent = `// Auto-generated file. Do not edit directly.\nexport const wasmBase64 = "${base64String}";\n`;

fs.writeFileSync(outPath, tsContent);
console.log(`✅ WASM embedded successfully into ${outPath}`);