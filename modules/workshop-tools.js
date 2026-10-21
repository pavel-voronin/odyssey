import {observationRadius,observeDevelopment} from './development-skills.js';
import {takeGoods} from './goods.js';
import {recordPracticalToolRepair,skillBranchesEnabled,recordPracticalTrade} from './skill-branches.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {localContact} from './npc-contacts.js';
import {recordWorkshop} from './workshop-state.js';
import {setActorMoney} from '../actor-projection.js';
import {workToolReady} from './workshop-tool-state.js';
import {workshopSite,workshopPosition,ownedWorkshopSite} from './workshop-place.js';
export {workToolReady};

export const WORK_TOOL_LIMIT=24;
export const WORK_TOOL_MATERIAL_COST=3;
const on=s=>enabled(s,'property')&&enabled(s,'workshop-tools');
export function observeWorkTools(s){
 if(!on(s)||!s.hero.alive||s.hero.transit)return;
 const h=s.hero,physical=s.areas[h.area],site=workshopSite(s,physical),a=site?.inside?site.area:physical;for(const o of a.objects.filter(o=>o.kind==='workshop')){
  const pos=workshopPosition(s,a,o);if(pos.area!==h.area||physicalDistance(physical,h.x,pos.x)>observationRadius(s,h.lineage,18))continue;
  const m=h.workToolMemory ||= {known:{},revision:0},old=m.known[o.id],state=o.workTool?.state||'working',episode=o.workTool?.episode||0;
  const changed=!old||old.state!==state||old.episode!==episode||old.owner!==o.owner;if(changed)m.revision++;if(o.workTool&&(!old||old.state!==state||old.episode!==episode))observeDevelopment(s,h.lineage,'tool/'+o.id+'/'+episode+'/'+state,{passive:true,factKey:'tool/'+o.id,factVersion:episode*2+(state==='working'?1:0)});
  m.known[o.id]={...(!changed?old:{}),area:a.id,property:o.id,owner:o.owner,state,episode,seen:s.tick};
  const sorted=Object.values(m.known).sort((a,b)=>a.seen-b.seen);for(const old of sorted.slice(0,Math.max(0,sorted.length-16)))delete m.known[old.property];
 }
}
export function knownToolAllows(s,area,property){return !on(s)||!Object.values(s.hero.workToolMemory?.known||{}).some(k=>k.area===area&&(!property||k.property===property)&&k.state==='broken');}

// A pre-existing functioning workshop already has a fixed bench tool. This
// migration records that fixture; it creates no portable goods or sale stock.
function installedTool(s,o){
 return o.workTool ||= {version:1,id:o.id+'/clamp',kind:'clamp',state:'working',uses:0,limit:WORK_TOOL_LIMIT,episode:0,origin:{kind:'existing-workshop',recorded:s.tick}};
}

// Called by the owner of a completed real work operation, never by rendering,
// payroll previews, ordinary walking or a repeated reading of workshop history.
export function recordToolUse(s,a,o,actor,ctx){
 if(!on(s)||o?.kind!=='workshop'||!a?.objects.includes(o)||o.state!=='intact')return false;
 const pos=workshopPosition(s,a,o),contact=localContact(s,actor,pos.area);if(!contact||physicalDistance(s.areas[pos.area],contact.x,pos.x)>9)return false;
 const t=installedTool(s,o);if(t.state!=='working')return false;
 if(t.lastUse?.tick===s.tick&&t.lastUse.actors.includes(actor))return false;
 if(t.lastUse?.tick!==s.tick)t.lastUse={tick:s.tick,actors:[]};
 // One physical fixture keeps only its current tick's workers, not a lifetime
 // list of every paid job. Excess repeated hooks cannot grow the saved record.
 if(t.lastUse.actors.length>=16)return false;t.lastUse.actors.push(actor);t.uses++;
 if(t.uses>=t.limit){
  t.state='broken';t.episode++;t.brokenAt=s.tick;t.lastWorker=actor;
  recordWorkshop(s,a,o,'У рабочего зажима лопнула направляющая. Помещение цело, но работа на этом верстаке остановлена.','tool-break',ctx,{actor,tool:t.id,episode:t.episode});
 }
 return true;
}

