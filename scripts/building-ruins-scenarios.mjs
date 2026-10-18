import {initializeWorkshopRooms} from '../modules/workshop-interiors.js';
import {createWorld,route,knownRoute} from '../engine.js';
import {MODULES,setModule} from '../rules.js';
import {workshopAt,observeProperty} from '../modules/property.js';
import {buildingRuinsTick} from '../modules/building-ruins.js';
import {DAY_TICKS} from '../calendar.js';
export const ruinsContext={route,knownRoute,observeProperty,random:()=>0,log(){},goal(s,kind,area,x,intent,reason,extra={}){s.hero.goal={kind,area,x,started:s.tick,...extra};}};
export function ruinsFixture(){
 const s=createWorld(0);for(const m of MODULES)setModule(s,m.id,['building-ruins','facades','property','property-damage','interiors','workshop-interiors','identity','equipment','item-originals'].includes(m.id));
 const h=s.hero,a=Object.values(s.areas).find(a=>a.district==='Мастерские'),o=workshopAt(s,a),p=s.people[o.owner],profile=a.facades.profiles.find(p=>p.id===o.building);initializeWorkshopRooms(s);const room=s.areas[o.workshopInterior.area];
 for(const q of Object.values(s.people))if(q.area===a.id||s.areas[q.area]?.interior?.parent===a.id){q.area='a1';q.status='absent';}
 h.area='a1';h.x=42;h.goal=null;h.combat=null;h.hp=h.maxHp;h.energy=100;h.hunger=0;
 return {s,h,a,o,p,profile,room};
}
// Each call is one isolated daily check, never a simulated life or all ticks of a day.
export function emptyDays(f,n){for(let i=0;i<n;i++){f.s.tick=(Math.floor(f.s.tick/DAY_TICKS)+1)*DAY_TICKS;buildingRuinsTick(f.s,ruinsContext);}return f;}
