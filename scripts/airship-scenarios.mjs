import assert from 'node:assert/strict';
import {createWorld,connectAreas,knownRoute,log,serialize,restore} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {recordAreaVisit,revealArea,revealRoad} from '../actor-atlas.js';
import {airshipAction} from '../modules/airship-actions.js';
export const airContext={knownRoute,log};
export function airFixture(){const flags=['equipment','identity','airships','mechanisms','geography-frame','districts','people','origins','birthplaces','travel','supply','npc-control','npc-knowledge','containers','item-originals'],s=createWorld(1,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,m=Object.values(s.airships.byId)[0],from=s.areas[m.body.area],to=s.areas[Object.keys(m.pads).find(id=>id!==from.id)],p=s.people[m.owner];
 // Selected local arrival/resource/eligible-profession boundary, not a simulated journey or lesson.
 Object.assign(h,{area:from.id,x:m.body.x,gold:80,profession:'smith',energy:100,hunger:0,hp:h.maxHp,goal:{kind:'explore',area:to.id,x:5},transit:null,combat:null,conditions:[],companions:[],quests:[],bag:[]});Object.assign(h.inventory,{rations:0,herbs:0,relics:0,potions:0});h.stories.active=null;h.destiny.completed=true;from.objects=from.objects.filter(o=>o.kind!=='enemy');p.area=from.id;p.x=m.body.x;p.needs.sleeping=false;p.needs.hunger=0;p.needs.energy=100;h.atlas={version:1,known:[],visited:[],roads:[],visits:{}};recordAreaVisit(s,from);revealArea(s,to.id);revealRoad(s,from.id,to.id);connectAreas(s,from.id,to.id,{metric:{version:1,unit:'world',distance:36,terrain:'road',speed:6}});syncActiveActor(s);return {s,h,m,p,from,to};}
export function airAct(f,kind){f.s.tick++;const ok=airshipAction(f.s,f.m.id,kind,airContext);syncActiveActor(f.s);return ok;}
export function ownedAir(f=airFixture()){assert.equal(airAct(f,'buy'),true);assert.equal(airAct(f,'learn'),true);return f;}
export function exactAir(f){syncActiveActor(f.s);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);return raw;}

