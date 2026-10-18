export const WORLD_ROOT=Symbol('odyssey.world');
export const ACTING_ACTOR=Symbol('odyssey.actor');
export const rootWorld=s=>s[WORLD_ROOT]||s;
