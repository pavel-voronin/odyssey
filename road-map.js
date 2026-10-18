import {spatialAddress,spatialPassage,actorSpatialAddress} from './modules/spatial.js';
import {knownArea,knownRoad} from './actor-atlas.js';

// A view of personal knowledge, never a navigation command or a second simulation.
export function roadMapModel(s){
 const h=s.hero,a=s.areas[h.area];
 if(!h.alive||h.life?.ended||h.combat||h.transit||h.lastAction!=='walk'||!a||a.interior||a.temporaryCamp||a.dungeon||!['road','forest','desert','mountain','island'].includes(a.type)||h.goal?.area===a.id)return null;
 const address=actorSpatialAddress(s);if(address.status!=='known'||!address.point||address.precision!=='scene')return null;
 const ids=h.atlas.known,nodes=[],roads=[],seen=new Set();
 for(const id of ids){const place=s.areas[id];if(!place||!knownArea(s,id)||place.spatial?.attachment||place.spatial?.layer!==address.layer)continue;const p=spatialAddress(s,id,50);if(p.status!=='known')continue;const start=spatialAddress(s,id,0),end=spatialAddress(s,id,100);nodes.push({id,name:place.name,type:place.type,point:p.point,segment:[start.point,end.point],revision:place.spatial.revision});seen.add(id);}
 if(!seen.has(a.id))return null;
 for(const node of nodes)for(const to of s.areas[node.id].links){if(node.id>=to||!seen.has(to)||!knownRoad(s,node.id,to))continue;const p=spatialPassage(s,[node.id,to].sort().join('|'));if(p.status!=='known')continue;roads.push({id:p.id,kind:p.kind,ends:p.ends.map(e=>e.address.point)});}
 const topology=JSON.stringify([s.seed,address.layer,nodes,roads]);return {scheme:'schematic-v1',layer:address.layer,area:a.id,nodes,roads,topology,marker:{...address.point,name:h.name,actor:h.lineage,localX:h.x,facing:h.facing}};
}

export class RoadMapRenderer{
 constructor({createCanvas=()=>document.createElement('canvas')}={}){this.createCanvas=createCanvas;this.scale=1;this.offset={x:0,y:0};this.model=null;this.cacheKey=null;this.background=null;this.builds=0;}
 update(s){const next=roadMapModel(s),identity=next&&`${s.seed}/${next.marker.actor}/${next.layer}/${next.area}`;if(this.identity!==identity){this.identity=identity;this.offset={x:0,y:0};this.scale=1;this.focus=next?{x:next.nodes.find(n=>n.id===next.area).point.x+25,y:next.marker.y}:null;}this.model=next;return next;}
 pan(dx,dy){if(!this.model)return;this.offset.x-=dx/this.scale;this.offset.y-=dy/this.scale;}
 zoom(factor){if(!this.model)return;this.scale=Math.max(.4,Math.min(2.5,this.scale*factor));}
 follow(){this.offset={x:0,y:0};if(this.model)this.focus={x:this.model.marker.x,y:this.model.marker.y};}
 project(p,width,height){return {x:width/2+(p.x-this.focus.x-this.offset.x)*this.scale,y:42+Math.max(0,height-78)/2+(p.y-this.focus.y-this.offset.y)*this.scale};}
 draw(c,width,height,dpr=1){
  const m=this.model;if(!m)return null;
  const cacheKey=JSON.stringify([m.topology,width,height,dpr,this.scale,this.focus,this.offset]);
  if(this.cacheKey!==cacheKey){this.background ||= this.createCanvas();this.background.width=Math.round(width*dpr);this.background.height=Math.round(height*dpr);const b=this.background.getContext('2d');b.setTransform(dpr,0,0,dpr,0,0);this.paintBase(b,width,height);this.cacheKey=cacheKey;this.builds++;}
  c.setTransform(dpr,0,0,dpr,0,0);c.drawImage(this.background,0,0,width,height);const p=this.project(m.marker,width,height);this.marker=p;
  c.save();c.beginPath();c.rect(0,38,width,Math.max(0,height-65));c.clip();c.strokeStyle='#172526';c.lineWidth=4;c.fillStyle='#f1cd7f';c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#f1e7cc';c.font='600 11px system-ui';c.textAlign='center';const label=this.fit(c,m.marker.name,Math.min(140,width-24)),half=c.measureText(label).width/2+6;if(p.x>=0&&p.x<=width)c.fillText(label,Math.max(half,Math.min(width-half,p.x)),p.y-12);c.restore();
  return p;
 }
 fit(c,text,max){let s=String(text||'');if(c.measureText(s).width<=max)return s;while(s.length&&c.measureText(s+'…').width>max)s=s.slice(0,-1);return s+'…';}
 paintBase(c,width,height){
  c.fillStyle='#1a282b';c.fillRect(0,0,width,height);c.strokeStyle='#294044';c.lineWidth=.5;
  const spacing=48*this.scale;for(let x=((width/2-(this.focus.x+this.offset.x)*this.scale)%spacing+spacing)%spacing;x<width;x+=spacing){c.beginPath();c.moveTo(x,38);c.lineTo(x,height-27);c.stroke();}
  for(let y=48;y<height-27;y+=Math.max(24,spacing)){c.beginPath();c.moveTo(0,y);c.lineTo(width,y);c.stroke();}
  c.save();c.beginPath();c.rect(0,38,width,Math.max(0,height-65));c.clip();
  for(const road of this.model.roads){const [a,b]=road.ends.map(p=>this.project(p,width,height));c.strokeStyle=road.kind==='sea'?'#79b3c5':road.kind==='portal'||road.kind==='time'?'#bf9ed4':'#879782';c.lineWidth=2;c.setLineDash(road.kind==='road'?[]:[3,4]);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}c.setLineDash([]);
  for(const node of this.model.nodes){const p=this.project(node.point,width,height);if(p.x<-120||p.x>width+120||p.y<22||p.y>height-18)continue;c.strokeStyle='#728272';c.lineWidth=2;c.beginPath();const [start,end]=node.segment.map(at=>this.project(at,width,height));c.moveTo(start.x,start.y);c.lineTo(end.x,end.y);c.stroke();c.fillStyle='#d8d2b5';if(['village','port','citadel','undercity'].includes(node.type)){c.fillRect(p.x-4,p.y-6,8,8);c.beginPath();c.moveTo(p.x-6,p.y-6);c.lineTo(p.x,p.y-11);c.lineTo(p.x+6,p.y-6);c.fill();}else{c.beginPath();c.arc(p.x,p.y,2.5,0,Math.PI*2);c.fill();}c.font='10px system-ui';c.textAlign='center';c.fillStyle='#ced4c6';c.fillText(this.fit(c,node.name,Math.min(125,width-24)),p.x,p.y+17);}
  c.restore();c.fillStyle='#b1bdb1';c.font='9px system-ui';c.textAlign='left';c.fillText('СХЕМА ИЗВЕСТНЫХ ПУТЕЙ',10,height-29);
 }
}
