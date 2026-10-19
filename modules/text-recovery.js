import {roomAdmission} from './room-state.js';
import {enabled} from '../rules.js';
import {textActor,heldTexts,canReadText,canWriteText,textWork} from './text-state.js';
import {recoverText} from './texts.js';
import {bookFund,fundChest,libraryHere} from './library-state.js';
const damaged=i=>i.textCopy?.condition==='damaged'&&i.textCopy.damage?.kind==='paper-fire'&&i.textCopy.salvaged?.cause!==i.textCopy.damage.cause;
export function textRecoveryTask(s,p){
 const h=textActor(s,p.id),a=s.areas[h?.area||p.area],items=heldTexts(s,p.id);if(!enabled(s,'paper-fire')||!enabled(s,'texts')||!p.alive||p.needs.sleeping||(h?h.energy:p.needs.energy)<35||(h?h.hunger:p.needs.hunger)>=60||h&&(h.combat||h.transit||h.hp<h.maxHp*.75||h.quests.some(q=>q.status==='active')||h.stories.active)||!h&&p.health<(p.maxHealth||100)*.75||!canWriteText(s,p))return null;
 const interested=h?h.personality.curiosity>=.6||h.career.path==='peaceful':p.agenda.job==='scholar'||p.agenda.curiosity>=.7;if(!interested)return null;
 const chest=fundChest(a),f=bookFund(a),eligible=i=>damaged(i)&&i.textCopy.owner===p.id&&(i.textCopy.fireResidue?.info||items.some(k=>k.id!==i.id&&k.textCopy?.condition==='intact'&&k.textCopy.content===i.textCopy.content&&k.textCopy.owner===p.id)||f?.owner===p.id&&chest.items.some(k=>k.textCopy?.content===i.textCopy.content&&k.textCopy.condition==='intact')),t=items.find(eligible);
 if(t){const w=textWork(s,t),source=items.find(i=>i.id!==t.id&&i.textCopy?.condition==='intact'&&i.textCopy.content===t.textCopy.content&&i.textCopy.owner===p.id&&i.libraryLoan?.returned!==null&&i.libraryTheft?.returned!==null);
  if(!source&&!t.textCopy.fireResidue?.info){const backup=f?.owner===p.id&&chest.items.find(i=>i.textCopy?.content===t.textCopy.content&&i.textCopy.condition==='intact');return backup&&roomAdmission(s,a,p.id)?{kind:'libraryWithdraw',target:a.id,x:56,item:backup.id}:null;}
  if(!canReadText(s,p,w.language)||!canWriteText(s,p,w.language))return null;
  const paper=items.find(i=>i.kind==='writingPaper');if(paper)return {kind:'textRecover',target:a.id,x:h?.x??p.x,item:t.id,source:source?.id??null,paper:paper.id};
  const market=a.interior?s.areas[a.interior.exterior||a.interior.parent]:a;return market?.civic?{kind:'textPaper',target:market.id,x:42}:null;
 }
 if(f?.owner===p.id&&roomAdmission(s,a,p.id)){const i=chest.items.find(eligible);if(i&&(i.textCopy.fireResidue?.info||chest.items.some(k=>k.id!==i.id&&k.textCopy?.content===i.textCopy.content&&k.textCopy.condition==='intact')||items.some(k=>k.textCopy?.content===i.textCopy.content&&k.textCopy.condition==='intact')))return {kind:'libraryWithdraw',target:a.id,x:56,item:i.id};}
 return null;
}
export function textRecoveryPlan(s,ctx){const t=textRecoveryTask(s,s.people[s.hero.lineage]);if(!t)return false;ctx.goal(s,t.kind,t.target,t.x,t.kind==='textRecover'?'Восстановить запись по настоящему источнику':t.kind==='libraryWithdraw'?'Забрать уцелевшие страницы':'Приобрести бумагу для восстановления','Сохранившаяся копия или отдельные страницы определяют, что можно восстановить. Архивное описание не заменяет книгу.',{item:t.item,source:t.source,paper:t.paper});return true;}
export function textRecoveryAction(s,ctx){const h=s.hero,g=h.goal,result=recoverText(s,s.people[h.lineage],g.item,g.source,g.paper);h.goal=null;if(result)ctx.log(s,s.literature.works[result.textCopy.content].content.kind==='fragment'?'Спасённые страницы сохранены на новой бумаге. Это неполный источник; полное знание ещё недоступно.':'Запись восстановлена с настоящего уцелевшего экземпляра. Новую копию ещё предстоит прочитать.','story');return Boolean(result);}
