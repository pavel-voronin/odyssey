// Pure physical predicates. No projection/action/constructor imports: all services share this gate.
export const buildingControlOn=s=>s.rules?.['building-control']!==false&&s.rules?.property!==false;
const scale=a=>Number.isFinite(a?.length)?Math.max(.5,Math.min(6,a.length/100)):1;
const distance=(a,x,y)=>Math.abs(x-y)*scale(a);
export function controlSite(s,area,object=null){const a=typeof area==='string'?s.areas[area]:area;if(!a)return null;const root=a.interior?.kind==='workshop'?s.areas[a.interior.parent]:a,o=object||root?.objects.find(o=>o.kind==='workshop'&&(!a.interior||o.id===a.interior.building));return root&&o?.kind==='workshop'?{area:root,object:o,room:s.areas[o.workshopInterior?.area]}:null;}
function dangerous(s,e){const p=e?.person&&s.people[e.person];return e?.kind==='enemy'&&e.shape==='human'&&e.alive&&e.hp>0&&!e.resolved&&!e.pacified&&!e.hidden&&e.attack>=2&&(!p||p.alive&&p.enemyBody?.stage==='hostile');}
export function controllingThreat(s,area,object=null){if(!buildingControlOn(s))return null;const site=controlSite(s,area,object);if(!site)return null;const {area:a,object:o,room}=site;
 for(const place of [a,room].filter(Boolean))for(const e of place.objects){if(!dangerous(s,e))continue;
  if(place===a){const nearest=a.objects.filter(q=>q.kind==='workshop'&&distance(a,q.x,e.x)<=9).sort((x,y)=>distance(a,x.x,e.x)-distance(a,y.x,e.x)||x.id.localeCompare(y.id))[0];if(nearest!==o)continue;}
  else if(distance(place,e.x,place.interior.station??68)>9&&distance(place,e.x,8)>9)continue;
  return {enemy:e,place,site};
 }return null;
}
export const controlBlocked=(s,area,object=null)=>Boolean(controllingThreat(s,area,object));
