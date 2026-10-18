import {enabled} from '../rules.js';
import {knownArea} from '../actor-atlas.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney,actorPartyLeader} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {partyBodySpent} from './party-combat-policy.js';

const on=s=>enabled(s,'finances');
const memory=p=>(p.moneyCaches ||= {version:1,places:[],lastActionTick:-1,after:0});
const funds=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id].gold:p.agenda.wealth;
function body(s,p){const h=selfDrivenActor(s,p.id)?s.actorStates[p.id]:actorPartyLeader(s,p.id);return h&&!h.transit?{area:h.area,x:h.x}:!h?localContact(s,p.id,p.area):null;}
function remember(s,p,cache,area,source,from){
 const m=memory(p);let note=m.places.find(n=>n.id===cache.id);
 if(!note){note={id:cache.id};m.places.push(note);}
 Object.assign(note,{area:area.id,x:cache.x,owner:cache.moneyCache.owner,seen:s.tick,source,from});
 if(m.places.length>16)m.places.shift();return note;
}
function ready(s,p){const b=p&&body(s,p);return on(s)&&p?.alive&&b&&!p.needs?.sleeping&&!partyBodySpent(s,p)?b:null;}
function localCache(s,p,id){const b=ready(s,p),note=p?.moneyCaches?.places.find(n=>n.id===id);if(!b||!note||b.area!==note.area||physicalDistance(s.areas[b.area],b.x,note.x)>9)return null;return s.areas[b.area].objects.find(o=>o.id===id&&o.kind==='buriedMoney'&&o.x===note.x)||null;}
export function shareMoneyCacheAddresses(s,from,to){
 if(!on(s)||from===to)return 0;const p=s.people[from],q=s.people[to],a=p&&body(s,p),b=q&&body(s,q);
 if(!p?.alive||!q?.alive||p.needs?.sleeping||q.needs?.sleeping||!a||!b||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>12)return 0;
 let count=0;for(const n of p.moneyCaches?.places||[]){if(n.owner===from&&(p.agenda?.bonds?.[to]??s.actorStates[from]?.relations?.[to]?.trust??0)<9||q.moneyCaches?.places.some(k=>k.id===n.id))continue;const m=memory(q);m.places.push({...n,seen:s.tick,source:'contact',from});if(m.places.length>16)m.places.shift();count++;}return count;
}
export function buryMoney(s,p,amount){
 const b=ready(s,p);if(!b||!Number.isSafeInteger(amount)||amount<=0||amount>funds(s,p))return null;
 const a=s.areas[b.area];if(a.interior||a.temporaryCamp||a.objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(a,b.x,o.x)<=30))return null;
 let cache=(p.moneyCaches?.places||[]).map(n=>a.objects.find(o=>o.id===n.id)).find(o=>o?.kind==='buriedMoney'&&o.moneyCache.owner===p.id&&physicalDistance(a,o.x,b.x)<=9);
 if(!cache){cache={id:`money-cache/${p.id}/${s.tick}`,kind:'buriedMoney',name:'Спрятанная мошна',x:b.x,moneyCache:{version:1,owner:p.id,placed:s.tick,balance:0,deposited:0,withdrawn:0,lastTick:-1,history:[]}};a.objects.push(cache);}
 setActorMoney(s,p,funds(s,p)-amount);const c=cache.moneyCache;c.balance+=amount;c.deposited+=amount;c.lastTick=s.tick;c.history.push({tick:s.tick,actor:p.id,kind:'deposit',amount});if(c.history.length>16)c.history.shift();
 remember(s,p,cache,a,'owner',p.id);const m=memory(p);m.lastActionTick=s.tick;m.after=s.tick+240;
 // Only a living body that actually sees the burial learns the hidden address.
 for(const id of new Set([...(a.population||[]),...a.objects.filter(o=>o.person).map(o=>o.person),...s.hero.companions.map(c=>c.person).filter(Boolean)])){
  if(id===p.id)continue;const q=s.people[id],w=q&&body(s,q);if(q?.alive&&!q.needs?.sleeping&&w?.area===a.id&&physicalDistance(a,w.x,b.x)<=12)remember(s,q,cache,a,'witness',p.id);
 }
 return cache;
}
export function takeBuriedMoney(s,p,id,wanted=8){
 const cache=localCache(s,p,id);if(!cache||!Number.isSafeInteger(wanted)||wanted<=0)return 0;
 const c=cache.moneyCache,m=memory(p),amount=Math.min(wanted,c.balance);m.lastActionTick=s.tick;m.after=s.tick+240;
 if(!amount){m.places=m.places.filter(n=>n.id!==id);return 0;}
 c.balance-=amount;c.withdrawn+=amount;c.lastTick=s.tick;c.history.push({tick:s.tick,actor:p.id,kind:'withdraw',amount});if(c.history.length>16)c.history.shift();setActorMoney(s,p,funds(s,p)+amount);return amount;
}
export function moneyCachePlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage],m=p.moneyCaches;
 if(!on(s)||!h.alive||h.transit||h.combat||h.energy<35||h.hunger>60||m?.after>s.tick)return false;
 const note=h.gold<12&&m?.places.find(n=>n.owner===p.id&&n.area===h.area);
 if(note){ctx.goal(s,'moneyCache',note.area,note.x,'Забрать часть сбережений','Герой помнит собственный тайник, но остаток проверит на месте.',{cache:note.id});return true;}
 if(h.money.style!=='cautious'||h.gold<64||!knownArea(s,h.area)||s.areas[h.area].interior||s.areas[h.area].temporaryCamp||s.areas[h.area].objects.some(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&physicalDistance(s.areas[h.area],h.x,o.x)<=30))return false;
 ctx.goal(s,'moneyCache',h.area,h.x,'Отложить деньги в тайник','Бережливый путник отделяет часть накопленного от дорожного кошелька.',{bury:true});return true;
}
export function moneyCacheAction(s,ctx){
 const h=s.hero,p=s.people[h.lineage],g=h.goal;if(g?.kind!=='moneyCache')return false;
 let amount=0;if(g.bury){const n=Math.min(30,Math.floor((h.gold-24)/4));if(buryMoney(s,p,n))amount=-n;}else amount=takeBuriedMoney(s,p,g.cache,Math.max(1,Math.min(12,24-h.gold)));
 h.goal=null;if(!amount)return false;h.lastAction='collect';ctx.log(s,amount<0?`Герой прячет ◈${-amount}. Адрес известен ему и только тем, кто видел закладку.`:`Герой забирает из тайника ◈${amount}. Остальное остаётся на месте.`,'trade');return true;
}
export function npcMoneyCachePlan(s,p){
 if(!on(s)||(p.moneyCaches?.after??0)>s.tick||p.needs?.sleeping||p.needs?.energy<30)return null;
 const note=p.moneyCaches?.places.find(n=>n.area===p.area&&(n.owner===p.id&&p.agenda.wealth<12||n.owner!==p.id&&p.agenda.duty<.4));
 return note?{kind:'moneyCache',target:note.area,x:note.x,remaining:1,cache:note.id}:null;
}
