import {enabled} from '../rules.js';
export const ROOM_POLICY={price:3,capacity:2,duration:240};
export function activeBooking(s,room,person=null){
 const r=room?.lodging?.booking;
 if(!r||r.status!=='booked'||r.until<=s.tick)return null;
 if(person&&(!r.occupants.includes(person)||!s.people[person]?.alive||s.people[person].health<=0))return null;
 return r;
}
export function roomAdmission(s,room,person){
 if(!enabled(s,'lodging')||!enabled(s,'interiors')||room?.lodging?.state!=='intact')return false;
 const r=activeBooking(s,room,person);if(!r)return false;
 const followers=enabled(s,'companions')?(s.actorStates?.[person]?.companions||[]).filter(c=>c.person&&s.people[c.person]?.alive):[];
 return followers.every(c=>r.occupants.includes(c.person));
}
export function paidBuildingAdmission(s,door,person){return door?.state==='intact'&&roomAdmission(s,s.areas[door?.room],person);}
