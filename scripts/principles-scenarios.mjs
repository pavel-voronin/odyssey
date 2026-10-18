import {createWorld} from '../engine.js';
import {setModule} from '../rules.js';
import {revealArea,revealRoad,initializeActorAtlas} from '../actor-atlas.js';
import {commonContext} from './common-life-scenarios.mjs';
import {finishStory} from '../modules/stories.js';
import * as mysteries from '../modules/mysteries.js';
export const principleContext={...commonContext,storyFinish:finishStory};
export function principleFixture({interested=true}={}){
 const s=createWorld(0),h=s.hero;for(const id of Object.keys(s.rules))setModule(s,id,false);for(const id of ['principles','stories','mysteries','identity'])setModule(s,id,true);initializeActorAtlas(s,h);
 Object.assign(h,{area:'a1',x:42,hp:h.maxHp,energy:100,hunger:0,combat:null,transit:null,goal:null});h.personality.curiosity=interested?.8:.1;h.personality.generosity=interested?.8:.1;h.habits=['reckless'];h.quests=[];h.companions=[];h.commitments.personal=null;h.stats.wit=6;h.stats.guile=4;s.storyCases=[];h.stories.completed=[];h.stories.active=null;
 const c=makePrincipleCase(s,'mistaken-origin');c.culprit=c.accused;c.evidence=[{tick:s.tick,person:c.other,reliable:false}];c.stage='trial';mysteries.act(s,c,principleContext);return {s,h,c};
}
export function makePrincipleCase(s,id='later-case'){
 const c={id,kind:'mystery',status:'active',owner:s.hero.lineage,source:'a1',stage:'opening',started:s.tick,choices:[],effects:[],refs:[]};s.storyCases.push(c);s.hero.stories.active=c.id;mysteries.start(s,c,principleContext);return c;
}
export function prepareSecondCase(s){
 const c=makePrincipleCase(s);c.culprit=c.accused;c.clues[0].found=true;s.areas[c.clues[0].area].objects.find(o=>o.id===c.clues[0].object).resolved=true;c.evidence=[{tick:s.tick,person:c.other,reliable:false}];revealArea(s,c.clues[1].area);revealRoad(s,c.source,c.clues[1].area);s.hero.goal=null;return c;
}
