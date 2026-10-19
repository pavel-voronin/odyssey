import {workshopAt} from '../modules/property.js';
import {createWorld,serialize,route,connectAreas} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {triggerEarthquake} from '../modules/earthquakes.js';
import {observeNPCPlace} from '../modules/npc-knowledge.js';
import {observeFreightActor} from '../modules/freight-memory.js';
export const quakeContext={log(){},route,knownRoute:route,gainXp(){}};
export function earthquakeFixture({bypass=false}={}){
 const flags=['earthquakes','world-eras','historical-calendar','geography-frame','identity','people','districts','origins','birthplaces','facades','building-ruins','property','property-damage','goods-cycle','npc-control','npc-knowledge','migration-knowledge','migrations','background-towns','supply','ferry','travel','npc-logistics','freight-disruptions'],s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,frame=s.geographyFrame,from=s.areas[frame.sites['port-west'].area],to=s.areas[frame.sites['port-east'].area],sea=s.areas[frame.sites.strait.area],independent=s.areas[frame.sites.capital.area],keys=[[from.id,to.id],[from.id,sea.id]].map(a=>a.sort().join('|')),shopArea=(from.districts||[]).map(id=>s.areas[id]).find(a=>a.district==='Мастерские'),shop=shopArea&&workshopAt(s,shopArea),owner=s.people[shop?.owner];if(!shop||!owner)throw Error('No actual coastal owned workshop');
 const otherShop=(to.districts||[]).map(id=>s.areas[id]).find(a=>a.district==='Мастерские');if(otherShop)workshopAt(s,otherShop);if(bypass)connectAreas(s,independent.id,to.id,{mode:'portal',duration:3,cost:1});Object.assign(h,{area:from.id,x:90,hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,conditions:[],companions:[],quests:[],habits:[],goal:null});h.stories.active=null;h.destiny.completed=true;for(const a of [from,to,independent,shopArea])for(const e of a.objects)if(e.kind==='enemy'){e.alive=false;e.resolved=true;}owner.agenda.task=null;Object.assign(owner.needs,{energy:100,hunger:0,sleeping:false});syncActiveActor(s);return {s,h,from,to,sea,keys,independent,shopArea,shop,owner,zone:from.geography.region};
}
export function applyQuake(f){const event=triggerEarthquake(f.s,f.zone,{keys:f.keys,ctx:quakeContext});if(!event)throw Error('Actual regional quake refused');f.event=event;return f;}
export function quakeSave(f){syncActiveActor(f.s);return serialize(f.s);}
export function visitQuakePlace(f,p,a){const area=p.area,x=p.x;p.area=a.id;p.x=42;observeNPCPlace(f.s,p);observeFreightActor(f.s,p);p.area=area;p.x=x;}
