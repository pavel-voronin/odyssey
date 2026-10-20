import {spellTextHTML} from './spell-text-sheet.js';
import {scholarHTML} from './scholar-sheet.js';
import {copyOrderHTML} from './text-sheet.js';
import {petKeeperHTML} from './pet-passage-sheet.js';
import {npcPetsHTML} from './pet-custody-sheet.js';
import {NPC_JOBS,NPC_TASKS} from './npc-labels.js';
import {injurySummary} from './modules/injury-state.js';
import {mentorStoryHTML} from './mentor-sheet.js';
import {actorPartyLeader} from './actor-projection.js';
import {knownArea,visitedArea} from './actor-atlas.js';
import {ageLabel,personAge,ageStage} from './modules/age.js';
import {npcDeedsHTML} from './npc-deeds-sheet.js';
import {companionAffairsHTML} from './companion-affairs-sheet.js';
import {materialDeliveriesHTML} from './material-delivery-sheet.js';
import {partyCombatBriefHTML} from './party-combat-sheet.js';
export function npcSheet(s,tab,escape){
 const h=s.hero;if(h.actorMode!=='npc')return null;const p=s.people[h.lineage],task=p.agenda?.task;
 const fact=(label,value)=>`<div class="fact"><span>${escape(label)}</span><b>${escape(String(value))}</b></div>`;
 const position=h.transit?.unknown?'Положение неизвестно':h.transit?`В пути: ${s.areas[h.transit.to].name}`:s.areas[h.personPosition?.area??p.area]?.name||'В пути';
 const job=NPC_JOBS[p.agenda?.job]||p.role||'Житель',intent=p.ropeStranded?'Остался ниже размытого спуска':h.intent||NPC_TASKS[task?.kind]||'Между делами';
 const health=Math.ceil(p.health)+' / '+(p.maxHealth||100);
 if(tab==='hero')return petKeeperHTML(s,p,escape)+`<p class="detail-label">${escape(p.name)} · ${escape(ageLabel(h.life.deathDateKnown===false?null:personAge(s,p)))}</p><p class="empty">${escape(ageStage(p,s.tick))}</p><b>${escape(job)}</b><p class="empty">${escape(position)}</p><p class="detail-label">СЕЙЧАС</p><p>${escape(intent)}</p><p class="empty">${escape(h.reason)}</p>${fact('Здоровье',health)}${fact('Силы',Math.round(p.needs.energy)+' / 100')}${fact('Голод',Math.round(p.needs.hunger)+' / 100')}${fact('В кошельке',p.agenda?.wealth||0)}${fact('Выполнено работ',p.agenda?.work||0)}${fact('Инструменты',p.agenda?.tools||0)}${p.trauma?.marks.length?`<p class="empty">${escape(injurySummary(p))}</p>`:''}${p.ailment?`<p class="empty">Недомогание: ${escape(String(p.ailment))}.</p>`:''}`;
 if(tab==='quests')return `${spellTextHTML(s,escape)}${scholarHTML(s,escape)}${copyOrderHTML(s,escape)}${materialDeliveriesHTML(s,p,escape)}${mentorStoryHTML(p,escape)}${npcDeedsHTML(s,p,escape)}${companionAffairsHTML(s,p,escape)}<p class="detail-label">СОБСТВЕННЫЕ ДЕЛА</p><div class="habit"><b>${escape(intent)}</b><p>${escape(h.reason)}</p>${task?.addressName?`<p>${escape(task.addressName)}</p>`:''}</div>${(p.agenda?.knowledge||[]).slice(-6).reverse().map(e=>`<p class="empty">${escape(e.text)}</p>`).join('')}`;
 if(tab==='bag')return `${fact('Монеты',h.gold)+fact('Резерв на клиентских заказах',Object.values(s.workOrders||{}).filter(c=>c.client===p.id&&c.status==='active').reduce((n,c)=>n+c.escrow,0))}${fact('Закрытые пайки',h.inventory.rations)}${fact('Открытые порции еды',p.roadSupplies?.food||0)}${fact('Лекарственные запасы',p.roadSupplies?.medicine||0)}${fact('Инструменты',p.agenda?.tools||0)}${p.trauma?.marks.length?`<p class="empty">${escape(injurySummary(p))}</p>`:''}<p class="detail-label">ЛИЧНЫЕ ВЕЩИ</p>${[...h.bag,...Object.values(h.equipment).filter(Boolean)].map(item=>`<div class="habit"><b>${escape(item.name)}</b>${(item.history||[]).slice(-3).map(e=>`<p>${escape(e.text)}</p>`).join('')}</div>`).join('')||'<p class="empty">Других записанных вещей нет.</p>'}`;
 if(tab==='ties'){const leader=actorPartyLeader(s,p.id),family=s.migrations?.[p.migration],bonds=Object.entries(p.agenda?.bonds||{});return `${npcPetsHTML(s,p,escape)}${partyCombatBriefHTML(s,p,escape)}${leader?`<p class="detail-label">ПОПУТЧИКИ</p><p>${escape(leader.name)}</p>${leader.companions.filter(c=>c.person!==p.id).map(c=>`<p class="empty">${escape(c.name)}</p>`).join('')}`:family?`<p class="detail-label">СЕМЕЙНОЕ ПЕРЕСЕЛЕНИЕ</p>${family.members.filter(id=>id!==p.id).map(id=>`<p>${escape(s.people[id]?.name||'Родственник')}</p>`).join('')}`:'<p class="empty">Сейчас путешествует самостоятельно.</p>'}<p class="detail-label">ЛИЧНЫЕ СВЯЗИ</p>${bonds.map(([id,value])=>fact(s.people[id]?.name||'Знакомый',value)).join('')||'<p class="empty">Новые связи ещё не записаны.</p>'}`;}
 if(tab==='map')return `<p class="detail-label">${escape(position)}</p><p class="detail-label">ЛИЧНАЯ КАРТА</p>${Object.values(s.areas).filter(a=>knownArea(s,a)).map(a=>`<div class="map-node"><span>${!h.transit&&a.id===h.area?'◆':visitedArea(s,a)?'○':'·'}</span><span>${escape(a.name)}</span></div>`).join('')}`;
 return null;
}

