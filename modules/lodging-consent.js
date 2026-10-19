import {enabled} from '../rules.js';
import {humanParty} from './party-needs.js';
export function partyRoomConsent(s,h=s.hero){
 const party=enabled(s,'companions')?humanParty(s):[];
 if(party.some(c=>c.loyalty<45||c.ethics>0&&h.alignment<-20||c.ethics<0&&h.alignment>35||s.people[c.person]?.needs.hunger>=65))return null;
 return [h.lineage,...party.map(c=>c.person)];
}
