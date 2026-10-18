import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,serialize,restore} from '../engine.js';
import {settlementAssessment,lifePlan} from '../modules/lifecycle.js';
import {YEAR_TICKS} from '../calendar.js';
import {setModule} from '../rules.js';
const ctx={closest:s=>s.areas.a1,log:()=>{},goal:(s,kind,area,x)=>s.hero.goal={kind,area,x}};
function established(){
  const s=createWorld(0),h=s.hero;h.area='a1';h.habits=[];h.personality.curiosity=.4;h.social.lostCompanions=0;h.mind.stress=0;h.career.path='peaceful';h.counters.peacefulWork=45;h.quests=[];h.companions=[];s.storyCases=[];h.commitments.personal=null;h.relations={};h.career.lastChange=h.born;return s;
}
test('the same livelihood supports early roots or a longer curious life, without changing health or income',()=>{
  const s=established(),h=s.hero;s.tick=h.born+8000;const before=serialize(s);
  assert.equal(settlementAssessment(s,s.areas.a1).ready,false);assert.equal(serialize(s),before);
  h.habits.push('homebody');h.personality.curiosity=.1;assert.equal(settlementAssessment(s,s.areas.a1).ready,true);
  assert.equal(h.counters.peacefulWork,45);assert.equal(h.hp,JSON.parse(before).hero.hp);
  h.habits=[];h.personality.curiosity=.85;s.tick=h.born+YEAR_TICKS;
  assert.equal(settlementAssessment(s,s.areas.a1).ready,false);
  s.tick=h.born+YEAR_TICKS*2;assert.equal(settlementAssessment(s,s.areas.a1).ready,true);
});
test('unfinished personal work, learning and witnessed loss change a real settlement decision',()=>{
  const s=established(),h=s.hero;s.tick=h.born+YEAR_TICKS;
  assert.equal(settlementAssessment(s,s.areas.a1).ready,true);
  h.commitments.personal={status:'active'};assert.equal(settlementAssessment(s,s.areas.a1).ready,false);
  setModule(s,'commitments',false);assert.equal(settlementAssessment(s,s.areas.a1).ready,true);
  h.life.nextMastery={profession:h.profession,rank:h.career.rank+1};assert.equal(settlementAssessment(s,s.areas.a1).key,'learning');
  h.career.rank++;assert.equal(settlementAssessment(s,s.areas.a1).ready,true);
  s.tick=h.born+8000;h.social.lostCompanions=2;assert.equal(settlementAssessment(s,s.areas.a1).ready,true);
});
test('reflection preserves its learning target through saves; disabling endings or accepting a promise prevents settling',()=>{
  let s=established();s.tick=s.hero.life.reflectAfter;
  assert.equal(lifePlan(s,ctx),false);const target={...s.hero.life.nextMastery},save=serialize(s);
  assert.equal(serialize(restore(save)),save);s=restore(save);s.tick+=384;s.hero.career.rank++;
  lifePlan(s,ctx);assert.deepEqual(s.hero.life.nextMastery,target);
  setModule(s,'lifecycle',false);const before=serialize(s);assert.equal(lifePlan(s,ctx),false);assert.equal(serialize(s),before);
  setModule(s,'lifecycle',true);s.hero.quests=[{status:'active'}];s.tick+=YEAR_TICKS*3;assert.equal(lifePlan(s,ctx),false);
});
