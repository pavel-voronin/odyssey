import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {roomAdmission} from './room-state.js';
import {bookFund,librariesOn,libraryPosition} from './library-state.js';
export const librarySecurityOn=s=>enabled(s,'library-security')&&librariesOn(s);
export const libraryDeskOpen=(s,a)=>{const q=bookFund(a)?.security;return !q||s.tick%240>=q.opens&&s.tick%240<q.closes;};
export const activeBookTheft=i=>i?.libraryTheft?.version===1&&i.libraryTheft.returned===null;
export function libraryGuard(s,a){const q=bookFund(a)?.security,p=s.people[q?.guard],d=p?.libraryDuty,b=p?.alive&&libraryPosition(s,p);return librarySecurityOn(s)&&q&&q.until>s.tick&&d?.stage==='watching'&&d.room===a.id&&d.until===q.until&&p.health>=(p.maxHealth||100)*.6&&!p.needs.sleeping&&p.needs.energy>=20&&b&&!b.transit&&b.area===a.id&&physicalDistance(a,b.x,56)<=6&&roomAdmission(s,a,p.id)?p:null;}
export function libraryDeskAllows(s,a,id){const f=bookFund(a),q=f?.security;if(!q||!librarySecurityOn(s)||f.owner===id)return true;return !q.locked&&libraryDeskOpen(s,a)&&Boolean(libraryGuard(s,a))&&!q.banned.some(n=>n.person===id);}
