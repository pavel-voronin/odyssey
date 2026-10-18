import {climateId} from './calendar.js';
import {areaEnvironment} from './area-environment.js';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function sceneComposition(s,a,width,height){
  a=areaEnvironment(s,a);
  const root=s.areas[a.city]||a,near=[...(a.links||[]),...(root.links||[])].map(id=>s.areas[id]).filter(Boolean);
  const occupied=(a.population||[]).some(id=>{const p=s.people[id];return p?.alive&&p.area===a.id&&p.status==='resident';});
  const underground=a.realm==='underground'||['cave','dungeon','undercity'].includes(a.type),coast=a.type==='port'||near.some(n=>n.type==='sea'),alpine=climateId(s,a)==='alpine'||a.type==='mountain'||near.some(n=>n.type==='mountain');
  const ruined=a.type==='ruins'||!occupied&&a.objects.some(o=>o.kind==='workshop'&&o.state==='burned');
  const kind=underground?'underground':ruined?'ruins':coast?'waterfront':alpine?'alpine':'inland',front=height*.76,back=Math.max(0,front-clamp(height*.1,8,20));
  return {kind,occupied,coast,alpine,underground,ruined,quiet:Boolean(a.city&&!occupied),width,height,actorGround:front,buildingGround:back,surface:{back,front:height,width,depth:height-back},cargo:Math.max(0,Math.min(5,Math.ceil(((a.civic?.food||0)+(a.civic?.tools||0)*6)/20)))};
}
export function surfaceShadow(caster,source,surface){
  const y=caster.y,height=Math.max(1,caster.height),sky=['sun','moon'].includes(source.kind),elevation=Math.max(18,y-source.y),factor=Math.min(3,height/Math.max(18,elevation-height*.35));
  const lightFoot=sky?surface.back-Math.max(16,(surface.back-source.y)*.3):(source.baseY??surface.back);
  const dx=clamp((caster.x-source.x)*factor,-Math.min(150,surface.width*.4),Math.min(150,surface.width*.4)),dy=clamp((y-lightFoot)*factor,-surface.depth*.65,surface.depth*.8),depth=Math.max(3,Math.min(8,height*.09)),farY=clamp(y+dy+depth,surface.back,surface.front-1),half=caster.width/2;
  return {points:[[caster.x-half,y],[caster.x+half,y],[caster.x+dx+half*.7,farY],[caster.x+dx-half*.7,farY]],blur:source.kind==='sun'?3.5:source.kind==='moon'?0:1};
}
export function surfaceShadowAlpha(x,source,nearest,skyKind){
  const coverage=nearest?clamp(1-Math.abs(x-nearest.x)/nearest.range,0,1):0;
  if(source.kind==='sun')return .15*(1-coverage*.15);
  if(source.kind==='moon')return .28*(1-coverage*.65);
  return .23*coverage*(skyKind==='sun'?.35:1);
}
export function projectedCaster(caster,matrix,dpr){
  if(!matrix||!Number.isFinite(matrix.a))return caster;
  return {x:(matrix.a*caster.x+matrix.c*caster.y+matrix.e)/dpr,y:(matrix.b*caster.x+matrix.d*caster.y+matrix.f)/dpr,width:caster.width*Math.hypot(matrix.a,matrix.b)/dpr,height:caster.height*Math.hypot(matrix.c,matrix.d)/dpr};
}
