import {selfDrivenActor} from './actor-projection.js';
import {rootWorld} from './world-ref.js';
import {bodyRemains} from './modules/remains.js';
// Observations of actions already resolved by simulation; never consulted by decisions.
export const ACTOR_FACT_LIMIT=32;
export function actorFact(s,kind,actor,target=null,amount=0){
  if(rootWorld(s)!==s&&rootWorld(s).hero!==s.hero){if(actor==='hero')actor=s.hero.lineage;if(target==='hero')target=s.hero.lineage;}
  if(s.actorFacts?.tick!==s.tick)s.actorFacts={tick:s.tick,events:[]};
  if(s.actorFacts.events.length<ACTOR_FACT_LIMIT)s.actorFacts.events.push({kind,actor,target,amount});
}
export function companionKey(c){return `party:${c.uid}`;}
export const REMAINS_TICKS=80;
export const MOTION_SHAPES=['wolf','dog','fungus','ghost','dragon'];
export function companionShape(c){return c.id==='dog'?'dog':c.id==='mushroom'?'fungus':c.id==='moth'?'ghost':null;}
export function enemyShape(o){return o.shape==='wolf'||o.name?.includes('волк')?'wolf':o.shape;}
export function markActorDeath(s,o,actor,shape){
  if(!MOTION_SHAPES.includes(shape)||o.deathView)return false;
  o.deathView={tick:s.tick,until:s.tick+REMAINS_TICKS,actor,shape};
  actorFact(s,'death',actor);return true;
}
export function visibleRemains(s,o){
  const d=o.deathView;
  return Boolean(d&&MOTION_SHAPES.includes(d.shape)&&(o.kind==='grave'||o.kind==='enemy'&&!o.alive)&&s.tick>=d.tick&&s.tick<d.until);
}
export function remainsView(s,o){
  const body=s.rules?.remains!==false&&bodyRemains(s,o);
  if(body){
    const p=body.position;
    if(body.carrier||p.kind!=='area'||p.area!==s.hero.area||!['fresh','trace'].includes(body.stage))return null;
    return {actor:o.deathView?.actor||(body.source.kind==='companion'?'party:'+body.source.id:body.source.id),
      shape:body.death.shape,x:p.x,direction:body.facing||1,body};
  }
  return visibleRemains(s,o)?{...o.deathView,x:o.x,body:null}:null;
}
export class ActorTracks{
  constructor(){this.tick=null;this.identity=null;this.tracks=new Map();}
  update(s,identity){
    if(this.tick===s.tick&&this.identity===identity)return false;
    const continuous=this.identity===identity&&this.tick===s.tick-1,previous=continuous?this.tracks:new Map();
    const next=new Map(),facts=s.actorFacts?.tick===s.tick?s.actorFacts.events:[];
    const add=(key,x,facing,rest=false,dead=false,fixed=false)=>{
      const before=previous.get(key),from=before?.to??x,delta=x-from;
      const attack=continuous&&facts.some(f=>f.kind==='attack'&&f.actor===key);
      next.set(key,{from,to:x,direction:dead?(fixed?facing||1:before?.direction||facing||1):attack?facing||1:delta?Math.sign(delta):before?.direction||facing||1,rest,dead,
        death:dead&&continuous&&facts.some(f=>f.kind==='death'&&f.actor===key),
        attack,
        hurt:continuous&&facts.some(f=>f.kind==='hurt'&&f.actor===key&&f.amount>0)});
    };
    if(!s.hero.transit)for(const o of s.areas[s.hero.area].objects){
      if(o.kind==='enemy'&&o.alive)add(o.id,o.x,s.hero.x<o.x?-1:1);
      else {const d=remainsView(s,o);if(d)add(d.actor,d.x,d.body?d.direction:s.hero.x<d.x?-1:1,false,true,Boolean(d.body));}
    }
    if(!s.hero.transit)for(const other of Object.values(s.actorStates||{}))if(other!==s.hero&&selfDrivenActor(s,other)&&!other.transit&&other.area===s.hero.area){
      add(other.lineage,other.x,other.facing,other.lastAction==='rest');
      for(const c of other.companions||[])add(companionKey(c),other.x,other.facing,other.lastAction==='rest');
    }
    for(const c of s.hero.companions||[]){
      const key=companionKey(c),attack=facts.find(f=>f.kind==='attack'&&f.actor===key);
      const target=attack&&s.areas[s.hero.area].objects.find(o=>o.id===attack.target);
      add(key,s.hero.x,target?Math.sign(target.x-s.hero.x)||s.hero.facing:s.hero.facing,s.hero.lastAction==='rest');
    }
    this.tick=s.tick;this.identity=identity;this.tracks=next;return true;
  }
}
