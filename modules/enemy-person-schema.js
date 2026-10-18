export function validateEnemyPeople(s,fail){
 const enemies=new Map(),tick=n=>Number.isSafeInteger(n)&&n>=0&&n<=s.tick;
 for(const a of Object.values(s.areas))for(const e of a.objects)if(e.kind==='enemy'&&e.person){
  const p=s.people[e.person],b=p?.enemyBody;if(!b||b.enemy!==e.id||b.origin!==a.id||enemies.has(p.id)||e.species!=='bandit'||e.shape!=='human')fail('enemy.person.'+e.id);enemies.set(p.id,e);
 }
 for(const p of Object.values(s.people)){
  const b=p.enemyBody;if(b===undefined)continue;const e=enemies.get(p.id);
  if(b?.version!==1||!e||!tick(b.created)||!Number.isSafeInteger(b.lastActionTick)||b.lastActionTick< -1||b.lastActionTick>s.tick||!['hostile','spared','dead'].includes(b.stage)||typeof b.settled!=='boolean'||p.race!=='human'||p.maxHealth!==e.maxHp||p.health!==Math.max(0,e.hp)||p.alive!==e.alive)fail(p.id+'.enemyBody');
  if(b.stage==='hostile'&&(!p.alive||p.status!=='hostile'||p.area!==b.origin||p.x!==e.x||b.mercy!==null)||b.stage==='spared'&&(!p.alive||!e.resolved||!e.pacified||e.patrol!==0||b.mercy===null)||b.stage==='dead'&&(p.alive||p.health!==0||p.status!=='dead'))fail(p.id+'.enemyController');
  if(b.mercy!==null){const m=b.mercy;if(!tick(m?.tick)||m.tick<b.created||!s.people[m.by]||!['parley','surrender','sleep'].includes(m.method)||!Number.isSafeInteger(m.coins)||m.coins<0)fail(p.id+'.enemyMercy');}
  if(b.offer!==null){const o=b.offer;if(!tick(o?.tick)||!s.people[o.by]||typeof o.accepted!=='boolean'||o.accepted&&b.mercy?.method!=='surrender')fail(p.id+'.enemyOffer');}
  if(b.decision!==null){const d=b.decision;if(!tick(d?.tick)||!['food','work','leave','wait'].includes(d.kind)||!s.areas[d.target])fail(p.id+'.enemyDecision');}
 }
}
