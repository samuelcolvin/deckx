import { defineConfig } from 'tsup'

/**
 * Two-entry build:
 *   - src/cli.ts  -> dist/cli.js (Node CLI, shebang preserved from source)
 *   - src/index.ts -> dist/index.js (browser/Vite-consumable library re-exports)
 *
 * All runtime peers (react, vite, MDX, etc.) stay external so they resolve from
 * the consumer's node_modules at runtime.
 */
export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  clean: true,
  sourcemap: false,
  dts: false,
  external: [
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
    'vite',
    '@mdx-js/rollup',
    '@vitejs/plugin-react',
    'remark-gfm',
    'vite-plugin-singlefile',
    '@iarna/toml',
  ],
})
