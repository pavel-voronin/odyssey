import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {build} from '../scripts/build.mjs';
test('every local stylesheet and script referenced by the published HTML exists in the checked payload',async()=>{
 const release=await build(),html=await readFile(path.join(release.dir,'index.html'),'utf8');
 const assets=[...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map(m=>m[1]).filter(name=>!name.includes('://'));
 assert.ok(assets.some(name=>name.startsWith('viewport.')&&name.endsWith('.css')),'the portrait stylesheet must ship');
 for(const name of assets){assert.ok(release.files.includes(name),`missing public asset: ${name}`);const bytes=await readFile(path.join(release.dir,name));assert.equal(createHash('sha256').update(bytes).digest('hex'),release.manifest.files[name]);}
});
