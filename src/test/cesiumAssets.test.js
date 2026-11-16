import { expect, it } from 'vitest';
import { createServer } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import config from '../../vite.config.js';
it('serves Cesium textures and geometry workers at the URLs used by the viewer', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'terrascope-cesium-assets-'));
  const server = await createServer({ ...config, configFile: false, cacheDir, optimizeDeps: { noDiscovery: true, entries: [], include: [] }, server: { host: '127.0.0.1', port: 0, hmr: false, watch: null }, logLevel: 'error' });
  try {
    await server.listen(); const { port } = server.httpServer.address(), base = `http://127.0.0.1:${port}/cesium/`;
    const files = [
      ['Assets/Textures/NaturalEarthII/tilemapresource.xml', 'xml'],
      ['Assets/Textures/NaturalEarthII/0/0/0.jpg', 'image/jpeg'],
      ['Assets/Textures/NaturalEarthII/0/1/0.jpg', 'image/jpeg'],
      ['Workers/createEllipseGeometry.js', 'javascript'],
    ];
    for (const [path, type] of files) {
      const response = await fetch(base + path); expect(response.status).toBe(200); expect(response.headers.get('content-type')).toContain(type);
      const bytes = new Uint8Array(await response.arrayBuffer()); expect(bytes.length).toBeGreaterThan(100);
      if (type === 'image/jpeg') expect([...bytes.slice(0,2)]).toEqual([255,216]);
      else expect(new TextDecoder().decode(bytes)).not.toContain('<!doctype html>');
    }
  } finally {
    await server.close();
    if (dirname(resolve(cacheDir)) !== resolve(tmpdir())) throw new Error('Unexpected test cache cleanup path');
    await rm(cacheDir, { recursive: true, force: true });
  }
},30000);
