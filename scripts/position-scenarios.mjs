import {layoutFixture,layoutContext} from './delve-layout-scenarios.mjs';
import {step} from '../engine.js';
export const positionContext=layoutContext;
export function positionFixture({courage=.3}={}){const f=layoutFixture({position:true,courage});f.h.personality.curiosity=.45;const r=f.layout.position,room=f.s.areas[r.area];return {...f,r,room,enemy:room.objects.find(o=>o.id===r.enemy),cover:room.objects.find(o=>o.id===r.cover)};}
export function untilPosition(f,condition,limit=48){for(let i=0;i<limit;i++){if(condition(f))return i;if(!f.h.alive)throw Error('Body died before the expected position');step(f.s);}if(!condition(f))throw Error('Position exceeded '+limit+' ticks');return limit;}
