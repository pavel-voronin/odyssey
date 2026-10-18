import {enabled} from './rules.js';
import {escapeText,semanticText,formatDurations} from './text.js';
import {LOOT_FATES} from './modules/loot-results.js';
import {STAT_NAMES} from './content.js';
const allowed=new Set(['person','enemy','item','danger']);
const statLabels=new Map(Object.entries({...STAT_NAMES,attack:'Удар',magic:'Магия',defense:'Защита'}).map(([key,label])=>[key,label.toLowerCase()]));
export function referenceText(s,ref){
 const kind=allowed.has(ref?.kind)?ref.kind:'danger',label=ref?.label||'Неизвестно',role=ref?.role||({person:'путник',enemy:'противник',item:'предмет',danger:'опасность'}[kind]);
 const trust=kind==='person'?(s.hero.relations?.[ref?.id]?.trust||0):0,color=kind==='person'?(ref.id===s.hero.lineage?'#ffe0a1':trust>=10?'#c4eac1':trust<=-10?'#ffc2b1':'#d0e4ff'):null;
 return `<span class="event-ref ref-${kind}"${ref?.id?` data-entity="${escapeText(ref.id)}"`:''}${color?` style="--reference-color:${color}"`:''}>${escapeText(label)} <span class="entity-role">(${escapeText(role)})</span></span>`;
}
const money=n=>`<span class="ref-money" aria-label="${escapeText(n)} монет"><span aria-hidden="true">◈</span> ${escapeText(n)}</span>`;
export function lootBrief(s,m){const stat=statLabels.get(m.item.stat),effect=m.item.armorEffect,property=effect&&Number.isFinite(effect.defense)&&Number.isFinite(effect.walkExtra)?` · защита +${escapeText(effect.defense)}${effect.walkExtra?' · шаг +'+escapeText(String(effect.walkExtra).replace('.',','))+' силы':''}`:stat&&Number.isFinite(m.item.power)?` · ${stat} +${escapeText(m.item.power)}`:'';return `${referenceText(s,m.item)}${property} → <span class="loot-fate">${escapeText(LOOT_FATES[m.result.fate]||LOOT_FATES.unknown)}</span>`;}
export function semanticEvent(s,event,{details=false}={}){
 const m=event?.meaning;
 const fallback=()=>['combat','victory','death'].includes(event?.type)?escapeText(formatDurations(event?.text||'',s)):semanticText(s,event?.text||'');
 if(!enabled(s,'event-meaning')||m?.version!==1||!m.actor)return fallback();
 const actor=referenceText(s,m.actor),target=m.target?referenceText(s,m.target):null;
 switch(m.action){
  case 'strike':if(target&&Number.isFinite(m.amount))return `${actor} → ${target}: удар, <span class="event-damage">${escapeText(m.amount)} урона</span>.`;break;
  case 'heal':if(Number.isFinite(m.amount))return `${actor} использует ${m.item?referenceText(s,m.item):'лечебное средство'}: <span class="event-heal">+${escapeText(m.amount)} HP</span>.`;break;
  case 'victory':if(target)return `Победа: ${actor}. Противник: ${target}.`;break;
  case 'death':return `† ${actor} погибает. ${m.target?.kind==='enemy'?'Противник':'Причина'}: ${target||'неизвестна'}.`;
  case 'buy':if(m.item&&target&&Number.isFinite(m.amount))return `${actor}: покупка — ${referenceText(s,m.item)} за ${money(m.amount)}. Продавец: ${target}.`;break;
  case 'loot-result':if(m.item&&m.result){
   const replaced=m.result.replaced?.item?m.result.replaced:null,left=Array.isArray(m.result.left)?m.result.left:[];
   return `${m.actor.id===s.hero.lineage?'Получено':actor+': находка'}: ${lootBrief(s,m)}.${replaced?` Прежнее снаряжение: ${referenceText(s,replaced.item)} → ${escapeText(LOOT_FATES[replaced.fate]||LOOT_FATES.unknown)}.`:''}${details&&typeof m.result.choiceReason==='string'?' '+escapeText(m.result.choiceReason):''}${details&&left.length?` Оставлено: ${left.map(i=>referenceText(s,i)).join(', ')}. Это запись о находке, не содержимое сумки.`:''}`;
  }break;
  case 'loot-sale':if(Array.isArray(m.result?.items)&&Number.isFinite(m.amount))return `${actor}: продано вещей — ${escapeText(m.result.items.length)}, получено ${money(m.amount)}.${details?` ${m.result.items.map(i=>referenceText(s,i)).join(', ')}.`:''}`;break;
 }
 return fallback();
}
export function semanticCause(s,cause,meaning){
 // A historical cause string alone cannot identify a killer, even if a known
 // living person happens to share its name. Preserve the old plain fallback.
 return enabled(s,'event-meaning')&&meaning?.version===1&&meaning.action==='death'&&meaning.actor?semanticEvent(s,{text:cause,meaning}):escapeText(cause??'Причина неизвестна');
}
