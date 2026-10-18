import {createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {initializeActorAtlas} from '../actor-atlas.js';
import {makePrincipleCase,principleContext} from './principles-scenarios.mjs';
import * as mysteries from '../modules/mysteries.js';
import {recordObject,caseMemory} from '../modules/verdict-evidence.js';
export {principleContext as verdictContext};
export function verdictFixture({wrong=true,reader=true}={}){
 const s=createWorld(0),h=s.hero;
 for(const id of Object.keys(s.rules))setModule(s,id,false);
 for(const id of ['verdict-knowledge','principles','stories','mysteries','identity'])setModule(s,id,true);
 initializeActorAtlas(s,h);
 Object.assign(h,{area:'a1',x:42,hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null});h.stats.wit=6;h.personality.curiosity=.8;h.personality.generosity=.8;h.habits=['reckless'];h.quests=[];h.companions=[];h.commitments.personal=null;s.storyCases=[];h.stories.active=null;h.stories.completed=[];
 const c=makePrincipleCase(s,'recorded-case'),o=recordObject(s,c.verdictKnowledge.basis);
 c.culprit=wrong?c.other:c.accused;o.sealRecord.pointsTo=c.culprit;o.sealRecord.name=s.people[c.culprit].name;c.clues[0].found=true;o.resolved=true;c.evidence=[{tick:s.tick,person:c.accused,reliable:!wrong}];c.stage='trial';mysteries.act(s,c,principleContext);
 const p=Object.values(s.people).find(p=>p.alive&&p.area==='a1'&&p.agenda&&![h.lineage,c.accused,c.other].includes(p.id));
 Object.assign(p,{x:o.x,health:p.maxHealth||100,status:'resident',ailment:null});p.needs.hunger=0;p.needs.energy=100;p.agenda.job=reader?'scholar':'farmer';p.agenda.task=null;p.agenda.due=0;
 return {s,h,c,o,p,entry:caseMemory(s,c.id)};
}
