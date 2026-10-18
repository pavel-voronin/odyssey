import {gratePassage} from './modules/mechanism-policy.js';
import {liftPassage} from './modules/lift-policy.js';
// Saved x remains a percentage of one area. Physical budgets and radii use these units.
export function areaScale(area){return Number.isFinite(area?.length)&&area.length>0?Math.max(.5,Math.min(6,area.length/100)):1;}
export function physicalDistance(area,from,to){return Math.abs(to-from)*areaScale(area);}
export function areaOffset(area,units){return units/areaScale(area);}
export function areaStep(area,from,to,budget){return Math.sign(to-from)*Math.min(Math.abs(to-from),areaOffset(area,budget));}
const percentage=x=>Number.isFinite(x)&&x>=0&&x<=100;
export function campLink(s,from,to){return (!s.areas[from]?.temporaryCamp||s.areas[from].temporaryCamp.parent===to)&&(!s.areas[to]?.temporaryCamp||s.areas[to].temporaryCamp.parent===from);}
// One physical side passage. Personal-mode entry records come only from a
// real pitch with the module OFF; an absent record cannot invent an exit.
export function campPassage(s,from,to,person=s.hero?.lineage,{carrier=false,knowledge=true}={}){
 const barrier=gratePassage(s,from,to);if(barrier)return barrier;
 const lift=liftPassage(s,from,to);if(lift)return lift;
 const a=s.areas[from],b=s.areas[to],exit=a?.temporaryCamp?.parent===to,camp=exit?a:b?.temporaryCamp?.parent===from?b:null;
 if(!camp)return a?.temporaryCamp||b?.temporaryCamp?{kind:'camp',camp:(a.temporaryCamp?a:b).id,x:null,arrival:null,exit:false,allowed:false,precision:'unknown'}:null;
 const site=camp.temporaryCamp.site;
 if(site?.version===1&&site.parent===camp.temporaryCamp.parent&&percentage(site.parentX)&&percentage(site.localEntry)){
  const h=s.hero?.lineage===person?s.hero:s.actorStates?.[person],p=s.people?.[person],body=h&&h.actorMode!=='npc'?h:p,remembered=h?.campSites?.[camp.id],record=p?.navigation?.places?.find(e=>e.area===camp.id)?.campSite;
  const known=!knowledge||remembered?.parent===site.parent&&remembered.x===site.parentX||record?.parent===site.parent&&record.x===site.parentX||body?.area===site.parent&&physicalDistance(s.areas[site.parent],body.x,site.parentX)<=18;
  return {kind:'camp',camp:camp.id,x:exit?site.localEntry:site.parentX,arrival:exit?site.parentX:site.localEntry,exit,allowed:exit||!carrier&&Boolean(known),precision:'exact',known:Boolean(known)};
 }
 if(site)return {kind:'camp',camp:camp.id,x:null,arrival:null,exit,allowed:false,precision:'unknown'};
 if(!exit)return {kind:'camp',camp:camp.id,x:null,arrival:null,exit:false,allowed:false,precision:'unknown'};
 const h=s.hero?.lineage===person?s.hero:s.actorStates?.[person],p=s.people?.[person],actual=camp.temporaryCamp.mode==='personal'?camp.temporaryCamp.returns?.[person]:null;
 if(!actual||!percentage(actual.parentX)||!percentage(actual.localEntry))return {kind:'camp',camp:camp.id,x:null,arrival:null,exit:true,allowed:false,precision:'unknown'};
 const present=h?.actorMode!=='npc'&&h?.area===from||p?.area===from||h?.personPosition?.area===from;
 return {kind:'camp',camp:camp.id,x:actual.localEntry,arrival:actual.parentX,exit:true,allowed:Boolean(present),precision:'recorded',source:'current-personal-entry'};
}
export function routeDistance(s,path){
 if(path.some((id,i)=>s.areas[id]?.temporaryCamp&&i>0&&i<path.length-1)||path.slice(1).some((id,i)=>!campLink(s,path[i],id)))return Infinity;
 if(!path.some(id=>s.areas[id]?.temporaryCamp?.site))return path.slice(1).reduce((sum,id,i)=>sum+50*(areaScale(s.areas[path[i]])+areaScale(s.areas[id])),0);
 let x=50,total=0;for(let i=0;i<path.length;i++){const a=s.areas[path[i]],next=path[i+1],p=next&&campPassage(s,a.id,next,s.hero?.lineage,{knowledge:false}),to=p?p.x:next?(Number(next.slice(1))>Number(a.id.slice(1))?100:0):50;if(p&&!p.allowed)return Infinity;total+=physicalDistance(a,x,to);if(next)x=p?p.arrival:to===100?5:95;}return total;
}
