import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {selfDrivenActor,setActorMoney} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {npcKnownRoute,initializeNPCKnowledge} from './npc-knowledge.js';
import {productionSources,goodsEnabled} from './goods.js';
import {partyBodySpent} from './party-combat-policy.js';
import {takeBuriedMoney} from './money-caches.js';

const on=s=>enabled(s,'route-maps')&&enabled(s,'finances');
export const mapCopyMemory=p=>(p.mapCopies ||= {version:1,serial:0,paper:[],copies:[],lastActionTick:-1});
const actor=(s,p)=>selfDrivenActor(s,p.id)?s.actorStates[p.id]:null;
const wallet=(s,p)=>actor(s,p)?.gold??p.agenda.wealth;
function body(s,p){const h=actor(s,p);return h?(h.transit?null:{area:h.area,x:h.x}):localContact(s,p.id,p.area);}
function ready(s,p){const b=p&&body(s,p),h=p&&actor(s,p);return on(s)&&p?.alive&&!p.needs?.sleeping&&!h?.combat&&!partyBodySpent(s,p)&&b?b:null;}
function spend(s,p,energy){const h=actor(s,p);if(h)h.energy=Math.max(0,h.energy-energy);else p.needs.energy=Math.max(0,p.needs.energy-energy);mapCopyMemory(p).lastActionTick=s.tick;}
function holderCopy(p,id){return p.mapCopies?.copies.find(c=>c.id===id&&c.owner===p.id&&c.holder.kind==='person'&&c.holder.person===p.id);}
export function buyMapPaper(s,p){
 const b=ready(s,p),a=b&&s.areas[b.area];if(!a?.civic||!goodsEnabled(s)||wallet(s,p)<2||physicalDistance(a,b.x,42)>12||(p.mapCopies?.paper.length||0)>=4)return null;
 const supplier=(a.population||[]).map(id=>s.people[id]).find(q=>q?.alive&&q.area===a.id&&q.status==='resident'&&['artisan','merchant'].includes(q.agenda?.job)&&!q.needs?.sleeping);if(!supplier)return null;
 const material=productionSources(s,a)?.materials;if(!material||material.stock<1)return null;
 const m=mapCopyMemory(p),paper={id:`map-paper/${p.id}/${++m.serial}`,source:material.id,area:a.id,supplier:supplier.id,created:s.tick,paid:2};
 material.stock--;material.used++;setActorMoney(s,p,wallet(s,p)-2);a.civic.treasury+=2;m.paper.push(paper);spend(s,p,1);return paper;
}
export function copyTreasureMap(s,p,document,cacheId){
 const b=ready(s,p),d=p.routeMaps?.documents.find(d=>d.id===document&&d.owner===p.id),n=p.moneyCaches?.places.find(n=>n.id===cacheId),m=p.mapCopies;
 if(!b||!d||!n||!m?.paper.length||m.copies.length>=8||![d.route.from,d.route.to].includes(n.area)||(actor(s,p)?.energy??p.needs.energy)<35)return null;
 const paper=m.paper.shift(),copy={version:1,id:`map-copy/${p.id}/${++m.serial}`,owner:p.id,author:d.author,writer:p.id,sourceMap:d.id,written:s.tick,route:structuredClone(d.route),treasure:{id:n.id,area:n.area,x:n.x,at:n.seen,source:n.from},material:paper,holder:{kind:'person',person:p.id},check:null};
 m.copies.push(copy);spend(s,p,1);return copy;
}
function interested(s,p,c){const h=actor(s,p);return c.owner!==p.id&&!['empty','wrong-report'].includes(c.check?.kind)&&!p.moneyCaches?.places.some(n=>n.id===c.treasure.id)&&!p.mapCopies?.copies.some(k=>k.treasure.id===c.treasure.id)&&(h?h.personality.curiosity>.55:p.agenda.duty<.4||p.agenda.job==='merchant');}
export function buyTreasureMap(s,buyer,sellerId,id,ctx){
 const a=ready(s,buyer),seller=s.people[sellerId],b=seller&&body(s,seller),c=seller&&holderCopy(seller,id),h=actor(s,buyer);
 if(!a||!seller?.alive||seller.needs?.sleeping||!b||!c||a.area!==b.area||physicalDistance(s.areas[a.area],a.x,b.x)>12||wallet(s,buyer)<7||!interested(s,buyer,c)||h&&!ctx?.maySpend?.(s,'map',3,ctx))return false;
 setActorMoney(s,buyer,wallet(s,buyer)-3);setActorMoney(s,seller,wallet(s,seller)+3);seller.mapCopies.copies=seller.mapCopies.copies.filter(k=>k!==c);c.owner=buyer.id;c.holder={kind:'person',person:buyer.id};mapCopyMemory(buyer).copies.push(c);
 initializeNPCKnowledge(s,buyer);const n=c.route;for(const [area,name]of [[n.from,n.fromName],[n.to,n.toName]])if(!buyer.navigation.places.some(k=>k.area===area))buyer.navigation.places.push({area,name,seen:n.at});if(!buyer.navigation.roads.some(r=>r.key===n.key))buyer.navigation.roads.push({key:n.key,from:n.from,to:n.to,seen:n.at});
 if(h){for(const id of [n.from,n.to])if(!h.atlas.known.includes(id))h.atlas.known.push(id);if(!h.atlas.roads.includes(n.key))h.atlas.roads.push(n.key);}spend(s,buyer,0);return true;
}
export function inspectTreasureMap(s,p,id){
 const b=ready(s,p),c=holderCopy(p,id);if(!b||!c||c.check||b.area!==c.treasure.area||physicalDistance(s.areas[b.area],b.x,c.treasure.x)>9)return null;
 const t=c.treasure,o=s.areas[b.area].objects.find(o=>o.id===t.id&&o.kind==='buriedMoney'&&physicalDistance(s.areas[b.area],o.x,t.x)<=1);
 let amount=0,kind='wrong-report';
 if(o){p.moneyCaches ||= {version:1,places:[],lastActionTick:-1,after:0};if(!p.moneyCaches.places.some(n=>n.id===o.id))p.moneyCaches.places.push({id:o.id,area:b.area,x:o.x,owner:o.moneyCache.owner,seen:s.tick,source:'contact',from:t.source});if(p.moneyCaches.places.length>16)p.moneyCaches.places.shift();amount=takeBuriedMoney(s,p,o.id,8);kind=amount?'found':'empty';}
 c.check={tick:s.tick,kind,amount};spend(s,p,1);return c.check;
}
export function pickupMapCopy(s,p,id){const b=ready(s,p),c=p.mapCopies?.copies.find(c=>c.id===id&&c.owner===p.id&&c.holder.kind==='ground');if(!b||!c||b.area!==c.holder.area||physicalDistance(s.areas[b.area],b.x,c.holder.x)>9)return false;c.holder={kind:'person',person:p.id};spend(s,p,1);return true;}
export function inheritMapCopies(s,p,heir,area,x,estate,transit=null){
 if(!p.mapCopies?.copies.length)return;const target=heir?mapCopyMemory(heir):p.mapCopies;
 for(const c of [...p.mapCopies.copies]){c.holder=transit?{kind:'transit',journey:structuredClone(transit)}:{kind:'ground',area,x};if(heir){c.owner=heir.id;target.copies.push(c);estate.assets.push({kind:'map-copy',area,id:c.id});}}
 if(heir)p.mapCopies.copies=[];
}
function plan(s,p){
 const b=ready(s,p);if(!b)return null;
 const inherited=p.mapCopies?.copies.find(c=>c.holder.kind==='ground'&&c.holder.area===b.area);if(inherited)return {pick:inherited.id,area:b.area,x:inherited.holder.x};
 const own=p.mapCopies?.copies.find(c=>!c.check&&c.holder.kind==='person'&&(c.treasure.area===b.area||npcKnownRoute(p,b.area,c.treasure.area).length));if(own)return {inspect:own.id,area:own.treasure.area,x:own.treasure.x};
 const a=s.areas[b.area],people=[...new Set([...(a.population||[]),...a.objects.filter(o=>o.person).map(o=>o.person)])].map(id=>s.people[id]).filter(q=>q?.alive&&q.id!==p.id);
 for(const q of people){const at=body(s,q);if(!at||at.area!==b.area||q.needs?.sleeping||physicalDistance(a,b.x,at.x)>30)continue;const c=q.mapCopies?.copies.find(c=>c.holder.kind==='person'&&c.holder.person===q.id&&interested(s,p,c));if(c&&wallet(s,p)>=7)return {buy:c.id,seller:q.id,area:b.area,x:at.x};}
 const source=p.routeMaps?.documents.find(d=>d.owner===p.id&&p.moneyCaches?.places.some(n=>[d.route.from,d.route.to].includes(n.area)&&people.some(q=>wallet(s,q)>=7&&interested(s,q,{owner:p.id,treasure:{id:n.id}}))));
 if(source&&(p.mapCopies?.copies.length||0)<2){const n=p.moneyCaches.places.find(n=>[source.route.from,source.route.to].includes(n.area));if(p.mapCopies?.paper.length)return {copy:source.id,cache:n.id,area:b.area,x:b.x};const material=s.areas[a.city]?.goods?.sources?.materials??a.goods?.sources?.materials,staff=(a.population||[]).some(id=>{const q=s.people[id];return q?.alive&&q.area===a.id&&q.status==='resident'&&['artisan','merchant'].includes(q.agenda?.job)&&!q.needs?.sleeping;});if(a.civic&&goodsEnabled(s)&&wallet(s,p)>=2&&material?.stock>=1&&staff)return {paper:true,area:b.area,x:42};}return null;
}
export function mapCopyPlan(s,ctx){const h=s.hero;if(h.energy<35||h.hunger>60)return false;const g=plan(s,s.people[h.lineage]);if(!g||g.buy&&!ctx.maySpend?.(s,'map',3,ctx))return false;ctx.goal(s,'mapCopy',g.area,g.x,g.inspect?'Проверить карту тайника':g.pick?'Подобрать унаследованную карту':g.buy?'Купить экземпляр карты':g.paper?'Подготовить бумагу':'Скопировать карту тайника','Экземпляр описывает прежнюю находку; нынешний остаток выяснится только на месте.',g);return true;}
export function mapCopyAction(s,p,t,ctx){let result=t.paper?buyMapPaper(s,p):t.copy?copyTreasureMap(s,p,t.copy,t.cache):t.buy?buyTreasureMap(s,p,t.seller,t.buy,ctx):t.pick?pickupMapCopy(s,p,t.pick):inspectTreasureMap(s,p,t.inspect);const h=actor(s,p);if(h){h.goal=null;if(result)h.lastAction='collect';}if(result)ctx.log(s,t.inspect?(result.kind==='found'?`${p.name} находит по карте ◈${result.amount}.`:result.kind==='empty'?'На месте тот же тайник, но он уже пуст. Старая карта не создала новых денег.':'На указанной точке нет описанного тайника. Сообщение об адресе оказалось неверным.'):'Карта или материал переходят настоящему владельцу; источник находки сохраняется.','trade');return Boolean(result);}
export function npcMapCopyPlan(s,p){const g=plan(s,p);return g?{kind:'mapCopy',target:g.area,x:g.x,remaining:1,knownNavigation:true,...g}:null;}
