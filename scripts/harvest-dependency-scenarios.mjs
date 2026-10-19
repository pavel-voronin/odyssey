import {harvestFixture,beginHarvestFailure,harvestSave} from './harvest-failure-scenarios.mjs';
import {setModule} from '../rules.js';import {route,connectAreas} from '../engine.js';
import {takeGoods,completeGoodsWork,productionSources} from '../modules/goods.js';
import {localDemand} from '../modules/demand-freight.js';import {observeFreightActor} from '../modules/freight-memory.js';import {advanceFreight} from '../modules/freight.js';
export const dependencyContext={route,log(){},gainXp(){}};
export {harvestSave as dependencySave};
export function knownFreightPlace(s,p,a){const area=p.area,x=p.x;p.area=a.id;p.x=42;observeFreightActor(s,p);p.area=area;p.x=x;}
export function drainTo(s,a,n){if(a.civic.food<n)throw Error('Checkpoint needs finite existing food');takeGoods(s,a,'food',a.civic.food-n,{flow:'consumed',reason:'prepared-local-meals'});}
export function dependencyFixture(){const f=beginHarvestFailure(harvestFixture()),{s}=f;for(const id of ['demand-freight','npc-logistics','local-market','travel'])setModule(s,id,true);const a=s.areas[f.event.areas[0]],b=s.areas[s.geographyFrame.sites.center.area],c=f.independent;if(a.id===b.id)throw Error('Need separate target');connectAreas(s,a.id,b.id,{mode:'road'});connectAreas(s,c.id,b.id,{mode:'road'});connectAreas(s,a.id,c.id,{mode:'road'});
 const p=(a.population||[]).map(id=>s.people[id]).find(p=>p.alive&&p.id!==s.hero.lineage&&p.agenda),q=(c.population||[]).map(id=>s.people[id]).find(p=>p.alive&&p.id!==s.hero.lineage&&p.agenda);if(!p||!q)throw Error('No actual carriers');for(const person of [p,q]){person.agenda.duty=.8;person.agenda.task=null;person.status='resident';Object.assign(person.needs,{energy:100,hunger:0,sleeping:false});person.x=42;}
 drainTo(s,b,0);b.civic.medicine=40;for(const city of [a,c]){drainTo(s,city,localDemand(s,city).food+6);city.civic.medicine=30;takeGoods(s,city,'tools',city.civic.tools,{flow:'consumed',reason:'prepared-maintenance'});}knownFreightPlace(s,p,b);knownFreightPlace(s,p,c);observeFreightActor(s,p);knownFreightPlace(s,q,b);knownFreightPlace(s,q,a);observeFreightActor(s,q);return {...f,a,b,c,p,q};}
export function poorHarvest(f){const {s,a,p}=f;drainTo(s,a,localDemand(s,a).food+6);const food=a.civic.food,r=completeGoodsWork(s,a,{id:p.id+'/short-harvest/'+s.tick,actor:p.id,spent:3,required:3});if(r.quantity!==3)throw Error('No actual half harvest');return {food,r};}
// Prepared final approach of each real existing road leg: same person/load/path,
// no fabricated receipt or delivery. At most7 native freight actions, no long travel.
export function finishShortFreight(s,c){let acts=0;while(s.logistics.convoys.includes(c)&&acts<8){const p=s.people[c.person];if(p.roadTransit?.metric){p.roadTransit.metric.travelled=p.roadTransit.metric.distance-.01;p.roadTransit.remaining=1;}c.remaining=1;c.startX=p.x;c.segmentTicks=1;s.tick++;advanceFreight(s,c,dependencyContext);acts++;}if(s.logistics.convoys.includes(c))throw Error('Short freight did not complete');return acts;}
