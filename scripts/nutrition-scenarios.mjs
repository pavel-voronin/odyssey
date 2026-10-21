import assert from 'node:assert/strict';
import {createWorld,createEnemy,observeExistingPerson,serialize,restore,route,knownRoute,step} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {createPerson} from '../modules/lineage.js';
import {syncActiveActor} from '../actor-projection.js';
import {establishEcology} from '../modules/ecology-state.js';
import {nativeGameHunt} from '../modules/native-game-hunt.js';
import {recordRemains,bodyRemains} from '../modules/remains.js';
export const nutritionContext={log(){},random:()=>.99,route,knownRoute,goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,intent,reason,...extra};}};
const keep=['body','item-originals','identity','supply','local-food','hearth-food','game-meat','equipment','remains','remains-cycle','goods-cycle','local-ecology','development-skills','npc-needs'];
export function nutritionFixture({job='farmer',race='human',observe=true}={}){const s=createWorld(12,{rules:Object.fromEntries(MODULES.map(m=>[m.id,keep.includes(m.id)]))});establishEcology(s,{spawnEnemy:createEnemy});const a=s.areas[s.localEcology.area],id=createPerson(s,{race,role:'житель',area:a.id,x:48,alive:true,status:'resident',parents:[]},{initialJob:job,ageYears:30}),p=s.people[id];(a.population ||= []).push(id);p.agenda.wealth=30;p.agenda.duty=.8;p.agenda.task=null;p.needs.energy=100;p.needs.hunger=0;p.needs.sleeping=false;const old=s.hero;for(const e of a.objects)if(e.kind==='enemy'&&!e.ecology){e.resolved=true;e.alive=false;}if(observe)assert.equal(observeExistingPerson(s,id),true);const h=s.hero;if(observe)Object.assign(h,{area:a.id,x:48,hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null,conditions:[],companions:[],habits:[]});return {s,h,p,a,old};}
export function actualGameCorpse(f){const {s,p,a}=f,e=a.objects.find(e=>e.ecology?.diet==='grazer');p.x=e.x;e.hp=1;e.attack=0;s.tick++;const t={kind:'meatHunt',object:e.id,target:a.id,x:e.x,attempts:0};assert.equal(nativeGameHunt(s,p,t,{...nutritionContext,npcVictory(s,a,e,by){e.hp=0;e.alive=false;e.resolved=true;recordRemains(s,e,{kind:'enemy',id:e.id,area:a.id,x:e.x,shape:e.shape,cause:{person:by.id}});}}),true);assert.equal(e.alive,false);return bodyRemains(s,e);}
export function nutritionExact(s){syncActiveActor(s);const raw=serialize(s);assert.equal(serialize(restore(raw)),raw);return raw;}
export {step,setModule};
