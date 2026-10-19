import {enabled} from '../rules.js';
export function residenceAdmission(s,room,id){
 const r=room?.residence;if(!['homes','interiors','lodging'].every(k=>enabled(s,k))||r?.state!=='ready'||!s.people[id]?.alive||!r.occupants.includes(id))return false;
 const a=s.areas[room.interior.parent],p=a?.dwellingPlot,house=p?.house,profile=a?.facades?.profiles.find(b=>b.id===house?.building);
 return Boolean(profile&&house?.room===room.id&&house.owner===r.owner&&s.people[r.owner]?.alive&&(!profile.structure||profile.structure.roof>=2&&profile.structure.walls>=2));
}
