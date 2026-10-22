import {enabled} from '../rules.js';
import {npcAction} from './npc-control.js';
import {enemyPerson} from './enemy-person-state.js';
export const hostileLifeOn=s=>['hostile-life','npc-needs','supply'].every(id=>enabled(s,id));
export function initializeHostileLife(s,a,e,p){
 if(!hostileLifeOn(s)||p.hostileLife)return;
 let n=s.seed>>>0;for(const c of p.id)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;
 const initial=p.roadSupplies?.food??n%3;p.roadSupplies ||= {food:initial,medicine:0};
 p.hostileLife={version:1,created:s.tick,stage:'active',lastTick:s.tick,lastActionTick:-1,action:'watch',camp:{area:a.id,x:e.x,established:s.tick},goal:null,known:{forage:null,people:[],danger:null},supplies:{initial,gathered:0,raided:0,eaten:0},search:0,raids:0,history:[]};
 a.objects.push({id:'hostile-camp/'+p.id,kind:'hostileCamp',person:p.id,x:e.x,established:s.tick});
}
export function claimHostileAction(s,p,action){
 const q=p?.hostileLife;if(q?.stage!=='active'||p.enemyBody?.stage!=='hostile'||!p.alive||q.lastActionTick===s.tick||!npcAction(s,p,'enemy','hostile-'+action))return false;
 q.lastActionTick=s.tick;q.action=action;return true;
}
export function claimHostileReply(s,e){const p=enemyPerson(s,e);if(!p?.hostileLife)return true;if(p.needs.sleeping){if(claimHostileAction(s,p,'wake')){p.needs.sleeping=false;p.hostileLife.goal=null;}return false;}return claimHostileAction(s,p,'fight');}
export {stopHostileLife} from './hostile-stop.js';
