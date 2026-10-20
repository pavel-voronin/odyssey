import {paintFarmBed} from './farming-scene.js';
import {paintFoundation} from './foundation-view.js';
import {localEdgeTraces} from './modules/edge-traces.js';
import {physicalActorLook,readableActorLook,drawActorPack,drawProstheticLeg,drawWoundMarks,actorLabelPoint} from './actor-readability.js';
import {remainsObservationView} from './remains-observation.js';import {paintRemainsAt,paintCarriedRemains,paintRemainsCarrier} from './remains-carry-view.js';
import {carrySupport,paintCarrySupport,paintCarriedObserver} from './people-carry-view.js';
import {paintFerry} from './ferry-view.js';
import {horses,horsePosition,riddenHorse} from './modules/horse-state.js';
import {paintHorse} from './horse-view.js';
import {withLimbLook} from './modules/limb-state.js';
import {paintPatient} from './patient-view.js';
import {occupiedCover} from './modules/position-state.js';
import {paintStoneCover,paintPositionRay} from './position-view.js';
import {paintGuardianShield,paintGuardianNode} from './guardian-view.js';
import {paintRuinedHouse,ruinedSilhouette} from './building-ruins-view.js';
import {paintHomeBuilding} from './home-building-view.js';
import {paintQuadruped} from './quadruped-view.js';import {petCargoModel} from './pet-cargo-view.js';
import {drawDescent} from './navigation-tool-view.js';
import {selfDrivenActor,actorPartyLeader} from './actor-projection.js';
import {paintDistantTowers,paintLocalTower} from './landmark-view.js';
import {paintFords} from './ford-view.js';
import {petShape,paintPet,petPartyOffset} from './pet-shapes.js';
import {petMotion} from './pet-motion.js';
import {paintFoodSource} from './local-food-view.js';
import {paintHearthMeal} from './hearth-meal-view.js';
import {RoadMapRenderer} from './road-map.js';
import {paintInterior} from './interior-view.js';
import {paintSymbolPlaque,worldSignKind} from './world-signs.js';
import {workshopInteriorsOn} from './modules/workshop-place.js';
import {biomePalette} from './palette.js';
import {SceneGrade,sceneProfile} from './color-profile.js';
import {facadeLayout} from './facades.js';
import {sceneComposition,surfaceShadow,surfaceShadowAlpha,projectedCaster} from './composition.js';
import {actorSkin,drawHead} from './actor-head.js';
import {creatureTraceVisible,drawCreatureTrace} from './creature-trace-view.js';
import {drawMechanisms,drawLifts} from './mechanism-view.js';
import {scentPlantKnown} from './modules/pet-scent-policy.js';
import { race } from './content.js';
import {calendar} from './calendar.js';
import {appearance,heroAppearance,personAppearance} from './appearance.js';
import {drawGarment} from './outfit.js';
import {scenery,houseProfile} from './scenery.js';
import {terrainProfile,terrainRidge,paintTerrainBackdrop,facadeSmoke} from './terrain-profile.js';
import {boundaryMotifs,transitLandscape,blendColor,blendScenery,paintBoundaryMotifs,paintTransitLandmarks} from './scene-boundary.js';
import {walkPose,heroStance,quadrupedPose,creatureActionPose,DeathMotion} from './motion.js';
import {ActorTracks,companionKey,companionShape,visibleRemains,remainsView,MOTION_SHAPES} from './actor-facts.js';
import {bodyRemains} from './modules/remains.js';
function corpseSpecies(s,body){
  if(s.rules?.lineage===false||!body?.death.race)return null;
  const species=race(body.death.race),stature=body.death.anatomy?.stature;
  return {...species,height:species.height*(Number.isFinite(stature)&&stature>0?stature:1)};
}
import {weatherAt} from './modules/weather.js';
import {sceneLights,shadowShape,SHADOW_BUDGET,CHARM_LIGHT_COLORS} from './lighting.js';
import {precipitationWeather,weatherParticles} from './weather-view.js';
import {areaEnvironment} from './area-environment.js';
import {sceneCamera,sceneFrame,CameraTrack,applyCamera,cameraLocalMatrix} from './scene-camera.js';
import {billboardFrame,readableContext,surfaceContext} from './camera-perspective.js';
import {paintPlaceRule} from './place-rule-view.js';
import {recordSilhouette,ContourCache,paintSilhouette,paintRoof,houseSilhouette} from './silhouette.js';
import {campPassage} from './geometry.js';
import {contourBounds,lightContributions,lightInViewport,contactContour,groundLightReach} from './light-contributions.js';
const palette = {
  road: ['#657965', '#a5b396', '#344a3c', '#243a2d'],
  village: ['#6d8274', '#b4bfa0', '#45533f', '#293d2c'],
  forest: ['#34554e', '#7c9a7a', '#294436', '#193227'],
  ruins: ['#484e65', '#9eaaa0', '#333e48', '#26332f'],
  camp: ['#526e64', '#a3af8e', '#354939', '#233a2c'],
  cave:['#263746','#495550','#303d3a','#1b2928'],dungeon:['#262937','#545151','#3d403d','#252a2c'],undercity:['#26343b','#747862','#3d4b46','#283530'],
  port:['#647d87','#c4ceba','#537c81','#344a47'],sea:['#4e758d','#c2d1c6','#3d687a','#26495b'],island:['#5c8990','#d7d6a2','#557e58','#354f3a'],
  desert:['#998773','#ded0a2','#aa9670','#79694b'],mountain:['#6d7d8c','#d3d8cc','#71817d','#3e4b47'],
  dream:['#635c85','#c1b4bd','#5c637e','#39445b'],clockwork:['#6a726f','#bdbba4','#69716b','#414b45'],citadel:['#718079','#c3c6a6','#596653','#3b4635']
};
export class Scene {
  constructor(canvas,{profileMode='buffer',onCameraFrame,roadView='scene'}={}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.state = null; this.previousX = 0; this.area = null;
    this.output=this.ctx;this.grade=new SceneGrade(this.output);this.profileMode=profileMode;
    this.roadView=roadView;this.roadMap=new RoadMapRenderer();this.mode='scene';
    this.beastTracks=new ActorTracks();this.deathMotion=new DeathMotion();this.cameraTrack=new CameraTrack();this.onCameraFrame=onCameraFrame;
    for(const name of ['ferryHull','horse','person','tree','ruin','cart','pet','formedCreature','quadruped','wolf','guard','creature','fire','sign']){const paint=this[name];this[name]=(...args)=>{const ground=name==='person'&&Number.isFinite(args[10]?.supportGround)?args[10].supportGround:args[1],restore=billboardFrame(this.ctx,this.camera,args[0],ground,this.pixelRatio);try{return paint.apply(this,args);}finally{restore();}};}
    this.media=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=this.media.matches;this.frame=null;
    this.motionChanged=event=>{this.reduced=event.matches;this.redraw();};this.media.addEventListener('change',this.motionChanged);
    this.visibilityChanged=()=>this.redraw();document.addEventListener('visibilitychange',this.visibilityChanged);
    this.observer = new ResizeObserver(() => this.redraw()); this.observer.observe(canvas);
  }
  redraw(){if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.draw();}
  schedule(){
    if(this.frame!==null||document.hidden)return;
    this.frame=requestAnimationFrame(()=>{this.frame=null;if(performance.now()-this.paintedAt>=1000/30)this.draw();else this.schedule();});
  }
  destroy(){
    if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.state=null;
    this.observer.disconnect();document.removeEventListener('visibilitychange',this.visibilityChanged);this.media.removeEventListener('change',this.motionChanged);
    this.grade.destroy();
  }
  update(state) {
    state=remainsObservationView(state);
    if(this.observedAlive===true&&!state.hero.alive)this.roadMap.setView({inspect:false,layer:'current'});this.observedAlive=state.hero.alive;
    if(this.roadView==='map'||this.roadMap.inspect)this.roadMap.update(state);
    const replaced=Boolean(this.state&&this.state!==state);
    this.deathMotion.update(state,{scene:state.hero.area,now:performance.now(),reset:replaced,animate:!this.reduced&&state.rules?.animation!==false});
    if(replaced)this.beastTracks=new ActorTracks();
    const identity=`${state.seed}/${state.generation}/${state.hero.lineage}`,sceneKey=state.hero.transit?`travel:${state.hero.transit.from}:${state.hero.transit.to}`:state.hero.area;
    const same = this.area === sceneKey&&this.identity===identity;
    const x=state.hero.transit&&!state.hero.transit.ferry?50:state.hero.x;
    this.beastTracks.update(state,`${identity}/${sceneKey}`);
    if(this.tick!==state.tick||!same||this.previousX!==x||replaced){
      this.actionObserved=!replaced&&same&&state.tick===this.tick+1;
      this.cameraReset=!this.actionObserved;
      this.hurt=this.actionObserved&&this.previousHp>state.hero.hp;this.previousHp=state.hero.hp;
      this.from = this.actionObserved ? this.previousX : x; this.to = x;
      const previous=this.actionObserved?this.actorPositions:new Map();this.actorPositions=new Map();
      if(!state.hero.transit)for(const other of Object.values(state.actorStates||{}))if(other!==state.hero&&selfDrivenActor(state,other)&&!other.transit&&other.area===state.hero.area)this.actorPositions.set(other.lineage,{from:previous?.get(other.lineage)?.to??other.x,to:other.x});
      for(const o of state.areas[state.hero.area].objects.filter(o=>o.kind==='enemy'&&o.alive&&!o.resolved&&o.person))this.actorPositions.set(o.person,{from:previous?.get(o.person)?.to??o.x,to:o.x});
      for(const o of state.areas[state.hero.area].objects.filter(o=>o.kind==='resident'&&!selfDrivenActor(state,o.person)))this.actorPositions.set(o.person,{from:previous?.get(o.person)?.to??o.x,to:o.x});
      if(!state.hero.transit)for(const convoy of state.logistics?.convoys||[]){const p=state.people[convoy.person];if(p?.alive&&!p.roadTransit&&p.status==='caravan'&&p.area===state.hero.area&&(convoy.movement==='physical'||state.rules?.['npc-logistics']!==false))this.actorPositions.set(p.id,{from:previous?.get(p.id)?.to??p.x??42,to:p.x??42});}
      if(!state.hero.transit)for(const j of state.society?.journeys||[]){const p=state.people[j.person];if(j.movement==='physical'&&p?.alive&&!p.roadTransit&&p.status==='travelling'&&p.area===state.hero.area)this.actorPositions.set(p.id,{from:previous?.get(p.id)?.to??p.x??42,to:p.x??42});}
      this.previousX=x;this.area=sceneKey;this.identity=identity;this.tick=state.tick;this.started=performance.now();
    }
    this.state = state;
    this.redraw();
  }
  setRoadView(view){this.roadView=view==='scene'?'scene':'map';this.roadMap.setView({inspect:false,layer:'current'});if(this.roadView==='map'&&this.state)this.roadMap.update(this.state);this.redraw();}
  setMapView(options){if(this.state)this.roadMap.update(this.state);this.roadMap.setView(options);if(this.state)this.roadMap.update(this.state);this.redraw();}
  panMap(dx,dy){if(this.mode!=='map')return;this.roadMap.pan(dx,dy);this.redraw();}
  zoomMap(factor){if(this.mode!=='map')return;this.roadMap.zoom(factor);this.redraw();}
  followMap(){this.roadMap.follow();this.redraw();}
  draw() {
    if (!this.state||document.hidden) return;
    const now=performance.now();this.paintedAt=now;
    this.remainsPainted=new Set();this.canvas.dataset.remainsBodies='';
    const canvas = this.canvas, s = this.state, h = s.hero;let c=this.output;
    const travel=transitLandscape(s),a=travel?.area||s.areas[h.area];
    const terrain=areaEnvironment(s,a),terrainView=terrainProfile(s,a);
    canvas.dataset.terrainFamily=terrainView.family;
    const terrainFrom=travel?.mix?terrainProfile(s,travel.mix.from):terrainView,terrainTo=travel?.mix?terrainProfile(s,travel.mix.to):terrainView,terrainMix=travel?.mix?.progress||0;
    const treeCount=Math.round(terrainFrom.trees*(1-terrainMix)+terrainTo.trees*terrainMix);
    const viewportWidth=canvas.clientWidth,ht=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2),frame=sceneFrame(a,viewportWidth),w=frame.worldWidth;
    if(viewportWidth<=0||ht<=0)return;
    this.pixelRatio=dpr;
    if (canvas.width !== Math.round(viewportWidth * dpr) || canvas.height !== Math.round(ht * dpr)) { canvas.width = Math.round(viewportWidth * dpr); canvas.height = Math.round(ht * dpr); }
    this.mode=(this.roadView==='map'||this.roadMap.inspect)&&this.roadMap.model?'map':'scene';canvas.dataset.view=this.mode;canvas.dataset.fordIds='';canvas.dataset.petMotion='[]';this.petViewFacts=[];
    if(this.mode==='map'){canvas.dataset.mapScope=this.roadMap.model.scope;canvas.dataset.mapLayer=this.roadMap.model.layer;canvas.dataset.mapBody=this.roadMap.model.body;this.mapMarker=this.roadMap.draw(this.output,viewportWidth,ht,dpr);canvas.dataset.boundaryIds='';canvas.dataset.transitBlend='';canvas.dataset.renderMs=(performance.now()-now).toFixed(3);canvas.dataset.mapBuilds=String(this.roadMap.builds);canvas.dataset.mapKnown=String(this.roadMap.model.nodes.length);this.onCameraFrame?.();return;}
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.composition=s.rules?.['scene-planes']===false||terrain.type==='sea'||terrain.interior?null:sceneComposition(s,terrain,w,ht);
    const base=palette[terrain.type]||palette.road,areaPalette=area=>biomePalette(s.seed,area,palette[area.type]||palette.road),pair=travel?.mix?[areaPalette(travel.mix.from),areaPalette(travel.mix.to)]:null;
    const p=pair?pair[0].map((color,i)=>blendColor(color,pair[1][i],travel.mix.progress)):s.rules?.scenery===false?base:areaPalette(terrain),ground=this.composition?.actorGround??ht*.72,backGround=this.composition?.buildingGround??ground;
    const weather=weatherAt(s,a);
    const profile=s.rules?.['color-profile']===false||this.profileMode==='legacy'?null:sceneProfile(s,terrain,weather),pass=this.grade.begin(viewportWidth,ht,dpr,profile,this.profileMode);this.ctx=c=pass.context;
    const view=travel?.mix?blendScenery(scenery(s.seed,travel.mix.from),scenery(s.seed,travel.mix.to),travel.mix.progress):scenery(s.seed,terrain,s.rules?.scenery!==false),looks=(actor,legacy)=>withLimbLook(actor,s.rules?.appearance===false?physicalActorLook(s,actor,legacy||{}):personAppearance(s,actor,legacy));
    const underground=['cave','dungeon','undercity'].includes(terrain.type)||terrain.realm==='underground',water=terrain.type==='sea';
    const animate=!this.reduced&&s.rules?.animation!==false;if(!animate)this.actionObserved=false;
    const phase=animate?Math.min(1,(now-this.started)/240):1,actionPhase=this.actionObserved?phase:1,fall=this.deathMotion.progress(now,animate);
    const night = calendar(s.tick).night&&(!profile||!underground);
    const screenX=x=>24+x/100*(w-48),stance=heroStance(s),restPoint=screenX(h.x),hx=screenX(this.from+(this.to-this.from)*phase)+stance.offsetX;
    const oldHeroViewX=this.heroViewX;this.heroViewX=hx;
    const follow=this.cameraTrack.resolve({key:this.identity+'/'+this.area,width:viewportWidth,maxScroll:frame.maxScroll,target:hx-viewportWidth/2,now,animate:animate&&s.rules?.['camera-probe']!==false,reset:this.cameraReset});
    const oldCamera=this.camera;this.camera=sceneCamera(s,a,viewportWidth,{scroll:follow.scroll,height:ht,ground});this.cameraReset=false;
    this.ctx=c=readableContext(c,this.camera,dpr);
    const boundaries=boundaryMotifs(s,a,{width:w,viewportWidth,scroll:this.camera.scroll});
    this.ground=ground;this.shadowCount=0;this.contourCount=0;this.usedLightSources=new Set();this.occludedLightSources=0;this.shadowCasters=[];this.lightSet=sceneLights(s,a,{width:w,height:ht,ground,view,night,heroX:hx,...(this.composition?{backGround,occupied:this.composition.occupied}:{})});this.shadowWeather=weather.id;
    const sky = c.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, night ? '#192d38' : p[0]); sky.addColorStop(1, night ? '#53675a' : p[1]);
    c.fillStyle = sky; c.fillRect(0, 0, w, ht);
    applyCamera(c,this.camera,dpr);
    c.fillStyle = night ? '#d3dfbb' : '#dce0b5'; c.globalAlpha = .68;
    if(!underground&&!a.interior){const restore=billboardFrame(c,this.camera,w*view.sunX,backGround,dpr);c.globalAlpha=['cloud','rain','snow','storm','fog'].includes(weather.id)?.22:.68;c.beginPath(); c.arc(w * view.sunX, ht * view.sunY, night ? 14 : 28, 0, Math.PI * 2); c.fill();restore();} c.globalAlpha = 1;
    if (night&&!underground) { c.fillStyle = '#c7d4c2'; for (let i = 0; i < 30; i++) c.fillRect((i * 133 + 37) % w, 28 + (i * 53) % (ht * .38), 1, 1); }
    // Decorative depth; every actor moves exclusively along the same ground line.
    for (let layer = 0; layer < 3; layer++) {
      const restoreLayer=billboardFrame(c,this.camera,w/2,ground-(55-layer*18),dpr);
      c.fillStyle = [night ? '#384b47' : '#6a8065', p[2], p[3]][layer]; c.globalAlpha = layer === 0 ? .45 : .62;
      c.beginPath(); c.moveTo(0, ground);
      for (let x = 0; x <= w + 15; x += 15) {
        const y = backGround - (terrainRidge(terrainFrom,x,layer,view)*(1-terrainMix)+terrainRidge(terrainTo,x,layer,view)*terrainMix);
        c.lineTo(x, y);
      }
      c.lineTo(w, ground + 5); c.closePath(); c.fill(); c.globalAlpha = 1;restoreLayer();
    }
    if(this.composition)this.paintDistantComposition(w,ht,p,view);
    for(let i=0;i<treeCount;i++){
      const x=w*(.06+i*.88/Math.max(1,treeCount-1));
      this.tree(x,backGround-8,terrainView.family==='forest'?65+view.values[15+i]*24:32+view.values[15+i]*15,'#2e4938',.65);
    }
    paintTerrainBackdrop(c,terrainView,w,backGround,p);
    if(this.composition)this.paintSurface(w,ht,p,view,weather,water,terrainView);
    const house=index=>!h.transit&&s.rules?.scenery!==false&&s.rules?.facades!==false&&terrain.facades?.profiles[index]||houseProfile(s.rules?.scenery===false?0:s.seed,s.rules?.scenery===false?{id:terrain.type,type:terrain.type}:terrain,index,view);
    if(travel?.mix)paintTransitLandmarks(c,s,travel.mix,w,backGround);
    else if(view.district)this.district(w,backGround,view,terrain.type,s.tick,house,s.rules.property!==false&&a.objects.some(o=>o.kind==='workshop'&&o.state==='burned'&&(s.rules.facades===false||!a.facades?.profiles.find(p=>p.id===o.building)?.structure)));
    else if(terrain.foundedSettlement){const b=terrain.foundedSettlement.housing;this.house(w*b.x/100,backGround,.9,undefined,undefined,house(0));const own=terrain.dwellingPlot?.house;if(own){const i=terrain.facades?.profiles.findIndex(p=>p.id===own.building);if(i>=0)this.house(w*terrain.dwellingPlot.x/100,backGround,.9,undefined,undefined,house(i));}}
    else if (terrain.type === 'village') { for(let i=0;i<3;i++)this.house(w*(.15+i*.3+view.values[10+i]*.1),backGround,.8+view.values[20+i]*.5,undefined,undefined,house(i)); }
    else if(terrain.type==='citadel'&&terrain.facades?.profiles?.length){for(let i=0;i<terrain.facades.profiles.length;i++)this.house(w*(i+1)/(terrain.facades.profiles.length+1),backGround,.85,undefined,undefined,house(i));}
    else if(['port','undercity'].includes(terrain.type)){this.house(w*.22,backGround,.9,undefined,undefined,house(0));this.house(w*.75,backGround,1.1,undefined,undefined,house(1));}
    if(a.foundation?.status==='building'&&!h.transit){const restore=billboardFrame(c,this.camera,w*a.refugeSite.x/100,backGround,dpr);paintFoundation(c,a.foundation);restore();}
    const dp=a.dwellingPlot,dr=dp?.project;if(dr?.materials&&dr.status!=='done'&&!h.transit){const restore=billboardFrame(c,this.camera,w*dp.x/100,backGround,dpr);paintFoundation(c,{...dr,progress:dr.steps.length,label:dr.rebuild?'Перестройка':'Свой дом'});restore();}
    canvas.dataset.landmarkIds=paintDistantTowers(c,s,a,w,backGround,{camera:this.camera,dpr}).map(t=>t.id).join(',');
    if (terrain.type === 'ruins') { this.ruin(w * .33, backGround); if(h.transit||!paintLocalTower(c,s,a,w,backGround,{camera:this.camera,dpr}))this.ruin(w * .72, backGround); }
    for(const m of boundaries){const restore=billboardFrame(c,this.camera,m.x+m.side*5,backGround-5,dpr);paintBoundaryMotifs(c,[m],backGround);restore();}
    if(!this.composition){const c=surfaceContext(this.ctx,this.camera);c.fillStyle = p[3]; c.fillRect(-96, ground, w+192, ht - ground+96+Math.ceil(Math.abs(this.camera.f)));
    if(weather.id==='snow'){c.fillStyle='#c5d5ca';c.fillRect(0,ground,w,3);}
    c.fillStyle = '#8c9970'; c.globalAlpha = .5; c.fillRect(0, ground, w, 2); c.globalAlpha = 1;
    c.fillStyle = '#43513a'; c.fillRect(0, ground + 4, w, 4);
    for (let i = 0; i < (water?0:w); i += 13) {
      c.strokeStyle = '#587046'; c.globalAlpha = .3; c.beginPath(); c.moveTo(i, ground + 5); c.lineTo(i + 2, ground - (i % 7 + 2)); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = '#859368'; c.globalAlpha = .15; c.fillRect(i * 1.3 % w, ground + 16 + i % 56, 3 + i % 4, 1); c.globalAlpha = 1;
    }
    }
    if(a.interior){this.shadowCasters=[];paintInterior(c,a,w,ht,ground,s);}
    for(const caster of this.shadowCasters){if(caster.contour&&s.rules?.['contour-shadows']!==false)this.castContourShadow(caster.contour,{x:caster.x,y:caster.y},false,.65,5);else this.castShadow(caster.x, this.composition?caster.y:ground,caster.width,caster.height,false,.65);}
    if(water){c.fillStyle='#284e60';c.fillRect(0,ground-8,w,ht-ground+8);c.strokeStyle='#9cb6b8';c.lineWidth=1;c.globalAlpha=.35;for(let row=0;row<5;row++){c.beginPath();for(let x=0;x<w;x+=10)c.lineTo(x,ground+row*17+Math.sin(x/31+s.tick*.2+row)*3);c.stroke();}c.globalAlpha=1;c.fillStyle='#6e654a';c.beginPath();c.moveTo(12,ground+1);c.lineTo(w-12,ground+1);c.lineTo(w-42,ground+30);c.lineTo(45,ground+30);c.fill();c.fillStyle='#b0a078';c.fillRect(13,ground-3,w-26,4);c.strokeStyle='#9b9d86';c.lineWidth=2;c.beginPath();c.moveTo(w*.56,ground);c.lineTo(w*.56,ground-100);c.stroke();c.fillStyle='#d4d0a9';c.beginPath();c.moveTo(w*.56+3,ground-97);c.lineTo(w*.56+3,ground-26);c.lineTo(w*.56+65,ground-26);c.fill();}
    paintPlaceRule(surfaceContext(c,this.camera),s,a,screenX,ground);
    this.paintFixtures();
    if(!travel)canvas.dataset.fordIds=paintFords(c,s,a,screenX,ground,now,{camera:this.camera,dpr}).map(f=>f.edge).join(',');
    paintFoodSource(c,s,a,screenX,ground,{camera:this.camera,dpr});
    const campSite=s.areas[a.fieldCamp]?.temporaryCamp?.site;
    if(!travel&&campSite?.version===1&&campPassage(s,a.id,a.fieldCamp,h.lineage)?.known)this.sign(screenX(campSite.parentX),ground,'♨');
    if(!travel&&a.temporaryCamp?.site?.version===1)this.sign(screenX(a.temporaryCamp.site.localEntry),ground,'↩');
    paintHearthMeal(c,s,a,screenX,ground,{camera:this.camera,dpr});
    const weatherMoving=this.precipitation(weather.id,a.id,view,w,ground,now,animate);
    if(weather.id==='fog'){c.fillStyle='#c0cac2';c.globalAlpha=.23;c.fillRect(0,ground*.4,w,ground*.6);c.globalAlpha=1;}
    if(weather.id==='heat'){c.fillStyle='#be9e6e';c.globalAlpha=.08;c.fillRect(0,0,w,ground);c.globalAlpha=1;}
    drawMechanisms(c,s,a,screenX,ground);
    drawLifts(c,s,a,screenX,ground);
    if(!travel){const trails=localEdgeTraces(s),painted=new Set();for(const t of trails){const at=t.edge+'/'+t.x;if(painted.has(at))continue;painted.add(at);const x=screenX(t.x),restore=billboardFrame(c,this.camera,x,ground,dpr);drawCreatureTrace(c,x,ground,trails.filter(q=>q.edge===t.edge&&q.x===t.x).length>1);restore();}}

    for(const patch of a.ecology?.patches||[]){const px=screenX(patch.x),restore=billboardFrame(c,this.camera,px,ground,dpr);c.save();c.strokeStyle=patch.stock?'#789366':'#645e43';c.lineWidth=2;for(let i=0;i<Math.min(12,patch.stock);i++){c.beginPath();c.moveTo(px+(i-6)*3,ground);c.lineTo(px+(i-6)*3-2,ground-4-i%3);c.stroke();}c.restore();restore();}
    for (const o of a.objects) {
      const beastTrack=this.beastTracks.tracks.get(o.id),beastMotion=s.rules?.['creature-motion']!==false;
      const x = screenX(beastMotion&&beastTrack?beastTrack.from+(beastTrack.to-beastTrack.from)*phase:o.x);
      const restoreObject=billboardFrame(c,this.camera,x,ground,dpr);try{
      if(creatureTraceVisible(s,a,o))drawCreatureTrace(c,x,ground,o.trace.group);
      if (o.kind === 'enemy' && o.alive && (!o.person||o.person!==h.lineage&&s.people[o.person]?.enemyBody?.stage==='hostile')) {
        c.save();if(s.rules?.mutations!==false&&o.mutation==='giant'){c.translate(x,ground);c.scale(1.15,1.15);c.translate(-x,-ground);}if(s.rules?.mutations!==false&&o.mutation==='phase')c.globalAlpha=.65;
        const elementColors={fire:'#c99362',frost:'#8cbac8',storm:'#a6a5d4',venom:'#9dbd79',arcane:'#bc8fb7',grave:'#94a49b'};if(s.rules?.elements!==false&&elementColors[o.element]){c.save();c.strokeStyle=elementColors[o.element];c.globalAlpha=.45;c.lineWidth=2;c.beginPath();c.ellipse(x,ground-17,18,23,0,0,7);c.stroke();c.restore();}
        if (o.shape === 'wolf' || o.name.includes('волк')) {
          if(beastMotion)this.quadruped(x,ground,quadrupedPose(beastTrack,phase,Math.abs((beastTrack?.to??o.x)-(beastTrack?.from??o.x))*(w-48)/100),'wolf');
          else this.wolf(x, ground, s.tick, h.combat === o.id);
        }
        else if(o.shape==='deer')this.quadruped(x,ground,quadrupedPose(beastTrack,beastMotion?phase:1,Math.abs((beastTrack?.to??o.x)-(beastTrack?.from??o.x))*(w-48)/100),'deer');
        else if(beastMotion&&o.shape==='dog')this.quadruped(x,ground,quadrupedPose(beastTrack,phase,Math.abs((beastTrack?.to??o.x)-(beastTrack?.from??o.x))*(w-48)/100),'dog');
        else if (o.shape === 'guard' || !o.shape) this.guard(x, ground);
        else if (o.shape === 'human'){const p=s.people[o.person],look=p?looks(p,p.appearance):null,track=p&&this.actorPositions?.get(p.id),walking=track&&track.from!==track.to&&phase<1&&!this.reduced,px=walking?screenX(track.from+(track.to-track.from)*phase):x,rest=Boolean(p?.needs?.sleeping)||p?.hostileLife?.action==='rest';this.person(px,ground,look?.cloak||(p?'#ac906b':o.pacified?'#b2ba8a':'#a38b78'),false,walking?Math.sign(track.to-track.from):o.facing||-1,0,false,rest,look,null,{kind:rest?'rest':walking?'walk':'idle',progress:phase,walking,distance:track?Math.abs(track.to-track.from)*(w-48)/100:0});}
        else if(beastMotion&&MOTION_SHAPES.includes(o.shape))this.formedCreature(x,ground,o.shape,creatureActionPose(o.shape,beastTrack,phase,Math.abs((beastTrack?.to??o.x)-(beastTrack?.from??o.x))));
        else this.creature(x, ground, o.shape, s.tick);
        c.restore();if(s.rules?.tactics!==false&&o.tactic==='charged'&&o.battle?.intent==='strike'){c.fillStyle='#d99b79';c.beginPath();c.moveTo(x,ground-61);c.lineTo(x-5,ground-52);c.lineTo(x+5,ground-52);c.fill();}
        paintGuardianShield(c,s,o,x,ground);paintPositionRay(c,s,o,screenX,ground);
        if (o.pacified) { c.fillStyle = '#c8d3ac'; c.font = '11px monospace'; c.fillText('=',x-3,ground-51); }
        if (h.combat === o.id || o.hp < o.maxHp) { c.fillStyle = '#302e28'; c.fillRect(x - 17, ground - 41, 34, 3); c.fillStyle = '#d38b72'; c.fillRect(x - 17, ground - 41, 34 * o.hp / o.maxHp, 3); }
      }
      const remains=remainsView(s,o),ownBody=remains?.body?.source.kind==='person'&&remains.body.source.id===h.lineage&&!h.alive;
      if(remains&&!ownBody&&(beastMotion||remains.body)){
        const d=remains,track=this.beastTracks.tracks.get(d.actor)||{dead:true};
        if(d.body?.stage==='bones')paintRemainsAt(this,s,d.body,screenX(d.x),ground);
        else if(['wolf','deer','dog'].includes(d.shape))this.quadruped(screenX(d.x),ground,quadrupedPose(track,beastMotion?phase:1),d.shape);
        else if(MOTION_SHAPES.includes(d.shape))this.formedCreature(screenX(d.x),ground,d.shape,creatureActionPose(d.shape,track,beastMotion?phase:1));
        else if(petShape({id:d.shape}))this.pet(screenX(d.x),ground,d.shape,d.direction||1,false,false,{...petMotion(d.shape,{dead:true,direction:d.direction},1,{animate:false}),dead:true});
        else {
          c.save();c.translate(screenX(d.x),ground);c.rotate((d.body?.death.fallSide||1)*Math.PI*.5);
          if(d.body?.source.kind==='person'||d.shape==='human'){
            const look=d.body?.death.appearance;
            this.person(0,0,look?.cloak||'#8b8d73',Boolean(d.body?.death.traveller),d.direction||1,0,false,false,look,corpseSpecies(s,d.body),{kind:'death',progress:1});
          }
          else if(d.shape==='guard'||d.body?.source.kind==='enemy'&&d.shape==='unknown')this.guard(0,0);
          else this.creature(0,0,d.shape,0);
          c.restore();
        }
      }
      if (o.kind === 'resident'){
        if(s.rules.remains!==false&&!h.alive&&s.observation.focus?.kind==='remains'&&bodyRemains(s,h)?.carrier?.id===o.person)continue;
        const p=s.people?.[o.person];
        const watchBody=s.rules?.['npc-watch-needs']!==false&&p&&['marching','guarding','returning'].includes(p.status)&&s.society.orders.some(order=>order.person===p.id);
        const partyBody=p&&(p.id===h.lineage||actorPartyLeader(s,p.id));
        const detailed=p&&s.actorStates?.[p.id]&&selfDrivenActor(s,p.id);
        if((!p||!detailed)&&(!p||!partyBody&&p.alive&&!p.liftTransit&&!p.roadTransit&&p.area===a.id&&(['resident','guarding','wandering','lever-duty','injury-wait'].includes(p.status)||watchBody))){
          const species=p&&s.rules?.lineage!==false?{...race(p.race),height:race(p.race).height*(p.role==='ребёнок'?.65:1)}:null;
          const look=p?looks(p,p.appearance):null;
          const track=this.actorPositions?.get(o.person),walking=track&&track.from!==track.to&&phase<1&&!this.reduced;
          const px=walking?screenX(track.from+(track.to-track.from)*phase):x,rest=p?.partyInjury?.stage==='waiting'||Boolean(p?.needs?.sleeping)&&(!watchBody||s.rules?.['npc-needs']!==false),kind=rest?'rest':p?.mechanismDuty?.stage==='holding'?'work':p?.agenda?.task?.kind||'idle';
          this.person(px,ground,look?.cloak||'#ac906b',false,walking?Math.sign(track.to-track.from):1,0,false,rest,look,species,{kind,progress:phase,walking,distance:track?Math.abs(track.to-track.from)*(w-48)/100:0});
          paintCarriedRemains(this,s,p,px,ground);
          if(watchBody&&rest){c.fillStyle='#bcd18e';c.font='12px Georgia';c.fillText('z',px+12,ground-43);}
          if(p?.ailment){c.fillStyle='#db9982';c.font='11px monospace';c.fillText('!',x-3,ground-49);}
        }
      }
      if(o.kind==='captive'&&!o.resolved){
        const captive=o.dungeonRescue&&s.people[o.person],look=captive?looks(captive,captive.appearance):null,species=captive&&s.rules.lineage!==false?race(captive.race):null;
        if(captive)this.person(x,ground,look?.cloak||'#b39d7d',false,-1,0,false,false,look,species,{kind:captive.alive?'idle':'death',progress:1});else this.person(x,ground,'#b39d7d',false,-1,0);c.strokeStyle='#746447';c.lineWidth=2;c.beginPath();c.moveTo(x-7,ground-20);c.lineTo(x+9,ground-20);c.stroke();
      }
      if(o.kind==='farmBed')paintFarmBed(c,a.farmPlot,x,ground);
      if(o.kind==='workshop'&&s.rules.property!==false){
        if(workshopInteriorsOn(s)&&o.workshopInterior)continue;
        if(o.state==='burned'){c.fillStyle='#45423c';c.fillRect(x-14,ground-4,29,4);c.strokeStyle='#76644e';c.lineWidth=3;c.beginPath();c.moveTo(x-11,ground-2);c.lineTo(x+7,ground-10);c.moveTo(x-8,ground-9);c.lineTo(x+12,ground-2);c.stroke();}
        else{c.fillStyle='#97754b';c.fillRect(x-13,ground-15,26,4);c.fillRect(x-10,ground-11,3,11);c.fillRect(x+7,ground-11,3,11);c.fillStyle='#aeb4ad';c.fillRect(x-5,ground-21,11,6);c.fillRect(x-1,ground-15,4,2);}
      }
      if(o.kind==='hostileCamp'){c.fillStyle='#534d39';c.beginPath();c.ellipse(x,ground-1,9,2,0,0,7);c.fill();c.strokeStyle='#a88d66';c.lineWidth=2;c.beginPath();c.moveTo(x-6,ground-2);c.lineTo(x+4,ground-6);c.moveTo(x-5,ground-6);c.lineTo(x+5,ground-2);c.stroke();}
      if(o.kind==='descent')drawDescent(c,o,x,screenX(o.descent.bottom),ground);
      if (o.kind === 'rest') {
        if (a.type === 'camp') this.fire(x, ground, s.tick);
        else { this.sign(x, ground, '✚'); }
      }
      if (o.kind === 'herb' && o.count > 0&&scentPlantKnown(s,h,a,o)) {
        c.strokeStyle = '#9db57e'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, ground); c.lineTo(x, ground - 14); c.stroke();
        c.fillStyle = '#c2d6a0'; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x + (i % 2 ? 5 : -4), ground - 5 - i * 4, 5, 2.5, i % 2 ? -.6 : .6, 0, 7); c.fill(); }
      }
      if(o.kind==='borderPost'){c.fillStyle='#a89164';c.fillRect(x-20,ground-31,4,31);c.fillStyle='#d9bd75';c.fillRect(x-33,ground-30,12,9);c.strokeStyle='#a89164';c.beginPath();c.moveTo(x-13,ground-13);c.lineTo(x+8,ground-13);c.stroke();}
      if(o.kind==='noiseTrap'&&!o.taken){c.fillStyle=o.items[0]?.decoy.state==='armed'?'#d3b579':'#7a817e';c.fillRect(x-4,ground-5,8,5);c.strokeStyle='#919a99';c.beginPath();c.moveTo(x-6,ground-2);c.lineTo(x+6,ground-2);c.stroke();}
      if(o.kind==='copyDesk'&&!o.taken){c.fillStyle='#8d765c';c.fillRect(x-7,ground-12,14,3);c.fillRect(x-5,ground-9,2,9);c.fillRect(x+3,ground-9,2,9);c.fillStyle='#e6dbc0';c.fillRect(x-4,ground-15,8,3);}
      if (['loot','heirloom','estateFunds'].includes(o.kind) && !o.taken&&!o.spent) { c.fillStyle = '#b7a071'; c.beginPath(); c.ellipse(x, ground - 5, 6, 5, 0, 0, 7); c.fill(); }
      if(o.kind==='roadRupture'){const broken=s.edges[o.key]?.rupture?.state==='broken';c.strokeStyle=broken?'#b57c5b':'#87916a';c.lineWidth=3;c.beginPath();c.moveTo(x-12,ground-2);c.lineTo(x-3,ground+3);c.lineTo(x+2,ground-4);c.lineTo(x+12,ground+1);c.stroke();if(broken){c.fillStyle='#61554a';c.fillRect(x-10,ground-8,7,5);c.fillRect(x+4,ground-6,8,4);}}
      if(o.kind==='wagon'&&!o.journey){c.fillStyle=o.condition>0?'#94794e':'#625b50';c.fillRect(x-14,ground-19,28,12);c.strokeStyle='#d0b47b';c.strokeRect(x-14,ground-19,28,12);c.fillStyle='#342e29';for(const dx of [-10,10]){c.beginPath();c.arc(x+dx,ground-4,5,0,Math.PI*2);c.fill();}c.strokeStyle='#b29565';c.beginPath();c.moveTo(x+14,ground-11);c.lineTo(x+24,ground-8);c.stroke();}
      if(o.kind==='supplyCache'&&!o.taken&&o.stockade){c.strokeStyle=o.stockade.current>0?'#b69a70':'#756654';c.lineWidth=2;c.beginPath();for(const dx of [-14,-7,7,14]){c.moveTo(x+dx,ground);c.lineTo(x+dx,ground-(o.stockade.current>0?18:4));}c.moveTo(x-15,ground-8);c.lineTo(x+15,ground-8);c.stroke();}
      if(o.kind==='exchangeDesk'){c.fillStyle='#8b6b45';c.fillRect(x-14,ground-13,28,5);c.fillRect(x-11,ground-8,3,8);c.fillRect(x+8,ground-8,3,8);for(const [dx,color]of [[-5,'#d5b567'],[5,'#b1bbb6']]){c.fillStyle=color;c.beginPath();c.arc(x+dx,ground-17,3,0,Math.PI*2);c.fill();}}
      if(o.kind==='castle'){c.fillStyle='#8d8875';c.fillRect(x-18,ground-42,36,42);c.fillRect(x-25,ground-52,12,52);c.fillRect(x+13,ground-52,12,52);c.fillStyle='#b8ae8b';for(const dx of [-25,-18,13,20])c.fillRect(x+dx,ground-57,5,7);c.fillStyle='#363b34';c.fillRect(x-6,ground-19,12,19);}
      if(o.cargoTrace){c.strokeStyle='#d8a66d';c.lineWidth=2;c.beginPath();c.moveTo(x-5,ground-19);c.lineTo(x,ground-14);c.lineTo(x+5,ground-19);c.stroke();}
      if(o.kind==='supplyCache'&&!o.taken){c.fillStyle='#9b815b';c.fillRect(x-9,ground-13,18,13);c.strokeStyle='#d0b47b';c.strokeRect(x-9,ground-13,18,13);}
      if(o.kind==='practicePart'){c.fillStyle='#8e704e';c.fillRect(x-7,ground-4,14,4);c.fillStyle=o.state==='demonstration'?'#bec4b9':'#b49a6e';c.fillRect(x-4,ground-7,8,3);c.fillStyle='#4f5c53';c.fillRect(x-1,ground-6,2,3);}
      paintGuardianNode(c,s,a,o,screenX,ground);paintStoneCover(c,s,o,screenX,ground);
      if (o.kind === 'relic' && !o.taken) { c.shadowBlur = 16; c.shadowColor = '#c0daaa'; c.fillStyle = '#d1dfb0'; c.beginPath(); c.moveTo(x, ground - 22); c.lineTo(x + 7, ground - 11); c.lineTo(x, ground - 4); c.lineTo(x - 7, ground - 11); c.fill(); c.shadowBlur = 0; }
      if(o.kind==='burialPit'){c.fillStyle='#272323';c.beginPath();c.ellipse(x,ground-1,9,3,0,0,Math.PI*2);c.fill();c.strokeStyle='#797063';c.stroke();}
      if (o.kind === 'grave'&&(o.burial||!ownBody&&!(remains&&(beastMotion||remains.body)))) { this.castShadow(x,ground,10,17);c.fillStyle = '#8b9985'; c.fillRect(x - 5, ground - 17, 10, 17); c.fillStyle = '#394d38'; c.fillRect(x - 1, ground - 13, 2, 8); c.fillRect(x - 3, ground - 11, 6, 2); }
      if(o.kind==='story'&&(!o.resolved||o.sealRecord&&!o.destroyed&&o.state!=='burned')){c.fillStyle='#9caaae';c.fillRect(x-9,ground-24,18,24);c.strokeStyle='#d7c391';c.strokeRect(x-7,ground-22,14,12);if(o.sealRecord){c.beginPath();c.moveTo(x,ground-22);c.lineTo(x,ground-11);c.stroke();}c.fillStyle='#d7c391';c.font='12px monospace';c.textAlign='center';c.fillText(o.resolved?'≡':'!',x,ground-34);c.textAlign='left';}
      if(o.kind==='gate'){
        if(o.mode==='portal'||o.mode==='time'){c.strokeStyle=o.mode==='time'?'#dfc68f':'#b6aad1';c.lineWidth=3;c.beginPath();c.ellipse(x,ground-23,13,23,0,Math.PI,Math.PI*2);c.stroke();c.fillStyle=o.mode==='time'?'#b4a177':'#7777a4';c.globalAlpha=.5;c.fillRect(x-11,ground-22,22,21);c.globalAlpha=1;}
        else this.sign(x,ground,o.mode==='sea'?'≈':'↓');
      }
      if (o.kind === 'encounter' && !o.resolved) {
        if (o.icon === 'human') this.person(x, ground, '#aa9c78', false, -1, 0);
        else if(o.icon==='pet'&&o.existingPet?.id==='dog'&&o.existingPet.packCargo)this.companionPet(o.existingPet,x,ground,null,phase);else if (o.icon === 'pet') this.creature(x, ground, 'pet', s.tick);
        else if (o.icon === 'chest') this.creature(x, ground, 'chest', s.tick);
        else if (o.icon === 'shrine') { c.fillStyle='#a6aa8a';c.fillRect(x-8,ground-32,16,32);c.fillRect(x-12,ground-36,24,5);c.fillStyle='#5e795b';c.fillRect(x-3,ground-29,6,12); }
        else if (o.icon === 'grave') { c.fillStyle='#9a9b80';c.fillRect(x-7,ground-22,14,22); }
        else { c.fillStyle='#83a9ac';c.beginPath();c.ellipse(x,ground-2,16,4,0,0,7);c.fill(); }
        c.fillStyle='#e0d2a1';c.font='11px monospace';c.textAlign='center';c.fillText('?',x,ground-50);c.textAlign='left';
      }
      }finally{restoreObject();}
    }
    if(s.rules?.companions!==false&&!h.transit)for(const p of Object.values(s.people))for(const pet of [...(p.pets||[]),...(p.petBoarding?[p.petBoarding.pet]:[])]){const body=pet.packCargo?.body||pet.petCustody?.body;if(pet.hp<=0||body?.area!==a.id)continue;const track=this.beastTracks.tracks.get(companionKey(pet));this.companionPet(pet,screenX(body.x)+(body.area===p.area&&Math.abs(body.x-p.x)<3?14:0),ground,track,phase);}
    let freightDrawn=0;
    if(!h.transit)for(const convoy of s.logistics?.convoys||[]){const p=s.people[convoy.person];if(!p?.alive||p.roadTransit||p.status!=='caravan'||p.area!==a.id||convoy.movement!=='physical'&&s.rules?.['npc-logistics']===false)continue;
      freightDrawn++;
      const track=this.actorPositions?.get(p.id),moving=track&&track.from!==track.to&&phase<1,px=screenX(track?track.from+(track.to-track.from)*phase:p.x??42),direction=track?.from!==track?.to?Math.sign(track.to-track.from):p.facing||1,look=looks(p,p.appearance);
      const sleeping=p.roadStop?.phase==='rest'||s.rules?.['npc-road-needs']!==false&&s.rules?.['npc-needs']!==false&&p.needs?.sleeping;this.cart(px-direction*25,ground,convoy.food,convoy.medicine,direction);this.person(px,ground,look?.cloak||'#ad9872',false,direction,0,false,sleeping,look,s.rules?.lineage===false?null:race(p.race),{kind:sleeping?'rest':moving?'walk':'idle',progress:phase,walking:moving&&!sleeping,distance:Math.abs((track?.to??0)-(track?.from??0))*(w-48)/100});if(sleeping){c.fillStyle='#bcd18e';c.font='12px Georgia';c.fillText('z',px+12,ground-43);}
    }
    canvas.dataset.caravans=String(freightDrawn);
    canvas.dataset.guards=String(s.rules?.['npc-watch-needs']===false||h.transit?0:s.society.orders.filter(order=>{const p=s.people[order.person];return p?.alive&&!p.roadTransit&&p.area===a.id&&['marching','guarding','returning'].includes(p.status)&&!h.companions.some(c=>c.person===p.id);}).length);
    let travellersDrawn=0;
    if(!h.transit)for(const j of s.society?.journeys||[]){const p=s.people[j.person];if(j.movement!=='physical'||!p?.alive||p.roadTransit||p.status!=='travelling'||p.area!==a.id)continue;
      travellersDrawn++;const track=this.actorPositions?.get(p.id),moving=track&&track.from!==track.to&&phase<1,px=screenX(track?track.from+(track.to-track.from)*phase:p.x??42),direction=track?.from!==track?.to?Math.sign(track.to-track.from):p.facing||1,look=looks(p,p.appearance);
      const sleeping=p.roadStop?.phase==='rest'||s.rules?.['npc-road-needs']!==false&&s.rules?.['npc-needs']!==false&&p.needs?.sleeping;this.person(px,ground,look?.cloak||'#ad9872',false,direction,0,false,sleeping,look,s.rules?.lineage===false?null:race(p.race),{kind:sleeping?'rest':moving?'walk':'idle',progress:phase,walking:moving&&!sleeping,distance:Math.abs((track?.to??0)-(track?.from??0))*(w-48)/100});if(sleeping){c.fillStyle='#bcd18e';c.font='12px Georgia';c.fillText('z',px+12,ground-43);}
    }
    canvas.dataset.travellers=String(travellersDrawn);
    const vessel=a.boatDeck?.ship===s.ferry?.id?s.ferry:null;canvas.dataset.ferry=vessel?.id||'';if(vessel){this.ferryHull(w/2,ground,w-28,vessel);for(const id of [vessel.captain,...Object.keys(vessel.passengers)]){if(id===h.lineage)continue;const person=s.people[id];if(!person?.alive)continue;const look=looks(person,person.appearance);this.person(screenX(person.x),ground,look?.cloak||'#a89e77',false,1,0,false,false,look,s.rules?.lineage===false?null:race(person.race),{kind:'idle',progress:phase});}}else if(s.ferry?.phase==='docked'&&s.ferry.port===a.id)this.ferryHull(screenX(50),ground,90,s.ferry);
    let detailedDrawn=0;
    if(!h.transit)for(const other of Object.values(s.actorStates||{}))if(other!==h&&other.carriedBy!==h.lineage&&selfDrivenActor(s,other)&&!other.transit&&other.area===a.id){
      detailedDrawn++;const track=this.beastTracks.tracks.get(other.lineage),from=track?.from??other.x,to=track?.to??other.x,walking=animate&&from!==to&&phase<1,px=screenX(from+(to-from)*phase),direction=track?.direction||other.facing||1;
      const look=withLimbLook(s.people[other.lineage],s.rules?.appearance===false?{...other.appearance,prop:other.weapon>0?'blade':'none'}:heroAppearance({...s,hero:other}));
      const support=carrySupport(s,other);paintCarrySupport(this,s,other,px,ground,phase);
      this.person(px-(support?7*(other.facing||1):0),ground-(support?25:0),look?.cloak||'#a9c686',false,direction,0,Boolean(track?.attack)&&actionPhase<.8,other.lastAction==='rest'||Boolean(occupiedCover(s,other)),look,s.rules?.lineage===false?null:race(other.race),{supportGround:ground,kind:support?'rest':occupiedCover(s,other)?'rest':other.lastAction,progress:actionPhase,walking,distance:Math.abs(to-from)*(w-48)/100,hurt:Boolean(track?.hurt)&&actionPhase>.45&&actionPhase<.95});
      if(s.rules?.companions!==false)for(let i=0;i<other.companions.length;i++){
        const companion=other.companions[i],body=companion.packCargo?.body||companion.petCustody?.body;if(companion.person===h.lineage||companion.person===other.carriedBy||body&&body.area!==a.id)continue;const cx=body?screenX(body.x):px-direction*petPartyOffset(other.companions,i),petTrack=this.beastTracks.tracks.get(companionKey(companion));
        if(companion.role==='person'){const p=s.people[companion.person],look=p?looks(p,p.appearance):null;this.person(cx,ground,look?.cloak||'#ad9872',false,direction,0,Boolean(petTrack?.attack)&&phase<.8,other.lastAction==='rest',look,s.rules?.lineage===false?null:race(companion.race),{kind:other.lastAction==='rest'?'rest':walking?'walk':'idle',progress:phase,walking,distance:Math.abs(to-from)*(w-48)/100});}
        else if(petShape(companion)){const pose=petMotion(companion.id,petTrack,phase,{pixelsPerUnit:(w-48)/100,animate:animate&&s.rules?.['creature-motion']!==false,facing:companion.facing||other.facing,rest:other.lastAction==='rest'});this.pet(cx,ground,companion.id,pose.direction,pose.rest,pose.hurt,pose);}
        else if(companion.id==='dog'&&(s.rules?.['creature-motion']!==false||companion.packCargo))this.companionPet(companion,cx,ground,petTrack,phase);
        else if(companionShape(companion)&&s.rules?.['creature-motion']!==false){const shape=companionShape(companion);this.formedCreature(cx,ground,shape,creatureActionPose(shape,petTrack,phase,Math.abs(to-from)));}
        else this.creature(cx,ground,companion.id==='mushroom'?'fungus':companion.id==='moth'?'ghost':'pet',s.tick);
      }
      paintPatient(this,s,other,px,ground,phase);
      c.fillStyle='#e3e5d1';c.font='10px Georgia';const nameWidth=Math.min(c.measureText(other.name).width,120,viewportWidth-12),label=actorLabelPoint(px,ground,54*(s.rules?.lineage===false?1:race(other.race).height),{left:this.camera.scroll,width:viewportWidth,labelWidth:nameWidth});c.textAlign='center';c.fillText(other.name,label.x,label.y,nameWidth);c.textAlign='left';
    }
    canvas.dataset.detailedActors=String(detailedDrawn);
    for(const b of Object.values(s.remains?.byId||{}))if((b.transport||b.stage==='bones')&&!b.carrier&&b.position.kind==='area'&&b.position.area===a.id&&!(!h.alive&&b.source.kind==='person'&&b.source.id===h.lineage)&&!a.objects.some(o=>o.remainsId===b.id||o.deathView?.remainsId===b.id))paintRemainsAt(this,s,b,screenX(b.position.x),ground);
    if (!h.transit&&s.merchant.area === a.id) { const look=looks({id:'merchant-sava',role:'merchant'});this.person(screenX(58), ground, look?.cloak||'#867cac', false, -1, 0,false,false,look); c.fillStyle = '#957c58'; c.fillRect(screenX(58) + 12, ground - 13, 18, 13); c.strokeStyle = '#c3a982'; c.strokeRect(screenX(58) + 12, ground - 13, 18, 13); }
    if(h.transit&&['portal','time'].includes(h.transit.mode)){c.strokeStyle=h.transit.mode==='time'?'#d2b779':'#ac93cb';c.lineWidth=4;c.beginPath();c.ellipse(hx,ground-24,24,38,0,0,7);c.stroke();}
    const mount=riddenHorse(s,h);let horseCount=0;for(const m of horses(s)){if(m===mount)continue;const at=horsePosition(s,m);if(!h.transit&&at?.area===a.id){this.horse(screenX(at.x),ground,m,{direction:1,phase});horseCount++;}}canvas.dataset.horses=String(horseCount+(mount?1:0));
    canvas.dataset.peopleCarry=h.carriedBy||s.people[h.lineage]?.bodyCarry?.stage==='carrying'?String(h.carriedBy||h.lineage):'';
    if (h.alive) {
      const walking = h.lastAction === 'walk' && actionPhase < 1 && !this.reduced&&this.to!==this.from;
      const bob = 0;
      if (h.lastAction === 'rest') { c.fillStyle = '#bcd18e'; c.font = '12px Georgia'; c.fillText('z', hx + 16, ground - 43); }
      const heroLook=withLimbLook(s.people[h.lineage],s.rules?.appearance===false?physicalActorLook(s,s.people[h.lineage],h.appearance):heroAppearance(s));
      const support=carrySupport(s,h);paintCarrySupport(this,s,h,hx,ground,actionPhase);
      if(mount)this.horse(hx,ground,mount,{direction:stance.direction,walking,phase:actionPhase});
      this.person(hx-(support?7*stance.direction:0), ground - bob-(mount?29:support?25:0), heroLook?.cloak||'#a9c686', true, stance.direction, 0, h.lastAction === 'attack' && actionPhase < .8, Boolean(support)||h.lastAction === 'rest'||Boolean(occupiedCover(s,h)), heroLook, s.rules?.lineage===false?null:race(h.race),{supportGround:ground,kind:support?'rest':occupiedCover(s,h)?'rest':h.lastAction,progress:actionPhase,walking:walking&&!mount&&!support,distance:Math.abs(this.to-this.from)*(w-48)/100,hurt:this.hurt&&actionPhase>.45&&actionPhase<.95});
      paintCarriedObserver(this,s,h,hx,ground,actionPhase);paintCarriedRemains(this,s,s.people[h.lineage],hx,ground);
      if(s.rules?.equipment!==false&&s.rules?.enchantments!==false&&h.equipment?.charm){const color=CHARM_LIGHT_COLORS[h.equipment.charm.modifier];if(color){c.fillStyle=color;c.shadowColor=color;c.shadowBlur=5;c.fillRect(hx+3,ground-24-bob,3,3);c.shadowBlur=0;}}
      if (s.rules?.companions !== false) for (let i=0;i<(h.companions?.length||0);i++) {
        const companion=h.companions[i];if(companion.person===h.carriedBy)continue;const body=companion.packCargo?.body||companion.petCustody?.body;if(body&&body.area!==a.id)continue;
        const restSide=restPoint>(this.camera.scroll||0)+this.camera.viewportWidth/2?-1:1;
        const cx=body?screenX(body.x):stance.campRest?restPoint+restSide*petPartyOffset(h.companions,i):hx-h.facing*petPartyOffset(h.companions,i);
        if(companion.role==='person'){const person=s.people[companion.person]||{id:companion.id},look=looks(person,person.appearance);this.person(cx,ground,look?.cloak||'#ad9872',false,stance.campRest?-1:h.facing,0,false,stance.campRest,look,s.rules?.lineage===false?null:race(companion.race),{kind:stance.campRest?'rest':'idle',progress:phase});}
        else if(petShape(companion)){const track=this.beastTracks.tracks.get(companionKey(companion)),pose=petMotion(companion.id,track,phase,{pixelsPerUnit:(w-48)/100,animate:animate&&s.rules?.['creature-motion']!==false,facing:companion.facing||h.facing,rest:h.lastAction==='rest'});this.pet(cx,ground,companion.id,pose.direction,pose.rest,pose.hurt,pose);}
        else if(companion.id==='dog'&&(s.rules?.['creature-motion']!==false||companion.packCargo)){const track=this.beastTracks.tracks.get(companionKey(companion));this.companionPet(companion,cx,ground,track,phase);}
        else if(companionShape(companion)&&s.rules?.['creature-motion']!==false){const shape=companionShape(companion),track=this.beastTracks.tracks.get(companionKey(companion));this.formedCreature(cx,ground,shape,creatureActionPose(shape,track,phase,Math.abs((track?.to??h.x)-(track?.from??h.x))));}
        else this.creature(cx,ground,companion.id==='mushroom'?'fungus':companion.id==='moth'?'ghost':'pet',s.tick);
      }
      paintPatient(this,s,h,hx,ground,phase);
      c.fillStyle='#c9c394';c.globalAlpha=.5;c.fillRect(hx-5,ground+3,10,1);c.globalAlpha=1;
      if (['heal', 'collect', 'attack','spell'].includes(h.lastAction) && actionPhase < 1) {
        c.globalAlpha = 1 - phase; c.fillStyle = h.lastAction === 'spell'?'#a4c4ed':h.lastAction === 'attack' ? '#eedeb0' : '#cce9a9'; c.font = '18px Georgia'; c.fillText(h.lastAction === 'heal' ? '+' : '✧', hx + 18, ground - 43 - phase * 18); c.globalAlpha = 1;
      }
    }else{
      const body=s.rules?.remains===false?null:bodyRemains(s,h),p=body?.position;
      const look=withLimbLook(body?{race:body.death.race,anatomy:body.death.anatomy}:s.people[h.lineage],body?.death.appearance||(s.rules?.appearance===false?h.appearance:heroAppearance(s)));
      if(body&&['buried','consumed'].includes(body.stage)){}
      else if(body?.stage==='bones'&&!body.carrier&&p.kind==='area'&&p.area===a.id)paintRemainsAt(this,s,body,screenX(p.x),ground);
      else if(body?.carrier&&s.observation.focus?.kind==='remains')paintRemainsCarrier(this,s,body,hx,ground,phase);
      else if(body?.transport&&!body.carrier&&p.kind==='area'&&p.area===a.id)paintRemainsAt(this,s,body,screenX(p.x),ground);
      else if(!body||!body.carrier&&p.kind==='area'&&p.area===a.id){
        c.save();c.translate(body?screenX(p.x):hx,ground);c.rotate((body?body.death.fallSide||1:(h.deathSnapshot?.x??h.x)>80?-1:1)*Math.PI*.5*fall);this.person(0,0,look?.cloak||'#8b8d73',body?Boolean(body.death.traveller):true,body?.facing||h.facing,0,false,false,look,body?corpseSpecies(s,body):s.rules?.lineage===false?null:race(h.race),{kind:'death',progress:fall});c.restore();
      }
    }
    c.fillStyle = '#bfd0a1'; c.globalAlpha = .12;
    for (let i = 0; i < 15; i++) { c.beginPath(); c.arc((i * 73 + s.tick * 7) % w, ground - 10 - (i * 17 % 40), 1, 0, 7); c.fill(); } c.globalAlpha = 1;
    canvas.dataset.remainsBodies=[...this.remainsPainted].join(',');
    pass.finish();this.ctx=this.output;applyCamera(this.output,this.camera,dpr);
    this.paintIllumination(w,ht,(underground||night)&&!profile);
    this.output.setTransform(dpr,0,0,dpr,0,0);
    canvas.dataset.cameraDegrees=String(this.camera.degrees);canvas.dataset.cameraPerspective=String(this.camera.perspectiveDegrees);canvas.dataset.petMotion=JSON.stringify(this.petViewFacts);
    canvas.dataset.boundaryIds=boundaries.map(m=>m.entrance).join(',');canvas.dataset.transitBlend=travel?.mix?String(travel.mix.progress):'';
    canvas.dataset.cameraScroll=String(this.camera.scroll);canvas.dataset.worldWidth=String(w);
    canvas.dataset.colorProfile=pass.mode;canvas.dataset.profileKey=profile?.key||'legacy';canvas.dataset.composition=this.composition?.kind||'legacy';
    canvas.dataset.lights=String(this.lightSet.local.length);canvas.dataset.shadowCasters=String(this.shadowCount);canvas.dataset.contourCasters=String(this.contourCount);canvas.dataset.shadowSources=[...this.usedLightSources].sort().join(',');canvas.dataset.occludedSources=String(this.occludedLightSources);canvas.dataset.noGroundLights=this.state.rules?.['source-shadows']===false?'':this.lightSet.local.filter(l=>groundLightReach(l,this.shadowSurface(ground)).radius<=0).map(l=>l.id).join(',');
    if(oldCamera?.scroll!==this.camera.scroll||oldHeroViewX!==hx||oldCamera?.perspectiveDegrees!==this.camera.perspectiveDegrees)this.onCameraFrame?.();
    // CPU command preparation only; GPU completion is asynchronous. Never saved in the world.
    canvas.dataset.renderMs=(performance.now()-now).toFixed(3);
    if(animate&&(phase<1||!h.alive&&fall<1||weatherMoving||follow.moving))this.schedule();
  }
  paintDistantComposition(width,height,p,view){
    if(!this.composition.alpine||this.composition.underground)return;const c=this.ctx,base=this.composition.buildingGround;
    c.save();for(let i=0;i<5;i++){const x=(i-.25)*width/4,peak=Math.max(12,base-height*(.32+view.values[25+i]*.24)),spread=width*(.2+view.values[30+i]*.1);c.globalAlpha=.48;c.fillStyle=i%2?p[2]:'#81918c';c.beginPath();c.moveTo(x-spread,base);c.lineTo(x,peak);c.lineTo(x+spread,base);c.closePath();c.fill();c.globalAlpha=.35;c.fillStyle=p[1];c.beginPath();c.moveTo(x,peak);c.lineTo(x-spread*.18,peak+(base-peak)*.24);c.lineTo(x+spread*.08,peak+(base-peak)*.18);c.lineTo(x+spread*.19,peak+(base-peak)*.25);c.closePath();c.fill();}c.restore();
  }
  paintSurface(width,height,p,view,weather,water,terrainView){
    const c=surfaceContext(this.ctx,this.camera),plan=this.composition,back=plan.buildingGround,front=plan.actorGround;
    c.save();if(plan.coast&&!plan.underground&&!water){c.fillStyle='#4d7980';c.fillRect(0,back-22,width,26);c.strokeStyle='#9bb5aa';c.globalAlpha=.3;c.lineWidth=1;for(let i=0;i<12;i++){const x=view.values[20+i]*width,y=back-18+(i%3)*6;c.beginPath();c.moveTo(x,y);c.lineTo(x+18+view.values[32+i]*24,y);c.stroke();}c.globalAlpha=1;}
    c.fillStyle=terrainView.type==='desert'?p[3]:({waterfront:'#525f55',alpine:'#56625e',ruins:'#454e48',underground:'#35413c'})[plan.kind]||p[3];c.fillRect(-96,back,width+192,height-back+96+Math.ceil(Math.abs(this.camera.f)));
    c.fillStyle=terrainView.type==='desert'?'#b39a6e':({waterfront:'#747960',alpine:'#879082',ruins:'#727465',underground:'#67776a'})[plan.kind]||'#718267';c.globalAlpha=.48;c.beginPath();c.moveTo(-96,front-5);c.lineTo(width+96,front-5);c.lineTo(width+96,height+96+Math.ceil(Math.abs(this.camera.f)));c.lineTo(-96,height+96+Math.ceil(Math.abs(this.camera.f)));c.closePath();c.fill();c.globalAlpha=1;
    c.strokeStyle=plan.kind==='waterfront'?'#3d4c44':p[2];c.lineWidth=1;c.beginPath();c.moveTo(0,back+.5);c.lineTo(width,back+.5);c.stroke();
    const count=Math.min(40,Math.ceil(width/13));for(let i=0;i<count;i++){const x=(i+.2+view.values[i%48]*.6)*width/count,y=front+7+view.values[(i+13)%48]*Math.max(1,height-front-10);c.globalAlpha=.25;
      if(terrainView.type==='desert'){c.strokeStyle='#c5ae7e';c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+6,y-2,x+13,y);c.stroke();}
      else if(plan.kind==='waterfront'){c.strokeStyle='#a3a284';c.beginPath();c.moveTo(x,back+2);c.lineTo(x+3,height);c.stroke();}
      else if(['alpine','ruins','underground'].includes(plan.kind)){c.fillStyle=i%2?'#9ca18e':'#323e36';c.fillRect(x,y,4+view.values[(i+7)%48]*8,2);}
      else{c.strokeStyle='#83996d';c.beginPath();c.moveTo(x,back+1);c.lineTo(x-1,back-3-view.values[i%48]*4);c.stroke();c.fillStyle=p[1];c.fillRect(x,y,4,1);}
    }
    if(weather.id==='snow'){c.globalAlpha=.7;c.fillStyle='#c5d5ca';c.fillRect(0,back,width,2);for(let i=0;i<15;i++)c.fillRect(view.values[i]*width,front+view.values[i+16]*(height-front),5+view.values[i+30]*8,1);}
    c.restore();
  }
  precipitation(id,area,view,width,ground,now,animate){
    const key=`${area}/${id}`;
    if(this.weatherLayer?.key!==key){
      this.previousWeather=animate&&precipitationWeather(this.weatherLayer?.id)?{...this.weatherLayer,until:now+500}:null;
      this.weatherLayer={key,id,view,since:now};
    }
    if(!animate||this.previousWeather?.until<=now)this.previousWeather=null;
    const c=this.ctx,paint=(layer,opacity)=>{
      if(!layer||!precipitationWeather(layer.id))return;
      c.strokeStyle=layer.id==='snow'?'#deebe2':'#bdcdd1';c.lineWidth=1;c.globalAlpha=.35*opacity;
      for(const p of weatherParticles(layer.id,layer.view,width,ground,animate?now:0)){c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+p.dx,p.y+p.dy);c.stroke();}c.globalAlpha=1;
    };
    if(this.previousWeather)paint(this.previousWeather,Math.max(0,(this.previousWeather.until-now)/500));
    paint(this.weatherLayer,animate?Math.min(1,(now-this.weatherLayer.since)/250):1);
    return precipitationWeather(id)||Boolean(this.previousWeather);
  }
  castShadow(x,y,width,height,priority=false,factor=1){
    if(!this.state?.rules?.lighting||!this.lightSet||this.shadowCount>=(priority?SHADOW_BUDGET:SHADOW_BUDGET-1))return;
    this.shadowCount++;
    const complete=this.state.rules?.['source-shadows']!==false;
    if(this.composition||complete){const caster=projectedCaster({x,y,width,height},cameraLocalMatrix(this.ctx.getTransform?.(),this.camera,this.pixelRatio),1);({x,y,width,height}=caster);}
    const sources=[];if(this.lightSet.sky)sources.push(this.lightSet.sky);
    const nearby=this.lightSet.local.filter(l=>Math.abs(l.x-x)<l.range).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x));if(nearby.length)sources.push(nearby[0]);
    const surface=this.shadowSurface(y),self=this.shadowCasters?.find(c=>c.x===x&&c.y===y)?.contour;
    const choices=complete?lightContributions({x,y,left:x-width/2,right:x+width/2,top:y-height},this.lightSet,{occluders:this.shadowCasters,self,surface}):sources.map(source=>({source,alpha:this.composition?surfaceShadowAlpha(x,source,nearby[0],this.lightSet.sky?.kind):source.kind==='sun'?.11:source.kind==='moon'?.23:.18}));
    for(const choice of choices){if(choice.reason==='occluded')this.occludedLightSources++;if(choice.alpha<=0)continue;const shadow=this.composition||complete?surfaceShadow({x,y,width,height},choice.source,surface):shadowShape({x,width,height},choice.source,y);this.paintShadowProjection([shadow.points],{...choice,blur:choice.blur??shadow.blur},surface,factor,complete);}
  }
  shadowSurface(y){return this.composition?.surface||{back:Math.min(y,this.ground),front:this.canvas.clientHeight,width:this.camera?.worldWidth||this.canvas.clientWidth,depth:this.canvas.clientHeight-Math.min(y,this.ground)};}
  paintShadowProjection(polygons,{source,alpha,blur},surface,factor,complete){
    const c=surfaceContext(this.ctx,this.camera),cloudy=['cloud','rain','storm','snow','fog'].includes(this.shadowWeather)&&['sun','moon'].includes(source.kind);
    (this.usedLightSources||(this.usedLightSources=new Set())).add(source.id||source.kind);
    c.save();if(this.composition||complete){applyCamera(c,this.camera,this.pixelRatio);c.beginPath();c.rect(0,surface.back,surface.width,surface.depth);c.clip();}
    c.fillStyle='#101b21';
    if(complete&&!['sun','moon'].includes(source.kind)){
      const {y:foot,radius}=groundLightReach(source,surface);
      if(radius<=0){c.restore();return;}
      c.beginPath();c.arc(source.x,foot,radius,0,Math.PI*2);c.clip();
      const gradient=c.createRadialGradient(source.x,foot,0,source.x,foot,radius);gradient.addColorStop(0,'#101b21');gradient.addColorStop(.4,'#101b21');gradient.addColorStop(1,'#101b2100');c.fillStyle=gradient;
    }
    c.globalAlpha=alpha*factor*(cloudy?.5:1);c.shadowColor='#101b21';c.shadowBlur=blur+(cloudy?2:0);paintSilhouette(c,polygons);c.restore();
  }
  castContourShadow(polygons,anchor,priority=false,factor=1,depth=2){
    if(!this.state?.rules?.lighting||!this.lightSet||this.shadowCount>=(priority?SHADOW_BUDGET:SHADOW_BUDGET-1))return;
    this.shadowCount++;this.contourCount=(this.contourCount||0)+1;
    const {x,y}=anchor,c=this.ctx,surface=this.shadowSurface(y),complete=this.state.rules?.['source-shadows']!==false;
    const nearby=this.lightSet.local.filter(l=>Math.abs(l.x-x)<l.range).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x));
    const sources=[...(this.lightSet.sky?[this.lightSet.sky]:[]),...nearby.slice(0,1)];
    const choices=complete?lightContributions(contourBounds(polygons,anchor),this.lightSet,{occluders:this.shadowCasters,self:polygons,owner:priority?this.state.hero.lineage:null,surface}):sources.map(source=>({source,alpha:surfaceShadowAlpha(x,source,nearby[0],this.lightSet.sky?.kind),blur:source.kind==='sun'?2:source.kind==='moon'?0:.5}));
    if(complete&&depth===2){c.save();applyCamera(c,this.camera,this.pixelRatio);const plane=surfaceContext(c,this.camera);plane.beginPath();plane.rect(0,surface.back,surface.width,surface.depth);plane.clip();plane.fillStyle='#101b21';plane.globalAlpha=.18;paintSilhouette(plane,contactContour(polygons,y));c.restore();}
    const cache=this.contours||(this.contours=new ContourCache());
    for(const choice of choices){if(choice.reason==='occluded')this.occludedLightSources++;if(choice.alpha<=0)continue;this.paintShadowProjection(cache.shadow(polygons,anchor,choice.source,surface,depth,complete),choice,surface,factor,complete);}
  }
  paintFixtures(){
    const c=this.ctx;
    for(const light of this.lightSet?.fixtures||[]){
      if(this.state.rules?.['source-shadows']!==false&&Math.abs(light.x-(this.camera.scroll+this.camera.viewportWidth/2))>this.camera.viewportWidth/2+12)continue;
      const {x,y}=light,restore=billboardFrame(c,this.camera,x,light.baseY??this.ground,this.pixelRatio);c.save();c.strokeStyle='#8c8d74';c.lineWidth=2;c.beginPath();
      if(light.kind==='lantern'){c.moveTo(x,light.baseY??this.ground);c.lineTo(x,y-10);c.lineTo(x+6,y-10);}
      else if(light.kind==='hanging'){c.moveTo(x,y-14);c.lineTo(x,y-5);}
      else {c.moveTo(x-7,y+12);c.lineTo(x,y+8);c.lineTo(x,y+1);}
      c.stroke();c.fillStyle=light.active?light.color:'#617366';
      if(light.kind==='torch'){c.beginPath();c.moveTo(x-4,y+2);c.lineTo(x,y-8);c.lineTo(x+4,y+2);c.fill();}
      else{c.fillRect(x-4,y-3,8,10);c.strokeStyle='#717e6c';c.lineWidth=1;c.strokeRect(x-5,y-4,10,12);}
      c.restore();restore();
    }
  }
  paintIllumination(width,height,dark){
    if(!this.state.rules.lighting)return;
    const c=this.ctx;c.save();if(dark){c.fillStyle='#0b1424';c.globalAlpha=.08;c.fillRect(0,0,width,height);c.globalAlpha=1;}
    c.globalCompositeOperation='screen';
    for(const light of this.lightSet.local){if(this.state.rules?.['source-shadows']!==false&&!lightInViewport(light,this.camera,height))continue;const restore=billboardFrame(c,this.camera,light.x,light.baseY??this.ground,this.pixelRatio);const gradient=c.createRadialGradient(light.x,light.y,0,light.x,light.y,light.range);gradient.addColorStop(0,light.color+'48');gradient.addColorStop(.35,light.color+'20');gradient.addColorStop(1,light.color+'00');c.fillStyle=gradient;c.fillRect(light.x-light.range,light.y-light.range,light.range*2,light.range*2);restore();}
    c.restore();
  }
  creature(x,y,shape,tick){
    if(shape!=='ghost')this.castShadow(x,y,shape==='dragon'?40:24,shape==='dragon'?30:22);
    const c=this.ctx;c.save();c.translate(x,y);c.fillStyle='#92a58a';
    if(shape==='slime'){c.beginPath();c.moveTo(-16,0);c.quadraticCurveTo(-20,-30,0,-23);c.quadraticCurveTo(19,-26,16,0);c.fill();}
    else if(shape==='fungus'){c.fillStyle='#b3ac83';c.fillRect(-4,-22,8,22);c.fillStyle='#917686';c.beginPath();c.ellipse(0,-23,17,10,0,Math.PI,Math.PI*2);c.fill();c.fillStyle='#d2b799';c.fillRect(-10,-27,3,2);c.fillRect(5,-29,3,2);}
    else if(shape==='ghost'){c.fillStyle='#b6c7bb';c.globalAlpha=.7;c.beginPath();c.moveTo(-12,0);c.quadraticCurveTo(-16,-42,0,-42);c.quadraticCurveTo(15,-40,13,0);c.lineTo(6,-5);c.lineTo(0,0);c.lineTo(-6,-5);c.fill();c.globalAlpha=1;}
    else if(shape==='chest'){c.fillStyle='#8b7955';c.fillRect(-15,-20,30,20);c.fillStyle='#b2a16e';c.fillRect(-15,-21,30,4);c.fillRect(-3,-16,6,7);c.strokeStyle='#453e2c';c.strokeRect(-15,-20,30,20);}
    else if(shape==='crab'){c.fillStyle='#ad9478';c.beginPath();c.ellipse(0,-9,17,10,0,0,7);c.fill();c.strokeStyle='#ad9478';c.lineWidth=3;for(let i=-1;i<=1;i+=2){c.beginPath();c.moveTo(i*10,-7);c.lineTo(i*24,-17);c.lineTo(i*27,-24);c.moveTo(i*8,-3);c.lineTo(i*17,0);c.stroke();}}
    else if(shape==='worm'){c.fillStyle='#a5a078';for(let i=0;i<5;i++){c.beginPath();c.ellipse(-15+i*7,-6-Math.sin(i+tick)*3,7,7,0,0,7);c.fill();}}
    else if(shape==='dragon'){c.fillStyle='#779e86';c.beginPath();c.moveTo(-20,-4);c.lineTo(-14,-17);c.lineTo(-23,-33);c.lineTo(1,-20);c.lineTo(14,-30);c.lineTo(21,-16);c.lineTo(28,-13);c.lineTo(15,-8);c.lineTo(12,0);c.lineTo(-12,0);c.fill();}
    else{c.fillStyle='#b3a284';c.beginPath();c.ellipse(0,-7,10,6,0,0,7);c.fill();c.fillRect(-5,-5,3,5);c.fillRect(5,-5,3,5);c.beginPath();c.moveTo(5,-8);c.lineTo(8,-19);c.lineTo(13,-10);c.lineTo(17,-8);c.lineTo(7,-4);c.fill();c.strokeStyle='#b3a284';c.lineWidth=3;c.beginPath();c.moveTo(-8,-8);c.lineTo(-14,-14);c.stroke();}
    c.fillStyle='#283b32';c.fillRect(shape==='ghost'?-5:4,shape==='ghost'?-29:-13,2,2);if(shape==='ghost')c.fillRect(4,-29,2,2);c.restore();
  }
  tree(x, y, size, color, opacity) {
    if(opacity>.8&&Math.abs(y-this.ground)<1)this.shadowCasters.push({x,y,width:15,height:size*.8});
    const c = this.ctx; c.globalAlpha = opacity; c.fillStyle = '#35462f'; c.fillRect(x - 2, y - size * .5, 4, size * .5);
    c.fillStyle = color;
    for (let j = 0; j < 3; j++) { c.beginPath(); c.moveTo(x, y - size + j * size * .21); c.lineTo(x + size * (.2 + j * .055), y - size * .4 + j * size * .18); c.lineTo(x - size * (.2 + j * .055), y - size * .4 + j * size * .18); c.fill(); }
    c.globalAlpha = 1;
  }
  district(w,y,view,type,tick,profiles,damaged=false){
    const c=this.ctx,v=view.values;
    let serial=0;const home=(x,scale)=>this.house(x,y,scale,view.plaster,view.roof,profiles(serial++));
    if(view.district==='homes'){
      for(let i=0;i<5;i++){const x=w*(.08+i*.21);home(x,.6+v[10+i]*.4);c.fillStyle='#6e8058';c.fillRect(x-19,y-9,38,7);}
      c.strokeStyle='#b7ac8c';c.lineWidth=1;c.beginPath();c.moveTo(w*.13,y-75);c.lineTo(w*.8,y-67);c.stroke();
      for(let i=0;i<(!this.composition||this.composition.occupied?6:0);i++){c.fillStyle=i%2?view.plaster:'#8f8c9c';c.fillRect(w*(.18+i*.1),y-74+i,9,15);}
    }else if(view.district==='market'){
      home(w*.12,.85);home(w*.9,.85);
      for(let i=0;i<4;i++){const x=w*(.21+i*.2);c.fillStyle='#75654c';c.fillRect(x-16,y-26,3,26);c.fillRect(x+16,y-26,3,26);c.fillRect(x-19,y-12,40,5);c.fillStyle=i%2?'#a0986d':'#718d86';c.beginPath();c.moveTo(x-23,y-27);c.lineTo(x,y-39);c.lineTo(x+24,y-27);c.fill();for(let k=0;k<(this.composition?.cargo??5);k++){c.fillStyle=k%2?'#b7a36a':'#8c7664';c.fillRect(x-14+k*7,y-19,5,6);}}
    }else if(view.district==='workshop'){
      const privateWorkshop=workshopInteriorsOn(this.state)&&this.state.areas[this.state.hero.area].objects.find(o=>o.kind==='workshop'&&o.workshopInterior);
      for(let i=0;i<3;i++){const x=i===1&&privateWorkshop?24+privateWorkshop.x/100*(w-48):w*(.18+i*.32);
        if(i===1&&damaged){profiles(serial++);this.shadowCasters.push({x,y,width:48,height:20});c.fillStyle='#4a4941';c.fillRect(x-23,y-9,47,9);c.fillRect(x-25,y-26,5,26);c.fillRect(x+18,y-19,5,19);c.strokeStyle='#6c5b49';c.lineWidth=5;c.beginPath();c.moveTo(x-22,y-8);c.lineTo(x+17,y-26);c.moveTo(x-13,y-20);c.lineTo(x+16,y-5);c.stroke();}
        else{home(x,.8+v[15+i]*.25);if(i!==1||!privateWorkshop){c.fillStyle='#474d47';c.fillRect(x-12,y-17,26,5);c.fillRect(x-4,y-12,9,12);c.fillStyle='#c39f64';c.fillRect(x+7,y-34,7,9);}}
      }
    }else{
      home(w*.18,1.1);home(w*.82,1.2);c.fillStyle='#7a8c86';c.beginPath();c.ellipse(w*.5,y-7,26,9,0,0,7);c.fill();c.fillStyle='#a5b7aa';c.fillRect(w*.5-3,y-35,6,27);c.beginPath();c.ellipse(w*.5,y-35,17,5,0,0,7);c.fill();c.strokeStyle='#8bb9bd';c.lineWidth=1;c.beginPath();c.moveTo(w*.5,y-36);c.quadraticCurveTo(w*.5-15,y-55,w*.5-19,y-13);c.moveTo(w*.5,y-36);c.quadraticCurveTo(w*.5+15,y-55,w*.5+19,y-13);c.stroke();
    }
    if(type==='port'){c.strokeStyle='#a49b7b';c.lineWidth=3;c.beginPath();c.moveTo(w*.06,y);c.lineTo(w*.06,y-100);c.stroke();}
  }
  house(x, y, scale,plaster='#929b7d',roof='#615f48',profile={}) {
    const layout=this.state.rules?.facades===false?null:profile.facade||facadeLayout(profile);
    const c=this.ctx,width=layout?.width||profile.width||60,half=width/2,height=(layout?.floors||profile.floors||1)*44+12,roofHeight=profile.roof==='flat'?8:24;
    const fitted=Math.min(scale,Math.max(.45,(y-12)/(height+roofHeight+12))),night=calendar(this.state.tick).night;
    const tavern=this.state.areas[this.state.hero.area].objects.find(o=>o.kind==='tavern'&&o.building===profile.id);
    const workshop=workshopInteriorsOn(this.state)&&this.state.areas[this.state.hero.area].objects.find(o=>o.kind==='workshop'&&o.workshopInterior&&o.building===profile.id),entrance=tavern||workshop;
    if(entrance)x=24+entrance.x/100*(this.camera.worldWidth-48)-(layout?.door.x||0)*fitted;
    const restore=billboardFrame(c,this.camera,x,y,this.pixelRatio);try{
    const occupied=this.composition?.occupied??(this.state.areas[this.state.hero.area].population||[]).some(id=>this.state.people[id]?.alive&&this.state.people[id].status==='resident');
    const contours=this.contours||(this.contours=new ContourCache());
    this.shadowCasters.push({x,y,width:width*fitted,height:(height+roofHeight)*fitted,contour:contours.world(profile.structure&&(profile.structure.roof<3||profile.structure.walls<3)?ruinedSilhouette(profile,width,height,roofHeight):houseSilhouette(profile,width,height,roofHeight),{a:fitted,b:0,c:0,d:fitted,e:x,f:y})});
    if(profile.structure&&(profile.structure.roof<3||profile.structure.walls<3)){c.save();c.translate(x,y);c.scale(fitted,fitted);paintRuinedHouse(c,profile,width,height,roofHeight);c.restore();return;}
    c.save();c.translate(x,y);c.scale(fitted,fitted);c.fillStyle=profile.plaster||plaster;c.fillRect(-half,-height,width,height);
    if(profile.material==='timber'){c.strokeStyle=profile.woodColor||'#485d4d';c.lineWidth=3;for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(i*half*.8,-height);c.lineTo(i*half*.8,0);c.stroke();}c.beginPath();c.moveTo(-half,-height/2);c.lineTo(half,-height/2);c.moveTo(-half,-height);c.lineTo(half,-height/2);c.stroke();}
    if(profile.material==='stone'){c.strokeStyle='#657265';c.lineWidth=1;c.globalAlpha=.45;for(let row=0;row<height;row+=12){c.beginPath();c.moveTo(-half,-row);c.lineTo(half,-row);c.stroke();for(let k=-half+(row%24?6:0);k<half;k+=16){c.beginPath();c.moveTo(k,-row);c.lineTo(k,-Math.min(height,row+12));c.stroke();}}c.globalAlpha=1;}
    if(this.camera.perspectiveDegrees){const side=Math.sign(this.camera.perspectiveDegrees),edge=side*half,depth=Math.min(10,Math.abs(this.camera.perspectiveDegrees)*1.6);c.fillStyle='#263c36';c.globalAlpha=.28;c.beginPath();c.moveTo(edge,-height);c.lineTo(edge-side*depth,-height-3);c.lineTo(edge-side*depth,-3);c.lineTo(edge,0);c.closePath();c.fill();c.globalAlpha=1;}
    c.fillStyle=profile.roofColor||roof;paintRoof(c,profile,width,height,roofHeight);c.strokeStyle='#586b59';c.lineWidth=1;c.stroke();
    if(profile.chimney){c.fillStyle='#59665b';c.fillRect(half*.5,-height-24,8,26);c.fillStyle='#788374';c.fillRect(half*.5-1,-height-26,10,4);
      if(facadeSmoke(this.state,this.state.areas[this.state.hero.area],profile)&&occupied){c.fillStyle='#b8beb0';c.globalAlpha=.17;for(let i=0;i<3;i++){c.beginPath();c.ellipse(half*.5+4+Math.sin(this.state.tick*.08+i)*3,-height-31-i*10,4+i*2,5+i*2,0,0,7);c.fill();}c.globalAlpha=1;}}
    if(layout){this.facade(profile,layout,night,occupied);if(tavern)paintHomeBuilding(c,this.state.areas[tavern.room]?.extension,half,height);if(workshop)this.workshopSign(half,height);if(tavern){if(this.state.rules?.['world-signs']!==false)this.tavernSign(half,height);else{c.fillStyle='#403d30';c.fillRect(half-2,-height+8,31,15);c.fillStyle='#dac995';c.font='8px monospace';c.fillText('ТРАКТИР',half,-height+18);}}c.restore();return;}
    const doorX=(profile.door||0)*half*.55;const windows=profile.windows||2;
    for(let floor=0;floor<(profile.floors||1);floor++)for(let i=0;i<windows;i++){
      const wx=windows===1?(doorX>=0?-half+10:half-10):-half+10+(width-20)*i/(windows-1),wy=-floor*44-36;if(!floor&&Math.abs(wx-doorX)<12)continue;
      c.fillStyle='#46574c';c.fillRect(wx-6,wy-2,12,16);c.fillStyle=night?(occupied?'#c8ba84':'#4b6160'):(profile.windowColor||'#a4b5a0');c.fillRect(wx-4,wy,8,11);c.strokeStyle='#64715d';c.lineWidth=1;c.beginPath();c.moveTo(wx,wy);c.lineTo(wx,wy+11);c.stroke();
      if(profile.shutters){c.fillStyle=profile.shutterColor||'#697b62';if(floor||Math.abs(wx-8.5-doorX)>8)c.fillRect(wx-10,wy-1,3,14);if(floor||Math.abs(wx+8.5-doorX)>8)c.fillRect(wx+7,wy-1,3,14);}
    }
    c.fillStyle=profile.doorColor||'#3c4e42';c.fillRect(doorX-6,-29,12,29);c.fillStyle='#b0ad7a';c.fillRect(doorX+3,-13,2,2);
    if(profile.porch){c.fillStyle=profile.roofColor||roof;c.fillRect(doorX-11,-31,22,4);c.fillStyle='#64745f';c.fillRect(doorX-10,-27,2,27);c.fillRect(doorX+8,-27,2,27);}
    c.fillStyle='#687463';c.fillRect(-half,-3,width,3);if(tavern)paintHomeBuilding(c,this.state.areas[tavern.room]?.extension,half,height);if(workshop)this.workshopSign(half,height);if(tavern&&this.state.rules?.['world-signs']!==false)this.tavernSign(half,height);c.restore();
    }finally{restore();}
  }
  tavernSign(half,height){const c=this.ctx;c.strokeStyle='#a79773';c.lineWidth=2;c.beginPath();c.moveTo(half-3,-height+9);c.lineTo(half+17,-height+9);c.lineTo(half+17,-height+15);c.stroke();paintSymbolPlaque(c,'mug',half+17,-height+25,25,22);}
  workshopSign(half,height){const c=this.ctx;c.strokeStyle='#a79773';c.lineWidth=2;c.beginPath();c.moveTo(half-3,-height+9);c.lineTo(half+17,-height+9);c.lineTo(half+17,-height+15);c.stroke();if(this.state.rules?.['world-signs']!==false)paintSymbolPlaque(c,'workshop',half+17,-height+25,25,22);else{c.fillStyle='#403d30';c.fillRect(half-2,-height+8,45,15);c.fillStyle='#dac995';c.font='8px monospace';c.fillText('МАСТЕР',half,-height+18);}}
  facade(profile,layout,night,occupied){
    const c=this.ctx,door=layout.door,x=door.x;
    c.fillStyle='#687463';c.fillRect(-layout.width/2,-3,layout.width,3);
    for(const window of layout.windows){const {x:wx,y:wy}=window;c.fillStyle='#46574c';c.fillRect(wx-6,wy-2,12,16);c.strokeStyle=profile.woodColor||'#53634f';c.lineWidth=1;c.strokeRect(wx-6,wy-2,12,16);c.fillStyle=night?(occupied?'#c8ba84':'#4b6160'):(profile.windowColor||'#a4b5a0');c.fillRect(wx-4,wy,8,11);c.strokeStyle='#64715d';c.beginPath();c.moveTo(wx,wy);c.lineTo(wx,wy+11);c.stroke();
      if(window.shutters){c.fillStyle=profile.shutterColor||'#697b62';c.fillRect(wx-10,wy-1,3,14);c.fillRect(wx+7,wy-1,3,14);}
    }
    c.fillStyle=profile.woodColor||'#58664d';c.fillRect(x-8,-31,16,31);c.fillStyle=profile.doorColor||'#3c4e42';c.fillRect(x-6,-29,12,29);c.fillStyle='#b0ad7a';c.fillRect(x+3,-13,2,2);
    if(layout.porch){c.fillStyle=profile.roofColor||'#615f48';c.fillRect(x-12,-34,24,4);c.fillStyle=profile.woodColor||'#64745f';c.fillRect(x-10,-30,2,30);c.fillRect(x+8,-30,2,30);}
  }
  ruin(x, y) {
    this.shadowCasters.push({x,y,width:55,height:85});
    const c = this.ctx; c.fillStyle = '#69756a'; c.fillRect(x - 28, y - 84, 13, 84); c.fillRect(x + 15, y - 63, 13, 63); c.fillStyle = '#838b79'; c.fillRect(x - 31, y - 85, 19, 6); c.fillRect(x + 12, y - 65, 19, 6); c.fillRect(x - 28, y - 87, 40, 9); c.strokeStyle = '#4c6150'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 27, y - i * 20); c.lineTo(x - 15, y - i * 20 - 3); c.stroke(); }
  }
  person(x, y, color, hero, direction, stride, attack = false, rest = false, appearance=null, species=null,pose={}) {
    const screenTransform=this.ctx.getTransform?.(),scale=screenTransform&&Number.isFinite(screenTransform.a)?Math.hypot(screenTransform.a,screenTransform.b)/(this.pixelRatio||1):1;appearance=readableActorLook(appearance||{},scale*(species?.height||1));
    if(this.state?.rules?.['contour-shadows']===false){if(pose.kind!=='death')this.castShadow(x,this.ground,14*(species?.height||1),(rest?31:44)*(species?.height||1),hero);return this.paintPerson(x,y,color,hero,direction,stride,attack,rest,appearance,species,pose);}
    const changing=attack||pose.walking||['work','farm','medicine','tool','learn','factionDuty','talk'].includes(pose.kind);
    const sampled={...pose,progress:changing?Math.round((pose.progress||0)*60)/60:0};
    const key=JSON.stringify([color,hero,Boolean(hero&&this.state.hero.weapon>0),this.state.rules?.['source-shadows']!==false,direction,attack,rest,appearance,species,sampled]);
    const cache=this.silhouetteCache||(this.silhouetteCache=new Map());let body=cache.get(key);
    const c=this.ctx;
    if(!body){body=recordSilhouette(recorder=>{this.ctx=recorder;try{this.paintPerson(0,0,color,hero,direction,stride,attack,rest,appearance,species,sampled);}finally{this.ctx=c;}});if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,body);}
    const m=cameraLocalMatrix(c.getTransform?.(),this.camera,this.pixelRatio)||{a:1,b:0,c:0,d:1,e:0,f:0};
    const matrix={...m,e:m.a*x+m.c*y+m.e,f:m.b*x+m.d*y+m.f};
    const contours=this.contours||(this.contours=new ContourCache());this.castContourShadow(contours.world(body.polygons,matrix),{x:matrix.e,y:matrix.f},hero);
    c.save();c.translate(x,y);body.replay(c);c.restore();
  }
  ferryHull(x,y,width,f){paintFerry(this.ctx,x,y,width,f);}
  horse(x,y,m,pose){this.castShadow(x,y,38,m.hp>0?62:16);paintHorse(this.ctx,x,y,m,pose);}
  paintPerson(x, y, color, hero, direction, stride, attack = false, rest = false, appearance=null, species=null,pose={}) {
    const c=this.ctx,look=appearance||{},gait=pose.walking?walkPose(pose.progress,pose.distance):{feet:[{x:-4,y:0},{x:5,y:0}],bodyY:0,arm:0};
    rest=rest||Boolean(look.missingLimbs?.leftLeg&&look.missingLimbs?.rightLeg&&!look.prostheticLegs);
    const crouch=pose.kind==='collect',guard=pose.kind==='guard',windup=pose.kind==='windup',lower=rest?10:crouch?7:guard?4:windup?2:0,working=['work','farm','medicine','tool','learn','factionDuty'].includes(pose.kind),t=pose.progress||0;
    c.save();c.translate(x,y);c.scale(direction*(species?.height||1)*(look.width||1),species?.height||1);
    if(this.state.rules?.['source-shadows']===false){c.fillStyle='#14241d';c.globalAlpha=.18;c.beginPath();c.moveTo(-7,0);c.lineTo(6,0);c.lineTo(9,2);c.lineTo(-9,2);c.fill();c.globalAlpha=1;}
    c.translate(0,lower);
    const skin=pose.hurt?'#d2a18a':actorSkin(look,species);
    const feet=lower?[{x:-12,y:-lower},{x:13,y:-lower}]:gait.feet;
    for(let i=0;i<2;i++){
      const side=i?'rightLeg':'leftLeg',peg=look.prostheticLegs?.[side];
      if(look.missingLimbs?.[side]&&!peg)continue;
      if(peg){drawProstheticLeg(c,i?3:-3,feet[i],gait.bodyY);continue;}
      const hip=i?3:-3,foot=feet[i];c.strokeStyle=look.trousers||'#283629';c.lineWidth=4;c.beginPath();c.moveTo(hip,-12+gait.bodyY);c.lineTo((hip+foot.x)/2+2,(-12+foot.y)/2-1);c.lineTo(foot.x,foot.y-1);c.stroke();
      c.fillStyle=look.shoes||'#3f382e';c.fillRect(foot.x-3,foot.y-3,7,3);
    }
    c.translate(pose.hurt?-2:attack?Math.sin(t*Math.PI)*2:0,gait.bodyY);
    if(pose.hurt)color='#aa8270';
    drawActorPack(c,look);drawGarment(c,look,color,lower);

    drawHead(c,look,species,color,skin,hero);
    if(species?.id==='fae'){c.globalAlpha=.55;c.fillStyle='#b9d8c4';c.beginPath();c.ellipse(-8,-24,7,13,-.4,0,7);c.fill();c.globalAlpha=1;}
    let hand={x:10+gait.arm,y:-17};
    if(attack)hand={x:13+Math.sin(t*Math.PI)*6,y:-27};
    else if(rest)hand={x:10,y:-13};
    else if(crouch)hand={x:18,y:-10};
    else if(pose.kind==='spell'||pose.kind==='heal')hand={x:14,y:-35};
    else if(pose.kind==='eat')hand={x:7,y:-34};
    else if(guard)hand={x:9,y:-34};
    else if(windup)hand={x:1,y:-39};
    else if(pose.kind==='talk')hand={x:14,y:-23-Math.sin(t*Math.PI)*4};
    else if(working)hand={x:13,y:-22-Math.sin(t*Math.PI*2)*4};
    if(pose.hurt)hand={x:6,y:-30};
    c.strokeStyle=skin;c.lineWidth=3;c.beginPath();if(look.missingLimbs?.rightArm&&!look.missingLimbs.leftArm)hand={x:-hand.x,y:hand.y};if(!look.missingLimbs?.leftArm){c.moveTo(-4,-26);c.lineTo(look.missingLimbs?.rightArm?hand.x:guard?5:-8-gait.arm,look.missingLimbs?.rightArm?hand.y:guard?-32:-18);}if(!look.missingLimbs?.rightArm){c.moveTo(5,-26);c.lineTo(hand.x,hand.y);}c.stroke();
    const prop=look.missingLimbs?.leftArm&&look.missingLimbs?.rightArm?'none':look.prop||(hero&&this.state.hero.weapon>0?'blade':'none');
    c.save();
    if(windup){c.translate(hand.x-10,hand.y+17);c.translate(10,-17);c.rotate(-.6);c.translate(-10,17);}
    else if(lower){const base=['staff','spear','rake','hammer','axe'].includes(prop)?2:prop==='satchel'?5:prop==='lute'?8:prop==='book'?10:lower;c.translate(-3,base-lower);}
    else c.translate(hand.x-10,hand.y+17);
    this.prop(prop,{attack,working,progress:t});c.restore();drawWoundMarks(c,look,{feet,hand});
    c.restore();
  }
  prop(kind,pose={}){
    const c=this.ctx;c.save();
    if(pose.attack||pose.working&&kind==='hammer'){c.translate(10,-17);c.rotate(-Math.sin((pose.progress||0)*Math.PI)*(pose.attack?1:.7));c.translate(-10,17);}
    if(['staff','rake','spear','hammer'].includes(kind)){
      c.strokeStyle='#ad9570';c.lineWidth=2;c.beginPath();c.moveTo(12,-2);c.lineTo(12,-42);c.stroke();
      c.fillStyle=kind==='staff'?'#a5c4c3':'#a5b3ac';
      if(kind==='spear'){c.beginPath();c.moveTo(9,-41);c.lineTo(12,-50);c.lineTo(15,-41);c.fill();}
      if(kind==='hammer')c.fillRect(6,-43,12,6);
      if(kind==='staff'){c.beginPath();c.arc(12,-44,3,0,7);c.fill();}
      if(kind==='rake'){c.fillRect(5,-43,15,2);for(let i=0;i<4;i++)c.fillRect(5+i*4,-47,1,6);}
    }else if(kind==='book'){c.fillStyle='#54758a';c.fillRect(7,-25,10,14);c.fillStyle='#dfd4ad';c.fillRect(8,-23,7,10);}
    else if(kind==='blade'){c.strokeStyle='#c5d1c4';c.lineWidth=2;c.beginPath();c.moveTo(10,-17);c.lineTo(10,-36);c.stroke();c.strokeStyle='#b6a16e';c.beginPath();c.moveTo(6,-19);c.lineTo(15,-19);c.stroke();}
    else if(kind==='axe'){c.strokeStyle='#ac906a';c.lineWidth=3;c.beginPath();c.moveTo(12,-6);c.lineTo(12,-38);c.stroke();c.fillStyle='#b2c1b5';c.beginPath();c.moveTo(12,-38);c.lineTo(23,-35);c.lineTo(21,-26);c.lineTo(12,-29);c.fill();}
    else if(kind==='satchel'){c.strokeStyle='#c8ab78';c.lineWidth=1;c.beginPath();c.moveTo(-3,-28);c.lineTo(8,-10);c.stroke();c.fillStyle='#a28758';c.fillRect(3,-16,10,11);c.fillStyle='#dbc48c';c.fillRect(7,-13,2,2);}
    else if(kind==='lute'){c.fillStyle='#b39a64';c.beginPath();c.ellipse(9,-17,7,9,-.4,0,7);c.fill();c.fillStyle='#725c3e';c.fillRect(12,-37,3,18);c.beginPath();c.arc(10,-18,2,0,7);c.fill();}
    c.restore();
  }
  cart(x,y,food,medicine,direction){
    this.castShadow(x,y,27,medicine>0?28:food>0?20:10);const c=this.ctx;c.save();c.translate(x,y);c.scale(direction,1);
    c.strokeStyle='#514735';c.lineWidth=2;c.beginPath();c.moveTo(-13,-8);c.lineTo(12,-8);c.lineTo(22,-18);c.stroke();
    c.fillStyle='#8f7856';c.fillRect(-13,-10,26,4);c.strokeStyle='#4b4b3b';c.lineWidth=2;for(const wheel of [-8,8]){c.beginPath();c.arc(wheel,-3,3,0,7);c.stroke();}
    for(let i=0;i<Math.min(3,Math.ceil(Math.max(0,food)/4));i++){const x=-12+i*8;c.fillStyle='#b69a68';c.fillRect(x,-20,7,9);c.strokeStyle='#6b5c43';c.lineWidth=1;c.strokeRect(x,-20,7,9);c.beginPath();c.moveTo(x,-20);c.lineTo(x+7,-11);c.stroke();}
    if(medicine>0){c.fillStyle='#899d89';c.fillRect(-4,-28,9,8);c.fillStyle='#e0ddbd';c.fillRect(-1,-27,2,6);c.fillRect(-3,-25,6,2);}c.restore();
  }
  pet(x,y,kind,direction=1,rest=false,hurt=false,motion=null){
    if(this.petViewFacts&&this.petViewFacts.length<12)this.petViewFacts.push({kind,direction,rest,hurt,walking:Boolean(motion?.walking),feet:motion?.feet||[],wing:motion?.wing||0});
    const c=this.ctx,cache=this.petSilhouetteCache||(this.petSilhouetteCache=new Map()),key=JSON.stringify([kind,Boolean(rest),Boolean(hurt),motion]);
    let body=cache.get(key);if(!body){body=recordSilhouette(recorder=>paintPet(recorder,kind,{rest,hurt,motion}));if(cache.size>=96)cache.delete(cache.keys().next().value);cache.set(key,body);}
    const m=cameraLocalMatrix(c.getTransform?.(),this.camera,this.pixelRatio)||{a:1,b:0,c:0,d:1,e:0,f:0};
    const matrix={...m,a:m.a*direction,b:m.b*direction,e:m.a*x+m.c*y+m.e,f:m.b*x+m.d*y+m.f};
    if(this.state.rules?.['contour-shadows']!==false){const contours=this.contours||(this.contours=new ContourCache());this.castContourShadow(contours.world(body.polygons,matrix),{x:matrix.e,y:matrix.f});}
    else this.castShadow(x,y,kind==='fox'?48:28,motion?.dead?8:rest?16:kind==='owl'?34:28);
    c.save();c.translate(x,y);c.scale(direction,1);body.replay(c);c.restore();
  }
  formedCreature(x,y,shape,pose){
    const c=this.ctx,d=pose.death||0;
    if(shape!=='ghost')this.castShadow(x,y,shape==='dragon'?40:24,pose.dead?10:shape==='dragon'?30:22);
    c.save();c.translate(x,y);c.scale(pose.direction,1);c.globalAlpha*=pose.alpha;
    c.translate(pose.lean,pose.bounce);if(pose.rest)c.scale(1,.8);
    if(shape==='fungus'){
      const stem=22-15*d;c.fillStyle=pose.hurt?'#d8a69c':'#b3ac83';c.fillRect(-4,-stem,8,stem);
      c.save();c.translate(0,-stem);c.rotate(d*.4);c.fillStyle=pose.hurt?'#d8a69c':'#917686';c.beginPath();c.ellipse(0,0,17,10*(1-d*.5),0,Math.PI,Math.PI*2);c.fill();
      c.fillStyle='#d2b799';c.fillRect(-10,-4,3,2);c.fillRect(5,-6,3,2);c.restore();
      c.strokeStyle='#38483b';c.lineWidth=1;c.beginPath();c.moveTo(-2,-stem+4);c.lineTo(0,-stem+4);c.moveTo(3,-stem+4);c.lineTo(5,-stem+4);c.stroke();
    }else if(shape==='ghost'){
      c.scale(1,1-d*.75);c.fillStyle=pose.hurt?'#dfb7b2':'#b6c7bb';c.beginPath();c.moveTo(-12,-3);c.quadraticCurveTo(-16,-42,0,-42);c.quadraticCurveTo(15,-40,13,-3);c.lineTo(6,-8);c.lineTo(0,-3);c.lineTo(-6,-8);c.fill();
      c.fillStyle='#283b32';if(!pose.dead){c.fillRect(-5,-29,2,2);c.fillRect(4,-29,2,2);}
    }else if(shape==='dragon'){
      c.scale(1,1-d*.4);c.translate(0,d*7);c.fillStyle=pose.hurt?'#d2a49b':'#779e86';
      c.beginPath();c.moveTo(-21,-6);c.lineTo(-13,-15);c.lineTo(-19,-29-pose.wing*(1-d));c.lineTo(1,-19);c.lineTo(11,-25);c.lineTo(16,-19);c.lineTo(23,-13);c.lineTo(28,-12);c.lineTo(17,-8);c.lineTo(12,-7);c.lineTo(-12,-7);c.closePath();c.fill();
      c.strokeStyle='#779e86';c.lineWidth=3;for(const [i,foot] of [-9,10].entries()){const gait=pose.feet[i],footX=foot+gait.x,footY=-7*d+gait.y-pose.bounce;c.beginPath();c.moveTo(foot,-10);c.lineTo((foot+footX)/2-2,(-10+footY)/2);c.lineTo(footX,footY);c.lineTo(footX+3,footY);c.stroke();}
      c.beginPath();c.moveTo(-14,-10);c.lineTo(-30,-3-d*4);c.stroke();c.fillStyle='#293e32';if(!pose.dead)c.fillRect(18,-17,2,2);
    }
    c.restore();
  }
  companionPet(pet,x,y,track,phase){const cargo=petCargoModel(this.state,pet),motion=this.state.rules?.['creature-motion']!==false;if(!motion&&!cargo)return this.creature(x,y,'pet',this.state.tick);const distance=motion?Math.abs((track?.to??0)-(track?.from??0))*(this.canvas.clientWidth-48)/100:0;this.quadruped(x,y,quadrupedPose(track,motion?phase:1,distance),'dog',cargo);}
  quadruped(x,y,pose,kind,cargo=null){
    const c=this.ctx,dog=kind==='dog',scale=dog?.7:1;
    if(cargo&&this.state?.rules?.lighting&&this.state.rules?.['contour-shadows']!==false){const key=JSON.stringify([kind,pose,cargo]),cache=this.quadrupedCache||(this.quadrupedCache=new Map());let body=cache.get(key);if(!body){body=recordSilhouette(recorder=>paintQuadruped(recorder,pose,kind,cargo));if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(key,body);}const m=cameraLocalMatrix(c.getTransform?.(),this.camera,this.pixelRatio)||{a:1,b:0,c:0,d:1,e:0,f:0},matrix={...m,e:m.a*x+m.c*y+m.e,f:m.b*x+m.d*y+m.f},contours=this.contours||(this.contours=new ContourCache());this.castContourShadow(contours.world(body.polygons,matrix),{x:matrix.e,y:matrix.f});c.save();c.translate(x,y);body.replay(c);c.restore();return;}
    this.castShadow(x,y,32*scale,(pose.dead?12:24)*scale);c.save();c.translate(x,y);paintQuadruped(c,pose,kind,cargo);c.restore();
  }
  wolf(x, y, tick, combat) {
    this.castShadow(x,y,32,24);
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(combat ? -1 : tick % 16 < 8 ? 1 : -1, 1);
    c.fillStyle = '#9aa99a'; c.beginPath(); c.moveTo(-15, -9); c.lineTo(-11, -20); c.lineTo(7, -20); c.lineTo(10, -28); c.lineTo(15, -21); c.lineTo(23, -17); c.lineTo(18, -12); c.lineTo(10, -12); c.lineTo(7, -2); c.lineTo(3, -2); c.lineTo(1, -9); c.lineTo(-8, -9); c.lineTo(-10, -2); c.lineTo(-14, -2); c.closePath(); c.fill();
    c.strokeStyle = '#9aa99a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-12, -16); c.lineTo(-21, -22); c.stroke(); c.fillStyle = '#e2c694'; c.fillRect(14, -19, 2, 2); c.restore();
  }
  guard(x, y) { this.person(x, y, '#899796', false, -1, 0); const c = this.ctx; c.fillStyle = '#8b9d97'; c.fillRect(x - 7, y - 44, 14, 10); c.fillStyle = '#283935'; c.fillRect(x - 5, y - 39, 10, 2); c.fillStyle = '#6a7c72'; c.fillRect(x - 17, y - 25, 9, 18); }
  fire(x, y, tick) {
    const c = this.ctx; c.strokeStyle = '#8d7650'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 11, y); c.lineTo(x + 8, y - 4); c.moveTo(x - 8, y - 4); c.lineTo(x + 11, y); c.stroke();
    c.fillStyle = '#d7b36a'; c.beginPath(); c.moveTo(x - 8, y - 4); c.quadraticCurveTo(x - 7, y - 16, x + tick % 4, y - 25); c.quadraticCurveTo(x + 13, y - 10, x + 7, y - 4); c.fill(); c.fillStyle = '#e9d59a'; c.beginPath(); c.moveTo(x - 4, y - 4); c.lineTo(x, y - 17); c.lineTo(x + 4, y - 4); c.fill();
  }
  sign(x, y, text) { const c = this.ctx; c.fillStyle = '#706f4e'; c.fillRect(x - 1, y - 26, 3, 26); c.fillStyle = '#9b9c70'; c.fillRect(x - 10, y - 31, 21, 15); if(this.state.rules?.['world-signs']!==false)paintSymbolPlaque(c,worldSignKind(text),x,y-23.5,21,15);else{c.fillStyle = '#324833'; c.font = '12px sans-serif'; c.fillText(text, x - 5, y - 19);} }
}
