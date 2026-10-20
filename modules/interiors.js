import {areaScale,campPassage} from '../geometry.js';
import {enabled} from '../rules.js';
import {DAY_TICKS} from '../calendar.js';
import {npcController} from './npc-control.js';
import {revealArea} from '../actor-atlas.js';
import {roomAdmission,paidBuildingAdmission} from './room-state.js';
import {registerSpatialArea,registerSpatialEdge} from './spatial.js';
import {initializeWorkshopRooms} from './workshop-interiors.js';
import {workshopAdmission} from './workshop-place.js';

const names=['Медный ковш','Три фонаря','Тихий причал','Сухой башмак','Ивовая ветка','Кривой месяц'];
function hash(seed,key){let n=seed>>>0;for(const c of key)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;}
export function tavernIn(s,id){return s.areas[id]?.objects.find(o=>o.kind==='tavern')||null;}
export function initializeInteriors(s){
 if(!enabled(s,'interiors'))return;
 initializeWorkshopRooms(s);
 for(const a of Object.values(s.areas)){
  if(!a.city||a.interior||a.interiorsVersion)continue;
  a.interiorsVersion=1;
  if(a.id!==a.city)continue;
  const owner=Object.values(s.people).find(p=>p.alive&&p.area===a.id&&p.role==='Хозяин трактира');
  const seed=hash(s.seed,a.id+'/tavern');
  if(!owner||seed%4===0)continue;
  const id='a'+s.nextArea++,name=names[seed%names.length],building=a.facades?.profiles[0]?.id||null;
  const door={id:a.id+'-tavern',kind:'tavern',name:'Таверна «'+name+'»',owner:owner.id,x:20,state:'intact',hall:id,building,opens:20,closes:225,created:s.tick};
  a.objects.push(door);a.links.push(id);
  s.edges ||= {};s.edges[[a.id,id].sort().join('|')]={a:a.id,b:id,mode:'door',duration:0,cost:0};
  s.areas[id]={id,type:'hall',paletteVersion:2,name:door.name+' · общий зал',depth:a.depth,continent:a.continent,realm:a.realm,era:a.era,culture:a.culture,climate:a.climate,faction:a.faction,danger:0,expanded:true,discovered:false,visited:false,visits:0,links:[a.id],population:[],objects:[{id:id+'-exit',kind:'door',name:'На улицу',x:8,to:a.id}],interior:{version:1,parent:a.id,building:door.id,kind:'tavern'},forage:{stock:0,max:0,x:18,lastGrowth:s.tick,kind:'Внутри нет диких растений'}};
  registerSpatialArea(s,s.areas[id]);registerSpatialEdge(s,[a.id,id].sort().join('|'));
  // This pocket already has its empty projections. Do not mark other pending areas initialized.
  s.graphRevision=(s.graphRevision||0)+1;
 }
}
export function interiorBuilding(s,a){const inside=typeof a==='string'?s.areas[a]:a;return inside?.interior?s.areas[inside.interior.exterior||inside.interior.parent]?.objects.find(o=>o.id===inside.interior.building):null;}
export function tavernAvailable(s,door){
 if(!enabled(s,'interiors')||!door||door.state!=='intact'||door.closed)return false;
 const owner=s.people[door.owner],hall=s.areas[door.hall],parent=hall?.interior?.parent,hour=s.tick%DAY_TICKS;
 return Boolean(owner?.alive&&owner.health>0&&['resident','wandering'].includes(owner.status)&&[parent,door.hall].includes(owner.area)&&hour>=door.opens&&hour<door.closes);
}
export function interiorPassage(s,from,to,person=s.hero.lineage){
 const camp=campPassage(s,from,to,person);if(camp)return camp;
 const a=s.areas[from],b=s.areas[to];
 if(a?.interior?.parent===to){const door=interiorBuilding(s,a);return {x:8,arrival:a.interior.entrance??door?.x??20,allowed:true,exit:true};}
 if(b?.interior?.parent===from){const door=interiorBuilding(s,b);return {x:b.interior.entrance??door?.x??20,arrival:8,allowed:b.castleRoom?door?.state==='intact'&&roomAdmission(s,b,person):b.interior.kind==='workshop'?workshopAdmission(s,b,person):b.lodging?roomAdmission(s,b,person):tavernAvailable(s,door)||paidBuildingAdmission(s,door,person),exit:false};}
 return null;
}
export function tavernPlan(s,ctx){
 const h=s.hero,a=s.areas[h.area];
 if(a.interior){ctx.goal(s,'tavernLeave',a.interior.parent,a.interior.entrance??interiorBuilding(s,a)?.x??20,a.lodging?'Вернуться в общий зал':'Выйти на улицу','Он возвращается к той же двери и своим другим делам.');return true;}
 if(!enabled(s,'interiors')||(h.tavernAfter||0)>s.tick||h.personality.sociability<.55)return false;
 const door=tavernIn(s,a.id);if(!tavernAvailable(s,door))return false;
 revealArea(s,door.hall);
 ctx.goal(s,'tavernVisit',door.hall,50,'Посетить: '+door.name,'Открытый общий зал неподалёку. Можно побыть среди людей, прежде чем продолжить дела.',{remaining:3});return true;
}
export function tavernAction(s,ctx){
 const h=s.hero,g=h.goal,a=s.areas[h.area];
 if(g.kind==='tavernLeave'){h.goal=null;return;}
 if(!a.interior||!enabled(s,'interiors')||!tavernAvailable(s,interiorBuilding(s,a))){h.goal=null;h.tavernAfter=s.tick+240;return;}
 h.lastAction='idle';if(--g.remaining>0)return;
 const guests=Object.values(s.people).filter(p=>p.alive&&p.id!==h.lineage&&p.area===a.id&&Math.abs((p.x??50)-h.x)*areaScale(s.areas[h.area])<35);
 h.tavernAfter=s.tick+720;h.goal=null;
 if(ctx.hallConversation?.(s,ctx))return;
 ctx.log(s,guests.length?`${h.name} останавливается в общем зале. Здесь сейчас ${guests.length} посетителей; каждый пришёл со своими делами.`:`${h.name} заглядывает в тихий общий зал. Посетителей поблизости нет; он не задерживается.`,'life');
}
export function npcTavernPlan(s,p){
 if(npcController(s,p)!=='personal')return false;
 const a=s.areas[p.area],m=p.agenda;
 if(a.interior){m.task={kind:'tavernLeave',target:a.interior.parent,x:a.interior.entrance??interiorBuilding(s,a)?.x??20,remaining:1};p.status='wandering';return true;}
 if(!enabled(s,'interiors')||(m.tavernAfter||0)>s.tick)return false;
 const door=tavernIn(s,a.id),host=door?.owner===p.id;
 if(!tavernAvailable(s,door)||!host&&!(m.sociability>.6&&p.needs.loneliness>30))return false;
 m.task={kind:'tavernVisit',target:door.hall,x:host?76:40+(hash(s.seed,p.id)%22),remaining:1,host};p.status='wandering';return true;
}
export function npcTavernAction(s,p){
 const m=p.agenda,t=m.task;if(t.kind==='tavernVisit'){p.interiorStay={until:s.tick+(t.host?128:32),building:s.areas[p.area].interior?.building};m.tavernAfter=s.tick+(t.host?240:720);}
 else delete p.interiorStay;
 m.task=null;m.due=s.tick;p.status='resident';
}
export function npcInteriorStay(s,p){
 if(!p.interiorStay)return false;
 const a=s.areas[p.area],b=interiorBuilding(s,a);
 if(!a?.interior||!tavernAvailable(s,b)||s.tick>=p.interiorStay.until||p.needs.hunger>60||p.needs.energy<30){delete p.interiorStay;return false;}
 if(Object.values(s.people).some(other=>other.id!==p.id&&other.alive&&other.area===p.area&&Math.abs((other.x??50)-p.x)*areaScale(s.areas[p.area])<35))p.needs.loneliness=Math.max(0,p.needs.loneliness-1);
 return true;
}
