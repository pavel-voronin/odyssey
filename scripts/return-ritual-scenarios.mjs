import assert from 'node:assert/strict';
import {createWorld,step,serialize,restore,log,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {syncActiveActor,syncNPCActors} from '../actor-projection.js';
import {bodyRemains} from '../modules/remains.js';
import {peopleTick} from '../modules/people.js';
import {returnPerson} from '../modules/return-person.js';
import {receiveItem} from '../modules/inventory.js';
export const returnContext={log,route,knownRoute,returnPerson:(s,p,b,t,r)=>returnPerson(s,p,b,t,r,returnContext)};
export function returnFixture({seed=9,beforeDeath=null}={}){
 const flags=['travel','remains','remains-cycle','people','npc-control','npc-knowledge','identity','lineage','containers','geography-frame','origins','birthplaces','return-ritual','equipment'],s=createWorld(seed,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero;
 const a=Object.values(s.areas).find(a=>a.objects.some(o=>o.kind==='relic'&&!o.taken)&&a.objects.some(o=>o.kind==='enemy'&&o.alive));
 assert.ok(a,'selected seed has a real relic and enemy in one area');a.length=100;
 const relic=a.objects.find(o=>o.kind==='relic'&&!o.taken),enemy=a.objects.find(o=>o.kind==='enemy'&&o.alive),id=createPerson(s,{name:'Хранитель обряда',race:'human',area:a.id,x:relic.x,parents:[h.lineage]},{initialJob:'healer'}),caster=s.people[id];
 caster.agenda.duty=.9;caster.agenda.task=null;caster.agenda.due=1e9;caster.needs.hunger=0;caster.needs.energy=100;
 h.area=a.id;h.x=relic.x;h.race='human';s.people[h.lineage].race='human';h.hp=1;h.energy=100;h.hunger=0;h.conditions=[];h.companions=[];h.weapon=0;h.armor=0;h.gold=20;h.combat=enemy.id;h.goal={kind:'hunt',area:a.id,x:relic.x,object:enemy.id,started:s.tick};enemy.x=relic.x;enemy.attack=1000;enemy.hp=enemy.maxHp=10000;
 receiveItem(s,{...returnContext,random:()=>.1},1);h.hp=h.maxHp;h.personality.courage=1;syncActiveActor(s);beforeDeath?.({s,h,a,enemy,caster,dead:s.people[h.lineage]});step(s);assert.equal(h.alive,false);enemy.alive=false;enemy.resolved=true;
 const b=bodyRemains(s,h);assert.ok(b);caster.x=b.position.x;for(const p of Object.values(s.people))if(p!==caster&&p.id!==h.lineage){p.status='absent';}
 return {s,h,a,enemy,dead:s.people[h.lineage],caster,b,relic};
}
export function ritualAct(f){f.s.tick=Math.floor(f.s.tick/8+1)*8;peopleTick(f.s,returnContext);syncNPCActors(f.s);return f;}
export function returnedFixture(){const f=returnFixture();assert.ok(f.caster.returnRite);for(let i=0;i<4;i++)ritualAct(f);assert.equal(f.h.alive,true);return f;}
export function exactReturn(f){syncActiveActor(f.s);syncNPCActors(f.s);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);return raw;}
