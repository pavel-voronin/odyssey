import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {serviceFixture} from './service-access-scenarios.mjs';
const dir='artifacts/service-access-104';await mkdir(dir,{recursive:true});
for(const name of ['clinic-open','clinic-closed','work-unpaid']){
 const {s,h,a,doctor}=serviceFixture();for(const id of ['appearance','outfit-appearance','scenery','facades','lighting','color-profile','scene-planes'])setModule(s,id,true);
 h.hunger=0;h.hp=10;
 if(name.startsWith('clinic')){setModule(s,'body',true);setModule(s,'poison-care',true);h.conditions=[{id:'poison',until:s.tick+80}];h.goal={kind:'rest',area:a.id,x:68};if(name==='clinic-closed'){doctor.area='a1';doctor.status='travelling';}}
 else{h.hp=h.maxHp;h.x=42;a.civic.treasury=0;h.goal={kind:'work',area:a.id,x:42,job:'repair',remaining:5,workplace:{id:a.objects.find(o=>o.kind==='workshop').id,area:a.id}};}
 syncActiveActor(s);await writeFile(`${dir}/${name}.before.json`,serialize(s));step(s);await writeFile(`${dir}/${name}.after.json`,serialize(s));console.log(name,h.lastAction,h.reason,a.civic);
}
