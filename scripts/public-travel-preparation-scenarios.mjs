import {populationFixture,homeArrival} from './population-scenarios.mjs';
import {beginPopulationPreparation} from '../engine.js';import {LONG_HISTORY_TICKS} from '../modules/preparation-state.js';
export function publicTravelBoundary(){const f=homeArrival(populationFixture({rules:{events:true,'npc-travel':true}})),{s}=f;s.tick=71;s.logistics.nextDispatch=1e9;s.society.nextEvent=72;
// One analytically selected current RNG state: first selects the carrier's real town, second selects the public-travel event. No seed scan.
s.randomStreams.society=3704747603;beginPopulationPreparation(s,{duration:LONG_HISTORY_TICKS});return f;}
