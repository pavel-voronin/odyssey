import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,serialize,restore,observeExistingPerson} from '../engine.js';import {setModule} from '../rules.js';
import {DAY_TICKS,dateLabel} from '../calendar.js';import {recordHistoricalBoundary} from '../modules/historical-calendar.js';
import {calendarCaption,calendarSceneCaption,calendarDetailsHTML} from '../historical-calendar-sheet.js';
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
function boundary(s,id,name='После раскола',shortName='Раскол'){
 const event={id,tick:s.tick,area:s.hero.area,text:'Разлом поглотил старую переправу.',knownBy:[s.hero.lineage],witnesses:[],worldBoundary:{domain:'geography',actors:[s.hero.lineage]}};s.changes.push(event);return recordHistoricalBoundary(s,{event,name,shortName});
}
test('existing scene caption names civil period while the sheet gives its full witnessed cause',()=>{
 const s=createWorld(7);s.tick=37*DAY_TICKS+73;boundary(s,'prepared-ui');const raw=serialize(s);
 assert.equal(calendarCaption(s),'Раскол · 1 г.');assert.equal(calendarSceneCaption(s),'День · Раскол · 1 г.');const html=calendarDetailsHTML(s,esc);for(const text of ['После раскола · 1 год','Разлом поглотил старую переправу.','Источник:','Прежние периоды · 1','Основание прежнего летосчисления не записано.'])assert.ok(html.includes(text),text);assert.equal(serialize(s),raw);assert.equal(calendarDetailsHTML(restore(raw),esc),html);
});
test('switching to a real NPC keeps common caption but does not grant news of the cause',()=>{
 const s=createWorld(12);s.tick=DAY_TICKS+1;boundary(s,'observer');const caption=calendarCaption(s),id=Object.keys(s.people).find(id=>id!==s.hero.lineage&&s.people[id].alive&&s.people[id].role!=='ребёнок'&&s.people[id].agenda?.job!=='student');assert.ok(observeExistingPerson(s,id));assert.equal(calendarCaption(s),caption);let html=calendarDetailsHTML(s,esc);assert.doesNotMatch(html,/Разлом поглотил|Источник:/);assert.match(html,/ещё не известно наблюдателю/);s.chronology.periodHistory.entries[1].cause.witnesses.push(id);assert.match(calendarDetailsHTML(s,esc),/Разлом поглотил/);
});
test('time scene is labelled separately and no old document or event label is reissued',()=>{
 const s=createWorld(7),a=s.areas[s.hero.area];s.tick=DAY_TICKS+30;const document={tick:s.tick,text:dateLabel(s)},label=document.text;s.tick+=DAY_TICKS;boundary(s,'time');const caption=calendarCaption(s);a.era=-120;assert.equal(calendarCaption(s),caption);const html=calendarDetailsHTML(s,esc);assert.match(html,/Временная сцена: 623 г. прежнего счёта/);assert.match(html,/сдвиг -120 лет/);assert.equal(document.text,label);const origin=s.areas[s.chronology.periodHistory.entries[1].cause.area];origin.climate='arid';const elsewhere=Object.values(s.areas).find(b=>b.id!==origin.id);elsewhere.climate='temperate';s.hero.area=elsewhere.id;assert.ok(calendarDetailsHTML(s,esc).includes(esc(dateLabel(s,s.chronology.periodHistory.entries[1].startTick,origin))));assert.equal(calendarCaption(s,document.tick),'Прежний счёт · 743 г.');
});
test('a second era leaves prior anchored sources in details; OFF preserves the journal without adding one',()=>{
 const s=createWorld(3);s.tick=20;boundary(s,'first');s.tick=3*DAY_TICKS;boundary(s,'second','После открытия','Открытие');setModule(s,'historical-calendar',false);const raw=serialize(s),html=calendarDetailsHTML(s,esc);assert.equal(calendarCaption(s),'Открытие · 1 г.');assert.match(html,/Прежние периоды · 2/);assert.match(html,/После раскола/);assert.equal(serialize(s),raw);assert.equal(calendarDetailsHTML(restore(raw),esc),html);
});
test('current144 optional absence is honest and pure, names and reason are escaped at the HTML boundary',()=>{
 const s=createWorld(8,{rules:{'historical-calendar':false}}),raw=serialize(s);assert.equal(calendarCaption(s),'743 г.');assert.match(calendarDetailsHTML(s,esc),/Основание прежнего летосчисления не записано/);assert.equal(serialize(s),raw);assert.equal(serialize(restore(raw)),raw);setModule(s,'historical-calendar',true);s.tick=50;const p=boundary(s,'escaped','<img src=x onerror=x>','<Раскол>');p.reason='<script>secret</script>';const html=calendarDetailsHTML(s,esc);assert.doesNotMatch(html,/<img|<script|<Раскол>/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);assert.equal(calendarCaption(s),'<Раскол> · 1 г.');
});
