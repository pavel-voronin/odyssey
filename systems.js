// Simulation hook facade. Implementations live in isolated domain modules.
import { bodyTick } from './modules/body.js';
import { partyTick } from './modules/party.js';
import { destinyTick } from './modules/identity.js';
export { initializeHero, destinyTick } from './modules/identity.js';
export { decorateArea } from './modules/world.js';
export { addCondition, bodyTick, traitsPlan, provisions, traitsRest } from './modules/body.js';
export { itemBonus, makeItem, receiveItem, sellBag } from './modules/inventory.js';
export { partyTick } from './modules/party.js';
export { encounter, tryParley } from './modules/encounters.js';
export { combatAttack, combatResponse, afterVictory } from './modules/combat.js';
export { hasHabit, hasCondition } from './modules/common.js';
export function traitsTick(s,ctx){ if(bodyTick(s,ctx))return true;enchantmentTick(s,ctx);partyTick(s,ctx);destinyTick(s,ctx);mindTick(s,ctx);socialTick(s,ctx);return false; }
import {enchantmentTick} from './modules/enchantments.js';
import {mindTick} from './modules/psychology.js';
import {socialTick} from './modules/social.js';
