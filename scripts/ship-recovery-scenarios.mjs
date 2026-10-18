import assert from 'node:assert/strict';
import {skillFixture,skillContext,actualRepair} from './skill-practice-scenarios.mjs';
import {setModule} from '../rules.js';
import {createArea,connectAreas} from '../engine.js';
import {storyObject} from '../modules/story-common.js';
import {finishStory} from '../modules/stories.js';
import * as expeditions from '../modules/expeditions.js';
import {expeditionNode} from '../modules/expedition-specialists.js';
import {craftStudyPlan,craftStudyAction} from '../modules/craft-practice.js';
import {tradeGoods} from '../modules/market.js';
export const recoveryContext={...skillContext,addArea:createArea,connect:connectAreas,storyFinish:finishStory};
// One prepared local ship, a genuinely born soldier and real restoration/study
// actions. No lifespan simulation or fabricated learned method.
export function recoveryFixture({dismantle=false}={}){
 const f=skillFixture(),{s,h,a}=f;for(const id of ['stories','expeditions','ship-recovery','repertoire'])setModule(s,id,true);
 h.maxHp=100;h.hp=100;h.inventory.relics=dismantle?0:1;
 for(const o of a.objects)if(o.kind==='enemy'){o.alive=false;o.resolved=true;}
 const c={id:'recovery-test',kind:'expedition',variant:'ship',status:'active',owner:h.lineage,source:a.id,target:a.id,started:s.tick,stage:'investigate',choices:[],effects:[],refs:[],accessNode:expeditionNode()};c.console=storyObject(s,c,a.id,'Сердце корабля',82);s.storyCases.push(c);h.stories.active=c.id;
 function turn(){s.tick++;expeditions.plan(s,c,recoveryContext);h.x=h.goal.x;expeditions.act(s,c,recoveryContext);}
 turn();turn();turn();turn();assert.equal(c.status,dismantle?'done':'failed');assert.equal(h.hp,dismantle?100:85);assert.equal(h.inventory.relics,0);return{...f,c,turn};
}
export function learnRecovery(f){
 const {s,h,a}=f;actualRepair(f);actualRepair(f);actualRepair(f);h.goal=null;
 assert.equal(craftStudyPlan(s,recoveryContext),true);h.x=h.goal.x;
 for(let n=0;n<3;n++){s.tick++;assert.equal(craftStudyAction(s,recoveryContext),true);}
 assert.equal(s.people[h.lineage].skillPractice.craft.method.id,'fit-working-part');
 h.x=58;s.tick++;assert.equal(tradeGoods(s,a,h.lineage,'tools','buy',1).quantity,1);
 // A newly found relic is a controlled finite resource, distinct from spent fuel.
 h.inventory.relics=1;return f;
}
