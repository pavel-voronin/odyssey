import {physicalDistance} from './geometry.js';
export function creatureTraceVisible(s,a,o){return s.rules?.bestiary!==false&&o.kind==='creatureTrace'&&o.trace.expires>s.tick&&physicalDistance(a,s.hero.x,o.x)<=12;}
export function drawCreatureTrace(c,x,y,group=false){c.save();c.globalAlpha=.65;c.fillStyle='#899478';for(let i=0;i<(group?3:1);i++){c.beginPath();c.ellipse(x-4+i*4,y-1-(i%2)*2,1.4,2.1,.4,0,7);c.fill();c.beginPath();c.ellipse(x-2+i*4,y-5-(i%2)*2,.8,1.1,.4,0,7);c.fill();}c.restore();}
