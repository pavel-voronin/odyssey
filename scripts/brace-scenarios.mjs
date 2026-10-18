import {step} from '../engine.js';
import {setModule} from '../rules.js';
import {combatFixture} from './combat-judgment-scenarios.mjs';
export function braceFixture({courage=.1,hp=80,attack=14,known=true}={}){
 const f=combatFixture({hp,attack,tactic:'charged',intent:'idle',enemyHp:1000,courage});setModule(f.s,'brace',true);if(known)step(f.s);else{f.enemy.battle.turns=1;f.enemy.battle.intent='strike';}return f;
}
