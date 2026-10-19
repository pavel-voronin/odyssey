import {refugeFixture,surveyPlot,refugeDepart,refugeNearArrival,refugeSave,refugeContext} from './family-refuge-scenarios.mjs';
import {peopleTick} from '../modules/people.js';
export {refugeSave as foundationSave,refugeContext as foundationContext};
export function foundationFixture({camp=false}={}){const f=refugeFixture({kit:!camp});if(!camp)surveyPlot(f);delete f.leader.migrationKnowledge;delete f.leader.navigation.markets;const g=refugeDepart(f);refugeNearArrival(f,g);return {...f,g,a:camp?f.camp:f.plot};}
export function foundationSteps(f,n=4){for(let i=0;i<n;i++){f.s.tick=Math.floor(f.s.tick/8)*8+8;peopleTick(f.s,refugeContext);}return f;}
