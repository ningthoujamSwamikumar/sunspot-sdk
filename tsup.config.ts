import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // Builds for Node and Browser/Bun
  dts: true,              // Generates TypeScript declaration files
  splitting: false,
  sourcemap: true,
  clean: true,            // Cleans the dist folder before building
  target: 'es2022',
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
    };
  },
});