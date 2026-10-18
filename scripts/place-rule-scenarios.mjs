import {meaningFixture} from './event-meaning-scenarios.mjs';
import {commonContext} from './common-life-scenarios.mjs';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
export const placeRuleContext={...commonContext,random:()=>1,defeatEnemy:()=>{}};
export function placeRuleFixture({mage=true,mana=6,courage=.3}={}){
 const f=meaningFixture(),{s,h}=f,a=s.areas.a2;
 for(const id of ['place-rules','magic'])setModule(s,id,true);
 h.area=a.id;h.magic.spells=mage?['spark']:[];h.magic.mana=mana;h.magic.cooldowns={};h.magic.casts=0;h.personality.courage=courage;h.habits=[];h.stories.active=null;h.destiny.completed=true;
 syncActiveActor(s);return {...f,a};
}
