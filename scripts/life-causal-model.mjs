// Read-only observations. This module never chooses actions, draws RNG or changes the world.
const copy=value=>value===undefined?null:JSON.parse(JSON.stringify(value));
const tally=(map,key,n=1)=>{map[key]=(map[key]||0)+n;};
const smallGoal=g=>g?{kind:g.kind,area:g.area,x:g.x,object:g.object,quest:g.quest,job:g.job,started:g.started,delve:g.delve}:null;
export const goalKey=g=>g?JSON.stringify(smallGoal(g)):'none';
function enemyAt(s,h){const id=h.combat||(h.goal?.kind==='hunt'?h.goal.object:null),e=s.areas[h.area]?.objects.find(o=>o.id===id);return e?{id:e.id,name:e.name,boss:Boolean(e.boss),hp:e.hp,maxHp:e.maxHp,attack:e.attack,species:e.species,element:e.element,tactic:e.tactic}:null;}
export function lifeContext(s){
 const h=s.hero,a=s.areas[h.area];return {tick:s.tick,person:h.lineage,area:h.area,areaType:a?.type,x:h.x,hp:h.hp,maxHp:h.maxHp,energy:h.energy,hunger:h.hunger,gold:h.gold,level:h.level,weapon:h.weapon,armor:h.armor,profession:h.profession,rank:h.career?.rank,
  supplies:{potions:h.inventory.potions,herbs:h.inventory.herbs,rations:h.inventory.rations},equipment:Object.fromEntries(Object.entries(h.equipment||{}).map(([k,i])=>[k,i?{id:i.id,name:i.name,modifier:i.modifier,power:i.power}:null])),
  conditions:h.conditions.map(c=>({id:c.id,since:c.since,until:c.until})),goal:smallGoal(h.goal),intent:h.intent,reason:h.reason,combat:h.combat,enemy:enemyAt(s,h),delve:h.delve?{root:h.delve.root,room:h.delve.room,started:h.delve.started,cleared:h.delve.cleared}:null,
  transit:h.transit?{from:h.transit.from,to:h.transit.to,mode:h.transit.mode,remaining:h.transit.remaining}:null,residenceSince:h.life.residence?.since??null,lifeMotive:h.life.motive,planning:h.planning?.last?{tick:h.planning.last.tick,kind:h.planning.last.kind,target:h.planning.last.target,energyCost:h.planning.last.energyCost,prepared:h.planning.last.prepared}:null,
  companions:h.companions.filter(c=>c.hp>0).map(c=>({id:c.person||c.uid||c.id,role:c.role,attack:c.attack,healing:c.healing,hp:c.hp}))};
}
export function classifyDeath({cause,deathText,before}){
 const battle=Boolean(deathText?.includes('Противник: '));
 if(!battle&&cause==='Отравление')return 'poison';if(!battle&&cause==='Голод')return 'hunger';
 if(battle){if(before?.enemy?.name!==cause)return 'battle-unresolved';return before.enemy.boss?'battle-boss':'battle-ordinary';}
 return cause?'other-explicit':'unknown';
}
export class LifeRecorder{
 constructor(s,{priorRefusal=null}={}){
  const h=s.hero;this.person=h.lineage;this.born=h.born;this.startTick=s.tick;this.initial={person:h.lineage,name:h.name,actorGeneration:h.actorGeneration||s.generation,born:h.born,worldTick:s.tick,startAge:h.startAge,profession:h.profession,race:h.race,culture:h.culture,habits:[...h.habits],personality:{...h.personality},counters:{...h.counters},parents:[...(s.people[h.lineage]?.parents||[])]};
  this.actions={};this.events={};this.goalEpisodes={};this.jobs={};this.locations={};this.conditionTicks={};this.decisions=[];this.trace=[];this.attemptEvidence=[];this.refusals=[];this.lastRefusal=priorRefusal;this.delveAttempts=0;this.attemptsAfterRefusal=0;this.attemptsWithKnownRefusal=0;this.poisonDelveAttempts=0;this.poisonCombatStarts=0;this.activeDelveStarts=0;this.roots=new Set();this.repeatRoots=0;this.residenceStarts=0;this.homeWishes=0;this.ownDeath=null;this.goalRun=0;this.maxGoalRun=0;this.lastGoal=goalKey(h.goal);this.lastArea=null;this.areaRun=0;this.maxAreaRun=0;
 }
 after(s,before,previousHead){
  const h=s.hero,after=lifeContext(s);this.trace.push(before);if(this.trace.length>24)this.trace.shift();
  const index=previousHead?s.journal.indexOf(previousHead):-1;
  const entries=(index>=0?s.journal.slice(0,index):s.journal.filter(e=>e.tick===s.tick)).slice().reverse().filter(e=>!e.actor||e.actor===this.person);
  for(const e of entries){
   tally(this.events,e.type);if(e.type==='death')this.ownDeath=copy(e);
   if(e.type==='flee'){this.lastRefusal={tick:e.tick,text:e.text,context:before};this.refusals.push(this.lastRefusal);if(this.refusals.length>16)this.refusals.shift();}
   if(e.type==='choice'&&e.text.includes('откладывает поручения и идёт в подземелье')){
    this.delveAttempts++;const prior=this.lastRefusal&&this.lastRefusal.tick<e.tick?this.lastRefusal:null;if(prior)this.attemptsAfterRefusal++;
    const known=Object.entries(h.memory.rejected||{}).map(([area,r])=>({area,...r}));if(known.length)this.attemptsWithKnownRefusal++;
    if(before.conditions.some(c=>c.id==='poison'&&c.until>e.tick))this.poisonDelveAttempts++;
    this.attemptEvidence.push({tick:e.tick,text:e.text,before,after,priorRefusal:prior,knownRefusals:known.slice(-8)});if(this.attemptEvidence.length>24)this.attemptEvidence.shift();
   }
  }
  const key=goalKey(h.goal);if(key!==this.lastGoal){if(h.goal){tally(this.goalEpisodes,h.goal.kind);if(h.goal.job)tally(this.jobs,h.goal.job);this.decisions.push({tick:s.tick,before,after});if(this.decisions.length>32)this.decisions.shift();}this.goalRun=0;this.lastGoal=key;}this.goalRun++;this.maxGoalRun=Math.max(this.maxGoalRun,this.goalRun);
  if(after.delve&&(!before.delve||after.delve.root!==before.delve.root||after.delve.started!==before.delve.started)){this.activeDelveStarts++;if(this.roots.has(after.delve.root))this.repeatRoots++;this.roots.add(after.delve.root);}
  if(after.combat&&after.combat!==before.combat&&after.conditions.some(c=>c.id==='poison'&&c.until>s.tick))this.poisonCombatStarts++;
  if(before.residenceSince===null&&after.residenceSince!==null)this.residenceStarts++;
  if(!before.lifeMotive&&after.lifeMotive)this.homeWishes++;
  tally(this.actions,h.lastAction||'unset');for(const c of before.conditions)if(c.until>s.tick)tally(this.conditionTicks,c.id);
  const location=h.transit?`journey:${h.transit.from}/${h.transit.to}`:h.area;tally(this.locations,location);if(location===this.lastArea)this.areaRun++;else{this.lastArea=location;this.areaRun=1;}this.maxAreaRun=Math.max(this.maxAreaRun,this.areaRun);
 }
 finish(s,{limit}){
  const h=s.hero,archive=[...s.lives].reverse().find(l=>l.lineage===h.lineage&&l.outcome==='dead'),before=this.trace.at(-1)||lifeContext(s),area=s.areas[h.deathSnapshot?.area||archive?.area||h.area];
  const dead=!h.alive,cause=dead?(archive?.cause||s.graves.find(g=>g.lineage===h.lineage)?.cause||null):null,records={...(h.career.records||{}),[h.profession]:{rank:h.career.rank,xp:h.career.xp}};
  return {initial:this.initial,windowStart:this.startTick,windowSteps:s.tick-this.startTick,worldTick:s.tick,lifeTicks:s.tick-h.born,lifeDays:(s.tick-h.born)/240,alive:h.alive,personAlive:s.people[h.lineage]?.alive,stoppedBy:dead?'death':s.tick>=limit?'alive-at-limit':'other-stop',censored:h.alive&&s.tick>=limit,legacyEndedAlive:Boolean(h.alive&&h.life.ended),
   death:dead?{cause,classification:classifyDeath({cause,deathText:this.ownDeath?.text,before}),text:this.ownDeath?.text,area:h.deathSnapshot?.area||archive?.area,areaType:before.area===(h.deathSnapshot?.area||archive?.area)?before.areaType:area?.type,postTickAreaType:area?.type,transit:before.transit,tick:h.deathSnapshot?.tick??h.life.endedAt,before,poisonStillActive:h.conditions.some(c=>c.id==='poison'&&c.until>s.tick)}:null,
   end:{profession:h.profession,rank:h.career.rank,records:copy(records),careerChanges:copy(h.career.history||[]),level:h.level,counters:copy(h.counters),peacefulWork:h.counters.peacefulWork||0,kills:h.kills,places:h.memory.places.length,knownPeople:h.memory.people.length,quests:h.quests.reduce((m,q)=>(tally(m,q.status),m),{}),trustedRelations:Object.values(h.relations||{}).filter(r=>r.trust>=15).length,relations:copy(h.relations),companions:(archive?.companions||h.companions).map(c=>({id:c.person||c.uid||c.id,role:c.role,name:c.name})),wealth:dead?archive?.wealth:h.gold,life:copy(h.life),actualOwnedWorkshops:Object.values(s.areas).flatMap(a=>a.objects.filter(o=>o.kind==='workshop'&&o.owner===h.lineage).map(o=>({area:a.id,id:o.id,state:o.state})))},
   observedActionTicks:this.actions,eventCounts:this.events,goalEpisodes:this.goalEpisodes,workGoalEpisodes:this.jobs,locationTicks:this.locations,conditionTicks:this.conditionTicks,maxUnchangedGoalTicks:this.maxGoalRun,maxUnchangedLocationTicks:this.maxAreaRun,
   delve:{attempts:this.delveAttempts,activeStarts:this.activeDelveStarts,repeatedRoots:this.repeatRoots,attemptsAfterAnyPriorRefusal:this.attemptsAfterRefusal,attemptsWithKnownRefusals:this.attemptsWithKnownRefusal,poisonedAttempts:this.poisonDelveAttempts,poisonCombatStarts:this.poisonCombatStarts,evidence:this.attemptEvidence},homeWishes:this.homeWishes,residenceStarts:this.residenceStarts,lastRefusal:this.lastRefusal,refusals:this.refusals,lastDecisions:this.decisions,traceTail:this.trace};
 }
}
