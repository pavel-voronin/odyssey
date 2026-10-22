import {MODULES} from '../rules.js';
// One world-only startup with unrelated hero combat and quest paths OFF.
export const startupRules=()=>Object.fromEntries(MODULES.map(m=>[m.id,!['combat','quests','magic','tactics','weapon-styles','dungeon-positions','guardian-nodes','dungeon-rescue','camera','shadows'].includes(m.id)]));
