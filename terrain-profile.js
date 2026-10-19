import {areaEnvironment} from './area-environment.js';

// Eight visual families, no world discovery or new physical obstacles.
export const TERRAIN_FAMILIES=Object.freeze({road:'open',camp:'open',forest:'forest',desert:'relief',mountain:'relief',port:'coast',island:'coast',sea:'sea',village:'settlement',citadel:'settlement',ruins:'settlement',cave:'underground',dungeon:'underground',undercity:'underground',dream:'strange',clockwork:'strange'});
export function terrainProfile(s,area){
 const a=areaEnvironment(s,area),type=a.type,family=TERRAIN_FAMILIES[type]||'open';
 const forest=family==='forest';
 return {type,family,trees:forest?7:['road','camp','village','ruins','island'].includes(type)?3:0,
  relief:type==='mountain'?'ledge':type==='desert'?'dune':['sea','port','island'].includes(type)?'flat':family==='underground'?'ceiling':family==='strange'?'bands':'low',
  shore:family==='coast',pier:type==='port',
  // Existing domain painters own their real rule/mechanism. No invented effects.
  motif:type==='dream'&&a.localRule&&s.rules?.['place-rules']!==false?a.localRule.kind:null};
}
export function terrainRidge(profile,x,layer,view){
 const phase=x/(100+layer*30)+layer*2+view.offset;
 if(profile.relief==='flat'||profile.relief==='ceiling')return 8+layer*4;
 if(profile.relief==='dune')return 14+layer*5+Math.sin(phase)*9;
 if(profile.relief==='ledge')return 24+(2-layer)*15+Math.round(Math.sin(phase)*3)*8;
 if(profile.relief==='bands')return 20+layer*12+Math.sin(phase)*4;
 return 17+layer*8+Math.sin(phase)*Math.min(12,view.relief*.4);
}
export function paintTerrainBackdrop(c,profile,w,ground,p){
 c.save();
 if(profile.shore){
  c.fillStyle='#3d687a';c.fillRect(0,ground-29,w,22);
  c.strokeStyle='#a5bdb6';c.lineWidth=1;
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(0,ground-25+i*7);c.lineTo(w,ground-25+i*7);c.stroke();}
  c.fillStyle=p[3];c.beginPath();c.moveTo(0,ground-9);c.quadraticCurveTo(w*.5,ground-2,w,ground-11);c.lineTo(w,ground);c.lineTo(0,ground);c.fill();
  if(profile.pier){c.fillStyle='#8e8262';c.fillRect(w*.68,ground-15,w*.23,4);for(let i=0;i<4;i++)c.fillRect(w*(.7+i*.06),ground-11,3,10);}
 }
 if(profile.family==='underground'){
  c.fillStyle=p[3];c.beginPath();c.moveTo(0,0);c.lineTo(w,0);
  for(let x=w;x>=0;x-=24)c.lineTo(x,18+Math.abs(Math.sin(x/43))*13);
  c.closePath();c.fill();
  // Supports stay in the background, leaving the entire actor line clear.
  if(profile.type!=='cave')for(const f of [.08,.92]){c.fillRect(w*f-8,25,16,Math.max(0,ground-38));c.fillRect(w*f-14,29,28,7);}
 }
 c.restore();
}
export function facadeSmoke(s,a,profile){
 const workshop=a.objects?.find(o=>o.kind==='workshop'&&o.building===profile.id);
 if(workshop?.state==='burned')return false;
 return Boolean(profile.smoke);
}
