import {textRecoveryTask} from './text-recovery.js';
import {textsOn,textActor,heldTexts,canReadText,canWriteText,textWork} from './text-state.js';
import {buyTextPaper,writeWorkNotice,copyText,readText,giveText,writeSequenceManual,recoverText} from './texts.js';
import {localContact} from './npc-contacts.js';
import {physicalDistance} from '../geometry.js';
import {marketWallet} from './market.js';
function ownTask(s,p){
 const h=textActor(s,p.id),a=s.areas[h?.area||p.area],items=heldTexts(s,p.id),m=p.textCraft;
 if(!textsOn(s)||!p.alive||p.needs.sleeping||(h?h.energy:p.needs.energy)<35||(h?h.hunger:p.needs.hunger)>=60||h&&(h.combat||h.transit||h.quests.some(q=>q.status==='active')||h.stories.active))return null;
 const interested=h?h.personality.curiosity>=.65||h.career.path==='peaceful':p.agenda.job==='scholar'||p.agenda.curiosity>=.65;if(!interested)return null;
 const unread=items.find(i=>textWork(s,i)&&canReadText(s,p,textWork(s,i).language)&&i.textCopy.condition==='intact'&&!m?.readings.some(r=>r.content===i.textCopy.content));
 if(unread)return {kind:'textRead',target:a.id,x:h?.x??p.x,item:unread.id,remaining:1};
 if(!canWriteText(s,p)||!a.civic||a.interior)return null;
 const manual=Object.values(p.mechanisms?.sequences||{}).find(n=>n.hint?.complete&&!m?.sequenceWorks?.[n.node]);if(manual){const paper=items.find(i=>i.kind==='writingPaper');if(paper)return {kind:'sequenceWrite',target:a.id,x:42,item:paper.id,node:manual.node,remaining:1};return marketWallet(s,p.id)>=5?{kind:'textPaper',target:a.id,x:42,remaining:1}:null;}
 const source=items.find(i=>i.textCopy?.content===m?.work&&i.textCopy.condition==='intact'),paper=items.find(i=>i.kind==='writingPaper'),copy=source&&!m?.copied.includes(m.work)&&(h?h.personality.generosity>=.6:p.agenda.duty>=.5);
 if(m?.work&&!copy)return null;
 if(!paper)return marketWallet(s,p.id)>=5?{kind:'textPaper',target:a.id,x:42,remaining:1}:null;
 return {kind:copy?'textCopy':'textWrite',target:a.id,x:42,item:paper.id,source:source?.id??null,remaining:1};
}
export function textPlan(s,ctx){
 const h=s.hero,p=s.people[h.lineage];if(!textsOn(s)||h.goal||h.combat||h.transit||h.energy<35||h.hp<h.maxHp*.75||h.hunger>=60||h.quests.some(q=>q.status==='active')||h.stories.active)return false;
 if(h.personality.curiosity>=.6)for(const q of Object.values(s.people)){
  const o=q.textCraft?.offer,b=o&&localContact(s,q.id,h.area);if(!o||!b||q.id===p.id||physicalDistance(s.areas[h.area],h.x,b.x)>12||p.textCraft?.readings.some(r=>r.content===o.content))continue;
  ctx.goal(s,'textGift',h.area,b.x,'Попросить запасной экземпляр','Местный автор предлагает отдельную копию. Передача требует встречи и не заменяет чтения.',{person:q.id,item:o.item});return true;
 }
 const t=ownTask(s,p);if(!t||t.kind==='textPaper'&&ctx.maySpend&&!ctx.maySpend(s,'learning',2,ctx))return false;ctx.goal(s,t.kind,t.target,t.x,({textRead:'Прочитать свою записку',textPaper:'Приобрести бумагу',textCopy:'Сделать запасной экземпляр',textWrite:'Записать наблюдение о работе',sequenceWrite:'Записать узнанный порядок тяги'})[t.kind],'У текста один автор и редакция; каждая бумажная копия имеет своё место и состояние.',{item:t.item,source:t.source,node:t.node});return true;
}
export function textAction(s,ctx){
 const h=s.hero,g=h.goal,p=s.people[h.lineage];if(!g)return false;
 const result=g.kind==='textGift'?giveText(s,s.people[g.person],p,g.item):perform(s,p,g,ctx);
 if(g.kind==='textRead'&&heldTexts(s,p.id).find(i=>i.id===g.item)?.textCopy?.damage?.tick===s.tick)ctx.log(s,'Открытая запись промокла под дождём. Содержание не разобрать; другие экземпляры от этого не изменились.','story');
 h.goal=null;if(result)ctx.log(s,g.kind==='textRead'?'Понятные сведения сохранены в памяти. Это запись опыта автора, которую ещё предстоит сопоставить с действительностью.':g.kind==='textGift'?'Получен тот же бумажный экземпляр; содержание ещё предстоит прочесть.':'Бумага и работа оставили настоящий экземпляр записи.','story');return Boolean(result);
}
function perform(s,p,t,ctx=null){if(t.kind==='textRecover')return recoverText(s,p,t.item,t.source,t.paper);if(t.kind==='textPaper')return buyTextPaper(s,p,ctx);if(t.kind==='sequenceWrite')return writeSequenceManual(s,p,t.item,t.node);if(t.kind==='textWrite')return writeWorkNotice(s,p,t.item);if(t.kind==='textCopy')return copyText(s,p,t.source,t.item);if(t.kind==='textRead')return readText(s,p,t.item);return false;}
export const textNPCTask=(s,p)=>textRecoveryTask(s,p)||ownTask(s,p);
export function textNPCAction(s,p){const t=p.agenda.task;if(!['textPaper','textWrite','textCopy','textRead','sequenceWrite','textRecover'].includes(t?.kind))return false;if(!textsOn(s))return true;perform(s,p,t);p.agenda.task=null;p.agenda.due=s.tick;return true;}
