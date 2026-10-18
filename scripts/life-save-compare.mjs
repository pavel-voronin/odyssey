import assert from 'node:assert/strict';
// Only the position of the off-screen actor's journal field may change on load.
// Keep the field's complete value and all world collection iteration orders.
export function assertSameSave(left,right,message){
 if(left===right)return 0;
 const normalize=text=>{const value=JSON.parse(text);for(const actor of Object.values(value.actorStates||{}))if(Object.hasOwn(actor,'actorJournal')){const journal=actor.actorJournal;delete actor.actorJournal;actor.actorJournal=journal;}return JSON.stringify(value);};
 assert.equal(normalize(left),normalize(right),message);return 1;
}
