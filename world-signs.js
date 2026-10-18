// Read-only projection of real places and door edges. No font or simulation RNG.
export function interiorDoorSigns(s,a){
 if(!a.interior)return [];
 return a.objects.filter(o=>o.kind==='door'&&Number.isFinite(o.x)).flatMap(o=>{
  const target=s?.areas?.[o.to],edge=s?.edges?.[[a.id,o.to].sort().join('|')];
  if(!target||!a.links.includes(o.to)||edge?.mode!=='door')return [];
  const returning=o.to===a.interior.parent;
  const kind=returning?(target.interior?.kind==='tavern'?'hall-return':'exit'):target.interior?.kind==='room'?'bed':target.interior?.kind==='tavern'?'mug':'neutral';
  return [{id:o.id,x:o.x,to:o.to,kind,direction:o.x<=50?-1:1,returning}];
 });
}
export function worldSignKind(mark){return ({'✚':'help','≈':'sea','↓':'road','♨':'camp','↩':'exit'})[mark]||'neutral';}
export function paintWorldSymbol(c,kind,x,y,size=16,direction=-1){
 c.save();c.translate(x,y);c.scale(size/20,size/20);c.strokeStyle='#eddeb4';c.fillStyle='#eddeb4';c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';
 const path=points=>{c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();};
 const arrow=(from,to,ay=5)=>{path([[from,ay],[to,ay],[to-Math.sign(to-from)*3,ay-3]]);path([[to,ay],[to-Math.sign(to-from)*3,ay+3]]);};
 const mug=(scale=1,dy=0)=>{c.save();c.translate(0,dy);c.scale(scale,scale);path([[-6,-7],[-6,7],[4,7],[4,-7],[-6,-7]]);path([[4,-4],[8,-4],[8,3],[4,3]]);path([[-5,-3],[3,-3]]);c.restore();};
 if(kind==='mug')mug();
 else if(kind==='bed'){path([[-8,-5],[-8,7]]);path([[8,-1],[8,7]]);path([[-8,3],[8,3],[8,-1],[-8,-1]]);c.fillRect(-6,-4,5,3);}
 else if(kind==='exit'){path([[-4,8],[-4,-8],[5,-8],[5,8]]);arrow(direction<0?2:-7,direction<0?-9:9,1);}
 else if(kind==='hall-return'){mug(.7,-3);arrow(direction<0?6:-6,direction<0?-8:8,8);}
 else if(kind==='help'){c.fillRect(-2,-8,4,16);c.fillRect(-8,-2,16,4);}
 else if(kind==='workshop'){path([[-7,8],[4,-7]]);path([[0,-7],[5,-9],[9,-5],[6,-2],[0,-7]]);path([[-8,-4],[-3,-4],[-3,1],[-8,1]]);path([[-5,1],[-5,6],[3,6]]);}
 else if(kind==='sea'){for(const ay of [-4,3]){c.beginPath();c.moveTo(-8,ay);c.bezierCurveTo(-4,ay-5,-1,ay+5,3,ay);c.bezierCurveTo(5,ay-3,7,ay-2,9,ay);c.stroke();}}
 else if(kind==='road'){path([[0,-8],[0,8],[-4,4]]);path([[0,8],[4,4]]);}
 else if(kind==='camp'){path([[-7,8],[7,8]]);path([[-4,5],[-6,1],[-2,-7],[0,-2],[4,-6],[6,1],[4,5],[-4,5]]);}
 else {path([[-7,0],[0,-6],[7,0],[0,6],[-7,0]]);}
 c.restore();
}
export function paintSymbolPlaque(c,kind,x,y,width=28,height=22,direction=-1){
 c.save();c.fillStyle='#34352e';c.fillRect(x-width/2,y-height/2,width,height);c.strokeStyle='#aa9771';c.lineWidth=1;c.strokeRect(x-width/2+.5,y-height/2+.5,width-1,height-1);
 paintWorldSymbol(c,kind,x,y,Math.min(width-6,height-5),direction);c.restore();
}
