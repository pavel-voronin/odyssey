import {castleAdmissionBasis} from './castle-state.js';
import {residenceAdmission} from './residence-access.js';
import {buildingRoomSound} from './building-condition.js';
import {enabled} from '../rules.js';
export const ROOM_POLICY={price:3,capacity:2,duration:240};
export function activeBooking(s,room,person=null){
 const r=room?.lodging?.booking;
 if(!r||r.status!=='booked'||r.until<=s.tick)return null;
 if(person&&(!r.occupants.includes(person)||!s.people[person]?.alive||s.people[person].health<=0))return null;
 return r;
}
export function roomAdmission(s,room,person){
 if(room?.castleRoom){if(!castleAdmissionBasis(s,room,person))return false;const h=s.hero?.lineage===person?s.hero:s.actorStates?.[person];return !(h?.companions||[]).some(c=>c.person&&s.people[c.person]?.alive&&!castleAdmissionBasis(s,room,c.person));}
 if(room?.residence){if(!residenceAdmission(s,room,person))return false;const h=s.actorStates?.[person]||(s.hero?.lineage===person?s.hero:null);return !(h?.companions||[]).some(c=>c.person&&s.people[c.person]?.alive&&!room.residence.occupants.includes(c.person));}
 if(!enabled(s,'lodging')||!enabled(s,'interiors')||room?.lodging?.state!=='intact'||!buildingRoomSound(s,room))return false;
 const r=activeBooking(s,room,person);if(!r)return false;
 const followers=enabled(s,'companions')?(s.actorStates?.[person]?.companions||[]).filter(c=>c.person&&s.people[c.person]?.alive):[];
 return followers.every(c=>r.occupants.includes(c.person));
}
export function paidBuildingAdmission(s,door,person){return door?.state==='intact'&&roomAdmission(s,s.areas[door?.room],person);}

export function roomAdmissionBasis(s,room,id){if(!roomAdmission(s,room,id))return null;return room.castleRoom?castleAdmissionBasis(s,room,id):{kind:room.residence?'residence-owner':'paid-booking',room:room.id};}
