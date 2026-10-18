import {feastsOn,feastReason,feastNear} from './feast-state.js';
import {organizeFeast,feastPreparation,decideFeast,feastTask,attendFeast} from './feasts.js';
export function feastNPCTurn(s,p,ctx){
 if(!feastsOn(s))return p.agenda.task?.kind==='feastJoin';
 if(p.agenda.task)return false;
 if(decideFeast(s,p)?.choice==='declined')return true;
 if(organizeFeast(s,p,ctx)||feastPreparation(s,p,ctx))return true;
 const t=feastTask(s,p);if(t){p.agenda.task=t;return false;}return false;
}
export function feastNPCAction(s,p,ctx){
 const t=p.agenda.task;if(t?.kind!=='feastJoin')return false;
 if(!feastsOn(s))return true;
 const e=s.localFeast?.edition;
 if(e?.id!==t.feast||!['preparing','postponed','active'].includes(e.status)||feastReason(s,p)){p.agenda.task=null;p.agenda.due=s.tick;return true;}
 const done=attendFeast(s,p,ctx),r=e.invited[p.id];if(done&&(r.gift||r.choice!=='perform')){p.agenda.task=null;p.agenda.due=s.tick+8;}return true;
}
export function feastPlan(s,ctx){
 if(!feastsOn(s)||s.hero.goal)return false;const p=s.people[s.hero.lineage];decideFeast(s,p);const t=feastTask(s,p);if(!t)return false;
 const r=s.localFeast.edition.invited[p.id];ctx.goal(s,t.kind,t.target,t.x,'Местный праздник: '+({help:'помочь со столом',perform:'выступить',trade:'предложить еду'})[r.choice],r.reason,{feast:t.feast,remaining:1});return true;
}
export function feastAction(s,ctx){
 const h=s.hero,p=s.people[h.lineage],e=s.localFeast?.edition;if(!feastsOn(s)){h.lastAction='wait';return false;}
 if(e?.id!==h.goal?.feast||!['preparing','postponed','active'].includes(e.status)||feastReason(s,p)||!feastNear(s,p)){h.goal=null;return false;}
 const done=attendFeast(s,p,ctx),r=e.invited[p.id];h.lastAction=done?'talk':'wait';if(done&&(r.gift||r.choice!=='perform'))h.goal=null;return done;
}
