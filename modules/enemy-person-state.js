import {stopHostileLife} from './hostile-stop.js';
export function enemyPerson(s,e){const p=e?.person&&s.people[e.person],b=p?.enemyBody;return b?.version===1&&b.enemy===e.id?p:null;}
export function personEnemy(s,p){const b=p?.enemyBody;return b?.version===1?s.areas[b.origin]?.objects.find(e=>e.id===b.enemy&&e.person===p.id):null;}
// While hostile the enemy controller owns scalar combat/motion values. After
// release that object is only an inactive reference to the same person's body.
export function syncEnemyPeople(s){for(const p of Object.values(s.people)){
 const b=p.enemyBody,e=personEnemy(s,p);if(!e)continue;
 if(b.stage==='hostile'){p.health=Math.max(0,e.hp);p.area=b.origin;p.x=e.x;p.alive=e.alive;p.maxHealth=e.maxHp;}
 else {if(!p.alive)b.stage='dead';e.hp=p.health;e.alive=p.alive;e.resolved=true;e.pacified=b.mercy!==null;e.patrol=0;}
 if(!p.alive){b.stage='dead';e.resolved=true;if(p.hostileLife?.stage==='active')stopHostileLife(s,p,'dead');}
}}
