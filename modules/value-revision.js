import {enabled} from '../rules.js';
const on=s=>enabled(s,'value-revision');
export function valueRevisionBias(s,q){
 if(!on(s)||!q)return 0;const h=s.hero,n=h.valueRevision;
 return (q.kind==='rescue'?(n?.help||0):0)+(h.quests.includes(q)?n?.promise||0:0);
}
export function promiseBreachChance(s){return .3-(on(s)?s.hero.valueRevision?.promise||0:0)*.04;}
export function recordValueOutcome(s,q,kind,ctx={}){
 const h=s.hero,p=s.people[q?.person],giver=s.people[q?.giver||(q?.kind==='rescue'?q.person:null)];
 if(!on(s)||!q||!h.alive||h.life.ended||h.actorMode==='npc'||!h.quests.includes(q)||q.valueReceipt||!Number.isSafeInteger(q.accepted)||q.accepted>s.tick||!giver||!h.memory.people.includes(giver.id))return false;
 if(kind==='rescue'){
  if(q.kind!=='rescue'||q.status!=='done'||q.completed!==s.tick||!q.rescued||!p?.alive||p.area!==h.area||!h.memory.people.includes(p.id))return false;
 }else if(kind==='brokenPromise'){
  const sold=q.status==='failed'&&q.kind==='delivery'&&q.promiseBreach?.kind==='sold-letter'&&q.promiseBreach.tick===s.tick&&q.promiseBreach.actor===h.lineage;
  if((q.status!=='abandoned'&&!sold)||q.failed!==s.tick||s.tick-q.accepted<24)return false;
 }else return false;
 const n=(h.valueRevision ||= {version:1,help:0,promise:0,events:[]}),key=kind==='rescue'?'help':'promise',before=n[key];
 const anchored=h.personality.curiosity<.55||(kind==='rescue'?h.personality.generosity>=.85:enabled(s,'inner-life')&&h.innerLife.facets.some(f=>f.id==='loyalty'&&f.weight>=7));
 const delta=anchored?0:Math.max(0,6-before);n[key]+=delta;
 const reason=delta?(kind==='rescue'?`После возвращения ${p.name} живым помощь людям значит для него больше.`:'Сознательный отказ от данного слова заставляет его серьёзнее относиться к следующим обещаниям.'):anchored?'Он помнит этот исход, но сохраняет прежнее убеждение.':'Этот исход подтверждает уже укрепившееся убеждение.';
 const e={id:`value/${h.lineage}/${q.id}`,kind,quest:q.id,accepted:q.accepted,title:q.title||q.kind,tick:s.tick,area:h.area,actor:h.lineage,giver:{id:giver.id,name:giver.name},person:p?{id:p.id,name:p.name}:null,outcome:kind==='rescue'?'returned-alive':q.status==='abandoned'?'abandoned-by-actor':'sold-letter',before,after:n[key],delta,stance:delta?'changed':'kept',reason};
 n.events.push(e);if(n.events.length>8)n.events.splice(n.events.findIndex(e=>e.delta===0),1);
 q.valueReceipt={id:e.id,kind,tick:s.tick,delta};ctx.log?.(s,`${h.name}: ${reason}`,'choice');return true;
}
export function valueRevisionHTML(s,escape,format){
 const n=s.hero.valueRevision;if(!n?.events.length)return '';
 const shown=n.events.filter(e=>e.delta>0).concat(n.events.filter(e=>e.delta===0).slice(-1)).sort((a,b)=>b.tick-a.tick);
 return `<section><p class="detail-label">ПЕРЕЖИТОЕ И УБЕЖДЕНИЯ</p>${shown.map(e=>`<p>${escape(format?format(e):'')} · ${escape(e.title)}<br>${escape(e.reason)}<br>Участники: ${escape(e.giver.name)}${e.person&&e.person.id!==e.giver.id?' · '+escape(e.person.name):''}</p>`).join('')}</section>`;
}
