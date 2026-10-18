import {homeWorkbenchSite} from './home-place.js';
import {enabled} from '../rules.js';

// The exterior object remains the sole property/tool/history authority. A pocket
// contains a reference to that object, never a second workshop or civic stock.
export const workshopInteriorsOn=s=>enabled(s,'workshop-interiors')&&enabled(s,'interiors')&&enabled(s,'property');
export function workshopSite(s,area,id=null){
 const a=typeof area==='string'?s.areas[area]:area;if(!a)return null;
 const home=homeWorkbenchSite(s,a,id);if(home)return home;
 const inside=a.interior?.kind==='workshop',exterior=inside?s.areas[a.interior.parent]:a;
 const object=exterior?.objects.find(o=>o.kind==='workshop'&&(!id||o.id===id)&&(!inside||o.id===a.interior.building));
 if(!object)return null;
 const candidate=s.areas[object.workshopInterior?.area],room=candidate?.interior?.kind==='workshop'&&candidate.interior.parent===exterior.id&&candidate.interior.building===object.id?candidate:null;
 return {area:exterior,object,room,inside};
}
export function workshopPosition(s,area,object){
 const site=workshopSite(s,area,object?.id);if(site?.home)return {area:site.room.id,x:site.object.x};
 return workshopInteriorsOn(s)&&site?.room?{area:site.room.id,x:site.room.interior.station??68}:{area:site?.area.id??(typeof area==='string'?area:area.id),x:object?.x??42};
}
export function ownedWorkshopSite(s,area,person){
 const a=typeof area==='string'?s.areas[area]:area;if(!a)return null;
 if(a.interior?.kind==='workshop'){const site=workshopSite(s,a);return site?.object.owner===person?site:null;}
 const object=a.objects.find(o=>o.kind==='workshop'&&o.owner===person);
 return object?workshopSite(s,a,object.id):null;
}
export function workshopHostPresent(s,site){
 const p=s.people[site?.object.owner];return Boolean(p?.alive&&p.health>0&&['resident','wandering'].includes(p.status)&&[site.area.id,site.room?.id].includes(p.area));
}
export function workshopSheltered(s,area){return area?.interior?.kind!=='workshop'||workshopSite(s,area)?.object.state==='intact';}
export function workshopAdmission(s,inside,person){
 const site=workshopSite(s,inside),p=s.people[person],h=s.hero.lineage===person?s.hero:s.actorStates?.[person],lease=h?.goal?.workspace,o=site?.object;
 const paid=lease?.id===o?.id&&lease.kind==='lease'&&lease.owner===o.owner&&lease.until>=s.tick;
 return Boolean(workshopInteriorsOn(s)&&site?.room===inside&&o.state==='intact'&&!o.closed&&p?.alive&&s.people[o.owner]?.alive&&s.people[o.owner].health>0&&(o.owner===person||paid||workshopHostPresent(s,site)));
}
