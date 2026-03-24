//Ensure Web Crypto is available for Node.js environments
import { webcrypto } from 'node:crypto';

if (typeof globalThis !== undefined && !globalThis.crypto) {
    (globalThis as any).crypto = webcrypto;
}

// Import the unmodified Go glue code
import './wasm_exec.js';