import {effectiveLevel} from './modules/progression-state.js';
import {enabled} from './rules.js';
import {profession,race,CONDITIONS} from './content.js';
import {ageLabel,observedAge} from './modules/age.js';
import {dateLabel,elapsedLabel} from './calendar.js';
import {semanticCause,semanticEvent} from './event-text.js';
import {escapeText} from './text.js';
import {finalKnownEvents} from './modules/death-records.js';
import {NPC_JOBS} from './modules/people.js';
const numberFormat=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1,useGrouping:false});
const n=value=>Number.isFinite(value)?numberFormat.format(value):null;
function recentText(s,e,person){
 const m=e.meaning;
 if(m?.version===1&&m.action==='strike'&&Number.isFinite(m.amount)){if(m.target?.id===person)return `Получено ${m.amount} урона.`;if(m.actor?.id===person)return `Удар по противнику: ${m.amount} урона.`;}
 return semanticEvent(s,e);
}
export function deathSheet(s,life,h=s.hero){
 if(!enabled(s,'death-records')||(life?life.outcome!=='dead':h.alive))return null;
 const saved=life?.deathReport,r=saved?.version===1&&typeof saved.name==='string'&&typeof saved.person==='string'?saved:null,knownDate=r?true:life?life.deathDateKnown!==false:h.life.deathDateKnown!==false,ended=r?.tick??life?.ended??h.life.endedAt,born=r?.born??life?.born??h.born,areaId=life?life.area:h.deathSnapshot?.area;
 const name=r?.name??life?.name??h.name,family=r?.family??life?.family??h.family,job=r?.profession??life?.profession??h.profession,where=r?.place;
 const jobLabel=life?.actorMode==='npc'&&Object.hasOwn(NPC_JOBS,life.npcProfile?.job)?NPC_JOBS[life.npcProfile.job]:profession(job).name;
 const fullName=life?.actorMode==='npc'||!life&&h.actorMode==='npc'?name:[name,family].filter(Boolean).join(' ');
 const label=where?.transit?`${where.transit.mode==='sea'?'В море':'В пути'} · ${where.transit.fromLabel||'неизвестное отправление'} → ${where.transit.toLabel||'неизвестное направление'}`:!r&&life?.deathJourney?'В пути; точное место не записано':where?.label||s.areas[areaId]?.name||'Место не записано';
 const date=knownDate&&Number.isFinite(ended)?r?.place?.date||dateLabel(s,ended,s.areas[areaId]||{type:'road',continent:'c0',era:0}):'Дата гибели не записана';
 const age=r?r.age:knownDate?observedAge(life||h,ended):null,duration=knownDate&&Number.isFinite(ended)&&Number.isFinite(born)?elapsedLabel(Math.max(0,ended-born)):null;
 const resources=r?.resources,parts=[];
 if(resources){if(n(resources.energy)!==null)parts.push(`силы ${n(resources.energy)}/100`);if(n(resources.hunger)!==null)parts.push(`голод ${n(resources.hunger)}/100`);if(n(resources.potions)!==null)parts.push(`зелья ${n(resources.potions)}`);if(n(resources.herbs)!==null)parts.push(`травы ${n(resources.herbs)}`);if(n(resources.rations)!==null)parts.push(`пайки ${n(resources.rations)}`);if(n(resources.mana)!==null)parts.push(`мана ${n(resources.mana)}`);}
 const hp=resources&&n(resources.hpBefore)!==null&&n(resources.maxHp)!==null?`<p>До последнего урона: <b>${n(resources.hpBefore)}/${n(resources.maxHp)} HP</b>${n(resources.damage)!==null?` · получено ${n(resources.damage)} урона`:''}.</p>`:'';
 const events=(r?(Array.isArray(r.events)?r.events:[]):finalKnownEvents(s,life?.timeline,ended,life?.lineage,s.areas[areaId])).filter(e=>e&&typeof e.text==='string'&&Number.isFinite(e.tick)).slice(-12),latest=events.slice(-3).reverse(),older=events.slice(0,-3).reverse(),rows=list=>list.map(e=>`<li><time>${escapeText(e.date||'')}</time> ${recentText(s,e,r?.person??life?.lineage)}</li>`).join('');
 const inventory=life?.items?.length,wealth=life?.wealthBasis==='recorded-estate'?'Монеты при получении сведений':'Монеты при смерти';
 const receivedNote=Number.isFinite(life?.recordedAt)?`<p class="empty">Сведения получены: ${escapeText(dateLabel(s,life.recordedAt,s.areas[areaId]||{type:'road',continent:'c0',era:0}))}</p>`:'';
 const conditions=Array.isArray(r?.conditions)?r.conditions.filter(id=>typeof id==='string'):[],progress=[];if(n(r?.level??life?.level)!==null)progress.push(`уровень ${effectiveLevel(r?.effectiveLevel??life?.developmentScale?.level??r?.level??life?.level)} / 12`);if(Array.isArray(life?.places))progress.push(`мест ${life.places.length}`);if(n(life?.kills)!==null)progress.push(`побед ${n(life.kills)}`);if(life?.actorMode==='npc'&&n(life.npcProfile?.work)!==null)progress.push(`работ ${n(life.npcProfile.work)}`);if(Array.isArray(life?.quests))progress.push(`обещаний выполнено ${life.quests.filter(q=>q.status==='done').length}`);
 return `<div class="death-record"><p class="death-identity"><b>${escapeText(fullName)}</b> · ${escapeText(jobLabel)}${r?` · ${escapeText(race(r.race).name)}`:''}</p><p class="death-cause">${semanticCause(s,life?.cause||'Причина неизвестна',life?.causeMeaning)}</p><p>${escapeText(label)}${!r&&s.areas[areaId]?'<span class="empty"> · название места сейчас</span>':''}<br><span class="empty">${escapeText(date)} · ${escapeText(ageLabel(age))}${duration?` · путь ${escapeText(duration)}`:''}</span></p>${receivedNote}${hp}${parts.length?`<p class="empty">В момент гибели: ${parts.join(' · ')}.</p>`:''}${conditions.length?`<p class="empty">Действовали: ${conditions.map(id=>escapeText(Object.hasOwn(CONDITIONS,id)?CONDITIONS[id].name:id)).join(', ')}.</p>`:''}${life&&Number.isFinite(life.wealth)?`<p class="empty">${wealth}: <span class="ref-money">◈ ${life.wealth}</span>${Number.isInteger(inventory)?` · вещей в записи ${inventory}`:''}.</p>`:''}${progress.length?`<p class="empty">За путь: ${progress.join(' · ')}.</p>`:''}${latest.length?`<p class="detail-label">${r?'ПОСЛЕДНИЕ ЗАПИСИ':'СОХРАНИВШИЕСЯ ЗАПИСИ'}</p><ol class="full-log death-chain">${rows(latest)}</ol>`:''}${older.length?`<details class="death-details"><summary>Ещё последние записи · ${older.length}</summary><ol class="full-log">${rows(older)}</ol></details>`:''}${r?.plan?.intent?`<details class="death-details"><summary>Последний план: ${escapeText(r.plan.intent)}</summary><p>${escapeText(r.plan.reason)}</p></details>`:''}${!r?'<p class="empty">Запасы сил и лечебных средств в этой истории не записаны. Подробности — в сохранившемся журнале.</p>':''}</div>`;
}
