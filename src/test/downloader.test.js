import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const exec = promisify(execFile);
it('runs the native Node downloader, filters annual aggregates and preserves data after total failure',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'terrascope-download-')), output=join(folder,'snapshot.json'), preload=join(folder,'fetch.mjs');
  try {
    await writeFile(preload,`globalThis.setTimeout=(callback)=>{queueMicrotask(callback);return 1};globalThis.fetch=async()=>{if(process.env.POWER_TEST_FAIL==='1')throw new Error('offline');const data={202513:999,202600:999};for(let y=1981;y<=2025;y++)for(let m=1;m<=12;m++)data[String(y)+String(m).padStart(2,'0')]=1;return {ok:true,json:async()=>({properties:{parameter:{PRECTOTCORR:data,EVLAND:data,T2M:data}}})}};`);
    await exec(process.execPath,['--import',pathToFileURL(preload).href,'scripts/descargar-datos.mjs','--output',output],{cwd:process.cwd(),timeout:15000});
    const text=await readFile(output,'utf8'),data=JSON.parse(text);expect(data.schemaVersion).toBe(2);expect(Object.keys(data.series).length).toBeGreaterThan(30);
    for(const variables of Object.values(data.series))for(const values of Object.values(variables)){expect(values).toHaveLength((data.y1-data.y0+1)*12);expect(values.every(value=>value===1)).toBe(true);}
    await expect(exec(process.execPath,['--import',pathToFileURL(preload).href,'scripts/descargar-datos.mjs','--output',output],{cwd:process.cwd(),env:{...process.env,POWER_TEST_FAIL:'1'},timeout:15000})).rejects.toMatchObject({code:1});expect(await readFile(output,'utf8')).toBe(text);
  } finally { if(dirname(resolve(folder))!==resolve(tmpdir()))throw new Error('Unexpected test cleanup path');await rm(folder,{recursive:true,force:true}); }
},25000);
