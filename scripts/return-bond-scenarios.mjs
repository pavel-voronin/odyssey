import assert from 'node:assert/strict';
import {returnFixture,ritualAct,returnContext} from './return-ritual-scenarios.mjs';
import {returnBondNPCTurn} from '../modules/return-bond.js';
import {setActorMoney,syncNPCActors} from '../actor-projection.js';
import {createNextStory,step} from '../engine.js';
import {peopleTick} from '../modules/people.js';
export const bondContext={...returnContext,returnBondNPCTurn};
export function bondFixture({bound=true,independent=false,native=false}={}){const f=returnFixture({beforeDeath({s,h,caster}){h.gold-=2;setActorMoney(s,caster,2);caster.agenda.curiosity=bound?.1:.8;caster.agenda.sociability=.1;caster.agenda.duty=.9;h.personality.generosity=independent?.1:.7;h.personality.courage=1;}});if(native){createNextStory(f.s);f.observer=f.s.hero;}for(let i=0;i<4;i++)ritualAct(f);f.bond=f.dead.returnEpisode.bond;f.seal=f.bond.seal&&f.s.areas[f.bond.seal.area].objects.find(o=>o.id===f.bond.seal.object);assert.equal(f.bond.state,bound?'bound':'free');return f;}
export function finishBond(f,{limit=8}={}){for(let i=0;i<limit&&['bound','expired'].includes(f.bond.state);i++)step(f.s);assert.equal(f.bond.state,'released');return f;}
export function nativeBondAct(f){f.s.tick=Math.floor(f.s.tick/8+1)*8;peopleTick(f.s,bondContext);syncNPCActors(f.s);return f;}
