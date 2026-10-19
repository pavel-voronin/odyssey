import {rootWorld} from '../world-ref.js';
import {packView,itemUnits} from './container-state.js';
export const ferryOn=s=>s.rules?.ferry!==false&&s.rules?.travel!==false;
export const FERRY_FARE=6,FERRY_SEATS=2,FERRY_CAPACITY=30;
export function ferryActor(input,id){const s=rootWorld(input);return input.hero?.lineage===id?input.hero:s.actorStates?.[id]||null;}
export function ferryPassenger(s,id){return s.ferry?.passengers?.[id]||null;}
export function ferryPresence(input,id){const s=rootWorld(input),f=s.ferry,p=s.people[id];if(!f||!p)return null;const aboard=f.passengers[id]||f.captain===id;if(!aboard)return null;if(f.phase==='docked'&&f.port)return {area:f.deck,x:Number.isFinite(p.x)?p.x:f.captain===id?74:42+Object.keys(f.passengers).indexOf(id)*10};return {transit:{from:f.from,to:f.to,mode:'sea',remaining:Math.ceil(Math.max(0,f.distance-f.travelled)/f.speed)+f.pause,total:Math.ceil(f.distance/f.speed),arrivalX:50,ferry:{version:1,id:f.id,voyage:f.voyage},eventDone:true,crew:false}};}
export function ferryPoint(s,t){const f=s.ferry;if(!f||t?.ferry?.id!==f.id)return null;const q=f.geometry;if(!q)return null;const p=Math.max(0,Math.min(1,f.travelled/f.distance));return {point:{x:q.from.x+(q.to.x-q.from.x)*p,y:q.from.y+(q.to.y-q.from.y)*p,unit:'diagram'},layer:q.layer,precision:'vessel',geometryBasis:'vessel-snapshot'};}
export function ferryLoad(s){const f=s.ferry;if(!f)return 0;const loose=s.areas[f.deck].objects.reduce((n,o)=>n+(o.items||[]).reduce((k,i)=>k+itemUnits(i),0),0);return f.food/4+loose+Object.keys(f.passengers).reduce((n,id)=>{const h=ferryActor(s,id),worn=Object.values(h?.equipment||{}).filter(Boolean).reduce((k,i)=>k+itemUnits(i),0);return n+packView(s,id).used+worn+8;},0);}
export function ferryDock(s,port){const f=s.ferry;return s.areas[port]?.objects.find(o=>o.id===f?.docks?.[port]&&o.kind==='ferryDock'&&o.hp>0)||null;}
export function ferryHistory(s,kind,person=null,extra={}){const f=s.ferry;f.history.push({tick:s.tick,kind,person,...extra});if(f.history.length>16)f.history.shift();}
