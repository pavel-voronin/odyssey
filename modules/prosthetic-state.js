import {bodyParts,presentParts} from './anatomy-state.js';
export function pegPart(p){return bodyParts(p).find(([id,,role])=>role==='leg'&&['leftLeg','rightLeg'].includes(id)&&p.anatomy?.missing?.includes(id))?.[0]||null;}
export function fittedPeg(p){const f=p?.prosthetic,i=f?.item,m=i?.prosthesis;return f?.version===1&&m?.version===1&&m.patient===p.id&&m.part===f.part&&p.anatomy?.missing?.includes(f.part)&&i.physical?.holder?.kind==='person'&&i.physical.holder.id===p.id?f:null;}
export function pegLook(p){const f=fittedPeg(p);return f?{[f.part]:f.item.prosthesis.quality}:null;}
export function pegSummary(p){const f=fittedPeg(p);return f?'Деревянная нога · '+(f.part==='leftLeg'?'левая':'правая')+' · подгонка '+Math.round(f.item.prosthesis.quality*100)+'%':'';}
export function handPart(p){return !['automaton','myconid','ghost','spirit'].includes(p.race)&&bodyParts(p).find(([id,,role])=>role==='arm'&&['leftArm','rightArm'].includes(id)&&p.anatomy?.missing?.includes(id))?.[0]||null;}
export function installedHook(p){const f=p?.handProsthesis,i=f?.item,m=i?.prosthesis;return f?.version===1&&m?.kind==='hand'&&m.patient===p.id&&m.part===f.part&&p.anatomy?.missing?.includes(f.part)&&i.physical?.holder.kind==='person'&&i.physical.holder.id===p.id?f:null;}
export function fittedHook(p){const f=installedHook(p);return f?.item.prosthesis.wear.remaining>0?f:null;}
export function lightToolHeld(p,i){return presentParts(p).some(([, ,role])=>role==='arm')||Boolean(fittedHook(p)&&i?.toolKind==='knife'&&i.manufacture?.recipe==='working-knife'&&(i.quantity||1)===1);}
export function hookUseCost(p){const f=fittedHook(p);return !presentParts(p).some(([, ,role])=>role==='arm')&&f?2-f.item.prosthesis.quality+(24-f.item.prosthesis.wear.remaining)/24:0;}
export function useHook(s,p,source){const f=fittedHook(p);if(!f||presentParts(p).some(([, ,role])=>role==='arm'))return false;const w=f.item.prosthesis.wear;if(w.lastTick===s.tick)return false;w.remaining--;w.used++;w.lastTick=s.tick;w.lastUse={at:s.tick,source};return true;}
