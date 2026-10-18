import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../engine.js';
import {createTutorial,tutorialInput,tutorialTick,tutorialText} from '../tutorial.js';
import {semanticText} from '../text.js';
import {beginGesture,moveGesture,isTap} from '../gestures.js';
import {lifeTick,createSpeech,visibleSpeech,clearSpeech} from '../presentation.js';

test('hero tick labels restart with each birth and archived events retain their own origin',()=>{
  const s=createWorld(1);s.tick=12037;s.hero.born=12000;s.lives.push({generation:0,born:500});
  assert.equal(lifeTick(s),37);assert.equal(lifeTick(s,531,0),31);assert.equal(lifeTick(s,999,99),null);
  s.generation++;s.hero.born=s.tick;assert.equal(lifeTick(s),0);
});
test('captions persist for three ticks, are replaced by new speech and never carry into another life',()=>{
  const s=createWorld(1),m=createSpeech();s.tick=100;s.hero.speech='Первая реплика';assert.equal(visibleSpeech(m,s),'Первая реплика');
  s.hero.speech='';s.tick++;assert.equal(visibleSpeech(m,s),'Первая реплика');assert.equal(visibleSpeech(m,s),'Первая реплика');
  s.tick++;s.hero.speech='Новая реплика';assert.equal(visibleSpeech(m,s),'Новая реплика');
  s.hero.speech='';s.tick+=2;assert.equal(visibleSpeech(m,s),'Новая реплика');s.tick++;assert.equal(visibleSpeech(m,s),'');
  s.hero.speech='Последняя реплика';s.tick++;visibleSpeech(m,s);s.generation++;s.hero.speech='';assert.equal(visibleSpeech(m,s),'');
});
test('onboarding leaves the world visible, demonstrates clicks and finishes only after an actual automatic tick',()=>{
  const t=createTutorial();assert.equal(tutorialText(t,0),'Кликни на экран.');tutorialInput(t,100);assert.equal(tutorialText(t,100),'Кликни ещё раз.');
  tutorialInput(t,200);assert.equal(tutorialText(t,200),'Не кликай пять секунд · 5');assert.equal(tutorialText(t,3200),'Не кликай пять секунд · 2');
  tutorialInput(t,4000);assert.equal(tutorialText(t,4000),'Не кликай пять секунд · 5');tutorialTick(t,9000,false);assert.equal(t.stage,3);
  tutorialTick(t,9000,true);assert.equal(tutorialText(t,9000),'Приятного приключения.');assert.equal(t.done,true);tutorialTick(t,11200);assert.equal(t.stage,0);
});
test('rewinding a save or replacing the same hero at the same tick clears captions from the replaced state',()=>{
 const s=createWorld(0),m=createSpeech();s.tick=250;s.hero.speech='Событие из будущего';visibleSpeech(m,s);s.tick=216;s.hero.speech='';assert.equal(visibleSpeech(m,s),'');
 s.hero.speech='Другая ветка';s.tick++;visibleSpeech(m,s);s.hero.speech='';clearSpeech(m);assert.equal(visibleSpeech(m,s),'');s.hero.speech='Событие из загрузки';clearSpeech(m);assert.equal(visibleSpeech(m,s),'Событие из загрузки');
});
test('journal references safely format actual people, relations, items and coin values without HTML execution',()=>{
  const s=createWorld(1),p=s.people[s.areas.a1.population[0]];s.hero.memory.people.push(p.id);s.hero.relations[p.id]={trust:20};
  const text=semanticText(s,`${p.name} даёт ◈15 и 8 монет. <img src=x onerror=bad()>`);
  assert.ok(text.includes('ref-person'));assert.ok(text.includes(p.id));assert.ok(text.includes('#c4eac1'));assert.equal((text.match(/ref-money/g)||[]).length,2);
  assert.ok(text.includes('&lt;img'));assert.ok(!text.includes('<img'));
});
test('a scrolling pointer never becomes a click, while a tap and a completed hold are distinct gestures',()=>{
  const down={pointerId:1,clientX:100,clientY:600},scroll=beginGesture(down);
  for(let y=598;y>=400;y-=2)moveGesture(scroll,{...down,clientY:y});assert.equal(isTap(scroll,{...down,clientY:400}),false);
  const tap=beginGesture(down);moveGesture(tap,{...down,clientX:103});assert.equal(isTap(tap,down),true);
  const hold=beginGesture(down);hold.held=true;assert.equal(isTap(hold,down),false);assert.equal(isTap(tap,{...down,pointerId:2}),false);
});
