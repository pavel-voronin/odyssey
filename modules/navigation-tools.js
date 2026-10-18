import {enabled} from '../rules.js';import {areaStep,physicalDistance} from '../geometry.js';
import {navigationToolsOn,isRopeItem,ownedRope,ropeKnots,descentObjects,attachedRope,usableAnchor,visibleDescent,ropeBusy} from './navigation-tool-state.js';
import {itemLocation,actorItemLocation,presentItem} from './item-originals.js';import {fitsPack,itemUnits,PACK_CAPACITY} from './container-state.js';import {localContact} from './npc-contacts.js';
const active=s=>navigationToolsOn(s),record=(s,h=s.hero)=>s.people[h.lineage].toolPractice ||= {version:1,rope:{lessons:[],lastActionTick:-1},events:[]};
const event=(s,kind,rope,details={})=>{const q=record(s);q.events.push({tick:s.tick,kind,item:rope.id,area:s.hero.area,...details});if(q.events.length>8)q.events.shift();};
const stamp=s=>{record(s).rope.lastActionTick=s.tick;s.hero.lastAction='work';};
const canAct=s=>active(s)&&!s.areas[s.hero.area]?.objects.some(e=>e.kind==='enemy'&&e.alive&&!e.hidden&&physicalDistance(s.areas[s.hero.area],s.hero.x,e.x)<=9)&&s.hero.alive&&!s.hero.transit&&!s.hero.combat&&s.hero.energy>=4&&s.people[s.hero.lineage]?.toolPractice?.rope.lastActionTick!==s.tick;
const near=(s,x)=>physicalDistance(s.areas[s.hero.area],s.hero.x,x)<=1;
export function initializeDescent(s,a){
 if(a.objects.some(o=>o.kind==='descent')||!active(s)||a.interior||a.temporaryCamp||!(a.type==='mountain'||a.type==='road'&&(a.depth===0||a.depth>=2&&a.depth%3===2)))return;
 a.objects.push({id:a.id+'/descent',kind:'descent',name:'Размытый спуск',x:72,items:[],descent:{version:1,bottom:80,detour:42,anchor:{id:a.id+'/stump',kind:'stump',intact:true},bypass:true,created:s.tick}});
}
export function buyNavigationRope(s,ctx){
 const h=s.hero,m=s.merchant,a=s.areas[h.area];if(!canAct(s)||ownedRope(s)||m.area!==h.area||!near(s,58)||h.gold<6||!fitsPack(s,h.lineage,{items:[...h.bag,{slot:'tool'}]})||ctx?.maySpend&&!ctx.maySpend(s,'tool',6,ctx))return false;
 const stored=m.items?.find(isRopeItem);if(!stored&&!(m.serviceStock?.gear>=1))return false;
 let item=stored;if(item)m.items.splice(m.items.indexOf(item),1);else{const before=m.serviceStock.gear;m.serviceStock.gear--;m.stock=m.serviceStock.gear+m.serviceStock.medicine;h.nextFieldTool=(h.nextFieldTool||0)+1;item={id:'rope/'+h.lineage+'/'+h.nextFieldTool,kind:'fieldTool',base:'rope',slot:'tool',stat:'spirit',power:0,rarity:1,value:7,modifier:'plain',name:'Дорожная верёвка',history:[],rope:{version:1,length:24,instructions:'Показаны два простых узла.',source:{kind:'merchant-stock',area:h.area,at:s.tick,before,after:before-1},uses:[]}};}
 h.gold-=6;m.toolPurse=(m.toolPurse||0)+6;h.energy--;h.bag.push(item);actorItemLocation(s,item);item.history.push({tick:s.tick,text:'Куплено у Савы за 6 монет.'});stamp(s);event(s,'bought',item);ctx?.log?.(s,'Куплена одна дорожная верёвка из действительного запаса Савы.','trade');return true;
}
export function sellNavigationRope(s,ctx){
 const h=s.hero,m=s.merchant,item=ownedRope(s);if(!canAct(s)||!item||m.area!==h.area||!near(s,58)||m.items?.some(isRopeItem)||(m.toolPurse||0)<5||(m.items||[]).reduce((n,i)=>n+itemUnits(i),0)+1>PACK_CAPACITY)return false;
 h.bag.splice(h.bag.indexOf(item),1);m.items ||= [];m.items.push(item);m.toolPurse-=5;h.gold+=5;h.energy--;itemLocation(s,item,{kind:'merchant',id:'merchant'});item.history.push({tick:s.tick,text:'Сава выкупил верёвку за 5 монет: ему нужен один экземпляр для перепродажи.'});stamp(s);event(s,'sold',item);ctx?.log?.(s,'Сава выкупает единственную верёвку для перепродажи. Без неё прежние способы больше недоступны.','trade');return true;
}
export function practiceRope(s,ctx){
 const item=ownedRope(s);if(!canAct(s)||!item||ropeKnots(s)||ropeBusy(s,item.id))return false;const q=record(s).rope;q.lessons.push({tick:s.tick,item:item.id,area:s.hero.area,source:'own-rope-illustrated-knots'});s.hero.energy-=2;stamp(s);if(q.lessons.length===2)ctx?.log?.(s,'После двух настоящих попыток герой умеет завязывать опорный узел на своей верёвке.','knowledge');return true;
}
function tie(s,o,ctx){
 const h=s.hero,held=attachedRope(o);if(held?.rope.attached?.progress>=2)return held;if(!canAct(s)||!ropeKnots(s)||!usableAnchor(o)||!near(s,o.x))return null;
 let item=held||ownedRope(s);if(!item||h.goal?.rope&&h.goal.rope!==item.id||ropeBusy(s,item.id)||held&&item.rope.attached.owner!==h.lineage)return null;
 if(!held){h.bag.splice(h.bag.indexOf(item),1);o.items.push(item);o.owner=h.lineage;item.rope.attached={anchor:o.id,owner:h.lineage,at:s.tick,progress:0};itemLocation(s,item,{kind:'cache',area:h.area,object:o.id});}
 item.rope.attached.progress++;h.energy-=2;stamp(s);if(item.rope.attached.progress===2){item.rope.uses.push({tick:s.tick,kind:'anchor',area:h.area,anchor:o.id,actor:h.lineage});if(item.rope.uses.length>8)item.rope.uses.shift();event(s,'anchored',item,{anchor:o.id});ctx?.log?.(s,'Верёвка закреплена на настоящей опоре. Она осталась здесь, а не в сумке.','equipment');}return null;
}
export function retrieveRope(s,o,ctx){
 const item=attachedRope(o),h=s.hero;if(!canAct(s)||!s.areas[h.area]?.objects.includes(o)||!item||!near(s,o.x)||h.goal?.rope===item?.id&&['ropeCross','ropePull'].includes(h.goal.kind)||item.rope.attached.owner!==h.lineage||ropeBusy(s,item.id)||!fitsPack(s,h.lineage,{items:[...h.bag,item]}))return false;
 o.items.splice(o.items.indexOf(item),1);delete item.rope.attached;h.bag.push(item);actorItemLocation(s,item);h.energy--;stamp(s);event(s,'retrieved',item,{anchor:o.id});ctx?.log?.(s,'Герой отвязывает тот же экземпляр верёвки и убирает в рюкзак.','equipment');return true;
}
export function navigationToolPlan(s,ctx){
 const h=s.hero,existing=h.goal;if(!canAct(s)||existing&&!['explore','travel','collect'].includes(existing.kind)||existing?.quest||existing?.intention||h.hunger>70||h.energy<25)return false;
 for(const o of descentObjects(s,h.area)){if(!visibleDescent(s,o))continue;const p=Object.values(s.people).find(p=>p.alive&&p.ropeStranded?.anchor===o.id&&p.area===h.area&&p.ropeStranded.cause.damage>0&&localContact(s,p.id,h.area)&&physicalDistance(s.areas[h.area],h.x,p.x)<=30);
  if(p&&ropeKnots(s)&&h.personality.generosity>=.5&&(ownedRope(s)||attachedRope(o))){ctx.goal(s,'ropePull',h.area,o.x,'Вытянуть путника','После настоящего срыва человек остался ниже опоры.',{object:o.id,person:p.id,rope:(attachedRope(o)||ownedRope(s)).id});return true;}}
 if(existing)return false;
 const item=ownedRope(s);if(item&&!ropeKnots(s)&&h.personality.curiosity>=.5){ctx.goal(s,'ropePractice',h.area,h.x,'Освоить опорный узел','На своей верёвке есть рисунок двух простых узлов.',{rope:item.id});return true;}
 if(s.merchant.area===h.area&&near(s,58)){if(item&&(h.gold<4||h.personality.curiosity<.5)){ctx.goal(s,'ropeSell',h.area,58,'Предложить верёвку Саве','Один экземпляр нужен торговцу для перепродажи.');return true;}if(!item&&h.gold>=16&&h.personality.curiosity>=.7&&s.merchant.serviceStock?.gear>=1){ctx.goal(s,'ropeBuy',h.area,58,'Купить дорожную верёвку','Один инструмент пригодится на спуске и при помощи раненому.');return true;}}
 return false;
}
export function navigationGate(s,target,ctx){
 const h=s.hero,g=h.goal,a=s.areas[h.area];if(!active(s)||!g||g.kind.startsWith('rope')||h.transit)return false;
 const d=descentObjects(s,h.area).find(o=>target>h.x?h.x<o.descent.bottom&&target>o.x:h.x>o.x&&target<o.descent.bottom);if(!d)return false;
 const entry=target>h.x?d.x:d.descent.bottom;if(physicalDistance(a,h.x,entry)>6)return false;
 const rope=attachedRope(d)||ownedRope(s),skilled=ropeKnots(s),use=rope&&skilled&&usableAnchor(d)&&rope.rope.length>=physicalDistance(a,d.x,d.descent.bottom)&&(target>h.x||attachedRope(d)?.rope.attached.progress>=2)&&(h.personality.courage>=.45||h.personality.curiosity>=.65),end=target>h.x?Math.min(target,d.descent.bottom):Math.max(target,d.x);
 if(!use&&!d.descent.bypass){h.goal=null;ctx?.log?.(s,'У спуска нет доступной опоры или безопасного обхода. Он останавливается.','plan');return true;}
 h.goal={kind:'ropeCross',area:h.area,x:entry,object:d.id,rope:use?rope.id:null,mode:use?'rope':'bypass',end,resume:g,remaining:Math.max(1,Math.ceil(d.descent.detour/6)),started:s.tick};h.intent=use?'Закрепить верёвку и спуститься':'Обойти размытый спуск';h.reason=use?'Есть свой инструмент, умение и видимая опора.':'Без безопасного узла он выбирает более долгий пологий обход.';return true;
}
export function navigationAction(s,ctx){
 const h=s.hero,g=h.goal;if(!g||!g.kind.startsWith('rope'))return false;
 if(active(s)&&!canAct(s))return false;
 if(g.kind==='ropeBuy'||g.kind==='ropeSell'){const done=g.kind==='ropeBuy'?buyNavigationRope(s,ctx):sellNavigationRope(s,ctx);h.goal=null;return done;}
 if(g.kind==='ropePractice'){const done=practiceRope(s,ctx);if(!done||ropeKnots(s))h.goal=null;return true;}
 const o=descentObjects(s,h.area).find(o=>o.id===g.object);if(!o){h.goal=g.resume||null;return true;}
 if(!active(s)){h.goal=g.resume||null;return true;}
 if(g.kind==='ropePull')return pull(s,o,g,ctx);
 if(g.kind==='ropeCross'){
  if(g.mode==='rope'){if(!ropeKnots(s)){h.goal=g.resume;return true;}const item=attachedRope(o);if(!usableAnchor(o)||!item&&ownedRope(s)?.id!==g.rope){h.goal=g.resume;return true;}if(!item||item.rope.attached.progress<2){if(!near(s,o.x)){h.goal=null;return true;}tie(s,o,ctx);return true;}if(item.id!==g.rope||!usableAnchor(o)||ropeBusy(s,item.id)){h.goal=null;return true;}const before=h.x;h.facing=Math.sign(g.end-h.x)||h.facing;h.x+=areaStep(s.areas[h.area],h.x,g.end,6);h.distance+=physicalDistance(s.areas[h.area],before,h.x);h.energy=Math.max(0,h.energy-2);stamp(s);h.lastAction='walk';g.x=h.x;if(near(s,g.end)){event(s,'descended',item,{anchor:o.id});item.rope.uses.push({tick:s.tick,kind:'descent',area:h.area,anchor:o.id,actor:h.lineage});if(item.rope.uses.length>8)item.rope.uses.shift();h.goal=g.resume;}}
  else {h.facing=Math.sign(g.end-h.x)||h.facing;h.x+=areaStep(s.areas[h.area],h.x,g.end,Math.max(.1,physicalDistance(s.areas[h.area],h.x,g.end)/Math.max(1,g.remaining)));h.distance+=o.descent.detour/Math.ceil(o.descent.detour/6);h.energy=Math.max(0,h.energy-1);stamp(s);h.lastAction='walk';g.x=h.x;if(--g.remaining<=0)h.goal=g.resume;}
  return true;
 }return false;
}
function pull(s,o,g,ctx){
 const h=s.hero,p=s.people[g.person];if(!canAct(s)||!p?.alive||p.area!==h.area||p.ropeStranded?.anchor!==o.id||!ropeKnots(s)||!usableAnchor(o)){h.goal=null;return true;}
 let item=attachedRope(o);if(!item&&ownedRope(s)?.id!==g.rope){h.goal=null;return true;}if(!item||item.rope.attached.progress<2){tie(s,o,ctx);return true;}if(item.id!==g.rope||ropeBusy(s,item.id)){h.goal=null;return true;}
 const before=p.x;p.x+=areaStep(s.areas[p.area],p.x,o.x,3);const resident=s.areas[p.area].objects.find(v=>v.person===p.id&&v.kind==='resident');if(resident)resident.x=p.x;h.energy-=2;stamp(s);
 if(physicalDistance(s.areas[p.area],p.x,o.x)<=1){delete p.ropeStranded;p.agenda.task=null;p.agenda.due=s.tick+8;event(s,'pulled',item,{person:p.id,anchor:o.id});item.rope.uses.push({tick:s.tick,kind:'pull',area:h.area,actor:h.lineage,person:p.id});if(item.rope.uses.length>8)item.rope.uses.shift();ctx?.log?.(s,p.name+' вытянут той же закреплённой верёвкой.'+(p.health<(p.maxHealth||100)*.85?' Его раны ещё требуют ухода.':' Он снова у опоры.'),'rescue');h.goal=null;}return p.x!==before;
}
export function navigationNPCStep(s,p,target,ctx){
 if(!active(s)||p.ropeStranded)return Boolean(p.ropeStranded);const a=s.areas[p.area],d=descentObjects(s,p.area).find(o=>target>p.x?p.x<o.descent.bottom&&target>o.x:p.x>o.x&&target<o.descent.bottom);if(!d)return false;
 const entry=target>p.x?d.x:d.descent.bottom;if(physicalDistance(a,p.x,entry)>6)return false;
 const before=p.x;if(target>p.x&&p.x<=d.x&&p.x+areaStep(a,p.x,target,3)>d.x&&p.needs.energy<35&&p.health>12&&p.health<(p.maxHealth||100)*.7&&p.agenda.duty<.35){p.x+=areaStep(a,p.x,target,3);const hp=p.health;p.health-=12;p.needs.energy=Math.max(0,p.needs.energy-3);p.ropeStranded={version:1,anchor:d.id,area:p.area,at:s.tick,cause:{kind:'actual-slip',from:before,to:p.x,before:hp,after:p.health,damage:12}};p.agenda.task=null;if(s.hero.area===p.area&&physicalDistance(a,s.hero.x,p.x)<=30)ctx?.log?.(s,p.name+' срывается на размытом спуске. Раненый остался ниже опоры.','condition');return true;}
 if(!d.descent.bypass){p.agenda.task=null;p.agenda.due=s.tick+48;return true;}p.x+=areaStep(a,p.x,target,1.5);p.needs.energy=Math.max(0,p.needs.energy-1);return true;
}
