import {enabled} from './rules.js';
import {isTown} from './modules/common.js';
import {areaEnvironment} from './area-environment.js';
import {workshopSheltered} from './modules/workshop-place.js';
export const LIGHT_BUDGET=3;
export const SHADOW_BUDGET=36;
export const CHARM_LIGHT_COLORS={blessing:'#ddd18a',time:'#afc5d6',curse:'#c984a0',luck:'#c7c88d',healing:'#91c1a2',spirit:'#a9aed2',explore:'#a3b8bd',greed:'#c1a577'};
export function sceneLights(s,a,{width,height,ground,view,night,heroX,backGround,occupied:actualOccupied}){
  if(!enabled(s,'lighting'))return {sky:null,local:[],fixtures:[]};
  const complete=enabled(s,'source-shadows');
  const terrain=areaEnvironment(s,a),covered=workshopSheltered(s,a),underground=Boolean(terrain.interior)&&covered||['cave','dungeon','undercity'].includes(terrain.type)||terrain.realm==='underground',local=[],fixtures=[];
  const occupied=actualOccupied??(a.population||[]).some(id=>s.people[id]?.alive&&s.people[id].status==='resident'),back=backGround??ground;
  const point=(id,kind,x,y,range,color,priority,active=true)=>{const light={id,kind,x,y,range,color,priority,active,...(backGround===undefined?{}:{baseY:['torch','lantern','hanging'].includes(kind)||id==='forge'?back:ground})};if(['torch','lantern','hanging'].includes(kind))fixtures.push(light);if(active)local.push(light);};
  if(a.type==='camp')for(const o of a.objects.filter(o=>o.kind==='rest'))point(o.id,'fire',24+o.x/100*(width-48),ground-12,85,'#edb77b',100);
  if(a.interior)point('room-lamp','hanging',width*.46,49,complete?170:105,'#dfc48b',90,covered);
  else if(underground&&a.type!=='camp'){point('wall-left','torch',width*.18,back-(complete?70:48),complete?125:90,'#d9b57b',70,!isTown(a)||occupied);point('wall-right','torch',width*.77,back-(complete?70:48),complete?125:90,'#d9b57b',70,!isTown(a)||occupied);}
  if(isTown(a)&&!underground){
    if(a.district==='Мастерские'&&occupied)point('forge','forge',width*.5+10,back-30,70,'#e7a76f',90);
    point('street-left','lantern',width*.12,back-(complete?80:47),complete?150:85,'#dfc48b',70,night&&occupied);if(a.district!=='Жилой посад')point('street-right','lantern',width*.87,back-(complete?80:47),complete?150:85,'#dfc48b',70,night&&occupied);
  }
  if(a.type==='sea')point('ship-lamp','hanging',width*.56,back-46,80,'#dfc48b',70,night);
  if(enabled(s,'body')&&s.hero.conditions.some(c=>c.id==='blessing'&&c.until>s.tick))point('blessing','magic',heroX,ground-28,50,'#a9c8d6',60);
  if(enabled(s,'source-shadows')){
    for(const light of local)if(light.id==='blessing')light.owner=s.hero.lineage;
    const charm=s.hero.alive&&enabled(s,'equipment')&&enabled(s,'enchantments')&&s.hero.equipment?.charm,color=CHARM_LIGHT_COLORS[charm?.modifier];
    if(color){point('charm-glow','magic',heroX+4,ground-23,14,color,40);local.at(-1).owner=s.hero.lineage;}
  }
  for(const o of a.objects.filter(o=>o.kind==='gate'&&['portal','time'].includes(o.mode)))point(o.id,'rift',24+o.x/100*(width-48),ground-24,65,'#b8a6d5',50);
  local.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  return {sky:underground?null:{kind:night?'moon':'sun',x:width*view.sunX,y:height*view.sunY},local:complete?local:local.slice(0,LIGHT_BUDGET),fixtures:complete?fixtures:fixtures.slice(0,LIGHT_BUDGET)};
}
export function shadowShape(caster,source,ground){
  const ratio=Math.min(4,Math.max(.12,caster.height/Math.max(18,ground-source.y-caster.height)));
  const length=Math.max(-120,Math.min(120,(caster.x-source.x)*ratio)),depth=4+Math.abs(length)*.055,half=caster.width/2;
  return {points:[[caster.x-half,ground],[caster.x+half,ground],[caster.x+length+half*.65,ground+depth],[caster.x+length-half*.65,ground+depth]],blur:source.kind==='sun'?4:source.kind==='moon'?0:1};
}
