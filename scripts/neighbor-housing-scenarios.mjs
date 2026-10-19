import assert from 'node:assert/strict';
import {foundationFixture,foundationSteps,foundationSave,foundationContext} from './foundation-scenarios.mjs';
import {setModule} from '../rules.js';import {createPerson} from '../modules/lineage.js';import {recordPersonRemains} from '../modules/remains.js';
export {foundationSteps as neighborSteps,foundationSave as neighborSave,foundationContext as neighborContext};
export function neighborFixture({space=true,friend=false,kin=false,culture=null,wealth=20}={}){
 const f=foundationFixture(),{s,a,leader,builder}=f;for(const id of ['relationships','witness-news','npc-contacts','remains'])setModule(s,id,true);foundationSteps(f,4);
 // One local death checkpoint; the first housing request must actually observe its body.
 if(space){builder.alive=false;builder.health=0;builder.status='dead';builder.died=s.tick;builder.deathCause='Лихорадка';assert.ok(recordPersonRemains(s,builder));}
 const guest=s.people[createPerson(s,{name:'Новый сосед',role:'житель',alive:true,area:a.id,parents:kin?[leader.id]:[],culture:culture||leader.culture},{initialJob:'merchant'})];guest.area=a.id;guest.x=a.refugeSite.x;guest.status='resident';Object.assign(guest.needs,{energy:50,hunger:10,sleeping:false});Object.assign(guest.agenda,{task:null,due:0,wealth,duty:.8});guest.home=f.source.id;
 // Existing personal acquaintance is a prepared initial belief, not a restore initializer.
 if(friend)leader.agenda.bonds[guest.id]=2;return {...f,guest,host:leader};
}
