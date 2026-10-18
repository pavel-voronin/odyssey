import {bodyParts} from './anatomy-state.js';
export function pegPart(p){return bodyParts(p).find(([id,,role])=>role==='leg'&&['leftLeg','rightLeg'].includes(id)&&p.anatomy?.missing?.includes(id))?.[0]||null;}
export function fittedPeg(p){const f=p?.prosthetic,i=f?.item,m=i?.prosthesis;return f?.version===1&&m?.version===1&&m.patient===p.id&&m.part===f.part&&p.anatomy?.missing?.includes(f.part)&&i.physical?.holder?.kind==='person'&&i.physical.holder.id===p.id?f:null;}
export function pegLook(p){const f=fittedPeg(p);return f?{[f.part]:f.item.prosthesis.quality}:null;}
export function pegSummary(p){const f=fittedPeg(p);return f?'Деревянная нога · '+(f.part==='leftLeg'?'левая':'правая')+' · подгонка '+Math.round(f.item.prosthesis.quality*100)+'%':'';}
