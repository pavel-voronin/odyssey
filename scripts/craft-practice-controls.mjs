import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {craftStudyPlan,craftStudyAction} from '../modules/craft-practice.js';
import {repairPlan} from '../modules/property-damage.js';
import {observeProperty} from '../modules/property.js';
import {practiceFixture,threeRepairs,breakPracticeRoom,practiceContext as ctx} from './craft-practice-scenarios.mjs';
const dir='artifacts/craft-practice-106';await mkdir(dir,{recursive:true});
for(const name of ['study','fitting']){
 const f=threeRepairs(practiceFixture()),{s,h}=f;for(const id of ['appearance','outfit-appearance','scenery','facades','lighting','color-profile','scene-planes'])setModule(s,id,true);
 h.destiny.completed=true;h.property.nextAttempt=100000;h.life.reflectAfter=100000;h.workAfter=100000;
 if(name==='fitting'){if(!craftStudyPlan(s,ctx))throw Error('No real practice source');for(let i=0;i<3;i++){s.tick++;craftStudyAction(s,ctx);}breakPracticeRoom(f);h.goal=null;observeProperty(s,f.a);if(!repairPlan(s,ctx))throw Error('No actual known repair plan');}
 syncActiveActor(s);await writeFile(`${dir}/${name}.before.json`,serialize(s));for(let i=0;i<3;i++)step(s);await writeFile(`${dir}/${name}.after.json`,serialize(s));console.log(name,h.goal?.kind,s.people[h.lineage].skillPractice);
}
