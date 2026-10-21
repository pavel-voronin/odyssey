import {npcAction} from '../modules/npc-control.js';
import assert from 'node:assert/strict';
import {nutritionFixture,nutritionExact,nutritionContext,setModule} from './nutrition-scenarios.mjs';
import {createPerson} from '../modules/lineage.js';
import {observeExistingPerson} from '../engine.js';
import {ensureNutrition} from '../modules/nutrition-state.js';
import {personNeeds} from '../modules/needs.js';
import {bodyRemains} from '../modules/remains.js';
import {establishAuthority} from '../modules/authority-foundation.js';
import {eatForbiddenFlesh} from '../modules/forbidden-food.js';
export const forbiddenContext=nutritionContext;
export function forbiddenAdult(s,a,{culture='river',job='scholar',x=42}={}){const id=createPerson(s,{race:'human',culture,role:'житель',area:a.id,x,alive:true,status:'resident',parents:[]},{initialJob:job,ageYears:30}),p=s.people[id];(a.population ||= []).push(id);p.agenda.task=null;p.agenda.due=1e9;p.agenda.duty=.9;p.agenda.wealth=30;p.needs.energy=100;p.needs.hunger=0;p.needs.sleeping=false;return p;}
export function fatalDose(s,p){s.tick=Math.ceil((s.tick+1)/8)*8;const q=ensureNutrition(s,p);q.balance=-3;q.spent=5;q.starvationTicks=15;q.tick=s.tick-1;p.health=.1;assert.equal(personNeeds(s,p,nutritionContext),true);assert.equal(p.alive,false);return bodyRemains(s,p);}
export function forbiddenFixture({permitted=false}={}){const f=nutritionFixture({observe:false}),{s}=f;for(const k of ['forbidden-food','people','npc-needs','npc-control','npc-knowledge','territorial-authorities','politics','witness-news'])setModule(s,k,true);const a=Object.values(s.areas).find(a=>a.civic),p=forbiddenAdult(s,f.a,{culture:'ember',job:'farmer'});assert.equal(observeExistingPerson(s,p.id),true);const h=s.hero;p.area=h.area=a.id;p.x=h.x=56;h.gold=30;h.energy=100;h.hunger=90;h.goal=null;h.combat=null;h.transit=null;const ruler=a.civic.ruler&&s.people[a.civic.ruler]||forbiddenAdult(s,a);ruler.area=a.id;ruler.x=42;ruler.agenda.task=null;ruler.agenda.duty=.9;ruler.needs.hunger=0;ruler.needs.energy=100;ruler.needs.sleeping=false;const state=establishAuthority(s,a.id,ruler.id);assert.ok(state);if(permitted){assert.equal(state.fleshLaw.rule,'fine');delete state.fleshLaw;a.culture='ember';}const witness=forbiddenAdult(s,a,{x:56}),victim=forbiddenAdult(s,a,{x:56}),hidden=forbiddenAdult(s,a,{x:99});const b=fatalDose(s,victim);s.randomStreams['forbidden-food']=1000;return {...f,a,p,h,ruler,state,witness,victim,hidden,b};}
export function forbiddenMeal(f){for(let i=0;i<3;i++){f.s.tick++;assert.equal(npcAction(f.s,f.p,'personal'),true);assert.equal(eatForbiddenFlesh(f.s,f.p,f.b,nutritionContext,{inTurn:true}),true);}return f.b.fleshUse.meals.at(-1);}
export {nutritionExact as forbiddenExact};
