import {productionSources,takeGoods} from '../modules/goods.js';
import {workshopAt} from '../modules/property.js';
import {populationFixture} from '../scripts/population-scenarios.mjs';import {beginPopulationPreparation,advancePreparation,observePreparedPopulation,serialize,restore} from '../engine.js';
export function firstObserverFixture({duration=8,property=false,identity=false}={}){const f=populationFixture({rules:{identity,...(property?{property:true}:{})}});if(property){f.a.district='Мастерские';f.workshop=workshopAt(f.s,f.a);}beginPopulationPreparation(f.s,{duration});advancePreparation(f.s,duration);return f;}
export function observeFirst(f,person=null){const result=observePreparedPopulation(f.s,{person});if(!result.ok)throw Error(result.reason);f.h=f.s.hero;f.observed=f.s.people[result.person];return f;}
export function firstObserverExact(s){const raw=serialize(s);if(serialize(restore(raw))!==raw)throw Error('Prepared game changed on restore');return raw;}

export function experiencedObserverFixture({identity=false}={}){const f=populationFixture({rules:{identity}}),{s,p,a}=f;s.tick=5047;p.x=42;p.needs.hunger=100;p.needs.energy=100;productionSources(s,a);takeGoods(s,a,'food',a.civic.food,{reason:'prepared exhausted pantry'});p.agenda.task={kind:'farm',target:a.id,x:42,remaining:1,goodsWork:{id:p.id+'/prepared-last-step',actor:p.id,required:3,spent:2}};beginPopulationPreparation(s,{duration:9});advancePreparation(s,9);return f;}
