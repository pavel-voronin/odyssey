import {guardianHTML} from './guardian-sheet.js';
import {delveLayoutHTML} from './delve-layout-sheet.js';
import {waystoneItemHTML} from './waystone-sheet.js';
import {commissionHTML} from './commission-sheet.js';
import {branchPactHTML} from './branch-pact-sheet.js';
import {feastHTML} from './feast-sheet.js';
import {migrationKnowledgeOn} from './modules/migration-memory.js';
import {migrationKnowledgeHTML} from './migration-knowledge-sheet.js';
import {newsHTML} from './news-sheet.js';
import {sequenceHTML} from './sequence-sheet.js';
import {literacyHTML} from './literacy-sheet.js';
import {textHTML} from './text-sheet.js';
import {homeBuildingHTML} from './home-building-sheet.js';
import {homeHTML} from './home-sheet.js';
import {shipRecoveryText} from './modules/ship-recovery-state.js';
import {petPassageHTML,petKeeperHTML} from './pet-passage-sheet.js';
import {petMemoriesHTML} from './pet-custody-sheet.js';
import {packPetHTML} from './pack-pet-sheet.js';
import {clothingHTML} from './clothing-sheet.js';
import {navigationMemoryHTML} from './navigation-memory-sheet.js';
import {navigationToolHTML} from './navigation-tool-sheet.js';
import {spareOutfitHTML} from './spare-outfit-sheet.js';
import {containerHTML} from './container-sheet.js';
import {calendarCaption,calendarSceneCaption,calendarDetailsHTML,refreshCalendarDetails} from './historical-calendar-sheet.js';
import {knownArea,visitedArea} from './actor-atlas.js';
import {verdictKnowledgeHTML} from './verdict-sheet.js';
import {itemCustodyHTML} from './item-custody-sheet.js';
import {localFoodBagHTML,localFoodSourceHTML} from './local-food-sheet.js';
import {mealBagHTML,hearthMealHTML} from './meal-sheet.js';
import {weaponStylesHTML} from './weapon-styles-sheet.js';
import {goodsHTML} from './goods-sheet.js';
import {collectionHTML} from './collection-sheet.js';
import {landmarksHTML} from './landmark-view.js';
import {injurySummary} from './modules/injury-state.js';
import {bestiaryHTML} from './modules/bestiary.js';
import {petTrainingHTML} from './modules/pet-training.js';
import {valueRevisionHTML} from './modules/value-revision.js';
import {fordLabel,fordsHTML} from './ford-view.js';
import {marketKnowledgeHTML} from './market-knowledge-sheet.js';
import {renderProgressionPanel} from './progression-panel.js';
import {skillBranchesHTML,progressionHeader,progressionHeaderTitle} from './skill-branches-sheet.js';
import {forgingHTML} from './forging-sheet.js';
import {knifeRefitHTML} from './knife-refit-sheet.js';
import {itemConditionHTML,itemRepairHTML,itemWorking,itemWorth} from './item-condition-sheet.js';
import {biomaterialHTML,localBodyMaterialsHTML} from './biomaterial-sheet.js';
import {archiveKey,currentLife} from './life-history.js';
import {archiveSheet} from './life-archive-sheet.js';
import {materialCargoHTML} from './material-sheet.js';
import {causalHistoryHTML} from './causal-history-sheet.js';
import {npcSheet} from './npc-sheet.js';
import {companionAffairsBriefHTML} from './companion-affairs-sheet.js';
import {partyCombatBriefHTML} from './party-combat-sheet.js';
import {materialDeliveriesHTML,deliveryCargoHTML} from './material-delivery-sheet.js';
import {materialContracts} from './modules/material-delivery-state.js';
import {knownWorldEvent} from './modules/background-towns.js';
import {convoyView} from './modules/freight-memory.js';
import {drawHeroPortrait,drawArchivePortrait} from './portrait.js';
import {observedAge,personAge,ageLabel} from './modules/age.js';
import {moneyBudget,MONEY_STYLES} from './modules/finances.js';
import {armorDescription} from './modules/armor.js';
import { createWorld, step, serialize, restore,route,knownRoute } from './engine.js';
import { Scene } from './scene.js';
import {calendar,DAY_TICKS,worldDate,dateLabel,dateStamp,elapsedLabel} from './calendar.js';
import { createClock, catchUp, registerInput,hasDue,restartClock } from './clock.js';
import {SAVE_KEY,clockRecord,currentClock,currentTutorial} from './save-schema.js';
import { profession, destiny, habit, CONDITIONS, FACTIONS, STAT_NAMES, ENEMY_POWERS, race, PSYCHOLOGIES, SPELLS,BIOMES,ROUTE_NAMES,ITEM_MODIFIERS } from './content.js';
import { MODULES, BASE_CONTRACTS, enabled, setModule } from './rules.js';
import { ancestry } from './modules/lineage.js';
import { stat } from './modules/common.js';
import { edgeKey } from './modules/travel.js';
import { QUEST_NAMES,questProgress } from './modules/quests.js';
import { STORY_NAMES } from './modules/stories.js';
import { NPC_JOBS,NPC_TASKS } from './modules/people.js';
import { ENCHANTMENT_TEXT } from './modules/enchantments.js';
import {ELEMENTS} from './modules/elements.js';
import {TACTICS} from './modules/tactics.js';
import {MUTATIONS} from './modules/mutations.js';
import {OPPORTUNITIES,opportunity} from './modules/opportunities.js';
import {factionRelation} from './modules/diplomacy.js';
import {createTutorial,tutorialInput,tutorialTick,tutorialText} from './tutorial.js';
import {formatDurations} from './text.js';
import {semanticEvent,semanticCause,lootBrief} from './event-text.js';
import {lootNotice,lootNoticeText,lootEventKey} from './loot-notice.js';
import {deathSheet} from './death-sheet.js';
import {runLifeBatch,lifeFinished,advanceLife} from './playback.js';
import {beginGesture,moveGesture,isTap} from './gestures.js';
import {bindFreshAction,bindFreshChoice} from './fresh-action.js';
import {rememberObservers,observerChoices,observerRequest,commitObserverRequest} from './observer-choice.js';
import {pointInGame,startsInGame} from './input-region.js';
import {lifeTick,createSpeech,visibleSpeech,clearSpeech} from './presentation.js';
import {weatherAt,WEATHERS} from './modules/weather.js';
import {culture} from './modules/cultures.js';
import {activeEffects,resourceViews} from './status.js';
import {heroStance} from './motion.js';
import {sceneCamera,cameraPoint} from './scene-camera.js';
const $ = id => document.getElementById(id);
function eventDate(e,full=false){const a=state.areas[e.area]||{type:'road',continent:'c0',era:0};return full?dateLabel(state,e.tick,a):dateStamp(state,e.tick,a);}
let roadView='map';try{if(localStorage.getItem(SAVE_KEY+'-road-view')==='scene')roadView='scene';}catch{}
const scene = new Scene($('scene'),{onCameraFrame:renderEffects,roadView});
let state, tab = 'hero', saveProblem = '', audioContext, soundEnabled = false, firstVisit=false;
try { const saved = localStorage.getItem(SAVE_KEY);firstVisit=!saved; state = saved ? restore(saved) : createWorld(); }
catch { state = createWorld();firstVisit=true;saveProblem = 'Сохранение повреждено или имеет другой формат. Открыт новый мир.'; }
let savedClock;
try { if(!firstVisit)savedClock=currentClock(JSON.parse(localStorage.getItem(SAVE_KEY+'-clock')),state); } catch {}
const clock = createClock(savedClock?.anchor,savedClock?.idleUntil,savedClock?.stopped);
if(!savedClock)restartClock(clock,Date.now());
const pendingInputs=[];
let fastRun=null,lifeReview=false,logLife=null,pendingNextStory=null;
const speechMemory=createSpeech();
let effectIdentity='';
function renderEffects(){
  $('map-tools').hidden=scene.mode!=='map';
  const root=$('effects'),h=state.hero,key=`${state.seed}/${state.generation}/${h.lineage}/${h.born}`;
  if(effectIdentity!==key){root.replaceChildren();effectIdentity=key;}
  const effects=activeEffects(state),ids=new Set(effects.map(e=>e.id)),world=$('scene');
  const worldTop=world.getBoundingClientRect().top;
  const startY=Math.max(38,document.querySelector('.scene-label').getBoundingClientRect().bottom-worldTop+5);
  const endY=Math.min(world.clientHeight-10,document.querySelector('.scene-bottom').getBoundingClientRect().top-worldTop-4);
  for(const child of [...root.children])if(!ids.has(child.dataset.effect))child.remove();
  for(let i=0;i<effects.length;i++){
    const effect=effects[i];let chip=[...root.children].find(e=>e.dataset.effect===effect.id);
    if(!chip){chip=document.createElement('span');chip.className='effect-icon';chip.dataset.effect=effect.id;chip.setAttribute('role','img');root.append(chip);}
    chip.textContent=effect.icon;chip.dataset.phase=effect.phase;chip.dataset.positive=effect.positive;
    const text=effect.name+'. '+effect.text+(effect.until===null?'':` Осталось ${elapsedLabel(Math.max(0,effect.until-state.tick))}.`);chip.title=text;chip.setAttribute('aria-label',text);
    const activeView=scene.state===state&&scene.area===(h.transit?`travel:${h.transit.from}:${h.transit.to}`:h.area)&&scene.camera?.viewportWidth===world.clientWidth;
    const camera=activeView?scene.camera:sceneCamera(state,h.transit?{id:'transit'}:state.areas[h.area],world.clientWidth);
    const position=h.transit?50:h.x,point=scene.mode==='map'?{x:scene.mapMarker.x+(i-(effects.length-1)/2)*23,y:scene.mapMarker.y-32}:cameraPoint(camera,24+position/100*(camera.worldWidth-48)+heroStance(state).offsetX+(i-(effects.length-1)/2)*23,(activeView?scene.ground:world.clientHeight*.72)-72);
    const x=Math.max(8,Math.min(world.clientWidth-29,point.x));
    const available=Math.max(1,Math.floor((endY-startY+2)/23)),column=Math.floor(i/available),row=i%available;
    chip.style.left=(effect.phase==='fresh'?x:8+column*24)+'px';
    chip.style.top=(effect.phase==='fresh'?Math.max(startY,point.y):startY+row*23)+'px';
  }
}
function fitCaptions(){
  const speech=$('speech');
  const speechMax=parseFloat(getComputedStyle(speech).getPropertyValue('--caption-max-font'))||12;
  for(let size=speechMax;size>=10;size-=.5){speech.style.fontSize=size+'px';if(speech.scrollHeight<=speech.clientHeight)break;}
  const box=$('intent').parentElement;
  const intentMax=parseFloat(getComputedStyle(box).getPropertyValue('--intent-max-font'))||12;
  for(let size=intentMax;size>=10;size-=.5){box.style.setProperty('--intent-font',size+'px');box.style.setProperty('--reason-font',Math.max(10,size-2)+'px');if(box.scrollHeight<=box.clientHeight)break;}
}
function fitGold(){const n=state.hero.gold,small=$('game-shell').clientWidth<300;let value=String(n);if(small&&n>=1000){const divisor=n>=999500?1000000:1000;const amount=n/divisor;value=(amount>=10?Math.floor(amount):Math.round(amount*10)/10)+(divisor===1000?'к':'м');}$('gold').textContent=value;$('gold').title=String(n);}
window.addEventListener('resize',()=>{releaseHold();fitCaptions();renderEffects();});
let holding,holdStart,gesture=null,cancelSuccession=()=>{},tutorialState=createTutorial(firstVisit?1:0);
try{if(!firstVisit){const saved=currentTutorial(JSON.parse(localStorage.getItem(SAVE_KEY+'-onboarding')));if(saved)tutorialState=saved.done?createTutorial(0):saved;}}catch{}
const tutorial=document.createElement('div');tutorial.id='tutorial';tutorial.setAttribute('aria-live','polite');document.querySelector('.time-control').append(tutorial);
function showTutorial(){const text=lifeFinished(state)?'':tutorialText(tutorialState,Date.now());if(tutorial.textContent!==text)tutorial.textContent=text;tutorial.hidden=!text;document.querySelector('.time-control').classList.toggle('onboarding',Boolean(text));}
function saveTutorial(){try{localStorage.setItem(SAVE_KEY+'-onboarding',JSON.stringify(tutorialState));}catch{}}
showTutorial();
if(firstVisit)saveTutorial();
function teach(){
  tutorialInput(tutorialState,Date.now());saveTutorial();showTutorial();
}
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icons = { birth: '•', discover: '↗', quest: '!', reward: '+', combat: '⚔', victory: '×', death: '†', trade: '$', heal: '+', rest: 'z', flee: '↶', loot: '+', world: '!', talk: '»', choice: '?', companion: '&', condition: '!', food: '+', career: '↑', equipment: '+', destiny: '★', treasure: '$' };
const types=Object.fromEntries(Object.entries(BIOMES).map(([id,b])=>[id,b.name]));
types.hall='Общий зал';
types.room='Гостевая комната';
const areaType=a=>a.interior?.kind==='workshop'?'Мастерская':types[a.type];
function lifeName(life=state.hero){return life.actorMode==='npc'?'Житель мира':'Жизнь '+(life.generation??life.actorGeneration??state.generation);}
function detail() {
  const h = state.hero;
  $('sheet').querySelector('h2').textContent=(tab==='rules'?'Центр управления':tab==='log'?'Дневник':'Лист приключения')+' · '+calendarCaption(state);
  if(tab==='skills'){renderProgressionPanel($('detail-panel'),skillBranchesHTML(state,escape),{force:true});return;}
  const npc=npcSheet(state,tab,escape);if(npc!==null){$('detail-panel').innerHTML=(tab==='map'?calendarDetailsHTML(state,escape):'')+npc+(tab==='bag'?containerHTML(state)+materialCargoHTML(state,h,escape):'');return;}
  if (tab === 'hero') {
    const traits = [h.personality.courage > .65 ? 'Смелый' : 'Осторожный', h.personality.curiosity > .65 ? 'Любопытный' : 'Вдумчивый', h.personality.sociability > .65 ? 'Общительный' : 'Немногословный', h.personality.generosity > .6 ? 'Отзывчивый' : 'Практичный'];
    const p = profession(h.profession), d = destiny(h.destiny.id);
    $('detail-panel').innerHTML = `<p class="detail-label">${escape(h.name)} · ${ageLabel(observedAge(h,h.life.ended?currentLife(state)?.ended??state.tick:state.tick))} · ПУТЬ ${elapsedLabel(lifeTick(state))}</p><b>${escape(h.profession==='soldier'?'Воинский путь':p.name)}</b> · мастерство ${h.career.rank}<p class="empty">${escape(h.profession==='soldier'?'Воинская подготовка и стойка ветерана. История профиля показана в разделе «Развитие».':p.story)}</p><div class="stat-grid">${Object.entries(STAT_NAMES).map(([id,name]) => `<div><span>${name}</span><b>${stat(h,id)}</b></div>`).join('')}</div><p class="detail-label">ПРЕДНАЗНАЧЕНИЕ</p><b>${escape(d.name)}</b><p class="empty">${escape(d.text)}</p><div class="fact"><span>${h.destiny.completed ? 'Исполнено' : 'Прогресс'}</span><b>${h.destiny.progress} / ${d.target}</b></div>${h.titles.map(t => `<p class="empty">${escape(t)}</p>`).join('')}<p class="detail-label">ХАРАКТЕР</p><div class="traits">${traits.map(t => `<span>${t}</span>`).join('')}</div><p class="detail-label">ПРИВЫЧКИ</p>${h.smoking?.habit?`<div class="habit"><b>Курит трубку</b><p>В кисете ${h.smoking.tobacco} порций. Трубка успокаивает и мешает восстановлению сил.${h.smoking.affectedUntil>state.tick&&enabled(state,'smoking')&&enabled(state,'body')?' Ещё '+elapsedLabel(h.smoking.affectedUntil-state.tick)+'.':''}</p></div>`:''}${h.habits.map(id => `<div class="habit"><b>${escape(habit(id).name)}</b><p>${escape(habit(id).text)}</p></div>`).join('')}<div class="fact"><span>Голод</span><b>${Math.round(h.hunger)} / 100</b></div><div class="fact"><span>Поступки</span><b>${h.alignment > 15 ? 'Добрые' : h.alignment < -15 ? 'Безжалостные' : 'Неоднозначные'} (${h.alignment})</b></div><p class="detail-label">СОСТОЯНИЯ</p>${h.conditions.length ? h.conditions.map(c => `<div class="habit"><b>${escape(CONDITIONS[c.id].name)}</b><p>${escape(CONDITIONS[c.id].text)} Ещё ${elapsedLabel(Math.max(0,c.until-state.tick))}.</p></div>`).join('') : '<p class="empty">Здоров. Не проклят.</p>'}<div class="fact"><span>Опыт</span><b>${h.xp} / ${h.level * 24}</b></div><div class="fact"><span>Мест в памяти / побед</span><b>${h.memory.places.length} / ${h.kills}</b></div>${h.memory.facts.length ? `<p class="detail-label">ПАМЯТЬ</p><p class="empty">${h.memory.facts.slice(-5).reverse().map(f=>escape(f.text)).join('<br>')}</p>` : ''}`;
  } else if (tab === 'bag') {
    const partView = i => `<div class="loot-row rarity-0"><b>${escape(i.name)}</b><p>Сменная деталь рабочего зажима · цена ◈${i.value}</p><p>Хранится в сумке до установки или продажи.</p><details><summary>История детали</summary>${(i.history||[]).map(e=>`<p>${eventDate(e,true)}: ${escape(formatDurations(e.text,state))}</p>`).join('')||'<p>Происхождение неизвестно.</p>'}</details></div>`;
    const equipmentView = i => i.waystone?waystoneItemHTML(state,i,escape):`<div class="loot-row rarity-${i.rarity}"><b>${escape(i.name)}</b><p>${escape(armorDescription(state,i)||((STAT_NAMES[i.stat] || ({attack:'Удар',magic:'Магия',defense:'Защита'}[i.stat]) || i.stat)+' +'+(itemWorking(i)?i.power:0)))} · ${escape(ITEM_MODIFIERS[i.modifier]||'Неизвестная печать')} · цена ${itemWorth(i)}</p>${itemConditionHTML(i,escape)}<p>${escape(ENCHANTMENT_TEXT[i.modifier]||'Эффект неизвестен.')} ${!itemWorking(i)?'Печать не действует: вещь сломана.':enabled(state,'enchantments')?'Печать действует в снаряжении.':'Дополнительный эффект отключён.'}</p><small>${i.manufacture?'Изготовлен':'Найден'}: ${dateLabel(state,i.manufacture?.finished??i.found,state.areas[i.foundArea]||{type:'road',continent:'c0',era:0})} · применений ${i.enchantment?.uses||0} · отклик ${i.enchantment?.resonance||0} / 3</small><details><summary>История вещи</summary>${(i.history||[]).map(e=>`<p>${eventDate(e,true)}: ${escape(formatDurations(e.text,state))}</p>`).join('')||'<p>Происхождение неизвестно.</p>'}</details></div>`;
    const itemView = i => i.kind==='bioMaterial'?biomaterialHTML(i,escape):equipmentView(i);
    $('detail-panel').innerHTML = `<p class="detail-label">СНАРЯЖЕНИЕ</p><p class="empty">Основной клинок: ${['старый', 'железный', 'стальной', 'мастерский'][h.weapon]}. ${h.armor ? enabled(state,'armor-balance')&&enabled(state,'equipment')&&h.equipment.armor?'Кожаная броня сейчас не добавляет защиты.':'Кожаная броня.' : ''}</p>${Object.values(h.equipment).filter(Boolean).map(itemView).join('') || '<p class="empty">Особых вещей пока нет.</p>'}<p class="detail-label">ПРИПАСЫ</p><div class="inventory"><span class="item">Зелья: ${h.inventory.potions}</span><span class="item">Травы: ${h.inventory.herbs}</span><span class="item">Реликвии: ${h.inventory.relics}</span></div><p class="detail-label">СУМКА · ${h.bag.length} / 24</p>${h.bag.map(i=>i.kind==='workPart'?partView(i):itemView(i)).join('') || '<p class="empty">Пусто.</p>'}`;
    $('detail-panel').insertAdjacentHTML('beforeend',materialCargoHTML(state,h,escape));
  } else if (tab === 'lineage') {
    $('detail-panel').innerHTML=`<p class="detail-label">${escape(h.name)}${h.actorMode==='npc'?'':' '+escape(h.family)} · ${race(h.race).name}</p><p class="empty">${escape(h.origin)}. ${escape(h.appearance.mark)}. ${escape(injurySummary(state.people[h.lineage]))}</p><p class="empty">${escape(race(h.race).ability)}</p><p class="detail-label">РОДОСЛОВНАЯ</p>${ancestry(state,h.lineage).map(p=>`<div class="ancestor" style="padding-left:${p.depth*18}px"><b>${escape(p.name)}</b><span>${escape(race(p.race).name)} · ${p.alive?'жив':'память'}${personAge(state,p)===null?'':' · '+ageLabel(personAge(state,p))}</span></div>`).join('')}<p class="detail-label">ЗНАКОМЫЕ СЕМЬИ</p>${Object.values(state.areas).filter(a=>visitedArea(state,a)&&a.population).map(a=>`<div class="habit"><b>${escape(a.name)}</b><p>${a.population.map(id=>escape(state.people[id]?.name||'Неизвестный житель')).join(', ')}</p></div>`).join('')}`;
  } else if (tab === 'ties') {
    $('detail-panel').innerHTML=`<p class="detail-label">ОТРЯД</p>${h.companions.length?h.companions.map(c=>`<div class="habit"><b>${escape(c.name)}</b><p>${c.role==='person'?escape(c.job):c.role==='pet'?'Питомец':'Волшебный помощник'} · HP ${c.hp} / ${c.maxHp}<br>Верность ${c.loyalty} / 100 · удар +${c.attack} · лечение +${c.healing} · разведка +${c.scouting}${enabled(state,'npc-party-needs')&&enabled(state,'npc-needs')&&c.person&&state.people[c.person]?.needs?`<br>Голод ${Math.ceil(state.people[c.person].needs.hunger)} / 100 · силы ${Math.ceil(state.people[c.person].needs.energy)} / 100${state.people[c.person].needs.sleeping?' · нужен отдых':''}`:''}<br>${escape(c.motive||'Выбрал идти рядом.')}</p>${companionAffairsBriefHTML(state,state.people[c.person],escape)}${c.person?partyCombatBriefHTML(state,state.people[c.person],escape):''}${petTrainingHTML(c)}</div>`).join(''):'<p class="empty">Путешествует один.</p>'}<p class="detail-label">ЗНАКОМЫЕ</p>${Object.entries(h.relations).map(([id,r])=>`<div class="fact"><span>${escape(state.people[id]?.name||'Незнакомец')}${state.people[id]?.alive?'':' †'}</span><b>Доверие ${r.trust}</b></div>`).join('')||'<p class="empty">Пока никого.</p>'}<p class="detail-label">РЕПУТАЦИЯ</p>${FACTIONS.map(f=>`<div class="fact"><span>${escape(f.name)}</span><b>${h.reputation[f.id]>0?'+':''}${h.reputation[f.id]}</b></div>`).join('')}<p class="detail-label">ВЛАСТЬ · ИЗВЕСТНОСТЬ ${h.social.fame}</p>${h.civic.holdings.map(id=>`<div class="fact"><span>${escape(state.areas[id].name)}</span><b>Советник</b></div>`).join('')||'<p class="empty">Нет владений.</p>'}`;
    if(enabled(state,'craft-respect')&&enabled(state,'relationships')){
      const person=state.people[h.lineage],known=Object.entries(person?.craftRelations||{});
      if(known.length)$('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ЗНАКОМОЕ МАСТЕРСТВО</p>${known.map(([id,r])=>`<div class="habit"><b>${escape(state.people[id]?.name||'Незнакомец')}</b><p>Уважение к ремеслу ${r.respect} / 100 · личное доверие ${h.actorMode==='npc'?(person.agenda.bonds?.[id]??'неизвестно'):(h.relations[id]?.trust??'неизвестно')}</p><p>${r.lastWork?'Лично видел завершённую работу.':''}${r.lastPromise?' Принятое обещание просрочено.':''}</p></div>`).join('')}`);
    }
  } else if (tab === 'rules') {
    $('detail-panel').innerHTML = `<p class="empty">Переключатели меняют правила мира без тика. Накопленные данные сохраняются. Основные контракты времени, состояния и геометрии действуют всегда.</p>${MODULES.map(m=>`<section class="module-row"><div><b>${escape(m.name)}</b><button data-module="${m.id}" aria-pressed="${enabled(state,m.id)}">${enabled(state,m.id) ? 'Вкл.' : 'Выкл.'}</button></div><p>${escape(m.description)}</p><details><summary>${escape(m.contract)}</summary><p>Точки взаимодействия: ${m.hooks.map(escape).join(', ')}.</p><p>Владеет: ${m.owns.map(escape).join(', ')}.</p><p>Читает: ${m.reads.map(escape).join(', ')}.</p></details></section>`).join('')}<p class="detail-label">БАЗОВЫЕ КОНТРАКТЫ</p>${Object.entries(BASE_CONTRACTS).map(([id,text])=>`<div class="habit"><b>${escape(id)}</b><p>${escape(text)}</p></div>`).join('')}`;
  } else if (tab === 'quests') {
    $('detail-panel').innerHTML = h.quests.length ? h.quests.map(q => {
      const done = q.status === 'done';
      const progress=questProgress(state,q);
      return `<div class="quest ${done?'done':''}"><b>${escape(q.title||QUEST_NAMES[q.kind]||'Обещание')}</b><p>${escape(state.areas[q.source]?.name||'Неизвестно')} → ${escape(state.areas[q.target]?.name||'Неизвестно')}</p><p>${escape(q.cause||'Помочь жителям.')}</p><span>${done?'✓ Выполнено':['failed','abandoned'].includes(q.status)?escape(q.failure||'История оборвалась'):`Прогресс ${progress} / ${q.required||1}`} · ${q.reward} зол.${q.deadline&&q.status==='active'?' · осталось '+elapsedLabel(Math.max(0,q.deadline-state.tick)):''}</span></div>`;
    }).reverse().join('') : materialContracts(state,h.lineage).length?'<p class="empty">Других принятых обещаний пока нет.</p>':'<p class="empty">Пока нет обещаний. Знакомства и нужды жителей подскажут герою, за что взяться.</p>';
  } else if (tab === 'archive') {
    $('detail-panel').innerHTML=archiveSheet(state,escape,lifeName,eventDate);
    for(const canvas of $('detail-panel').querySelectorAll('[data-life-portrait]')){const life=state.lives.find(l=>archiveKey(l)===canvas.dataset.lifePortrait);if(life)drawArchivePortrait(canvas,life);}
  } else if (tab === 'log') {
    const life=logLife&&state.lives.find(l=>archiveKey(l)===logLife),events=life?(life.timeline||life.milestones):(state.hero.timeline||state.journal.slice().reverse());
    $('detail-panel').innerHTML = `<p class="empty">${lifeName(life||state.hero)} · ${events.length} записей${events[0]?.tick>(life?.born??state.hero.born)?' · начало журнала не сохранилось':''}. ${life&&!life.timeline?'Полный журнал раньше не сохранялся; здесь значимые события.':'Журнал ограничен последними 2000 событиями.'}</p><ol class="full-log">${events.slice().reverse().map(e => `<li><time>${eventDate(e,true)}</time>${semanticEvent(state,e,{details:true})}</li>`).join('')}</ol>`;
  } else {
    const areas = Object.values(state.areas).filter(a => knownArea(state,a));
    const area=state.areas[h.area];
    $('detail-panel').innerHTML=calendarDetailsHTML(state,escape)+`<p class="detail-label">${escape(state.continents[area.continent].name)} · ${worldDate(state,state.tick,area).year} ГОД</p><p class="empty">${area.realm==='underground'?'Подземный мир':area.realm==='dream'?'Сновидение':area.realm==='clockwork'?'Мир механизмов':'Поверхность'}</p><p class="detail-label">МАРШРУТЫ ИЗ ТЕКУЩЕГО МЕСТА</p>${area.links.map(id=>{const edge=state.edges[edgeKey(area.id,id)];return `<div class="habit"><b>${escape(state.areas[id].name)}</b><p>${ROUTE_NAMES[edge?.mode||'road']} · ${elapsedLabel(edge?.duration||0)} в пути ${edge?.cost?'· плата '+edge.cost+' зол.':''}</p></div>`}).join('')}<div class="fact"><span>Рейсы / порталы / эпохи</span><b>${h.travel.voyages} / ${h.travel.portals} / ${h.travel.epochs}</b></div><p class="detail-label">ИЗВЕСТНЫЕ МЕСТА · ${areas.length}</p>${areas.map(a=>`<div class="map-node ${a.id===h.area?'current':''}"><span>${a.id===h.area?'◆':visitedArea(state,a)?'○':'·'}</span><span>${escape(a.name)}</span><small>${visitedArea(state,a)?areaType(a):'?'}</small></div>`).join('')}${state.chronology.echoes.length?`<p class="detail-label">СЛЕДСТВИЯ ВРЕМЕНИ</p><p class="empty">${state.chronology.echoes.slice(-5).map(e=>escape(e.text)).join('<br>')}</p>`:''}${state.graves.length?`<p class="detail-label">ПРОШЛЫЕ ЖИЗНИ</p>${state.graves.slice(-5).reverse().map(g=>`<div class="fact"><span>† ${escape(g.name)}, ур. ${g.level}</span><b>${elapsedLabel(g.tick-g.born)}</b></div>`).join('')}`:''}${state.changes.some(e=>knownWorldEvent(state,e))?`<p class="detail-label">ПОСЛЕДСТВИЯ</p><p class="empty">${state.changes.filter(e=>knownWorldEvent(state,e)).slice(-4).reverse().map(c=>escape(c.text)).join('<br>')}</p>`:''}`;
  }
}
function enrichSheet(){
  if(tab==='hero'&&enabled(state,'principles')){
    const principle=state.hero.principles?.verifyGuilt;
    if(principle)$('detail-panel').insertAdjacentHTML('afterbegin',`<div class="habit"><b>Личный принцип · проверить чужую вину</b><p>${principle.status==='adopted'?'Принят. При возможности ищет вторую известную улику.':principle.status==='rejected'?'Не принят. Прежний взгляд сохранился.':'Обдумывает пережитое: осталось '+principle.remaining+' действий.'}</p><p>${escape(principle.sources.at(-1)?.name||'Обвинённый')}: ${principle.sources.at(-1)?.kind==='report'?'свидетель сообщил сведения против приговора; пересказ требует проверки.':'лично узнанное основание пересмотреть приговор.'}</p></div>`);
  }
  if(tab==='hero'||tab==='log'&&!logLife)$('detail-panel').insertAdjacentHTML('afterbegin',causalHistoryHTML(state,escape,e=>eventDate(e,true)));
  if(tab==='hero')$('detail-panel').insertAdjacentHTML('beforeend',valueRevisionHTML(state,escape,e=>eventDate(e,true)));
  if(tab==='hero'&&enabled(state,'craft-practice')&&!(enabled(state,'skill-branches')&&enabled(state,'identity'))){
    const practice=state.people[state.hero.lineage]?.skillPractice?.craft;
    if(practice)$('detail-panel').insertAdjacentHTML('afterbegin',`<div class="habit"><b>Ремесленная практика · ${practice.total} настоящих восстановлений</b><p>${practice.method?'Освоено: подгонка рабочей детали. Материальный ремонт требует два рабочих действия вместо трёх.':practice.study?'Учёба: осталось '+practice.study.remaining+' действий.':practice.total>=3?'Опыт позволяет изучить приём у доступного верстака. Герой сам решит, когда учиться.':'До самостоятельного изучения приёма нужны три разных завершённых восстановления.'}</p></div>`);
  }
  if(tab==='map')$('detail-panel').insertAdjacentHTML('afterbegin',goodsHTML(state,escape)+marketKnowledgeHTML(state,escape)+landmarksHTML(state,escape)+fordsHTML(state,escape));
  if(tab==='map')$('detail-panel').insertAdjacentHTML('beforeend',bestiaryHTML(state,escape));
  if(tab==='hero')$('detail-panel').insertAdjacentHTML('beforeend','<p class="empty">Уровень, мастерство и независимые приёмы — в разделе «Развитие».</p>');
  if(tab==='hero')$('detail-panel').insertAdjacentHTML('beforeend',forgingHTML(state,escape));
  if(tab==='hero')$('detail-panel').insertAdjacentHTML('beforeend',knifeRefitHTML(state,escape));
  if(tab==='hero')$('detail-panel').insertAdjacentHTML('beforeend',itemRepairHTML(state,escape));
  if(tab==='bag')$('detail-panel').insertAdjacentHTML('beforeend',`<div id="delivery-cargo-live">${deliveryCargoHTML(state,state.people[state.hero.lineage],escape)}</div>`+localBodyMaterialsHTML(state,escape));
  if(tab==='quests'&&state.hero.actorMode!=='npc')$('detail-panel').insertAdjacentHTML('afterbegin',materialDeliveriesHTML(state,state.people[state.hero.lineage],escape));
  if(tab==='ties')$('detail-panel').insertAdjacentHTML('beforeend',petMemoriesHTML(state,escape)+petPassageHTML(state,escape));
  if(tab==='hero'||tab==='bag')$('detail-panel').insertAdjacentHTML('beforeend',petPassageHTML(state,escape)+packPetHTML(state,escape)+clothingHTML(state,escape)+navigationMemoryHTML(state,escape)+navigationToolHTML(state,escape)+spareOutfitHTML(state,escape)+weaponStylesHTML(state,escape)+collectionHTML(state,escape));
  if(state.hero.actorMode==='npc')return;
  if(tab==='bag')$('detail-panel').insertAdjacentHTML('afterbegin',containerHTML(state)+localFoodBagHTML(state,escape));
  if(tab==='bag')$('detail-panel').insertAdjacentHTML('afterbegin',mealBagHTML(state,escape));
  if(tab==='bag')$('detail-panel').insertAdjacentHTML('afterbegin',itemCustodyHTML(state,escape));
  if(tab==='quests'){
    const orders=Object.values(state.workOrders||{}).filter(c=>c.helper===state.hero.lineage&&c.quoted!==undefined).slice(-8).reverse(),names={quoted:'Предложен',active:'В работе',done:'Завершён',declined:'Отказ',cancelled:'Прекращён'};
    if(orders.length)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">КЛИЕНТСКИЕ ЗАКАЗЫ</p>${orders.map(c=>`<div class="quest ${c.status==='done'?'done':''}"><b>${escape(names[c.status]||c.status)} · ${escape(state.people[c.client]?.name||'Заказчик')}</b><p>${escape(state.areas[c.area]?.name||'Мастерская')} · работа: ◈${c.fee}${c.status==='active'?' · резерв клиента: ◈'+c.escrow:''}</p><p>${escape(c.reason||(c.status==='active'?'Материалы оплачивает владелец. Мастерская останется его собственностью.':c.status==='done'?'Работа принята и оплачена.':'Предложение и условия сохраняются в памяти.'))}</p></div>`).join('')}`);
  }
  if(tab==='hero'&&state.hero.counters.customerWork)$('detail-panel').insertAdjacentHTML('afterbegin',`<div class="fact"><span>Выполнено клиентских заказов</span><b>${state.hero.counters.customerWork}</b></div>`);
  if(tab==='bag'){
    const aid=Object.values(state.areas).flatMap(a=>a.objects.filter(o=>o.kind==='workshop'&&o.aid?.payer===state.hero.lineage&&['requested','agreed'].includes(o.aid.status)).map(o=>({a,c:o.aid})));
    if(aid.length)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">МАСТЕРСКАЯ ДЛЯ ДРУГОГО</p>${aid.map(({a,c})=>`<div class="habit"><b>${escape(state.people[c.recipient]?.name||'Ремесленник')} · ${escape(a.name)}</b><p>Согласен получить помещение за ◈${c.price}. ${c.status==='requested'?'Герой ещё решает, оплачивать ли покупку.':'Герой согласился помочь; расчёт с продавцом ещё не состоялся.'}${enabled(state,'property-aid')?'':' Договорённость приостановлена.'}</p></div>`).join('')}`);
    const gifts=Object.values(state.areas).flatMap(a=>a.objects.filter(o=>o.kind==='workshop'&&o.gift?.status==='offered'&&o.gift.to===state.hero.lineage).map(o=>({a,o})));
    if(gifts.length)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ПРЕДЛОЖЕННАЯ МАСТЕРСКАЯ</p>${gifts.map(({a,o})=>`<div class="habit"><b>${escape(a.name)}</b><p>${escape(state.people[o.gift.from]?.name||'Прежний хозяин')} предлагает оставить помещение герою перед отъездом. Ответ ещё не дан.${enabled(state,'property-gifts')?'':' Передача приостановлена.'}</p></div>`).join('')}`);
    const deals=Object.values(state.propertyContracts||{}).filter(c=>c.buyer===state.hero.lineage&&!['cancelled','done','settled'].includes(c.status));
    const names={active:'Ремонт по договору',performed:'Ремонт закончен, нужна приёмка',credited:'Ремонт принят, осталась доплата',claim:'Незавершённый расчёт'};
    if(deals.length)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ДОГОВОРЫ НА МАСТЕРСКУЮ</p>${deals.map(c=>`<div class="habit"><b>${escape(names[c.status]||c.status)}</b><p>${escape(state.people[c.seller]?.name||'Прежний владелец')} · ${escape(state.areas[c.area]?.name||'Прежний адрес')}. ${c.status==='claim'?`Осталось требование ◈${Math.max(0,c.claimAmount-c.paidClaim)}. Оно сохраняется без передачи помещения.`:`Цена ◈${c.price}; зачёт ${c.accepted?'принят':'обещан'} ◈${c.creditValue}; доплата ◈${c.price-c.creditValue}. ${enabled(state,'property-contracts')?`До срока: ${Math.max(0,Math.ceil((c.deadline-state.tick)/DAY_TICKS))} дн.`:'Исполнение приостановлено.'}`}</p></div>`).join('')}`);
  }
  if(tab==='bag'&&(Object.keys(state.hero.property?.known||{}).length||Object.keys(state.hero.property?.lost||{}).length)){
    $('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">МАСТЕРСКИЕ И ПРАВА</p>${Object.entries(state.hero.property.known).map(([id,k])=>{
      const o=state.areas[k.area]?.objects.find(o=>o.id===id),own=o?.owner===state.hero.lineage;
      const toolBroken=enabled(state,'workshop-tools')&&state.hero.workToolMemory?.known[id]?.state==='broken';
      return `<div class="habit"><b>${escape(k.name)} · ${escape(state.areas[k.area]?.name||'Прежний адрес')}</b><p>${own?(k.state==='burned'?'Собственность героя. При последнем осмотре непригодна для работы; право сохраняется.':toolBroken?'Собственность героя. Помещение цело, но рабочий зажим сломан; работа на нём остановлена.':'Собственность героя. При последнем осмотре мастерская исправна; аренда своего места не нужна.'):`Известный владелец: ${escape(state.people[k.owner]?.name||'Неизвестен')}.${k.price===null?' Продажа не предлагалась.':` Предложенная цена: ◈${k.price}.`}${toolBroken?' При последнем осмотре зажим был сломан.':''}`}</p></div>`;
    }).join('')}${Object.values(state.hero.property.lost||{}).map(k=>`<div class="habit"><b>${escape(k.name)}</b><p>Адрес потерян. Право сохраняется.</p></div>`).join('')}`);
  }
  if((tab==='hero'||tab==='bag')&&state.hero.sketchbook?.interest){
    const b=state.hero.sketchbook;
    $('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ДОРОЖНЫЙ БЛОКНОТ</p><p class="empty">Любит рисовать · листов ${b.paper} · практика ${b.practice}${b.pending?' · рисунок не закончен':''}.</p>${Object.values(b.works).slice(-3).reverse().map(w=>`<div class="habit"><b>${escape(w.name)}</b><p>${dateLabel(state,w.tick,state.areas[w.area])} · зарисовка, качество ${w.quality}.</p></div>`).join('')}`);
  }
  if(tab==='ties'&&state.hero.campLife?.history.length){
    $('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">У КОСТРА</p>${state.hero.campLife.history.slice(-3).reverse().map(e=>`<div class="habit"><b>${escape(state.people[e.person]?.name||'Попутчик')}</b><p>${eventDate(e,true)} · спасение ${escape(state.people[e.rescued]?.name||'путника')}. ${({thanks:'Благодарность',caution:'Разногласие',quiet:'Не захотел обсуждать'})[e.outcome]}.${e.delta?' Доверие '+(e.delta>0?'+':'')+e.delta+'.':''}</p></div>`).join('')}`);
  }
  if(tab==='hero'||tab==='lineage')$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">КУЛЬТУРА · ${escape(culture(state.hero.culture).name)}</p><p class="empty">${escape(culture(state.hero.culture).style)}.</p>`);
  if(tab==='map'){
    const a=state.areas[state.hero.area];
    const groups=[...new Set((a.population||[]).map(id=>state.people[id]?.culture).filter(Boolean))];
    $('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">КУЛЬТУРЫ МЕСТА</p><p class="empty">Местная традиция: ${escape(culture(a.culture).name)}. Среди жителей: ${groups.map(id=>escape(culture(id).name)).join(', ')||'пока неизвестно'}.</p>`);
  }
  if(tab==='hero'||tab==='map'){
    const h=state.hero,w=weatherAt(state,state.areas[h.area]);
    $('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ПОГОДА · ${escape(w.icon+' '+w.name)}</p><p class="empty">${escape(w.text)}</p><p class="empty">Нравится: ${escape((WEATHERS[h.weatherTaste.likes]?.name||h.weatherTaste.likes))}. Не нравится: ${escape((WEATHERS[h.weatherTaste.dislikes]?.name||h.weatherTaste.dislikes))}.</p><details><summary>Погодные условия</summary>${Object.values(WEATHERS).map(v=>`<p>${escape(v.icon+' '+v.name)}: ${escape(v.text)}</p>`).join('')}</details>`);
    if(enabled(state,'finances')){const b=moneyBudget(state,{route,knownRoute});$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ДЕНЬГИ · ${escape(MONEY_STYLES[b.style]||b.style)}</p><p class="empty">В кошельке ${h.gold}. Из них резерв на известные нужды: ${b.reserve}.${b.targetAvailable?' Намеченное оружие: '+b.targetCost+', ещё нужно заработать '+b.targetNeed+'.':''}</p>`);}
    {const p=state.people[h.lineage],r=p.tradeBook?.history.at(-1),trip=h.merchantTrip;if(trip||r)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">СВОЙ ТОРГОВЫЙ ГРУЗ</p><p class="empty">Инструментов в сумке: ${p.marketCargo?.tools||0}. ${trip?'Куплено за ◈'+trip.cost+', провиант ◈'+trip.foodCost+'. Ожидаемая ранее выручка ◈'+trip.expected+' может измениться.':''}${r?'Последняя продажа: '+r.sold+' за ◈'+r.revenue+'; денежный итог ◈'+r.net+', непроданных '+r.remaining+'.':''}</p>`);}
    {const q=state.people[h.lineage].provisionCredit;if(q)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ПРИПАСЫ ЗА РАБОТУ</p><p class="empty">${escape(state.people[q.supplier]?.name||'Поставщик')}: ${escape({requested:'ждёт ответа',offered:'получены условия',accepted:'обязательство принято',working:'отрабатывает',fulfilled:'исполнено',refused:'условия не приняты',failed:'работа не получена'}[q.status])}. ${q.quantity?`Выдано ${q.quantity} порц.; действий ${q.task?.goodsWork?.spent||0} / ${q.required}. Срок: ${escape(eventDate({tick:q.deadline,area:q.area},true))}.`:''}${q.reason?escape(q.reason):''}</p>`);}
    if(h.innerLife?.facets.length){$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ВНУТРЕННИЕ СТОРОНЫ</p><p class="empty">${escape(h.innerLife.facets.map(f=>f.name).join(' · '))}</p>${(h.innerLife.assistance||[]).slice(-1).map(v=>`<p class="empty">${escape(v.dialogue)}</p>`).join('')}${h.innerLife.history.slice(-2).map(v=>`<p class="empty">${escape(v.text)}</p>`).join('')||'<p class="empty">Пока не было выбора, в котором им стоило спорить.</p>'}`);}
    if(h.commitments?.personal){const p=h.commitments.personal,cause=h.commitments.memories.find(m=>m.id===p.cause);$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ЛИЧНОЕ ДЕЛО</p><p class="empty">Более надёжное оружие · ${escape(({active:'в планах',done:'достигнуто',abandoned:'оставлено'})[p.status]||p.status)}.</p><p class="empty">${escape(cause?.cause||'Прежнее отступление заставило пересмотреть подготовку.')}</p>`);}
    if(h.planning.last){const p=h.planning.last;$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ОЦЕНКА СЛЕДУЮЩЕГО ДЕЛА</p><p class="empty">Путь: около ${elapsedLabel(p.ticks)}. Силы: ${p.energyCost}, с резервом ${p.energy}. Здоровье: ${p.health}. Мана: ${p.mana}.${p.prepared?' Выбран предварительный отдых.':''}</p>`);}
  }
  if(tab==='map'){const a=state.areas[state.hero.area],departures=(a.exodus?.departures||[]).map(id=>state.migrations[id]).filter(g=>g&&(!migrationKnowledgeOn(state)&&!g.knowledge&&!g.contactMemory||g.contactMemory?.contacts[state.hero.lineage]));if(departures.length)$('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">СЛЕДЫ ПЕРЕСЕЛЕНИЙ</p>${departures.slice(-4).map(g=>`<details><summary>${escape(g.members.map(id=>state.people[id]?.name||id).join(', '))}</summary><p>Покинули место: ${escape(g.reason)}. Намеревались добраться до ${escape(state.areas[g.initialTarget||g.target]?.name||'другого города')}.</p></details>`).join('')}`);}
  if(tab==='bag')$('detail-panel').insertAdjacentHTML('afterbegin',`<div class="fact"><span>Дорожные пайки / добыча еды</span><b>${state.hero.inventory.rations} / ${state.hero.counters.forage}</b></div><div class="fact"><span>Открытые порции еды</span><b>${state.people[state.hero.lineage]?.roadSupplies?.food||0}</b></div>`);
  if(tab==='quests'){
    const cases=state.storyCases.filter(c=>c.owner===state.hero.lineage);
    const knownVerdicts=cases.map(c=>verdictKnowledgeHTML(state,c,escape,eventDate)).join('');
    if(knownVerdicts)$('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ПРОВЕРКА ПРЕЖНИХ ПРИГОВОРОВ</p>${knownVerdicts}`);
    $('detail-panel').insertAdjacentHTML('beforeend',homeHTML(state,escape)+homeBuildingHTML(state,escape)+textHTML(state,escape)+literacyHTML(state,escape)+sequenceHTML(state,escape)+newsHTML(state,escape)+migrationKnowledgeHTML(state,escape)+feastHTML(state,escape)+branchPactHTML(state,escape)+delveLayoutHTML(state,escape)+guardianHTML(state,escape));
    $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ДОЛГИЕ ИСТОРИИ</p>${cases.map(c=>`<details class="habit"><summary>${escape(STORY_NAMES[c.kind])} · ${escape(({active:'Продолжается',done:'Завершена',failed:'Не удалось',declined:'Отказался',abandoned:'Оставлена'})[c.status])}</summary><p>${escape(c.summary||({opening:'Необычное предложение',owed:'Долг: '+c.debt+' зол. к '+dateLabel(state,c.due),collection:'Долг пришёл за героем',evidence:'Сбор улик',trial:'Разбирательство',investigate:'Исследование'})[c.stage]||c.stage)}</p>${c.shipRecovery?`<p>${escape(shipRecoveryText(c))}</p>`:''}${c.choices.map(e=>`<p>${eventDate(e,true)} · ${escape(e.text)}</p>`).join('')}${c.effects.map(e=>`<p>${eventDate(e,true)} · ${escape(e.text)}</p>`).join('')}</details>`).join('')||'<p class="empty">Новые встречи ещё могут изменить эту жизнь.</p>'}`);
  }
  if(tab==='map'){
    const enemies=state.areas[state.hero.area].objects.filter(e=>e.kind==='enemy'&&e.alive&&!e.resolved);
    $('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ПРОТИВНИКИ НА ЛИНИИ</p>${enemies.map(e=>`<details class="habit"><summary>${escape(e.name)} · ${e.hp}/${e.maxHp}</summary><p>${escape(ELEMENTS[e.element]?.name||'Неизвестная природа')} · ${escape(TACTICS[e.tactic]?.name||'Прямой натиск')} · ${escape(MUTATIONS[e.mutation]?.name||'Без мутации')}</p><p>${escape(enabled(state,'tactics')?TACTICS[e.tactic]?.text||'':'Тактика отключена.')}${e.tactic==='charged'&&enabled(state,'tactics')&&e.battle?.intent==='strike'?' Следующий ответ: подготовленный удар.':''}</p><p>${escape(enabled(state,'mutations')?MUTATIONS[e.mutation]?.text||'':'Мутации отключены.')}</p><p>${Object.entries(state.hero.memory.threats[e.id]?.rates||{}).map(([type,rate])=>`${escape(({physical:'Оружие',fire:'Огонь',nature:'Природа',time:'Время',arcane:'Чары'})[type]||type)}: ×${escape(rate)}`).join(' · ')||'Сопротивления ещё не проверены.'}</p></details>`).join('')||'<p class="empty">Рядом нет незавершённой угрозы.</p>'}`);
    const travellers=state.hero.transit?[]:state.society.journeys.filter(j=>j.journeyVersion&&state.people[j.person]?.alive&&state.people[j.person].status==='travelling'&&state.people[j.person].area===state.hero.area);
    if(travellers.length)$('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ПУТНИКИ РЯДОМ</p>${travellers.map(j=>{const p=state.people[j.person];return `<div class="habit"><b>${escape(p.name)}</b><p>${j.returning?'Возвращается по пройденной дороге':'Идёт в '+escape(j.targetName)}. ${escape(j.reason)}</p><p>Здоровье ${p.health} / ${p.maxHealth||100}</p></div>`;}).join('')}`);
    const inhabitants=(state.areas[state.hero.area].population||[]).map(id=>state.people[id]).filter(p=>p?.alive&&p.area===state.hero.area&&p.agenda);
    const guards=state.hero.transit||!enabled(state,'npc-watch-needs')?[]:state.society.orders.filter(o=>state.people[o.person]?.alive&&state.people[o.person].area===state.hero.area&&!state.hero.companions.some(c=>c.person===o.person));
    if(guards.length)$('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">СТРАЖА РЯДОМ</p>${guards.map(o=>{const p=state.people[o.person];return `<div class="habit"><b>${escape(p.name)}</b><p>${escape(({marching:'Идёт на поручение',fighting:'Держит дорогу',returning:'Возвращается'})[o.stage]||'На поручении')}${enabled(state,'npc-needs')&&p.needs?.sleeping?' · ночлег':''}</p><p>Здоровье ${p.health} / ${p.maxHealth||100}${enabled(state,'npc-needs')?` · силы ${Math.round(p.needs?.energy??100)} · голод ${Math.round(p.needs?.hunger??0)}`:''}</p><p>Паёк ${p.roadSupplies?.food||0} · лекарства ${p.roadSupplies?.medicine||0}</p></div>`;}).join('')}`);
    $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ЛИЧНЫЕ ПЛАНЫ ЖИТЕЛЕЙ</p>${inhabitants.map(p=>`<details class="habit"><summary>${escape(p.name)} · ${escape(NPC_JOBS[p.agenda.job])}</summary><p>${escape(NPC_TASKS[p.agenda.task?.kind]||'Между делами')}${p.agenda.task?' · '+escape(p.agenda.task.addressName||state.areas[p.agenda.task.target].name):''}</p>${p.agenda.task?.knownNavigation&&Number.isFinite(p.agenda.task.workSeen)?"<p>При последнем визите здесь платили.</p>":""}${p.agenda.task?.contactMemory?"<p>Идёт по последнему известному адресу родных.</p>":""}<p>Работ ${p.agenda.work} · накопления ${p.agenda.wealth} · посещений родных ${p.agenda.visits}</p>${p.agenda.knowledge.slice(-3).map(n=>`<p>${eventDate(n,true)}: ${escape(n.text)}</p>`).join('')}</details>`).join('')||'<p class="empty">Сейчас рядом нет жителей с личными планами.</p>'}`);
    const forage=state.areas[state.hero.area].forage;
    const cityRoot=state.areas[state.areas[state.hero.area].city];
    if(cityRoot)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">РАЙОНЫ ${escape(cityRoot.name)}</p>${cityRoot.districts.map(id=>`<p class="empty">${escape(state.areas[id].district)} · ${(state.areas[id].population||[]).filter(p=>state.people[p]?.alive).length} жителей</p>`).join('')}`);
    $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ПОТРЕБНОСТИ ЖИТЕЛЕЙ</p>${inhabitants.filter(p=>p.needs).map(p=>`<p class="empty">${escape(p.role)} ${escape(p.name)}: голод ${Math.round(p.needs.hunger)}, силы ${Math.round(p.needs.energy)}, разговоров ${p.needs.conversations}${p.needs.sleeping?' · спит':''}</p>`).join('')}`);
    const localSource=localFoodSourceHTML(state,escape);
    $('detail-panel').insertAdjacentHTML('beforeend',hearthMealHTML(state,escape));
    if(localSource)$('detail-panel').insertAdjacentHTML('beforeend',localSource);
    else if(forage?.max)$('detail-panel').insertAdjacentHTML('beforeend',`<div class="fact"><span>${escape(forage.kind)}</span><b>${forage.stock} / ${forage.max}</b></div>`);
    const freightViews=state.logistics.convoys.map(c=>({c,view:convoyView(state,c)})).filter(e=>e.view);
    const freightHistory=state.logistics.history.filter(e=>knownWorldEvent(state,e)),freightNews=(state.logistics.events||[]).filter(e=>knownWorldEvent(state,e));
    $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">СНАБЖЕНИЕ</p><p class="empty">В известных записях: доставок ${freightHistory.filter(e=>e.outcome==='delivered').length} · утрат ${freightHistory.filter(e=>['captured','robbed','stranded'].includes(e.outcome)).length}. Известных рейсов в пути ${freightViews.length}.</p>${freightViews.map(({c,view})=>`<p class="empty">${escape(state.people[c.person]?.name||'Перевозчик')}: ${escape(c.sourceName||state.areas[c.source].name)} → ${escape(c.targetName||state.areas[c.to].name)}. ${view.here?'Рядом':view.timed?'Сводка рейса':'Последний раз виден: '+escape(eventDate({tick:view.tick,area:view.area},true))} · ${escape(state.areas[view.area]?.name||'неизвестное место')}. Еда ${view.food}, медицина ${view.medicine}${view.tools?`, инструменты ${view.tools}`:''}.</p>`).join('')}${freightNews.slice(0,6).map(e=>`<p class="empty">${escape(eventDate(e,true))}: ${semanticEvent(state,e)}</p>`).join('')}`);
    $('detail-panel').insertAdjacentHTML('beforeend',commissionHTML(state,escape));
    const a=state.areas[state.hero.area],c=a.civic;
    if(c)$('detail-panel').insertAdjacentHTML('afterbegin',`<p class="detail-label">ПОСЕЛЕНИЕ · БЛАГОПОЛУЧИЕ ${a.prosperity} / 100</p><div class="fact"><span>Еда / медицина / безопасность</span><b>${c.food} / ${c.medicine} / ${c.safety}</b></div><div class="fact"><span>Подать</span><b>${c.tax}%</b></div><div class="fact"><span>Совет</span><b>${escape(state.people[c.ruler]?.name||'Местные жители')}</b></div><p class="empty">${c.crisis?escape(({hunger:'Нехватка еды',epidemic:'Лихорадка',raid:'Нападения на дороге'})[c.crisis.kind]||c.crisis.kind):'Острой нужды сейчас нет.'}</p><p class="detail-label">ЖИТЕЛИ</p>${(a.population||[]).map(id=>state.people[id]).filter(p=>p?.alive&&p.area===a.id).map(p=>`<div class="habit"><b>${escape(p.name)} · ${escape(race(p.race).name)}</b><p>${escape(p.role)} · здоровье ${p.health} / ${p.maxHealth||100}${p.ailment?' · болеет':''}</p></div>`).join('')||'<p class="empty">Знакомые жители уехали.</p>'}`);
    $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">СОБЫТИЯ И ПУТНИКИ</p>${state.society.events.filter(e=>knownWorldEvent(state,e)).slice(0,12).map(e=>`<div class="habit"><b>${dateLabel(state,e.tick,state.areas[e.area])}</b><p>${escape(e.text)}</p></div>`).join('')||'<p class="empty">Нет известных событий.</p>'}${state.society.orders.some(o=>!o.commission)?'<p class="detail-label">ПРИКАЗЫ СТРАЖАМ</p>'+state.society.orders.filter(o=>!o.commission).map(o=>`<div class="habit"><b>${escape(state.people[o.person]?.name||'Страж')}</b><p>${escape(state.areas[o.from].name)} → ${escape(state.areas[o.to].name)} · ${({marching:'в пути',fighting:'бой',returning:'возвращается'})[o.stage]}</p></div>`).join(''):''}`);
    return;
  }
  if(tab==='bag'&&Object.keys(state.hero.questCargo||{}).length)$('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ГРУЗ ПОРУЧЕНИЙ</p>${Object.values(state.hero.questCargo).map(text=>`<p class="empty">${escape(text)}</p>`).join('')}`);
  if(tab==='ties'){
    const c=state.hero.affiliation;
    $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ФРАКЦИОННАЯ СЛУЖБА</p>${Object.entries(c.paths).map(([id,p])=>`<div class="habit"><b>${escape(FACTIONS.find(f=>f.id===id)?.name||id)}</b><p>${escape(p.branchName)} · ступень ${p.rank}${c.primary===id?' · основная служба':''}${p.suspended?' · приостановлена':''}</p><p>${escape(p.office||'Должности пока нет')} · обязанностей выполнено ${p.duties}</p></div>`).join('')||'<p class="empty">Поступки ещё не принесли приглашения на службу.</p>'}<p class="detail-label">ВОЗМОЖНОСТИ И ОГРАНИЧЕНИЯ</p>${Object.entries(OPPORTUNITIES).map(([id,r])=>{const result=opportunity(state,id);return `<div class="habit"><b>${result.allowed?'✓':'·'} ${escape(r.name)}</b><p>${escape(result.reason)}</p></div>`;}).join('')}${c.primary?'<p class="detail-label">ОТНОШЕНИЯ ФРАКЦИЙ</p>'+FACTIONS.filter(f=>f.id!==c.primary).map(f=>`<p class="empty">${escape(f.name)}: ${factionRelation(state,c.primary,f.id)}</p>`).join(''):''}`);
  }
  if(tab!=='hero')return;const h=state.hero,mind=PSYCHOLOGIES.find(p=>p.id===h.mind.type);
  $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ПУТЬ ЖИЗНИ</p><p class="empty">${escape(h.life.ended?h.life.outcome==='dead'?'История завершилась гибелью.':'Странствия закончены; герой остаётся жителем мира.':h.life.residence?.since!==undefined?'Дом: '+(state.areas[h.life.home]?.name||'прежнее место')+'. Работа, обещания и путешествия остаются доступными.':h.life.motive||h.life.reflection?.reason||'Собирает свою историю. Дом, ремесло и путешествия могут сочетаться.')}</p>`);
  $('detail-panel').insertAdjacentHTML('beforeend',`<p class="detail-label">ПРОИСХОЖДЕНИЕ</p><b>${escape(h.name)} ${escape(h.family)} · ${race(h.race).name}</b><p class="empty">${escape(h.appearance.mark)}. ${escape(injurySummary(state.people[h.lineage]))} ${escape(race(h.race).ability)}</p><p class="detail-label">ДУШЕВНОЕ СОСТОЯНИЕ</p><b>${escape(mind.name)}</b><p class="empty">${escape(mind.text)}</p><div class="fact"><span>Напряжение</span><b>${Math.round(h.mind.stress)} / 100</b></div><p class="detail-label">МАГИЯ · ${Math.floor(h.magic.mana)} / ${h.magic.maxMana} МАНЫ</p>${h.magic.spells.map(id=>SPELLS.find(sp=>sp.id===id)).filter(Boolean).map(sp=>`<div class="habit"><b>${escape(sp.name)}</b><p>${escape(sp.text)} Цена: ${sp.mana} маны.</p></div>`).join('')||'<p class="empty">Заклинаний пока не знает.</p>'}<div class="fact"><span>Мирных работ / заклинаний</span><b>${h.counters.peacefulWork||0} / ${h.magic.casts}</b></div>`);
}
function render(automatic=false,batching=false) {
  rememberObservers(state);
  showTutorial();
  document.documentElement.classList.toggle('no-animation',!enabled(state,'animation'));
  const h = state.hero, a = state.areas[h.area], time = calendar(state.tick);
  const date=worldDate(state);$('day').textContent = `${date.seasonName} · ${date.seasonDay}`;
  $('tick').textContent = calendarSceneCaption(state);
  $('location').textContent=h.transit?.unknown?'В пути · положение неизвестно':h.transit?`${ROUTE_NAMES[h.transit.mode]} → ${state.areas[h.transit.to].name}`:a.name;
  $('biome').textContent=h.transit?.dead?'ГИБЕЛЬ В ПУТИ':h.transit?.unknown?'МАРШРУТ НЕ ЗАПИСАН':h.transit?`${elapsedLabel(h.transit.remaining)} в пути`:`${a.roadProfile==='long-tract'?'ДЛИННЫЙ ТРАКТ':areaType(a).toUpperCase()}${a.danger?' · опасность '+a.danger:''}${a.era?' · '+date.year:''}`;
  const weather=weatherAt(state,a),ford=fordLabel(state);$('weather').textContent=weather.icon+' '+weather.name+(ford?' · '+ford:'');$('weather').title=weather.text;
  $('name').textContent = h.name; $('level').textContent = progressionHeader(state);$('level').title=progressionHeaderTitle(state);
  $('health').textContent = `${Math.ceil(h.hp)}/${h.maxHp}`; $('health-bar').style.width = `${Math.max(0, h.hp / h.maxHp * 100)}%`;
  $('energy').textContent = `${Math.round(h.energy)}/100`; $('energy-bar').style.width = `${h.energy}%`;
  const mana=resourceViews(state).find(r=>r.id==='mana');$('mana-vital').hidden=!mana;document.querySelector('.hero-strip').classList.toggle('has-mana',Boolean(mana));
  if(mana){$('mana').textContent=`${Math.floor(mana.value)}/${mana.max}`;$('mana-bar').style.width=`${Math.max(0,Math.min(100,mana.value/mana.max*100))}%`;}
  $('name').title=h.name;$('level').title=$('level').textContent;$('gold').title=String(h.gold);
  fitGold(); $('intent').textContent = h.intent; $('reason').textContent = h.reason.replace('отдельно в меню.','кнопкой под дневником.'); $('action-type').textContent = h.action;
  const spoken=visibleSpeech(speechMemory,state);$('speech').innerHTML = semanticEvent(state,{text:spoken,type:spoken?speechMemory.type:null,meaning:spoken?speechMemory.meaning:null}); drawHeroPortrait($('portrait'),state);
  fitCaptions();
  $('world-age').textContent=`Мир ${state.seed} · всего тиков: ${state.tick} · ${lifeName()}`;
  $('advance-label').textContent = 'Следующий миг мира';$('advance').disabled=false;$('next-story').hidden=!lifeFinished(state);
  $('continue-story').hidden=!lifeFinished(state);document.querySelector('main').classList.toggle('story-ended',lifeFinished(state));
  if(!automatic||saveProblem)$('save-status').textContent = saveProblem || (lifeFinished(state)?'Мир продолжает жить. Можно наблюдать это место или отдельно начать следующую историю.':'Клик или пробел — один тик. Удержание — три в секунду. После пяти секунд без кликов мир идёт сам. Прогресс сохраняется в этом браузере.');
  $('save-status').classList.toggle('error', Boolean(saveProblem));
  // The journal is bounded; only announce the latest event to assistive technology.
  const journal = $('journal');
  const first = state.journal[0],notice=lootNotice(speechMemory.loot,state,performance.now(),{batching:batching||Boolean(fastRun)}),noticeKey=notice?.key||'',eventKey=`${first?.tick}:${first?.text}/${noticeKey}`;
  if (journal.dataset.event !== eventKey) {
    const expanded=Boolean(journal.querySelector('.loot-notice details[open]')),selected=new Set((notice?.entries||[]).map(lootEventKey));
    const noticeLabel=notice?.truncated?`Находок: не менее ${notice.count}`:notice?.count===1?'Находка':`Находок: ${notice?.count||0}`;
    const noticeHtml=notice?`<li class="loot-notice"><details${expanded?' open':''}><summary>${noticeLabel} · ${lootBrief(state,notice.entries.at(-1).meaning)}</summary>${notice.entries.map(e=>`<p><time>${eventDate(e)}</time> ${semanticEvent(state,e,{details:true})}</p>`).join('')}${notice.count>notice.entries.length?'<p class="empty">Показаны последние находки. Остальные записи доступны в подробном журнале, пока он их хранит.</p>':''}</details></li>`:'';
    journal.innerHTML = noticeHtml+state.journal.filter(e=>e.life===state.generation&&!selected.has(lootEventKey(e))).slice(0, 35).map(e => `<li><time title="${eventDate(e,true)}">${eventDate(e)}</time><span class="event-icon" aria-hidden="true">${icons[e.type] || '·'}</span><p>${semanticEvent(state,e)}</p></li>`).join('');
    journal.dataset.event = eventKey;
    $('announcement').textContent = notice?lootNoticeText(notice):first?.text || '';
  }
  if($('sheet').open&&(!automatic||tab==='ties'||tab==='bag'&&h.actorMode==='npc'||tab==='quests'&&(h.actorMode==='npc'||materialContracts(state,h.lineage).length))){const panel=$('detail-panel'),scroll=panel.scrollTop;detail();enrichSheet();if(automatic)panel.scrollTop=scroll;} if($('sheet').open&&automatic&&tab==='map'){
    $('sheet').querySelector('h2').textContent='Лист приключения · '+calendarCaption(state);
    refreshCalendarDetails($('detail-panel'),calendarDetailsHTML(state,escape));
  } scene.update(state);renderEffects();
  if(automatic&&$('sheet').open&&tab==='skills')renderProgressionPanel($('detail-panel'),skillBranchesHTML(state,escape));
  if(automatic&&$('sheet').open){const care=$('detail-panel').querySelector('.pet-passage-live');if(care)care.outerHTML=petPassageHTML(state,escape);const keeper=$('detail-panel').querySelector('.pet-keeper-live');if(keeper)keeper.outerHTML=petKeeperHTML(state,state.people[h.lineage],escape);}
  if(automatic&&$('sheet').open&&tab==='bag'){const petPack=$('detail-panel').querySelector('.pack-pet-live');if(petPack)petPack.outerHTML=packPetHTML(state,escape);const clothes=$('detail-panel').querySelector('.clothing-live');if(clothes)clothes.outerHTML=clothingHTML(state,escape);const memory=$('detail-panel').querySelector('.navigation-memory-live');if(memory)memory.outerHTML=navigationMemoryHTML(state,escape);const rope=$('detail-panel').querySelector('.navigation-tool-live');if(rope)rope.outerHTML=navigationToolHTML(state,escape);const wardrobe=$('detail-panel').querySelector('.spare-outfit-live');if(wardrobe)wardrobe.outerHTML=spareOutfitHTML(state,escape);const pack=$('detail-panel').querySelector('.pack-live');if(pack)pack.outerHTML=containerHTML(state);const cargo=$('delivery-cargo-live');if(cargo){const html=deliveryCargoHTML(state,state.people[h.lineage],escape);if(cargo.innerHTML!==html)cargo.innerHTML=html;}}
  $('scene').setAttribute('aria-label', `${h.transit?(h.transit.unknown?'Положение неизвестно':'В пути: '+state.areas[h.transit.to].name):a.name}. ${h.name}: ${h.intent}. ${h.reason}`);
  $('run-life').textContent=fastRun?'Остановить прогон':lifeFinished(state)?'Итоги этой жизни':'Прожить жизнь до конца';
  document.querySelector('.tap-hint').textContent=fastRun?'Прогон · клик — стоп':lifeFinished(state)?'Мир живёт · клик — миг':'Клик · зажать ×3 · авто 1/с';
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, serialize(state)); localStorage.setItem(SAVE_KEY+'-clock',JSON.stringify(clockRecord(state,clock))); saveProblem = ''; }
  catch { saveProblem = 'Не удалось сохранить в браузере. Скачай полное сохранение через меню перед закрытием.'; }
}
function chime() {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), t = audioContext.currentTime;
    oscillator.type = 'sine'; oscillator.frequency.value = state.hero.lastAction === 'attack' ? 120 : [330, 392, 440, 494][state.tick % 4];
    gain.gain.setValueAtTime(.035, t); gain.gain.exponentialRampToValueAtTime(.001, t + .15);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(t); oscillator.stop(t + .16);
  } catch { soundEnabled = false; $('sound').classList.remove('enabled'); }
}
function advance() { if(pendingNextStory)return;if ($('sheet').open || $('settings-dialog').open || $('reset-dialog').open||$('life-summary').open||$('observer-dialog').open) return;if(fastRun)stopFast();teach();pendingInputs.push(Date.now());drainTime(); }
function releaseHold(){clearInterval(holding);clearTimeout(holdStart);holding=null;gesture=null;}
const frameResize=new ResizeObserver(()=>{releaseHold();cancelSuccession();fitGold();fitCaptions();renderEffects();});frameResize.observe($('game-shell'));
window.visualViewport?.addEventListener('resize',()=>{releaseHold();cancelSuccession();});
function resetClock(){releaseHold();pendingInputs.length=0;pendingNextStory=null;restartClock(clock,Date.now());}
document.addEventListener('pointerdown', e => {
  if(e.isPrimary===false){releaseHold();return;}if(e.button!==0)return;
  if (!startsInGame($('game-shell'),e)){releaseHold();return;}
  if(pendingNextStory)return;releaseHold();gesture=beginGesture(e);gesture.map=scene.mode==='map'&&e.target===$('scene');gesture.mapX=e.clientX;gesture.mapY=e.clientY;
  holdStart=setTimeout(()=>{if(!gesture||gesture.moved||pendingNextStory)return;gesture.held=true;advance();if(gesture?.held&&!pendingNextStory)holding=setInterval(advance,1000/3);},1000/3);
});
document.addEventListener('pointermove',e=>{if(gesture&&!pointInGame($('game-shell').getBoundingClientRect(),e)){releaseHold();return;}if(moveGesture(gesture,e)){clearTimeout(holdStart);clearInterval(holding);holding=null;if(gesture.map&&gesture.id===e.pointerId){scene.panMap(e.clientX-gesture.mapX,e.clientY-gesture.mapY);gesture.mapX=e.clientX;gesture.mapY=e.clientY;}}});
document.addEventListener('pointerup',e=>{const tap=isTap(gesture,e)&&pointInGame($('game-shell').getBoundingClientRect(),e);releaseHold();if(tap)advance();});
document.addEventListener('pointercancel',releaseHold);window.addEventListener('blur',releaseHold);
document.addEventListener('gesturestart',e=>{releaseHold();e.preventDefault();},{passive:false});
document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1){releaseHold();e.preventDefault();}},{passive:false});
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat || $('sheet').open || $('settings-dialog').open || $('reset-dialog').open || $('observer-dialog').open || /INPUT|TEXTAREA|BUTTON|SUMMARY|A/.test(document.activeElement.tagName)) return;
  e.preventDefault(); advance();
});
for (const button of document.querySelectorAll('[data-tab]')) button.addEventListener('click', () => {
  tab = button.dataset.tab;
  if(tab==='log')logLife=null;
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b === button));
  detail(); enrichSheet();
});
$('inspect').addEventListener('click', () => { detail(); enrichSheet(); $('sheet').showModal(); });
$('close-sheet').addEventListener('click', () => { $('sheet').close();if(lifeReview)showLifeSummary(); });
$('sheet').addEventListener('close',()=>{if(lifeReview&&!$('life-summary').open)showLifeSummary();});
$('menu').addEventListener('click', () => $('settings-dialog').showModal());
$('close-menu').addEventListener('click', () => $('settings-dialog').close());
function roadViewLabel(){$('road-view').textContent=roadView==='map'?'В дороге: карта':'В дороге: сцена';$('road-view').setAttribute('aria-pressed',String(roadView==='map'));}roadViewLabel();
$('road-view').addEventListener('click',()=>{releaseHold();roadView=roadView==='map'?'scene':'map';scene.setRoadView(roadView);roadViewLabel();renderEffects();try{localStorage.setItem(SAVE_KEY+'-road-view',roadView);}catch{}});
$('map-zoom-in').addEventListener('click',()=>scene.zoomMap(1.25));$('map-zoom-out').addEventListener('click',()=>scene.zoomMap(.8));$('map-follow').addEventListener('click',()=>scene.followMap());
$('scene').addEventListener('wheel',e=>{if(scene.mode!=='map')return;e.preventDefault();releaseHold();scene.zoomMap(e.deltaY<0?1.15:1/1.15);},{passive:false});
$('save-file').addEventListener('click',()=>{
  const url=URL.createObjectURL(new Blob([serialize(state)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=`odyssey-${state.seed}-tick-${state.tick}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('load-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>20*1024*1024)throw new Error('Сохранение слишком большое');
    const next=restore(await file.text());
    localStorage.setItem(SAVE_KEY+'-before-import',serialize(state));fastRun=null;lifeReview=false;state=next;clearSpeech(speechMemory);resetClock();persist();render();$('undo-import').hidden=false;
    $('save-status').textContent=state.hero.actorMode==='npc'?`Загружен житель мира: ${state.hero.name}. Мир ${state.seed}. Предыдущее сохранение можно вернуть.`:`Загружена жизнь ${state.generation}, тик жизни ${lifeTick(state)}. Мир ${state.seed}. Предыдущее сохранение можно вернуть.`;
  }catch(error){$('save-status').textContent='Загрузить не удалось: '+error.message;$('save-status').classList.add('error');}
  e.target.value='';
});
$('undo-import').addEventListener('click',()=>{
  try{const previous=localStorage.getItem(SAVE_KEY+'-before-import');if(!previous)return;const restored=restore(previous);fastRun=null;lifeReview=false;state=restored;clearSpeech(speechMemory);resetClock();persist();render();$('undo-import').hidden=true;$('save-status').textContent='Предыдущее сохранение восстановлено.';}
  catch(error){$('save-status').textContent='Восстановить не удалось: '+error.message;}
});
$('mechanics').addEventListener('click', () => {
  $('settings-dialog').close(); tab = 'rules';
  for (const b of document.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  detail(); enrichSheet(); $('sheet').showModal();
});
$('detail-panel').addEventListener('click', e => {
  const causeLink=e.target.closest('[data-cause-link]');if(causeLink){e.preventDefault();document.getElementById(causeLink.dataset.causeLink)?.scrollIntoView({block:'nearest'});return;}
  const journalButton=e.target.closest('[data-life-log]');
  if(journalButton){logLife=journalButton.dataset.lifeLog;tab='log';for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab==='log'));detail();enrichSheet();return;}
  const button = e.target.closest('[data-module]'); if (!button) return;
  const id = button.dataset.module; setModule(state, id, !enabled(state,id)); persist(); detail(); enrichSheet();
});
function showLifeSummary(){
  releaseHold();fastRun=null;pendingInputs.length=0;lifeReview=true;
  state.observation.lastSummary=summaryKey();
  const h=state.hero,l=currentLife(state),cause=l?.cause||h.life.motive||'История завершилась.';
  $('life-summary-title').textContent=`${h.name}: ${h.alive?'конец странствий':'конец жизни'}`;
  const moments=[...new Map((l?.milestones||h.biography).map(e=>[e.text,e])).values()].sort((a,b)=>a.tick-b.tick),highlights=moments.length>8?[moments[0],...moments.slice(-7)]:moments;
  $('life-summary-content').innerHTML=`<p>${semanticCause(state,cause,l?.causeMeaning)}</p><p class="empty">${ageLabel(observedAge(h,state.tick))} · путь: ${elapsedLabel(lifeTick(state))} · ${escape(profession(h.profession).name)} · уровень ${h.level}</p><p>Мест: ${h.memory.places.length} · побед: ${h.kills} · дел: ${h.quests.filter(q=>q.status==='done').length} · данжей: ${h.counters.dungeons||0}</p><ol class="full-log">${highlights.slice().reverse().map(e=>`<li><time>${eventDate(e,true)}</time>${semanticEvent(state,e,{details:true})}</li>`).join('')}</ol>`;
  if(h.actorMode==='npc'){const p=state.people[h.lineage],duration=Math.max(0,(h.life.endedAt??l?.ended??state.tick)-(h.npcProfile?.observedAt??h.born)),time=h.life.deathDateKnown===false?'Момент гибели не записан.':`наблюдение: ${elapsedLabel(duration)}`,wealth=l?.wealthBasis==='recorded-estate'?'монет при получении сведений':'монет при смерти';$('life-summary-content').innerHTML=`<p>${semanticCause(state,cause,l?.causeMeaning)}</p><p class="empty">${escape(ageLabel(h.life.deathDateKnown===false?null:personAge(state,p)))} · ${escape(NPC_JOBS[p.agenda?.job]||profession(h.profession).name)} · ${time}</p><p>Выполнено работ: ${l?.npcProfile?.work??p.agenda?.work??0} · ${wealth}: ${l?.wealth??h.gold}</p><ol class="full-log">${highlights.slice().reverse().map(e=>`<li><time>${eventDate(e,true)}</time>${semanticEvent(state,e,{details:true})}</li>`).join('')}</ol>`;}
  const recorded=deathSheet(state,l,h);if(recorded){$('life-summary-content').innerHTML=recorded;$('life-summary-title').textContent=`${l?.name||h.name}: конец жизни`;}
  if(!$('life-summary').open)$('life-summary').showModal();persist();render();
}
function closeSummary(){$('life-summary').close();lifeReview=false;persist();render();}
$('close-life-summary').addEventListener('click',closeSummary);$('summary-watch-world').addEventListener('click',closeSummary);
$('life-summary').addEventListener('cancel',e=>{e.preventDefault();$('close-life-summary').click();});
function summaryKey(){const l=currentLife(state);return state.hero.lineage+'/'+(state.hero.life.endedAt??l?.ended??state.hero.born)+'/'+(state.hero.alive?'settled':'dead');}
function nextStory(){
 if(!lifeFinished(state)||pendingNextStory)return;
 requestObserver('new');
}
function requestObserver(kind,person){
 if(pendingNextStory)return;
 const request=observerRequest(state,kind,person,Date.now());if(!request){openObservers('Этот человек сейчас недоступен. Выберите другого.');return;}
 releaseHold();pendingInputs.length=0;fastRun=null;lifeReview=false;
 cancelObserverChoice();
 for(const id of ['life-summary','sheet','settings-dialog','observer-dialog'])if($(id).open)$(id).close();
 pendingNextStory=request;drainTime();
}
function openObservers(message=''){
 if(pendingNextStory)return;
 releaseHold();if(fastRun)stopFast();lifeReview=false;
 for(const id of ['life-summary','sheet','settings-dialog'])if($(id).open)$(id).close();
 const choices=observerChoices(state);$('observer-status').textContent=message;
 $('observer-hint').textContent=state.hero.alive?'Прежний персонаж продолжит жить сам. Мир не останавливается.':'Мир продолжает жить. Можно наблюдать знакомого или начать путь нового человека.';
 $('observer-list').innerHTML=choices.map(p=>`<button data-observer="${escape(p.id)}"><b>${escape(p.name)}</b><span>${escape(p.description)}</span></button>`).join('')||'<p class="empty">Пока нет доступных знакомых. Можно начать путь нового человека.</p>';
 cancelObserverChoice();if(!$('observer-dialog').open)$('observer-dialog').showModal();persist();
}
const cancelObserverChoice=bindFreshChoice($('observer-list'),e=>e.target.closest('[data-observer]')?.dataset.observer??null,id=>!pendingNextStory&&observerChoices(state).some(p=>p.id===id),id=>requestObserver('person',id),document,window,e=>pointInGame($('game-shell').getBoundingClientRect(),e));
$('observer-dialog').addEventListener('close',cancelObserverChoice);
$('close-observer').addEventListener('click',()=>$('observer-dialog').close());
$('choose-observer').addEventListener('click',()=>openObservers());
$('summary-observer').addEventListener('click',()=>openObservers());
bindFreshAction($('observer-new'),()=>!pendingNextStory,()=>requestObserver('new'),document,window,e=>pointInGame($('game-shell').getBoundingClientRect(),e));
for(const id of ['summary-next-story','next-story'])bindFreshAction($(id),()=>lifeFinished(state)&&!pendingNextStory,nextStory,document,window,e=>pointInGame($('game-shell').getBoundingClientRect(),e));
cancelSuccession=bindFreshAction($('continue-story'),()=>lifeFinished(state)&&!pendingNextStory,nextStory,document,window,e=>pointInGame($('game-shell').getBoundingClientRect(),e));
$('life-journal').addEventListener('click',()=>{$('life-summary').close();logLife=currentLife(state)?archiveKey(currentLife(state)):null;tab='log';for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab==='log'));detail();enrichSheet();$('sheet').showModal();});
function stopFast(){fastRun=null;resetClock();persist();render();}
function fastLifeFrame(run=fastRun){
  if(!run||run!==fastRun)return;
  if($('sheet').open||$('settings-dialog').open||$('reset-dialog').open||$('observer-dialog').open){setTimeout(()=>fastLifeFrame(run),100);return;}
  const started=performance.now(),result=runLifeBatch(state,250,()=>performance.now()-started>=20);fastRun.steps+=result.ticks;clock.anchor=Date.now();persist();render();
  if(result.finished){showLifeSummary();return;}setTimeout(()=>fastLifeFrame(run),0);
}
$('run-life').addEventListener('click',()=>{
  $('settings-dialog').close();if(fastRun){stopFast();return;}if(!state.hero.alive||state.hero.life.ended){showLifeSummary();return;}
  lifeReview=false;resetClock();fastRun={steps:0};render();fastLifeFrame();
});
$('sound').addEventListener('click', () => { soundEnabled = !soundEnabled; $('sound').classList.toggle('enabled', soundEnabled); $('sound').textContent = soundEnabled ? 'Звук: вкл.' : 'Звук: выкл.'; $('sound').setAttribute('aria-label', soundEnabled ? 'Выключить звук' : 'Включить звук'); $('sound').setAttribute('aria-pressed', String(soundEnabled)); chime(); });
$('reset').addEventListener('click', () => { $('settings-dialog').close(); $('reset-dialog').showModal(); });
$('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
$('confirm-reset').addEventListener('click', () => { fastRun=null;lifeReview=false;state = createWorld(); clearSpeech(speechMemory); resetClock(); persist(); render(); $('reset-dialog').close(); });
$('export').addEventListener('click', () => {
  const lines = ['CLICK ODYSSEY', `${lifeName()} · тик жизни ${lifeTick(state)} · мир ${state.seed}, тик мира ${state.tick}`, '', ...(state.hero.timeline||state.journal.slice().reverse()).map(e => `[${lifeTick(state,e.tick)}] ${e.text}`), '', 'ПОСЛЕДСТВИЯ', ...state.changes.filter(e=>knownWorldEvent(state,e)).map(c => `[${c.tick}] ${c.text}`)];
  const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `click-odyssey-${state.seed}.txt`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const startupProblem=saveProblem;persist();if(startupProblem)saveProblem=startupProblem;render();
if(lifeFinished(state)&&state.observation.lastSummary!==summaryKey())showLifeSummary();
function drainTime(){
 const before=state.hero.alive,target=pendingNextStory?.target??pendingInputs[0]??Date.now(),started=performance.now();
 const ticks=catchUp(clock,target,()=>advanceLife(state),250,()=>performance.now()-started>=20);
 let manual=false,switched=false;
 if(before&&!state.hero.alive){releaseHold();pendingInputs.length=0;}
 if(pendingNextStory&&!hasDue(clock,target)){
  const wanted=pendingNextStory;pendingNextStory=null;
  if(commitObserverRequest(state,clock,wanted,Date.now())){clearSpeech(speechMemory);logLife=null;$('journal').dataset.event='';switched=true;}else openObservers('Этот человек сейчас недоступен. Выберите другого.');
 }else if(!pendingNextStory&&!hasDue(clock,target)&&pendingInputs.length){const input=pendingInputs.shift();registerInput(clock,input);manual=advanceLife(state);if(manual)chime();}
 if(before&&!state.hero.alive){releaseHold();pendingInputs.length=0;}
 if(ticks||manual||switched){persist();render(!manual&&!switched,hasDue(clock,target));}
 if((manual||ticks)&&lifeFinished(state)&&!$('observer-dialog').open&&state.observation.lastSummary!==summaryKey())showLifeSummary();
 return ticks;
}
function pumpTime() {
  if(fastRun){if(!clock.stopped)clock.anchor=Date.now();setTimeout(pumpTime,200);return;}
  const ticks=drainTime(),stage=tutorialState.stage;tutorialTick(tutorialState,Date.now(),ticks>0&&!pendingInputs.length&&!clock.idleUntil);if(stage!==tutorialState.stage)saveTutorial();showTutorial();
  if(!ticks&&speechMemory.loot.notice?.batch&&performance.now()>=speechMemory.loot.notice.untilMs)render(true);
  setTimeout(pumpTime,hasDue(clock,pendingNextStory?.target??pendingInputs[0]??Date.now())||pendingInputs.length||pendingNextStory?0:200);
}
pumpTime();
window.addEventListener('pagehide',persist);





