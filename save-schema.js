import {validateArtifactMemories} from './modules/artifact-memory-schema.js';
import {validateMaterialResearch} from './modules/material-research-schema.js';
import {validateFirstObservation} from './modules/population-observer.js';
import {validateFamilies} from './modules/family-schema.js';
import {validateAges} from './modules/age-schema.js';
import {validateCouncils} from './modules/council-schema.js';
import {validateBiology} from './modules/biology-schema.js';
import {validateClinicalStudy} from './modules/clinical-study-schema.js';
import {validateClinicalPractice} from './modules/clinical-schema.js';
import {validateCurrency} from './modules/currency-schema.js';
import {validateCastles} from './modules/castle-schema.js';
import {validateServiceMasks} from './modules/service-mask-schema.js';
import {validateCargoCases} from './modules/cargo-case-schema.js';
import {validateHobbySupply} from './modules/hobby-schema.js';
import {validateFarming} from './modules/farming-schema.js';
import {validateTitles} from './modules/title-schema.js';
import {validateWills} from './modules/will-schema.js';
import {validatePublicRepairs} from './modules/public-repair-schema.js';
import {validateDiplomacy} from './modules/diplomacy-schema.js';
import {validateAuthorities} from './modules/authority-schema.js';
import {validateDecoys} from './modules/decoy-schema.js';
import {validateStealth} from './modules/stealth-schema.js';
import {validateSpellTexts} from './modules/spell-text-schema.js';
import {validateScholar} from './modules/scholar-schema.js';
import {validateCopyOrders} from './modules/copy-order-schema.js';
import {validateCauseways} from './modules/causeway-schema.js';
import {validateLocalMaterials} from './modules/local-material-schema.js';
import {validateRecollection} from './modules/recollection-schema.js';
import {validateGearPairs} from './modules/gear-pair-schema.js';
import {validateSockets} from './modules/socket-schema.js';
import {validateEstateClaims} from './modules/estate-claim-schema.js';
import {validateRuinReturns} from './modules/ruin-return-schema.js';
import {validateHarvestFailures,validateHarvestShortfalls} from './modules/harvest-failure-schema.js';
import {validateDwellings} from './modules/dwelling-schema.js';
import {validateNeighborHousing} from './modules/neighbor-housing-schema.js';
import {validateFoundations} from './modules/foundation-schema.js';
import {validateRefuges} from './modules/refuge-schema.js';
import {validateAssetRisk} from './modules/asset-risk-schema.js';
import {validatePatronage} from './modules/patronage-schema.js';
import {validateProductionFinance} from './modules/production-finance-schema.js';
import {validateEarthquakes} from './modules/earthquake-schema.js';
import {validateWorldChanges} from './modules/world-changes-schema.js';
import {validateCoverRetreat} from './modules/cover-retreat-schema.js';
import {validateWagons} from './modules/wagon-schema.js';
import {validateFractures} from './modules/fracture-schema.js';
import {validateWoundInfection} from './modules/wound-infection-schema.js';
import {validateMechanicDrive} from './modules/mechanic-drive-schema.js';
import {validateMeasuredWard} from './modules/measured-ward-schema.js';
import {validateFerryCargo} from './modules/ferry-cargo-schema.js';
import {validateTracking} from './modules/tracking-schema.js';
import {validateRemainsCycle,validateBurialTool} from './modules/remains-cycle-schema.js';
import {validateCampMusic,validateMusicInstrument} from './modules/camp-music-schema.js';
import {validateActionSelection} from './modules/action-selection-schema.js';
import {validateCampTopics} from './modules/camp-topic-schema.js';
import {validateRemainsCarry} from './modules/remains-carry-schema.js';
import {validateLibraries} from './modules/library-schema.js';
import {validatePeopleCarry} from './modules/people-carry-schema.js';
import {validateBuildingControl} from './modules/building-control-schema.js';
import {validateFerry} from './modules/ferry-schema.js';
import {validateHorses} from './modules/horse-schema.js';
import {validateRoadStops} from './modules/road-stop-schema.js';
import {validateMetricRoutes} from './modules/metric-route-schema.js';
import {validateGeographyFrame} from './modules/geography-frame-schema.js';
import {validatePlaceRules} from './modules/place-rule-schema.js';
import {validateHostiles} from './modules/hostile-schema.js';
import {validateRivalry} from './modules/craft-rivalry-schema.js';
import {validateEnemyPeople} from './modules/enemy-person-schema.js';
import {validateProsthetics,validateProstheticItem} from './modules/prosthetic-schema.js';
import {validateLimbLosses} from './modules/limb-schema.js';
import {validatePatients} from './modules/patient-schema.js';
import {validateWoundCare} from './modules/wound-care-schema.js';
import {validateWounds} from './modules/wound-schema.js';
import {validatePositions} from './modules/position-schema.js';
import {validateGuardians} from './modules/guardian-schema.js';
import {validateShortcuts} from './modules/shortcut-schema.js';
import {validateDelveLayouts} from './modules/delve-layout-schema.js';
import {validateWaystones} from './modules/waystone-schema.js';
import {validateCommissions} from './modules/commission-schema.js';
import {validateBranchPacts} from './modules/branch-pact-schema.js';
import {validateFeasts} from './modules/feast-schema.js';
import {validateMigrationKnowledge} from './modules/migration-knowledge-schema.js';
import {validateNews} from './modules/news-schema.js';
import {validateBuildingRuins} from './modules/building-ruins-schema.js';
import {validateSequences} from './modules/sequence-schema.js';
import {validateLiteracy} from './modules/literacy-schema.js';
import {validateTexts} from './modules/text-schema.js';
import {validateHomeBuilding} from './modules/home-building-schema.js';
import {validateHomes} from './modules/home-schema.js';
import {validateVerdictReviews} from './modules/verdict-review-schema.js';
import {validateShipRecovery} from './modules/ship-recovery-schema.js';
import {MODULES} from './rules.js';
import {MOTION_SHAPES,REMAINS_TICKS} from './actor-facts.js';
import {RACES,ENEMY_SPECIES} from './content.js';

