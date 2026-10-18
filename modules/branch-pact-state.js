import {enabled} from '../rules.js';
export const branchPactsOn=s=>enabled(s,'branch-pacts')&&enabled(s,'factions')&&enabled(s,'diplomacy')&&enabled(s,'faction-paths')&&enabled(s,'witness-news');
export const pactBlocked=(s,h,faction)=>branchPactsOn(s)&&h.branchPact?.faction===faction&&h.affiliation.primary===faction&&h.affiliation.paths[faction]?.branch===h.branchPact.branch&&h.area===h.branchPact.area&&Object.values(h.branchPact.cases).some(c=>c.blocked&&c.notified!==null);
export function pactAidContext(s,h,p){
 const b=h.branchPact,r=p.aidRequest;if(!branchPactsOn(s)||!b||r?.area!==h.area||r.residence?.area!==r.area||r.residence.faction!==b.against||h.affiliation.primary!==b.faction||h.affiliation.paths[b.faction]?.branch!==b.branch)return null;
 return {pact:b.id,leader:b.leader,faction:b.faction,against:b.against,area:h.area};
}
export function assessPactAid(s,h,p,base){
 const context=pactAidContext(s,h,p);if(!context||!base.help)return base;
 const trust=h.relations[p.id]?.trust||0,cost=base.cost+14+(h.affiliation.paths[context.faction].rank||1)*2,help=base.urgency+Math.max(0,Math.min(12,trust*.2))>=cost;
 return {...base,pact:context.pact,help,cost,reason:help?'Личная помощь важнее известного запрета своей ветви. Придётся отвечать перед руководителем.':'Он соблюдает известное условие своей службы и отказывается помогать этой семье.'};
}
export function rememberPactChoice(s,h,p,assessment){
 const context=pactAidContext(s,h,p);if(!context||assessment.pact!==context.pact)return;const b=h.branchPact,id=p.aidRequest.id;if(b.cases[id])return;
 b.cases[id]={request:id,patient:p.id,area:context.area,decided:s.tick,choice:assessment.help?'help':'obey',reason:assessment.reason,performed:null,heard:null,review:null,reviewed:null,blocked:false,notified:null,answer:null};
}
export function performedPactAid(s,h,p){const c=h.branchPact?.cases[p.aidRequest?.id];if(branchPactsOn(s)&&c?.choice==='help'&&p.aidRequest.status==='helped')c.performed=s.tick;}
