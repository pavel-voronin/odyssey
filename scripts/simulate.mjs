import { mkdir, writeFile } from 'node:fs/promises';
import { createWorld, step, serialize, restore } from '../engine.js';
import { setModule, MODULES } from '../rules.js';

const seeds = Number(process.env.SIM_SEEDS || 32), ticks = Number(process.env.SIM_TICKS || 5000);
const results = [];
function journey(seed, disabled = [], intervention = null) {
  let s = createWorld(seed), signatures = [], allEvents = [], deaths = 0, levels = 1, actions = new Set();
  for (const id of disabled) setModule(s, id, false);
  for (let i = 0; i < ticks; i++) {
    if (intervention && i === Math.floor(ticks / 3)) setModule(s, intervention, false);
    const before = s.journal[0], generation = s.generation;
    step(s); actions.add(s.hero.lastAction); levels = Math.max(levels, s.hero.level);
    if (generation !== s.generation) deaths++;
    if (s.journal[0] !== before) { const e = s.journal[0]; allEvents.push(e.type); }
    if (i % 40 === 0) signatures.push(`${s.hero.area}/${s.hero.goal?.kind}/${s.hero.alive}/${s.hero.weapon}/${s.hero.profession}/${s.hero.quests.filter(q=>q.status==='done').length}`);
    if (i % 233 === 0) { const beforeSave = serialize(s); s = restore(beforeSave); if (serialize(s) !== beforeSave) throw new Error(`Restore diverged: seed ${seed}, tick ${i}`); }
    if (!Number.isFinite(s.hero.hp) || s.hero.hp < 0 || s.hero.hp > s.hero.maxHp || s.hero.gold < 0 || s.hero.energy < 0 || s.hero.energy > 100 || s.hero.bag.length > 24) throw new Error(`State contract failed: seed ${seed}, tick ${i}`);
  }
  return { seed, signatures, deaths, maxLevel: levels, areas: Object.keys(s.areas).length, actions: [...actions].sort(), eventTypes: [...new Set(allEvents)].sort(), profession: s.hero.profession, completed: s.hero.quests.filter(q=>q.status==='done').length, encounters: s.hero.counters.encounters, companions: s.hero.counters.companions, gold: s.hero.gold, ticks };
}
const distance = (a,b) => a.signatures.reduce((n,value,i)=>n+(value!==b.signatures[i]?1:0),0)/a.signatures.length;
for (let seed = 1; seed <= seeds; seed++) {
  const base = journey(seed), repeat = journey(seed), peaceful = journey(seed, ['enemies']), noStories = journey(seed, ['encounters']), changed = journey(seed, [], 'body');
  if (distance(base,repeat) !== 0) throw new Error(`Determinism failed for seed ${seed}`);
  results.push({ ...base, signatures: undefined, divergence: { identical: distance(base,repeat), enemyAbilitiesOff: distance(base,peaceful), encountersOff: distance(base,noStories), bodyIntervention: distance(base,changed) } });
}
const average = fn => results.reduce((n,r)=>n+fn(r),0)/results.length;
const report = {
  generatedAt: new Date().toISOString(), seeds, ticksPerJourney: ticks, configurationsPerSeed: 5,
  totalTicks: seeds * ticks * 5,
  expectations: { deterministicReplay: true, saveConvergence: true, invariants: true, storyDivergence: average(r=>r.divergence.encountersOff) > .1 },
  average: { areas: average(r=>r.areas), maxLevel: average(r=>r.maxLevel), deaths: average(r=>r.deaths), encounters: average(r=>r.encounters), enemyAbilitiesDivergence: average(r=>r.divergence.enemyAbilitiesOff), encountersDivergence: average(r=>r.divergence.encountersOff), bodyInterventionDivergence: average(r=>r.divergence.bodyIntervention) },
  moduleContracts: MODULES.map(m=>m.contract), results
};
await mkdir('artifacts', { recursive: true }); await writeFile('artifacts/simulation-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
if (!report.expectations.storyDivergence) process.exitCode = 1;
