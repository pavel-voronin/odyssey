import {enabled} from '../rules.js';
import {itemBonus} from './inventory.js';
import {legacyArmorDefense} from './armor.js';
import {partyAvailable} from './party-needs.js';
import {canPayRansom} from './rescue-choice.js';

const on=s=>enabled(s,'delves')&&enabled(s,'delve-attempts');
const rootOf=(s,d)=>d.attemptRoot||s.areas[d.room]?.dungeon?.root||d.root;
const memory=h=>h.delveMemory ||= {serial:0,places:{},starts:0,adoptions:0,resumes:0,contacts:0,actions:0,refusals:0};
function ownState(s){
 const h=s.hero;
 return {hp:h.hp,energy:h.energy,weapon:h.weapon+itemBonus(h,'attack'),defense:legacyArmorDefense(h)+itemBonus(h,'defense'),potions:h.inventory.potions,herbs:h.inventory.herbs,
  conditions:enabled(s,'body')?(h.conditions||[]).filter(c=>c.until>s.tick).map(c=>c.id).sort():[],
  spells:enabled(s,'magic')?[...h.magic.spells].sort():[],
  party:enabled(s,'companions')?h.companions.filter(c=>c.hp>0&&partyAvailable(s,c)).map(c=>String(c.person||c.uid||c.id)).sort():[]};
}
function purpose(s,root){
 const h=s.hero,q=root&&h.quests.find(q=>q.status==='active'&&['rescue','relic','scout'].includes(q.kind)&&(q.target===root||s.areas[q.target]?.dungeon?.root===root));
 if(q)return {kind:q.kind,quest:q.id,text:q.cause||q.title||'Данное обещание'};
 if(enabled(s,'identity')&&!h.destiny.completed){
  if(h.destiny.id==='hoard'&&h.gold<100)return {kind:'hoard',quest:null,text:'Собрать собственный запас на чёрный день'};
  if(h.destiny.id==='relics')return {kind:'relics',quest:null,text:'Найти реликвии ради своего предназначения'};
 }
 return {kind:'curiosity',quest:null,text:'Самостоятельный поиск сокровищ'};
}
export function delveEntryReason(s,gate){
 const h=s.hero,p=purpose(s,gate?.dungeon?.root||gate?.id);
 if(p.quest)return 'promise:'+p.kind;
 if(h.personality.generosity>=.6&&h.quests.some(q=>q.status==='active'&&q.kind==='rescue'&&q.deadline>s.tick&&q.deadline-s.tick<=180))return null;
 if(p.kind==='hoard'&&h.personality.courage>=.45)return 'hoard';
 if(p.kind==='relics'&&h.personality.curiosity>=.25&&h.personality.courage>=.25)return 'relics';
 return h.personality.curiosity>=.4&&h.personality.courage>=.25?'curiosity':null;
}
function beginRecord(s,d,reason,incomplete){
 const h=s.hero,m=memory(h),root=d.attemptRoot;d.attemptId=`${h.lineage}:delve:${++m.serial}`;d.attemptTracking='recorded';
 const r=m.places[root]={id:d.attemptId,root,started:d.started,room:d.room,floors:d.floors,cleared:d.cleared,status:'active',reason,purpose:purpose(s,root),incomplete,resumes:0,contacts:0,actions:0,refusals:0,lastTick:s.tick};
 const entries=Object.values(m.places).sort((a,b)=>a.lastTick-b.lastTick);
 for(const old of entries.slice(0,Math.max(0,entries.length-24)))if(old.root!==root)delete m.places[old.root];
 return r;
}
export function delveRecord(s){
 if(!on(s)||!s.hero.delve)return null;
 const h=s.hero,d=h.delve;
 // A known current OFF start may begin keeping notes now. No missing old
 // attempt ID or incomplete imported record is evidence of such a start.
 if(d.attemptTracking==='untracked'){beginRecord(s,d,'tracking-enabled',true);memory(h).adoptions++;}
 if(d.attemptTracking!=='recorded')return null;
 const r=h.delveMemory?.places[d.attemptRoot];if(!r||r.id!==d.attemptId)return null;
 r.room=d.room;r.floors=d.floors;r.cleared=d.cleared;r.lastTick=s.tick;return r;
}
export function startDelve(s,d,reason){
 d.attemptRoot=rootOf(s,d);d.attemptTracking=on(s)?'recorded':'untracked';
 if(!on(s))return;
 const m=memory(s.hero),prior=m.places[d.attemptRoot];
 const r=beginRecord(s,d,reason||'curiosity',false);m.starts++;
 if(prior?.last){r.last=prior.last;r.acceptedRisk=prior.acceptedRisk;if(reason==='accepted-risk')r.acceptedRisk=riskSignature(s,r);r.risk={enemy:prior.last.enemy,area:prior.last.area,attempt:r.id};}
}
export function pauseDelve(s,enemy,outcome='refused'){
 const r=delveRecord(s),h=s.hero;if(!r||h.area!==r.room)return;
 if(r.status==='paused')return;
 r.status='paused';r.refusals++;memory(h).refusals++;
 r.last={tick:s.tick,outcome,enemy:enemy.id,hp:enemy.hp,area:h.area,own:ownState(s),purpose:purpose(s,r.root)};
 if(r.contact){r.contact.outcome=outcome;r.contact.ended=s.tick;}
 r.contact=null;r.risk=null;
}
export function contactDelve(s,enemy){
 const r=delveRecord(s),h=s.hero;if(!r||r.room!==h.area||!enemy.alive||enemy.resolved)return;
 if(!r.contact||r.contact.enemy!==enemy.id||r.contact.area!==h.area){
  r.contact={id:`${r.id}:contact:${++r.contacts}`,enemy:enemy.id,area:h.area,started:s.tick,actions:0};memory(h).contacts++;
 }
 if(r.actionTick!==s.tick){r.actionTick=s.tick;r.actions++;r.contact.actions++;memory(h).actions++;}
}
export function finishDelve(s,outcome){const r=delveRecord(s);if(r){r.status='ended';r.outcome=outcome;r.ended=s.tick;r.contact=null;r.risk=null;}}

