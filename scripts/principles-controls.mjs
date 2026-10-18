import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {principleFixture,prepareSecondCase} from './principles-scenarios.mjs';
const dir='artifacts/principles-108';await mkdir(dir,{recursive:true});
for(const name of ['reflecting','investigate','hurry']){
 const {s,h}=principleFixture({interested:name!=='hurry'});for(const id of ['appearance','outfit-appearance','scenery','facades','lighting','color-profile','scene-planes'])setModule(s,id,true);
 if(name==='investigate'){for(let i=0;i<3;i++)step(s);prepareSecondCase(s);}
 if(name==='hurry'){step(s);prepareSecondCase(s);}
 syncActiveActor(s);await writeFile(`${dir}/${name}.before.json`,serialize(s));for(let i=0;i<(name==='reflecting'?3:name==='hurry'?2:1);i++)step(s);await writeFile(`${dir}/${name}.after.json`,serialize(s));console.log(name,s.tick,h.principles,h.goal?.area);
}
