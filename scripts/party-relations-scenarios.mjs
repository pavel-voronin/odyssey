import assert from 'node:assert/strict';
import {createWorld,step} from '../engine.js';
import {setModule} from '../rules.js';
export function pairFixture(refuse=false){
 const s=createWorld(3),h=s.hero;
 for(const key of ['body','stories','caravans','faction-paths','events','people'])setModule(s,key,false);
 h.area='a0';h.x=24;h.energy=12;h.hp=h.maxHp;h.hunger=0;h.magic.mana=h.magic.maxMana;h.goal=null;
 for(let i=0;i<3;i++)step(s);assert.ok(s.areas[h.area].temporaryCamp);
 // The pair specimen starts at the fire, after the real local approach.
 for(let i=0;i<12&&Math.abs(h.x-68)>1;i++)step(s);assert.ok(Math.abs(h.x-68)<=1);
 h.energy=60;h.mind.stress=20;h.quests=[];
 const people=Object.values(s.people).filter(p=>p.alive&&p.id!==h.lineage&&p.role!=='ребёнок').slice(0,3);
 h.companions=people.map(p=>{p.status='withHero';p.area=h.area;p.x=h.x-4;p.health=p.maxHealth||100;p.needs={hunger:10,energy:80,sleeping:false,meals:0,sleeps:0,conversations:0,loneliness:0};p.roadSupplies={food:0,medicine:0};p.agenda.sociability=.8;p.agenda.duty=.8;h.relations[p.id]={trust:90};return {id:p.id,uid:p.id,person:p.id,name:p.name,role:'person',attack:3,healing:0,scouting:0,ethics:1,loyalty:90,hp:30,maxHp:30};});
 h.companions=h.companions.slice(0,2);const [a,b,absent]=people;
 if(refuse){b.agenda.sociability=.1;b.agenda.duty=.1;}
 return {s,h,a,b,absent};
}
