import {createWorld,connectAreas,step,log,knownRoute,serialize} from '../engine.js';
import {MODULES} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {revealArea,revealRoad,recordAreaVisit} from '../actor-atlas.js';
import {horseAction} from '../modules/horse-actions.js';
export const horseContext={log,knownRoute};
export function horseFixture(seed=1){const flags=['riding','geography-frame','districts','people','origins','birthplaces','travel','supply','npc-control','containers','item-originals'],s=createWorld(seed,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,m=Object.values(s.horses.byId)[0],p=s.people[m.owner],from=s.areas[m.body.area],to=s.areas[from.links.find(id=>s.edges[[from.id,id].sort().join('|')]?.metric)];
 Object.assign(h,{area:from.id,x:m.body.x,gold:80,energy:100,hunger:0,hp:h.maxHp,goal:{kind:'explore',area:to.id,x:5},transit:null,combat:null,conditions:[],companions:[],quests:[],bag:[]});Object.assign(h.inventory,{rations:0,herbs:0,relics:0,potions:0});h.stories.active=null;h.destiny.completed=true;from.objects=from.objects.filter(o=>o.kind!=='enemy');p.area=from.id;p.x=m.body.x;p.needs.sleeping=false;h.atlas={version:1,known:[],visited:[],roads:[],visits:{}};recordAreaVisit(s,from);revealArea(s,to.id);revealRoad(s,from.id,to.id);connectAreas(s,from.id,to.id,{metric:{version:1,unit:'world',distance:36,terrain:'road',speed:6}});syncActiveActor(s);return {s,h,m,p,from,to};}
// Isolated action harness: one explicit world phase per action, no unrelated life simulation.
export function horseAct(f,kind,item=null){f.s.tick++;const result=horseAction(f.s,f.m.id,kind,horseContext,item);syncActiveActor(f.s);return result;}
export function ownHorse(f,{mounted=false}={}){if(!horseAct(f,'buy'))throw Error('Actual sale failed');if(mounted&&!horseAct(f,'mount'))throw Error('Actual mount failed');return f;}
export function horseFrame(){const f=ownHorse(horseFixture(),{mounted:true});f.h.x=55;f.m.body.x=55;f.h.lastAction='walk';syncActiveActor(f.s);return f;}
export function horseSnapshot(f){syncActiveActor(f.s);return serialize(f.s);}
