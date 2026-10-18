import assert from 'node:assert/strict';
import {literacyFixture,prepareTextPerson} from './literacy-scenarios.mjs';
import {createPerson} from '../modules/lineage.js';
import {setModule} from '../rules.js';
import {heldTexts} from '../modules/text-state.js';
import {actorItemLocation} from '../modules/item-originals.js';
export function textValueFixture(){
 const f=literacyFixture();setModule(f.s,'text-values',true);f.pupil.agenda.curiosity=.85;f.buyer.agenda.wealth+=8;f.a.civic.treasury-=8;return f;
}
export function familyTextFixture(){
 const f=textValueFixture(),{s,teacher,second}=f;
 const child=s.people[createPerson(s,{area:f.a.id,parents:[teacher.id],culture:teacher.culture,role:'житель',alive:true},{initialJob:'farmer'})];prepareTextPerson(f,child);
 // Prepared handover of the same real copy to its author's actual child.
 const bag=heldTexts(s,f.pupil.id);assert.equal(bag.splice(bag.indexOf(second),1)[0],second);(child.looseItems ||= []).push(second);actorItemLocation(s,second,child.id);return {...f,child};
}
