import {peopleTick} from '../modules/people.js';
import {areaScale} from '../geometry.js';
import assert from 'node:assert/strict';
import {stealthFixture,postedStealth,approachPost,exactStealth,stealthContext} from './stealth-scenarios.mjs';
import {step} from '../engine.js';import {setModule} from '../rules.js';
import {buyDecoyTool,workDecoy} from '../modules/decoys.js';
import {heldDecoy} from '../modules/decoy-state.js';
import {syncActiveActor,setActorMoney} from '../actor-projection.js';
import {workspaceAccess,workshopAt} from '../modules/property.js';
import {workshopSite} from '../modules/workshop-place.js';
export const decoyContext={...stealthContext,workspaceAccess:s=>workspaceAccess(s,stealthContext)};
export function decoyFixture(){
 const f=postedStealth(stealthFixture({extra:['property','forging','goods-cycle','local-market','item-originals','noise-decoys']})),{s,h,p}=f;approachPost(f);step(s);assert.ok(p.stealth.known.length);
 for(const id of ['noise-decoys','forging','property','goods-cycle','local-market','item-originals'])setModule(s,id,true);
 const a=Object.values(s.areas).find(a=>a.district==='Мастерские'),artisan=a.population.map(id=>s.people[id]).find(p=>p.agenda.job==='artisan');artisan.status='resident';const o=workshopAt(s,a);assert.ok(o);artisan.status='absent';o.owner=p.id;o.state='intact';o.closed=false;o.offer=null;
 const reserve=Object.values(s.areas).find(q=>q.id!==a.id&&q.civic?.treasury>=50);assert.ok(reserve);reserve.civic.treasury-=50;setActorMoney(s,p,h.gold+50);
 h.area=a.id;h.x=58;h.energy=100;h.hunger=0;h.goal=null;syncActiveActor(s);return {...f,a,o,site:workshopSite(s,a,o.id)};
}
export function craftedDecoy(f=decoyFixture()){
 const {s,h,p,o}=f;s.tick++;assert.equal(buyDecoyTool(s,p),true);h.x=o.x;h.goal={kind:'decoyWork',area:h.area,x:o.x,property:o.id,started:s.tick};syncActiveActor(s);
 for(let i=0;i<2;i++){s.tick++;assert.equal(workDecoy(s,p,o.id),true);}h.goal=null;f.item=heldDecoy(s,p.id);assert.equal(f.item.decoy.state,'ready');exactStealth(s);return f;
}
export {exactStealth as exactDecoy};

export function frontDecoy(f=craftedDecoy()){const {s,guards:[g]}=f;for(const at of [40,48]){s.tick=at;g.agenda.task={kind:'patrol',target:g.area,x:g.x,remaining:1};peopleTick(s,stealthContext);}g.agenda.due=1000;s.tick=54;approachPost(f);f.h.x=g.x+16/areaScale(f.areas[0]);syncActiveActor(s);return f;}