export function mendWorkTool(s,a,o,actor,ctx,{method='occupation',part=null}={}){
 if(!on(s)||o?.owner!==actor||o.state!=='intact'||!a.objects.includes(o)||o.workTool?.state!=='broken')return false;
 const pos=workshopPosition(s,a,o),body=localContact(s,actor,pos.area);if(!body||physicalDistance(s.areas[pos.area],body.x,pos.x)>9)return false;
 const t=o.workTool;t.state='working';t.uses=0;t.repairedAt=s.tick;t.lastRepair={actor,method,tick:s.tick,episode:t.episode,...(part?{part}:{} )};t.repair=null;
 recordWorkshop(s,a,o,'Рабочий зажим снова держит деталь. На этом верстаке можно продолжить работу.','tool-repair',ctx,{actor,tool:t.id,episode:t.episode,method});recordPracticalToolRepair(s,a,o,o.history.at(-1));return true;
}
const ownerRoom=(s,p)=>{const o=ownedWorkshopSite(s,p.area,p.id)?.object;return o?.state==='intact'?o:null;};
export function npcToolPlan(s,p){
 const learned=enabled(s,'mentor-journeys')&&p.toolSkills?.clamp?.source==='npc-paid-lessons';
 if(!on(s)||p.agenda?.job!=='artisan'&&!learned)return false;const o=ownerRoom(s,p);if(!o||workToolReady(s,o))return false;
 const a=workshopSite(s,p.area,o.id).area,m=p.agenda,waiting=m.toolMendPending;
 const funded=o.workTool.repair?.funded&&o.workTool.repair.episode===o.workTool.episode;
 if(funded||a.civic?.tools>=1&&m.wealth>=WORK_TOOL_MATERIAL_COST){
  m.task=waiting?.property===o.id&&waiting.episode===o.workTool.episode?waiting:{kind:'toolMend',target:a.id,x:o.x,remaining:funded?o.workTool.repair.remaining:learned?2:3,property:o.id,episode:o.workTool.episode,methodSource:learned?'npc-paid-lessons':'artisan-occupation'};m.toolMendPending=null;
 }else m.task={kind:a.civic?.food<65?'farm':'learn',target:a.id,x:42,remaining:3};
 return true;
}
export function npcToolMend(s,p,ctx){
 const m=p.agenda,t=m.task,o=ownerRoom(s,p),a=o&&workshopSite(s,p.area,o.id).area,pos=o&&workshopPosition(s,a,o);
 const funded=o?.workTool?.repair?.funded&&o.workTool.repair.episode===t?.episode;
 if(t?.methodSource==='npc-paid-lessons'&&(!enabled(s,'mentor-journeys')||p.toolSkills?.clamp?.source!=='npc-paid-lessons'))return false;
 if(!on(s)||t?.kind!=='toolMend'||!o||o.id!==t.property||o.workTool?.episode!==t.episode||workToolReady(s,o)||!funded&&(!(a.civic?.tools>=1)||m.wealth<WORK_TOOL_MATERIAL_COST)||!localContact(s,p.id,pos.area)||physicalDistance(s.areas[pos.area],p.x,pos.x)>9)return false;
 const component=funded?o.workTool.repair.part:{source:a.id,units:1,paid:WORK_TOOL_MATERIAL_COST};
 if(!funded){takeGoods(s,a,'tools',1,{reason:'clamp-repair',actor:p.id});setActorMoney(s,p,m.wealth-WORK_TOOL_MATERIAL_COST);a.civic.treasury+=WORK_TOOL_MATERIAL_COST;if(skillBranchesEnabled(s)){component.tradeReceipt={id:o.workTool.id+'/material/'+o.workTool.episode,tick:s.tick,actor:p.id,area:a.id,kind:'tools',side:'buy',quantity:1,total:WORK_TOOL_MATERIAL_COST};}}
 const repaired=mendWorkTool(s,a,o,p.id,ctx,{method:t.methodSource||'artisan-occupation',part:component});
 if(repaired){if(component.tradeReceipt)recordPracticalTrade(s,component.tradeReceipt);p.toolSkills ||= {};p.toolSkills.clamp ||= {learnedAt:s.tick,source:'artisan-occupation'};}return repaired;
}
export function npcToolBlocked(s,p){const o=p.agenda?.job==='artisan'&&ownerRoom(s,p);return Boolean(o&&!workToolReady(s,o));}
