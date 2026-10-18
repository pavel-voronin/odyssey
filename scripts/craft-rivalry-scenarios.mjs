import {meaningFixture} from './event-meaning-scenarios.mjs';
import {forgingContext} from './forging-scenarios.mjs';
import {demonstrateCraft} from './craft-respect-scenarios.mjs';
import {createPerson} from '../modules/lineage.js';
import {npcRepairAction} from '../modules/workshop-state.js';
import {setModule} from '../rules.js';
import {observeProperty} from '../modules/property.js';
import {syncActiveActor} from '../actor-projection.js';
import {postKnifeOrder,applyKnifeOrder,reserveKnifeOrder} from '../modules/craft-rivalry.js';
export const rivalryContext=forgingContext;
export function rivalryFixture({heroSkill=1,rivalSkill=2}={}){
 const base=meaningFixture(),{s,h}=base,a=s.areas.a6,o=a.objects.find(o=>o.kind==='workshop'),p=s.people[o.owner],f={...base,a,p,o};Object.assign(p,{area:a.id,x:42,status:'resident',health:p.maxHealth||100});Object.assign(h,{area:a.id,x:42,goal:null,combat:null});
 for(const id of ['identity','forging','goods-cycle','equipment','property','item-originals','skill-branches','craft-practice','craft-rivalry','people','npc-control','npc-knowledge','relationships','craft-respect','property-damage','work'])setModule(s,id,true);
 a.length=50;const client=s.people[createPerson(s,{race:'human',role:'страж',area:a.id,x:42,alive:true,parents:[]},{initialJob:'guard'})];client.agenda.wealth=40;client.agenda.task=null;client.agenda.due=1e9;client.needs.energy=100;client.needs.hunger=0;
 a.population.push(client.id);a.objects.push({id:'resident-'+client.id,kind:'resident',person:client.id,name:client.name,x:42});
 const heroShop=a.objects.find(b=>b.kind==='workshop'&&b.id!==o.id);heroShop.owner=h.lineage;observeProperty(s,a);h.profession='clockmaker';h.goal=null;h.hp=h.maxHp;h.energy=100;h.gold=100;h.hunger=0;h.quests=[];
 p.agenda.wealth=100;p.agenda.task=null;p.agenda.due=1e9;p.needs.energy=100;p.needs.hunger=0;
 // At most two short actual witnessed public jobs/repairs per candidate.
 for(let n=0;n<heroSkill;n++){h.workAfter=0;demonstrateCraft(f);}
 for(let n=0;n<rivalSkill;n++){o.state='burned';o.damagedAt=s.tick;o.repair=null;const t={kind:'propertyRepair',target:a.id,x:42,property:o.id,remaining:3};p.agenda.task=t;for(let k=0;k<4&&o.state==='burned';k++){s.tick++;npcRepairAction(s,p,t,forgingContext);}p.agenda.task=null;}
 h.goal=null;h.energy=100;p.needs.energy=100;for(const other of Object.values(s.people))if(![h.lineage,p.id,client.id].includes(other.id))other.status='absent';syncActiveActor(s);return {...f,client,heroShop};
}
export function offerBoth(f){const q=postKnifeOrder(f.s,f.client,rivalryContext);if(!q)throw Error('No actual guard request');f.s.tick++;if(!applyKnifeOrder(f.s,f.s.people[f.h.lineage],f.client,rivalryContext))throw Error('Hero could not apply');f.s.tick++;if(!applyKnifeOrder(f.s,f.p,f.client,rivalryContext))throw Error('Artisan could not apply');return q;}
export function chooseRival(f){const q=offerBoth(f);f.s.tick=q.closes;if(!reserveKnifeOrder(f.s,f.client,rivalryContext))throw Error('No reservation');return q;}
