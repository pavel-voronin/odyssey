import {enabled} from '../rules.js';
import {DAY_TICKS} from '../calendar.js';
export const CACHE_FORGET_AFTER=40*DAY_TICKS,PROMISE_FORGET_AFTER=1800;
export const knowledgeGap=(h,domain,id)=>(h.recollection?.losses||[]).find(n=>n.domain===domain&&n.id===id&&n.restored===null);
export const promiseRemembered=(h,q)=>!knowledgeGap(h,'promise',q.id);
const hash=text=>{let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
function record(s,domain,id,cause,source,ctx){
 const h=s.hero;if(!enabled(s,'recollection')||!h.alive||h.life.ended||h.recollection?.losses.some(n=>n.at===s.tick)||knowledgeGap(h,domain,id))return false;
 const losses=h.recollection?.losses||[];if(losses.filter(n=>n.restored===null).length>=16)return false;
 const p=s.people[h.lineage],q=domain==='promise'&&h.quests.find(q=>q.id===id&&q.status==='active'),note=domain==='cache'&&p.moneyCaches?.places.find(n=>n.id===id);if(!q&&!note)return false;
 if(cause==='neglect'&&(domain==='cache'?(h.area===note.area||h.goal?.cache===id||s.tick-note.seen<CACHE_FORGET_AFTER):(h.goal?.quest===id||q.deadline&&q.deadline-s.tick<DAY_TICKS||s.tick-(q.recalledAt??q.accepted)<=PROMISE_FORGET_AFTER)))return false;
 const state=h.recollection ||= {version:1,losses:[]};if(state.losses.length>=24){const i=state.losses.findIndex(n=>n.restored!==null);if(i<0)return false;state.losses.splice(i,1);}
 state.losses.push({domain,id,at:s.tick,lastKnownAt:note?.seen??q.recalledAt??q.accepted,cause,source,restored:null,via:null});if(note)p.moneyCaches.places=p.moneyCaches.places.filter(n=>n.id!==id);
 if(h.goal?.quest===id||h.goal?.cache===id)h.goal=null;if(h.intentions?.balance){h.intentions.balance.current=null;h.intentions.balance.checked=null;}
 ctx?.log?.(s,cause==='head-impact'?'После тяжёлого удара по голове оборвалось конкретное воспоминание. Вещи и прежние обещания остаются в мире.':domain==='cache'?'Старый тайник долго не был нужен. Герой уже не может вспомнить его адрес. Деньги остаются на месте.':'Давнее дело перестало всплывать в памяти. Данное обещание от этого не исчезло.','memory');return true;
}
export function forgetOldPromise(s,q,ctx){return record(s,'promise',q.id,'neglect',null,ctx);}
export function recollectionTick(s,ctx){if(!enabled(s,'recollection')||s.tick%DAY_TICKS||s.hero.combat||s.hero.transit)return false;const p=s.people[s.hero.lineage];for(const n of p.moneyCaches?.places||[])if(record(s,'cache',n.id,'neglect',null,ctx))return true;return false;}
export function memoryDamage(s,p,w,ctx){
 const h=s.hero,c=w?.lastCause;if(!enabled(s,'recollection')||!enabled(s,'local-wounds')||p.id!==h.lineage||!h.alive||h.hp<=0||!p.localWounds?.active.includes(w)||w.role!=='head'||w.severity<2||w.lastHit!==s.tick||c?.tick!==s.tick||c.after!==h.hp||c.after<=0||c.before-c.after<c.maximum*.2||h.recollection?.losses.some(n=>n.source?.id===c.id))return false;
 const n=hash(s.seed+'/'+c.id+'/memory');if(n%32)return false;
 const candidates=[...(p.moneyCaches?.places||[]).map(k=>({domain:'cache',id:k.id})),...h.quests.filter(q=>q.status==='active'&&promiseRemembered(h,q)).map(q=>({domain:'promise',id:q.id}))].sort((a,b)=>(a.domain+'/'+a.id).localeCompare(b.domain+'/'+b.id));if(!candidates.length)return false;
 const chosen=candidates[(n>>>5)%candidates.length],source={...c,wound:w.id,role:w.role,severity:w.severity};return record(s,chosen.domain,chosen.id,'head-impact',source,ctx);
}
export function restoreCacheKnowledge(s,p,id,from){const h=p.id===s.hero.lineage?s.hero:s.actorStates?.[p.id],gap=h&&knowledgeGap(h,'cache',id);if(!gap)return false;gap.restored=s.tick;gap.via=from;return true;}
