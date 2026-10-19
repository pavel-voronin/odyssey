import {initializePredator} from './predator-carrion.js';
import { PROFESSIONS, DESTINIES, HABITS, CONDITIONS, ENEMY_SPECIES, ENEMY_POWERS, ITEM_BASES, ITEM_ORIGINS, ITEM_EPITHETS, ENCOUNTERS, PETS, FACTIONS, profession, destiny } from '../content.js';
import { enabled } from '../rules.js';
import { choose, clamp, hasHabit, hasCondition, profile, activePower, moral, repute } from './common.js';
import { initializeEnemyTraits } from './adversaries.js';
import {dangerMultiplier} from './danger.js';

export function decorateArea(s, a, rng, fresh=false) {
  a.faction = choose(s, rng, FACTIONS).id; a.prosperity = 45 + Math.floor(rng(s) * 30);
  for (const enemy of a.objects.filter(o => o.kind === 'enemy')) {
    composeEnemy(s,a,enemy,rng,fresh);
  }
  // Different lives encounter different causal situations, not just different names.
  if (a.type !== 'village' || rng(s) < .5) {
    const template = choose(s, rng, ENCOUNTERS);
    a.objects.push({ ...template, id: `${a.id}-story`, encounter: template.id, resolved: false, seed: Math.floor(rng(s) * 1000000) });
  }
}
export function composeEnemy(s,a,enemy,rng,fresh=false){
    const biome=({dungeon:'cave',desert:'road',mountain:'forest',undercity:'cave',citadel:'ruins'}[a.type])||a.type;
    const pool=ENEMY_SPECIES.filter(e=>e.biomes.includes(biome));
    const requested=ENEMY_SPECIES.find(species=>species.id===enemy.requestedSpecies);
    const species = requested||(a.id === 'a2' ? ENEMY_SPECIES[0] : choose(s, rng, pool.length?pool:ENEMY_SPECIES));
    const powerCount = a.depth >= 4 ? 2 : 1;
    const powers = [];
    for (let i = 0; i < powerCount; i++) powers.push(choose(s, rng, ENEMY_POWERS.filter(p => !powers.includes(p.id))).id);
    if (a.id === 'a2' && rng(s) < .7) powers.splice(0, powers.length, 'plain');
    const oldMax = enemy.maxHp, ratio = enemy.hp / oldMax;
    enemy.species = species.id; enemy.tags = [...species.tags]; enemy.shape = species.shape;
    enemy.powers = powers; enemy.stolen = 0; enemy.faction = enemy.tags.includes('human') ? a.faction : null;
    enemy.baseName = species.name; enemy.name = species.name + (powers.every(p => p === 'plain') ? '' : ` · ${powers.filter(p => p !== 'plain').map(id => ENEMY_POWERS.find(p => p.id === id).name).join(', ')}`);
    enemy.maxHp = Math.ceil((species.hp + Math.min(60, a.depth * 2))*(enemy.boss?1.8:1)); enemy.hp = enemy.alive ? Math.max(1, Math.ceil(enemy.maxHp * ratio)) : 0;
    enemy.attack = Math.ceil((species.attack + Math.floor(Math.min(24, a.depth) / 3))*(enemy.boss?1.5:1));
    const danger=dangerMultiplier(s,a);enemy.maxHp=Math.ceil(enemy.maxHp*danger);enemy.hp=enemy.alive?Math.max(1,Math.ceil(enemy.maxHp*ratio)):0;enemy.attack=Math.ceil(enemy.attack*danger);
    initializeEnemyTraits(s,a,enemy,fresh);if(fresh)initializePredator(s,a,enemy);
}
