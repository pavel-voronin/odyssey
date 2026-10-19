export function validateGearPairs(s,fail){
 const actors=new Map(Object.values(s.actorStates||{}).map(h=>[h.lineage,h]));actors.set(s.hero.lineage,s.hero);
 for(const h of actors.values()){const f=h.defenseMemory?.lastBrace,p=f?.pair;if(!p)continue;
  if(p.id!=='ward-cloak'||p.energy!==6||p.mana!==1||f.energy!==6||f.mana!==1||!Array.isArray(p.items)||p.items.length!==2||p.items.some(id=>typeof id!=='string'||!id)||p.items[0]===p.items[1]||typeof p.component!=='string'||!Number.isSafeInteger(f.tick)||f.tick<0||f.tick>s.tick||!Number.isSafeInteger(f.sourceTurn)||f.sourceTurn<0||typeof f.enemy!=='string'||!Number.isFinite(f.strength)||f.strength<.3||f.strength>.65||!(h.defenseMemory.braces>0))fail('gear-pair.receipt');
  const source=Object.values(s.people).flatMap(p=>Object.values(p.socketWork?.orders||{})).find(o=>o.id+'/ward'===p.component);if(!source||source.operation!=='create'||source.status!=='completed'||source.finished>f.tick)fail('gear-pair.component');
 }
}
