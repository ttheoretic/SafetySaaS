import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  // SWC transforms TypeScript with full decorator-metadata support, which
  // NestJS dependency injection relies on (esbuild cannot emit it).
  plugins: [swc.vite()],
  test: {
    globals: true,
    environment: 'node',
  },
});
