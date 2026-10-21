import {sleepPhase,nutritionView} from './nutrition-state.js';
import {edibleBroth,actualHearth} from './hearth-food.js';
import {creditEnabled,creditSupplier} from './provision-credit.js';
import {biologicalNeed} from './biology.js';
import {forageContract} from './food-contract.js';
import {estimatePlan} from './plan-estimate.js';
import {carriedFood} from './stores.js';
import {knownArea} from '../actor-atlas.js';
import {knownServiceAllows,actualService} from './service-access.js';
import {enabled} from '../rules.js';
import {isTown} from './common.js';
import {JOBS} from '../content.js';
import {foodPrice} from './prices.js';
import {stateKey,parkMethod,actionKey} from './action-selection.js';
const mealUnits=s=>enabled(s,'market')?1:4;
export function needBasis(s,a){const h=s.hero;return stateKey([a.id,Object.values(h.memory.services||{}).filter(k=>k.area===a.id),s.people[h.lineage]?.marketKnowledge?.entries.filter(k=>k.market===a.id&&k.kind==='food'),h.atlas.roads]);}
export function needCandidates(s,ctx){const h=s.hero,p=s.people[h.lineage],options=[];if(enabled(s,'supply')&&carriedFood(p,h.inventory)>0)options.push({kind:'eat',area:h.area,x:h.x,reason:'Съесть настоящий собственный запас.',rank:-100});
 if(creditEnabled(s)){const q=p.provisionCredit,k=creditSupplier(s,p);if(q?.status==='offered'&&q.until>=s.tick)options.push({kind:'creditDecide',area:q.area,x:s.people[q.supplier]?.x??h.x,reason:'Оценить действительное предложение конечных припасов.',rank:5});else if(k)options.push({kind:'creditAsk',area:h.area,x:k.x,supplier:k.id,reason:'Попросить конечные припасы за будущую работу; согласие не гарантировано.',rank:10});}
 if(edibleBroth(s,h)){const fire=actualHearth(s,h.area);options.push({kind:'brothEat',area:h.area,x:fire.x,reason:'Съесть действительную готовую порцию у очага.',rank:-90});}
 for(const a of Object.values(s.areas)){if(!knownArea(s,a))continue;const path=ctx.knownRoute(s,h.area,a.id);if(!path.length||path.length>3)continue;const local=a.id===h.area;
 if(local&&enabled(s,'supply')&&a.forage){const g={kind:'forage',area:a.id,x:a.forage.x,remaining:a.forage.localFood?.kind==='fish'?5:3},r=forageContract(s,g);if(r.status==='ready'&&(local||!a.forage.localFood||p.localFood?.methods[a.forage.localFood.kind]))options.push({...g,reason:'Добыть еду известным способом собственным средством.'});}
 if(!isTown(a)||!a.civic)continue;
 if(local){const food=actualService(s,a,'food',{units:mealUnits(s)}),canEat=food.available&&a.civic.food>=mealUnits(s);if(canEat&&(h.gold>=foodPrice(s)||!enabled(s,'market')))options.push({kind:'provision',area:a.id,x:42,reason:'Получить еду из конечной местной кладовой.'});
 if(enabled(s,'work')&&canEat&&h.gold<foodPrice(s))for(const job of JOBS){if(!['dock','market','harvest'].includes(job.id)||!knownServiceAllows(s,a,'employment',{job:job.id})||!actualService(s,a,'employment',{job:job.id}).available||!(a.civic.treasury>=Math.min(job.pay,foodPrice(s))))continue;if(job.id==='harvest'&&!(a.goods?.sources?.field?.stock>0))continue;options.push({kind:'work',area:a.id,x:42,job:job.id,remaining:job.duration,motive:'food',reason:'Короткая оплачиваемая работа на доступную здесь еду.'});}
 }else if((a.links||[]).includes(h.area)&&knownServiceAllows(s,a,'employment')&&s.hero.needEpisode?.tried?.[a.id]!==needBasis(s,a)){options.push({kind:'needInspect',area:a.id,x:42,reason:'Проверить известное ближайшее поселение: условия и еда выяснятся на месте.',rank:20});}
 }
 return options.map(g=>{const e=estimatePlan(s,g,ctx);return {...g,estimate:e,cost:(g.rank||0)+(e?.ticks||0)+(g.remaining||0),needRoot:'nutrition'};}).filter(g=>g.estimate&&g.estimate.energyCost<=100&&g.estimate.ticks<=Math.max(1,h.hp)*16).sort((a,b)=>a.cost-b.cost||a.area.localeCompare(b.area));}
export function needAdmission(s,g,ctx){const h=s.hero,n=biologicalNeed(s,h);if(!n.critical||h.combat||h.transit||h.carriedBy)return null;if(n.sleep&&!n.food&&g.kind==='rest')return null;if(g.kind==='needWait')return null;if(g.kind==='localRecovery'&&h.energy<Math.min(100,g.needEnergy||24))return null;const candidate=needCandidates(s,ctx).find(c=>actionKey(c)===actionKey(g));if(candidate)return null;return {status:'blocked',reason:n.reason+' Этот шаг не приближает доступное питание или отдых.',retryOn:'biological-opportunity'};}
export function planBiologicalNeed(s,ctx){const h=s.hero,n=biologicalNeed(s,h);if(!n.critical)return false;if(n.sleep&&!n.food){if(h.goal?.kind!=='rest'||!h.goal.sleep)ctx.goal(s,'rest',h.area,h.x,'Выспаться',n.reason,{sleep:true});return true;}if(!n.food){h.needRest ||= {energy:24,since:s.tick};ctx.goal(s,'localRecovery',h.area,h.x,'Набрать силы для следующего дела',n.reason,{needEnergy:24});return true;}h.needEpisode ||= {root:'nutrition',started:s.tick,tried:{}};h.needEpisode.tried[h.area]=needBasis(s,s.areas[h.area]);
 const options=needCandidates(s,ctx),chosen=options.find(g=>!ctx.assess||(()=>{const r=ctx.assess(s,g);return ['ready','progressing'].includes(r.status)||r.retryOn==='body-energy';})());
 if(h.goal&&(!chosen||actionKey(h.goal)!==actionKey(chosen))&&!['needWait','localRecovery'].includes(h.goal.kind))parkMethod(h,h.goal);
 if(chosen){if(h.energy<Math.max(1,chosen.estimate.energyCost)){ctx.goal(s,'localRecovery',h.area,h.x,'Набрать силы на следующий шаг',n.reason+' Нужен лишь посильный запас для выбранного пути.',{needRoot:'nutrition',needEnergy:Math.max(1,chosen.estimate.energyCost)});return true;}
 if(actionKey(h.goal||{})!==actionKey(chosen))ctx.goal(s,chosen.kind,chosen.area,chosen.x,chosen.kind==='work'?'Заработать на ближайшую еду':chosen.kind==='needInspect'?'Проверить еду у известного выхода':'Найти настоящую еду',n.reason+' '+chosen.reason,{...chosen});else h.reason=n.reason+' '+chosen.reason;
 const key=actionKey(chosen);if(h.needEpisode.choice!==key){h.needEpisode.choice=key;ctx.log?.(s,h.reason,'food');}return true;}
 if(n.fatigue&&!n.food){ctx.goal(s,'localRecovery',h.area,h.x,'Перевести дух',n.reason);return true;}
 ctx.goal(s,'needWait',h.area,h.x,'Искать доступный путь к еде',n.reason+' Сейчас нет известного выполнимого способа. Ожидание не кормит и не лечит.',{needRoot:'nutrition'});return true;
}
