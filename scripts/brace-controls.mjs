import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {braceFixture} from './brace-scenarios.mjs';
const dir='artifacts/brace-109';await mkdir(dir,{recursive:true});
for(const name of ['cautious','bold','exhausted']){
 const {s,h}=braceFixture({courage:name==='bold'?.95:.1});for(const id of ['appearance','outfit-appearance','scenery','facades','lighting','color-profile','scene-planes'])setModule(s,id,true);if(name==='exhausted')h.energy=7;
 syncActiveActor(s);await writeFile(`${dir}/${name}.before.json`,serialize(s));step(s);await writeFile(`${dir}/${name}.after.json`,serialize(s));console.log(name,h.lastAction,h.energy,h.hp,h.defenseMemory?.braces);
}
