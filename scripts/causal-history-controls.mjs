import {mkdir,writeFile} from 'node:fs/promises';
import {serialize,step} from '../engine.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {commitmentPlan} from '../modules/commitments.js';
import {causalFixture,personalContext} from './causal-history-scenarios.mjs';
const dir='artifacts/causal-history-107';await mkdir(dir,{recursive:true});
for(const name of ['earning','abandoned','legacy']){
 const {s,h,a}=causalFixture();for(const id of ['appearance','outfit-appearance','scenery','facades','lighting','color-profile','scene-planes'])setModule(s,id,true);
 if(name==='earning'){h.gold=2;if(!commitmentPlan(s,null,false,personalContext(s)))throw Error('No actual cause-bound work');for(let i=0;i<8&&h.goal?.remaining!==1;i++)step(s);if(h.goal?.remaining!==1)throw Error('No partial real job');}
 if(name==='abandoned'){s.tick=1800;h.goal={kind:'routeWait',area:a.id,x:h.x,until:10000};}
 if(name==='legacy'){delete h.causalHistory;h.commitments.memories=[];h.goal={kind:'routeWait',area:a.id,x:h.x,until:10000};}
 syncActiveActor(s);await writeFile(`${dir}/${name}.before.json`,serialize(s));step(s);await writeFile(`${dir}/${name}.after.json`,serialize(s));console.log(name,s.tick,h.causalHistory);
}
