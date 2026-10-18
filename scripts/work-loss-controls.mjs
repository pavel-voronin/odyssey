import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,restore,step} from '../engine.js';
import {setModule} from '../rules.js';
import {workLossFixture,closeWorkplace} from './work-loss-scenarios.mjs';
import {assertSameSave} from './life-save-compare.mjs';
const dir='artifacts/work-loss-103';await mkdir(dir,{recursive:true});const rows=[];
for(const name of ['family','craft','open']){
 const f=workLossFixture({attached:name==='craft',family:name!=='open',alternative:name!=='open'});for(const id of ['appearance','outfit-appearance','scenery','facades','lighting','color-profile','scene-planes','camera-probe'])setModule(f.s,id,true);closeWorkplace(f);
 await writeFile(`${dir}/${name}.before.json`,serialize(f.s));const copy=restore(serialize(f.s));step(f.s);step(copy);assertSameSave(serialize(f.s),serialize(copy));assert.equal(f.h.workLife.loss.status,'pending');await writeFile(`${dir}/${name}.denied.json`,serialize(f.s));step(f.s);step(copy);assertSameSave(serialize(f.s),serialize(copy));assert.equal(f.h.workLife.loss.status,name);
 await writeFile(`${dir}/${name}.after.json`,serialize(f.s));rows.push({name,tick:f.s.tick,loss:f.h.workLife.loss,goal:f.h.goal,remainingGold:f.h.gold});
}
await writeFile(`${dir}/controls.json`,JSON.stringify(rows,null,2));console.log(rows.map(r=>({name:r.name,tick:r.tick,status:r.loss.status,goal:r.goal?.kind,gold:r.remainingGold})));
