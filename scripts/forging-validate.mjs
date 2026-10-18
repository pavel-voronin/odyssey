import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {restore,serialize} from '../engine.js';
const dir='artifacts/forge-145',json=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const f=await json(dir+'/source-freeze.json'),a=await json(dir+'/audit.json'),n=await json(dir+'/native.json');
for(const [file,h]of Object.entries(f.files))assert.equal(hash(await fs.readFile(file)),h,file);
assert.equal(a.revision,f.revision);assert.equal(n.revision,f.revision);assert.equal(a.steps,14720);assert.equal(a.checks,390);assert.equal(a.rows.length,10);
const manifest=await json(dir+'/runtime-'+f.revision+'/release.json');assert.equal(manifest.revision,f.revision);
for(const [file,h]of Object.entries(f.publicFiles))assert.equal(hash(await fs.readFile(dir+'/runtime-'+f.revision+'/'+file)),h,file);
assert.deepEqual(n.frames.map(v=>v.width).sort((a,b)=>a-b),[320,390]);assert.deepEqual(n.console,[]);assert.ok(n.closed&&n.viewportReset&&n.imported);
for(const v of n.frames){assert.equal(v.documentWidth,v.width);assert.equal(v.documentHeight,v.height);assert.ok((await fs.stat(dir+'/'+v.file)).size>1000);}
const raw=await fs.readFile(dir+'/native-export.json','utf8'),s=restore(raw);assert.equal(serialize(s),raw);
const p=s.people[s.hero.lineage],orders=Object.values(p.forging.orders),o=orders.find(o=>o.status==='completed');assert.ok(o);assert.equal(o.progress,o.required);
const items=[...s.hero.bag,...Object.values(s.hero.equipment).filter(Boolean)].filter(i=>i.manufacture?.order===o.id);assert.equal(items.length,1);const item=items[0];assert.equal(item.creator,p.id);assert.equal(item.createdAt,o.finished);assert.equal(item.manufacture.master,p.id);assert.equal(item.manufacture.finished,o.finished);assert.equal(item.manufacture.actions,o.required);assert.equal(item.manufacture.materials.length,2);assert.ok(item.history.some(e=>e.tick===o.finished&&e.text.startsWith('Изготовлено:')));
const preflight=process.argv.includes('--preflight');let tests=null;
if(!preflight){assert.equal((await fs.readFile(dir+'/deploy-exit.txt','utf8')).trim(),'0');const log=await fs.readFile(dir+'/deploy.log','utf8'),pass=log.match(/(?:#|ℹ) pass (\d+)/),total=log.match(/(?:#|ℹ) tests (\d+)/);assert.ok(pass&&total);assert.equal(pass[1],total[1]);tests=Number(total[1]);assert.ok(tests>=1342);assert.match(log,new RegExp('Published and verified:.*'+f.revision));}
const published=process.argv.includes('--published');
if(published){assert.ok(!preflight);for(const [file,h]of Object.entries(f.publicFiles)){const response=await fetch('https://odyssey.kolpaque.dev/'+file,{signal:AbortSignal.timeout(30000),cache:'no-store'});assert.ok(response.ok,file);assert.equal(hash(Buffer.from(await response.arrayBuffer())),h,file);}const response=await fetch('https://odyssey.kolpaque.dev/release.json',{cache:'no-store'});assert.equal((await response.json()).revision,f.revision);}
const result={revision:f.revision,tests,preflight,published,steps:a.steps,checks:a.checks,nativeWidths:n.frames.map(v=>v.width),sources:Object.keys(f.files).length,publicFiles:Object.keys(f.publicFiles).length};await fs.writeFile(dir+'/validation'+(published?'-published':preflight?'-preflight':'')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
