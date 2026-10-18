import {forgingFixture,forgingContext} from './forging-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {revealArea,revealRoad,recordAreaVisit} from '../actor-atlas.js';
import {productionSources,rawSite} from '../modules/goods.js';
import {observeDeliveryMaterials} from '../modules/material-delivery.js';
import {route} from '../engine.js';
import {createPerson} from '../modules/lineage.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
export const materialDeliveryContext=forgingContext;
export function materialDeliveryFixture({ownerMode='npc',carrierMode='actor'}={}){
 const f=forgingFixture({npc:ownerMode==='npc'}),{s,h,p,a}=f;for(const id of ['material-delivery','goods-cycle','people','property','npc-control','npc-knowledge'])setModule(s,id,true);
 const client=ownerMode==='npc'?p:s.people[h.lineage];let carrier;
 if(carrierMode==='actor')carrier=s.people[h.lineage];else if(ownerMode==='actor')carrier=p;else carrier=s.people[createPerson(s,{name:'Знакомый путник',role:'торговец',race:p.race,area:a.id,x:42,alive:true},{initialJob:'merchant'})];
 if(client===carrier)throw Error('The two contract parties need separate bodies');
 if(carrierMode==='npc'){Object.assign(carrier,{area:a.id,x:42,status:'resident',health:carrier.maxHealth||100});Object.assign(carrier.agenda,{job:'merchant',duty:.5,task:null,due:s.tick});Object.assign(carrier.needs,{energy:100,hunger:0,sleeping:false});}
 const source=Object.values(s.areas).find(b=>b.type==='forest'&&route(s,a.id,b.id).length);if(!source)throw Error('Fixture requires an actual reachable raw source');
 // Prepared starting facts: a wounded owner and two people who have actually
 // visited both addresses before this observation. No delivery has happened.
 const stock=productionSources(s,a).materials;stock.used+=stock.stock;stock.stock=0;if(ownerMode==='actor')h.hp=h.maxHp*.8;else client.health=Math.floor((client.maxHealth||100)*.8);client.agenda.bonds[carrier.id]=10;client.agenda.duty=.5;delete client.materialMemory;
 const road=route(s,a.id,source.id);for(const person of [client,carrier]){for(const id of road){if(selfDrivenActor(s,person.id)){h.area=id;h.x=42;syncActiveActor(s);}else {person.area=id;person.x=42;}observeNPCPlace(s,person);observeDeliveryMaterials(s,person);}person.area=a.id;person.x=42;if(selfDrivenActor(s,person.id)){h.area=a.id;h.x=42;syncActiveActor(s);}observeNPCPlace(s,person);observeDeliveryMaterials(s,person);}
 h.area=a.id;h.x=42;h.goal=null;h.personality.generosity=.5;if(!h.memory.people.includes(p.id))h.memory.people.push(p.id);
 if(!h.memory.people.includes(carrier.id))h.memory.people.push(carrier.id);for(const id of road){revealArea(s,id);recordAreaVisit(s,id);if(!h.memory.places.includes(id))h.memory.places.push(id);}for(let i=1;i<road.length;i++)revealRoad(s,road[i-1],road[i]);rawSite(s,source);syncActiveActor(s);return {...f,source,client,carrier};
}
