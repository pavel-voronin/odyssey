import {homePlan,homeAction} from './modules/homes.js';
import {verdictReviewPlan,verdictReviewAction} from './modules/verdict-review.js';
import {shipRecoveryAction} from './modules/ship-recovery.js';
import {petRouteDeferred,knownPetRoute,petPassageEntered} from './modules/pet-passage-state.js';import {petPassagePlan,petRetrievalPlan,petPassagePath,petBoardingAction,petBoardingTarget} from './modules/pet-boarding.js';import {petBoardingWorldTick} from './modules/pet-boarding-actors.js';
import {petTransferPlan,petTransferAction} from './modules/pet-transfer.js';import {npcPetsTick} from './modules/pet-transfer-actors.js';
import {cacheItems} from './modules/item-originals.js';
import {packPetPlan,packPetAction,packPetCare,advancePackPets,waitingPackPetsTick} from './modules/pack-pets.js';
import {clothingPlan,clothingPriority,clothingAction} from './modules/clothing-retail.js';
import {observeNavigationBlockers,navigationHoldKnownBlocker,navigationReturnTarget,finishNavigationReturn} from './modules/navigation-memory.js';
import {initializeDescent,navigationToolPlan,navigationGate,navigationAction} from './modules/navigation-tools.js';
import {changeSpareOutfit,spareNeedsMoney} from './modules/spare-outfit.js';
import {containersOn,packView,stackRoom} from './modules/container-state.js';
import {canLoadPackCargo} from './modules/container-cargo.js';
import {recordRemains,recordHeroRemains} from './modules/remains.js';
import {biomaterialTick} from './modules/biomaterial-state.js';
import {biomaterialPlan,biomaterialAction} from './modules/biomaterials.js';
import {SAVE_VERSION,SAVE_SCHEMA,validateSave} from './save-schema.js';
import {prepareBirthplace} from './modules/birthplaces.js';
import {countMarket} from './modules/market-metrics.js';
import {rememberPracticalRole} from './modules/skill-branches.js';
import {actorView,actorJournal,bindObservedJournal} from './actor-view.js';
import {initializeSpatial,registerSpatialArea} from './modules/spatial.js';
import {goodsTick} from './modules/goods.js';
import {craftStudyPlan,craftStudyAction} from './modules/craft-practice.js';
import {moneyCachePlan,moneyCacheAction} from './modules/money-caches.js';
import {openInheritance} from './modules/inheritance.js';
import {observeRouteMap,routeMapPlan,routeMapAction} from './modules/route-maps.js';
import {mapCopyPlan,mapCopyAction} from './modules/map-copies.js';
import {recordLastingInjury} from './modules/injury-state.js';
import {creatureTrace,observeBestiaryTraces,encounterBestiary,bestiaryCaution,studyBestiaryPlan,studyBestiaryAction} from './modules/bestiary.js';
import {grateClosed,knownGrateBlocked} from './modules/mechanism-policy.js';
import {blockedGratePlan,mechanismAction} from './modules/mechanisms.js';
import {teamLeverPlan,leverHoldAction,leverTeamTick} from './modules/lever-team.js';
import {liftBlocked,knownLiftBlocked} from './modules/lift-policy.js';
import {blockedLiftPlan,liftAction} from './modules/lifts.js';
import {petTrainingTick,dogTrainingPlan,dogLessonAction,dogSearchPlan,dogSearchAction,dogFeedAction} from './modules/pet-training.js';
import {scentPlantKnown,observeScentPlants} from './modules/pet-scent-policy.js';
import {forgePlan,forgeAction} from './modules/forging.js';
import {refitPlan,refitTarget,refitAction} from './modules/knife-refit.js';
import {wearWeaponHit,wearArmorHit} from './modules/item-condition.js';
import {itemRepairPlan,itemRepairTarget,itemRepairAction} from './modules/item-repair.js';
import {principlePlan,reflectPrinciple} from './modules/principles.js';
import {verdictInquiryPlan,verdictInquiryAction} from './modules/verdict-inquiry.js';
import {hearCaptivePlan,hearCaptive,rescueGuardContact,rescueAction,rescueTarget,dropRescuePurse} from './modules/rescue-plan.js';
import {isDungeonRescue,rescueGuardPass} from './modules/rescue-escape.js';
import {performBrace,BRACE_ENERGY} from './modules/brace.js';
import {rememberWeaponRole,recordWeaponHit,observeWeaponReply,weaponTick,cancelWeapon,beginWeapon,finishWeapon,WEAPON_STYLES} from './modules/weapon-styles.js';
import {chooseWeaponStyle} from './modules/weapon-decision.js';
import {causalPurchase,causalReturn} from './modules/causal-history.js';
import {reconsiderWorkLoss} from './modules/work-loss.js';
import {observeServices,actualService,knownServiceAllows,denyService,merchantResupply,consumeMerchantGood} from './modules/service-access.js';
import {eventMeaning,actorReference,enemyReference,deathMeaning} from './event-meaning.js';
import {finishLootTick} from './modules/loot-results.js';
import {deathRecord} from './modules/death-records.js';
import {areaScale,physicalDistance,areaOffset,areaStep,routeDistance,campLink} from './geometry.js';
import {personLocation} from './person-location.js';
import {workOrdersTick,servicePlan,serviceTarget,acceptService,serviceRepairAllowed,fundServiceRepair,finishServiceRepair,hasServiceTool,extendService} from './modules/resident-orders.js';
import {localNeedsPlan,quietPlan,quietSignals} from './modules/residence.js';
import {initializeWorkMaterials,observeMaterials,buyServiceTool} from './modules/work-materials.js';
import {respondAid,aidTarget,performAid} from './modules/personal-aid.js';
import {intentionTick,intentionTarget,assistanceAction} from './modules/intentions.js';
import {initializeInteriors,interiorPassage,tavernPlan,tavernAction} from './modules/interiors.js';
import {workshopWorkTarget} from './modules/workshop-interiors.js';
import {hallActivitiesTick,visitForWork,hallConversation} from './modules/hall-activities.js';
import {initializeLodging,lodgingTick,lodgingPlan,lodgingTarget,bookRoom,lodgingRest} from './modules/lodging.js';
import {npcActorProfile} from './npc-profile.js';
import {initializeActorAtlas,knownArea,visitedArea,revealArea,recordAreaVisit,knownRoad,revealRoad,knownDistances,observeLocalRoutes,routeMembership} from './actor-atlas.js';
import {rootWorld} from './world-ref.js';
import {npcAction,invalidateNPCControl} from './modules/npc-control.js';
import {syncNPCActors,syncActiveActor,selfDrivenActor,applyActorExternal,detailedActors,restoreActorBindings} from './actor-projection.js';
import {initializeObservation,observingBodyActive,syncObservedPerson,observationPayload} from './observation.js';
import {partyDemand,partyRestReady,partyAvailable,partyPrepared} from './modules/party-needs.js';
import {actorFact,companionKey,markActorDeath,enemyShape} from './actor-facts.js';
import {observeFreightActor} from './modules/freight-memory.js';
import {watchNote} from './modules/watch-needs.js';
import {propertyAidTick,propertyAidPlan,propertyAidTarget,propertyAidAction} from './modules/property-aid.js';
import {initializeAreaFacades,initializeFacades} from './facades.js';
import {propertyGiftsTick,propertyGiftPlan,propertyGiftTarget,propertyGiftAction} from './modules/property-gifts.js';
import {initializePropertyContracts,propertyContractsTick,propertyLifeEnded,propertyContractPlan,propertyContractTarget,propertyContractAction,mayRepairProperty,repairMaterials,workshopRepaired} from './modules/property-contracts.js';
import {propertyMemoryTick} from './modules/property-memory.js';
import {propertyDamageTick,repairPlan,repairProperty} from './modules/property-damage.js';
import {initializeProperty,originProperty,observeProperty,propertyPlan,propertyTarget,buyProperty,workspaceAccess} from './modules/property.js';
import {expectedLoss,areaAvoided,rememberRejected,observeRejected} from './modules/route-memory.js';
import {initializeSmoking,smokeCamp,smokeRestEnergy} from './modules/smoking.js';
import {initializeSketching,sketchingTick,sketchCamp} from './modules/sketching.js';
import {campConversation,initializeCampLife} from './modules/camp-life.js';
import {campAffairTalk} from './modules/companion-goals.js';
import {campLesson,restoreCampRestView} from './modules/camp-lesson.js';
import {workshopDisputesTick,workshopDisputePlan,workshopDisputeAction} from './modules/workshop-dispute.js';
import {pairCampCare,pairCampWatch} from './modules/party-relations.js';
import {pairDrill} from './modules/party-drill.js';
import {pairCombatTick} from './modules/party-combination-state.js';
import {initializeMigrations,migrationArea,migrationsTick} from './modules/migrations.js';
import {equipmentPrice} from './modules/prices.js';
import {initializeFinances,nextPurchase,buyUpgrade,noticeMoneyPriority,maySpend,moneyBudget} from './modules/finances.js';
import {initializeInnerLife} from './modules/inner-life.js';
import {recoverHeirloom} from './modules/inventory.js';
import {cacheCollectible,itemLocation} from './modules/item-originals.js';
import {initializeCommitments,rememberRetreat,commitmentTick,commitmentPlan} from './modules/commitments.js';
// Pure, deterministic simulation. No timers, UI, wall clock or storage here.
import { MODULES, initializeRules, enabled, moduleRandom } from './rules.js';
import { initializeHero, decorateArea, traitsTick, traitsPlan, traitsRest, provisions, encounter, tryParley, combatAttack, combatResponse, afterVictory, receiveItem, sellBag, hasHabit, hasCondition, itemBonus } from './systems.js';
import { initializeLineage, populateArea } from './modules/lineage.js';
import { initializeMind, mindPlan, fearResponse } from './modules/psychology.js';
import { initializeMagic, learnSpell, magicRest, castInCombat,teachSpell } from './modules/magic.js';
import {chooseCombatAction,rememberCombatChoice,resolveCombatChoice,rememberCombatReply} from './modules/combat-judgment.js';
import { planWork, workTick, initializeWork, leisureTick } from './modules/work.js';
import { profile,isTown,isRefuge } from './modules/common.js';
import { BIOMES } from './content.js';
import { composeEnemy } from './modules/world.js';
import { initializeSocial,meetPerson,partyHurt,hurtCompanion,partyRest,releaseParty } from './modules/social.js';
import {partyCombatOn} from './modules/party-combat-state.js';
import {partyCombatTurn,partyCoverDamage} from './modules/party-combat.js';
import { initializeSociety,civicArea,societyTick,shopPrice,politicalPlan,governTick } from './modules/society.js';
import { currentQuest,questReady,hasOffer,acceptQuest,planQuest,finishQuest,questTick,questAction,civilianQuestPlan,registerReinforcement,failQuest } from './modules/quests.js';
import { ordersTick } from './modules/orders.js';
import { initializeLife,rememberMoment,archiveLife,lifePlan,settleLife,meetLegacy } from './modules/lifecycle.js';
import { initializeStories,storyTick,storyPlan,storyAction,storyCombatChoice,storyThreatAvoided,isStoryActive } from './modules/stories.js';
import { initializeSupply,supplyArea,supplyTick,foodPlan,eat,forageTick,restAmount,serviceReachable,recoverCargo } from './modules/supply.js';
import {initializeFoodKit} from './modules/local-food.js';
import {foodWalkingStride} from './modules/hearth-food.js';
import {cookingTick,cookingPlan,cookingCamp,brothCookAction,brothEatAction,brothLesson} from './modules/cooking.js';
import { peopleArea,peopleTick } from './modules/people.js';
import { enchantedDiscovery } from './modules/enchantments.js';
import { enemyReply,expectedStrike } from './modules/adversaries.js';
import {enemyRecovery} from './modules/combat.js';
import {delvePlan} from './modules/delves.js';
import {toolPlan,toolAction} from './modules/tool-repair.js';
import {materialOfferTurn,actorMaterialDeliveryPlan,workMaterialDelivery,materialClientPlan,materialClientAction} from './modules/material-delivery.js';
import {contactDelve,pauseDelve,finishDelve} from './modules/delve-attempts.js';
import {originTemplate,chooseBirthplace} from './modules/origins.js';
import {areaDanger} from './modules/danger.js';
import {openSettlement} from './modules/districts.js';
import {initializeDiplomacy} from './modules/diplomacy.js';
import {initializeFactionPaths,factionPathTick,factionPathPlan,factionDuty} from './modules/faction-paths.js';
import {heroFieldCraftPlan,fieldCraftAction} from './modules/field-craft-actors.js';
import {heroCreditPlan,heroCreditAction} from './modules/provision-credit-actors.js';
import {heroMerchantPlan,heroMerchantAction} from './modules/merchant-hero.js';
import {caravanPlan,caravanRaid,noticeCaravan} from './modules/caravans.js';
import {planFieldCamp,pitchCamp,leaveCamp,campCrossed,campContinue} from './modules/fieldcamp.js';
import {observeCampSites} from './modules/camp-sites.js';
import {observeOwnCollection} from './modules/collection-state.js';
import {collectionPlan,collectionTarget,collectionAction} from './modules/collections.js';
import {observeTowers,landmarkPlan,landmarkTarget,landmarkStudy} from './modules/landmarks.js';
import {fordBlocked,fordKey,fordDetour} from './modules/fords.js';
import {heroFordGate,heroFordProgress,resumeFordTaskView} from './modules/ford-actors.js';
import {initializeWeather,weatherAt,weatherTick,weatherShelter,weatherWait,weatherPreference} from './modules/weather.js';
import {initializePreparation,preparePlan,estimatePlan} from './modules/preparation.js';
import {poisonCareTick,holdPoisonRest} from './modules/poison-care.js';
import {balanceIntentions} from './modules/intention-balance.js';
import {repertoirePlan,repertoireInterrupt} from './modules/repertoire.js';
import {areaCulture} from './modules/cultures.js';
import { initializeGeography,annotateRegion,addRoute,expandRoutes,beginTransit,transitTick,applyTimeConsequence,routePreference,temporalCollection,temporalAid } from './modules/travel.js';
export {SAVE_VERSION};
export {addArea as createArea,connect as connectAreas,spawnEnemy as createEnemy};
const names = ['Элиан', 'Мира', 'Роуэн', 'Астра', 'Тео', 'Лиора', 'Оррин', 'Нэва'];
const placeNames = ['Вересковый', 'Туманный', 'Ивовый', 'Мшистый', 'Янтарный', 'Серебряный', 'Тихий', 'Ветряной'];
const kinds = { road: 'дорога', village: 'поселение', forest: 'лес', ruins: 'руины', camp: 'лагерь' };
export function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const roll = (s, n) => Math.floor(random(s) * n);
function context(s, stream) { return { spareNeedsMoney:(world,ctx)=>{const b=moneyBudget(world,ctx);return b.targetNeed>0||world.hero.gold<b.reserve||spareNeedsMoney(world);}, fordAvoided:(world,id)=>areaAvoided(world,id), random: () => moduleRandom(s, stream), hallConversation, receiveItem, maySpend, recoverRoomParty:world=>{magicRest(world);partyRest(world);}, log, gainXp, die, closest, goal, defeatEnemy,addArea,connect,enter,route,knownRoute,observeProperty,mayRepairProperty:(world,o,person)=>mayRepairProperty(world,o,person)||serviceRepairAllowed(world,o,person),repairFunding:fundServiceRepair,hasRepairTool:hasServiceTool,repairMaterials,workshopRepaired:(world,a,o,proof)=>{workshopRepaired(world,a,o,proof,{log});finishServiceRepair(world,a,o,proof,context(world,'work-orders'));},propertyLifeEnded:world=>propertyLifeEnded(world,{log}),spawnEnemy,npcVictory,releaseParty,teachSpell,enemySpawned:registerReinforcement }; }
export function log(s, text, type = 'story',area=s.hero.area,{relay=true,tick=s.tick,recordedAt,meaning}={}) {
  s.journal.unshift({ tick, text, type, life: s.generation,area,...(recordedAt===undefined?{}:{recordedAt}),...(meaning?{meaning}:{} ) });
  if(observingBodyActive(s)||type==='death'||type==='retirement')rememberMoment(s,s.journal[0]);else s.journal[0].afterLife=true;
  if (s.journal.length > 250) s.journal.length = 250;
  if(observingBodyActive(s)||type==='death')s.hero.speech = text;
  const root=rootWorld(s);if(relay&&root!==s&&root.hero!==s.hero&&root.hero.area===s.hero.area&&!root.hero.transit&&!s.hero.transit){root.journal.unshift({tick,text,type,life:root.generation,area:s.hero.area,actor:s.hero.lineage,afterLife:!root.hero.alive,...(recordedAt===undefined?{}:{recordedAt}),...(meaning?{meaning}:{})});if(root.journal.length>250)root.journal.length=250;}
}
function connect(s, a, b,metadata={}) {
  if(!s.areas[a].links.includes(b))s.areas[a].links.push(b);
  if(!s.areas[b].links.includes(a))s.areas[b].links.push(a);
  addRoute(s,a,b,metadata);s.graphRevision=(s.graphRevision||0)+1;revealRoad(s,a,b);
}
function addArea(s, type, name, depth = 0,metadata={}) {
  const id = 'a' + s.nextArea++;
  const area = { id, type, name, depth, paletteVersion:2, links: [], visited: false, discovered: false, visits: 0, objects: [], expanded: false };
  if(enabled(s,'long-roads')&&type==='road'&&depth>=2&&depth%4===2){area.length=260;area.roadProfile='long-tract';}
  annotateRegion(s,area,metadata);
  areaDanger(s,area,metadata);
  area.culture=metadata.culture||areaCulture(s,area);
  if (isTown(area)) area.objects.push({ id: id + '-elder', kind: 'resident', name: 'Житель', x: 42 });
  if (isRefuge(area)) area.objects.push({ id: id + '-rest', kind: 'rest', name: isTown(area) ? 'Дом лекаря' : 'Костёр', x: 68 });
  if (type === 'forest') {
    for (let i = 0; i < 2; i++) area.objects.push({ id: id + '-wolf' + i, kind: 'enemy', name: 'Лесной волк', x: 36 + i * 40, hp: 14 + depth * 2, maxHp: 14 + depth * 2, attack: 4 + Math.floor(depth / 2), alive: true, patrol: i ? -1 : 1 });
    area.objects.push({ id: id + '-herb', kind: 'herb', name: 'Лунная трава', x: 55, count: 2,...(enabled(s,'pet-training')?{scentCover:{version:1,created:s.tick}}:{}) });
  }
  if (type === 'road') area.objects.push({ id: id + '-cache', kind: 'loot', name: 'Забытый кошель', x: 58, gold: 3 + roll(s, 5), taken: false });
  if (type === 'ruins') {
    area.objects.push({ id: id + '-guard', kind: 'enemy', name: 'Страж руин', x: 48, hp: 23 + depth * 3, maxHp: 23 + depth * 3, attack: 6 + Math.floor(depth / 2), alive: true, patrol: 0 });
    area.objects.push({ id: id + '-relic', kind: 'relic', name: 'Осколок древнего света', x: 77, taken: false });
  }
  if(['cave','dungeon','sea','island','desert','mountain','dream','clockwork'].includes(type)){
    const count=type==='dungeon'?2:1;
    for(let i=0;i<count;i++)area.objects.push({id:`${id}-threat${i}`,kind:'enemy',name:'Неизвестная угроза',x:count===1?50:35+i*36,hp:24+depth*2,maxHp:24+depth*2,attack:5+Math.floor(depth/3),alive:true,patrol:0});
    if(['cave','island','desert'].includes(type))area.objects.push({id:id+'-herb',kind:'herb',name:'Местная лечебная трава',x:26,count:2});
    area.objects.push({id:id+'-treasure',kind:['dungeon','dream','clockwork'].includes(type)?'relic':'loot',name:type==='dungeon'?'Сокровище глубин':'Тайник странника',x:84,gold:6+roll(s,8),taken:false});
  }
  s.areas[id] = area;
  decorateArea(s, area, () => moduleRandom(s, 'areas'),true);
  populateArea(s, area);
  civicArea(s,area);
  supplyArea(s,area);
  peopleArea(s,area);
  initializeDescent(s,area);migrationArea(area);initializeFacades(s);registerSpatialArea(s,area);return id;
}
function createHero(s) {
  const village = Object.values(s.areas).find(a => isTown(a));
  const h = {
    name: names[roll(s, names.length)], actorGeneration:s.generation, area: chooseBirthplace(s), x: s.generation === 1 ? 15 : 22,
    hp: 38, maxHp: 38, energy: 100, gold: 4, xp: 0, level: 1, weapon: 0, armor: 0,
    inventory: { herbs: 0, potions: 1, relics: 0, rations:2 },
    personality: { courage: .3 + random(s) * .6, curiosity: .4 + random(s) * .6, sociability: .3 + random(s) * .7, generosity: .2 + random(s) * .7 },
    memory: { places: [], people: [], avoided: {}, facts: [], threats:{}, merchant: village.id },
    quests: [], goal: null, combat: null, alive: true, kills: 0, distance: 0, born: s.tick,travel:{voyages:0,portals:0,epochs:0,storms:0},transit:null,
    intent: 'Добраться до деревни', reason: 'Нужны знакомые, работа и безопасный ночлег.', action: 'ПУТЬ', speech: 'Интересно, кто живёт за этим холмом?', lastAction: 'walk', facing: 1
  };
  initializeHero(s, h, () => moduleRandom(s, 'identity'));
  h.ruleFlags = s.rules;
  initializeLineage(s,h);initializeMind(s,h);initializeMagic(s,h);
  initializeWeather(s,h);initializePreparation(h);initializeCommitments(h);initializeInnerLife(s,h);initializeFinances(h);initializeMigrations(s);
  initializeWork(s,h);
  initializeWorkMaterials(h);
  initializeSocial(s,h);initializeSociety(s,h);
  initializeDiplomacy(s);initializeFactionPaths(s,h);
  initializeProperty(h,s);initializePropertyContracts(s,h);initializeCampLife(h);initializeSketching(h,true);initializeSmoking(s,h,true);initializeLife(s,h);
  initializeStories(s,h);
  initializeSupply(s,h);
  rememberPracticalRole(s,s.people[h.lineage],h);
  initializeFoodKit(s,s.people[h.lineage],h,{newborn:true});
  initializeActorAtlas(s,h);
  return h;
}
export function createWorld(seed = Date.now(), {rules={}}={}) {
  for(const [id,value] of Object.entries(rules))if(typeof value!=='boolean'||!MODULES.some(m=>m.id===id))throw new Error('Unknown initial module setting');
  const s = { version: SAVE_VERSION, schema:SAVE_SCHEMA, rng: Number(seed) >>> 0, seed: Number(seed) >>> 0, tick: 0, generation: 1, nextArea: 0, areas: {}, journal: [], graves: [], changes: [], merchant: null, hero: null, actorStates:{},observation:null,nextGeneration:1,rules:{...rules} };
  initializeRules(s);
  initializeGeography(s);
  const origin=originTemplate(s.seed);s.continents.c0.name=origin[6];
  const road = addArea(s, 'road', origin[0]);
  const town = addArea(s, origin[5], origin[1]);
  const forest = addArea(s, 'forest', origin[2], 1);
  const ruins = addArea(s, 'ruins', origin[3], 2);
  const camp = addArea(s, 'camp', origin[4], 1);
  connect(s, road, town); connect(s, town, forest); connect(s, forest, ruins); connect(s, forest, camp);
  s.merchant = { name: 'Сава', area: town, destination: null, arrival: 0, nextMove: 75, stock: 3,serviceStock:{version:1,gear:2,medicine:1} };
  s.hero = createHero(s);initializeObservation(s);prepareBirthplace(s,s.hero,{openSettlement,addArea,connect});
  enter(s, s.hero.area);
  log(s, `${s.hero.name} начинает путь: ${s.areas[s.hero.area].name}, ${s.continents.c0.name}.`, 'birth');
  initializeFacades(s);syncObservedPerson(s);syncActiveActor(s);bindObservedJournal(s);initializeSpatial(s);
  return s;
}
function enter(s, id) {
  const a = s.areas[id], h = s.hero;
  openSettlement(s,a,context(s,'districts'));
  initializeAreaFacades(s,a);
  initializeInteriors(s);
  initializeLodging(s);
  const firstVisit=!visitedArea(s,a);h.area = id;petPassageEntered(s);recordAreaVisit(s,a);originProperty(s,a,context(s,'property'));observeRejected(s,a);observeProperty(s,a,context(s,'property'));
  if(a.temporaryCamp)return;
  if (firstVisit) { gainXp(s, 3 + (hasHabit(h, 'diary') ? 2 : 0)); log(s, `Открыто место: ${a.name}.`, 'discover'); }
  if (!h.memory.places.includes(id)) {const bonus=enchantedDiscovery(s,a,context(s,'enchantments'));if(bonus)gainXp(s,bonus);h.memory.places.push(id);}
  for (const link of a.links) if(!s.areas[link]?.temporaryCamp)revealArea(s,link);
  if (isTown(a) && s.merchant.area&&!enabled(s,'service-access')) h.memory.merchant = s.merchant.area;
  for(const id of a.population||[])if(s.people[id]?.alive&&s.people[id].status==='resident')meetPerson(s,id,context(s,'relationships'));
  for(const id of a.population||[])meetLegacy(s,id,context(s,'life'));
}
const navigationCache=new WeakMap();
function navigation(s,from){
  const revision=`${s.graphRevision||0}:${s.nextArea}:${Object.keys(s.areas).length}:${enabled(s,'mechanisms')}`;
  let cache=navigationCache.get(s);
  if(!cache||cache.revision!==revision){cache={revision,trees:new Map()};navigationCache.set(s,cache);}
  if(cache.trees.has(from))return cache.trees.get(from);
  const queue=[from],parents={[from]:null},distances={[from]:0};
  for(let i=0;i<queue.length;i++)for(const id of s.areas[queue[i]]?.links||[])if(!(id in parents)&&!grateClosed(s,queue[i],id)&&!liftBlocked(s,queue[i],id)&&campLink(s,queue[i],id)&&(!s.areas[queue[i]]?.temporaryCamp||queue[i]===from)){parents[id]=queue[i];distances[id]=distances[queue[i]]+1;queue.push(id);}
  const tree={parents,distances};if(cache.trees.size>6)cache.trees.clear();cache.trees.set(from,tree);return tree;
}
export function route(s,from,to){
  countMarket(s,'route');
  if(!s.areas[from]||!s.areas[to])return [];
  const {parents}=navigation(s,from);if(!(to in parents))return [];
  const path=[];for(let id=to;id!==null;id=parents[id])path.push(id);return path.reverse();
}
export function knownRoute(s,from,to){
  countMarket(s,'route');
  if(!s.hero.atlas||!s.areas[from]||!s.areas[to]||from!==to&&petRouteDeferred(s,to))return [];
  const blockedFords=new Set(fordBlocked(s,s.hero));
  if(from!==to&&!knownArea(s,to))return [];const membership=s.hero.atlas.known.length>3?routeMembership(s):null,queue=[from],parents={[from]:null};
  for(let i=0;i<queue.length;i++)for(const id of s.areas[queue[i]]?.links||[]){if(id in parents||knownLiftBlocked(s,s.people[s.hero.lineage],queue[i],id)||knownGrateBlocked(s,s.people[s.hero.lineage],queue[i],id)||blockedFords.has(fordKey(queue[i],id))||!campLink(s,queue[i],id)||s.areas[queue[i]]?.temporaryCamp&&queue[i]!==from||!(membership?membership.area(id):knownArea(s,id))||!(membership?membership.road(queue[i],id):knownRoad(s,queue[i],id))||areaAvoided(s,id))continue;parents[id]=queue[i];queue.push(id);}
  if(!(to in parents))return [];const path=[];for(let id=to;id!==null;id=parents[id])path.push(id);return path.reverse();
}

