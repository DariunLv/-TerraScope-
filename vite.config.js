import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
// CesiumJS necesita sus archivos estáticos (Workers, Assets, Widgets): se copian solos desde node_modules a /cesium
const CESIUM = 'node_modules/cesium/Build/Cesium';
// Static-copy v4 preserves the source tree; omit its four leading directories.
// The viewer must receive /cesium/Assets and /cesium/Workers, never HTML fallbacks.
export default defineConfig({
  plugins: [react(), viteStaticCopy({ targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map((d) => ({ src: `${CESIUM}/${d}`, dest: 'cesium', rename: { stripBase: 4 } })) })],
  base: './',
  build: { chunkSizeWarningLimit: 6000 },
});
