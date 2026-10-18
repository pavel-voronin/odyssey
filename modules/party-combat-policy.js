import {enabled} from '../rules.js';
export const partyCombatOn=s=>enabled(s,'party-combat')&&enabled(s,'companions')&&enabled(s,'people');
export const PARTY_COMBAT_POLICY=Object.freeze({reach:24,attackEnergy:2,aidEnergy:3,coverEnergy:5,coverShare:.4});
export const PARTY_PASSIVE_PHASES=Object.freeze(['upkeep','social']);
export const partyCombatSpent=(s,p)=>p?.partyCombat?.tick===s.tick;
export const partyBodySpent=(s,p)=>partyCombatSpent(s,p)||p?.pairPractice?.lastActionTick===s.tick;