function closest(s, predicate) {
  const distances=knownDistances(s,s.hero.area);let best=null,bestDistance=Infinity;
  for(const a of Object.values(s.areas))if(predicate(a)&&distances[a.id]<bestDistance){best=a;bestDistance=distances[a.id];}return best;
}
function goal(s, kind, area, x, intent, reason, extra = {}) {
  s.hero.goal = { kind, area, x, started: s.tick, ...extra };
  Object.assign(s.hero, { intent, reason, action: ({ routeWait:'ОЖИДАНИЕ', rest: 'ОТДЫХ', trade: 'ТОРГОВЛЯ', talk: 'РАЗГОВОР', turnin: 'ОБЕЩАНИЕ', explore: 'ОТКРЫТИЕ', collect: 'ПОИСК' })[kind] || 'ПУТЬ' });
}
function activeQuest(h){return currentQuest(h);}
function delveContext(s){
 const ctx=context(s,'delves');
 ctx.expeditionReady=(world,g)=>{
  if(!enabled(world,'preparation'))return world.hero.hp>=world.hero.maxHp*.85&&world.hero.energy>=65;
  const e=estimatePlan(world,g,context(world,'preparation')),h=world.hero;
  return Boolean(e&&partyPrepared(world,e)&&h.energy>=e.energy&&h.hp>=e.health&&h.magic.mana>=e.mana);
 };
 ctx.prepareExpedition=(world,g)=>{
  const old=world.hero.goal;world.hero.goal={...g,started:world.tick};
  if(preparePlan(world,context(world,'preparation')))return true;
  world.hero.goal=old;return false;
 };
 return ctx;
}
function plan(s) {
  const h = s.hero, a = s.areas[h.area], q = currentQuest(h,s);
  if(cookingPlan(s,context(s,'hearth-food'),{lesson:false}))return;
  if(a.interior){if(a.interior.kind==='workshop'&&(itemRepairPlan(s,context(s,'item-wear'))||toolPlan(s,context(s,'workshop-tools'))||refitPlan(s,context(s,'knife-refit'))||forgePlan(s,context(s,'forging'))))return;if(lodgingPlan(s,context(s,'lodging')))return;tavernPlan(s,context(s,'interiors'));return;}
  if(a.temporaryCamp){leaveCamp(s,context(s,'fieldcamp'));return;}
  if(partyDemand(s)==='food'&&foodPlan(s,context(s,'supply')))return;
  if (enabled(s, 'body') && traitsPlan(s, context(s, 'body'))) return;
  if (h.hp < h.maxHp * (.35 + (1 - h.personality.courage) * .28) || h.energy < 23||partyDemand(s)==='rest') {
    if(lodgingPlan(s,context(s,'lodging')))return;
    if(planFieldCamp(s,context(s,'fieldcamp')))return;
    const refuge = closest(s, a => !a.temporaryCamp && knownArea(s,a) && (isTown(a) || a.type === 'camp'||a.dungeon?.cleared)&&(!enabled(s,'supply')||serviceReachable(s,a,68,context(s,'supply'))));
    const rest = refuge?.objects.find(o => o.kind === 'rest');
    goal(s, 'rest', refuge?.id||h.area, rest?.x??h.x, refuge?`Восстановиться: ${refuge.name}`:'Перевести дух на месте', h.hp < h.maxHp * .7 ? 'Раны важнее обещаний. Он ищет доступное место для восстановления.' : 'Усталость мешает сражаться и исследовать.'); return;
  }
  if(navigationToolPlan(s,context(s,'navigation-tools')))return;
  noticeMoneyPriority(s,context(s,'finances'));
  if(hearCaptivePlan(s,context(s,'dungeon-rescue')))return;
  if(isDungeonRescue(q)){planQuest(s,q,context(s,'quests'));return;}
  if(h.delve&&delvePlan(s,delveContext(s)))return;
  if(heroCreditPlan(s,context(s,'provision-credit')))return;
  if(h.merchantTrip&&heroMerchantPlan(s,context(s,'merchant-trips')))return;
  if(h.caravanJob&&caravanPlan(s,context(s,'caravans')))return;
  if(weatherShelter(s,context(s,'weather')))return;
  if(localNeedsPlan(s,context(s,'supply')))return;
  if(dogSearchPlan(s,context(s,'pet-training')))return;
  if(!q&&dogTrainingPlan(s,context(s,'pet-training')))return;
  if(!q&&moneyCachePlan(s,context(s,'finances')))return;
  if(!q&&routeMapPlan(s,context(s,'route-maps')))return;
  if(!q&&mapCopyPlan(s,context(s,'route-maps')))return;
  if(!q&&studyBestiaryPlan(s,context(s,'bestiary')))return;
  if(biomaterialPlan(s,context(s,'animal-materials')))return;
  if(heroFieldCraftPlan(s,context(s,'field-craft'),{study:false,urgent:Boolean(q?.deadline&&q.deadline-s.tick<16)}))return;
  if(itemRepairPlan(s,context(s,'item-wear')))return;
  if(!q&&cookingPlan(s,context(s,'hearth-food')))return;
  if(!q&&toolPlan(s,context(s,'workshop-tools')))return;
  if(reconsiderWorkLoss(s,{...context(s,'work-loss'),questReady,planQuest:(world,quest)=>planQuest(world,quest,context(world,'quests'))},q))return;
  if(factionPathPlan(s,context(s,'faction-paths')))return;
  if(!q&&lifePlan(s,context(s,'life')))return;
  if(!q&&politicalPlan(s,context(s,'politics')))return;
  if(!q&&storyPlan(s,context(s,'stories')))return;
  if(!q&&civilianQuestPlan(s,context(s,'quests')))return;
  if(commitmentPlan(s,q,Boolean(q&&questReady(s,q)),{...context(s,'commitments'),work:()=>planWork(s,context(s,'work'))}))return;
  if(!q&&collectionPlan(s,context(s,'collections')))return;
  if(!q&&servicePlan(s,context(s,'work-orders')))return;
  if(!q&&workshopDisputePlan(s,context(s,'workshop-dispute')))return;
  if(!q&&principlePlan(s,context(s,'principles')))return;
  if(!q&&verdictInquiryPlan(s,context(s,'verdict-knowledge')))return;
  if(!q&&verdictReviewPlan(s,context(s,'verdict-review')))return;
  if(!q&&craftStudyPlan(s,{...context(s,'craft-practice'),craftBench:world=>workspaceAccess(world,context(world,'property'))}))return;
  if(!q&&heroFieldCraftPlan(s,context(s,'field-craft')))return;
  if(!q&&homePlan(s,context(s,'homes')))return;
  if(!q&&forgePlan(s,context(s,'forging')))return;
  if(!q&&refitPlan(s,context(s,'knife-refit')))return;
  if(!q&&landmarkPlan(s,context(s,'landmarks')))return;
  if(!q&&heroMerchantPlan(s,context(s,'merchant-trips')))return;
  if(caravanPlan(s,context(s,'caravans')))return;
  if(delvePlan(s,delveContext(s)))return;
  if(repertoirePlan(s,{...context(s,'repertoire'),work:world=>planWork(world,context(world,'work'),{interest:true}),explore:explorePlan,planQuest:(world,quest)=>planQuest(world,quest,context(world,'quests'))},q))return;
  if(isTown(a)&&h.career.path!=='peaceful'&&h.quests.filter(q=>q.status==='active').length<4&&hasOffer(s,a)&&(!q||s.tick-(h.memory.lastNewQuest||0)>120)){
    h.memory.lastNewQuest=s.tick;goal(s,'talk',a.id,42,'Выслушать ещё одно дело','Несколько обещаний могут совпасть с одной дорогой. Герой сам решит, за что взяться.');return;
  }
  if(!q&&propertyAidPlan(s,context(s,'property-aid')))return;
  if(!q&&propertyGiftPlan(s,context(s,'property-gifts')))return;
  if(!q&&propertyContractPlan(s,context(s,'property-contracts')))return;
  if(!q&&repairPlan(s,context(s,'property')))return;
  if(!q&&propertyPlan(s,context(s,'property')))return;
  if(h.career.path==='peaceful'&&!q&&planWork(s,context(s,'work')))return;
  if(q){planQuest(s,q,context(s,'quests'));return;}

  if (planWork(s, context(s, 'work'))) return;
  if(materialClientPlan(s,context(s,'material-delivery')))return;
  const story = a.objects.find(o => o.kind === 'encounter' && !o.resolved);
  if (story && enabled(s, 'encounters')) {
    goal(s, 'encounter', a.id, story.x, `Рассмотреть: ${story.name}`, 'Встреча может изменить путь. Герой решит сам.', { object: story.id }); return;
  }
  const savings = hasHabit(h, 'hoarder') && h.hp > h.maxHp * .75 ? 12 : 0;
  if ((h.memory.shopAfter || 0) <= s.tick && ((enabled(s,'finances')?Boolean(nextPurchase(s,context(s,'finances'),h.memory.merchant)):((h.weapon < 3 && h.gold >= 16 + h.weapon * 15 + savings) || (!h.inventory.potions && h.gold >= 7 && h.weapon > 0) || (!hasArmor(h) && h.gold >= 22 + savings))) || h.inventory.relics > 0 || enabled(s, 'equipment') && h.bag.length > 7&&!h.itemBuyerFull)) {
    const merchantArea = h.memory.merchant;
    if (merchantArea&&knownServiceAllows(s,s.areas[merchantArea],'merchant') && route(s, h.area, merchantArea).length > 0 && route(s, h.area, merchantArea).length <= 5) { goal(s, 'trade', merchantArea, 58, 'Найти Саву и обновить снаряжение', 'Деньги накоплены. Хорошее снаряжение снизит риск следующего боя.'); return; }
    if (merchantArea) h.memory.shopAfter = s.tick + 180;
  }
  const town = closest(s, area => knownArea(s,area) && isTown(area) && hasWork(s, area));
  if (town && (h.gold < 16 + h.weapon * 15 || h.personality.sociability > .65 || h.personality.generosity > .65)) {
    goal(s, 'talk', town.id, 42, 'Узнать, кому нужна помощь', 'Работа даёт доход, а разговоры — сведения о мире.'); return;
  }
  if(tavernPlan(s,context(s,'interiors')))return;
  if(quietPlan(s,context(s,'work')))return;
  explorePlan(s);
}
function explorePlan(s,blocked=false){
  const h=s.hero,a=s.areas[h.area],reachable=area=>knownRoute(s,h.area,area.id).length>0;
  let options = Object.values(s.areas).filter(area => !area.interior && !area.temporaryCamp && knownArea(s,area) && !h.memory.places.includes(area.id) && !areaAvoided(s,area.id)&&reachable(area));
  if (!options.length) {
    const blockedPath=blocked||Object.values(s.areas).some(area=>knownArea(s,area)&&!area.interior&&!area.temporaryCamp&&!h.memory.places.includes(area.id)&&!reachable(area));
    const frontier = closest(s, area => !area.temporaryCamp&&visitedArea(s,area) && !area.expanded && area.type !== 'village' && !areaAvoided(s,area.id)&&reachable(area));
    if (frontier) { goal(s, 'expand', frontier.id, 91, blockedPath?'Искать другую дорогу':'Разведать дорогу за горизонтом', blockedPath?'Прежний путь перекрыт. Он выбирает доступный знакомый выход.':'Знакомые тропы изучены. Любопытство зовёт дальше.'); return; }
    if(blockedPath||Object.keys(h.memory.avoided).some(id=>areaAvoided(s,id))){
      const until=Math.min(...Object.values(h.memory.avoided).filter(until=>until>s.tick));
      goal(s,'routeWait',h.area,h.x,'Подождать у знакомой дороги','Известного доступного пути пока нет. Он остаётся здесь и ждёт новых возможностей.',{until:Number.isFinite(until)?until:s.tick+70});return;
    }
    // Expanding a visited frontier keeps the world connected without resetting it.
    a.expanded = false; goal(s, 'expand', a.id, 91, 'Найти новую тропу', 'Каждая дорога может привести к новой истории.'); return;
  }
  options.sort((aa, bb) => {
    const score = area => knownRoute(s, h.area, area.id).length + routePreference(s,area) + weatherPreference(s,area) - (area.type === 'forest' ? h.personality.curiosity : 0);
    return score(aa) - score(bb);
  });
  options = mindPlan(s, options, context(s, 'psychology'));
  const next = options[0]; goal(s, 'explore', next.id, 84, `Исследовать: ${next.name}`, next.type === 'ruins' ? 'В руинах опасно, но могут сохраниться древние находки.' : 'Он ещё не бывал здесь и хочет узнать, что впереди.');
}
function hasWork(s,area){if(enabled(s,'intention-balance')&&s.hero.quests.filter(q=>q.status==='active').length>=4)return false;return hasOffer(s,area);}
function move(s, target) {
  const h = s.hero, delta = target - h.x;
  h.facing = Math.sign(delta) || h.facing;
  const weather=weatherAt(s,s.areas[h.area]);
  const amount=areaStep(s.areas[h.area],h.x,target,foodWalkingStride(s,h)*weather.speed);
  h.x+=amount;h.distance+=Math.abs(amount)*areaScale(s.areas[h.area]);h.energy=Math.max(0,h.energy-walkingEnergy(s,weather));h.lastAction='walk';
}
function gainXp(s, amount) {
  const h = s.hero; h.xp += amount;
  if (h.xp >= h.level * 24) {
    h.xp -= h.level * 24; h.level++; h.maxHp += 5; h.hp = Math.min(h.maxHp, h.hp + 8);
    h.personality.courage = Math.min(.94, h.personality.courage + .02);
    if (s.journal) log(s, `${h.name} становится опытнее: уровень ${h.level}. Теперь он лучше оценивает опасность.`, 'level');
    learnSpell(s,context(s,'magic'));
  }
}
function acceptWork(s){acceptQuest(s,context(s,'quests'));}
function completeQuest(s,q){finishQuest(s,q,context(s,'quests'));}
function trade(s) {
  const h = s.hero, m = s.merchant;
  if(denyService(s,context(s,'service-access'),'merchant')){h.goal=null;h.memory.shopAfter=s.tick+45;return;}
  if (m.area !== h.area) {
    const known = m.area || m.destination;
    h.memory.merchant = known; h.goal = null; h.lastAction = 'talk';
    h.memory.shopAfter = s.tick + 45;
    log(s, `«Сава уехал в ${s.areas[known].name}». Придётся пересмотреть маршрут.`, 'talk'); return;
  }
  h.memory.people = [...new Set([...h.memory.people, 'merchant'])]; h.lastAction = 'trade';
  if (enabled(s, 'equipment')) sellBag(s, context(s, 'loot'));
  if (h.inventory.relics) { const count = h.inventory.relics; h.gold += count * 18; h.inventory.relics = 0; log(s, `Сава покупает древние находки за ${count * 18} монет.`, 'trade'); }
  if(enabled(s,'finances')){buyUpgrade(s,context(s,'finances'));h.goal=null;return;}
  if(containersOn(s)&&packView(s).excess){h.goal=null;return;}
  const price = equipmentPrice(s,'weapon');
  if (h.weapon < 3 && h.gold >= price&&consumeMerchantGood(s,'weapon')) { h.gold -= price; h.weapon++;causalPurchase(s,'weapon',price);log(s, `Накопленные деньги превращаются в ${['', 'железный меч', 'стальной меч', 'меч мастера'][h.weapon]}. Следующий бой будет легче.`, 'trade'); }
  else if (!hasArmor(h) && h.gold >= 22&&consumeMerchantGood(s,'armor')) { h.gold -= 22; h.armor = 1; log(s, 'Сава продаёт кожаную броню. Теперь удары причиняют меньше вреда.', 'trade'); }
  else if (!h.inventory.potions && h.gold >= 7&&stackRoom(s,h.lineage,'potions',1)>=1&&consumeMerchantGood(s,'potion')) { h.gold -= 7; h.inventory.potions++; log(s, 'Герой покупает лечебное зелье на случай тяжёлого боя.', 'trade'); }
  h.goal = null;
}
function collect(s, object) {
  if(object.kind==='supplyCache'){recoverCargo(s,object,context(s,'supply'));s.hero.goal=null;s.hero.lastAction='collect';return;}
  const h = s.hero,a=s.areas[h.area];
  if (object.kind === 'herb' && object.count > 0&&stackRoom(s,h.lineage,'herbs',1)>0&&scentPlantKnown(s,h,a,object)&&physicalDistance(a,h.x,object.x)<=9) { object.count--; h.inventory.herbs++; log(s, 'Лунная трава найдена. Её можно отдать лекарю или приложить к ране.', 'loot'); }
  if (object.kind === 'loot' && !object.taken) { object.taken = true; h.gold += object.gold; log(s, `В забытом кошеле ${object.gold} монет. На дороге стало чуть меньше тайн.`, 'loot'); }
  if(object.kind==='heirloom'&&!object.taken)recoverHeirloom(s,object,context(s,'loot')); 
  if (object.kind === 'relic' && !object.taken) { object.taken = true; h.inventory.relics++; h.counters.relics++; gainXp(s, 10); log(s, 'Найден осколок древнего света.', 'loot'); if (enabled(s, 'equipment')) receiveItem(s, context(s, 'loot'), 2); }
  h.lastAction = 'collect'; h.goal = null;
  temporalCollection(s,object,context(s,'epochs'));
}
function expand(s) {
  expandRoutes(s,context(s,'geography'));s.hero.goal=null;
}
function die(s, enemy,details={}) {
  const meaning=deathMeaning(s,enemy),report=deathRecord(s,enemy,details);
  finishDelve(s,'death');
  cancelWeapon(s,'Смерть прекращает подготовку.');
  const h = s.hero; h.alive = false; h.hp = 0; h.combat = null; h.goal = null; h.lastAction = 'death';
  h.intent = 'Жизнь закончилась. Мир продолжается'; h.reason = 'Можно наблюдать, что станет с этим местом, или отдельно начать другую историю.'; h.action = 'НАСЛЕДИЕ';
  for (const q of h.quests) if (q.status === 'active') q.status = 'failed';
  const grave = { name: h.name, family: h.family, lineage: h.lineage, race: h.race, area: h.area, x: h.x, tick: s.tick, born: h.born, level: h.level, kills: h.kills, cause: enemy.name };
  if(s.people?.[h.lineage]){s.people[h.lineage].alive=false;s.people[h.lineage].health=0;s.people[h.lineage].status='dead';s.people[h.lineage].died=s.tick;}
  propertyLifeEnded(s,context(s,'property-contracts'));
  releaseParty(s,context(s,'relationships'));
  s.graves.push(grave); s.areas[h.area].objects.push({ id: 'grave-' + s.generation, kind: 'grave', name: h.name, x: h.x });
  const belongings=[...h.bag,...Object.values(h.equipment).filter(Boolean)];for(const item of belongings){item.history ||= [];item.history.push({tick:s.tick,text:`Осталось после гибели ${h.name}.`});}
  if(belongings.length||h.gold){const cache={id:'heritage-'+s.generation,kind:'heirloom',name:h.name+' '+h.family,x:Math.max(areaOffset(s.areas[h.area],5),Math.min(100-areaOffset(s.areas[h.area],5),h.x+areaOffset(s.areas[h.area],7))),items:belongings,gold:Math.floor(h.gold*.3),taken:false};s.areas[h.area].objects.push(cache);for(const item of belongings)itemLocation(s,item,{kind:'cache',area:h.area,object:cache.id});}
  const body=recordHeroRemains(s,h,grave,s.areas[h.area].objects.find(o=>o.id==='grave-'+s.generation),s.areas[h.area].objects.find(o=>o.id==='heritage-'+s.generation),enemy.name);
  s.changes.push({ tick: s.tick, text: `${h.name} погиб в месте «${s.areas[h.area].name}».` });
  log(s, `${h.name} погибает. ${enemy.kind==='enemy'?'Противник: ':'Причина: '}${enemy.name}. Его след останется в этом мире.`, 'death',h.area,{meaning});
  archiveLife(s,'dead',enemy.name,{causeMeaning:meaning,deathReport:report});h.life.endedAt=s.tick;h.deathSnapshot={tick:s.tick,area:h.area,x:h.x};
  openInheritance(s,h,s.areas[h.area].objects.find(o=>o.id==='heritage-'+s.generation),context(s,'finances'));
  if(body)h.deathSnapshot.remainsId=body.id;
  h.companions=[];h.bag=[];for(const key of Object.keys(h.equipment))h.equipment[key]=null;h.gold=0;for(const key of Object.keys(h.inventory))h.inventory[key]=0;syncActiveActor(s,true);
}
function fight(s, enemy) {
  const h = s.hero;
  if (!enemy?.alive) { cancelWeapon(s,'Противник больше не участвует в бою.');h.combat = null; h.goal = null; return; }
  encounterBestiary(s,s.people[h.lineage],enemy);
  contactDelve(s,enemy);
  causalReturn(s,enemy);
  if(storyCombatChoice(s,enemy,context(s,'stories'))){cancelWeapon(s,'Выбрано другое действие.');observeRejected(s,s.areas[h.area]);return;}
  rememberWeaponRole(s);
  h.action = 'БОЙ'; h.intent = `Сражаться: ${enemy.name}`; h.reason = 'Опасность уже рядом. Он оценивает раны после каждого удара.';
  let choice=chooseCombatAction(s,enemy);rememberCombatChoice(s,enemy,choice,context(s,'combat'));
  const warned=enabled(s,'tactics')&&enemy.tactic==='charged'&&enemy.battle?.intent==='strike'&&Math.max(1,expectedStrike(s,enemy)-legacyArmorDefense(h)-itemBonus(h,'defense'))>h.hp*(.65+h.personality.courage*.4);
  if (choice?choice.action==='flee':h.hp < h.maxHp * (.18 + (1 - h.personality.courage) * .2) || h.energy < 9||warned) {
    const escaped=random(s)<.82;resolveCombatChoice(s,'flee-attempt',{retreatAttempted:true,retreated:escaped});
    if (escaped) {
      cancelWeapon(s,'Отступление прерывает размах.');
      pauseDelve(s,enemy,'escaped');
      h.combat = null; h.goal = null; h.memory.avoided[h.area] = s.tick + 40;
      const refuge = closest(s, a => !a.temporaryCamp && (a.type === 'camp' || isTown(a)));
      if(refuge)goal(s, 'rest', refuge.id, 68, 'Отступить к безопасному месту', choice?.reason||(warned?'Замах уже виден. Следующий удар опаснее оставшегося здоровья.':'Продолжение боя слишком опасно. Он предпочитает выжить.'));
      else {h.intent='Искать безопасный выход';h.reason='Известного доступного убежища нет. Отступление не создаёт новое место, припасы или лечение.';}
      rememberRetreat(s,enemy);h.lastAction = 'flee'; log(s, 'Герой отступает. Раненый противник остаётся здесь, а обещание подождёт.', 'flee'); return;
    }
    log(s, 'Путь к отступлению перекрыт — придётся выдержать ещё один удар.', 'combat');
    if(choice){choice=chooseCombatAction(s,enemy,{retreatBlocked:true});rememberCombatChoice(s,enemy,choice,context(s,'combat'));}
  }
  const legacy=!choice||choice.action==='legacy';
  if(choice?.action==='brace'&&performBrace(s,enemy,context(s,'combat'))){cancelWeapon(s,'Вместо размаха выбран заслон.');resolveCombatChoice(s,'brace',{energySpent:BRACE_ENERGY});enemyResponse(s,enemy);return;}
  if (choice?.action==='potion'||legacy&&h.hp < h.maxHp * .45 && h.inventory.potions > 0) {
    cancelWeapon(s,'Лечение прерывает размах.');
    const before=h.hp;h.inventory.potions--; h.hp = Math.min(h.maxHp, h.hp + 19); h.lastAction = 'heal';resolveCombatChoice(s,'potion',{potionsSpent:1}); log(s, 'Герой сам использует зелье: без лечения следующий удар может стать последним.', 'heal',h.area,{meaning:eventMeaning(s,'heal',{item:{kind:'item',id:null,label:'Лечебное зелье',role:'зелье'},amount:h.hp-before})});enemyResponse(s,enemy);return;
  }
  const manaBefore=h.magic.mana;
  if((legacy||choice?.action==='spell')&&castInCombat(s,enemy,context(s,'magic'),choice?.action==='spell'?choice.spell:null)){cancelWeapon(s,'Чары прерывают размах.');resolveCombatChoice(s,'spell',{manaSpent:manaBefore-h.magic.mana});if(enemy.alive&&!enemy.resolved){if(h.magic.responseSkipped)partyCombatPhase(s,enemy,true);else enemyResponse(s,enemy);}return;}
  const technique=['quick','release','windup'].includes(choice?.action)?{id:choice.action,reason:choice.reason}:legacy?chooseWeaponStyle(s,enemy):null;
  if(technique)h.reason=technique.reason;
  if(technique?.id==='windup'&&beginWeapon(s,enemy,context(s,'combat'))){resolveCombatChoice(s,'windup',{energySpent:2,reason:technique.reason});enemyResponse(s,enemy);return;}
  const style=technique&&finishWeapon(s,enemy,technique.id==='release'?'heavy':technique.id)?technique.id==='release'?'heavy':technique.id:null;
  if(!style)cancelWeapon(s,'Выбран обычный удар.');
  const raw = 4 + h.weapon * 3 + Math.floor(h.level / 2) + roll(s, 4);
  const damage = combatAttack(s, enemy, raw, context(s, 'combat'),style);
  const energy=style?WEAPON_STYLES[style].energy:3;
  const enemyBefore=enemy.hp;enemy.hp -= damage; h.energy = Math.max(0, h.energy - energy); h.lastAction = 'attack';
  recordWeaponHit(s,enemy,damage,enemyBefore);
  wearWeaponHit(s,enemy,damage,enemyBefore,context(s,'item-wear'));
  resolveCombatChoice(s,'attack',{damage,...(style?{weaponStyle:style,energySpent:energy,reason:technique.reason}:{})});
  actorFact(s,'attack','hero',enemy.id);
  if(enabled(s,'companions'))for(const c of h.companions)if(c.attack>0&&partyAvailable(s,c)&&(!partyCombatOn(s)||!c.person))actorFact(s,'attack',companionKey(c),enemy.id);
  if(damage>0)actorFact(s,'hurt',enemy.id,'hero',damage);
  if (enemy.hp <= 0) {
    defeatEnemy(s,enemy);return;
  }
  log(s,`${h.name} ${style==='quick'?'наносит коротким ударом':style==='heavy'?'наносит подготовленным ударом':'наносит'} ${damage} урона.`,'combat',h.area,{meaning:eventMeaning(s,'strike',{target:enemyReference(enemy),amount:damage})});enemyResponse(s,enemy);
}
function partyCombatPhase(s,enemy,skipResponse=false){
 const round=partyCombatTurn(s,enemy,{...context(s,'combat'),hurtCompanion,skipResponse});
 if(enemy.alive&&enemy.hp<=0){defeatEnemy(s,enemy,round?.killer);return false;}
 if(skipResponse&&round)round.replied=true;
 return enemy.alive&&!enemy.resolved;
}
function enemyResponse(s,enemy){
  const h=s.hero;if(!enemy.alive||enemy.resolved)return;
  if(partyCombatOn(s)&&h.partyCombat?.tick===s.tick&&h.partyCombat.enemy===enemy.id&&h.partyCombat.replied)return;
  if(!partyCombatPhase(s,enemy))return;
  const phase=enemy.battle?.intent||'idle';
  const raw=enemyReply(s,enemy,enemy.attack+roll(s,4),context(s,'combat'));
  encounterBestiary(s,s.people[h.lineage],enemy);
  observeWeaponReply(s,enemy,phase);
  if(!raw){partyCoverDamage(s,enemy,0,{...context(s,'combat'),hurtCompanion});enemyRecovery(s,enemy,h.lastAction!=='windup'&&(profile(h).skill==='magic'||h.lastAction==='spell'));h.lastDamage=0;rememberCombatReply(s,enemy,0,phase);return;}
  const total=combatResponse(s,enemy,Math.max(1,raw-legacyArmorDefense(h)),context(s,'combat'));
  const {received,excluded}=partyCoverDamage(s,enemy,total,{...context(s,'combat'),hurtCompanion});
  actorFact(s,'attack',enemy.id,'hero');
  if(received>0)actorFact(s,'hurt','hero',enemy.id,received);
  partyHurt(s,received,context(s,'party-danger'),excluded);const hpBefore=h.hp;h.hp-=received;h.lastDamage=received;
  recordLastingInjury(s,s.people[h.lineage],enemy,{before:hpBefore,after:h.hp,maximum:h.maxHp,area:h.area,controller:'actor'},context(s,'lasting-injuries'));
  wearArmorHit(s,enemy,received,hpBefore,context(s,'item-wear'));
  rememberCombatReply(s,enemy,received,phase);
  log(s,`${enemy.name} отвечает: −${received} HP.`,'combat',h.area,{meaning:eventMeaning(s,'strike',{actor:enemyReference(enemy),target:actorReference(h),amount:received})});if(h.hp<=0)die(s,enemy,{kind:'battle',damage:received,hpBefore});pairCombatTick(s);
}
function defeatEnemy(s,enemy,killer=s.hero.lineage){
  if(!enemy.alive)return;
  markActorDeath(s,enemy,enemy.id,enemyShape(enemy));
  const h=s.hero;enemy.hp=0;enemy.alive=false;dropRescuePurse(s,s.areas[h.area],enemy);h.combat=null;h.kills++;h.gold+=2+roll(s,4);gainXp(s,9);
  if(killer!==h.lineage)enemy.defeatedBy=killer;
  recordRemains(s,enemy,{kind:'enemy',id:enemy.id,area:h.area,x:enemy.x,shape:enemyShape(enemy),cause:{person:killer},facing:h.x<enemy.x?-1:1});
  observeRejected(s,s.areas[h.area]);
  s.changes.push({tick:s.tick,text:`${enemy.name} побеждён в месте «${s.areas[h.area].name}».`});
  log(s,`${enemy.name} повержен. Он больше не будет угрожать этой дороге.`,'victory',h.area,{meaning:eventMeaning(s,'victory',{target:enemyReference(enemy)})});afterVictory(s,enemy,context(s,'loot'));h.goal=null;
  applyTimeConsequence(s,enemy,context(s,'epochs'));
}
function spawnEnemy(s,a,settings={}){
 const enemy={id:a.id+'-arrival-'+s.society.nextEnemy++,kind:'enemy',name:'Пришлая угроза',x:settings.x||57,hp:20,maxHp:20,attack:4,alive:true,patrol:0,...settings,requestedSpecies:settings.requestedSpecies||settings.species};
 composeEnemy(s,a,enemy,()=>moduleRandom(s,'event-enemies'),true);a.objects.push(enemy);return enemy;
}
function npcVictory(s,a,enemy,p){
 markActorDeath(s,enemy,enemy.id,enemyShape(enemy));
 enemy.hp=0;enemy.alive=false;enemy.defeatedBy=p.id;const text=p.name+' побеждает '+enemy.baseName+' на дороге. Это поступок другого человека.';if(enabled(s,'npc-watch-needs'))watchNote(s,p,text,{log},'orders');else{s.society.events.unshift({tick:s.tick,area:a.id,text,kind:'orders'});s.changes.push({tick:s.tick,text});if(s.hero.area===a.id)log(s,text,'orders');}
 recordRemains(s,enemy,{kind:'enemy',id:enemy.id,area:a.id,x:enemy.x,shape:enemyShape(enemy),cause:{person:p.id},facing:Number.isFinite(p.x)?p.x<enemy.x?-1:1:undefined});
 dropRescuePurse(s,a,enemy);
 if(enemy.items?.length){cacheItems(s,enemy.items,{area:a.id,x:enemy.x,leftBy:p.id,name:'Перехваченная поклажа'});enemy.items=[];}
}
function worldTick(s) {
  waitingPackPetsTick(s);
  leverTeamTick(s,context(s,'mechanisms'));
  biomaterialTick(s);
  goodsTick(s);
  lodgingTick(s);
  hallActivitiesTick(s,context(s,'hall-activities'));
  for(const h of detailedActors(s))if(selfDrivenActor(s,h)&&!h.transit)observeFreightActor(actorView(s,h),s.people[h.lineage],h.area);
  supplyTick(s,context(s,'supply'));
  societyTick(s,context(s,'society'));
  migrationsTick(s,context(s,'migrations'));
  propertyDamageTick(s,context(s,'property-damage'));
  propertyContractsTick(s,context(s,'property-contracts'));
  workOrdersTick(s,context(s,'work-orders'));
  workshopDisputesTick(s,context(s,'workshop-dispute'));
  peopleTick(s,context(s,'people'));
  npcPetsTick(s,context(s,'pet-transfer'));
  petBoardingWorldTick(s,context(s,'pet-passage'));
  propertyGiftsTick(s,context(s,'property-gifts'));
  propertyAidTick(s,context(s,'property-aid'));
  ordersTick(s,context(s,'npc-combat'));
  const m = s.merchant;
  merchantResupply(s);
  if (!m.area && s.tick >= m.arrival) { m.area = m.destination; m.destination = null; m.nextMove = s.tick + 70;merchantResupply(s,true); }
  if (m.area && s.tick >= m.nextMove) {
    const towns = Object.values(s.areas).filter(a => isTown(a) && a.id !== m.area);
    if (towns.length) {
      const dest = towns[roll(s, towns.length)];
      if(enabled(s,'service-access')){
        for(const h of detailedActors(s))if(selfDrivenActor(s,h)&&!h.transit&&h.area===m.area){h.memory.merchant=dest.id;log(actorView(s,h),`Сава собирает товары и уезжает в ${dest.name}.`,'world');}
      }else if(!s.hero.transit&&s.hero.area===m.area)log(s,`Сава собирает товары и уезжает в ${dest.name}.`,'world');
      const travelTime = Math.max(7, routeDistance(s,route(s,m.area,dest.id))/100*18);
      m.destination = dest.id; m.area = null; m.arrival = s.tick + travelTime;
    } else m.nextMove = s.tick + 35;
  }
  // Distant regions retain their identities. Only a small scheduled change is simulated.
  const activeFights=new Set(Object.values(s.actorStates).filter(h=>selfDrivenActor(s,h)&&h.combat).map(h=>h.combat));
  for (const a of Object.values(s.areas)) for (const o of a.objects) {
    if (o.kind === 'enemy' && o.alive && o.patrol && !activeFights.has(o.id) && s.tick % 4 === 0) {
      const beforeX=o.x;o.x += areaOffset(a,o.patrol*1.4);creatureTrace(s,a,o,beforeX);
      if (o.x < 29 || o.x > 83) o.patrol *= -1;
    }
  }

  if (s.changes.length > 300) s.changes.splice(0, s.changes.length - 300);
}
function archiveNPCObservers(s){for(const h of detailedActors(s))if(h.actorMode==='npc'&&!h.alive){
 const p=s.people[h.lineage],ended=Number.isInteger(p?.died)&&p.died>=0&&p.died<=s.tick?p.died:h.life.endedAt??s.tick;
 if(s.lives.some(l=>l.lineage===h.lineage&&l.outcome==='dead'&&l.ended===ended))continue;
 const view=actorView(s,h),cause=p?.deathCause||'Гибель жителя мира',late=ended<s.tick||h.life.deathDateKnown===false;
 cancelWeapon(view,'Смерть прекращает подготовку.');
 log(view,h.name+': '+cause+'.','death',p?.area??null,{tick:ended,recordedAt:late?s.tick:undefined});
 archiveLife(view,'dead',cause,{ended,recordedAt:late?s.tick:undefined,wealthBasis:late?'recorded-estate':undefined});
 openInheritance(view,h,null,context(view,'finances'));
}}
export function advanceWorld(s) {
 if(rootWorld(s)!==s)throw new Error('Only the shared world advances time');
 syncNPCActors(s);bindObservedJournal(s);
 initializeSpatial(s);
 s.tick++;s.actorFacts={tick:s.tick,events:[]};
 initializeInteriors(s);
 initializeLodging(s);
 for(const h of Object.values(s.actorStates)){h.speech='';if(selfDrivenActor(s,h))h.lastAction='idle';}
 worldTick(s);syncNPCActors(s);archiveNPCObservers(s);invalidateNPCControl(s);
 const actors=detailedActors(s);
 for(const h of actors){
  applyActorExternal(s,h);weaponTick(actorView(s,h));pairCombatTick(actorView(s,h));if(!selfDrivenActor(s,h)||h.actorStep===s.tick)continue;
  if(!npcAction(s,s.people[h.lineage],'actor','decision'))continue;
  const view=actorView(s,h);observeLocalRoutes(view);observeCampSites(view);
  observeRouteMap(view,s.people[h.lineage]);
  h.actorStep=s.tick;
  if(s.people[h.lineage]?.status==='captive'){h.lastAction='rest';continue;}
  try{actObserved(view);}finally{advancePackPets(view,{...context(view,'pack-pets'),knownRoute:(world,from,to)=>knownPetRoute(world,from,to,id=>areaAvoided(world,id)),hurtCompanion:(world,c,n,ctx)=>hurtCompanion(world,c,n,ctx,'pack-starvation')});pairCombatTick(view);syncActiveActor(view);invalidateNPCControl(s);}
 }
 for(const h of actors)applyActorExternal(s,h);
 syncNPCActors(s);archiveNPCObservers(s);finishLootTick(s);return s;
}
export const step=advanceWorld;
export function createNextStory(s,{allowLiving=false}={}){
 if(observingBodyActive(s)&&!allowLiving)return false;
 syncNPCActors(s);
 bindObservedJournal(s);s.nextGeneration=Math.max(s.nextGeneration,s.generation)+1;s.generation=s.nextGeneration;s.hero=createHero(s);
 s.hero.actorJournal=[];s.journal=s.hero.actorJournal;
 s.observation={person:s.hero.lineage,sequence:(s.observation.sequence||s.generation-1)+1,started:s.tick};
 initializeObservation(s);prepareBirthplace(s,s.hero,{openSettlement,addArea,connect});enter(s,s.hero.area);syncObservedPerson(s);syncActiveActor(s);
 log(s,s.hero.name+' начинает новую историю в том же мире.','birth');return true;
}
export function observeDetailedActor(s,person){
 const h=s.actorStates?.[person],p=s.people[person];if(!h?.alive||!p?.alive||h===s.hero||!s.areas[h.area]||!personLocation(s,person))return false;
 bindObservedJournal(s);const journal=actorJournal(s,h);s.hero=h;s.generation=h.actorGeneration;s.journal=journal;
 s.observation={version:1,person,sequence:(s.observation.sequence||1)+1,started:s.tick};initializeObservation(s);return true;
}
export function observeExistingPerson(s,person){
 const p=s.people[person];if(!p?.alive||!Number.isFinite(p.health)||p.health<=0||p.role==='ребёнок'||p.agenda?.job==='student'||!personLocation(s,person))return false;
 if(!s.actorStates?.[person]){s.nextNPCObservation=Math.max(s.nextNPCObservation||0,...Object.values(s.actorStates||{}).filter(h=>h.actorMode==='npc'&&h.actorGeneration<0).map(h=>-h.actorGeneration))+1;const h=npcActorProfile(s,p,createHero,-s.nextNPCObservation);s.actorStates[person]=h;initializeObservation(s);syncNPCActors(s);}
 return observeDetailedActor(s,person);
}
function actObserved(s) {
 const h=s.hero;
  petTrainingTick(s);
  if(h.petPassage?.lastActionTick===s.tick){h.lastAction='companion';return s;}
  weaponTick(s);
  pairCombatTick(s);
  rememberPracticalRole(s,s.people[h.lineage],h);
  observeServices(s);
  observeOwnCollection(s,context(s,'collections'));
  weatherTick(s,context(s,'weather'));
  propertyMemoryTick(s,context(s,'property-memory'));
  storyTick(s,context(s,'stories'));
  factionPathTick(s,context(s,'faction-paths'));
  questTick(s,context(s,'quests'));
  commitmentTick(s,context(s,'commitments'));
  sketchingTick(s,context(s,'sketching'));
  cookingTick(s,context(s,'hearth-food'));
  if(!enabled(s,'quests')&&h.goal?.quest)h.goal=null;
  if(!enabled(s,'delves')&&h.goal?.delve)h.goal=null;
  if(!enabled(s,'faction-paths')&&h.goal?.kind==='factionDuty')h.goal=null;
  if(!enabled(s,'caravans')&&h.goal?.caravan)h.goal=null;
  if(!enabled(s,'weather')&&h.goal?.kind==='weatherWait')h.goal=null;
  if(!enabled(s,'encounters')&&h.goal?.kind==='encounter'||!enabled(s,'body')&&h.goal?.kind==='provision')h.goal=null;
  if(!enabled(s,'lifecycle')&&h.goal?.kind==='settle')h.goal=null;
  if(h.goal?.story&&!isStoryActive(s,h.goal.story))h.goal=null;
  if(!enabled(s,'supply')&&['eat','forage'].includes(h.goal?.kind))h.goal=null;
  if (traitsTick(s, context(s, 'body'))) return s;
  if(heroFordProgress(s,context(s,'fords')))return s;
  if(transitTick(s,context(s,'travel')))return s;
  observeTowers(s,context(s,'landmarks'));
  observeScentPlants(s);
  observeNavigationBlockers(s,context(s,'navigation-memory'));
  observeBestiaryTraces(s,s.people[h.lineage],context(s,'bestiary'));
  observeMaterials(s);
  if(!enabled(s,'work-materials')&&h.goal?.kind==='serviceSupply')h.goal=null;
  if (h.goal?.kind === 'trade' && s.tick - (h.goal.started ?? s.tick) > 180) {
    h.memory.shopAfter = s.tick + 240; h.goal = null;
    log(s, 'Поиски Савы затянулись. Герой откладывает покупку и возвращается к исследованию.', 'talk');
  }
  if (h.combat) { fight(s, s.areas[h.area].objects.find(o => o.id === h.combat)); return s; }
  if(poisonCareTick(s,context(s,'poison-care')))return s;
  noticeCaravan(s,context(s,'caravans'));
  // Healing is an autonomous choice; herbs promised to a healer are kept if possible.
  if (h.hp < h.maxHp * .48 && h.inventory.herbs > 0 && activeQuest(h)?.kind !== 'herbs') {
    h.inventory.herbs--; h.hp = Math.min(h.maxHp, h.hp + 9); h.lastAction = 'heal'; log(s, 'Герой прикладывает лунную траву к ране. Знание леса помогает выжить.', 'heal'); return s;
  }
  if(materialOfferTurn(s,s.people[h.lineage],context(s,'material-delivery')))return s;
  if(!holdPoisonRest(s)&&pairCampCare(s,context(s,'party-relations')))return s;
  const groupNeed=partyDemand(s);
  intentionTick(s,context(s,'intentions'));
  if(enabled(s,'repertoire')&&['craft','navigation','returnship'].includes(h.goal?.repertoire?.line)&&repertoireInterrupt(s,{...context(s,'repertoire'),planQuest:(world,q)=>planQuest(world,q,context(world,'quests'))},currentQuest(h,s)))return s;
  if(balanceIntentions(s,{...context(s,'intention-balance'),planQuest:(world,q)=>planQuest(world,q,context(world,'quests'))}))return s;
  if(!h.goal?.intention&&respondAid(s,context(s,'personal-aid')))return s;
  if(h.goal?.kind==='leisure'&&h.goal.signals!==undefined&&h.goal.signals!==quietSignals(s))h.goal=null;
  const urgent = groupNeed==='rest'||h.hp < h.maxHp * (.35 + (1 - h.personality.courage) * .28) || h.energy < 23;
  if(!urgent&&h.hunger<=70)navigationToolPlan(s,context(s,'navigation-tools'));
  if(!urgent)actorMaterialDeliveryPlan(s,context(s,'material-delivery'));
  if(!h.goal||h.goal.kind==='provision')collectionPlan(s,context(s,'collections'),{urgentOnly:true});
  if(!urgent&&h.hunger<=75&&!h.goal?.intention)hearCaptivePlan(s,context(s,'dungeon-rescue'));
  if (!h.goal || groupNeed==='food'&&!['provision','eat','forage','brothEat','campPitch'].includes(h.goal.kind) || urgent && !['rest','campPitch', 'provision','eat','forage','brothEat'].includes(h.goal.kind) || enabled(s, 'body') && h.hunger > 75 && !h.goal.collectionEmergency&&!['rest','campPitch', 'provision','eat','forage','brothEat'].includes(h.goal.kind) || h.goal.quest && activeQuest(h) && questReady(s, activeQuest(h)) && !['rest', 'turnin', 'provision','eat','forage','brothEat'].includes(h.goal.kind)) plan(s);
  if(h.goal&&h.goal.area!==h.area&&(h.goal.kind!=='rest'||h.atlas)&&!knownRoute(s,h.area,h.goal.area).length){
    const former=h.goal;explorePlan(s,true);
    log(s,`Путь к «${s.areas[former.area]?.name||'прежнему делу'}» проходит через место недавнего отступления. ${h.intent}.`,'plan');
  }
  if(!navigationReturnTarget(s,context(s,'navigation-memory')))return s;
  if(navigationHoldKnownBlocker(s,context(s,'navigation-memory')))return s;
  if(!rescueTarget(s,{log,failQuest})||!intentionTarget(s)||!lodgingTarget(s)||!aidTarget(s)||!serviceTarget(s,context(s,'work-orders'))||!propertyAidTarget(s,context(s,'property-aid'))||!propertyGiftTarget(s,context(s,'property-gifts'))||!propertyContractTarget(s,context(s,'property-contracts'))||!propertyTarget(s,context(s,'property')))return s;
  if(!itemRepairTarget(s,context(s,'item-wear'))||!refitTarget(s)||!workshopWorkTarget(s,{...context(s,'workshop-interiors'),workspaceAccess:world=>workspaceAccess(world,context(world,'property'))}))return s;
  if(poisonCareTick(s,context(s,'poison-care')))return s;
  if(clothingPriority(s))return s;
  if(!urgent&&packPetCare(s,context(s,'pack-pets')))return s;
  if(!urgent)petRetrievalPlan(s,context(s,'pet-passage'));
  if(petPassagePlan(s,context(s,'pet-passage')))return s;
  petBoardingTarget(s);
  if(!urgent)petTransferPlan(s,context(s,'pet-transfer'));
  if(!urgent)packPetPlan(s,context(s,'pack-pets'));
  if(!urgent)clothingPlan(s,context(s,'practical-clothing'));
  if(changeSpareOutfit(s,context(s,'spare-outfit')))return s;
  preparePlan(s,context(s,'preparation'));
  const g = h.goal;
  if (!g) return s;
  resumeFordTaskView(s);
  if(!collectionTarget(s))return s;
  if(!landmarkTarget(s))return s;
  const a = s.areas[h.area];
  if (g.kind === 'hunt' && g.area === h.area) {
    const enemy = a.objects.find(o => o.id === g.object);
    if (!enemy?.alive) { h.goal = null; return s; } g.x = enemy.x;
  }
  let target = g.x, next = null;
  if (h.area !== g.area) {
    const original=knownRoute(s,h.area,g.area),path=petPassagePath(s,g,fordDetour(s,h,g,g.area,original),id=>areaAvoided(s,id));next=path[1];if(!next){h.goal=null;return s;}
    target = Number(next.slice(1)) > Number(h.area.slice(1)) ? 100 : 0;
    const passage=interiorPassage(s,h.area,next);if(passage){target=passage.x;if(!passage.allowed){if(['mechanism','lift'].includes(passage.kind)){if(passage.kind==='lift'?blockedLiftPlan(s,next,context(s,'mechanisms')):teamLeverPlan(s,next,context(s,'mechanisms'))||blockedGratePlan(s,next,context(s,'mechanisms')))return s;if(physicalDistance(a,h.x,target)<=1){h.goal=null;return s;}}else{h.goal=null;h.tavernAfter=s.tick+240;log(s,'Дверь закрыта. Он возвращается к другим делам.','plan');return s;}}}
  }
  // Threats interact only on the single movement axis.
  const direction = Math.sign(target - h.x);
  const threat = a.objects.find(o => o.kind === 'enemy' && o.alive && !o.resolved && !rescueGuardPass(s,o,h.lineage,target) && Math.abs(o.x - h.x)*areaScale(s.areas[h.area]) <= 9 && (o.x - h.x) * direction >= -areaOffset(a,1));
  if (threat && g.kind !== 'rest') {
    if(rescueGuardContact(s,threat,context(s,'dungeon-rescue')))return s;
    if(storyCombatChoice(s,threat,context(s,'stories'))){observeRejected(s,a);return s;}
    if (enabled(s, 'encounters') && tryParley(s, threat, context(s, 'encounters'))) return s;
    const estimated = expectedLoss(s,threat);
    const learnedCaution=bestiaryCaution(s,threat);
    if ((estimated > h.hp * (.8 + h.personality.courage * .5) && g.kind !== 'hunt') || fearResponse(s,threat)||learnedCaution?.avoid) {
      storyThreatAvoided(s,threat,context(s,'stories'));
      h.memory.avoided[a.id] = s.tick + 70;
      if(estimated>h.hp*(.8+h.personality.courage*.5))rememberRejected(s,threat);
      pauseDelve(s,threat,'refused');
      const refuge = closest(s, area => !area.temporaryCamp && (isTown(area) || area.type === 'camp'));
      if(refuge){goal(s, 'rest', refuge.id, 68, 'Отойти от опасного противника', learnedCaution?.avoid?learnedCaution.reason:`${threat.name} слишком силён для нынешнего снаряжения.`);
      log(s, learnedCaution?.avoid?learnedCaution.reason:`${h.name} оценивает ${threat.name} и решает не рисковать. Нужно лучшее снаряжение.`, 'flee'); return s;}
      // With no known escape the real opponent still owns its ordinary fight.
    }
    h.combat = threat.id; h.lastAction = 'attack'; h.action = 'БОЙ'; h.intent = `Сражаться: ${threat.name}`; h.reason = 'Противник преградил путь. Герой готовится защищаться.';
    log(s, `${threat.name} преграждает дорогу. Начинается бой.`, 'combat'); return s;
  }
  if (physicalDistance(a,h.x,target) > 1) { if(navigationGate(s,target,context(s,'navigation-tools')))return s;move(s, target); return s; }
  if (next) { const from=h.area,passage=interiorPassage(s,from,next),arrivalX=passage?.arrival??(target===100?5:95);if(!passage&&heroFordGate(s,next,arrivalX,context(s,'fords')))return s;if(!passage&&beginTransit(s,next,arrivalX,context(s,'travel')))return s;h.x=arrivalX;enter(s,next);resumeFordTaskView(s);campCrossed(s,from,next,context(s,'fieldcamp'));h.lastAction='walk';return s; }
  if(g.kind==='routeWait'){h.lastAction='idle';if(s.tick>=g.until)h.goal=null;return s;}
  if (g.kind === 'rest') {
    restoreCampRestView(s);
    if(lodgingRest(s,context(s,'lodging'),holdPoisonRest(s)))return s;
    if(!holdPoisonRest(s)&&(campAffairTalk(s,context(s,'companion-affairs'))||campLesson(s,context(s,'camp-lesson'))||pairDrill(s,context(s,'party-combinations'))||campConversation(s,context(s,'camp-life'))||pairCampWatch(s,context(s,'party-relations'))||smokeCamp(s,context(s,'smoking'))||sketchCamp(s,context(s,'sketching'))||cookingCamp(s,context(s,'hearth-food'))))return s;
    const amount = restAmount(s,a);
    h.hp = Math.min(h.maxHp, h.hp + amount); h.energy = Math.min(100, h.energy + smokeRestEnergy(s,12)); h.lastAction = 'rest';
    traitsRest(s, context(s, 'body'));
    magicRest(s);
    partyRest(s);
    if (!holdPoisonRest(s)&&partyRestReady(s)&&h.hp === h.maxHp && h.energy >= 95&&(!enabled(s,'magic')||h.magic.mana>=(g.preparation?.mana||0))) { log(s, 'Силы восстановлены. Можно снова вернуться к своим планам.', 'rest'); h.goal = null;leaveCamp(s,context(s,'fieldcamp')); }
    else h.speech = isTown(a) ? actualService(s,a,'clinic').available?'Лекарь помогает путникам. Здесь можно перевести дух.':'Здесь можно отдохнуть самому; лекарь сейчас не принимает.' : 'Огонь согревает. Обещания подождут до утра.';
  } else if (g.kind === 'campPitch') pitchCamp(s,context(s,'fieldcamp'));
  else if(g.kind==='campContinue')campContinue(s,context(s,'fieldcamp'));
  else if(g.kind==='collectionTrade')collectionAction(s,context(s,'collections'));
  else if(g.kind==='landmarkStudy')landmarkStudy(s,context(s,'landmarks'));
  else if (g.kind === 'talk') acceptWork(s);
  else if (g.kind === 'provision') provisions(s, context(s, 'body'));
  else if (g.kind === 'eat') eat(s,context(s,'supply'));
  else if (g.kind === 'brothCook') brothCookAction(s,context(s,'hearth-food'));
  else if (g.kind === 'brothEat') brothEatAction(s,context(s,'hearth-food'));
  else if (g.kind === 'brothLearn') brothLesson(s,context(s,'hearth-food'));
  else if (g.kind === 'forage') forageTick(s,context(s,'supply'));
  else if (g.kind === 'assist') assistanceAction(s,context(s,'intentions'));
  else if (g.kind === 'work') workTick(s,context(s,'work'));
  else if(g.kind==='propertyAid')propertyAidAction(s,context(s,'property-aid'));
  else if(g.kind==='propertyGift')propertyGiftAction(s,context(s,'property-gifts'));
  else if(g.kind==='propertyBuy')buyProperty(s,context(s,'property'));
  else if(g.kind==='propertyContract')propertyContractAction(s,context(s,'property-contracts'));
  else if(g.kind==='propertyRepair')repairProperty(s,context(s,'property'));
  else if(g.kind==='craftStudy')craftStudyAction(s,{...context(s,'craft-practice'),craftBench:world=>workspaceAccess(world,context(world,'property'))});
  else if(['petBoard','petRetrieve','petRecover','petCall'].includes(g.kind))petBoardingAction(s,context(s,'pet-passage'));
  else if(g.kind==='petTransfer')petTransferAction(s,context(s,'pet-transfer'));
  else if(['petPackFit','petPackLoad','petPackUnload'].includes(g.kind))packPetAction(s,context(s,'pack-pets'));
  else if(['clothingBuy','clothingDress','clothingSell'].includes(g.kind))clothingAction(s,context(s,'practical-clothing'));
  else if(g.kind==='navReturn')finishNavigationReturn(s,context(s,'navigation-memory'));
  else if(g.kind.startsWith('rope'))navigationAction(s,context(s,'navigation-tools'));
  else if(['forgeSupply','forgeWork','forgeLearn','forgeBuy'].includes(g.kind))forgeAction(s,{...context(s,'forging'),workspaceAccess:world=>workspaceAccess(world,context(world,'property'))});
  else if(['refitMeet','refitMaterial','refitWork'].includes(g.kind))refitAction(s,context(s,'knife-refit'));
  else if(['itemRepairMeet','itemRepairMaterial','itemRepairWork','itemGearSwap'].includes(g.kind))itemRepairAction(s,context(s,'item-wear'));
  else if(['bodyMaterial','bodyMaterialSale'].includes(g.kind))biomaterialAction(s,context(s,'animal-materials'));
  else if(g.kind==='materialWait')materialClientAction(s);
  else if(['materialCollect','materialReturn'].includes(g.kind))workMaterialDelivery(s,s.people[h.lineage],context(s,'material-delivery'));
  else if(['toolInspect','toolLearn','toolFit','toolSupply','toolInstall'].includes(g.kind))toolAction(s,context(s,'workshop-tools'));
  else if(g.kind==='principleReflect')reflectPrinciple(s,context(s,'principles'));
  else if(g.kind==='rescueHear')hearCaptive(s,context(s,'dungeon-rescue'));
  else if(['rescueApproach','rescueFree','rescueEscort'].includes(g.kind))rescueAction(s,context(s,'dungeon-rescue'));
  else if(['verdictPetition','verdictReview'].includes(g.kind))verdictReviewAction(s,context(s,'verdict-review'));
  else if(['verdictRecord','verdictWitness'].includes(g.kind))verdictInquiryAction(s,context(s,'verdict-knowledge'));
  else if(g.kind==='serviceAccept')acceptService(s,context(s,'work-orders'));
  else if(g.kind==='workshopTalk')workshopDisputeAction(s,context(s,'workshop-dispute'));
  else if(g.kind==='serviceSupply')buyServiceTool(s,s.workOrders[g.service],context(s,'work-materials'));
  else if(g.kind==='serviceDelay')extendService(s,context(s,'work-orders'));
  else if(g.kind==='aidPerson')performAid(s,context(s,'personal-aid'));
  else if(['tavernVisit','tavernLeave'].includes(g.kind))tavernAction(s,context(s,'interiors'));
  else if(g.kind==='hallWorkVisit')visitForWork(s,context(s,'hall-activities'));
  else if(g.kind==='roomBook')bookRoom(s,context(s,'lodging'));
  else if (g.kind === 'factionDuty') factionDuty(s,context(s,'faction-paths'));
  else if (g.kind === 'caravanWait') {h.lastAction='wait';h.goal=null;}
  else if (g.kind === 'caravanRaid') caravanRaid(s,context(s,'caravans'));
  else if (g.kind === 'leisure') leisureTick(s,context(s,'work'));
  else if (g.kind === 'weatherWait') weatherWait(s,context(s,'weather'));
  else if (g.kind === 'govern') governTick(s,context(s,'politics'));
  else if (g.kind === 'settle') settleLife(s,context(s,'life'));
  else if(g.kind==='shipRecover')shipRecoveryAction(s,context(s,'ship-recovery'));
  else if(['homeAgree','homeFit','homeStore','homeMaterials'].includes(g.kind))homeAction(s,context(s,'homes'));
  else if (g.kind === 'storyAction') storyAction(s,g.story,context(s,'stories'));
  else if (g.kind === 'moneyCache') moneyCacheAction(s,context(s,'finances'));
  else if (g.kind === 'routeMap') routeMapAction(s,context(s,'route-maps'));
  else if (g.kind === 'mapCopy') mapCopyAction(s,s.people[h.lineage],g,context(s,'route-maps'));
  else if (g.kind === 'studyCreature') studyBestiaryAction(s,context(s,'bestiary'));
  else if (g.kind === 'mechanism') mechanismAction(s,context(s,'mechanisms'));
  else if (g.kind === 'mechanismHold') leverHoldAction(s,context(s,'mechanisms'));
  else if (g.kind === 'liftWork') liftAction(s,context(s,'mechanisms'));
  else if (g.kind === 'dogLesson') dogLessonAction(s,context(s,'pet-training'));
  else if (g.kind === 'dogSearch') dogSearchAction(s,context(s,'pet-training'));
  else if (g.kind === 'dogFeed') dogFeedAction(s,context(s,'pet-training'));
  else if (['fieldCraftSupply','fieldCraftStudy','fieldCraftService'].includes(g.kind)) fieldCraftAction(s,s.people[h.lineage],g,context(s,'field-craft'));
  else if (['creditAsk','creditWait','creditDecide','creditWork'].includes(g.kind)) heroCreditAction(s,context(s,'provision-credit'));
  else if (['merchantBuy','merchantSell'].includes(g.kind)) heroMerchantAction(s,context(s,'merchant-trips'));
  else if (g.kind === 'questAction') questAction(s,h.quests.find(q=>q.id===g.quest),context(s,'quests'));
  else if (g.kind === 'encounter') { const object = a.objects.find(o => o.id === g.object); if (object) encounter(s, object, context(s, 'encounters')); else h.goal = null; }
  else if (g.kind === 'turnin') completeQuest(s, h.quests.find(q => q.id === g.quest));
  else if (g.kind === 'trade') trade(s);
  else if (g.kind === 'collect') { const object = a.objects.find(o => o.id === g.object); if (object) collect(s, object); else h.goal = null; }
  else if (g.kind === 'expand') expand(s);
  else if (g.kind === 'hunt') { h.combat = g.object; fight(s, a.objects.find(o => o.id === g.object)); }
  else {
    const item = a.objects.find(o => (['loot','relic'].includes(o.kind)||o.kind==='heirloom'&&cacheCollectible(s,o)||o.kind==='supplyCache'&&enabled(s,'supply')&&canLoadPackCargo(s,o)) && !o.taken || o.kind === 'herb' && o.count > 0&&stackRoom(s,h.lineage,'herbs',1)>0&&scentPlantKnown(s,h,a,o));
    if (item) goal(s, 'collect', a.id, item.x, `Подобрать: ${item.name}`, 'Полезные находки пригодятся в следующем приключении.', { object: item.id });
    else { h.goal = null; log(s, `${a.name} изучено. Герой запоминает путь и смотрит дальше.`, 'discover'); }
  }
  return s;
}
export function serialize(s) { return JSON.stringify(observationPayload(s)); }
export function restore(text) {
  const s=validateSave(JSON.parse(text));
  s.actorStates[s.hero.lineage]=s.hero;
  s.hero.actorJournal=s.journal;
  restoreActorBindings(s);
  return s;
}

import {walkingEnergy,legacyArmorDefense,hasArmor} from './modules/armor.js';
