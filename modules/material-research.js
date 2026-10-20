import {physicalDistance} from '../geometry.js';
import {textActor,textsOn} from './text-state.js';
import {personLocation} from '../person-location.js';
import {npcKnownRoute} from './npc-knowledge.js';
import {literacyOn,literacyCaps} from './literacy-state.js';
import {npcAction,npcController,canStartNPCActivity} from './npc-control.js';
const on=s=>textsOn(s)&&s.rules.property!==false&&s.rules.facades!==false;
const body=(s,p)=>p&&(textActor(s,p.id)||personLocation(s,p.id));
const memory=p=>p.materialResearch ||= {version:1,observations:[],reports:[],surveys:[],traces:[],lastActionTick:-1};
const place=(s,p)=>{const b=body(s,p);return b&&s.areas[b.area];};
const near=(a,x,y)=>physicalDistance(a,x,y)<=3;
function ready(s,p){const b=body(s,p),h=textActor(s,p?.id);return on(s)&&p?.alive&&b&&s.areas[b.area]&&(h||npcController(s,p)==='personal')&&!h?.combat&&!h?.transit&&!p.roadTransit&&!p.needs.sleeping&&!p.ailment&&(h?h.hp>=h.maxHp*.75:p.health>=(p.maxHealth||100)*.75)&&(h?h.energy:p.needs.energy)>=30&&(h?h.hunger:p.needs.hunger)<60&&(p.materialResearch?.lastActionTick??-1)<s.tick&&(p.textCraft?.lastActionTick??-1)<s.tick;}
function spend(s,p){const h=textActor(s,p.id);if(h){h.energy--;h.lastAction='think';}else p.needs.energy--;memory(p).lastActionTick=s.tick;}
const objectAt=(a,id)=>a?.objects.find(o=>o.id===id&&o.kind==='workshop');
// Passive, local sight during a real world phase. Never called by a reader or sheet.
export function observeMaterialObjects(s,p){const a=place(s,p),b=body(s,p);if(!on(s)||!p?.alive||!a||p.needs.sleeping||b.transit||a.interior)return;for(const o of a.objects){if(o.kind!=='workshop'||typeof o.building!=='string'||!near(a,b.x,o.x)||p.materialResearch?.observations.some(n=>n.object===o.id)||(p.materialResearch?.observations.length||0)>=12)continue;const m=memory(p);m.observations.push({id:p.id+'/material-sight/'+(m.observations.length+1),actor:p.id,object:o.id,building:o.building,area:a.id,x:o.x,name:o.name,state:o.state,at:s.tick});}}
function speech(s,p,q){if(!literacyOn(s))return p.culture===q.culture?p.culture:null;const a=literacyCaps(s,p,textActor(s,p.id)).spoken,b=literacyCaps(s,q,textActor(s,q.id)).spoken;return a.find(id=>b.includes(id))||null;}
export function hearMaterialWitness(s,p,q,id){
 const a=body(s,p),b=body(s,q),n=q?.materialResearch?.observations.find(n=>n.id===id),language=q&&speech(s,p,q);if(!ready(s,p)||!ready(s,q)||p.id===q.id||!n||!language||a.area!==b.area||!near(s.areas[a.area],a.x,b.x)||(p.materialResearch?.reports.length||0)>=12||p.materialResearch?.reports.some(r=>r.object===n.object)||textActor(s,q.id)||q.agenda.task||npcController(s,q)!=='personal'||!canStartNPCActivity(s,q)||!npcAction(s,q,'personal','act'))return null;
 const m=memory(p),r={id:p.id+'/material-report/'+(m.reports.length+1),actor:p.id,witness:q.id,source:n.id,object:n.object,building:n.building,area:n.area,x:n.x,name:n.name,state:n.state,observed:n.at,heard:s.tick,meeting:{area:a.area,x:a.x,witnessX:b.x,language},energy:1};m.reports.push(r);spend(s,p);spend(s,q);return r;
}
export function surveyMaterialObject(s,p,id){const r=p?.materialResearch?.reports.find(r=>r.id===id),a=place(s,p),b=body(s,p);if(!ready(s,p)||!r||a.id!==r.area||!near(a,b.x,r.x)||p.materialResearch.surveys.some(n=>n.report===id))return null;const o=objectAt(a,r.object),profile=o&&a.facades?.profiles.find(f=>f.id===o.building),m=memory(p),n={id:p.id+'/material-survey/'+(m.surveys.length+1),actor:p.id,report:id,object:r.object,area:a.id,x:r.x,at:s.tick,state:o?.state??null,building:profile?.id??null,traceX:profile?Math.min(95,r.x+6):null,status:profile?'pending':'uncertain',energy:1};m.surveys.push(n);spend(s,p);return n;}
export function inspectMaterialTrace(s,p,id){const n=p?.materialResearch?.surveys.find(n=>n.id===id),a=place(s,p),b=body(s,p);if(!ready(s,p)||!n||n.status!=='pending'||a.id!==n.area||!near(a,b.x,n.traceX))return null;const o=objectAt(a,n.object),f=o?.building===n.building&&a.facades?.profiles.find(f=>f.id===n.building),r=p.materialResearch.reports.find(r=>r.id===n.report),roof=f?(f.structure?.roof??3):null,walls=f?(f.structure?.walls??3):null,damaged=f&&(roof<3||walls<3),m=memory(p),t={id:p.id+'/material-trace/'+(m.traces.length+1),actor:p.id,survey:n.id,object:n.object,area:a.id,x:n.traceX,at:s.tick,building:n.building,available:Boolean(f),roof,walls,result:!f?'uncertain':(r.state==='intact')===!damaged?'consistent-now':'changed-now',cause:'unknown',energy:1};m.traces.push(t);n.status='checked';spend(s,p);return t;}
export function materialResearchTask(s,p,ctx={}){
 if(!ready(s,p))return null;const h=textActor(s,p.id),b=body(s,p),m=p.materialResearch;if(!(h?h.profession==='scholar'||h.personality.curiosity>=.75:p.agenda.job==='scholar'))return null;
 const route=to=>to===b.area||Boolean((h?ctx.knownRoute?.(s,b.area,to):npcKnownRoute(p,b.area,to))?.length);
 const pending=m?.surveys.find(n=>n.status==='pending');if(pending&&route(pending.area))return {kind:'scholarObjectTrace',target:pending.area,x:pending.traceX,survey:pending.id,remaining:1};
 const report=m?.reports.find(r=>!m.surveys.some(n=>n.report===r.id)&&route(r.area));if(report)return {kind:'scholarObjectSurvey',target:report.area,x:report.x,report:report.id,remaining:1};
 if((m?.reports.length||0)>=12)return null;for(const q of Object.values(s.people)){const at=body(s,q);if(q.id===p.id||!ready(s,q)||!at||at.area!==b.area||!near(s.areas[b.area],at.x,b.x)||textActor(s,q.id)||q.agenda.task||!speech(s,p,q)||npcController(s,q)!=='personal'||!canStartNPCActivity(s,q))continue;const n=q.materialResearch?.observations.find(n=>!m?.reports.some(r=>r.object===n.object));if(n)return {kind:'scholarObjectListen',target:b.area,x:at.x,person:q.id,observation:n.id,remaining:1};}return null;
}
export function materialResearchAction(s,p,g){if(g.kind==='scholarObjectListen')return hearMaterialWitness(s,p,s.people[g.person],g.observation);if(g.kind==='scholarObjectSurvey')return surveyMaterialObject(s,p,g.report);if(g.kind==='scholarObjectTrace')return inspectMaterialTrace(s,p,g.survey);return false;}
export function materialResearchRevision(s,p){const b=body(s,p),a=b&&s.areas[b.area];return [s.rules.property,s.rules.facades,s.rules.equipment,p.materialResearch,a?.objects.filter(o=>o.kind==='workshop'&&near(a,b.x,o.x)).map(o=>[o.id,o.state,a.facades?.profiles.find(f=>f.id===o.building)?.structure])];}