function riskSignature(s,r){const n=ownState(s),p=purpose(s,r.root);return JSON.stringify([r.last.enemy,n.weapon,n.defense,n.potions,n.herbs,n.conditions,n.spells,n.party,p.quest]);}

// No current remote enemy lookup: improvements are owned resources or a locally observed warning.
export function reentryReason(s,r){
 if(!r?.last)return 'curiosity';
 const h=s.hero,b=r.last.own,n=ownState(s),p=purpose(s,r.root);
 if(n.hp>=b.hp+Math.max(5,h.maxHp*.15))return 'recovered';
 if(n.energy>=b.energy+20)return 'rested';
 if(b.conditions.some(id=>['poison','fever','insomnia','curse','frost'].includes(id)&&!n.conditions.includes(id)))return 'condition-ended';
 if(n.weapon>b.weapon||n.defense>b.defense)return 'better-equipment';
 if(n.potions>b.potions||n.herbs>b.herbs)return 'remedy';
 if(n.spells.some(id=>!b.spells.includes(id)))return 'known-method';
 if(n.party.some(id=>!b.party.includes(id)))return 'companion';
 if(p.quest&&p.quest!==r.last.purpose.quest)return 'new-promise';
 const rescue=h.quests.find(q=>q.id===p.quest&&q.dungeonRescue?.version===1&&q.dungeonRescue.stage==='captive');
 if(enabled(s,'dungeon-rescue')&&rescue?.dungeonRescue.quote&&!rescue.dungeonRescue.quote.usableAtContact&&canPayRansom(s,rescue.dungeonRescue.quote))return 'ransom-funded';
 const observed=h.memory.rejected?.[r.last.area];
 if(observed?.enemy===r.last.enemy&&observed.seen>r.last.tick&&observed.hp<=r.last.hp*.75)return 'observed-progress';
 if(h.area===r.last.area&&!s.areas[h.area].objects.some(e=>e.id===r.last.enemy&&e.alive&&!e.resolved))return 'observed-clearance';
 const signature=riskSignature(s,r);
 const willing=h.personality.courage>=.8&&h.personality.curiosity>=.65||p.kind==='rescue'&&h.personality.generosity>=.75;
 if(willing&&r.acceptedRisk!==signature)return 'accepted-risk';
 return null;
}
export function reconsiderDelve(s,ctx){
 const r=delveRecord(s);if(!r||r.status!=='paused')return true;
 const why=reentryReason(s,r);if(!why)return false;
 const oldRisk=r.risk;r.status='active';r.risk={enemy:r.last.enemy,area:r.last.area,attempt:r.id};
 if(ctx.expeditionReady&&!ctx.expeditionReady(s,{kind:'hunt',area:r.room,x:35})){
  ctx.prepareExpedition?.(s,{kind:'hunt',area:r.room,x:35});r.status='paused';r.risk=oldRisk;return false;
 }
 if(why==='accepted-risk'){
  r.acceptedRisk=riskSignature(s,r);
 }
 r.status='active';r.reason=why;r.resumes++;memory(s.hero).resumes++;
 r.risk={enemy:r.last.enemy,area:r.last.area,attempt:r.id};
 const reasons={recovered:'раны затянулись',rested:'силы восстановлены','condition-ended':'прежний недуг прошёл','better-equipment':'снаряжение стало надёжнее',remedy:'появилось средство помощи','known-method':'известен новый способ','ransom-funded':'теперь может выполнить известные условия выкупа',companion:'появился готовый попутчик','new-promise':'дано новое обещание','observed-progress':'он сам заметил ослабление противника','observed-clearance':'он увидел свободный проход','accepted-risk':'риск осознан и принят'};
 ctx.log(s,`${s.hero.name} возвращается к прежнему походу: ${reasons[why]}.`,'choice');return true;
}
export function delvePassage(s,id,enemy){
 if(!on(s))return false;const d=s.hero.delve,r=d&&s.hero.delveMemory?.places[rootOf(s,d)];
 return Boolean(r&&d&&r.id===d.attemptId&&r.status==='active'&&r.risk?.attempt===r.id&&r.risk.area===id&&(!enemy||r.risk.enemy===enemy));
}
export function priorDelve(s,gate){return on(s)?s.hero.delveMemory?.places[gate.dungeon?.root||gate.id]:null;}

// A synchronous preparation query can consider an explicitly justified passage.
// Its temporary proposal is restored even when the budget rejects the journey.
export function prepareDelveEntry(s,gate,prior,ctx){
 if(!on(s)||!ctx.expeditionReady)return {ready:true,preparing:false};
 const h=s.hero,old=h.delve,record=prior&&h.delveMemory.places[prior.root];
 if(prior?.last){h.delve={root:prior.root,attemptRoot:prior.root,room:gate.id,attemptId:prior.id};h.delveMemory.places[prior.root]={...prior,status:'active',risk:{enemy:prior.last.enemy,area:prior.last.area,attempt:prior.id}};}
 try{const g={kind:'hunt',area:gate.id,x:35};if(ctx.expeditionReady(s,g))return {ready:true,preparing:false};return {ready:false,preparing:Boolean(ctx.prepareExpedition?.(s,g))};}
 finally{h.delve=old;if(record)h.delveMemory.places[prior.root]=record;}
}
