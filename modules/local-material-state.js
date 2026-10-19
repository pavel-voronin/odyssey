import {enabled} from '../rules.js';
import {selfDrivenActor} from '../actor-projection.js';
import {localContact} from './npc-contacts.js';
import {collectionItems} from './collection-state.js';
import {itemWorking} from './item-condition.js';
import {canHoldWeapon} from './limb-state.js';
export const materialsOn=s=>enabled(s,'local-materials')&&enabled(s,'mechanisms');
export function materialBody(s,p){const h=s.hero.lineage===p?.id?s.hero:s.actorStates?.[p?.id],actor=selfDrivenActor(s,h)?h:null,at=actor?(actor.transit?null:{area:actor.area,x:actor.x}):p&&localContact(s,p.id,p.area);return at?{...at,h:actor,energy:actor?.energy??p.needs.energy}:null;}
export function materialKnife(s,p){return enabled(s,'equipment')&&canHoldWeapon(p)?collectionItems(s,p.id).find(i=>i.toolKind==='knife'&&i.manufacture?.recipe==='working-knife'&&itemWorking(i)):null;}
export function newWoodMaterial(s){return {version:1,kind:'wood',created:s.tick,wet:0,fuel:{initial:2,remaining:2,burned:0,cut:0},fire:null,lastActionTick:-1,lastPhase:-1,history:[]};}
export function materialEvent(g,event){g.material.history.push(event);if(g.material.history.length>12)g.material.history.shift();}
export function removeWoodBlocker(s,g,actor){if(g.material.fuel.remaining||g.state==='open')return false;g.state='open';g.changed=s.tick;g.operations.push({tick:s.tick,person:actor,state:'open'});if(g.operations.length>8)g.operations.shift();s.graphRevision=(s.graphRevision||0)+1;return true;}
