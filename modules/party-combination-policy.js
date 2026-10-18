import {enabled} from '../rules.js';
import {partyCombatOn} from './party-combat-policy.js';

export const PAIR_METHOD='covered-windup';
export const PAIR_POLICY=Object.freeze({lessons:3,practiceEnergy:2,prepareEnergy:2,strikeEnergy:4,guardEnergy:5,multiplier:3});
export const combinationsOn=s=>partyCombatOn(s)&&enabled(s,'party-combinations')&&enabled(s,'relationships');
export function pairConsent(s,a,b){
 const p=s.people[a?.person],q=s.people[b?.person];
 return Boolean(p?.alive&&q?.alive&&p.id!==q.id&&a.loyalty>=45&&b.loyalty>=45&&(p.partyRelations?.[q.id]?.feeling??0)>-3&&(q.partyRelations?.[p.id]?.feeling??0)>-3&&(p.agenda?.duty??0)>=.55&&(q.agenda?.curiosity??0)>=.45&&(p.agenda?.sociability??.5)>=.25&&(q.agenda?.sociability??.5)>=.25);
}
export function learnedPair(s,guard,striker){
 const a=s.people[guard]?.pairPractice?.partners[striker],b=s.people[striker]?.pairPractice?.partners[guard];
 return Boolean(a?.method===PAIR_METHOD&&b?.method===PAIR_METHOD&&a.guard===guard&&b.guard===guard&&a.striker===striker&&b.striker===striker);
}
