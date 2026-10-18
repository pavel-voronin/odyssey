export function storyObject(s,c,area,label,x=52){
  const id=`${c.id}-object-${c.refs.length}`;
  s.areas[area].objects.push({id,kind:'story',story:c.id,name:label,x,resolved:false});c.refs.push({area,id});return id;
}
export function storyGoal(s,c,ctx,area,x,intent,reason){ctx.goal(s,'storyAction',area,x,intent,reason,{story:c.id});}
export function chronicleChoice(s,c,text){c.choices.push({tick:s.tick,text});}
export function narrativeChange(s,c,text){c.effects.push({tick:s.tick,text});s.changes.push({tick:s.tick,text});}
