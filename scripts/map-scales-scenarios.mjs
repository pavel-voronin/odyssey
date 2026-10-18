import {createWorld} from '../engine.js';
import {MODULES} from '../rules.js';
import {recordAreaVisit,revealArea,revealRoad} from '../actor-atlas.js';
import {syncActiveActor} from '../actor-projection.js';
export function mapFixture({small=false,allKnown=false}={}){
 const flags=['districts','people','origins','birthplaces','travel',...(!small?['geography-frame']:[])],s=createWorld(1,{rules:Object.fromEntries(MODULES.map(m=>[m.id,flags.includes(m.id)]))}),h=s.hero;
 const area=key=>s.areas[s.geographyFrame?.sites[key]?.area||({crossroads:'a0',capital:'a1',hollow:'a2',ruins:'a3',camp:'a4'})[key]];
 Object.assign(h,{area:area('crossroads').id,x:24,lastAction:'walk',goal:{kind:'explore',area:area('capital').id,x:42},combat:null,transit:null,energy:100,hunger:0,hp:h.maxHp,conditions:[],companions:[],quests:[]});h.stories.active=null;h.destiny.completed=true;h.atlas={version:1,known:[],visited:[],roads:[],visits:{}};
 const keys=allKnown?Object.keys(s.areas):small?['a0','a1','a2','a3']:['crossroads','capital','hollow','ruins','center','village-west','port-west','strait','port-east','cave','undercity'].map(k=>area(k).id);
 recordAreaVisit(s,s.areas[h.area]);for(const id of keys)revealArea(s,id);for(const id of keys)for(const to of s.areas[id].links)if(h.atlas.known.includes(to))revealRoad(s,id,to);syncActiveActor(s);return {s,h,area};
}
