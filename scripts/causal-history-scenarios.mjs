import {setModule} from '../rules.js';
import {rememberRetreat,commitmentPlan} from '../modules/commitments.js';
import {workTick,planWork} from '../modules/work.js';
import {serviceFixture,serviceContext} from './service-access-scenarios.mjs';
export const causalContext=serviceContext;
export const personalContext=s=>({...serviceContext,work:()=>planWork(s,serviceContext)});
export function causalFixture(){const f=serviceFixture(),{s,h,a}=f;setModule(s,'causal-history',true);setModule(s,'commitments',true);h.hp=h.maxHp;h.hunger=0;h.x=42;h.weapon=0;h.money.style='carefree';h.gold=20;h.personality.courage=.2;h.personality.generosity=.2;h.memory.merchant=a.id;const enemy=s.areas.a2.objects.find(o=>o.kind==='enemy'),area=h.area;h.area='a2';rememberRetreat(s,enemy);h.area=area;return {...f,enemy};}
export function causalEarning(f){const {s,h}=f;h.gold=2;if(!commitmentPlan(s,null,false,personalContext(s)))throw Error('No actual personal income plan');for(let i=0;i<8&&h.goal;i++){s.tick++;workTick(s,causalContext);}if(h.goal)throw Error('Prepared work did not complete');}
