import {revealArea} from '../actor-atlas.js';
import {enabled} from '../rules.js';
// Both launch actions share one physical destination and one assistant.
export function launchShip(s,c,ctx,action){
 const h=s.hero,a=s.areas[c.target];if(c.launchResult||h.inventory.relics<1)return false;
 h.inventory.relics--;const destination=ctx.addArea(s,'island','Остров под чужой луной',a.depth+1,{realm:'surface'});
 ctx.connect(s,a.id,destination,{mode:'portal',duration:4,cost:0});revealArea(s,destination);
 c.launchResult={version:1,action,tick:s.tick,destination,actor:h.lineage};
 const assistant={id:'star-assistant',name:'Бортовой дух с неисправным этикетом',uid:c.id+'-helper',attack:2,healing:1,scouting:2,loyalty:65,hp:24,maxHp:24,ethics:0,joined:s.tick};
 if(enabled(s,'companions')&&h.companions.length<3){h.companions.push(assistant);h.counters.companions++;}return true;
}