export const SAVE_VERSION=2;
export const SAVE_SCHEMA='click-odyssey/144';
export const SAVE_KEY='click-odyssey-144';
export function clockRecord(state,clock){return {schema:SAVE_SCHEMA,seed:state.seed,anchor:clock.anchor,idleUntil:clock.idleUntil,stopped:clock.stopped,...(clock.yearRun?{yearRun:{...clock.yearRun}}:{})};}
function validYearClock(r,s){return object(r)&&Boolean(s.people[r.person])&&Number.isSafeInteger(r.sequence)&&r.sequence>=0&&['startTick','endTick','atTick','committed','remaining'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&[19200,192000].includes(r.endTick-r.startTick)&&r.atTick===r.startTick+r.committed&&r.atTick<=s.tick&&r.remaining===r.endTick-r.startTick-r.committed&&['paused','cancelled','done','death'].includes(r.status)&&(r.status!=='done'||r.remaining===0)&&(r.status!=='death'||r.endTick-r.startTick===192000);}
export function currentClock(record,state){return object(record)&&record.schema===SAVE_SCHEMA&&record.seed===state.seed&&Number.isFinite(record.anchor)&&Number.isFinite(record.idleUntil)&&record.idleUntil>=0&&record.stopped===false&&(record.yearRun===undefined||validYearClock(record.yearRun,state))?record:null;}
export function currentTutorial(t){return object(t)&&Number.isInteger(t.stage)&&t.stage>=0&&t.stage<=4&&Number.isFinite(t.until)&&typeof t.done==='boolean'?t:null;}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(v,k)=>Object.hasOwn(v,k);
const fail=path=>{throw new Error('Повреждённое сохранение: '+path);};
function fields(v,names,path){if(!object(v))fail(path);for(const k of names)if(!own(v,k))fail(path+'.'+k);}
function array(v,path){if(!Array.isArray(v))fail(path);}
function finite(v,path){if(!Number.isFinite(v))fail(path);}
function integer(v,path,min=0){if(!Number.isSafeInteger(v)||v<min)fail(path);}
function merchantRecord(s,t,path,finished=false){
 fields(t,['version','owner','kind','quantity','cost','foodCost','expected','reserve','walletBefore','from','to','started','seen','status'],path);for(const k of ['quantity','started','seen'])integer(t[k],path+'.'+k);for(const k of ['cost','foodCost','expected','reserve','walletBefore']){finite(t[k],path+'.'+k);if(t[k]<0)fail(path+'.'+k);}
 if(t.version!==1||!s.people[t.owner]||!s.areas[t.from]||!s.areas[t.to]||t.from===t.to||t.kind!=='tools'||t.quantity<1||t.quantity>3||t.seen>t.started||t.started>s.tick||t.walletBefore<t.cost+t.foodCost+t.reserve||!(finished?['delivered','returned']:['outward','returning']).includes(t.status))fail(path);
 if(finished){fields(t,['ended','area','sold','remaining','revenue','net','walletAfter'],path);for(const k of ['ended','sold','remaining'])integer(t[k],path+'.'+k);for(const k of ['revenue','net','walletAfter'])finite(t[k],path+'.'+k);if(t.ended<t.started||t.ended>s.tick||!s.areas[t.area]||t.sold+t.remaining>t.quantity||t.revenue<0||t.walletAfter<0||t.net!==t.revenue-t.cost-t.foodCost)fail(path);}
}
function creditRecord(s,q,id,key){
 fields(q,['version','id','client','supplier','area','owner','asked','acted','until','status'],key);for(const k of ['asked','acted','until'])integer(q[k],key+'.'+k);
 if(q.version!==1||q.client!==id||q.id!==`credit/${id}/${q.asked}`||!s.people[q.supplier]||!s.areas[q.area]||q.owner!=='civic/'+(s.areas[q.area].city||q.area)||q.asked>q.acted||q.acted>s.tick||q.until<q.asked||!['requested','offered','accepted','working','fulfilled','refused','failed'].includes(q.status))fail(key);
 if(q.offered!==undefined){integer(q.offered,key+'.offered');integer(q.deadline,key+'.deadline');array(q.terms,key+'.terms');if(q.offered<q.asked||q.offered>s.tick||q.deadline!==q.offered+120||q.terms.length<1||q.terms.length>2||q.terms.some(t=>!([2,1].includes(t.quantity)&&t.required===(t.quantity===2?5:3))))fail(key+'.terms');}
 if(q.transfer){const r=q.transfer;fields(q,['accepted','quantity','required','task'],key);fields(r,['at','from','to','before','after','quantity'],key+'.transfer');integer(q.accepted,key+'.accepted');integer(q.quantity,key+'.quantity');integer(q.required,key+'.required');for(const k of ['before','after'])finite(r[k],key+'.transfer.'+k);if(q.accepted<q.offered||q.accepted>s.tick||r.at!==q.accepted||r.from!==q.owner||r.to!==id||r.quantity!==q.quantity||Math.abs(r.before-r.after-q.quantity)>1e-8||r.after<0||!q.terms?.some(t=>t.quantity===q.quantity&&t.required===q.required))fail(key+'.transfer');fields(q.task,['kind','remaining'],key+'.task');integer(q.task.remaining,key+'.remaining');if(q.task.kind!=='provisionWork'||q.task.remaining>q.required)fail(key+'.task');const work=q.task.goodsWork;if(work){fields(work,['id','actor','required','spent'],key+'.work');integer(work.spent,key+'.work.spent');if(work.actor!==id||work.required!==q.required||work.spent+q.task.remaining!==q.required)fail(key+'.work');}else if(q.task.remaining!==q.required)fail(key+'.work');}
 if(['accepted','working','fulfilled','failed'].includes(q.status)&&!q.transfer)fail(key+'.transfer');
 if(q.status==='fulfilled'){const r=q.settlement;fields(r,['id','at','produced','fieldBefore','fieldAfter'],key+'.settlement');integer(r.at,key);integer(r.produced,key,1);if(q.task.remaining!==0||q.task.goodsWork?.id!==r.id||r.at>s.tick||r.at<q.accepted||r.fieldBefore-r.fieldAfter!==r.produced)fail(key+'.settlement');}
 if(['fulfilled','refused','failed'].includes(q.status)){integer(q.ended,key+'.ended');if(q.ended>s.tick||q.after!==q.ended+192||typeof q.reason!=='string')fail(key+'.ended');}
}
function fieldCraftRecord(s,f,id){
 const key=id+'.fieldCraft';fields(f,['version','lessons','services','total','lastActionTick','kit'],key);array(f.lessons,key);array(f.services,key);integer(f.total,key+'.total');integer(f.lastActionTick,key+'.lastActionTick',-1);const k=f.kit;fields(k,['version','packed','remaining','spent','loads'],key+'.kit');array(k.loads,key+'.loads');for(const n of ['packed','remaining','spent'])integer(k[n],key+'.kit.'+n);
 if(f.version!==1||k.version!==1||k.packed!==k.remaining+k.spent||k.remaining>2||k.loads.length>8||f.lessons.length>8||f.services.length>8||f.total<f.services.length||f.lastActionTick>s.tick||k.spent<f.total+(f.service?1:0))fail(key);
 for(const l of k.loads){fields(l,['at','owner','kind','before','after','units'],key+'.load');integer(l.at,key);if(l.at>s.tick||l.owner!==id||l.kind!=='tools'||l.before-l.after!==1||l.after<0||l.units!==2)fail(key+'.load');}
 function material(m){fields(m,['at','owner','resource','before','after','quantity'],key+'.material');integer(m.at,key);if(m.at>s.tick||m.owner!==id||!['herbs','medicine'].includes(m.resource)||m.quantity!==1||m.before-m.after!==1||m.after<0)fail(key+'.material');}
 for(const m of [f.learned,f.efficient].filter(Boolean)){fields(m,['node','at','area','teacher','source','material','actions'],key+'.method');integer(m.at,key);fields(m.source,['craft','aid','services'],key+'.source');for(const branch of ['craft','aid','services'])array(m.source[branch],key+'.source.'+branch);material(m.material);if(m.at>s.tick||!s.areas[m.area]||m.teacher!==null&&!s.people[m.teacher]||!m.source.craft.length||!m.source.aid.length||m.actions<2||m.actions>3||m.material.at>m.at)fail(key+'.method');}
 if(f.learned?.node&&f.learned.node!=='field-maintenance'||f.efficient&&(!f.learned||f.efficient.node!=='careful-maintenance'||f.total<3||f.efficient.source.services.length<3))fail(key+'.method');
 for(const l of f.lessons){fields(l,['node','tick','area','teacher','fee','step'],key+'.lesson');integer(l.tick,key);if(l.tick>s.tick||!s.areas[l.area]||!['field-maintenance','careful-maintenance'].includes(l.node)||l.teacher!==null&&!s.people[l.teacher]||l.fee!==(l.teacher?2:0)||l.step<1||l.step>3)fail(key+'.lesson');}
 if(f.study){const t=f.study;fields(t,['node','started','area','teacher','required','progress','material','craft','aid','services'],key+'.study');integer(t.started,key);material(t.material);for(const branch of ['craft','aid','services'])array(t[branch],key+'.study.'+branch);if(t.started>s.tick||!s.areas[t.area]||!['field-maintenance','careful-maintenance'].includes(t.node)||t.teacher!==null&&!s.people[t.teacher]||t.progress<1||t.progress>=t.required||t.required<2||t.required>3||!t.craft.length||!t.aid.length)fail(key+'.study');}
 for(const [r,done]of [...f.services.map(r=>[r,true]),...(f.service?[[f.service,false]]:[])]){fields(r,['id','item','started','area','required','progress','steps','part','before'],key+'.service');integer(r.started,key);array(r.steps,key);if(r.started>s.tick||!s.areas[r.area]||r.id!==`field/${id}/${r.started}`||!['string'].includes(typeof r.item)||![2,3].includes(r.required)||r.progress<1||r.progress>r.required||r.steps.length!==r.progress||r.part!==1)fail(key+'.service');for(const step of r.steps){integer(step.tick,key);if(step.tick>s.tick||!s.areas[step.area])fail(key+'.step');}if(done){fields(r,['finished','finishedArea','beforeRepair','after','restored'],key+'.service');if(r.finished>s.tick||r.finished<r.started||!s.areas[r.finishedArea]||r.progress!==r.required||r.restored<=0||r.restored>60||r.after-r.beforeRepair!==r.restored)fail(key+'.completed');}}
 if(f.interrupted){array(f.interrupted,key+'.interrupted');if(f.interrupted.length>4)fail(key+'.interrupted');for(const r of f.interrupted){fields(r,['id','item','started','ended','cause','part'],key+'.interrupted');if(r.ended>s.tick||r.ended<r.started||!['lost-item','already-serviced'].includes(r.cause)||r.part!==1)fail(key+'.interrupted');}}
 if(f.after!==undefined)integer(f.after,key+'.after');
 if(f.goal){fields(f.goal,['node','started','deadline','status','teacher','reason'],key+'.goal');if(!['field-maintenance','careful-maintenance'].includes(f.goal.node)||!['active','deferred','done'].includes(f.goal.status)||f.goal.started>s.tick||f.goal.deadline!==f.goal.started+96)fail(key+'.goal');}
}
const obsolete=['contentVersion','geographyVersion','cultureVersion','enchantmentVersion','adversaryVersion','lineageAreaCount','civicAreaCount','supplyAreaCount','peopleAreaCount'];
function liftRide(s,t,path){
 fields(t,['version','id','node','from','to','person','started','lastTick','total','remaining','arrivalX','spent'],path);const n=s.edges[[t.from,t.to].sort().join('|')]?.lift,serial=Number(t.id?.slice((t.node+'/ride/').length));for(const k of ['started','lastTick','remaining'])integer(t[k],path+'.'+k);finite(t.arrivalX,path+'.arrivalX');
 if(t.version!==1||!n||n.id!==t.node||!s.people[t.person]||t.id!==n.id+'/ride/'+serial||!Number.isSafeInteger(serial)||serial<1||serial>n.rides||t.total!==2||t.spent!==1||t.remaining>2||t.started>t.lastTick||t.lastTick>s.tick||t.arrivalX<0||t.arrivalX>100)fail(path);
}
function petStudy(s,c,path,seen){
 if(!c.petTraining)return;if(c.id!=='dog'||c.person||typeof c.uid!=='string'||!c.uid||seen.has(c.uid))fail(path+'.uid');seen.add(c.uid);
 const t=c.petTraining;fields(t,['version','energy','hunger','lastUpkeep','lastActionTick','after','lessons','finds'],path);array(t.lessons,path+'.lessons');array(t.finds,path+'.finds');for(const k of ['energy','hunger']){finite(t[k],path+'.'+k);if(t[k]<0||t[k]>100)fail(path+'.'+k);}integer(t.lastUpkeep,path+'.lastUpkeep');integer(t.lastActionTick,path+'.lastActionTick',-1);integer(t.after,path+'.after');if(t.version!==1||t.lastUpkeep>s.tick||t.lastActionTick>s.tick||t.after>s.tick+24||t.lessons.length>3||t.finds.length>8||t.finds.length&&t.lessons.length!==3)fail(path);
 let last=-24;for(const l of t.lessons){fields(l,['tick','owner','area','sample'],path+'.lesson');fields(l.sample,['kind','holder','quantity'],path+'.sample');integer(l.tick,path+'.lesson.tick');integer(l.sample.quantity,path+'.sample.quantity',1);if(l.tick<last+24||l.tick>s.tick||!s.people[l.owner]||!s.areas[l.area]||l.sample.kind!=='herb'||l.sample.holder!==l.owner)fail(path+'.lesson');last=l.tick;}
 for(const f of t.finds){fields(f,['tick','owner','area','object','remaining'],path+'.find');integer(f.tick,path+'.find.tick');integer(f.remaining,path+'.find.remaining',1);if(f.tick<last||f.tick>s.tick||!s.people[f.owner]||!s.areas[f.area]?.objects.some(o=>o.id===f.object&&o.kind==='herb'))fail(path+'.find');}
}
const actorDomains={
 personality:['courage','curiosity','sociability','generosity'],stats:['might','wit','guile','luck','spirit'],destiny:['id','completed','progress'],
 travel:['voyages','portals','epochs','storms'],mind:['type','stress','lastCoin','lastArea','settled'],magic:['mana','maxMana','spells','cooldowns','casts'],
 weatherTaste:['likes','dislikes','sensitivity','lastMood','shelteredPeriod'],planning:['checked','last','preparations'],commitments:['memories','personal','decisions','nextPersonalAt'],
 innerLife:['facets','spokeAt','history','lastAssessment'],money:['style','priority'],workMaterials:['known','cargo','revision'],social:['fame','home','lastCivilQuestWork','lostCompanions'],
 civic:['authority','holdings','lastDecision'],affiliation:['primary','paths','after','changes'],campLife:['lastCamp','history'],sketchbook:['interest','paper','practice','pending','works'],
 smoking:['habit','tobacco','uses','lastUse','affectedUntil'],storyRarity:['affinity','budget','started','nextEligible'],stories:['active','nextOffer','completed']
};

// This validates one present contract. It cannot construct a world, award an
// item, infer a death date or interpret an older file as a partially new one.
function validateNavigationMemory(s,h){
 if(!own(h,'navigationMemory'))return;const q=h.navigationMemory,key=h.lineage+'.navigationMemory';fields(q,['version','blockers'],key);array(q.blockers,key);if(q.version!==1||q.blockers.length>12)fail(key);const ids=new Set();
 for(const r of q.blockers){fields(r,['id','object','area','found','seen','status','blocking','method','needed','entry','bottom','upper','span','direction','knownAnchor','knownBypass','knownRope','action','after','lastFailed','attempts','reason'],key);for(const k of ['found','seen','after','attempts'])integer(r[k],key+'.'+k);fields(r.action,['kind','area','x'],key+'.action');array(r.needed,key+'.needed');for(const k of ['entry','bottom','upper','span'])finite(r[k],key+'.'+k);
  if(ids.has(r.id)||typeof r.object!=='string'||typeof r.action.kind!=='string'||r.id!=='navigation/'+h.lineage+'/'+r.object||!s.areas[r.area]||!s.areas[r.action.area]||r.found>r.seen||r.seen>s.tick||r.upper>=r.bottom||r.span<=0||r.entry<0||r.entry>100||![-1,1].includes(r.direction)||r.entry!==(r.direction>0?r.upper:r.bottom)||!['waiting','returning','passed','closed'].includes(r.status)||r.method!=='rope-descent'||r.needed.join('/')!=='rope/rope-knot/anchor'||typeof r.blocking!=='boolean'||typeof r.knownAnchor!=='boolean'||typeof r.knownBypass!=='boolean'||typeof r.lastFailed!=='string'||typeof r.reason!=='string'||!Number.isFinite(r.action.x))fail(key);ids.add(r.id);
  for(const k of ['started','closedAt'])if(own(r,k)){integer(r[k],key+'.'+k);if(r[k]>s.tick)fail(key+'.'+k);}
  if(r.knownRope!==null){const t=r.knownRope;fields(t,['id','length','owner','progress','seen'],key+'.knownRope');integer(t.seen,key+'.knownRope.seen');if(typeof t.id!=='string'||t.length!==24||!s.people[t.owner]||![1,2].includes(t.progress)||t.seen>s.tick)fail(key+'.knownRope');}
 }
}
function validateClothingItem(s,i){if(!own(i,'clothing'))return;const c=i.clothing,key='clothing.item.'+i.id;fields(c,['version','kind','material','source'],key);const r=c.source;fields(r,['kind','area','at','before','after'],key+'.source');for(const k of ['at','before','after'])integer(r[k],key+'.source.'+k);if(c.version!==1||!['warm','light'].includes(c.kind)||c.material!==(c.kind==='warm'?'wool':'linen')||i.slot!=='armor'||i.base!=='coat'||i.stat!=='defense'||r.kind!=='merchant-stock'||!s.areas[r.area]||r.at>s.tick||r.before<1||r.before-r.after!==1)fail(key);}
function validateClothingCare(s,h){if(!own(h,'clothingCare'))return;const q=h.clothingCare,key=(h.lineage||'actor')+'.clothingCare';fields(q,['version','serial','checked','lastActionTick','history'],key);integer(q.serial,key+'.serial');integer(q.lastActionTick,key+'.lastActionTick',-1);array(q.history,key+'.history');if(q.version!==1||q.lastActionTick>s.tick||q.checked!==null&&typeof q.checked!=='string'||q.history.length>8)fail(key);for(const e of q.history){fields(e,['tick','kind','item','area','amount','reason'],key+'.event');integer(e.tick,key+'.event.tick');integer(e.amount,key+'.event.amount');if(e.tick>s.tick||!['bought','sold','declined'].includes(e.kind)||e.item!==null&&typeof e.item!=='string'||!s.areas[e.area]||typeof e.reason!=='string')fail(key+'.event');}}
function validateNavigationItem(s,i,holder){
 if(!own(i,'rope'))return;const r=i.rope,key='navigation.rope.'+i.id;fields(r,['version','length','instructions','source','uses'],key);array(r.uses,key);const c=r.source;fields(c,['kind','area','at','before','after'],key+'.source');for(const k of ['at','before','after'])integer(c[k],key+'.source.'+k);if(i.kind!=='fieldTool'||i.base!=='rope'||i.slot!=='tool'||r.version!==1||r.length!==24||typeof r.instructions!=='string'||c.kind!=='merchant-stock'||!s.areas[c.area]||c.at>s.tick||c.before-c.after!==1||c.before<1||r.uses.length>8)fail(key);
 let last=-1;for(const u of r.uses){fields(u,['tick','kind','area','actor'],key+'.use');integer(u.tick,key+'.use.tick');if(u.tick<last||u.tick>s.tick||!['anchor','descent','pull','cargo'].includes(u.kind)||!s.areas[u.area]||!s.people[u.actor]||u.kind==='pull'&&!s.people[u.person]||u.kind==='cargo'&&u.cargo!==s.ferry?.cargo?.id)fail(key+'.use');last=u.tick;}
 if(own(r,'attached')){const b=r.attached;fields(b,['anchor','owner','at','progress'],key+'.attached');integer(b.at,key+'.at');const o=s.areas[holder.area]?.objects.find(o=>o.id===b.anchor);if(holder.kind!=='cache'||holder.object!==b.anchor||!o||o.kind!=='descent'||o.owner!==b.owner||!s.people[b.owner]||b.at>s.tick||![1,2].includes(b.progress))fail(key+'.attached');}
}
function validateNavigationPeople(s){
 if(own(s.merchant,'toolPurse')){finite(s.merchant.toolPurse,'navigation.merchant.purse');if(s.merchant.toolPurse<0)fail('navigation.merchant.purse');}
 for(const p of Object.values(s.people)){
  if(own(p,'toolPractice')){const q=p.toolPractice,key=p.id+'.toolPractice';fields(q,['version','rope','events'],key);fields(q.rope,['lessons','lastActionTick'],key+'.rope');array(q.rope.lessons,key+'.lessons');array(q.events,key+'.events');integer(q.rope.lastActionTick,key+'.lastActionTick',-1);if(q.version!==1||q.rope.lessons.length>2||q.events.length>8||q.rope.lastActionTick>s.tick)fail(key);let last=-1;for(const l of q.rope.lessons){fields(l,['tick','item','area','source'],key+'.lesson');integer(l.tick,key+'.lesson.tick');if(l.tick<=last||l.tick>s.tick||typeof l.item!=='string'||!s.areas[l.area]||l.source!=='own-rope-illustrated-knots')fail(key+'.lesson');last=l.tick;}for(const e of q.events){fields(e,['tick','kind','item','area'],key+'.event');integer(e.tick,key+'.event.tick');if(e.tick>s.tick||!['bought','sold','anchored','descended','retrieved','pulled'].includes(e.kind)||typeof e.item!=='string'||!s.areas[e.area])fail(key+'.event');}}
  if(own(p,'ropeStranded')){const r=p.ropeStranded,key=p.id+'.ropeStranded';fields(r,['version','anchor','area','at','cause'],key);integer(r.at,key+'.at');const c=r.cause;fields(c,['kind','from','to','before','after','damage'],key+'.cause');for(const k of ['from','to','before','after','damage'])finite(c[k],key+'.cause.'+k);if(r.version!==1||r.at>s.tick||r.area!==p.area||!s.areas[r.area]?.objects.some(o=>o.id===r.anchor&&o.kind==='descent')||c.kind!=='actual-slip'||c.before-c.after!==12||c.damage!==12||c.after<=0||c.to<=c.from)fail(key);}
 }
 for(const a of Object.values(s.areas))for(const o of a.objects)if(o.kind==='descent'){const d=o.descent,key=o.id+'.descent';fields(d,['version','bottom','detour','anchor','bypass','created'],key);fields(d.anchor,['id','kind','intact'],key+'.anchor');integer(d.created,key+'.created');if(d.version!==1||!Number.isFinite(o.x)||!Number.isFinite(d.bottom)||o.x>=d.bottom||d.bottom>100||d.detour<6||d.detour>120||d.created>s.tick||typeof d.anchor.id!=='string'||d.anchor.kind!=='stump'||typeof d.anchor.intact!=='boolean'||typeof d.bypass!=='boolean'||!Array.isArray(o.items)||o.items.length>1||o.items.some(i=>i.kind!=='fieldTool'||i.base!=='rope'||!i.rope))fail(key);}
}
function validatePetCustody(s,c,owner=null){const q=c?.petCustody;if(!q)return;const key='petCustody.'+c.uid;fields(q,['version','owner','lastStep','events'],key);integer(q.lastStep,key+'.lastStep');array(q.events,key+'.events');if(q.version!==1||!s.people[q.owner]||owner&&q.owner!==owner||q.lastStep>s.tick||q.events.length>8||!q.events.length||q.events.at(-1).to!==q.owner)fail(key);if(own(q,'lastActionTick')){integer(q.lastActionTick,key+'.lastActionTick');if(q.lastActionTick>s.tick)fail(key+'.lastActionTick');}if(own(q,'blocked')){fields(q.blocked,['area','object','at'],key+'.blocked');integer(q.blocked.at,key+'.blocked.at');if(q.blocked.at>s.tick||!s.areas[q.blocked.area]||typeof q.blocked.object!=='string')fail(key+'.blocked');}if(!c.packCargo){fields(q.body,['area','x'],key+'.body');if(!s.areas[q.body.area]||!Number.isFinite(q.body.x)||q.body.x<0||q.body.x>100)fail(key+'.body');}else if(own(q,'body'))fail(key+'.doubleBody');for(const e of q.events){fields(e,['tick','from','to','amount','kind','area'],key+'.event');integer(e.tick,key+'.event.tick');integer(e.amount,key+'.event.amount');if(e.tick>s.tick||!s.people[e.from]||!s.people[e.to]||e.from===e.to||!['sell','gift','buy','rejoined'].includes(e.kind)||!s.areas[e.area]||e.kind==='gift'&&e.amount!==0)fail(key+'.event');}}
function validatePetMemo(s,h){if(!own(h,'petTransfers'))return;const q=h.petTransfers,key=h.lineage+'.petTransfers';fields(q,['version','checked','lastActionTick','events'],key);integer(q.lastActionTick,key+'.lastActionTick',-1);array(q.events,key+'.events');if(q.version!==1||q.lastActionTick>s.tick||q.checked!==null&&typeof q.checked!=='string'||q.events.length>8)fail(key);for(const e of q.events){fields(e,['tick','uid','name','other','kind','amount','area','reason'],key+'.event');integer(e.tick,key+'.tick');integer(e.amount,key+'.amount');if(e.tick>s.tick||typeof e.uid!=='string'||typeof e.name!=='string'||!s.people[e.other]||!['sell','gift','buy','refused'].includes(e.kind)||!s.areas[e.area]||typeof e.reason!=='string')fail(key+'.event');}}
function validatePetPassage(s,h){if(!own(h,'petPassage'))return;const q=h.petPassage,key=h.lineage+'.petPassage';fields(q,['version','lastActionTick','deferred','memories'],key);integer(q.lastActionTick,key+'.lastActionTick',-1);array(q.memories,key+'.memories');if(q.version!==1||q.lastActionTick>s.tick||q.memories.length>8)fail(key);if(q.deferred!==null){const d=q.deferred;fields(d,['target','until','at'],key+'.deferred');integer(d.at,key+'.deferred.at');integer(d.until,key+'.deferred.until');if(!s.areas[d.target]||d.at>s.tick||d.until!==d.at+48)fail(key+'.deferred');}const ids=new Set();for(const m of q.memories){fields(m,['uid','name','keeper','area','x','id','started','until','paid','state','departed','call'],key+'.memory');integer(m.started,key+'.started');integer(m.until,key+'.until');if(typeof m.uid!=='string'||typeof m.name!=='string'||!s.people[m.keeper]||!s.areas[m.area]||!Number.isFinite(m.x)||m.x<0||m.x>100||typeof m.id!=='string'||ids.has(m.id)||m.started>s.tick||m.until!==m.started+240||m.paid!==3||!['left','called','retrieved','missing'].includes(m.state)||typeof m.departed!=='boolean'||m.state==='called'&&m.call===null)fail(key+'.memory');ids.add(m.id);for(const k of ['callChecked','observedMissingAt'])if(own(m,k)){integer(m[k],key+'.'+k);if(m[k]>s.tick)fail(key+'.'+k);}if(own(m,'departedAt')){integer(m.departedAt,key+'.departedAt');if(m.departedAt>s.tick)fail(key+'.departedAt');}if(m.state==='retrieved'){integer(m.returned,key+'.returned');if(m.returned>s.tick)fail(key+'.returned');}if(m.call!==null){fields(m.call,['id','at','until','area','x'],key+'.call');integer(m.call.at,key+'.call.at');integer(m.call.until,key+'.call.until');if(typeof m.call.id!=='string'||m.call.at>s.tick||m.call.until!==m.call.at+160||!s.areas[m.call.area]||!Number.isFinite(m.call.x))fail(key+'.call');}if(own(m,'reply')){fields(m.reply,['at','result','messenger'],key+'.reply');integer(m.reply.at,key+'.reply.at');if(m.reply.at>s.tick||!['accepted','missing','blocked'].includes(m.reply.result)||!s.people[m.reply.messenger])fail(key+'.reply');}}}
function validatePetBoardings(s){for(const p of Object.values(s.people)){const q=p.petBoarding,m=p.petMessage;if(q&&m)fail(p.id+'.pet.jobs');if(own(p,'petBoarding')&&q!==null){const key=p.id+'.petBoarding';fields(q,['version','id','owner','pet','lastStep','started','until','paid','area','x','status','resume','call','cargo'],key);for(const k of ['lastStep','started','until'])integer(q[k],key+'.'+k);array(q.cargo,key+'.cargo');if(q.version!==1||typeof q.id!=='string'||s.hero.lineage!==q.owner&&!s.actorStates[q.owner]||q.pet?.id!=='dog'||q.pet.person||!(q.pet.hp>0)||!Number.isFinite(q.pet.hp)||!Number.isFinite(q.pet.maxHp)||q.pet.hp>q.pet.maxHp||!q.pet.petTraining||q.pet.packCargo&&q.pet.packCargo.owner!==q.owner||q.lastStep>s.tick||q.started>s.tick||q.until!==q.started+240||q.paid!==3||!s.areas[q.area]||!Number.isFinite(q.x)||!['holding','returning'].includes(q.status)||q.resume!==null&&typeof q.resume!=='object'||q.cargo.some(id=>typeof id!=='string')||new Set(q.cargo).size!==q.cargo.length)fail(key);if(q.call!==null){fields(q.call,['id','area','x','at'],key+'.call');integer(q.call.at,key+'.call.at');if(q.call.at>s.tick||typeof q.call.id!=='string'||!s.areas[q.call.area]||!Number.isFinite(q.call.x))fail(key+'.call');}if(own(q,'blockedAt')){integer(q.blockedAt,key+'.blockedAt');if(q.blockedAt>s.tick)fail(key+'.blockedAt');}}
 if(own(p,'petMessage')&&m!==null){const key=p.id+'.petMessage';fields(m,['version','id','owner','uid','keeper','booking','area','x','fromArea','fromX','started','deadline','paid','stage','result','resume'],key);integer(m.started,key+'.started');integer(m.deadline,key+'.deadline');if(m.version!==1||typeof m.id!=='string'||s.hero.lineage!==m.owner&&!s.actorStates[m.owner]||typeof m.uid!=='string'||!s.people[m.keeper]||m.keeper===p.id||typeof m.booking!=='string'||!s.areas[m.area]||m.area!==m.fromArea||!Number.isFinite(m.x)||!Number.isFinite(m.fromX)||m.started>s.tick||m.deadline!==m.started+160||m.paid!==1||!['outbound','reply'].includes(m.stage)||![null,'accepted','missing','blocked'].includes(m.result)||m.resume!==null&&typeof m.resume!=='object')fail(key);}}
}
function validatePackLocations(s){
 const pets=new Set(),seen=new Map(),actors=new Map(Object.entries(s.actorStates));actors.set(s.hero.lineage,s.hero);
 function item(i,container,holder){if(!i?.id)return;validateNavigationItem(s,i,holder);validateClothingItem(s,i);validateProstheticItem(s,i,fail);const tagged=own(i.physical?.holder||{},'container'),previous=seen.get(i.id);if(previous&&(tagged||previous.tagged))fail('container.duplicate.'+i.id);seen.set(i.id,{tagged:tagged||previous?.tagged});if(tagged&&(i.physical.holder.container!==container||Object.entries(holder).some(([k,v])=>i.physical.holder[k]!==v)))fail('container.location.'+i.id);}
 function pet(c){const q=c?.packCargo;if(!q)return;const key='packPet.'+c.uid;fields(q,['version','capacity','owner','body','items','lastStep','lastActionTick','lastKnown','source','history'],key);fields(q.body,['area','x'],key+'.body');fields(q.lastKnown,['area','x','at','reason'],key+'.lastKnown');fields(q.source,['kind','area','at','before','after','price'],key+'.source');array(q.items,key+'.items');array(q.history,key+'.history');for(const k of ['lastStep','lastActionTick'])integer(q[k],key+'.'+k);for(const k of ['at','before','after','price'])integer(q.source[k],key+'.source.'+k);integer(q.lastKnown.at,key+'.lastKnown.at');const units=q.items.reduce((n,i)=>n+(i.slot==='armor'?3:i.slot==='weapon'?2:Math.max(1,Math.ceil(Math.max(0,i.quantity||0)/4))),0);if(q.version!==1||q.capacity!==6||c.id!=='dog'||c.person||typeof c.uid!=='string'||pets.has(c.uid)||!s.people[q.owner]||!s.areas[q.body.area]||!Number.isFinite(q.body.x)||q.body.x<0||q.body.x>100||!s.areas[q.lastKnown.area]||!Number.isFinite(q.lastKnown.x)||q.lastKnown.at>s.tick||typeof q.lastKnown.reason!=='string'||q.source.kind!=='merchant-stock'||!s.areas[q.source.area]||q.source.at>s.tick||q.source.before-q.source.after!==1||q.source.before<1||q.source.price<1||q.lastStep>s.tick||q.lastActionTick>s.tick||units>6||q.history.length>8||!c.petTraining)fail(key);if(own(q,'blocked')){fields(q.blocked,['area','object','at'],key+'.blocked');integer(q.blocked.at,key+'.blocked.at');if(q.blocked.at>s.tick||!s.areas[q.blocked.area]||typeof q.blocked.object!=='string')fail(key+'.blocked');}petStudy(s,c,key+'.needs',new Set());pets.add(c.uid);for(const e of q.history){fields(e,['tick','kind','area','x','item'],key+'.event');integer(e.tick,key+'.event.tick');if(e.tick>s.tick||!['fitted','loaded','unloaded','fed','intercepted'].includes(e.kind)||!s.areas[e.area]||!Number.isFinite(e.x)||e.item!==null&&typeof e.item!=='string'||e.kind==='intercepted'&&(!e.item||typeof e.enemy!=='string'||!s.areas[e.area].objects.some(o=>o.id===e.enemy)))fail(key+'.event');}for(const i of q.items)item(i,'pet/'+c.uid,{kind:'companion',id:c.uid});}
 for(const [id,h]of actors){for(const c of h.companions){validatePetCustody(s,c,id);pet(c);}for(const i of h.bag)item(i,'pack/'+id,{kind:'person',id});for(const i of Object.values(h.equipment).filter(Boolean))item(i,'equipment/'+id,{kind:'person',id});}
 for(const p of Object.values(s.people))if(p.prosthetic)item(p.prosthetic.item,'prosthesis/'+p.id,{kind:'person',id:p.id});
 for(const p of Object.values(s.people))if(p.petBoarding){validatePetCustody(s,p.petBoarding.pet,p.petBoarding.owner);pet(p.petBoarding.pet);}
 for(const p of Object.values(s.people))for(const c of p.pets||[]){validatePetCustody(s,c,p.id);pet(c);}
 for(const p of Object.values(s.people))if(!actors.has(p.id))for(const i of p.looseItems||p.legacy?.keepsakes||[])item(i,'pack/'+p.id,{kind:'person',id:p.id});
 for(const a of Object.values(s.areas))for(const o of a.objects){validatePetCustody(s,o.existingPet||o.packPetBody||o.petBody);pet(o.existingPet||o.packPetBody||o.petBody);for(const i of o.items||[])item(i,'cache/'+a.id+'/'+o.id,{kind:'cache',area:a.id,object:o.id});}
 for(const m of Object.values(s.horses?.byId||{}))for(const i of m.cargo?.items||[])item(i,'mount/'+m.id,{kind:'mount',id:m.id});
 for(const i of s.merchant.items||[])item(i,'merchant/merchant',{kind:'merchant',id:'merchant'});
}
export function validateSave(s){
 const mapMaterialIds=new Set(),physicalMapIds=new Set();
 const liftPartIds=new Set();
 const trainedPetIds=new Set();
 function part(item,holder,path){if(!item?.mechanismPart)return;const m=item.mechanismPart,n=Object.values(s.edges).find(e=>e.lift?.id===m.node)?.lift;fields(m,['version','node','created'],path+'.mechanismPart');integer(m.created,path+'.created');fields(item.physical,['version','holder','movedAt'],path+'.physical');if(!n||m.version!==1||m.created!==n.created||!n.issued.includes(item.id)||liftPartIds.has(item.id)||item.physical.version!==1||Object.entries(holder).some(([k,v])=>item.physical.holder[k]!==v))fail(path);liftPartIds.add(item.id);}
 if(!object(s)||s.version!==SAVE_VERSION||s.schema!==SAVE_SCHEMA)throw new Error('Этот файл использует другой формат сохранения. Нужен актуальный экспорт игры.');
 fields(s,['rng','seed','tick','generation','nextArea','areas','journal','graves','changes','merchant','hero','rules','randomStreams','continents','nextContinent','edges','chronology','people','nextPerson','migrations','nextMigration','society','diplomacy','propertyContracts','nextPropertyContract','propertyContractClock','workOrders','nextWorkOrder','lives','storyCases','nextStory','logistics','actorStates','observation','nextGeneration','spatial'],'world');
 for(const k of obsolete)if(own(s,k))fail('world.'+k);
 for(const k of ['rng','seed','tick','nextArea','nextPerson','nextMigration','nextStory','nextWorkOrder','nextPropertyContract'])integer(s[k],k);
 if(!Number.isInteger(s.generation)||s.generation===0||s.generation<0&&s.hero?.actorMode!=='npc')fail('generation');integer(s.nextGeneration,'nextGeneration',1);
 for(const k of ['areas','rules','randomStreams','continents','edges','people','migrations','propertyContracts','workOrders','actorStates'])fields(s[k],[],k);
 for(const k of ['journal','graves','changes','lives','storyCases'])array(s[k],k);
 for(const c of s.storyCases)if(own(c,'accessNode')){
  const n=c.accessNode,key=c.id+'.accessNode';fields(n,['version','status','remaining','bypassRemaining','lastTick','route','history'],key);
  if(c.kind!=='expedition'||c.variant!=='ship'||n.version!==1||!['blocked','open'].includes(n.status)||![null,'repair','bypass'].includes(n.route))fail(key);
  integer(n.remaining,key+'.remaining');integer(n.bypassRemaining,key+'.bypassRemaining');integer(n.lastTick,key+'.lastTick',-1);array(n.history,key+'.history');
  if(n.remaining>2||n.bypassRemaining>3||n.lastTick>s.tick||n.history.length>5|| (n.status==='open')!==(n.remaining===0||n.bypassRemaining===0))fail(key+'.progress');
  for(const e of n.history){fields(e,['tick','actor','route','energy'],key+'.history');integer(e.tick,key+'.history.tick');if(e.tick>s.tick||!s.people[e.actor]||!['repair','bypass'].includes(e.route)||e.energy!==(e.route==='repair'?4:5))fail(key+'.history');}
  if(n.remaining!==2-n.history.filter(e=>e.route==='repair').length||n.bypassRemaining!==3-n.history.filter(e=>e.route==='bypass').length||n.lastTick!==(n.history.at(-1)?.tick??-1)||n.route!==(n.history.at(-1)?.route??null)||n.history.some((e,i)=>i>0&&e.tick<=n.history[i-1].tick))fail(key+'.history.progress');
 }
 validateShipRecovery(s,fail);
 validateVerdictReviews(s,fail);
 validateHomes(s,fail);
 validateHomeBuilding(s,fail);
 validateFirstObservation(s,fail);validateFamilies(s,fail);validateMaterialResearch(s,fail);validateArtifactMemories(s,fail);validateAges(s,fail);validateCouncils(s,fail);validateBiology(s,fail);validateTexts(s,fail);validateStealth(s,fail);validateDecoys(s,fail);validateAuthorities(s,fail);validateClinicalPractice(s,fail);validateClinicalStudy(s,fail);validateDiplomacy(s,fail);validatePublicRepairs(s,fail);validateWills(s,fail);validateTitles(s,fail);validateFarming(s,fail);validateHobbySupply(s,fail);validateCargoCases(s,fail);validateServiceMasks(s,fail);validateSpellTexts(s,fail);validateScholar(s,fail);validateCopyOrders(s,fail);validateLibraries(s,fail);validateCastles(s,fail);validateCurrency(s,fail);validateRemainsCarry(s,fail);validateRemainsCycle(s,fail);
 validateLiteracy(s,fail);
 validateSequences(s,fail);
 validateTracking(s,fail);
 validateBuildingRuins(s,fail);
 validateNews(s,fail);
 validateWaystones(s,fail);validateDelveLayouts(s,fail);validateShortcuts(s,fail);validateGuardians(s,fail);validatePositions(s,fail);validateWounds(s,fail);validateWoundCare(s,fail);validateWoundInfection(s,fail);validateFractures(s,fail);validatePatients(s,fail);validateLimbLosses(s,fail);validateProsthetics(s,fail);validateEnemyPeople(s,fail);validateRivalry(s,fail);validateHostiles(s,fail);validatePlaceRules(s,fail);validateGeographyFrame(s,fail);validateMetricRoutes(s,fail);validateRoadStops(s,fail);validateHorses(s,fail);validateWagons(s,fail);validateCoverRetreat(s,fail);validateWorldChanges(s,fail);validateEarthquakes(s,fail);validateHarvestFailures(s,fail);validateHarvestShortfalls(s,fail);validateProductionFinance(s,fail);validatePatronage(s,fail);validateAssetRisk(s,fail);validateFerry(s,fail);validateFerryCargo(s,fail);validateMeasuredWard(s,fail);validateMechanicDrive(s,fail);validateBuildingControl(s,fail);validatePeopleCarry(s,fail);
 validateCommissions(s,fail);
 validateBranchPacts(s,fail);
 validateFeasts(s,fail);
 validateMigrationKnowledge(s,fail);validateRefuges(s,fail);validateFoundations(s,fail);validateNeighborHousing(s,fail);validateDwellings(s,fail);validateRuinReturns(s,fail);validateEstateClaims(s,fail);validateSockets(s,fail);validateGearPairs(s,fail);validateRecollection(s,fail);validateLocalMaterials(s,fail);validateCauseways(s,fail);
 for(const life of s.lives){fields(life,['generation','lineage','born','ended','outcome','cause','name','items','timeline'],'life');if(life.outcome!=='dead'||!s.people[life.lineage])fail('life.outcome');integer(life.born,'life.born');integer(life.ended,'life.ended');if(life.ended<life.born||life.ended>s.tick)fail('life.ended');if(own(life,'portraitSnapshot')){const q=life.portraitSnapshot;fields(q,['version','race','alive','look'],'life.portraitSnapshot');if(q.version!==1||q.alive!==false||q.race!==null&&!RACES.some(r=>r.id===q.race)||!object(q.look)||!['skin','hair','hairStyle','hat'].every(k=>typeof q.look[k]==='string')||!Array.isArray(q.look.injuryMarks)||q.look.injuryMarks.some(m=>!object(m)||!['scar','burn'].includes(m.kind)||!['face','cap','plating'].includes(m.part)))fail('life.portraitSnapshot');}}
 fields(s.society,['events','journeys','orders','nextEvent','nextEnemy'],'society');
 fields(s.logistics,['convoys','nextConvoy','nextDispatch','deliveries','losses','history'],'logistics');
 array(s.society.journeys,'society.journeys');array(s.logistics.convoys,'logistics.convoys');
 validateNavigationPeople(s);validatePackLocations(s);
 for(const j of s.society.journeys){fields(j,['version','movement','person','from','to','reason'],'journey');if(!['timed','physical'].includes(j.movement)||own(j,'journeyVersion')||!s.people[j.person]||!s.areas[j.from]||!s.areas[j.to])fail('journey.movement');if(j.movement==='timed')integer(j.arrival,'journey.arrival');else{fields(j,['path','index','started','lastTick','elapsed'],'journey.physical');array(j.path,'journey.path');}}
 const merchantOwners=new Set();for(const c of s.logistics.convoys){fields(c,['version','movement','id','person','source','to','sourceName','targetName','path','index','food','medicine','sightings'],'convoy');if(!['timed','physical'].includes(c.movement)||own(c,'freightVersion')||!s.people[c.person])fail('convoy.movement');if(c.disruption){const d=c.disruption,key='convoy.disruption';fields(d,['version','originalTo','events'],key);array(d.events,key);if(d.version!==1||!s.areas[d.originalTo]||d.events.length<1||d.events.length>4)fail(key);for(const e of d.events){fields(e,['tick','area','person','originalTo','cause','choice','reason'],key);integer(e.tick,key+'.tick');if(e.tick>s.tick||!s.areas[e.area]||e.person!==c.person||e.originalTo!==d.originalTo||!['blocked-road','blocked-gate','market-gone','keeper-declined','return-blocked','ambush'].includes(e.cause)||!['buyer','custody','return','stranded','shed-return'].includes(e.choice)||typeof e.reason!=='string'||e.choice==='buyer'&&(!s.areas[e.to]||!Array.isArray(e.path))||e.choice==='custody'&&!s.people[e.keeper])fail(key);}}
 if(c.escaped){const e=c.escaped;fields(e,['enemy','area','at'],'convoy.escaped');integer(e.at,'convoy.escaped.at');if(e.at>s.tick||!s.areas[e.area]?.objects.some(o=>o.id===e.enemy)||!c.disruption?.events.some(v=>v.cause==='ambush'&&v.enemy===e.enemy&&v.tick===e.at))fail('convoy.escaped');}
 if(c.handoff){const h=c.handoff,key='convoy.handoff';fields(h,['version','keeper','status','started','until'],key);integer(h.started,key);integer(h.until,key);if(h.version!==1||!s.people[h.keeper]||!['approach','pending','accepted','declined'].includes(h.status)||h.started>s.tick||h.until!==h.started+48||!c.disruption)fail(key);if(h.status==='accepted'){const r=h.transfer;fields(r,['keeper','at','load','food','medicine','tools','fee'],key+'.transfer');for(const k of ['at','food','medicine','tools','fee'])integer(r[k],key+'.transfer.'+k);if(r.keeper!==h.keeper||r.load!==c.id||r.at>s.tick||r.at<h.started||c.food||c.medicine||c.tools)fail(key+'.transfer');}}
 if(c.tools!==undefined)integer(c.tools,'convoy.tools');if(c.trade){merchantRecord(s,c.trade,'convoy.trade');if(merchantOwners.has(c.person)||[s.hero,...Object.values(s.actorStates)].some(h=>h.merchantTrip?.owner===c.person))fail('convoy.trade.owner');merchantOwners.add(c.person);if(c.trade.owner!==c.person||c.trade.from!==c.source||c.trade.to!==c.to&&c.disruption?.originalTo!==c.trade.to||c.food!==0||c.medicine!==0||(c.tools||0)>c.trade.quantity||c.demand)fail('convoy.trade');}if(c.demand){const d=c.demand;fields(d,['version','kind','quantity','reserve','stockBefore','target','knownStock','seen','source'],'convoy.demand');for(const k of ['quantity','reserve','target','seen','source'])integer(d[k],'convoy.demand.'+k);for(const k of ['stockBefore','knownStock']){finite(d[k],'convoy.demand.'+k);if(d[k]<0)fail('convoy.demand.'+k);}if(d.version!==1||!['food','tools','medicine'].includes(d.kind)||d.seen>d.source||d.source>s.tick||d.quantity<1||d.quantity>(d.kind==='food'?12:d.kind==='medicine'?4:3)||d.stockBefore-d.quantity<d.reserve||(c[d.kind]||0)>d.quantity)fail('convoy.demand');}array(c.path,'convoy.path');fields(c.sightings,[],'convoy.sightings');if(c.movement==='timed')integer(c.remaining,'convoy.remaining');else fields(c,['elapsed','lastTick','manifest'],'convoy.physical');}
 fields(s.chronology,['year','paradox','visits','echoes'],'chronology');
 if(own(s.chronology,'periodHistory')){const h=s.chronology.periodHistory,key='chronology.periodHistory';fields(h,['version','serial','entries'],key);integer(h.serial,key+'.serial');array(h.entries,key+'.entries');if(h.version!==1||!h.entries.length||h.serial!==h.entries.length-1)fail(key);const causes=new Set();for(let i=0;i<h.entries.length;i++){const p=h.entries[i];fields(p,['id','kind','startTick','knownStart','firstYear','name','shortName','reason','previous','cause'],key+'.period');integer(p.startTick,key+'.startTick');if(p.id!==`period/${s.seed}/${i}`||!Number.isSafeInteger(p.firstYear)||p.startTick>s.tick||typeof p.name!=='string'||!p.name||p.name.length>80||typeof p.shortName!=='string'||!p.shortName||p.shortName.length>24||typeof p.reason!=='string')fail(key+'.period');if(i===0){if(p.kind!=='legacy'||p.startTick!==0||p.knownStart!==false||p.previous!==null||p.cause!==null)fail(key+'.initial');}else{const c=p.cause;fields(c,['id','tick','area','domain','actors','text','knownBy','witnesses'],key+'.cause');array(c.actors,key);array(c.knownBy,key);array(c.witnesses,key);if(p.kind!=='historical'||p.knownStart!==true||p.firstYear!==1||p.startTick<=h.entries[i-1].startTick||p.previous!==h.entries[i-1].id||c.tick!==p.startTick||typeof c.id!=='string'||!c.id||causes.has(c.id)||typeof c.domain!=='string'||!c.domain||typeof c.text!=='string'||c.area!==null&&!s.areas[c.area]||c.actors.some(id=>!s.people[id]))fail(key+'.cause');causes.add(c.id);}}}

 fields(s.diplomacy,['relations','changes'],'diplomacy');
 fields(s.spatial,['version','scheme','revision','layers','initialized'],'spatial');
 fields(s.merchant,['name','area','destination','arrival','nextMove','stock','serviceStock'],'merchant');fields(s.merchant.serviceStock,['version','gear','medicine'],'merchant.serviceStock');
 for(const k of ['gear','medicine'])integer(s.merchant.serviceStock[k],'merchant.serviceStock.'+k);
 if(s.remains){
  fields(s.remains,['version','byId'],'remains');fields(s.remains.byId,[],'remains.byId');if(own(s.remains,'nextCompanion'))fail('remains.nextCompanion');
  const position=(p,path)=>{fields(p,['kind'],path);if(p.kind==='area'){fields(p,['area','x'],path);if(!s.areas[p.area])fail(path+'.area');finite(p.x,path+'.x');}else if(p.kind==='transit')fields(p.journey,[],path+'.journey');else if(p.kind==='carrier'){fields(p,['person'],path);if(!s.people[p.person])fail(path+'.person');}else if(p.kind!=='unknown')fail(path+'.kind');};
  for(const [key,b]of Object.entries(s.remains.byId)){
   fields(b,['version','id','deathId','source','stage','carrier','position','facing','death','loot'],key);fields(b.source,['kind','id'],key+'.source');fields(b.death,['tick','source','name','family','race','species','shape','role','traveller','facing','fallSide','appearance','anatomy','position','cause'],key+'.death');
   const d=b.death;integer(d.tick,key+'.death.tick');if(d.tick>s.tick||!['person','enemy','companion'].includes(b.source.kind)||typeof b.source.id!=='string'||b.id!==key||key!==`corpse:${b.source.kind}:${b.source.id}:${d.tick}`||b.deathId!==`death:${b.source.kind}:${b.source.id}:${d.tick}`||JSON.stringify(d.source)!==JSON.stringify(b.source))fail(key+'.identity');
   if(b.material)validateBodyMaterial(s,b,key+'.material');
   if(!['fresh','trace','bones','buried','consumed'].includes(b.stage)||![-1,1].includes(b.facing)||![null,-1,1].includes(d.facing)||![-1,1].includes(d.fallSide))fail(key+'.stage');
   fields(d.anatomy,['form','stature','recorded'],key+'.anatomy');if(!(d.anatomy.stature>0))fail(key+'.anatomy.stature');position(b.position,key+'.position');position(d.position,key+'.death.position');if(d.position.kind==='carrier')fail(key+'.death.position');array(b.loot,key+'.loot');
   if(b.carrier!==null)fields(b.carrier,['kind','id'],key+'.carrier');for(const k of ['gold','items','inventory','equipment'])if(own(b,k))fail(key+'.'+k);
  }
 }
 // Module settings are optional overrides with the enabled() default. Missing
 // settings never trigger a load-time write or a new generation of readers.
 for(const [id,value]of Object.entries(s.rules))if(typeof value!=='boolean'||!MODULES.some(m=>m.id===id))fail('rules.'+id);
 for(const [id,value]of Object.entries(s.randomStreams))integer(value,'randomStreams.'+id);
 for(const [key,e]of Object.entries(s.edges))if(own(e,'lift')){
  const n=e.lift,path='edges.'+key+'.lift';fields(n,['version','id','from','to','bypass','status','created','console','repair','wear','rides','charge','parts','issued','history'],path);fields(n.console,['id','area','x'],path+'.console');fields(n.charge,['fed','remaining','spent','discarded','loads'],path+'.charge');array(n.parts,path+'.parts');array(n.issued,path+'.issued');array(n.history,path+'.history');for(const k of ['created','repair','wear','rides'])integer(n[k],path+'.'+k);for(const k of ['fed','remaining','spent','discarded','loads'])integer(n.charge[k],path+'.charge.'+k);finite(n.console.x,path+'.console.x');
  if(n.version!==1||n.id!=='lift/'+key||[n.from,n.to].sort().join('|')!==key||!s.areas[n.from]?.links.includes(n.to)||!s.areas[n.to]?.links.includes(n.from)||!s.areas[n.from].links.includes(n.bypass)||!s.areas[n.to].links.includes(n.bypass)||n.created>s.tick||!['broken','ready','dismantled'].includes(n.status)||n.console.area!==n.from||n.console.id!==n.id+'/console'||n.console.x<0||n.console.x>100||n.repair>2||n.wear>3||n.status==='ready'&&n.wear>=3||n.charge.remaining>3||n.charge.fed!==n.charge.loads*3||n.charge.spent!==n.rides||n.charge.fed!==n.charge.remaining+n.charge.spent+n.charge.discarded||n.parts.length!==(n.status==='dismantled'?0:2)||n.status==='dismantled'&&n.charge.remaining!==0||JSON.stringify(n.issued)!==JSON.stringify([n.id+'/part/0',n.id+'/part/1'])||n.history.length>12)fail(path);
  if(n.charge.loads){const c=n.charge.source;fields(c,['person','tick','resource','quantity','before','after'],path+'.charge.source');integer(c.tick,path+'.charge.source.tick');integer(c.after,path+'.charge.source.after');if(!s.people[c.person]||c.tick>s.tick||c.resource!=='relic'||c.quantity!==1||c.before!==c.after+1)fail(path+'.charge.source');}
  for(const item of n.parts)part(item,{kind:'mechanism',id:n.id},path+'.part');for(const h of n.history){fields(h,['tick','person','action'],path+'.history');integer(h.tick,path+'.history.tick');if(h.tick<n.created||h.tick>s.tick||!s.people[h.person]||!['repair','fuel','dismantle','ride'].includes(h.action))fail(path+'.history');}
 }
 for(const m of Object.values(s.horses?.byId||{}))for(const i of m.cargo?.items||[])part(i,{kind:'mount',id:m.id},'item.'+i.id);
 const frames=[s.hero,...Object.values(s.actorStates)];for(const h of frames)for(const item of [...h.bag,...Object.values(h.equipment).filter(Boolean)])part(item,{kind:'person',id:h.lineage},'item.'+item.id);
 for(const p of Object.values(s.people)){if(!frames.some(h=>h.lineage===p.id))for(const item of p.looseItems||[])part(item,{kind:'person',id:p.id},'item.'+item.id);for(const o of Object.values(p.forging?.orders||{}))if(o.status==='working')for(const m of o.materials)if(m.original)part(m.original,{kind:'forge-order',id:o.id},'item.'+m.original.id);}
 for(const a of Object.values(s.areas))for(const o of a.objects)for(const item of [...(o.items||[]),...(o.paymentItems||[])])part(item,{kind:o.paymentItems?.includes(item)?'object':'cache',area:a.id,object:o.id},'item.'+item.id);
 for(const item of s.merchant.items||[])part(item,{kind:'merchant',id:'merchant'},'item.'+item.id);
 for(const [key,e]of Object.entries(s.edges))if(own(e,'mechanism')){
  const g=e.mechanism,path='edges.'+key+'.mechanism';fields(g,['version','id','from','to','state','created','changed','lever','bypass','operations'],path);fields(g.lever,['id','area','x'],path+'.lever');array(g.operations,path+'.operations');integer(g.created,path+'.created');integer(g.changed,path+'.changed');finite(g.lever.x,path+'.lever.x');
  if(g.version!==1||g.id!=='grate/'+key||[g.from,g.to].sort().join('|')!==key||!s.areas[g.from]?.links.includes(g.to)||!s.areas[g.to]?.links.includes(g.from)||!['open','closed'].includes(g.state)||g.created>g.changed||g.changed>s.tick||g.lever.id!=='lever/'+key||g.lever.area!==g.from||g.lever.x<0||g.lever.x>100||!s.areas[g.bypass]||!s.areas[g.from].links.includes(g.bypass)||!s.areas[g.to].links.includes(g.bypass)||g.operations.length>8)fail(path);
  let last=-1;for(const o of g.operations){fields(o,['tick','person','state'],path+'.operation');integer(o.tick,path+'.operation.tick');if(o.tick<g.created||o.tick<last||o.tick>g.changed||!s.people[o.person]||!['open','closed'].includes(o.state))fail(path+'.operation');last=o.tick;}
  if(g.operations.length&&(g.operations.at(-1).state!==g.state||last!==g.changed))fail(path+'.state');
  if(own(g,'holding')){fields(g.holding,['version','person'],path+'.holding');const p=s.people[g.holding.person];if(g.holding.version!==1||g.holding.person!==null&&(!p||p.mechanismDuty?.key!==key||p.mechanismDuty.stage!=='holding')||g.state!==(g.holding.person?'open':'closed'))fail(path+'.holding');}
 }
 for(const [id,a]of Object.entries(s.areas)){
  fields(a,['id','type','name','paletteVersion','links','objects','continent','realm','era','culture','visited','discovered','visits','expanded','forage','spatial'],id);
  if(a.id!==id||a.paletteVersion!==2||typeof a.name!=='string'||typeof a.type!=='string'||own(a,'contentVersion'))fail(id);
  if(a.temporaryCamp){const t=a.temporaryCamp;fields(t,['parent','mode'],id+'.temporaryCamp');if(!s.areas[t.parent]||own(t,'legacy'))fail(id+'.temporaryCamp');if(t.mode==='personal')fields(t.returns,[],id+'.temporaryCamp.returns');else if(t.mode==='anchored')fields(t.site,['version','parent','parentX','localEntry','placedAt','source'],id+'.temporaryCamp.site');else fail(id+'.temporaryCamp.mode');}
  array(a.links,id+'.links');array(a.objects,id+'.objects');
  if(a.links.some(to=>!own(s.areas,to)))fail(id+'.links');
  for(const o of a.objects){
   fields(o,['id','kind','x'],id+'.object');finite(o.x,o.id+'.x');
   if(o.kind==='mechanismLever'){const g=s.edges[o.key]?.mechanism;if(!g||g.lever.area!==id||g.lever.id!==o.id||g.lever.x!==o.x)fail(o.id+'.lever');}
   if(o.kind==='liftConsole'){const n=s.edges[o.key]?.lift;if(!n||n.console.area!==id||n.console.id!==o.id||n.console.x!==o.x)fail(o.id+'.console');}
   if(o.scentCover){fields(o.scentCover,['version','created'],o.id+'.scentCover');integer(o.scentCover.created,o.id+'.scentCover.created');if(o.kind!=='herb'||o.scentCover.version!==1||o.scentCover.created>s.tick)fail(o.id+'.scentCover');}
   if(o.existingPet&&!o.resolved)petStudy(s,o.existingPet,o.id+'.existingPet',trainedPetIds);
   if(o.kind==='creatureTrace'){const t=o.trace,key=o.id+'.trace';fields(t,['version','enemy','species','habitat','group','created','expires'],key);integer(t.created,key+'.created');if(t.version!==1||typeof t.enemy!=='string'||!ENEMY_SPECIES.some(e=>e.id===t.species)||typeof t.habitat!=='string'||typeof t.group!=='boolean'||t.created>s.tick||t.expires!==t.created+240)fail(key);}
   if(o.kind==='buriedMoney'){
    const c=o.moneyCache,key=o.id+'.moneyCache';fields(c,['version','owner','placed','balance','deposited','withdrawn','lastTick','history'],key);
    for(const k of ['placed','balance','deposited','withdrawn','lastTick'])integer(c[k],key+'.'+k);array(c.history,key+'.history');
    if(c.version!==1||!s.people[c.owner]||c.placed>c.lastTick||c.lastTick>s.tick||c.balance!==c.deposited-c.withdrawn||c.history.length>16||o.x<0||o.x>100)fail(key);
    if(c.rights!==undefined){array(c.rights,key+'.rights');for(const r of c.rights){fields(r,['tick','from','owner','estate'],key+'.rights');integer(r.tick,key+'.rights.tick');if(r.tick>s.tick||!s.people[r.from]||!s.people[r.owner]||s.people[r.from].estate?.id!==r.estate)fail(key+'.rights');}}
    for(const e of c.history){fields(e,['tick','actor','kind','amount'],key+'.history');integer(e.tick,key+'.history.tick');integer(e.amount,key+'.history.amount',1);if(e.tick>s.tick||!s.people[e.actor]||!['deposit','withdraw'].includes(e.kind)||e.kind==='deposit'&&e.actor!==c.owner&&!c.rights?.some(r=>r.from===e.actor))fail(key+'.history');}
   }
   if(o.deathView){const d=o.deathView;fields(d,['actor','tick','until','shape'],o.id+'.deathView');integer(d.tick,o.id+'.deathView.tick');if(d.tick>s.tick||d.until!==d.tick+REMAINS_TICKS||!MOTION_SHAPES.includes(d.shape)||typeof d.actor!=='string')fail(o.id+'.deathView');}
  }
 }
 fields(s.observation,['version','person','sequence','started'],'observation');
 if(!object(s.hero)||s.observation.person!==s.hero.lineage||own(s.actorStates,s.hero.lineage))fail('observation.person');
 for(const [id,h]of Object.entries(s.actorStates))if(h?.lineage!==id)fail('actorStates.'+id);
 const actors=[s.hero,...Object.values(s.actorStates)];
 const companionIds=new Set();validatePetBoardings(s);for(const p of Object.values(s.people))if(p.petBoarding){const c=p.petBoarding.pet;if(companionIds.has(c.uid))fail(p.id+'.petBoarding.uid');companionIds.add(c.uid);petStudy(s,c,p.id+'.petBoarding.pet',trainedPetIds);}for(const p of Object.values(s.people)){if(own(p,'petTradeTick')){integer(p.petTradeTick,p.id+'.petTradeTick');if(p.petTradeTick>s.tick)fail(p.id+'.petTradeTick');}if(!own(p,'pets'))continue;array(p.pets,p.id+'.pets');if(p.pets.length>1)fail(p.id+'.pets');for(const c of p.pets){if(c.id!=='dog'||c.person||typeof c.uid!=='string'||companionIds.has(c.uid)||!Number.isFinite(c.hp)||!Number.isFinite(c.maxHp)||!(c.hp>0)||!(c.maxHp>=c.hp)||c.petCustody?.owner!==p.id||c.petTraining?.lessons.length!==3)fail(p.id+'.pets');companionIds.add(c.uid);petStudy(s,c,p.id+'.pets',trainedPetIds);}}
 if(s.hero.actorGeneration!==s.generation)fail('generation');
 if(s.nextGeneration<Math.max(1,...actors.map(h=>h.actorGeneration)))fail('nextGeneration');
 for(const h of actors){
  const id=h?.lineage||'actor';validateActionSelection(s,h,fail);validateCampMusic(s,h,fail);validateCampTopics(s,h,fail);validateNavigationMemory(s,h);validateClothingCare(s,h);validatePetMemo(s,h);validatePetPassage(s,h);if(own(h,'nextFieldTool'))integer(h.nextFieldTool,id+'.nextFieldTool');if(own(h,'wardrobe')){const q=h.wardrobe,key=id+'.wardrobe';fields(q,['version','reserve','revision','checked','lastActionTick','history'],key);integer(q.revision,key+'.revision');integer(q.lastActionTick,key+'.lastActionTick',-1);array(q.history,key+'.history');if(q.version!==1||q.reserve!==null&&typeof q.reserve!=='string'||q.checked!==null&&typeof q.checked!=='string'||q.lastActionTick>s.tick||q.history.length>8)fail(key);for(const e of q.history){fields(e,['tick','area','from','to','goal','target','proof','reason'],key+'.event');integer(e.tick,key+'.event.tick');if(e.tick>s.tick||!s.areas[e.area]||!s.areas[e.target]||typeof e.from!=='string'||typeof e.to!=='string'||e.from===e.to||typeof e.reason!=='string'||!['visible','remembered','known-route'].includes(e.proof?.kind)||typeof e.proof.id!=='string')fail(key+'.event');}}fields(h,['name','lineage','actorGeneration','area','x','hp','maxHp','energy','hunger','gold','born','alive','profession','race','family','culture','appearance','inventory','memory','personality','stats','destiny','career','conditions','habits','companions','quests','bag','equipment','counters','reputation','travel','mind','magic','weatherTaste','planning','commitments','innerLife','money','workMaterials','relations','social','civic','affiliation','property','campLife','sketchbook','smoking','startAge','life','biography','timeline','timelineDropped','storyRarity','stories','atlas'],id);
  if(!s.areas[h.area]||!s.people[id]||typeof h.alive!=='boolean')fail(id+'.body');
  if(!Number.isSafeInteger(h.actorGeneration)||h.actorGeneration===0||(h.actorMode==='npc')!==(h.actorGeneration<0))fail(id+'.actorGeneration');
  if(h!==s.hero)array(h.actorJournal,id+'.actorJournal');
  fields(h.ruleFlags,[],id+'.ruleFlags');if(JSON.stringify(h.ruleFlags)!==JSON.stringify(s.rules))fail(id+'.ruleFlags');
  for(const k of ['hp','maxHp','energy','hunger','gold','x','born'])finite(h[k],id+'.'+k);
  integer(h.born,id+'.born');if(h.born>s.tick)fail(id+'.born');
  for(const k of ['conditions','habits','companions','quests','bag','biography','timeline'])array(h[k],id+'.'+k);
  for(const c of h.companions){fields(c,['uid','id','hp','maxHp'],id+'.companions');if(typeof c.uid!=='string'||!c.uid||companionIds.has(c.uid)||c.person&&(!s.people[c.person]||c.uid!==c.person)||!Number.isFinite(c.hp)||!(c.hp>0)||!Number.isFinite(c.maxHp)||c.hp>c.maxHp)fail(id+'.companions.uid');companionIds.add(c.uid);}
  for(const c of h.companions)petStudy(s,c,id+'.companions.'+c.uid,trainedPetIds);
  if(h.memory.scentPlants){array(h.memory.scentPlants,id+'.memory.scentPlants');if(h.memory.scentPlants.length>24||new Set(h.memory.scentPlants.map(n=>n.area+'/'+n.object)).size!==h.memory.scentPlants.length)fail(id+'.memory.scentPlants');for(const n of h.memory.scentPlants){fields(n,['area','object','seen','source','dog'],id+'.scentPlant');integer(n.seen,id+'.scentPlant.seen');if(n.seen>s.tick||!s.areas[n.area]?.objects.some(o=>o.id===n.object&&o.kind==='herb')||!['sight','dog'].includes(n.source)||n.source==='sight'&&n.dog!==null||n.source==='dog'&&(typeof n.dog!=='string'||!n.dog))fail(id+'.scentPlant');}}
  if(own(h,'partyCombat'))validatePartyCombatRound(s,id,h.partyCombat);
  if(own(h,'pairDrill'))validatePairDrill(s,id,h.pairDrill);
  if(own(h,'pairCombat'))validatePairPreparation(s,id,h.pairCombat);
  for(const q of h.quests)if(q.kind==='supply'&&q.cargo){fields(q.foodCargo,['owner','quantity'],id+'.quest.foodCargo');if(!Number.isFinite(q.foodCargo.quantity)||q.foodCargo.quantity<0)fail(id+'.quest.foodCargo.quantity');}
  fields(h.inventory,['herbs','potions','relics','rations'],id+'.inventory');
  for(const k of ['herbs','potions','relics','rations'])finite(h.inventory[k],id+'.inventory.'+k);
  fields(h.memory,['places','people','avoided','facts','threats','npcNotes'],id+'.memory');
  fields(h.equipment,['weapon','armor','charm'],id+'.equipment');
  fields(h.career,['xp','rank','path','records','history','lastChange'],id+'.career');
  for(const k of ['personality','stats','destiny','counters','reputation','travel','mind','magic','weatherTaste','planning','commitments','innerLife','money','workMaterials','relations','social','civic','affiliation','property','campLife','sketchbook','smoking','storyRarity','stories'])fields(h[k],[],id+'.'+k);
  for(const [domain,keys]of Object.entries(actorDomains))fields(h[domain],keys,id+'.'+domain);
  for(const [domain,key]of [['magic','spells'],['commitments','memories'],['commitments','decisions'],['innerLife','facets'],['innerLife','history'],['workMaterials','cargo'],['civic','holdings'],['affiliation','changes'],['campLife','history'],['stories','completed']])array(h[domain][key],id+'.'+domain+'.'+key);
  for(const [domain,key]of [['magic','cooldowns'],['workMaterials','known'],['affiliation','paths'],['sketchbook','works'],['storyRarity','affinity'],['memory','avoided'],['memory','threats'],['memory','npcNotes']])fields(h[domain][key],[],id+'.'+domain+'.'+key);
  for(const key of ['places','people','facts'])array(h.memory[key],id+'.memory.'+key);
  for(const [domain,keys]of Object.entries({personality:actorDomains.personality,stats:actorDomains.stats,magic:['mana','maxMana','casts'],mind:['stress','lastCoin','settled'],weatherTaste:['sensitivity'],planning:['preparations'],smoking:['tobacco','uses','affectedUntil'],sketchbook:['paper','practice'],storyRarity:['budget','started','nextEligible']}))for(const key of keys)finite(h[domain][key],id+'.'+domain+'.'+key);
  if(h.magic.spells.some(spell=>typeof spell!=='string')||!(h.maxHp>0))fail(id+'.body');
  fields(h.life,['phase','home','ended'],id+'.life');if(h.life.ended&&h.alive)fail(id+'.life.ended');
  if(h.merchantTrip){merchantRecord(s,h.merchantTrip,id+'.merchantTrip');if(h.merchantTrip.owner!==id)fail(id+'.merchantTrip.owner');}
  if(h.innerLife.assistance){
   const list=h.innerLife.assistance,key=id+'.innerLife.assistance';array(list,key);if(list.length>8||new Set(list.map(e=>e.id)).size!==list.length)fail(key);
   for(const e of list){fields(e,['version','id','tick','area','person','enemy','wound','windup','caution','loyalty','guards','scores','choice','guard','blocked','dialogue'],key);integer(e.tick,key+'.tick');array(e.guards,key+'.guards');array(e.scores,key+'.scores');
    if(e.version!==1||e.tick>s.tick||!s.areas[e.area]||!s.people[e.person]||!s.areas[e.area].objects.some(o=>o.id===e.enemy&&o.kind==='enemy')||!['critical','wounded','holding'].includes(e.wound)||typeof e.windup!=='boolean'||![e.caution,e.loyalty].every(v=>Number.isFinite(v)&&v>=1&&v<=8)||!['fight','guard','leave'].includes(e.choice)||e.guards.some(g=>!s.people[g])||e.choice==='guard'&&!e.guards.includes(e.guard)||e.choice!=='guard'&&e.guard!==null||typeof e.dialogue!=='string'||e.blocked!==null&&typeof e.blocked!=='string'||e.scores.length<2||e.scores.length>3)fail(key);
    for(const score of e.scores)if(!['fight','guard','leave'].includes(score.method)||!Number.isFinite(score.value))fail(key+'.score');
   }
  }
  if(h.valueRevision){
   const n=h.valueRevision,key=id+'.valueRevision';fields(n,['version','help','promise','events'],key);array(n.events,key+'.events');if(n.version!==1||![0,6].includes(n.help)||![0,6].includes(n.promise)||n.events.length>8||new Set(n.events.map(e=>e.id)).size!==n.events.length)fail(key);
   const total={help:0,promise:0};for(const e of n.events){fields(e,['id','kind','quest','accepted','title','tick','area','actor','giver','person','outcome','before','after','delta','stance','reason'],key+'.event');fields(e.giver,['id','name'],key+'.giver');for(const k of ['tick','accepted'])integer(e[k],key+'.event.'+k);if(!['rescue','brokenPromise'].includes(e.kind)||e.id!==`value/${id}/${e.quest}`||e.actor!==id||!s.areas[e.area]||!s.people[e.giver.id]||typeof e.giver.name!=='string'||typeof e.title!=='string'||typeof e.reason!=='string'||e.accepted>e.tick||e.tick>s.tick||![0,6].includes(e.before)||![0,6].includes(e.after)||![0,6].includes(e.delta)||e.after!==e.before+e.delta||e.stance!==(e.delta?'changed':'kept'))fail(key+'.event');if(e.person){fields(e.person,['id','name'],key+'.person');if(!s.people[e.person.id]||typeof e.person.name!=='string')fail(key+'.person');}if(e.kind==='rescue'&&(!e.person||e.outcome!=='returned-alive')||e.kind==='brokenPromise'&&(e.tick-e.accepted<24||!['abandoned-by-actor','sold-letter'].includes(e.outcome)))fail(key+'.outcome');total[e.kind==='rescue'?'help':'promise']+=e.delta;}
   if(total.help!==n.help||total.promise!==n.promise)fail(key+'.sum');
  }
  for(const q of h.quests){if(q.valueReceipt){const r=q.valueReceipt,key=id+'.quest.valueReceipt';fields(r,['id','kind','tick','delta'],key);integer(r.tick,key+'.tick');if(!h.valueRevision||r.id!==`value/${id}/${q.id}`||!['rescue','brokenPromise'].includes(r.kind)||r.tick>s.tick||![0,6].includes(r.delta)||r.delta&&!h.valueRevision.events.some(e=>e.id===r.id&&e.delta===r.delta))fail(key);}if(q.promiseBreach){const b=q.promiseBreach;fields(b,['kind','tick','actor'],id+'.quest.promiseBreach');integer(b.tick,id+'.quest.promiseBreach.tick');if(q.kind!=='delivery'||q.status!=='failed'||b.kind!=='sold-letter'||b.actor!==id||b.tick>s.tick||b.tick!==q.failed)fail(id+'.quest.promiseBreach');}}
  if(h.transit?.mode==='lift'){liftRide(s,h.transit.liftRide,id+'.transit.liftRide');const t=h.transit,r=t.liftRide,owner=r.person===s.hero.lineage?s.hero:s.actorStates[r.person];if(t.from!==r.from||t.to!==r.to||h.area!==r.from||r.person!==id&&!(t.viewOnly&&h.actorMode==='npc'&&owner?.transit?.liftRide?.id===r.id)||t.remaining!==r.remaining||t.total!==2)fail(id+'.transit.liftRide');}
  fields(h.property,['known','lost','memory','origin','nextAttempt'],id+'.property');fields(h.property.memory,['losses','lastCheck'],id+'.property.memory');fields(h.property.origin,['eligible','checked','granted'],id+'.property.origin');
  if(h.delve){const d=h.delve;fields(d,['root','room','started','floors','cleared','attemptRoot','attemptTracking'],id+'.delve');if(!['recorded','untracked'].includes(d.attemptTracking))fail(id+'.delve.attemptTracking');if(d.attemptTracking==='recorded'&&h.delveMemory?.places[d.attemptRoot]?.id!==d.attemptId)fail(id+'.delve.attemptId');}
  if(h.delveMemory){fields(h.delveMemory,['serial','places','starts','adoptions','resumes','contacts','actions','refusals'],id+'.delveMemory');if(own(h.delveMemory,'imports'))fail(id+'.delveMemory.imports');}
  fields(h.atlas,['version','known','visited','roads','visits'],id+'.atlas');
  for(const k of ['known','visited','roads'])array(h.atlas[k],id+'.atlas.'+k);
  const p=s.people[id];fields(p.actorLink,['version','health','inventory','wallet','energy','hunger','area','x'],id+'.actorLink');
  fields(p.agenda,['wealth','job','task'],id+'.agenda');
  if(h.actorMode!=='npc'||h.startAge!==null){fields(p.ageOrigin,['at','years'],id+'.ageOrigin');finite(h.startAge,id+'.startAge');}
  if(JSON.stringify(p.actorLink.inventory)!==JSON.stringify(h.inventory))fail(id+'.actorLink.inventory');
  const camp=s.areas[h.area].temporaryCamp;if(camp?.mode==='personal'&&!h.transit&&h.actorMode!=='npc'&&!camp.returns[h.lineage])fail(h.area+'.temporaryCamp.returns');
 }
 if(own(s,'materialDeliveries'))validateMaterialDeliveries(s);
 const storedFreightIds=new Set();for(const [id,p]of Object.entries(s.people)){
  fields(p,['id','name','parents','alive','health','status','race','culture','family'],id);if(p.id!==id||typeof p.alive!=='boolean')fail(id);array(p.parents,id+'.parents');finite(p.health,id+'.health');
  if(p.fieldCraft)fieldCraftRecord(s,p.fieldCraft,id);
  if(p.provisionCredit)creditRecord(s,p.provisionCredit,id,id+'.provisionCredit');
  if(p.creditHistory){array(p.creditHistory,id+'.creditHistory');if(p.creditHistory.length>4)fail(id+'.creditHistory');for(const q of p.creditHistory){creditRecord(s,q,id,id+'.creditHistory');if(!['fulfilled','refused','failed'].includes(q.status))fail(id+'.creditHistory.status');}}
  if(p.creditRequest){const r=p.creditRequest,key=id+'.creditRequest';fields(r,['version','id','client','area','asked','until','status'],key);integer(r.asked,key);integer(r.until,key);if(r.version!==1||!s.people[r.client]||!s.areas[r.area]||r.asked>s.tick||r.until!==r.asked+48||!['pending','offered','refused'].includes(r.status))fail(key);}
  if(p.freightCustody){const b=p.freightCustody,key=id+'.freightCustody';fields(b,['version','loads'],key);array(b.loads,key);if(b.version!==1||b.loads.length>2)fail(key);for(const l of b.loads){fields(l,['id','carrier','owner','source','to','area','at','food','medicine','tools','fee'],key);for(const k of ['at','food','medicine','tools','fee'])integer(l[k],key+'.'+k);if(storedFreightIds.has(l.id)||!s.people[l.carrier]||!s.areas[l.source]||!s.areas[l.to]||!s.areas[l.area]||l.at>s.tick||!['civic/'+l.source,l.carrier].includes(l.owner))fail(key);storedFreightIds.add(l.id);const c=s.logistics.convoys.find(c=>c.id===l.id);if(c&&(c.handoff?.keeper!==id||c.handoff.status!=='accepted'||c.food||c.medicine||c.tools))fail(key+'.duplicate');}}
  if(p.freightOffer){const o=p.freightOffer,key=id+'.freightOffer';fields(o,['version','id','carrier','area','asked','until','status'],key);integer(o.asked,key);integer(o.until,key);if(o.version!==1||!s.people[o.carrier]||!s.areas[o.area]||o.asked>s.tick||o.until<o.asked||!['pending','accepted','declined'].includes(o.status))fail(key);}
  if(p.tradeBook){const b=p.tradeBook,key=id+'.tradeBook';fields(b,['version','after','history'],key);array(b.history,key+'.history');integer(b.after,key+'.after');if(b.version!==1||b.history.length>8||b.after>s.tick+192)fail(key);for(const r of b.history){merchantRecord(s,r,key+'.history',true);if(r.owner!==id)fail(key+'.owner');}}
  for(const m of p.navigation?.markets||[])if(m.demand){const d=m.demand,key=id+'.market.demand';fields(d,['version','food','tools','families','seen','foodStock','toolStock','treasury'],key);for(const k of ['food','tools','families','seen','foodStock','toolStock','treasury']){finite(d[k],key+'.'+k);if(d[k]<0)fail(key+'.'+k);}if(d.version!==1||d.seen>s.tick||d.food>64||d.tools>12)fail(key);}
  if(p.alive){fields(p.needs,['hunger','energy','loneliness','meals','sleeps','conversations'],id+'.needs');fields(p.agenda,['job','task','wealth','knowledge','bonds'],id+'.agenda');fields(p.navigation,['places','roads'],id+'.navigation');}
  const task=p.agenda?.task;if(task?.kind==='work'){if(!own(task,'workMode')||![null,'service','production'].includes(task.workMode)||own(task,'goodsLegacy'))fail(id+'.agenda.task.workMode');}
  if(p.knifeRefit)validateRefitSave(s,id,p.knifeRefit);
  if(p.familyNeeds||p.npcIntentions)validateNPCDeeds(s,id,p);
  if(p.companionAffairs)validateCompanionAffairs(s,id,p.companionAffairs);
  if(own(p,'materialMemory'))validateMaterialMemory(s,id,p.materialMemory);
  if(own(p,'materialCargo'))validateMaterialCargo(s,id,p.materialCargo);
  if(own(p,'partyCombat'))validatePartyCombatAction(s,id,p.partyCombat);
  if(own(p,'pairPractice'))validatePairPractice(s,id,p.pairPractice);
  if(own(p,'liftTransit')){liftRide(s,p.liftTransit,id+'.liftTransit');if(p.liftTransit.person!==id||p.liftTransit.from!==p.area)fail(id+'.liftTransit.position');}
  if(own(p,'liftMemory')){
   const m=p.liftMemory,key=id+'.liftMemory';fields(m,['version','known','lastActionTick'],key);array(m.known,key+'.known');integer(m.lastActionTick,key+'.lastActionTick',-1);if(m.version!==1||m.lastActionTick>s.tick||m.known.length>24||new Set(m.known.map(n=>n.key)).size!==m.known.length)fail(key);
   for(const n of m.known){fields(n,['key','status','remaining','at','consoleArea'],key+'.note');integer(n.at,key+'.note.at');integer(n.remaining,key+'.note.remaining');if(!s.edges[n.key]?.lift||!['broken','ready','dismantled'].includes(n.status)||n.remaining>3||n.at>s.tick||n.consoleArea!==null&&n.consoleArea!==s.edges[n.key].lift.console.area||own(n,'after')&&(!Number.isSafeInteger(n.after)||n.after<0||n.after>s.tick+48))fail(key+'.note');}
  }
  if(own(p,'mechanismDuty')){
   const d=p.mechanismDuty,key=id+'.mechanismDuty',g=s.edges[d.key]?.mechanism;fields(d,['version','key','leader','stage','started','tick','released'],key);integer(d.started,key+'.started');integer(d.tick,key+'.tick');if(d.version!==1||!g?.holding)fail(key+'.mechanism');if(d.leader!==s.hero.lineage&&!s.actorStates[d.leader])fail(key+'.leader');if(!['holding','returning','joined','left','dead'].includes(d.stage))fail(key+'.stage');if(d.started>d.tick||d.tick>s.tick||d.released!==null&&(!Number.isSafeInteger(d.released)||d.released<d.started||d.released>s.tick))fail(key+'.clock');
   if(['holding','returning'].includes(d.stage)){fields(d.member,['person','uid','hp','maxHp','loyalty'],key+'.member');if(d.member.person!==id||d.member.uid!==id||[s.hero,...Object.values(s.actorStates)].some(h=>h.companions.some(c=>c.person===id))||p.status!=='lever-duty'||d.stage==='holding'&&(g.holding.person!==id||p.area!==g.lever.area||Math.abs(p.x-g.lever.x)>9)||d.stage==='returning'&&d.released===null)fail(key+'.active');}
   else {integer(d.finished,key+'.finished');if(d.finished>s.tick||own(d,'member'))fail(key+'.finished');}
  }
  if(own(p,'mechanisms')){
   const m=p.mechanisms,key=id+'.mechanisms';fields(m,['version','known','lastActionTick'],key);array(m.known,key+'.known');integer(m.lastActionTick,key+'.lastActionTick',-1);if(m.version!==1||m.lastActionTick>s.tick||m.known.length>24||new Set(m.known.map(n=>n.key)).size!==m.known.length)fail(key);
   for(const n of m.known)if(own(n,'holdAfter')){integer(n.holdAfter,key+'.holdAfter');if(n.holdAfter>s.tick+48)fail(key+'.holdAfter');}
   for(const n of m.known){fields(n,['key','state','at','witness','leverArea','understood'],key+'.note');integer(n.at,key+'.note.at');if(!s.edges[n.key]?.mechanism||!['open','closed'].includes(n.state)||n.at>s.tick||n.witness!==id||n.leverArea!==null&&n.leverArea!==s.edges[n.key].mechanism.lever.area||typeof n.understood!=='boolean'||own(n,'requiresHold')&&typeof n.requiresHold!=='boolean')fail(key+'.note');}
  }
  if(own(p,'bestiary')){
   const b=p.bestiary,key=id+'.bestiary';fields(b,['version','species','studyAfter'],key);integer(b.studyAfter,key+'.studyAfter');array(b.species,key+'.species');if(b.version!==1||b.species.length>16||b.studyAfter>s.tick+48||new Set(b.species.map(e=>e.id)).size!==b.species.length)fail(key);
   for(const e of b.species){fields(e,['id','traces','encounters'],key+'.entry');array(e.traces,key+'.traces');array(e.encounters,key+'.encounters');if(!ENEMY_SPECIES.some(k=>k.id===e.id)||e.traces.length>4||e.encounters.length>4||new Set(e.traces.map(t=>t.id)).size!==e.traces.length||new Set(e.encounters.map(t=>t.enemy)).size!==e.encounters.length)fail(key+'.entry');
    for(const t of e.traces){fields(t,['id','created','seen','area','habitat','group','witness'],key+'.trace');integer(t.created,key+'.trace.created');integer(t.seen,key+'.trace.seen');if(t.created>t.seen||t.seen>s.tick||!s.areas[t.area]||!s.people[t.witness]||typeof t.id!=='string'||typeof t.habitat!=='string'||typeof t.group!=='boolean')fail(key+'.trace');}
    for(const r of e.encounters){fields(r,['enemy','tick','lastSeen','area','habitat','pack','charged','witness'],key+'.encounter');integer(r.tick,key+'.encounter.tick');integer(r.lastSeen,key+'.encounter.lastSeen');if(r.tick>r.lastSeen||r.lastSeen>s.tick||!s.areas[r.area]||!s.people[r.witness]||typeof r.enemy!=='string'||typeof r.habitat!=='string'||typeof r.pack!=='boolean'||typeof r.charged!=='boolean')fail(key+'.encounter');}
    for(const r of [...e.traces,...e.encounters])if(r.via!==undefined&&(!s.people[r.via]||!Number.isSafeInteger(r.received)||r.received>s.tick))fail(key+'.report');
   }
  }
  if(own(p,'trauma')){
   const t=p.trauma,key=id+'.trauma';fields(t,['version','marks'],key);array(t.marks,key+'.marks');if(t.version!==1||t.marks.length>6||new Set(t.marks.map(m=>m.id)).size!==t.marks.length||new Set(t.marks.map(m=>m.kind+'/'+m.part)).size!==t.marks.length)fail(key);
   for(const m of t.marks){fields(m,['id','tick','race','kind','part','cause'],key+'.mark');integer(m.tick,key+'.tick');const c=m.cause;fields(c,['enemy','name','area','before','after','damage','maximum','controller'],key+'.cause');for(const n of ['before','after','damage','maximum'])finite(c[n],key+'.cause.'+n);const part=m.race==='myconid'?'cap':m.race==='automaton'?'plating':'face';if(m.tick>s.tick||!RACES.some(r=>r.id===m.race)||!['burn','scar'].includes(m.kind)||m.part!==part||m.race==='automaton'&&m.kind!=='burn'||typeof c.enemy!=='string'||typeof c.name!=='string'||!s.areas[c.area]||c.after<=0||c.before>c.maximum||c.damage!==c.before-c.after||c.damage<Math.max(6,Math.ceil(c.maximum*.22))||!['actor','orders','party','journey','combat'].includes(c.controller)||m.id!==`injury/${id}/${m.tick}/${c.enemy}`)fail(key+'.mark');}
  }
  if(own(p,'mapCopies')){
   const m=p.mapCopies,key=id+'.mapCopies';fields(m,['version','serial','paper','copies','lastActionTick'],key);integer(m.serial,key+'.serial');integer(m.lastActionTick,key+'.lastActionTick',-1);array(m.paper,key+'.paper');array(m.copies,key+'.copies');if(m.version!==1||m.lastActionTick>s.tick||m.paper.length>4)fail(key);
   const paper=n=>{fields(n,['id','source','area','supplier','created','paid'],key+'.paper');integer(n.created,key+'.paper.created');if(!s.areas[n.area]||!s.people[n.supplier]||n.created>s.tick||n.paid!==2||typeof n.source!=='string'||typeof n.id!=='string'||mapMaterialIds.has(n.id))fail(key+'.paper');mapMaterialIds.add(n.id);};for(const n of m.paper)paper(n);
   for(const c of m.copies){if(physicalMapIds.has(c.id))fail(key+'.copy.id');physicalMapIds.add(c.id);fields(c.route,['key','from','to','fromName','toName','at','source'],key+'.route');integer(c.route.at,key+'.route.at');fields(c.route.source,['kind','person','origin'],key+'.route.source');if(c.route.key!==[c.route.from,c.route.to].sort().join('|')||c.route.at>s.tick||!s.people[c.route.source.person]||!s.people[c.route.source.origin]||!['visit','report'].includes(c.route.source.kind)||typeof c.route.fromName!=='string'||typeof c.route.toName!=='string')fail(key+'.route');fields(c,['version','id','owner','author','writer','sourceMap','written','route','treasure','material','holder','check'],key+'.copy');integer(c.written,key+'.copy.written');paper(c.material);fields(c.treasure,['id','area','x','at','source'],key+'.treasure');integer(c.treasure.at,key+'.treasure.at');fields(c.holder,['kind'],key+'.holder');const t=c.treasure,h=c.holder;if(c.version!==1||c.owner!==id||!s.people[c.author]||!s.people[c.writer]||!c.id.startsWith('map-copy/'+c.writer+'/')||typeof c.sourceMap!=='string'||c.written>s.tick||c.material.created>c.written||!s.areas[t.area]||!s.people[t.source]||!Number.isFinite(t.x)||t.x<0||t.x>100||t.at>s.tick||typeof t.id!=='string'||!s.areas[c.route?.from]||!s.areas[c.route?.to])fail(key+'.copy');if(h.kind==='person'){if(h.person!==id)fail(key+'.holder');}else if(h.kind==='ground'){if(!s.areas[h.area]||!Number.isFinite(h.x)||h.x<0||h.x>100)fail(key+'.holder');}else if(h.kind==='transit')fields(h.journey,[],key+'.holder.journey');else fail(key+'.holder');if(c.check){fields(c.check,['tick','kind','amount'],key+'.check');integer(c.check.tick,key+'.check.tick');integer(c.check.amount,key+'.check.amount');if(c.check.tick>s.tick||!['found','empty','wrong-report'].includes(c.check.kind)||c.check.amount>8||c.check.kind!=='found'&&c.check.amount!==0)fail(key+'.check');}}
  }
  if(own(p,'routeMaps')){
   const m=p.routeMaps,key=id+'.routeMaps';fields(m,['version','serial','notes','documents','lastActionTick'],key);integer(m.serial,key+'.serial');integer(m.lastActionTick,key+'.lastActionTick',-1);array(m.notes,key+'.notes');array(m.documents,key+'.documents');
   if(m.version!==1||m.lastActionTick>s.tick||m.notes.length>32||new Set(m.notes.map(n=>n.key)).size!==m.notes.length||new Set(m.documents.map(d=>d.id)).size!==m.documents.length)fail(key);
   const note=n=>{fields(n,['key','from','to','fromName','toName','at','source'],key+'.note');integer(n.at,key+'.note.at');fields(n.source,['kind','person','origin'],key+'.source');if(!s.areas[n.from]||!s.areas[n.to]||n.key!==[n.from,n.to].sort().join('|')||n.from===n.to||n.at>s.tick||!['visit','report'].includes(n.source.kind)||!s.people[n.source.person]||!s.people[n.source.origin]||typeof n.fromName!=='string'||typeof n.toName!=='string')fail(key+'.note');if(n.employment){fields(n.employment,['area','available','at','source'],key+'.employment');integer(n.employment.at,key+'.employment.at');if(![n.from,n.to].includes(n.employment.area)||typeof n.employment.available!=='boolean'||n.employment.at>s.tick||!s.people[n.employment.source])fail(key+'.employment');}};
   for(const n of m.notes)note(n);
   for(const d of m.documents){fields(d,['version','id','owner','author','written','route'],key+'.document');integer(d.written,key+'.written');if(d.version!==1||d.owner!==id||!s.people[d.author]||d.written>s.tick||!d.id.startsWith('route-map/'+d.author+'/'))fail(key+'.document');note(d.route);}
  }
  if(own(p,'estate')){
   const e=p.estate,key=id+'.estate';fields(e,['version','id','opened','heir','total','cash','paid','status','assets'],key);for(const k of ['opened','total','cash','paid'])integer(e[k],key+'.'+k);array(e.assets,key+'.assets');
   if(e.version!==1||p.alive||e.opened!==p.died||e.opened>s.tick||e.id!==`estate/${id}/${e.opened}`||e.heir!==null&&!s.people[e.heir]||e.cash+e.paid!==e.total||!['pending','distributed','claimed'].includes(e.status)||e.status==='distributed'&&(e.cash!==0||e.heir===null&&!e.heirHistory?.length))fail(key);
   for(const a of e.assets){fields(a,['kind','area','id'],key+'.asset');if(!s.areas[a.area]||typeof a.id!=='string'||!['property','money-cache','death-cache','item','route-map','map-copy','production-right','estate-claim'].includes(a.kind))fail(key+'.asset');}
  }
  if(own(p,'moneyCaches')){
   const m=p.moneyCaches,key=id+'.moneyCaches';fields(m,['version','places','lastActionTick','after'],key);array(m.places,key+'.places');integer(m.lastActionTick,key+'.lastActionTick',-1);integer(m.after,key+'.after');
   if(m.version!==1||m.places.length>16||m.lastActionTick>s.tick||m.after>s.tick+240||new Set(m.places.map(n=>n.id)).size!==m.places.length)fail(key);
   for(const n of m.places){fields(n,['id','area','x','owner','seen','source','from'],key+'.place');integer(n.seen,key+'.seen');if(!s.areas[n.area]||!s.people[n.owner]||!s.people[n.from]||n.seen>s.tick||!Number.isFinite(n.x)||n.x<0||n.x>100||!['owner','witness','contact'].includes(n.source)||typeof n.id!=='string')fail(key+'.place');}
  }
  if(own(p,'watchDuty')){const r=p.watchDuty,key=id+'.watchDuty';fields(r,['version','tick','enemy','kind','energy'],key);integer(r.tick,key+'.tick');const costs={waiting:0,march:1,fight:2,hold:3,retreat:1,relief:1,relieved:0};if(r.version!==1||r.tick>s.tick||!Object.hasOwn(costs,r.kind)||r.energy!==costs[r.kind]||typeof r.enemy!=='string'||r.partner!==undefined&&!s.people[r.partner])fail(key);}
  if(own(p,'expeditionWork')){const r=p.expeditionWork,key=id+'.expeditionWork';fields(r,['version','tick','story','leader','energy'],key);integer(r.tick,key+'.tick');if(r.version!==1||r.tick>s.tick||r.energy!==4||!s.people[r.leader]||!s.storyCases.some(c=>c.id===r.story&&c.owner===r.leader&&c.accessNode?.history.some(e=>e.actor===id&&e.tick===r.tick&&e.route==='repair')))fail(key);}
  if(p.itemRepair)validateItemRepairSave(s,id,p.itemRepair);
  if(p.itemRepairCommission){const c=p.itemRepairCommission;fields(c,['version','client','order'],id+'.itemRepairCommission');if(s.people[c.client]?.itemRepair?.orders[c.order]?.master!==id)fail(id+'.itemRepairCommission.order');}
  if(own(p,'itemRepairWorkTick'))integer(p.itemRepairWorkTick,id+'.itemRepairWorkTick');
  if(p.bioMaterialKnowledge){fields(p.bioMaterialKnowledge,[],id+'.bioMaterialKnowledge');for(const [kind,k]of Object.entries(p.bioMaterialKnowledge)){fields(k,['source','recordedAt'],id+'.bioMaterialKnowledge');if(kind!=='wolf-fang'||typeof k.source!=='string')fail(id+'.bioMaterialKnowledge.source');integer(k.recordedAt,id+'.bioMaterialKnowledge.recordedAt');}}
  if(p.itemRepairKnowledge){fields(p.itemRepairKnowledge,['version','bases'],id+'.itemRepairKnowledge');fields(p.itemRepairKnowledge.bases,[],id+'.itemRepairKnowledge.bases');for(const k of Object.values(p.itemRepairKnowledge.bases)){fields(k,['source','recordedAt'],id+'.itemRepairKnowledge.base');if(typeof k.source!=='string')fail(id+'.itemRepairKnowledge.source');integer(k.recordedAt,id+'.itemRepairKnowledge.recordedAt');}}
  if(p.refitCommission){fields(p.refitCommission,['version','client','order'],id+'.refitCommission');const c=p.refitCommission,o=s.people[c.client]?.knifeRefit?.orders[c.order];if(!o||o.master!==id)fail(id+'.refitCommission.order');}
  if(own(p,'refitWorkTick'))integer(p.refitWorkTick,id+'.refitWorkTick');
  if(p.forging){const q=p.forging,key=id+'.forging';fields(q,['version','serial','recipes','orders','active','after'],key);integer(q.serial,key+'.serial');integer(q.after,key+'.after');fields(q.recipes,[],key+'.recipes');fields(q.orders,[],key+'.orders');
   for(const [recipe,r]of Object.entries(q.recipes)){if(!['working-knife','camp-whistle'].includes(recipe))fail(key+'.recipe');fields(r,['learnedAt','origin','teacher'],key+'.knowledge');integer(r.learnedAt,key+'.learnedAt');if(!['current-role','lesson',...(recipe==='camp-whistle'?['practice']:[])].includes(r.origin)||r.teacher!==null&&!s.people[r.teacher])fail(key+'.teacher');}
   if(q.active!==null&&(!q.orders[q.active]||q.orders[q.active].status!=='working'))fail(key+'.active');
   for(const [oid,o]of Object.entries(q.orders)){fields(o,['id','recipe','owner','master','area','workshop','started','progress','required','lastWorkTick','status','materials'],key+'.order');if(o.id!==oid||o.owner!==id||o.master!==id||!['working-knife','camp-whistle'].includes(o.recipe)||!s.areas[o.area]||!(o.recipe==='camp-whistle'?o.required===3:[4,6].includes(o.required))||!['working','completed'].includes(o.status))fail(key+'.order');for(const k of ['started','progress'])integer(o[k],key+'.'+k);integer(o.lastWorkTick,key+'.lastWorkTick',-1);if(o.progress>o.required||o.status==='working'&&q.active!==oid||o.status==='completed'&&(o.progress!==o.required||o.item!==oid+(o.recipe==='camp-whistle'?'/whistle':'/knife')||!Number.isSafeInteger(o.finished)))fail(key+'.progress');array(o.materials,key+'.materials');if(o.materials.length!==2)fail(key+'.materials');for(const [i,m]of o.materials.entries()){fields(m,['id','kind','owner','source','sourceOwner','acquiredAt','price','state'],key+'.material');if(m.id!==oid+'/material/'+i||m.owner!==id||!(m.kind===(o.recipe==='camp-whistle'?['whistle-body','mouthpiece']:['blade-blank','handle'])[i]||o.recipe==='working-knife'&&i===0&&['wolf-fang','reclaimed-metal'].includes(m.kind))||m.state!==(o.status==='completed'?'consumed':'reserved')||m.price!==(['wolf-fang','reclaimed-metal'].includes(m.kind)?0:3)||typeof m.source!=='string'||typeof m.sourceOwner!=='string')fail(key+'.material');integer(m.acquiredAt,key+'.acquiredAt');if(m.kind==='reclaimed-metal'){fields(m.provenance,['node','item'],key+'.material.provenance');const node=Object.values(s.edges).find(e=>e.lift?.id===m.provenance.node)?.lift;if(!node||node.status!=='dismantled'||!node.issued.includes(m.provenance.item)||m.source!==node.id||m.sourceOwner!==node.id||o.status==='working'&&(!m.original||m.original.id!==m.provenance.item||m.original.physical?.holder.kind!=='forge-order'||m.original.physical.holder.id!==oid))fail(key+'.material.original');}if(m.kind==='wolf-fang'){validateMaterialOrigin(s,m.provenance,key+'.material.provenance');if(m.provenance.item!==m.provenance.body+'/fang'||m.source!==m.provenance.body||m.sourceOwner!=='animal/'+m.provenance.animal||o.status==='working'&&(!m.original||m.original.id!==m.provenance.item||m.original.physical?.holder.kind!=='forge-order'||m.original.physical.holder.id!==oid)||o.status==='completed'&&m.original)fail(key+'.material.original');}}}
   if(q.study){fields(q.study,['teacher','paid','started','progress','lastTick'],key+'.study');if(!s.people[q.study.teacher]||q.study.paid!==2)fail(key+'.study');integer(q.study.started,key+'.study.started');integer(q.study.lastTick,key+'.study.lastTick',-1);integer(q.study.progress,key+'.study.progress');if(q.study.progress>2)fail(key+'.study.progress');}
   if(q.offer){fields(q.offer,['item','price','area','at'],key+'.offer');if(typeof q.offer.item!=='string'||!s.areas[q.offer.area])fail(key+'.offer');integer(q.offer.price,key+'.offer.price');integer(q.offer.at,key+'.offer.at');}
  }
  if(p.legacy){const h=actors.find(h=>h.lineage===id);if(!h)fail(id+'.legacy.actor');fields(p.legacy,['wealth','keepsakes','gifts'],id+'.legacy');const items=[...h.bag,...Object.values(h.equipment).filter(Boolean)];if(JSON.stringify(p.legacy.keepsakes)!==JSON.stringify(items))fail(id+'.legacy.keepsakes');}
  const camp=s.areas[p.area]?.temporaryCamp;if(camp?.mode==='personal'&&!camp.returns[id])fail(p.area+'.temporaryCamp.returns');
 }
 // Versioned lazy records may be absent, but an existing record must use this
 // schema's exact contract. There is no future/older-record preservation path.
 const revisionRecords=new Set();
 for(const [id,r]of Object.entries(s.workshopDisputes||{})){fields(r,['id','version','votes','people','status'],id);if(r.id!==id)fail(id+'.id');integer(r.version,id+'.version');revisionRecords.add(r);for(const vote of Object.values(r.votes)){integer(vote.version,id+'.vote.version');if(vote.version>r.version)fail(id+'.vote.version');revisionRecords.add(vote);}}
 function inspect(v,path='world'){
  if(v===null)return;
  if(typeof v==='number'){finite(v,path);return;}
  if(typeof v!=='object')return;
  if(v!==s&&own(v,'version')&&!revisionRecords.has(v)&&v.version!==1)fail(path+'.version');
  if(v.durability)validateItemCondition(s,v,path+'.durability');
  if(v.kind==='bioMaterial'){if(v.base!=='wolf-fang'||v.id!==v.bioMaterial?.body+'/fang'||v.slot!=='material')fail(path+'.bioMaterial');validateMaterialOrigin(s,v.bioMaterial,path+'.bioMaterial');}
  if(v.burialTool&&typeof v.burialTool==='object')validateBurialTool(s,v,fail,path);
  if(v.instrument&&typeof v.instrument==='object')validateMusicInstrument(s,v,fail,path);
  if(v.toolKind==='knife'&&v.refit){const r=v.refit;fields(r,['version','order','recipe','mode','master','finished','actions','limit','fee','material','before'],path+'.refit');if(!['edge','precision'].includes(r.mode)||r.recipe!=='knife-'+r.mode||!s.people[r.master]||![2,3].includes(r.limit)||![3,4].includes(r.actions)||r.fee!==12||v.base!=='blade'||v.power>r.limit)fail(path+'.refit');integer(r.finished,path+'.refit.finished');fields(r.material,['id','owner','source','sourceOwner','acquiredAt','price','state'],path+'.refit.material');if(r.material.state!=='consumed')fail(path+'.refit.material.state');fields(r.before,['name','power'],path+'.refit.before');finite(r.before.power,path+'.refit.before.power');}
  for(const [k,value]of Object.entries(v))inspect(value,path+'.'+k);
 }
 inspect(s);return s;
}

function validateItemCondition(s,item,key){
 const d=item.durability;fields(d,['version','born','max','initial','current','used','restored','repairs','lastTick','lastUse'],key);
 if(!['weapon','armor'].includes(item.slot))fail(key+'.slot');for(const k of ['born','max','initial','current','used','restored','repairs'])integer(d[k],key+'.'+k);integer(d.lastTick,key+'.lastTick',-1);
 if(d.max<1||d.initial!==d.max||d.current>d.max||d.initial+d.restored-d.used!==d.current||d.born>s.tick||d.lastTick>s.tick||d.lastTick>=0&&d.lastTick<d.born)fail(key+'.accounting');
 if(d.used===0?(d.lastUse!==null||d.lastTick!==-1):!d.lastUse)fail(key+'.lastUse');
 if(d.lastUse){fields(d.lastUse,['tick','actor','kind','source'],key+'.lastUse');if(d.lastUse.tick!==d.lastTick||!s.people[d.lastUse.actor]||!['attack','armor','spell','gather'].includes(d.lastUse.kind)||typeof d.lastUse.source!=='string')fail(key+'.lastUse');}
 if(own(d,'brokenAt')){integer(d.brokenAt,key+'.brokenAt');if(d.brokenAt<d.born||d.brokenAt>s.tick)fail(key+'.brokenAt');}
 if(d.repairs&&!d.lastRepair)fail(key+'.lastRepair');if(d.lastRepair){const r=d.lastRepair;fields(r,['tick','master','order','restored'],key+'.lastRepair');integer(r.tick,key+'.lastRepair.tick');integer(r.restored,key+'.lastRepair.restored',1);if(!s.people[r.master]||typeof r.order!=='string'||r.tick<d.born||r.tick>s.tick||r.restored>d.max||d.repairs<1)fail(key+'.lastRepair');}
}
function validateMaterialOrigin(s,p,key){
 fields(p,['version','body','deathId','animal','animalName','species','extractor','extractorName','extractedAt'],key);integer(p.extractedAt,key+'.extractedAt');if(p.species!=='wolf'||typeof p.animalName!=='string'||typeof p.extractorName!=='string'||typeof p.body!=='string'||!p.body.startsWith('corpse:enemy:'+p.animal+':')||p.deathId!==p.body.replace(/^corpse:/,'death:')||!s.people[p.extractor]||p.extractedAt>s.tick)fail(key+'.source');
 const b=s.remains?.byId[p.body];if(b&&(b.source.id!==p.animal||b.deathId!==p.deathId||b.death.species!=='wolf'))fail(key+'.body');
}
function validatePartyCombatRound(s,id,r){
 const key=id+'.partyCombat';fields(r,['version','tick','enemy','people','guard','replied','absorbed'],key);integer(r.tick,key+'.tick');array(r.people,key+'.people');
 if(r.version!==1||r.tick>s.tick||typeof r.enemy!=='string'||!r.enemy||typeof r.replied!=='boolean'||r.people.length>3||new Set(r.people).size!==r.people.length||r.people.some(p=>!s.people[p])||r.guard!==null&&!r.people.includes(r.guard)||own(r,'killer')&&!r.people.includes(r.killer))fail(key);
 integer(r.absorbed,key+'.absorbed');
 if(own(r,'protected')&&!r.people.includes(r.protected))fail(key+'.protected');
}
function validatePartyCombatAction(s,id,a){
 const key=id+'.partyCombat';fields(a,['version','tick','enemy','leader','action','target','energy','medicine','healed','damage','intercepted','reason'],key);integer(a.tick,key+'.tick');
 for(const k of ['energy','medicine','healed','damage','intercepted']){finite(a[k],key+'.'+k);if(a[k]<0)fail(key+'.'+k);}
 if(a.version!==1||a.tick>s.tick||!s.people[a.leader]||typeof a.enemy!=='string'||!a.enemy||typeof a.target!=='string'||!a.target||typeof a.reason!=='string'||!['heal','cover','attack','prepare','paired-attack'].includes(a.action)||a.energy>100)fail(key);
 if(a.action==='heal'&&(!s.people[a.target]||!(a.medicine>0)||a.damage||a.intercepted)||a.action!=='heal'&&(a.medicine||a.healed)||a.action==='cover'&&(a.target!==a.leader||a.damage)||['attack','prepare','paired-attack'].includes(a.action)&&(a.target!==a.enemy||a.intercepted)||a.action==='prepare'&&a.damage)fail(key+'.effect');
 if(['prepare','paired-attack'].includes(a.action)&&!a.pair)fail(key+'.pair');
 if(a.pair){const p=a.pair;fields(p,['started','partner','phase'],key+'.pair');integer(p.started,key+'.pair.started');if(!s.people[p.partner]||p.partner===id||!['preparation','release'].includes(p.phase)||p.started>a.tick||p.phase==='preparation'&&p.started!==a.tick||p.phase==='release'&&p.started+1!==a.tick||!['cover','prepare','paired-attack'].includes(a.action)||a.action==='prepare'&&p.phase!=='preparation'||a.action==='paired-attack'&&p.phase!=='release')fail(key+'.pair');}
}
function validatePairPractice(s,id,p){
 const key=id+'.pairPractice';fields(p,['version','partners','lastActionTick'],key);integer(p.lastActionTick,key+'.lastActionTick',-1);fields(p.partners,[],key+'.partners');
 if(p.version!==1||p.lastActionTick>s.tick||Object.keys(p.partners).length>8)fail(key);
 for(const [other,r]of Object.entries(p.partners)){
  fields(r,['partner','name','guard','striker','operations','total','last'],key+'.partner');array(r.operations,key+'.operations');integer(r.total,key+'.total',1);integer(r.last,key+'.last');
  if(r.partner!==other||!s.people[other]||other===id||typeof r.name!=='string'||new Set([r.guard,r.striker]).size!==2||![r.guard,r.striker].includes(id)||![r.guard,r.striker].includes(other)||r.total>3||r.operations.length!==r.total||r.last>s.tick||r.last>p.lastActionTick)fail(key+'.partner');
  const ids=new Set(),ticks=new Set();for(const o of r.operations){fields(o,['id','tick','area','camp','guard','striker','energy'],key+'.operation');integer(o.tick,key+'.operation.tick');if(typeof o.id!=='string'||!o.id||typeof o.camp!=='string'||!s.areas[o.area]||o.guard!==r.guard||o.striker!==r.striker||o.energy!==2||o.tick>r.last||ids.has(o.id)||ticks.has(o.tick))fail(key+'.operation');ids.add(o.id);ticks.add(o.tick);}
  if(r.operations.at(-1).tick!==r.last||(r.total===3?(r.method!=='covered-windup'||r.learnedAt!==r.last):own(r,'method')||own(r,'learnedAt')))fail(key+'.method');
 }
}
function validatePairDrill(s,id,r){
 const key=id+'.pairDrill';fields(r,['version','id','number','area','guard','striker','started','lastTick','actions','status','reason'],key);
 for(const k of ['number','started','actions'])integer(r[k],key+'.'+k);integer(r.lastTick,key+'.lastTick',-1);
 if(r.version!==1||typeof r.id!=='string'||!s.areas[r.area]||!s.people[r.guard]||!s.people[r.striker]||r.guard===r.striker||!['active','paused','done'].includes(r.status)||r.started>s.tick||r.lastTick>s.tick||r.actions>3||r.reason!==null&&typeof r.reason!=='string')fail(key);
 if(r.status==='done'){integer(r.completed,key+'.completed');if(r.completed!==r.lastTick||r.actions<1)fail(key+'.completed');}
}
function validatePairPreparation(s,id,r){
 const key=id+'.pairCombat';fields(r,['version','status','enemy','area','guard','striker','started','strikerHealth','reason'],key);integer(r.started,key+'.started');finite(r.strikerHealth,key+'.strikerHealth');
 if(r.version!==1||!['preparing','released','cancelled'].includes(r.status)||typeof r.enemy!=='string'||!r.enemy||!s.areas[r.area]||!s.people[r.guard]||!s.people[r.striker]||r.guard===r.striker||r.started>s.tick||r.strikerHealth<=0||typeof r.reason!=='string')fail(key);
 if(r.status!=='preparing'){integer(r.ended,key+'.ended');if(r.ended<r.started||r.ended>s.tick||r.status==='released'&&r.ended!==r.started+1)fail(key+'.ended');}
}
function validateMaterialMemory(s,id,m){
 const key=id+'.materialMemory';fields(m,['version','sources','stores','after','lastActionTick','history'],key);if(m.version!==1)fail(key+'.version');integer(m.after,key+'.after');integer(m.lastActionTick,key+'.lastActionTick',-1);if(m.after>s.tick+480||m.lastActionTick>s.tick)fail(key+'.clock');array(m.history,key+'.history');if(m.history.length>8)fail(key+'.history');
 for(const map of ['sources','stores']){fields(m[map],[],key+'.'+map);if(Object.keys(m[map]).length>24)fail(key+'.'+map);for(const [area,k]of Object.entries(m[map])){fields(k,['area','name','quantity','seen'],key+'.'+map);integer(k.quantity,key+'.quantity');integer(k.seen,key+'.seen');if(k.area!==area||!s.areas[area]||typeof k.name!=='string'||k.seen>s.tick)fail(key+'.observation');if(map==='sources'&&k.x!==42)fail(key+'.source.x');}}
 for(const e of m.history){fields(e,['tick','text'],key+'.history');integer(e.tick,key+'.history.tick');if(e.tick>s.tick||typeof e.text!=='string')fail(key+'.history');}
}
function validateMaterialCargo(s,id,c){
 const key=id+'.materialCargo';fields(c,['id','order','kind','source','owner','holder','quantity','collected'],key);for(const k of ['quantity','collected'])integer(c[k],key+'.'+k);const o=s.materialDeliveries?.orders[c.order];if(!o||o.carrier!==id||o.client!==c.owner||o.cargo!==c.id||c.id!==o.id+'/cargo'||c.holder!==id||c.kind!=='workshop-raw'||c.source!==o.source||!c.quantity||c.quantity>o.quantity||c.collected>s.tick||o.receipt)fail(key+'.custody');
}
function validateMaterialDeliveries(s){
 const r=s.materialDeliveries,key='materialDeliveries';fields(r,['version','serial','orders'],key);integer(r.serial,key+'.serial');if(r.version!==1)fail(key+'.version');fields(r.orders,[],key+'.orders');
 const occupied=new Set();for(const [id,o]of Object.entries(r.orders)){
  fields(o,['id','client','carrier','property','home','source','sourceName','returnArea','returnX','quantity','status','offered','quoteUntil','deadline','budget','fee','advance','escrow','paid','delivered','work','lastWorkTick','reason','paused'],id);
  if(id!==o.id||!/^material-delivery\/[1-9]\d*$/.test(id)||Number(id.split('/')[1])>r.serial||!s.people[o.client]||!s.people[o.carrier]||o.client===o.carrier||!s.areas[o.home]||!s.areas[o.source]||!s.areas[o.returnArea]||typeof o.sourceName!=='string'||typeof o.property!=='string'||typeof o.reason!=='string')fail(id+'.reference');
  for(const k of ['quantity','offered','quoteUntil','deadline','budget','fee','advance','escrow','paid','delivered','work'])integer(o[k],id+'.'+k);integer(o.lastWorkTick,id+'.lastWorkTick',-1);finite(o.returnX,id+'.returnX');
  if(o.quantity<1||o.quantity>2||o.delivered>o.quantity||o.offered>s.tick||o.quoteUntil!==o.offered+48||o.deadline!==o.offered+960||o.budget<6||o.budget>8||![6,8].includes(o.fee)||o.fee>o.budget||![0,2].includes(o.advance)||o.paid<o.advance||o.work>3||o.lastWorkTick>s.tick||o.budget!==o.paid+o.escrow+(o.refunded||0))fail(id+'.balance');
  integer(o.refunded||0,id+'.refunded');if(o.advanceDebt!==undefined)integer(o.advanceDebt,id+'.advanceDebt');
  if(!['quoted','outward','collecting','returning','declined','completed','partial','failed','unresolved'].includes(o.status))fail(id+'.status');
  if(['quoted','outward','collecting','returning'].includes(o.status)){for(const person of [o.client,o.carrier]){if(occupied.has(person))fail(id+'.controller');occupied.add(person);}}
  if(o.status==='quoted'&&(o.advance!==0||o.paid!==0||o.paused!==null))fail(id+'.quote');
  if(o.status!=='quoted'&&o.status!=='declined'&&o.advance!==2)fail(id+'.advance');
  if(['outward','collecting','returning'].includes(o.status)&&o.accepted===undefined)fail(id+'.accepted');
  if(['declined','completed','partial','failed','unresolved'].includes(o.status)&&(o.ended===undefined||o.escrow!==0))fail(id+'.ended');
  if(o.status==='declined'&&(o.paid!==0||o.advance!==0))fail(id+'.declined');
  if(o.status==='completed'&&(o.delivered!==o.quantity||!o.receipt)||o.status==='partial'&&(!(o.delivered>0&&o.delivered<o.quantity)||!o.receipt))fail(id+'.delivered');
  if(!['completed','partial'].includes(o.status)&&o.delivered!==0)fail(id+'.delivered');
  if(o.status==='returning'&&s.people[o.carrier]?.materialCargo?.order!==id)fail(id+'.cargo');
  if(o.collected!==undefined){integer(o.collected,id+'.collected');if(o.collected>s.tick||o.work!==3||o.cargo!==id+'/cargo')fail(id+'.collected');}
  if(o.paused){fields(o.paused,['kind'],id+'.paused');if(o.paused.kind==='actor'){if(!Object.hasOwn(o.paused,'goal'))fail(id+'.paused.goal');}else if(o.paused.kind==='personal'){if(!Object.hasOwn(o.paused,'task'))fail(id+'.paused.task');}else fail(id+'.paused.kind');}
  fields(o.workplace,['area','x'],id+'.workplace');finite(o.workplace.x,id+'.workplace.x');if(!s.areas[o.workplace.area]||typeof o.checkedWorkplace!=='boolean')fail(id+'.workplace');
  if(o.accepted!==undefined){integer(o.accepted,id+'.accepted');if(o.accepted<o.offered||o.accepted>s.tick)fail(id+'.accepted');}
  if(o.ended!==undefined){integer(o.ended,id+'.ended');if(o.ended<o.offered||o.ended>s.tick||typeof o.outcome!=='string')fail(id+'.ended');}
  if(o.receipt){const c=o.receipt;fields(c,['tick','from','to','cargo','source','quantity','store'],id+'.receipt');integer(c.tick,id+'.receipt.tick');integer(c.quantity,id+'.receipt.quantity');if(c.tick>s.tick||c.from!==o.carrier||c.to!==o.client||c.cargo!==o.id+'/cargo'||c.source!==o.source||c.quantity!==o.delivered||c.quantity<1||typeof c.store!=='string'||!['completed','partial'].includes(o.status))fail(id+'.receipt');}
 }
}
function validateCompanionAffairs(s,id,n){
 const key=id+'.companionAffairs',reference=(domain,value)=>typeof value==='string'&&(domain==='family'?value.startsWith(id+'/family/'):domain==='learning'&&value.startsWith('learning/'));
 fields(n,['version','current','agreement','postponed','history','lastActionTick','lastBasis','reviewAfter'],key);if(n.version!==1)fail(key+'.version');integer(n.lastActionTick,key+'.lastActionTick',-1);integer(n.reviewAfter,key+'.reviewAfter');if(n.lastActionTick>s.tick||n.lastBasis!==null&&typeof n.lastBasis!=='string'||n.reviewAfter>s.tick+48)fail(key+'.clock');array(n.history,key+'.history');
 if(n.current){const c=n.current;fields(c,['id','domain','since'],key+'.current');integer(c.since,key+'.current.since');if(!reference(c.domain,c.id)||c.since>s.tick)fail(key+'.current');}
 if(n.agreement){const a=n.agreement;fields(a,['since','until','from','to','toName','path','selected','basis'],key+'.agreement');for(const k of ['since','until'])integer(a[k],key+'.agreement.'+k);array(a.path,key+'.agreement.path');if(a.since>s.tick||a.until<=a.since||a.until-a.since>48||typeof a.toName!=='string'||typeof a.selected!=='string'||typeof a.basis!=='string'||a.path.length<2||a.path.length>3||a.path[0]!==a.from||a.path.at(-1)!==a.to||a.path.some(v=>typeof v!=='string'||!s.areas[v])||new Set(a.path).size!==a.path.length)fail(key+'.agreement');}
 if(n.postponed){const r=n.postponed;fields(r,['id','domain','family','revision','since','until','reason'],key+'.postponed');for(const k of ['revision','since','until'])integer(r[k],key+'.postponed.'+k);if(!reference(r.domain,r.id)||!reference('family',r.family)||r.since>s.tick||r.until<=r.since||r.until-r.since>48||typeof r.reason!=='string')fail(key+'.postponed');}
 for(const e of n.history){fields(e,['tick','area','outcome','selected','reason'],key+'.history');integer(e.tick,key+'.history.tick');if(e.tick>s.tick||typeof e.area!=='string'||!['shared','parted','postponed'].includes(e.outcome)||e.selected!==null&&typeof e.selected!=='string'||typeof e.reason!=='string')fail(key+'.history');}
}
function validateNPCDeeds(s,id,p){
 const q=p.familyNeeds,key=id+'.familyNeeds';
 if(q){fields(q,['version','serial','cases','history'],key);integer(q.serial,key+'.serial');fields(q.cases,[],key+'.cases');array(q.history,key+'.history');
  for(const [person,c]of Object.entries(q.cases)){
   fields(c,['id','person','name','area','x','health','maximum','ailment','status','since','seen','source','revision','decision','purchases'],key+'.case');const serial=Number(c.id?.slice((id+'/family/').length));if(c.person!==person||!s.people[person]||c.id!==id+'/family/'+serial||!Number.isSafeInteger(serial)||serial<1||serial>q.serial||typeof c.name!=='string'||typeof c.area!=='string'||!['known','active','supplied','unneeded','missing'].includes(c.status))fail(key+'.identity');for(const k of ['x','health','maximum'])finite(c[k],key+'.'+k);for(const k of ['since','seen','revision'])integer(c[k],key+'.'+k);if(c.health<=0||c.maximum<=0||c.seen<c.since||c.seen>s.tick)fail(key+'.observation');fields(c.source,['kind','observer','tick'],key+'.source');if(c.source.kind!=='sight'||c.source.observer!==id||c.source.tick!==c.since)fail(key+'.source');array(c.purchases,key+'.purchases');for(const r of c.purchases){fields(r,['tick','area','quantity','price'],key+'.purchase');integer(r.tick,key+'.purchase.tick');if(![1,2].includes(r.quantity)||r.price!==r.quantity*4||typeof r.area!=='string'||r.tick>s.tick)fail(key+'.purchase');}
   if(c.status==='supplied'){fields(c.receipt,['tick','from','to','medicine'],key+'.receipt');integer(c.receipt.tick,key+'.receipt.tick');if(c.receipt.from!==id||c.receipt.to!==person||![1,2].includes(c.receipt.medicine)||c.receipt.tick<c.since||c.receipt.tick>s.tick)fail(key+'.receipt');}
   if(c.decision){fields(c.decision,['tick','signature','outcome','reason'],key+'.decision');integer(c.decision.tick,key+'.decision.tick');if(typeof c.decision.signature!=='string'||c.decision.outcome!=='deferred'||typeof c.decision.reason!=='string')fail(key+'.decision');}
  }
 }
 const n=p.npcIntentions,nkey=id+'.npcIntentions';if(!n)return;fields(n,['version','current','paused','history','lastActionTick','lastDecisionTick'],nkey);for(const k of ['lastActionTick','lastDecisionTick']){integer(n[k],nkey+'.'+k,-1);if(n[k]>s.tick)fail(nkey+'.'+k);}fields(n.paused,[],nkey+'.paused');array(n.history,nkey+'.history');
 const domain=d=>['family','manufacture','learning','journey','commission','occupation'].includes(d);
 if(n.current){const c=n.current;fields(c,['domain','id','title','since','reason'],nkey+'.current');integer(c.since,nkey+'.current.since');if(!domain(c.domain)||typeof c.id!=='string'||typeof c.title!=='string'||typeof c.reason!=='string'||c.since>s.tick)fail(nkey+'.current');}
 for(const [key,r]of Object.entries(n.paused)){fields(r,['domain','id','task','parked'],nkey+'.paused');integer(r.parked,nkey+'.paused.parked');fields(r.task,['kind','target','x','remaining'],nkey+'.paused.task');finite(r.task.x,nkey+'.paused.task.x');if(r.id!==key||!domain(r.domain)||r.domain==='family'||r.parked>s.tick||typeof r.task.kind!=='string'||typeof r.task.target!=='string')fail(nkey+'.paused');if(r.task.kind==='work'&&(!own(r.task,'workMode')||![null,'service','production'].includes(r.task.workMode)))fail(nkey+'.paused.workMode');}
 for(const e of n.history){fields(e,['tick','kind','from','to','reason'],nkey+'.history');integer(e.tick,nkey+'.history.tick');if(e.tick>s.tick||!['selected','refused','resumed','outdated'].includes(e.kind)||typeof e.reason!=='string')fail(nkey+'.history');}
}
function validateBodyMaterial(s,b,key){
 const m=b.material;fields(m,['version','id','kind','created','expires','initial','remaining','lost','state','extracted','work'],key);for(const k of ['created','expires','initial','remaining','lost'])integer(m[k],key+'.'+k);
 if(b.source.kind!=='enemy'||b.death.species!=='wolf'||b.death.shape!=='wolf'||m.kind!=='wolf-fang'||m.id!==b.id+'/fang'||m.created!==b.death.tick||m.expires!==m.created+720||m.initial!==1||!['available','extracted','spoiled'].includes(m.state)||m.remaining>1||m.lost>1||m.remaining+m.lost+Number(Boolean(m.extracted))!==1||m.state==='available'&&(m.remaining!==1||m.extracted)||m.state==='spoiled'&&(m.lost!==1||m.extracted)||m.state==='extracted'&&(!m.extracted||m.remaining||m.lost))fail(key+'.accounting');
 if(m.extracted){const e=m.extracted;fields(e,['item','person','tick','actions'],key+'.extracted');if(e.item!==m.id||!s.people[e.person]||e.actions!==3||e.tick<m.created||e.tick>m.expires||e.tick>s.tick)fail(key+'.extracted');}
 if(m.work){const w=m.work;fields(w,['actor','steps','lastTick','started','tool'],key+'.work');integer(w.steps,key+'.work.steps',1);integer(w.started,key+'.work.started');integer(w.lastTick,key+'.work.lastTick');if(m.state!=='available'||!s.people[w.actor]||w.steps>=3||w.lastTick>s.tick||w.started>w.lastTick||typeof w.tool!=='string')fail(key+'.work');}
}
function validateItemRepairSave(s,id,q){
 const key=id+'.itemRepair';fields(q,['version','serial','orders','active','after'],key);integer(q.serial,key+'.serial');integer(q.after,key+'.after');fields(q.orders,[],key+'.orders');
 if(q.active!==null&&(!q.orders[q.active]||!['material','working'].includes(q.orders[q.active].status)))fail(key+'.active');
 for(const [oid,o]of Object.entries(q.orders)){
  fields(o,['id','owner','item','master','area','workshop','status','accepted','paidAt','deadline','fee','material','progress','required','lastWorkTick'],key+'.order');const serial=Number(oid.slice((id+'/item-repair/').length));
  if(o.id!==oid||oid!==id+'/item-repair/'+serial||!Number.isSafeInteger(serial)||serial<1||serial>q.serial||o.owner!==id||!s.people[o.master]||!s.areas[o.area]||typeof o.item!=='string'||typeof o.workshop!=='string'||!['material','working','completed','lost-item','unavailable','expired'].includes(o.status)||o.fee!==6||![3,4].includes(o.required))fail(key+'.order');
  for(const k of ['accepted','paidAt','deadline','progress'])integer(o[k],key+'.'+k);integer(o.lastWorkTick,key+'.lastWorkTick',-1);if(o.progress>o.required||o.accepted!==o.paidAt||o.deadline!==o.accepted+960||['material','working'].includes(o.status)&&q.active!==oid)fail(key+'.progress');
  if(o.status==='material'&&o.material!==null||o.status==='working'&&!o.material)fail(key+'.material');
  if(o.material){const m=o.material;fields(m,['id','owner','source','sourceOwner','acquiredAt','price','state'],key+'.material');if(m.id!==oid+'/material'||m.owner!==id||m.price!==3||m.state!==(o.status==='completed'?'consumed':'reserved')||typeof m.source!=='string'||typeof m.sourceOwner!=='string')fail(key+'.material');integer(m.acquiredAt,key+'.material.acquiredAt');}
  if(o.status==='completed'){integer(o.finished,key+'.finished');integer(o.restored,key+'.restored',1);if(!o.material||o.progress!==o.required||o.finished!==o.lastWorkTick)fail(key+'.finished');}
 }
}

function validateRefitSave(s,id,q){
 const key=id+'.knifeRefit';fields(q,['version','serial','orders','active','after'],key);integer(q.serial,key+'.serial');integer(q.after,key+'.after');fields(q.orders,[],key+'.orders');
 if(q.active!==null&&(!q.orders[q.active]||!['material','working'].includes(q.orders[q.active].status)))fail(key+'.active');
 for(const [oid,o]of Object.entries(q.orders)){
  fields(o,['id','owner','item','master','area','workshop','mode','status','accepted','fee','paidAt','material','progress','required','limit','lastWorkTick','before'],key+'.order');
  const serial=Number(oid.slice((id+'/refit/').length));if(o.id!==oid||oid!==id+'/refit/'+serial||!Number.isSafeInteger(serial)||serial<1||serial>q.serial||o.owner!==id||!s.people[o.master]||!s.areas[o.area]||typeof o.item!=='string'||typeof o.workshop!=='string'||!['edge','precision'].includes(o.mode)||!['material','working','completed','lost-item'].includes(o.status)||o.fee!==12||![3,4].includes(o.required)||o.limit!==(o.required===3?3:2))fail(key+'.order');
  for(const k of ['accepted','paidAt','progress'])integer(o[k],key+'.'+k);integer(o.lastWorkTick,key+'.lastWorkTick',-1);if(o.progress>o.required||o.accepted!==o.paidAt||['material','working'].includes(o.status)&&q.active!==oid)fail(key+'.progress');
  fields(o.before,['name','power'],key+'.before');finite(o.before.power,key+'.before.power');if(typeof o.before.name!=='string')fail(key+'.before.name');
  if(o.status==='material'&&o.material!==null||o.status==='working'&&!o.material)fail(key+'.material');
  if(o.material){const m=o.material;fields(m,['id','owner','source','sourceOwner','acquiredAt','price','state'],key+'.material');if(m.id!==oid+'/material'||m.owner!==id||m.price!==3||m.state!==(o.status==='completed'?'consumed':'reserved')||typeof m.source!=='string'||typeof m.sourceOwner!=='string')fail(key+'.material');integer(m.acquiredAt,key+'.material.acquiredAt');}
  if(o.status==='completed'){integer(o.finished,key+'.finished');if(!o.material||o.progress!==o.required||o.finished!==o.lastWorkTick)fail(key+'.finished');}
 }
}
