import {enabled} from './rules.js';
import {gateX} from './modules/mechanism-policy.js';
export function drawMechanisms(c,s,a,screenX,ground){
 if(!enabled(s,'mechanisms'))return;
 for(const to of a.links){const g=s.edges?.[[a.id,to].sort().join('|')]?.mechanism;if(!g)continue;
  const x=screenX(gateX(a.id,to)),closed=g.state==='closed';c.save();c.strokeStyle='#b2bebc';c.lineWidth=3;c.beginPath();c.moveTo(x-16,ground);c.lineTo(x-16,ground-70);c.lineTo(x+16,ground-70);c.lineTo(x+16,ground);c.stroke();
  c.strokeStyle='#788b90';c.lineWidth=2;for(let i=-12;i<=12;i+=6){c.beginPath();c.moveTo(x+i,ground-67);c.lineTo(x+i,closed?ground:ground-51);c.stroke();}
  const lever=g.lever.area===a.id&&a.objects.find(o=>o.id===g.lever.id&&o.kind==='mechanismLever');if(lever){const lx=screenX(lever.x);c.fillStyle='#535b60';c.fillRect(lx-5,ground-16,10,16);c.strokeStyle='#d7b977';c.lineWidth=4;c.beginPath();c.moveTo(lx,ground-9);c.lineTo(lx+(closed?-9:9),ground-29);c.stroke();if(g.sequence){c.fillStyle="#d7b977";for(let i=0;i<3;i++)c.fillRect(lx-9+i*7,ground-42,4,5);}}c.restore();
 }
}
export function drawLifts(c,s,a,screenX,ground){
 if(!enabled(s,'mechanisms'))return;
 for(const to of a.links){const n=s.edges?.[[a.id,to].sort().join('|')]?.lift;if(!n)continue;const x=screenX(gateX(a.id,to));c.save();c.strokeStyle='#88999c';c.lineWidth=2;c.beginPath();c.moveTo(x-18,ground);c.lineTo(x-18,ground-82);c.moveTo(x+18,ground);c.lineTo(x+18,ground-82);c.moveTo(x-18,ground-80);c.lineTo(x+18,ground-80);c.stroke();
  if(n.status!=='dismantled'){c.fillStyle='#38464a';c.fillRect(x-14,ground-44,28,42);c.strokeRect(x-14,ground-44,28,42);c.beginPath();c.moveTo(x,ground-80);c.lineTo(x,ground-44);c.stroke();}
  const console=n.console.area===a.id&&a.objects.find(o=>o.id===n.console.id&&o.kind==='liftConsole');if(console){const cx=screenX(console.x);c.fillStyle='#525b60';c.fillRect(cx-7,ground-24,14,24);for(let i=0;i<3;i++){c.fillStyle=i<n.charge.remaining?'#d3c68c':'#232d2b';c.fillRect(cx-5+i*4,ground-20,3,5);}if(n.status!=='ready'){c.strokeStyle='#cd8e72';c.beginPath();c.moveTo(cx-4,ground-11);c.lineTo(cx+4,ground-3);c.moveTo(cx+4,ground-11);c.lineTo(cx-4,ground-3);c.stroke();}}c.restore();
 }
}
