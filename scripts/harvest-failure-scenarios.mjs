import {createWorld,serialize} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {productionSources} from '../modules/goods.js';
import {harvestFailureTick} from '../modules/harvest-failure.js';
export const harvestContext={log(){},goal(s,kind,area,x,title,reason,extra={}){s.hero.goal={kind,area,x,title,reason,...extra};},closest(){return null;}};
export function harvestFixture({districts=true}={}){const flags=['harvest-failure','supply','goods-cycle','people','identity','origins','birthplaces','geography-frame','npc-control','npc-knowledge','background-towns',...(districts?['districts']:[])],s=createWorld(7,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),frame=s.geographyFrame,a=s.areas[frame.sites['port-west'].area],b=s.areas[frame.sites['port-east'].area],independent=s.areas[frame.sites.capital.area];
 // Authored dry-season checkpoint on real existing parcels, not a simulated long prefix.
 for(const city of [a,b]){city.climate='arid';productionSources(s,city);}independent.climate='underground';productionSources(s,independent);s.tick=4800;s.hero.area=a.id;s.hero.x=42;syncActiveActor(s);harvestFailureTick(s,harvestContext);return {s,a,b,independent,h:s.hero};}
export function beginHarvestFailure(f){f.s.tick=f.s.harvestFailures.nextAt;harvestFailureTick(f.s,harvestContext);if(!f.s.harvestFailures.events.length)throw Error('No seasonal candidate');f.event=f.s.harvestFailures.events.at(-1);return f;}
export function harvestSave(f){syncActiveActor(f.s);return serialize(f.s);}
