import {registerSpatialArea,registerSpatialEdge} from './spatial.js';
import {workshopInteriorsOn,workshopSite,ownedWorkshopSite} from './workshop-place.js';
import {revealArea} from '../actor-atlas.js';
import {workToolReady} from './workshop-tool-state.js';

export function initializeWorkshopRooms(s){
 if(!workshopInteriorsOn(s))return;
 for(const a of Object.values(s.areas)){
  if(a.interior)continue;
  for(const o of a.objects){
   if(o.kind!=='workshop'||o.workshopInterior||o.state!=='intact'||!s.people[o.owner]?.alive)continue;
   const id='a'+s.nextArea++;
   o.workshopInterior={version:1,area:id,created:s.tick,origin:'existing-workshop'};
   const room={id,type:'hall',paletteVersion:2,name:o.name+' · рабочая комната',length:100,depth:a.depth,continent:a.continent,realm:a.realm,era:a.era,culture:a.culture,climate:a.climate,faction:a.faction,danger:0,expanded:true,discovered:false,visited:false,visits:0,links:[a.id],population:[],objects:[{id:id+'-exit',kind:'door',name:'На улицу',x:8,to:a.id},{id:id+'-bench',kind:'workbench',name:'Рабочий верстак',x:68,property:o.id}],interior:{version:1,kind:'workshop',parent:a.id,building:o.id,entrance:o.x,station:68},forage:{stock:0,max:0,x:18,lastGrowth:s.tick,kind:'В мастерской нет диких растений'}};
   s.areas[id]=room;if(!a.links.includes(id))a.links.push(id);
   const key=[a.id,id].sort().join('|');s.edges ||= {};s.edges[key]={a:a.id,b:id,mode:'door',duration:0,cost:0};
   registerSpatialArea(s,room);registerSpatialEdge(s,key);
   s.graphRevision=(s.graphRevision||0)+1;
  }
 }
}

const toolWork=new Set(['toolInspect','toolFit','toolInstall']);
function leave(s,site,ctx,reason){
 const h=s.hero;h.workAfter=s.tick+48;
 if(site?.room?.id===h.area)ctx.goal(s,'tavernLeave',site.area.id,site.object.x,'Выйти из мастерской',reason);
 else h.goal=null;
 ctx.log(s,reason,'work');return false;
}
export function workshopWorkTarget(s,ctx){
 const h=s.hero,g=h.goal,here=workshopSite(s,h.area);
 if(here?.inside&&!here.home&&!workshopInteriorsOn(s))return g?.kind==='tavernLeave'&&g.area===here.area.id?true:leave(s,here,ctx,'Работа в помещении прекращена. Выход на прежнюю улицу остаётся.');
 if(!g||!(g.kind==='work'&&g.job==='repair'||g.kind==='craftStudy'||g.kind==='forgeWork'||toolWork.has(g.kind)))return true;
 const id=g.workplace?.id||g.workspace?.id||g.property||g.tool||g.workshop?.id;
 const destination=g.workshop?.area||g.workplace?.area||(toolWork.has(g.kind)?h.toolTask?.area:null)||g.area;
 const site=workshopSite(s,destination,id);
 if(!workshopInteriorsOn(s)||!site?.room)return true;
 if(h.area!==site.area.id&&h.area!==site.room.id)return true;
 const o=site.object,owner=s.people[o.owner],isTool=toolWork.has(g.kind);
 if(o.state!=='intact'||o.closed||!owner?.alive||owner.health<=0||isTool&&o.owner!==h.lineage)return leave(s,site,ctx,'Рабочее место больше недоступно. Начатая услуга прекращена; вещи и знания остаются при владельцах.');
 if(g.workspace?.kind==='lease'&&g.workspace.owner!==o.owner||g.workspace?.kind==='owner'&&o.owner!==h.lineage)return leave(s,site,ctx,'Право на рабочее место изменилось. Прежнее разрешение больше не действует.');
 if(!isTool&&!workToolReady(s,o))return leave(s,site,ctx,'Зажим сломан. Работу у верстака придётся отложить до настоящего ремонта.');
 g.workshop={id:o.id,area:site.area.id,room:site.room.id};
 // A visitor may enter to meet the host, but an open door is not paid bench use.
 const meetInside=h.area===site.area.id&&o.owner!==h.lineage&&owner.area===site.room.id;
 if(!isTool&&!meetInside){
  const access=ctx.workspaceAccess(s);
  if(access==='approach')return true;
  if(access==='leased')return false;
  if(access!=='ready')return leave(s,site,ctx,'Доступ к рабочему месту не получен. Он возвращается к другим делам.');
 }
 revealArea(s,site.room);g.area=site.room.id;g.x=site.room.interior.station;return true;
}

export function npcWorkshopTarget(s,p){
 const m=p.agenda;if(!m)return;
 const here=workshopSite(s,p.area),t=m.task;
 const evacuate=site=>{m.task={kind:'tavernLeave',target:site.area.id,x:site.object.x,remaining:1};p.status='wandering';};
 if(here?.inside&&!here.home&&(!workshopInteriorsOn(s)||here.object.state!=='intact'||here.object.closed||!s.people[here.object.owner]?.alive)){evacuate(here);return;}
 if(!t||!(t.kind==='work'&&m.job==='artisan'||['craftStudy','toolMend','forgeWork','refitBench','itemRepairBench'].includes(t.kind)))return;
 const site=t.workshop?.id||t.property?workshopSite(s,t.workshop?.area||t.target,t.workshop?.id||t.property):ownedWorkshopSite(s,t.target,p.id);
 if(!workshopInteriorsOn(s)||!site?.room)return;
 if(site.object.owner!==p.id&&!t.workshop)return;
 if(site.object.owner!==p.id||site.object.state!=='intact'||site.object.closed||t.kind!=='toolMend'&&!workToolReady(s,site.object)){
  if(here?.inside)evacuate(here);else{m.task=null;m.due=s.tick+48;}return;
 }
 t.workshop={id:site.object.id,area:site.area.id,room:site.room.id};t.target=site.room.id;t.x=site.room.interior.station;
 p.status=p.area===t.target?'resident':'wandering';
}
