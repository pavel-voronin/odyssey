import {enabled} from '../rules.js';
export const partyCombatOn=s=>enabled(s,'party-combat')&&enabled(s,'companions')&&enabled(s,'people');
export const PARTY_COMBAT_POLICY=Object.freeze({reach:24,attackEnergy:2,aidEnergy:3,coverEnergy:5,coverShare:.4});
export const PARTY_PASSIVE_PHASES=Object.freeze(['upkeep','social']);
export const partyCombatSpent=(s,p)=>p?.partyCombat?.tick===s.tick;
export const partyBodySpent=(s,p)=>p?.libraryActivity?.tick===s.tick||p?.hostileLife?.lastActionTick===s.tick||p?.raidDefenseTick===s.tick||p?.rivalActionTick===s.tick||p?.enemyBody?.lastActionTick===s.tick||p?.prostheticCraft?.lastActionTick===s.tick||p?.partyInjury?.lastActionTick===s.tick||p?.woundCare?.lastActionTick===s.tick||partyCombatSpent(s,p)||p?.pairPractice?.lastActionTick===s.tick||p?.expeditionWork?.tick===s.tick||p?.watchDuty?.tick===s.tick||p?.moneyCaches?.lastActionTick===s.tick||p?.routeMaps?.lastActionTick===s.tick||p?.mapCopies?.lastActionTick===s.tick||p?.mechanisms?.lastActionTick===s.tick||p?.mechanismDuty?.tick===s.tick||p?.liftMemory?.lastActionTick===s.tick;
