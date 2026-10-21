import assert from 'node:assert/strict';
import {combatFixture} from './combat-judgment-scenarios.mjs';
import {makeItem,receiveItem} from '../modules/inventory.js';
import {ITEM_BASES} from '../content.js';
import {setModule} from '../rules.js';
import {syncActiveActor} from '../actor-projection.js';
import {serialize,restore,step} from '../engine.js';
export const replyContext={log:()=>{},random:()=>0};
export function giveReplyBlade(f,{depth=6,rarity=4}={}){const {s,h}=f;s.areas[h.area].depth=depth;setModule(s,'equipment',true);setModule(s,'weapon-styles',true);const bases=ITEM_BASES.filter(b=>!b.craftOnly),r=(bases.findIndex(b=>b.id==='blade')+.1)/bases.length;let calls=0;const ctx={...replyContext,random:()=>calls++===0?r:0};const i=makeItem(s,ctx,rarity);h.equipment.weapon=null;receiveItem(s,replyContext,null,i);assert.equal(h.equipment.weapon,i);syncActiveActor(s);return i;}
export function replyFixture(opts={}){const f=combatFixture({hp:100,attack:12,courage:.9,...opts});giveReplyBlade(f);return f;}
export function freshFixture(opts={}){const f=replyFixture(opts);step(f.s);assert.ok(f.s.people[f.h.lineage].freshReply);return f;}
export function exactReply(f){syncActiveActor(f.s);const raw=serialize(f.s);assert.equal(serialize(restore(raw)),raw);return raw;}
