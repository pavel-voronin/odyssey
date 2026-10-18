import {petPack,packPetTrace} from './pack-pet-state.js';
import {partyCare} from './party-needs.js';
import { PROFESSIONS, DESTINIES, HABITS, CONDITIONS, ENEMY_SPECIES, ENEMY_POWERS, ITEM_BASES, ITEM_ORIGINS, ITEM_EPITHETS, ENCOUNTERS, PETS, FACTIONS, profession, destiny } from '../content.js';
import { enabled } from '../rules.js';
import { choose, clamp, hasHabit, hasCondition, profile, activePower, moral, repute } from './common.js';
import {npcAction} from './npc-control.js';

export function partyTick(s, ctx) {
  const h = s.hero;
  for (const companion of enabled(s, 'companions') ? [...h.companions] : []) {
    if(companion.person&&!npcAction(s,s.people[companion.person],'party','upkeep'))continue;
    if(companion.person)partyCare(s,companion,ctx);
    if (h.hunger > 90 && s.tick % 20 === 0) companion.loyalty = Math.max(0, companion.loyalty - 4);
    if (companion.loyalty <= 0&&!companion.person) { if(petPack(companion))packPetTrace(s,companion,'left');h.companions = h.companions.filter(c => c !== companion); ctx.log(s, `${companion.name} покидает голодный отряд.`, 'companion'); }
  }
}
