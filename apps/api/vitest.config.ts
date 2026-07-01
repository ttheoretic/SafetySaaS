import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  // SWC transforms TypeScript with full decorator-metadata support, which
  // NestJS dependency injection relies on (esbuild cannot emit it). NOTE: this
  // config only applies when vitest runs from this workspace (`npm run test -w
  // apps/api`, as `npm test` and CI do) — running vitest from the repo root
  // bypasses it and Nest DI breaks (undefined Reflector in guards).
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
  },
});
