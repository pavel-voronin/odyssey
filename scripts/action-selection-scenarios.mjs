import {createWorld,step,serialize,knownRoute,log} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {recordAreaVisit} from '../actor-atlas.js';
import {commonContext} from './common-life-scenarios.mjs';
export const selectionContext={...commonContext,knownRoute,log};
export function selectionFixture(extra=[]){
 const flags=['people','origins','birthplaces','work',...extra],s=createWorld(1,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero,a=s.areas.a1;
 Object.assign(h,{area:a.id,x:42,hp:h.maxHp,energy:100,hunger:0,gold:0,goal:null,transit:null,combat:null,conditions:[],companions:[],quests:[],bag:[],habits:[]});Object.assign(h.inventory,{rations:2,herbs:0,potions:0,relics:0});h.career.path='peaceful';h.personality.curiosity=.8;h.stories.active=null;h.destiny.completed=true;h.commitments.personal=null;h.memory.avoided={};h.memory.rejected={};a.objects=a.objects.filter(o=>o.kind!=='enemy'&&o.kind!=='encounter');a.expanded=true;h.atlas={version:1,known:[],visited:[],roads:[],visits:{}};recordAreaVisit(s,a);h.memory.places=[a.id];syncActiveActor(s);return {s,h,a};
}
export function unknownRouteWork(){const f=selectionFixture(),{s,h}=f;h.goal={kind:'explore',area:'a3',x:84,started:s.tick};return f;}
export function runSelection(f,n=1){if(n>16)throw Error('Small fixture tick limit');for(let i=0;i<n;i++)step(f.s);syncActiveActor(f.s);return f;}
export function selectionSave(f){syncActiveActor(f.s);return serialize(f.s);}
