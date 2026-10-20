import {familyRevision,familyAdmission} from './family-state.js';
import {councilRevision,councilAdmission} from './council-state.js';
import {needAdmission} from './need-planning.js';
import {forageContract} from './food-contract.js';
import {clinicalRevision} from './clinical-state.js';
import {administrationRevision} from './administration-state.js';
import {currencyRevision} from './currency-actions.js';
import {castleRevision} from './castle-actions.js';
import {maskRevision} from './service-mask-state.js';
import {cargoInquiryRevision} from './cargo-inquiries.js';
import {hobbyRevision} from './hobby-supply.js';
import {farmRevision} from './farming-state.js';
import {titleRevision} from './title-state.js';
import {willRevision} from './will-revision.js';
import {publicRepairRevision} from './public-repair-state.js';
import {authorityRevision} from './authority-state.js';
import {stealthRevision} from './stealth-state.js';
import {spellTextRevision} from './spell-text-state.js';
import {scholarRevision} from './scholar-state.js';
import {copyRevision} from './copy-order-state.js';
import {causewayRevision} from './causeway-actions.js';
import {promiseRemembered} from './recollection-state.js';
import {socketRevision} from './socket-service.js';
import {estateRevision} from './estate-claims.js';
import {ruinRevision} from './ruin-return.js';
import {dwellingRevision} from './dwellings.js';
import {driveReadiness,driveRevision} from './mechanic-drive.js';
import {estimatePlan} from './plan-estimate.js';
import {burialReadiness} from './burial-work.js';
import {physicalDistance} from '../geometry.js';
import {enabled} from '../rules.js';
import {knownServiceAllows,actualService} from './service-access.js';
import {knownToolAllows} from './workshop-tools.js';
import {localContact} from './npc-contacts.js';
import {canUseKnownDescent} from './navigation-memory.js';
import {deferredMethod,stateKey} from './action-selection.js';
import {registeredGoal} from './goal-handlers.js';
import {pendingMaterialContract} from './material-delivery-state.js';
import {rootWorld} from '../world-ref.js';
import {ferryRefusal,sameFerryRefusal} from './ferry-refusals.js';
const blocked=(reason,retryOn)=>({status:'blocked',reason,retryOn});
// Personal records and facts at the current visible place only. No distant stock,
// enemy body, boat position or NPC wallet participates in a retry signal.
export function methodRevision(s,g){
 const h=s.hero,p=s.people[h.lineage],a=s.areas[h.area];if(g.kind==='forage')return stateKey(forageContract(s,g,p,h).basis);const target=g.person&&localContact(s,g.person,h.area),visible=o=>physicalDistance(a,h.x,o.x)<=24;
 const local=a.objects.filter(o=>visible(o)&&(o.id===g.object||o.id===g.property||['dock','workshop','rest'].includes(o.kind))).map(o=>[o.id,o.kind,o.state,o.closed,o.owner,o.count,o.taken,o.alive,o.workTool?.state]);
 const f=s.ferry,boat=physicalDistance(a,h.x,50)<=24&&f?.port===h.area&&!h.transit?[f.id,f.phase,f.voyage,f.departure,Object.keys(f.passengers).length,f.hull>=25]:null;
 return stateKey([familyRevision(s,g),councilRevision(s,g),clinicalRevision(s,g),administrationRevision(s,g),currencyRevision(s,g),castleRevision(s,g),maskRevision(s,g),cargoInquiryRevision(s,g),hobbyRevision(s,g),farmRevision(s,g),titleRevision(s,g),willRevision(s,g),publicRepairRevision(s,g),authorityRevision(s),g.kind.startsWith('decoy')&&[p.decoyCraft,p.marketCargo,s.rules['noise-decoys']],stealthRevision(s,g),spellTextRevision(s,g),scholarRevision(s,g),copyRevision(s,g),causewayRevision(s,g),socketRevision(s,g),estateRevision(s,g),ruinRevision(s,g),dwellingRevision(s,g),h.area,h.gold,h.inventory,h.bag.map(i=>[i.id,i.power,i.condition,i.textCopy&&[i.textCopy.condition,i.textCopy.damage?.cause,i.textCopy.salvaged?.cause]]),h.weapon,h.maxHp,Math.floor(h.hp/h.maxHp*4),h.energy>=40,h.energy>=24,h.energy>=12,h.energy>0,h.companions.map(c=>[c.person,c.hp>0]),h.atlas.known,h.atlas.roads,p.ruptureMemory?.known,Object.entries(h.memory.rejected||{}).map(([id,r])=>[id,r.enemy,r.hp,r.attack]),h.navigationMemory?.blockers.map(r=>[r.id,r.status,r.knownAnchor,r.knownRope&&[r.knownRope.id,r.knownRope.length,r.knownRope.owner,r.knownRope.progress],r.lastFailed]),Object.entries(h.memory.avoided).filter(([,until])=>until>s.tick).map(([id])=>id),Object.values(h.workToolMemory?.known||{}).map(r=>[r.property,r.area,r.owner,r.state,r.episode]),h.workMaterials?.revision,g.deal&&s.productionDeals?.[g.deal]?.status,g.project&&s.patronProjects?.[g.project]?.status,local,physicalDistance(a,h.x,g.x??h.x)<=18&&a.civic&&[a.civic.tools,a.civic.medicine,a.civic.food,a.civic.treasury],Object.values(h.memory.services||{}).map(v=>[v.area,v.kind,v.job,v.available,v.reason]),boat,target&&[target.person.id,target.area,target.person.alive,target.person.needs?.sleeping,Boolean(target.person.agenda?.task)],g.funeral&&p.funeralTask&&[p.funeralTask.id,p.funeralTask.stage,p.funeralTask.basis,p.funeralTask.observed],p.provisionCredit&&[p.provisionCredit.id,p.provisionCredit.status],p.forging?.active,p.itemRepair?.active,p.knifeRefit?.active,...(g.kind.startsWith('drive')||g.kind==='liftWork'?driveRevision(s,g):[])]);
}
export function goalReadiness(s,g,ctx,{memory=true}={}){
 const h=s.hero;if(!g)return {status:'invalid',reason:'Нет исполняемого шага.'};
 if(!h.alive)return {status:'invalid',reason:'Тело больше не действует.'};
 if(!registeredGoal(g))return {status:'invalid',reason:'У шага нет зарегистрированного обработчика.'};
 const need=needAdmission(s,g,ctx);if(need)return need;
 if(g.kind==='forage'){const food=forageContract(s,g,s.people[h.lineage],h);if(food.status==='blocked')return food;}
 if(h.transit||h.carriedBy||h.combat)return {status:'progressing',reason:'Начатое физическое действие сохраняет контроллер.'};
 const family=familyAdmission(s,g,s.people[h.lineage]);if(family)return family;
 const council=councilAdmission(s,g,s.people[h.lineage]);if(council)return council;
 if(!s.areas[g.area]||!Number.isFinite(g.x))return {status:'invalid',reason:'У шага нет действительного места.'};
 if(g.quest&&!h.quests.some(q=>q.id===g.quest&&q.status==='active'&&promiseRemembered(h,q)))return {status:'done',reason:'Дело уже завершено.'};
 if(g.area!==h.area&&!ctx.knownRoute(s,h.area,g.area).length)return blocked('Известного доступного пути к этому шагу пока нет.','personal-route');
 if(g.area!==h.area){const path=ctx.knownRoute(s,h.area,g.area),q=path[1]&&ferryRefusal(s,h.area,path[1]);if(q?.waitUntil>s.tick&&sameFerryRefusal(s,q))return {status:'waiting',until:q.waitUntil,retryOn:'local-boat'};}
 if((g.area!==h.area||physicalDistance(s.areas[h.area],h.x,g.x)>1)&&h.energy<=0)return blocked('Нет сил дойти до шага; нужна достижимая еда или восстановление на месте.','body-energy');
 if(['rest','campPitch','provision','forage','patientClinic'].includes(g.kind)){
  const cost=estimatePlan(s,g,ctx);if(cost&&h.energy<cost.energyCost)return blocked('Текущее восстановление или снабжение недостижимо с оставшимися силами.','body-energy');
 }
 if(g.kind==='forage'&&!g.foodSource&&!(s.areas[g.area].forage?.stock>0))return blocked('Нет лично доступного конечного запаса съедобного; пустой поиск не создаёт паёк.','local-food-source');
 if(g.kind==='localRecovery'&&s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[h.area],h.x,o.x)<28))return blocked('Рядом действительная угроза: безопасно восстановиться на месте нельзя.','local-safety');
 if(g.kind.startsWith('drive')||g.kind==='liftWork'&&s.edges[g.key]?.lift?.drive){const r=driveReadiness(s,g);if(r.status!=='ready')return r;}
 if(g.kind.startsWith('asset')){if(!enabled(s,'asset-risk'))return blocked('Защита припасов приостановлена.','rules');if(g.kind==='assetHire'){const t=localContact(s,g.person,h.area);if(!t)return blocked('Стража сейчас нет рядом.','participant');g.x=t.x;}}
 if(['patronOffer','patronStock'].includes(g.kind)){if(!enabled(s,'patronage'))return blocked('Патронаж приостановлен.','rules');const t=localContact(s,g.person,h.area);if(!t)return blocked('Владельца сейчас нет рядом.','participant');g.x=t.x;if(g.project&&s.patronProjects?.[g.project]?.status!=='awaiting-stock')return {status:'done',reason:'Этап помощи уже изменился.'};}
 if(['productionFund','productionPayout','productionReview'].includes(g.kind)){if(!enabled(s,'production-finance'))return blocked('Договоры приостановлены.','rules');const t=localContact(s,g.person,h.area);if(!t)return blocked('Собеседника сейчас нет рядом.','participant');if(g.kind==='productionPayout'&&s.productionDeals?.[g.deal]?.status!=='payable')return {status:'done',reason:'Расчёт пока не причитается.'};g.x=t.x;}
 if(g.kind==='burialWork'){const r=burialReadiness(s,g);if(r.status!=='ready')return r;}
 if(g.kind==='routeWait')return blocked('Ожидание без собственного выполняемого шага освобождает выбор других дел.','local-opportunity');
 if(g.kind==='creditWait'){const q=s.people[h.lineage].provisionCredit;if(q?.status!=='requested')return {status:'done',reason:'Ответ поставщика уже изменился.'};const until=Math.min(q.until,q.asked+8);if(s.tick<until)return {status:'waiting',until,retryOn:'supplier-response'};return blocked('Короткое окно ответа прошло; просьба сохранена, доступны другие дела.','supplier-response');}
 if(g.kind==='materialWait'){const q=pendingMaterialContract(rootWorld(s),h.lineage);if(!q||q.id!==g.deliveryClient)return {status:'done',reason:'Ожидавшийся договор уже изменился.'};const until=Math.min(q.deadline,q.offered+8);if(s.tick<until)return {status:'waiting',until,retryOn:'actual-delivery'};return blocked('Короткое ожидание сырья окончено; договор и груз сохранены.','actual-delivery');}
 if(g.kind==='expand'&&s.areas[g.area].expanded)return {status:'done',reason:'Этот выход уже изучен.'};
 if(g.area===h.area){
  const target=g.object&&s.areas[g.area].objects.find(o=>o.id===g.object);
  if(g.object&&physicalDistance(s.areas[g.area],h.x,g.x)<=24&&['collect','hunt','encounter'].includes(g.kind)&&(!target||target.taken||target.kind==='herb'&&target.count<=0||target.kind==='enemy'&&(!target.alive||target.resolved)||g.kind==='encounter'&&target.resolved))return {status:'done',reason:'При осмотре цель уже недоступна.'};
  if(g.person){const at=localContact(s,g.person,h.area);if(at&&physicalDistance(s.areas[h.area],h.x,at.x)<=12&&(at.person.needs?.sleeping||at.person.health<=0))return blocked('Собеседник сейчас не может участвовать.','participant');}
 }
 const service=g.kind==='work'?'employment':g.kind==='trade'?'merchant':g.kind==='serviceSupply'?'warehouse':null;
 if(service&&!knownServiceAllows(s,s.areas[g.area],service,{job:g.job}))return blocked('Лично известная служба сейчас недоступна.','service-observation');
 if(service&&g.area===h.area&&physicalDistance(s.areas[h.area],h.x,g.x)<=12){const q=actualService(s,s.areas[g.area],service,{job:g.job});if(!q.available)return blocked(q.reason,'local-service');}
 if((g.kind==='work'&&g.job==='repair'||['forgeWork','decoyWork'].includes(g.kind))&&!knownToolAllows(s,g.area,g.property||g.workplace?.id))return blocked('Лично известный рабочий инструмент неисправен.','tool-or-method');
 if(g.kind==='serviceSupply'){const c=s.workOrders[g.service];if(!c||c.status!=='active')return {status:'done',reason:'Заказ больше не активен.'};if(c.escrow<3+c.fee)return blocked('Материальный резерв заказа недостаточен.','contract-resources');}
 if(enabled(s,'navigation-memory')&&!g.kind.startsWith('rope')&&!g.navReturn&&!g.navigationReturn){const path=g.area===h.area?[h.area]:ctx.knownRoute(s,h.area,g.area),next=path[1],x=next?(Number(next.slice(1))>Number(h.area.slice(1))?100:0):g.x;const r=h.navigationMemory?.blockers.find(r=>r.blocking&&r.area===h.area&&!canUseKnownDescent(s,r)&&!r.knownBypass&&(x>h.x?h.x<r.bottom&&x>r.upper:h.x>r.upper&&x<r.bottom));if(r)return blocked(r.reason,'navigation-capability');}
 if(memory){const old=deferredMethod(h,g,methodRevision(s,g));if(old)return blocked(old.reason,old.retryOn);}
 return {status:'ready'};
}
// Excludes clocks, narration, goal.started, hunger drift and merely assigning a
// goal. Includes only actual body/resource/phase changes of this selected action.
export function actionProgress(s,g){const h=s.hero,p=s.people[h.lineage],a=s.areas[h.area],o=g.object&&a.objects.find(o=>o.id===g.object),q=g.quest&&h.quests.find(q=>q.id===g.quest),c=g.service&&s.workOrders[g.service];return stateKey([socketRevision(s,g),h.area,h.x,h.hp,h.energy,h.gold,h.magic.mana,h.inventory,h.bag,h.equipment,h.transit,h.combat,h.quests.map(q=>[q.id,q.status]),q,h.patronMemory,g.project&&s.patronProjects?.[g.project],g.deal&&s.productionDeals?.[g.deal]&&[s.productionDeals[g.deal].status,s.productionDeals[g.deal].escrow,s.productionDeals[g.deal].partnerTalk,s.productionDeals[g.deal].support,s.productionDeals[g.deal].exit],c&&[c.status,c.progress,c.escrow,c.materialSpent],o&&[o.id,o.count,o.taken,o.resolved,o.hp],[p.forging,p.itemRepair,p.knifeRefit].map(v=>v&&[v.active,Object.values(v.orders||{}).map(o=>[o.id,o.status,o.progress,o.materials,o.material,o.paidAt,o.item]),v.study&&[v.study.teacher,v.study.progress]]),[g.remaining,g.progress,g.stage],h.atlas.known,h.atlas.roads,a.expanded,h.hunger===0, h.counters.peacefulWork]);}
