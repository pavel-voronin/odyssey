import {heroLevel} from './progression-state.js';
import {enabled,moduleRandom} from '../rules.js';
export function areaDanger(s,a,metadata={}){
  if(a.danger!==undefined)return;
  const base=({road:0,camp:0,village:0,port:0,citadel:0,undercity:0,forest:1,ruins:2,cave:2,dungeon:2,sea:2,island:1,desert:2,mountain:3,dream:4,clockwork:4})[a.type]||0;
  const wild=base>0;
  a.danger=metadata.danger??(wild?base+Math.floor(a.depth/4)+(a.depth>4&&moduleRandom(s,'danger')<.12?8:0):0);
}
export function dangerMultiplier(s,a){return enabled(s,'danger')?1+Math.max(0,(a.danger||0)-3)*.28:1;}
export function dangerAvoidance(s,a){return enabled(s,'danger')?Math.max(0,(a.danger||0)-Math.max(2,heroLevel(s.hero)*.65))*(3+(1-s.hero.personality.courage)*10):0;}
