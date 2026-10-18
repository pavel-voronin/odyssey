import {enabled} from '../rules.js';
const on=s=>enabled(s,'causal-history')&&enabled(s,'commitments');
function memory(h,cause){return h.commitments?.memories.find(m=>m.id===cause&&m.kind==='retreat');}
function origin(m){return {id:m.id+'/origin',kind:'retreat',tick:m.tick,area:m.area,enemy:m.enemy,name:m.name,hp:m.hp};}
function append(s,cause,kind,details={}){
 if(!on(s)||!cause)return;const h=s.hero,p=h.commitments?.personal;if(p?.cause!==cause)return;
 const chains=h.causalHistory||[];let chain=chains.find(c=>c.cause===cause);
 if(!chain){const m=memory(h,cause);if(!m)return;chain={version:1,cause,partial:true,events:[origin(m)]};chains.push(chain);h.causalHistory=chains;}
 const id=`${cause}/${kind}/${s.tick}`;if(chain.events.some(e=>e.id===id))return;
 chain.events.push({id,kind,tick:s.tick,area:h.area,...details});if(chain.events.length>16){chain.events.splice(2,1);chain.dropped=(chain.dropped||0)+1;}if(chains.length>8)chains.shift();
}
export function startCausalHistory(s,m,p){
 if(!on(s))return;const h=s.hero,chains=h.causalHistory ||= [];if(chains.some(c=>c.cause===m.id))return;
 chains.push({version:1,cause:m.id,events:[origin(m),{id:m.id+'/intent',kind:'intent',tick:s.tick,area:h.area,target:p.target}]});if(chains.length>8)chains.shift();
}
export function causalDecision(s,p,decision,q){append(s,p.cause,'decision',{choice:decision,...(q?{quest:q.id,title:q.title}: {})});}
export function causalWork(s,g,job){if(g?.commitment)append(s,g.commitment,'work',{job:job.id,name:job.name,pay:job.pay,started:g.started});}
export function causalPurchase(s,kind,price){if(kind==='weapon'&&s.hero.goal?.commitment)append(s,s.hero.goal.commitment,'purchase',{kindBought:kind,price,weapon:s.hero.weapon});}
export function causalOutcome(s,p){append(s,p.cause,p.status==='done'?'prepared':'abandoned',{target:p.target});}
export function causalReturn(s,enemy){
 if(!on(s)||!enemy?.alive||s.hero.combat!==enemy.id)return;const h=s.hero,p=h.commitments?.personal,m=p&&memory(h,p.cause);
 if(p?.status!=='done'||!m||m.enemy!==enemy.id||m.area!==h.area||h.causalHistory?.find(c=>c.cause===p.cause)?.events.some(e=>e.kind==='returned'))return;
 append(s,p.cause,'returned',{enemy:enemy.id,name:enemy.name});
}
export function knownCausalHistory(s){
 if(!on(s))return null;const h=s.hero,p=h.commitments?.personal,stored=h.causalHistory?.find(c=>c.cause===p?.cause)||h.causalHistory?.at(-1);
 if(stored)return structuredClone(stored);
 if(!p)return null;const m=memory(h,p.cause);return {version:1,cause:p.cause,partial:true,events:[...(m?[origin(m)]:[]),{id:p.cause+'/old-intent',kind:'intent',tick:p.since,target:p.target},...(['done','abandoned'].includes(p.status)?[{id:p.cause+'/old-result',kind:p.status==='done'?'prepared':'abandoned',tick:p.ended,target:p.target}]:[])]};
}
