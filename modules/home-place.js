import {enabled} from '../rules.js';
import {roomAdmission,activeBooking} from './room-state.js';
export const homesOn=s=>enabled(s,'homes')&&enabled(s,'lodging')&&enabled(s,'interiors');
export function homeAdmission(s,a,id){
 if(a?.castleRoom)return a.castleRoom.owner===id&&roomAdmission(s,a,id);
 const h=a?.home,b=activeBooking(s,a,id);
 return Boolean(homesOn(s)&&h?.version===1&&h.state==='ready'&&h.tenant===id&&(a.residence?a.residence.owner===id&&h.owner===id:b?.payer===id&&b.owner===h.owner)&&roomAdmission(s,a,id));
}
export function homeWorkbenchSite(s,area,id=null){
 const a=typeof area==='string'?s.areas[area]:area;if(!a)return null;
 const rooms=a.interior?.kind==='room'?[a]:id?Object.values(s.areas).filter(r=>r.interior?.exterior===a.id):[];
 const room=rooms.find(r=>r.home?.version===1&&r.home.state==='ready'&&r.home.configuration==='bench'&&(!id||r.home.device===id));
 const object=room?.objects.find(o=>o.id===room.home.device&&o.kind==='homeBench');
 return object?{area:s.areas[room.interior.exterior],object,room,inside:true,home:true}:null;
}
export function homeCookingAllows(s,a,id){return !a?.home||a.home.configuration==='hearth'&&homeAdmission(s,a,id);}
