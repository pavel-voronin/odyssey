import {enemyPerson,syncEnemyPeople} from './enemy-person-state.js';
import {enabled} from '../rules.js';
import {physicalDistance} from '../geometry.js';
import {hasHabit,profile,isTown} from './common.js';
import {observeNPCPlace,npcKnownRoute,knownNPCHazards} from './npc-knowledge.js';
import {npcAction} from './npc-control.js';
import {cacheItems,npcLooseItems,actorItemLocation} from './item-originals.js';
import {setActorMoney} from '../actor-projection.js';
import {recordPersonRemains} from './remains.js';

function keepPossessions(s,p,e){const bag=npcLooseItems(s,p);for(const i of e.items||[]){bag.push(i);actorItemLocation(s,i,p.id);}delete e.items;}
export function releaseEnemyPerson(s,e,method,ctx){
 const p=enemyPerson(s,e),h=s.hero,b=p?.enemyBody;
 if(!p||b.stage!=='hostile'||!e.alive||e.hp<=0||h.transit||h.area!==b.origin||method!=='sleep'&&physicalDistance(s.areas[h.area],h.x,e.x)>12||!['parley','surrender','sleep'].includes(method))return false;
 syncEnemyPeople(s);if(!npcAction(s,p,'enemy','mercy'))return false;
 b.stage='spared';b.lastActionTick=s.tick;b.mercy={tick:s.tick,by:h.lineage,method,coins:e.stolen||0};keepPossessions(s,p,e);if(e.stolen){setActorMoney(s,p,(s.actorStates?.[p.id]?.gold??p.agenda.wealth)+e.stolen);e.stolen=0;}p.status='resident';if(method==='sleep'){p.needs.sleeping=true;p.needs.energy=0;}p.agenda.task=null;p.agenda.due=s.tick+8;
 e.resolved=true;e.pacified=true;e.patrol=0;h.combat=null;if(h.goal?.object===e.id)h.goal=null;
 const a=s.areas[p.area];a.population ||= [];if(!a.population.includes(p.id))a.population.push(p.id);if(!a.objects.some(o=>o.kind==='resident'&&o.person===p.id))a.objects.push({id:'resident-'+p.id,kind:'resident',person:p.id,name:p.name,x:p.x});
 p.agenda.bonds[h.lineage]=(p.agenda.bonds[h.lineage]||0)+2;observeNPCPlace(s,p);ctx?.meetPerson?.(s,p.id,ctx,2);return true;
}
export function considerSurrender(s,e,ctx){
 const p=enemyPerson(s,e),b=p?.enemyBody,h=s.hero;
 if(!enabled(s,'enemy-people')||!b||b.stage!=='hostile'||b.offer||!e.alive||e.hp<=0||e.hp>e.maxHp*.3||h.area!==b.origin||h.transit||physicalDistance(s.areas[h.area],h.x,e.x)>12)return false;
 const accepts=hasHabit(h,'mercy')||profile(h).skill==='parley'||h.personality.generosity>=.65;
 b.offer={tick:s.tick,by:h.lineage,accepted:accepts};
 if(!accepts){ctx.log(s,`${p.name} просит остановиться, но ${h.name} не доверяет просьбе и продолжает бой.`,'choice');return false;}
 if(!releaseEnemyPerson(s,e,'surrender',ctx)){b.offer.accepted=false;return false;}
 h.lastAction='talk';h.goal=null;ctx.log(s,`${p.name} сдаётся. Раны и поклажа остаются при нём; теперь ему самому искать дальнейший путь.`,'choice');return true;
}
// This chooses a public known route, not remote stock, strangers or relatives.
// The ordinary NPC movement/needs/work code executes the chosen action later.
export function releasedPersonPlan(s,p){
 const b=p.enemyBody;if(b?.stage!=='spared'||b.settled)return false;
 observeNPCPlace(s,p);const a=s.areas[p.area],m=p.agenda;
 if(isTown(a)){b.settled=true;b.decision={tick:s.tick,kind:p.needs.hunger>=65?'food':'work',target:a.id};return false;}
 const options=(p.navigation.places||[]).filter(k=>k.area!==p.area).map(k=>({area:s.areas[k.area],path:npcKnownRoute(p,p.area,k.area,knownNPCHazards(s,p))})).filter(k=>k.area&&k.path.length===2);
 const choice=options.find(k=>isTown(k.area))||options[0],kind=choice?(isTown(choice.area)?p.needs.hunger>=65?'food':'work':'leave'):'wait';
 b.decision={tick:s.tick,kind,target:choice?.area.id||p.area};
 m.task=choice?{kind:'return',target:choice.area.id,x:42,remaining:1,knownNavigation:true}:{kind:'study',target:p.area,x:p.x,remaining:3};m.due=s.tick;p.status=choice?'wandering':'resident';return true;
}
export function killEnemyPerson(s,e,killer=null){
 const p=enemyPerson(s,e),b=p?.enemyBody;if(!p||b.stage==='dead')return null;
 p.area=b.stage==='hostile'?b.origin:p.area;p.x=b.stage==='hostile'?e.x:p.x;p.health=0;p.alive=false;p.status='dead';p.died=s.tick;p.deathCause=killer?'Погиб в бою с '+(s.people[killer]?.name||killer):'Погиб в бою';p.agenda.task=null;b.stage='dead';b.lastActionTick=s.tick;
 keepPossessions(s,p,e);const body=recordPersonRemains(s,p);if(body)e.remainsId=body.id;
 const bag=npcLooseItems(s,p);if(bag.length){const items=bag.splice(0);cacheItems(s,items,{area:p.area,x:p.x,leftBy:p.id,name:'Поклажа: '+p.name});p.looseItems=[];}
 e.hp=0;e.alive=false;e.resolved=true;e.patrol=0;return p;
}
