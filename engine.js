import {initializeCurrencyOffice} from './modules/currency-create.js';import {currencyHeroPlan,currencyHeroAction} from './modules/currency-actions.js';
import {settleCastleDeaths} from './modules/castle-death.js';
import {castleHeroPlan,castleHeroAction} from './modules/castle-actions.js';
import {initializeRoyalHouse} from './modules/castle-create.js';
import {serviceRoleHeroPlan,serviceRoleHeroAction} from './modules/service-masks.js';import {serviceSignAction} from './modules/service-sign.js';
import {cargoInquiryHeroPlan,cargoInquiryHeroAction} from './modules/cargo-inquiries.js';
import {hobbyHeroPlan,hobbyHeroAction} from './modules/hobby-supply.js';
import {farmingHeroPlan,farmingHeroAction} from './modules/farming.js';
import {birthFarmKit,farmingTick} from './modules/farming-state.js';
import {titleHeroPlan,titleHeroAction} from './modules/title-enforcement.js';
import {diplomacyWorldTick} from './modules/diplomacy-world.js';
import {probateHeroPlan,probateHeroAction} from './modules/will-probate.js';
import {willHeroPlan,willHeroAction} from './modules/wills.js';
import {publicRepairHeroPlan,publicRepairHeroAction} from './modules/public-repairs.js';
import {diplomacyHeroPlan,diplomacyHeroAction} from './modules/authority-diplomacy.js';
import {initializeAuthorities} from './modules/authority-foundation.js';
import {decoyPlan,decoyAction,placeDecoy} from './modules/decoys.js';
import {decoyWalkQuote} from './modules/decoy-state.js';
import {decoyWorldTick} from './modules/decoy-world.js';
import {stealthLessonPlan,stealthLessonAction} from './modules/stealth-lessons.js';
import {stealthWalkQuote} from './modules/stealth-state.js';
import {commitStealthStep,leaveStealthArea} from './modules/stealth.js';
import {causewayPlan,causewayAction} from './modules/causeway-actions.js';
import {causewayWorldTick} from './modules/causeway-world.js';
import {initializeWoodBarrier} from './modules/mechanisms.js';
import {materialWorldTick} from './modules/local-material-world.js';
import {recollectionTick} from './modules/recollection-state.js';
import {socketPlan,socketAction} from './modules/socket-service.js';
import {estateClaimPlan,estateClaimAction} from './modules/estate-claims.js';
import {harvestFailureTick} from './modules/harvest-failure.js';
import {installMigrationEmployment} from './modules/migration-service.js';
import {earthquakesTick} from './modules/earthquakes.js';
import {quakeBlocked,knownQuakeBlocked} from './modules/quake-state.js';
import {coveredRetreat,retreatDrill,retreatTick} from './modules/cover-retreat.js';
import {drivenWagon,wagonReady,wagonMoved,wagonLoad} from './modules/wagon-state.js';
import {createWagon} from './modules/wagon-source.js';
import {syncWagons,wagonTurn,passengerTurn} from './modules/wagon-actions.js';
import {driveAction} from './modules/mechanic-drive.js';
import {wardTick,cancelWard} from './modules/measured-ward.js';
import {recordCrossingTrace} from './modules/edge-traces.js';
import {trackingPlan,trackingAction,confirmTracking} from './modules/tracking.js';
import {admitAction,dependency,preparationAccepted,preparationProgress} from './modules/action-admission.js';
import {remainsByArea} from './modules/remains-cycle-state.js';
import {predatorCarrionTurn} from './modules/predator-carrion.js';
import {burialPlan,burialAction,settleBurialWork} from './modules/burial-work.js';
import {musicCamp,musicTick} from './modules/camp-music.js';
import {birthMusic} from './modules/camp-music-state.js';
import {PLANNER_ORDER} from './modules/goal-handlers.js';
import {chooseQuest,questChoiceAvailable,CHOICE_POLICY} from './modules/intention-choice.js';
import {actionKey,deferredMethod,deferMethod,executionResult,reconsiderMethods,parkMethod} from './modules/action-selection.js';
import {goalReadiness,methodRevision,actionProgress} from './modules/goal-readiness.js';
import {routeOpportunityPlan,routeOpportunityAction} from './modules/route-opportunities.js';
import {ferryRouteBlocked} from './modules/ferry-refusals.js';
import {remainsLocation} from './remains-position.js';import {focusOwnRemains} from './remains-observation.js';
import {observeBurialPlaces,putDownRemains,settleRemainsCarriers} from './modules/remains-carry.js';
import {librarySecurityPlan,librarySecurityAction} from './modules/library-security.js';
import {libraryPlan,libraryAction} from './modules/libraries.js';
import {peopleCarryTurn,endPeopleCarry} from './modules/people-carry.js';
import {buildingControlTick} from './modules/building-control.js';
import {ferryWorldTick} from './modules/ferry-actions.js';
import {ferryOn} from './modules/ferry-state.js';
import {createPortFerry} from './modules/ferry-source.js';
import {createStableHorse} from './modules/horse-source.js';
import {horseWorldTick,horseTurn,syncHorse,detachHorse} from './modules/horse-actions.js';
import {groupHorse,horseMotion,ridingOn} from './modules/horse-state.js';
import {localRoadShop,resumeRoadContact,suspendRoadFight} from './modules/road-contacts.js';
import {roadCampNeed,manageHeroRoadStop} from './modules/road-stops.js';
import {pricedNavigation,knownRoadWeight} from './modules/known-route-price.js';
import {initialWaterPreference} from './modules/metric-route-state.js';
import {createGeographyFrame} from './modules/geography-frame.js';
import {createPlaceRule} from './modules/place-rule-state.js';
import {observePlaceRule,knownLawBurden} from './modules/place-rules.js';
import {hostileLifeTick} from './modules/hostile-life.js';
import {rivalryTurn,rivalryTick} from './modules/craft-rivalry.js';
import {bindEnemyPerson} from './modules/enemy-person-create.js';
import {syncEnemyPeople} from './modules/enemy-person-state.js';
import {considerSurrender,killEnemyPerson} from './modules/enemy-mercy.js';
import {prostheticTurn} from './modules/prosthetics.js';
import {adaptLimbPlan} from './modules/limb-plan.js';
import {weaponBody} from './modules/limb-state.js';
import {patientPlan,patientClinicAction,patientsTick,syncPatient} from './modules/party-injuries.js';
import {patientJourney} from './modules/patient-state.js';
import {woundCareTurn} from './modules/wound-care.js';
import {woundCombatChoice} from './modules/wound-combat.js';
import {holdWoundRest} from './modules/wound-care-state.js';
import {woundsTick} from './modules/wound-world.js';
import {woundActivity,woundActor,woundStride} from './modules/wound-state.js';
import {recordPersonRemains} from './modules/remains.js';
import {positionPlan,positionAction,observePositions,finishPositionTurn} from './modules/position-actions.js';
import {syncCoverPosition} from './modules/position-state.js';
import {guardianPlan,guardianAction} from './modules/guardian-actions.js';
import {observeGuardians} from './modules/guardian-knowledge.js';
import {knownShortcutBlocked,isShortcut} from './modules/shortcut-state.js';
import {observeDelveLayout,recordLayoutCollection} from './modules/delve-layout.js';
import {layoutAction,layoutOn} from './modules/delve-layout-plan.js';
import {findWaystone} from './modules/waystones.js';
import {waystonePlan,waystoneAction} from './modules/waystone-actions.js';
import {pactTalkPlan,pactTalkAction} from './modules/branch-pacts.js';
import {feastTick} from './modules/feasts.js';
import {feastPlan,feastAction} from './modules/feast-actions.js';
import {buildingRuinsTick} from './modules/building-ruins.js';
import {textValuesOn,textNeed} from './modules/text-values.js';
import {askSequenceWitness} from './modules/mechanism-sequences.js';
import {literacyPlan,literacyAction} from './modules/literacy-actions.js';
import {birthLiteracy} from './modules/literacy-state.js';
import {textPlan,textAction} from './modules/text-actions.js';
import {homeBuildingPlan,homeBuildingAction} from './modules/home-building.js';
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
import {bodyRemains,recordRemains,recordHeroRemains} from './modules/remains.js';
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
import {textRecoveryPlan,textRecoveryAction} from './modules/text-recovery.js';
import {installPaperFireHandler} from './modules/paper-fire-events.js';
import {damagePaperFromSource} from './modules/paper-fire.js';
import {assetDefensePlan,hireStoreGuard,fortifyStore,evacuateStore} from './modules/asset-defense.js';
import {patronagePlan,acceptPatronage,patronStock} from './modules/patronage.js';
import {productionPartnerPlan,reviewProduction} from './modules/production-partnership.js';
import {productionFinancePlan,fundProduction,collectProduction} from './modules/production-finance.js';
import {moneyCachePlan,moneyCacheAction} from './modules/money-caches.js';
import {openInheritance} from './modules/inheritance.js';
import {observeRouteMap,routeMapPlan,routeMapAction} from './modules/route-maps.js';
import {mapCopyPlan,mapCopyAction} from './modules/map-copies.js';
import {recordLastingInjury} from './modules/injury-events.js';
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
import {performBrace} from './modules/brace.js';
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
import {initializeMigrations,migrationArea,migrationsTick,migrationContactTick} from './modules/migrations.js';
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
installMigrationEmployment((s,a)=>['harvest','medicine','repair','records','market'].some(job=>actualService(s,a,'employment',{job}).available));
installPaperFireHandler((s,a,source)=>damagePaperFromSource(s,a,source,{log}));
function context(s, stream) { return { methodRevision, recoverHeirloom, dropRemains:(world,p,reason)=>putDownRemains(world,p,context(world,'remains-carry'),reason), stopPeopleCarry:(world,reason)=>endPeopleCarry(world,context(world,'people-carry'),reason), wantsRoadShop:world=>{const h=world.hero;return h.inventory.relics>0||enabled(world,'equipment')&&h.bag.length>7||(enabled(world,'finances')?Boolean(nextPurchase(world,context(world,'finances'),h.area)):h.weapon<3&&h.gold>=equipmentPrice(world,'weapon')||!hasArmor(h)&&h.gold>=22||!h.inventory.potions&&h.gold>=7);},planFieldCamp,meetPerson, spareNeedsMoney:(world,ctx)=>{const b=moneyBudget(world,ctx);return b.targetNeed>0||world.hero.gold<b.reserve||spareNeedsMoney(world);}, fordAvoided:(world,id)=>areaAvoided(world,id), random: () => moduleRandom(s, stream), hallConversation, receiveItem, maySpend, recoverRoomParty:world=>{magicRest(world);partyRest(world);}, log, gainXp, die, closest, goal, defeatEnemy,addArea,connect,enter,route,knownRoute,observeProperty,mayRepairProperty:(world,o,person)=>mayRepairProperty(world,o,person)||serviceRepairAllowed(world,o,person),repairFunding:fundServiceRepair,hasRepairTool:hasServiceTool,repairMaterials,workshopRepaired:(world,a,o,proof)=>{workshopRepaired(world,a,o,proof,{log});finishServiceRepair(world,a,o,proof,context(world,'work-orders'));},propertyLifeEnded:world=>propertyLifeEnded(world,{log}),spawnEnemy,npcVictory,releaseParty,teachSpell,enemySpawned:registerReinforcement }; }
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
  if(metadata.boatDeck){Object.assign(area,{boatDeck:metadata.boatDeck,expanded:true,length:50,forage:{stock:0,max:0,x:18,lastGrowth:s.tick,kind:'Палуба'},continent:metadata.continent,realm:metadata.realm,era:metadata.era,culture:metadata.culture,danger:0});s.areas[id]=area;registerSpatialArea(s,area);return id;}
  if(metadata.routeSite){Object.assign(area,{routeSite:metadata.routeSite,expanded:true,length:50,forage:{stock:0,max:0,x:18,lastGrowth:s.tick,kind:'Обочина дороги'},continent:metadata.continent,realm:metadata.realm,era:metadata.era,culture:metadata.culture,danger:0});s.areas[id]=area;registerSpatialArea(s,area);return id;}
  if(enabled(s,'long-roads')&&type==='road'&&depth>=2&&depth%4===2){area.length=260;area.roadProfile='long-tract';}
  const layoutShell=type==='dungeon'&&metadata.layoutRoom===true;
  if(layoutShell)area.dungeon={root:metadata.layoutRoot||id,floor:metadata.layoutFloor||1,cleared:false,layoutShell:{version:1,created:s.tick,claimed:false}};
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
  if(!layoutShell&&['cave','dungeon','sea','island','desert','mountain','dream','clockwork'].includes(type)){
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
  peopleArea(s,area);if(s.hero){createStableHorse(s,area);createWagon(s,area);}
  createPlaceRule(s,area);initializeDescent(s,area);migrationArea(area);initializeFacades(s);registerSpatialArea(s,area);return id;
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
  initializeLineage(s,h);birthMusic(s,s.people[h.lineage],h);initializeMind(s,h);initializeMagic(s,h);initialWaterPreference(s,h);
  initializeWeather(s,h);initializePreparation(h);initializeCommitments(h);initializeInnerLife(s,h);initializeFinances(h);initializeMigrations(s);
  initializeWork(s,h);
  initializeWorkMaterials(h);
  initializeSocial(s,h);initializeSociety(s,h);
  initializeDiplomacy(s);initializeFactionPaths(s,h);
  initializeProperty(h,s);initializePropertyContracts(s,h);initializeCampLife(h);initializeSketching(h,true);initializeSmoking(s,h,true);initializeLife(s,h);
  initializeStories(s,h);
  initializeSupply(s,h);
  rememberPracticalRole(s,s.people[h.lineage],h);

  initializeFoodKit(s,s.people[h.lineage],h,{newborn:true});birthFarmKit(s,s.people[h.lineage],h,{newborn:true});
  initializeActorAtlas(s,h);birthLiteracy(s,s.people[h.lineage],h);
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
  createGeographyFrame(s,{crossroads:road,capital:town,hollow:forest,ruins,camp},{addArea,connect,openSettlement});
  createStableHorse(s);createWagon(s);createPortFerry(s,{addArea,connect});
  s.merchant = { name: 'Сава', area: town, destination: null, arrival: 0, nextMove: 75, stock: 3,serviceStock:{version:1,gear:2,medicine:1} };
  initializeAuthorities(s);initializeRoyalHouse(s);initializeCurrencyOffice(s);
  s.hero = createHero(s);initializeObservation(s);prepareBirthplace(s,s.hero,{openSettlement,addArea,connect});
  enter(s, s.hero.area);
  log(s, `${s.hero.name} начинает путь: ${s.areas[s.hero.area].name}, ${s.continents.c0.name}.`, 'birth');
  initializeFacades(s);initializeWoodBarrier(s);syncObservedPerson(s);syncActiveActor(s);bindObservedJournal(s);initializeSpatial(s);
  return s;
}
function enter(s, id) {
  leaveStealthArea(s,s.hero.lineage);
  cancelWard(s,'Переход прекращает подготовку.');
  const a = s.areas[id], h = s.hero;
  if(!h.carriedBy)recordCrossingTrace(s,{kind:'person',id:h.lineage},h.area,id);
  openSettlement(s,a,context(s,'districts'));
  initializeAreaFacades(s,a);
  initializeInteriors(s);
  initializeLodging(s);
  const firstVisit=!visitedArea(s,a);h.area = id;syncCoverPosition(s);petPassageEntered(s);recordAreaVisit(s,a);originProperty(s,a,context(s,'property'));observeRejected(s,a);observeProperty(s,a,context(s,'property'));
  observePlaceRule(s,context(s,'place-rules'));
  if(a.temporaryCamp||a.routeSite||a.boatDeck)return;
  if (firstVisit) { gainXp(s, 3 + (hasHabit(h, 'diary') ? 2 : 0)); log(s, `Открыто место: ${a.name}.`, 'discover'); }
  if (!h.memory.places.includes(id)) {const bonus=enchantedDiscovery(s,a,context(s,'enchantments'));if(bonus)gainXp(s,bonus);h.memory.places.push(id);}
  for (const link of a.links) if(!s.areas[link]?.temporaryCamp)revealArea(s,link);
  if (isTown(a) && s.merchant.area&&!enabled(s,'service-access')) h.memory.merchant = s.merchant.area;
  for(const id of a.population||[])if(s.people[id]?.alive&&s.people[id].status==='resident')meetPerson(s,id,context(s,'relationships'));
  for(const id of a.population||[])meetLegacy(s,id,context(s,'life'));
}
const navigationCache=new WeakMap();
function navigation(s,from,person=null){
  const revision=`${s.graphRevision||0}:${s.nextArea}:${Object.keys(s.areas).length}:${enabled(s,'mechanisms')}`;
  let cache=navigationCache.get(s);
  if(!cache||cache.revision!==revision){cache={revision,trees:new Map()};navigationCache.set(s,cache);}
  if(!person&&cache.trees.has(from))return cache.trees.get(from);
  const queue=[from],parents={[from]:null},distances={[from]:0};
  for(let i=0;i<queue.length;i++)for(const id of s.areas[queue[i]]?.links||[])if(!(id in parents)&&!quakeBlocked(s,queue[i],id)&&!(person&&isShortcut(s,queue[i],id)?knownShortcutBlocked(s,person,queue[i],id):grateClosed(s,queue[i],id))&&!liftBlocked(s,queue[i],id)&&campLink(s,queue[i],id)&&(!s.areas[queue[i]]?.temporaryCamp||queue[i]===from)){parents[id]=queue[i];distances[id]=distances[queue[i]]+1;queue.push(id);}
  const tree={parents,distances};if(cache.trees.size>6)cache.trees.clear();if(!person)cache.trees.set(from,tree);return tree;
}
export function route(s,from,to,person=null){
  countMarket(s,'route');
  if(!s.areas[from]||!s.areas[to])return [];
  const {parents}=navigation(s,from,person);if(!(to in parents))return [];
  const path=[];for(let id=to;id!==null;id=parents[id])path.push(id);return path.reverse();
}
export function knownRoute(s,from,to){
  countMarket(s,'route');
  if(!s.hero.atlas||!s.areas[from]||!s.areas[to]||from!==to&&petRouteDeferred(s,to))return [];
  const blockedFords=new Set(fordBlocked(s,s.hero));
  if(from!==to&&!knownArea(s,to))return [];const membership=s.hero.atlas.known.length>3?routeMembership(s):null;
  const search=avoidLaw=>{
    const queue=[from],parents={[from]:null},prices={[from]:0},weighted=pricedNavigation(s),done=new Set();
    while(queue.length){if(weighted)queue.sort((a,b)=>prices[a]-prices[b]||a.localeCompare(b));const here=queue.shift();if(done.has(here))continue;done.add(here);for(const id of s.areas[here]?.links||[]){
      if(done.has(id)||knownQuakeBlocked(s.people[s.hero.lineage],here,id)||ferryRouteBlocked(s,here,id)||!weighted&&id in parents||avoidLaw&&id!==to&&knownLawBurden(s,id)||knownShortcutBlocked(s,s.people[s.hero.lineage],here,id)||knownLiftBlocked(s,s.people[s.hero.lineage],here,id)||knownGrateBlocked(s,s.people[s.hero.lineage],here,id)||blockedFords.has(fordKey(here,id))||!campLink(s,here,id)||s.areas[here]?.temporaryCamp&&here!==from||!(membership?membership.area(id):knownArea(s,id))||!(membership?membership.road(here,id):knownRoad(s,here,id))||areaAvoided(s,id))continue;
      const price=prices[here]+(weighted?knownRoadWeight(s,here,id,to):1);if(!Number.isFinite(price)||id in prices&&prices[id]<=price)continue;prices[id]=price;parents[id]=here;queue.push(id);
    }}
    if(!(to in parents))return [];const path=[];for(let id=to;id!==null;id=parents[id])path.push(id);return path.reverse();
  };
  const path=search(false);
  if(path.slice(1,-1).some(id=>knownLawBurden(s,id))){const alternate=search(true);if(alternate.length)return alternate;}
  return path;
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
function verifyTarget(s,id,run){const h=s.hero,g=h.goal;if(!g)return run();const before=actionProgress(s,g),ok=run();if(!ok&&(h.goal===g||!h.goal)&&before===actionProgress(s,g)&&goalReadiness(s,g,{knownRoute},{memory:false}).status!=='done'){const r={status:'blocked',reason:'Проверка '+id+' не подтверждает исполнимый шаг.',retryOn:'target-or-resources'};deferMethod(h,g,r,methodRevision(s,g),s.tick);h.goal=null;}return ok;}
function availableQuestStep(s,q){const h=s.hero,area=questReady(s,q)?q.source:q.target;if(!questChoiceAvailable(s,q)||!s.areas[area]||!knownRoute(s,h.area,area).length)return false;return !h.actionSelection?.deferred.some(e=>e.step.quest===q.id&&e.signature===methodRevision(s,e.step)&&goalReadiness(s,e.step,{knownRoute},{memory:false}).status==='blocked');}
function reconsiderKnownQuest(s){
 const h=s.hero,g=h.goal;if(!g||g.quest||g.commitment||g.intention||h.transit||h.combat||h.carriedBy||h.energy<23||h.hp<h.maxHp*(.35+(1-h.personality.courage)*.28)||partyDemand(s)||enabled(s,'body')&&h.hunger>75||holdWoundRest(s)||holdPoisonRest(s))return false;
 const selected=chooseQuest(s,h.quests.filter(q=>q.status==='active'),q=>questReady(s,q),{available:q=>availableQuestStep(s,q)});if(!selected||selected.urgency<60&&s.tick-(g.started??s.tick)<CHOICE_POLICY.minimumTicks)return false;
 if(['rest','campPitch','patientClinic'].includes(g.kind))return false;const before=actionProgress(s,g);parkMethod(h,g);h.goal=null;planQuest(s,selected.q,context(s,'quests'));return before!==actionProgress(s,g);
}
function plan(s) {
  const h = s.hero, a = s.areas[h.area], candidate=currentQuest(h,s), q=candidate&&availableQuestStep(s,candidate)?candidate:chooseQuest(s,h.quests.filter(q=>q.status==='active'),q=>questReady(s,q),{available:q=>availableQuestStep(s,q)})?.q||null;
  if(h.goal){const r=goalReadiness(s,h.goal,{knownRoute});if(r.status==='blocked')deferMethod(h,h.goal,r,methodRevision(s,h.goal),s.tick);else if(['ready','progressing'].includes(r.status))parkMethod(h,h.goal);}
  h.goal=null;let planningSpent=false,waiting=null;
  const offer=(id,run)=>{const order=PLANNER_ORDER.get(id),used=actionProgress(s,{kind:'planning',area:h.area});const result=run(),g=h.goal;planningSpent ||= used!==actionProgress(s,{kind:'planning',area:h.area});if(planningSpent)return true;if(g){const r=goalReadiness(s,g,{knownRoute});if(r.status==='waiting'){waiting ||= g;h.goal=null;return false;}if(g.kind==='localRecovery'&&waiting){h.goal=null;return false;}if(['ready','progressing'].includes(r.status)){g.selectionOrder=order;const old=h.actionSelection?.deferred.find(e=>e.key===actionKey(g)),paused=h.actionSelection?.paused?.find(e=>actionKey(e)===actionKey(g));if(old||paused){h.goal={...(old?.step||paused),x:g.x,selectionOrder:order};if(old)h.actionSelection.deferred=h.actionSelection.deferred.filter(e=>e!==old);if(paused)h.actionSelection.paused=h.actionSelection.paused.filter(e=>e!==paused);}return true;}if(r.status==='blocked')deferMethod(h,g,r,methodRevision(s,g),s.tick);h.goal=null;return false;}return false;};
  if(offer('currencyHeroPlan',()=>currencyHeroPlan(s,context(s,'finite-exchange'))))return planningSpent;
  if(offer('cookingPlan',()=>cookingPlan(s,context(s,'hearth-food'),{lesson:false})))return planningSpent;
  if(offer('cargoInquiryHeroPlan',()=>cargoInquiryHeroPlan(s,context(s,'cargo-cases'))))return planningSpent;
  if(offer('hobbyHeroPlan',()=>hobbyHeroPlan(s,context(s,'hobby-supply'))))return planningSpent;
  if(offer('farmingHeroPlan',()=>farmingHeroPlan(s,context(s,'farming'))))return planningSpent;
  if(offer('titleHeroPlan',()=>titleHeroPlan(s,context(s,'title-enforcement'))))return planningSpent;
  if(offer('probateHeroPlan',()=>probateHeroPlan(s,context(s,'testaments'))))return planningSpent;
  if(offer('willHeroPlan',()=>willHeroPlan(s,context(s,'testaments'))))return planningSpent;
  if(offer('publicRepairHeroPlan',()=>publicRepairHeroPlan(s,context(s,'public-repairs'))))return planningSpent;
  if(offer('diplomacyHeroPlan',()=>diplomacyHeroPlan(s,context(s,'authority-diplomacy'))))return planningSpent;
  if(offer('castleHeroPlan',()=>castleHeroPlan(s,context(s,'royal-libraries'))))return planningSpent;
  if(offer('serviceRoleHeroPlan',()=>serviceRoleHeroPlan(s,context(s,'service-masks'))))return planningSpent;
  if(offer('decoyPlan',()=>decoyPlan(s,context(s,'noise-decoys'))))return planningSpent;
  if(offer('stealthLessonPlan',()=>stealthLessonPlan(s,context(s,'stealth'))))return planningSpent;
  if(offer('textRecoveryPlan',()=>textRecoveryPlan(s,context(s,'paper-fire'))))return planningSpent;
  if(a.interior){if(a.interior.kind==='workshop'&&(offer('itemRepairPlan',()=>itemRepairPlan(s,context(s,'item-wear')))||offer('toolPlan',()=>toolPlan(s,context(s,'workshop-tools')))||offer('refitPlan',()=>refitPlan(s,context(s,'knife-refit')))||offer('forgePlan',()=>forgePlan(s,context(s,'forging')))))return planningSpent;if(offer('lodgingPlan',()=>lodgingPlan(s,context(s,'lodging'))))return planningSpent;if(a.interior.kind==='room'&&!q&&(offer('librarySecurityPlan',()=>librarySecurityPlan(s,context(s,'library-security')))||offer('libraryPlan',()=>libraryPlan(s,context(s,'libraries')))||offer('textPlan',()=>textPlan(s,context(s,'texts')))||offer('homePlan',()=>homePlan(s,context(s,'homes')))))return planningSpent;if(offer('tavernPlan',()=>tavernPlan(s,context(s,'interiors'))))return planningSpent;}
  if(a.temporaryCamp){leaveCamp(s,context(s,'fieldcamp'));return planningSpent;}
  if((partyDemand(s)==='food'||enabled(s,'body')&&h.hunger>75)&&offer('foodPlan',()=>foodPlan(s,context(s,'supply'))))return planningSpent;
  if(textValuesOn(s)&&textNeed(s,s.people[h.lineage])&&offer('literacyPlan',()=>literacyPlan(s,context(s,'text-values'),{urgentOnly:true})))return planningSpent;
  if (enabled(s, 'body') && offer('traitsPlan',()=>traitsPlan(s, context(s, 'body')))) return planningSpent;
  if (h.hp < h.maxHp * (.35 + (1 - h.personality.courage) * .28) || h.energy < 23||partyDemand(s)==='rest') {
    if(offer('lodgingPlan',()=>lodgingPlan(s,context(s,'lodging'))))return planningSpent;
    if(offer('planFieldCamp',()=>planFieldCamp(s,context(s,'fieldcamp'))))return planningSpent;
    const refuge = closest(s, a => !a.temporaryCamp && knownArea(s,a) && (isTown(a) || a.type === 'camp'||a.dungeon?.cleared)&&(!enabled(s,'supply')||serviceReachable(s,a,68,context(s,'supply'))));
    const rest = refuge?.objects.find(o => o.kind === 'rest');
    if(offer('builtin',()=>{goal(s, 'rest', refuge?.id||h.area, rest?.x??h.x, refuge?`Восстановиться: ${refuge.name}`:'Перевести дух на месте', h.hp < h.maxHp * .7 ? 'Раны важнее обещаний. Он ищет доступное место для восстановления.' : 'Усталость мешает сражаться и исследовать.');return true;}))return planningSpent;
    if(offer('builtin',()=>{goal(s,'localRecovery',h.area,h.x,'Перевести дух на месте','Дойти до выбранного отдыха пока нельзя. Он восстанавливает силы здесь, не получая еды из воздуха.');return true;}))return planningSpent;
  }
  if(offer('navigationToolPlan',()=>navigationToolPlan(s,context(s,'navigation-tools'))))return planningSpent;
  noticeMoneyPriority(s,context(s,'finances'));
  if(offer('hearCaptivePlan',()=>hearCaptivePlan(s,context(s,'dungeon-rescue'))))return planningSpent;
  if(isDungeonRescue(q)){if(offer('planQuest',()=>planQuest(s,q,context(s,'quests'))))return planningSpent;}
  if(h.delve&&offer('delvePlan',()=>delvePlan(s,delveContext(s))))return planningSpent;
  if(offer('heroCreditPlan',()=>heroCreditPlan(s,context(s,'provision-credit'))))return planningSpent;
  if(h.merchantTrip&&offer('heroMerchantPlan',()=>heroMerchantPlan(s,context(s,'merchant-trips'))))return planningSpent;
  if(h.caravanJob&&offer('caravanPlan',()=>caravanPlan(s,context(s,'caravans'))))return planningSpent;
  if(offer('weatherShelter',()=>weatherShelter(s,context(s,'weather'))))return planningSpent;
  if(offer('localNeedsPlan',()=>localNeedsPlan(s,context(s,'supply'))))return planningSpent;
  if(offer('dogSearchPlan',()=>dogSearchPlan(s,context(s,'pet-training'))))return planningSpent;
  if(!q&&offer('dogTrainingPlan',()=>dogTrainingPlan(s,context(s,'pet-training'))))return planningSpent;
  if(offer('assetDefensePlan',()=>assetDefensePlan(s,context(s,'asset-risk'))))return planningSpent;
  if(!q&&offer('patronagePlan',()=>patronagePlan(s,context(s,'patronage'))))return planningSpent;
  if(!q&&offer('productionPartnerPlan',()=>productionPartnerPlan(s,context(s,'production-finance'))))return planningSpent;
  if(!q&&offer('productionFinancePlan',()=>productionFinancePlan(s,context(s,'production-finance'))))return planningSpent;
  if(!q&&offer('estateClaimPlan',()=>estateClaimPlan(s,context(s,'estate-claims'))))return planningSpent;
  if(!q&&offer('moneyCachePlan',()=>moneyCachePlan(s,context(s,'finances'))))return planningSpent;
  if(!q&&offer('routeMapPlan',()=>routeMapPlan(s,context(s,'route-maps'))))return planningSpent;
  if(!q&&offer('mapCopyPlan',()=>mapCopyPlan(s,context(s,'route-maps'))))return planningSpent;
  if(offer('trackingPlan',()=>trackingPlan(s,context(s,'tracking'))))return planningSpent;
  if(!q&&offer('studyBestiaryPlan',()=>studyBestiaryPlan(s,context(s,'bestiary'))))return planningSpent;
  if(offer('biomaterialPlan',()=>biomaterialPlan(s,context(s,'animal-materials'))))return planningSpent;
  if(!q&&offer('burialPlan',()=>burialPlan(s,context(s,'remains-cycle'))))return planningSpent;
  if(offer('heroFieldCraftPlan',()=>heroFieldCraftPlan(s,context(s,'field-craft'),{study:false,urgent:Boolean(q?.deadline&&q.deadline-s.tick<16)})))return planningSpent;
  if(offer('itemRepairPlan',()=>itemRepairPlan(s,context(s,'item-wear'))))return planningSpent;
  if(!q&&offer('cookingPlan',()=>cookingPlan(s,context(s,'hearth-food'))))return planningSpent;
  if(!q&&offer('toolPlan',()=>toolPlan(s,context(s,'workshop-tools'))))return planningSpent;
  if(offer('reconsiderWorkLoss',()=>reconsiderWorkLoss(s,{...context(s,'work-loss'),questReady,planQuest:(world,quest)=>planQuest(world,quest,context(world,'quests'))},q)))return planningSpent;
  if(offer('factionPathPlan',()=>factionPathPlan(s,context(s,'faction-paths'))))return planningSpent;
  if(!q&&offer('lifePlan',()=>lifePlan(s,context(s,'life'))))return planningSpent;
  if(!q&&offer('politicalPlan',()=>politicalPlan(s,context(s,'politics'))))return planningSpent;
  if(!q&&offer('storyPlan',()=>storyPlan(s,context(s,'stories'))))return planningSpent;
  if(!q&&offer('civilianQuestPlan',()=>civilianQuestPlan(s,context(s,'quests'))))return planningSpent;
  if(offer('commitmentPlan',()=>commitmentPlan(s,q,Boolean(q&&questReady(s,q)),{...context(s,'commitments'),work:()=>planWork(s,context(s,'work'))})))return planningSpent;
  if(!q&&offer('collectionPlan',()=>collectionPlan(s,context(s,'collections'))))return planningSpent;
  if(!q&&offer('servicePlan',()=>servicePlan(s,context(s,'work-orders'))))return planningSpent;
  if(!q&&offer('workshopDisputePlan',()=>workshopDisputePlan(s,context(s,'workshop-dispute'))))return planningSpent;
  if(!q&&offer('principlePlan',()=>principlePlan(s,context(s,'principles'))))return planningSpent;
  if(!q&&offer('verdictInquiryPlan',()=>verdictInquiryPlan(s,context(s,'verdict-knowledge'))))return planningSpent;
  if(!q&&offer('verdictReviewPlan',()=>verdictReviewPlan(s,context(s,'verdict-review'))))return planningSpent;
  if(!q&&offer('craftStudyPlan',()=>craftStudyPlan(s,{...context(s,'craft-practice'),craftBench:world=>workspaceAccess(world,context(world,'property'))})))return planningSpent;
  if(!q&&offer('heroFieldCraftPlan',()=>heroFieldCraftPlan(s,context(s,'field-craft'))))return planningSpent;
  if(offer('waystonePlan',()=>waystonePlan(s,context(s,'waystones'))))return planningSpent;
  if(!q&&offer('pactTalkPlan',()=>pactTalkPlan(s,context(s,'branch-pacts'))))return planningSpent;
  if(!q&&offer('feastPlan',()=>feastPlan(s,context(s,'local-feasts'))))return planningSpent;
  if(!q&&offer('literacyPlan',()=>literacyPlan(s,context(s,'literacy'))))return planningSpent;
  if(!q&&offer('librarySecurityPlan',()=>librarySecurityPlan(s,context(s,'library-security'))))return planningSpent;
  if(!q&&offer('libraryPlan',()=>libraryPlan(s,context(s,'libraries'))))return planningSpent;
  if(!q&&offer('textPlan',()=>textPlan(s,context(s,'texts'))))return planningSpent;
  if(!q&&offer('homeBuildingPlan',()=>homeBuildingPlan(s,context(s,'home-building'))))return planningSpent;
  if(!q&&offer('homePlan',()=>homePlan(s,context(s,'homes'))))return planningSpent;
  if(!q&&offer('causewayPlan',()=>causewayPlan(s,context(s,'causeways'))))return planningSpent;
  if(!q&&offer('socketPlan',()=>socketPlan(s,context(s,'sockets'))))return planningSpent;
  if(!q&&offer('forgePlan',()=>forgePlan(s,context(s,'forging'))))return planningSpent;
  if(!q&&offer('refitPlan',()=>refitPlan(s,context(s,'knife-refit'))))return planningSpent;
  if(!q&&offer('landmarkPlan',()=>landmarkPlan(s,context(s,'landmarks'))))return planningSpent;
  if(!q&&offer('heroMerchantPlan',()=>heroMerchantPlan(s,context(s,'merchant-trips'))))return planningSpent;
  if(offer('caravanPlan',()=>caravanPlan(s,context(s,'caravans'))))return planningSpent;
  if(offer('delvePlan',()=>delvePlan(s,delveContext(s))))return planningSpent;
  if(offer('repertoirePlan',()=>repertoirePlan(s,{...context(s,'repertoire'),work:world=>planWork(world,context(world,'work'),{interest:true}),explore:explorePlan,planQuest:(world,quest)=>planQuest(world,quest,context(world,'quests'))},q)))return planningSpent;
  if(isTown(a)&&h.career.path!=='peaceful'&&h.quests.filter(q=>q.status==='active').length<4&&hasOffer(s,a)&&(!q||s.tick-(h.memory.lastNewQuest||0)>120)){
    h.memory.lastNewQuest=s.tick;if(offer('builtin',()=>{goal(s,'talk',a.id,42,'Выслушать ещё одно дело','Несколько обещаний могут совпасть с одной дорогой. Герой сам решит, за что взяться.');return true;}))return planningSpent;
  }
  if(!q&&offer('propertyAidPlan',()=>propertyAidPlan(s,context(s,'property-aid'))))return planningSpent;
  if(!q&&offer('propertyGiftPlan',()=>propertyGiftPlan(s,context(s,'property-gifts'))))return planningSpent;
  if(!q&&offer('propertyContractPlan',()=>propertyContractPlan(s,context(s,'property-contracts'))))return planningSpent;
  if(!q&&offer('repairPlan',()=>repairPlan(s,context(s,'property'))))return planningSpent;
  if(!q&&offer('propertyPlan',()=>propertyPlan(s,context(s,'property'))))return planningSpent;
  if(h.career.path==='peaceful'&&!q&&offer('planWork',()=>planWork(s,context(s,'work'))))return planningSpent;
  if(q){if(offer('planQuest',()=>planQuest(s,q,context(s,'quests'))))return planningSpent;}

  if (offer('planWork',()=>planWork(s, context(s, 'work')))) return planningSpent;
  if(offer('materialClientPlan',()=>materialClientPlan(s,context(s,'material-delivery'))))return planningSpent;
  const story = a.objects.find(o => o.kind === 'encounter' && !o.resolved);
  if (story && enabled(s, 'encounters')) {
    if(offer('builtin',()=>{goal(s, 'encounter', a.id, story.x, `Рассмотреть: ${story.name}`, 'Встреча может изменить путь. Герой решит сам.', { object: story.id });return true;}))return planningSpent;
  }
  const savings = hasHabit(h, 'hoarder') && h.hp > h.maxHp * .75 ? 12 : 0;
  if ((h.memory.shopAfter || 0) <= s.tick && ((enabled(s,'finances')?Boolean(nextPurchase(s,context(s,'finances'),h.memory.merchant)):((h.weapon < 3 && h.gold >= 16 + h.weapon * 15 + savings) || (!h.inventory.potions && h.gold >= 7 && h.weapon > 0) || (!hasArmor(h) && h.gold >= 22 + savings))) || h.inventory.relics > 0 || enabled(s, 'equipment') && h.bag.length > 7&&!h.itemBuyerFull)) {
    const merchantArea = h.memory.merchant;
    if (merchantArea&&knownServiceAllows(s,s.areas[merchantArea],'merchant') && route(s, h.area, merchantArea).length > 0 && route(s, h.area, merchantArea).length <= 5) { if(offer('builtin',()=>{goal(s, 'trade', merchantArea, 58, 'Найти Саву и обновить снаряжение', 'Деньги накоплены. Хорошее снаряжение снизит риск следующего боя.');return true;}))return planningSpent; }
    if (merchantArea) h.memory.shopAfter = s.tick + 180;
  }
  const town = closest(s, area => knownArea(s,area) && isTown(area) && hasWork(s, area));
  if (town && (h.gold < 16 + h.weapon * 15 || h.personality.sociability > .65 || h.personality.generosity > .65)) {
    if(offer('builtin',()=>{goal(s, 'talk', town.id, 42, 'Узнать, кому нужна помощь', 'Работа даёт доход, а разговоры — сведения о мире.');return true;}))return planningSpent;
  }
  if(offer('tavernPlan',()=>tavernPlan(s,context(s,'interiors'))))return planningSpent;
  if(offer('quietPlan',()=>quietPlan(s,context(s,'work'))))return planningSpent;
  if(offer('directions',()=>routeOpportunityPlan(s,{goal})))return planningSpent;
  if(offer('exploration',()=>{explorePlan(s);return true;}))return planningSpent;
  if(waiting){h.goal=waiting;return planningSpent;}
  if(h.energy<95||h.hp<h.maxHp)goal(s,'localRecovery',h.area,h.x,'Заняться доступной жизнью на месте','Знакомого исполнимого пути сейчас нет. Восстанавливает силы и расходует только настоящий запас.');
  else {h.goal=null;h.lastAction='idle';h.intent='Остаться в причинной изоляции';h.reason=h.actionSelection?.deferred.at(-1)?.reason||'Знакомые выходы изучены; доступного дела пока нет. Мир и собственные нужды продолжаются.';}
  return planningSpent;
}
function explorePlan(s,blocked=false){
  const h=s.hero,a=s.areas[h.area],reachable=area=>knownRoute(s,h.area,area.id).length>0;
  let options = Object.values(s.areas).filter(area => !area.interior && !area.temporaryCamp && knownArea(s,area) && !h.memory.places.includes(area.id) && !areaAvoided(s,area.id)&&reachable(area));
  if (!options.length) {
    const unavailable=Object.values(s.areas).find(area=>knownArea(s,area)&&!area.interior&&!area.temporaryCamp&&!h.memory.places.includes(area.id)&&!reachable(area)),blockedPath=blocked||Boolean(unavailable);
    const frontier = closest(s, area => !area.temporaryCamp&&visitedArea(s,area) && !area.expanded && area.type !== 'village' && !areaAvoided(s,area.id)&&reachable(area));
    if (frontier) { goal(s, 'expand', frontier.id, 91, blockedPath?'Искать другую дорогу':'Разведать дорогу за горизонтом', blockedPath?'Прежний путь перекрыт. Он выбирает доступный знакомый выход.':'Знакомые тропы изучены. Любопытство зовёт дальше.'); return; }
    if(blockedPath||Object.keys(h.memory.avoided).some(id=>areaAvoided(s,id))){
      const area=unavailable?.id||Object.keys(h.memory.avoided).find(id=>areaAvoided(s,id))||h.area,g={kind:'explore',area,x:84},signature=methodRevision(s,g),r={status:'blocked',reason:unavailable?'Известного доступного пути к этому месту пока нет.':'Он помнит опасный участок; нужен безопасный способ или действительные новые сведения.',retryOn:unavailable?'personal-route':'preparation-or-local-report'};
      if(!deferredMethod(h,g,signature))deferMethod(h,g,r,signature,s.tick);h.goal=null;return;
    }
    // Expanding a visited frontier keeps the world connected without resetting it.
    if(h.energy<95||h.hp<h.maxHp)goal(s,'localRecovery',h.area,h.x,'Заняться доступной жизнью на месте','Знакомые выходы изучены. Новую дорогу нельзя создать одним повторением ожидания.');return;
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
  const mount=ridingOn(s)&&groupHorse(s,h),rate=mount?horseMotion(s,h,mount,weather,{mounted:mount.rider===h.lineage,terrain:s.areas[h.area].type==='mountain'?'mountain':'road'}):null;
  if(mount&&(mount.lastMove===s.tick||mount.lastAction===s.tick||mount.energy<(rate?.energy||1))){h.lastAction='rest';return;}
  let stride=rate?(mount.rider?rate.speed:Math.min(foodWalkingStride(s,h)*weather.speed,rate.speed)):foodWalkingStride(s,h)*weather.speed;
  const cart=drivenWagon(s,h.lineage);if(cart&&!wagonReady(s,cart.w)){h.lastAction='wait';return;}
  const lure=!mount&&!cart&&decoyWalkQuote(s,h.lineage,target);if(lure?.mode==='decoy-set'&&placeDecoy(s,s.people[h.lineage],lure.item)){h.reason='Оставить однократную приманку и продолжить прежний путь тихими шагами.';return;}
  const stealth=stealthWalkQuote(s,h.lineage,target,{mounted:Boolean(mount||cart)}),from=h.x;if(['wait','greet'].includes(stealth.mode)){h.energy=Math.max(0,h.energy-(stealth.mode==='greet'?1:.25));h.lastAction=stealth.mode==='greet'?'talk':'wait';h.reason=stealth.mode==='greet'?'Коротко ответить стражу и продолжить прежнее дело.':'Выждать замеченный поворот внимания; ожидание ограничено.';commitStealthStep(s,h.lineage,from,from,target,stealth);return;}stride*=stealth.factor;
  const amount=areaStep(s.areas[h.area],h.x,target,cart?Math.min(stride,6*weather.speed*Math.min(1,...h.companions.filter(c=>c.person&&s.people[c.person]?.alive).map(c=>woundStride(s,s.people[c.person])))/(1+wagonLoad(s,cart.w)/48)):stride);if(cart&&amount)wagonMoved(s,cart.w);
  if(mount&&amount){mount.energy=Math.max(0,mount.energy-rate.energy);mount.hunger=Math.min(100,mount.hunger+.12);mount.lastMove=s.tick;}
  h.x+=amount;h.distance+=Math.abs(amount)*areaScale(s.areas[h.area]);h.energy=Math.max(0,h.energy-(mount?.rider===h.lineage ? .2 : walkingEnergy(s,weather)));h.lastAction='walk';if(stealth.mode==='quiet')h.reason='Тихий шаг мимо известного патруля; шум и видимость всё ещё могут выдать путника.';syncCoverPosition(s);commitStealthStep(s,h.lineage,from,h.x,target,stealth);
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
  const h = s.hero,a=s.areas[h.area],wasTaken=object.taken;
  if (object.kind === 'herb' && object.count > 0&&stackRoom(s,h.lineage,'herbs',1)>0&&scentPlantKnown(s,h,a,object)&&physicalDistance(a,h.x,object.x)<=9) { object.count--; h.inventory.herbs++; log(s, 'Лунная трава найдена. Её можно отдать лекарю или приложить к ране.', 'loot'); }
  if (object.kind === 'loot' && !object.taken) { object.taken = true; h.gold += object.gold; log(s, `В забытом кошеле ${object.gold} монет. На дороге стало чуть меньше тайн.`, 'loot'); }
  if(object.kind==='heirloom'&&!object.taken)recoverHeirloom(s,object,context(s,'loot')); 
  if (object.kind === 'relic' && !object.taken) { object.taken = true; h.inventory.relics++; h.counters.relics++; gainXp(s, 10); log(s, 'Найден осколок древнего света.', 'loot'); if (enabled(s, 'equipment')&&!findWaystone(s,object,context(s,'loot'))) receiveItem(s, context(s, 'loot'), 2); }
  h.lastAction = 'collect'; h.goal = null;
  if(!wasTaken&&object.taken)recordLayoutCollection(s,object);
  temporalCollection(s,object,context(s,'epochs'));
}
function expand(s) {
  expandRoutes(s,context(s,'geography'));s.hero.goal=null;
}
function die(s, enemy,details={}) {
  if(s.hero.carriedBy)endPeopleCarry(s,context(s,'people-carry'),'пассажир погиб');
  const meaning=deathMeaning(s,enemy),report=deathRecord(s,enemy,details);
  finishDelve(s,'death');
  cancelWeapon(s,'Смерть прекращает подготовку.');cancelWard(s,'Смерть прекращает подготовку.');
  const mount=groupHorse(s,s.hero);if(mount)detachHorse(s,mount,'keeper-died');
  const h = s.hero; h.alive = false; h.hp = 0; h.combat = null; h.goal = null; h.lastAction = 'death';retreatTick(s);
  musicTick(s,context(s,'camp-music'));syncCoverPosition(s);
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
  if (!enemy?.alive||enemy.resolved) { cancelWeapon(s,'Противник больше не участвует в бою.');cancelWard(s,'Противник больше не участвует в бою.');h.combat = null; h.goal = null; return; }
  encounterBestiary(s,s.people[h.lineage],enemy);
  contactDelve(s,enemy);
  causalReturn(s,enemy);
  if(storyCombatChoice(s,enemy,context(s,'stories'))){cancelWeapon(s,'Выбрано другое действие.');cancelWard(s,'Выбрано другое действие.');observeRejected(s,s.areas[h.area]);return;}
  rememberWeaponRole(s);
  if(considerSurrender(s,enemy,context(s,'enemy-people'))){cancelWard(s,'Бой прекращён.');return;}
  h.action = 'БОЙ'; h.intent = `Сражаться: ${enemy.name}`; h.reason = 'Опасность уже рядом. Он оценивает раны после каждого удара.';
  let choice=woundCombatChoice(s,enemy,chooseCombatAction(s,enemy));rememberCombatChoice(s,enemy,choice,context(s,'combat'));
  const warned=enabled(s,'tactics')&&enemy.tactic==='charged'&&enemy.battle?.intent==='strike'&&Math.max(1,expectedStrike(s,enemy)-legacyArmorDefense(h)-itemBonus(h,'defense'))>h.hp*(.65+h.personality.courage*.4);
  if (choice?choice.action==='flee':h.hp < h.maxHp * (.18 + (1 - h.personality.courage) * .2) || h.energy < 9||warned) {
    if(coveredRetreat(s,enemy,{...context(s,'combat'),hurtCompanion,replyGuard:(world,e,p)=>enemyReply(world,e,e.attack+roll(world,4),context(world,'combat'),p),stepAway:move}))return;
    const escaped=random(s)<.82;resolveCombatChoice(s,'flee-attempt',{retreatAttempted:true,retreated:escaped});
    if (escaped) {
      cancelWeapon(s,'Отступление прерывает размах.');cancelWard(s,'Отступление прерывает подготовку.');
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
  if(choice&&!legacy&&!(choice.action==='spell'&&choice.spell==='ward'))cancelWard(s,'Выбрано другое действие.');
  if(choice?.action==='brace'&&performBrace(s,enemy,context(s,'combat'))){cancelWeapon(s,'Вместо размаха выбран заслон.');resolveCombatChoice(s,'brace',{energySpent:h.defenseMemory.lastBrace.energy,...(h.defenseMemory.lastBrace.pair?{manaSpent:h.defenseMemory.lastBrace.mana}:{} )});enemyResponse(s,enemy);return;}
  if (choice?.action==='potion'||legacy&&h.hp < h.maxHp * .45 && h.inventory.potions > 0) {
    cancelWeapon(s,'Лечение прерывает размах.');cancelWard(s,'Лечение прерывает подготовку чар.');
    const before=h.hp;h.inventory.potions--; h.hp = Math.min(h.maxHp, h.hp + 19); h.lastAction = 'heal';resolveCombatChoice(s,'potion',{potionsSpent:1}); log(s, 'Герой сам использует зелье: без лечения следующий удар может стать последним.', 'heal',h.area,{meaning:eventMeaning(s,'heal',{item:{kind:'item',id:null,label:'Лечебное зелье',role:'зелье'},amount:h.hp-before})});enemyResponse(s,enemy);return;
  }
  const manaBefore=h.magic.mana;
  if((legacy||choice?.action==='spell')&&castInCombat(s,enemy,context(s,'magic'),choice?.action==='spell'?choice.spell:null,choice?.form||null)){cancelWeapon(s,'Чары прерывают размах.');resolveCombatChoice(s,'spell',{manaSpent:manaBefore-h.magic.mana});if(enemy.alive&&!enemy.resolved){if(h.magic.responseSkipped)partyCombatPhase(s,enemy,true);else enemyResponse(s,enemy);}return;}
  cancelWard(s,'Чары не завершены; выбран другой способ.');
  const technique=['quick','release','windup'].includes(choice?.action)?{id:choice.action,reason:choice.reason}:legacy?chooseWeaponStyle(s,enemy):null;
  if(technique)h.reason=technique.reason;
  if(h.coverPosition)h.coverPosition=null;
  if(technique?.id==='windup'&&beginWeapon(s,enemy,context(s,'combat'))){resolveCombatChoice(s,'windup',{energySpent:2,reason:technique.reason});enemyResponse(s,enemy);return;}
  const style=technique&&finishWeapon(s,enemy,technique.id==='release'?'heavy':technique.id)?technique.id==='release'?'heavy':technique.id:null;
  if(!style)cancelWeapon(s,'Выбран обычный удар.');
  const raw = 4 + weaponBody(s,h).weapon * 3 + Math.floor(h.level / 2) + roll(s, 4);
  const damage = combatAttack(s, enemy, raw, context(s, 'combat'),style);
  const energy=style?WEAPON_STYLES[style].energy:3;
  const enemyBefore=enemy.hp;enemy.hp -= damage; h.energy = Math.max(0, h.energy - energy); h.lastAction = 'attack';
  recordWeaponHit(s,enemy,damage,enemyBefore);
  if(weaponBody(s,h)===h)wearWeaponHit(s,enemy,damage,enemyBefore,context(s,'item-wear'));
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
function respondInContact(s,enemy){contactDelve(s,enemy);enemyResponse(s,enemy);}
function enemyResponse(s,enemy){
  const h=s.hero;if(!enemy.alive||enemy.resolved)return;
  if(partyCombatOn(s)&&h.partyCombat?.tick===s.tick&&h.partyCombat.enemy===enemy.id&&h.partyCombat.replied)return;
  if(!partyCombatPhase(s,enemy))return;
  const phase=enemy.battle?.intent||'idle';
  const physicalWound=!(enabled(s,'mutations')&&enemy.mutation==='mirror'&&enemy.battle?.echo>0);
  const raw=enemyReply(s,enemy,enemy.attack+roll(s,4),context(s,'combat'));
  encounterBestiary(s,s.people[h.lineage],enemy);
  observeWeaponReply(s,enemy,phase);
  if(!raw){partyCoverDamage(s,enemy,0,{...context(s,'combat'),hurtCompanion});enemyRecovery(s,enemy,h.lastAction!=='windup'&&(profile(h).skill==='magic'||h.lastAction==='spell'));h.lastDamage=0;rememberCombatReply(s,enemy,0,phase);return;}
  const total=combatResponse(s,enemy,Math.max(1,raw-legacyArmorDefense(h)),context(s,'combat'));
  const {received,excluded}=partyCoverDamage(s,enemy,total,{...context(s,'combat'),physicalWound,hurtCompanion});
  actorFact(s,'attack',enemy.id,'hero');
  if(received>0)actorFact(s,'hurt','hero',enemy.id,received);
  partyHurt(s,received,{...context(s,'party-danger'),physicalWound},excluded);const hpBefore=h.hp;h.hp-=received;h.lastDamage=received;
  recordLastingInjury(s,s.people[h.lineage],enemy,{before:hpBefore,after:h.hp,maximum:h.maxHp,area:h.area,controller:'actor',physical:physicalWound},context(s,'lasting-injuries'));
  wearArmorHit(s,enemy,received,hpBefore,context(s,'item-wear'));
  rememberCombatReply(s,enemy,received,phase);
  log(s,`${enemy.name} отвечает: −${received} HP.`,'combat',h.area,{meaning:eventMeaning(s,'strike',{actor:enemyReference(enemy),target:actorReference(h),amount:received})});if(h.hp<=0)die(s,enemy,{kind:'battle',damage:received,hpBefore});pairCombatTick(s);
}
function defeatEnemy(s,enemy,killer=s.hero.lineage){
  if(!enemy.alive)return;
  markActorDeath(s,enemy,enemy.id,enemyShape(enemy));
  const h=s.hero;enemy.hp=0;enemy.alive=false;killEnemyPerson(s,enemy,killer);dropRescuePurse(s,s.areas[h.area],enemy);h.combat=null;h.kills++;h.gold+=2+roll(s,4);gainXp(s,9);
  if(killer!==h.lineage)enemy.defeatedBy=killer;
  recordRemains(s,enemy,{kind:'enemy',id:enemy.id,area:h.area,x:enemy.x,shape:enemyShape(enemy),cause:{person:killer},facing:h.x<enemy.x?-1:1});
  observeRejected(s,s.areas[h.area]);
  s.changes.push({tick:s.tick,text:`${enemy.name} побеждён в месте «${s.areas[h.area].name}».`});
  log(s,`${enemy.name} повержен. Он больше не будет угрожать этой дороге.`,'victory',h.area,{meaning:eventMeaning(s,'victory',{target:enemyReference(enemy)})});afterVictory(s,enemy,context(s,'loot'));h.goal=null;
  applyTimeConsequence(s,enemy,context(s,'epochs'));
}
function spawnEnemy(s,a,settings={}){
 const enemy={id:a.id+'-arrival-'+s.society.nextEnemy++,kind:'enemy',name:'Пришлая угроза',x:settings.x||57,hp:20,maxHp:20,attack:4,alive:true,patrol:0,...settings,requestedSpecies:settings.requestedSpecies||settings.species};
 composeEnemy(s,a,enemy,()=>moduleRandom(s,'event-enemies'),true);a.objects.push(enemy);bindEnemyPerson(s,a,enemy);return enemy;
}
function npcVictory(s,a,enemy,p){
 markActorDeath(s,enemy,enemy.id,enemyShape(enemy));
 enemy.hp=0;enemy.alive=false;killEnemyPerson(s,enemy,p.id);enemy.defeatedBy=p.id;const text=p.name+' побеждает '+enemy.baseName+' на дороге. Это поступок другого человека.';if(enabled(s,'npc-watch-needs'))watchNote(s,p,text,{log},'orders');else{s.society.events.unshift({tick:s.tick,area:a.id,text,kind:'orders'});s.changes.push({tick:s.tick,text});if(s.hero.area===a.id)log(s,text,'orders');}
 recordRemains(s,enemy,{kind:'enemy',id:enemy.id,area:a.id,x:enemy.x,shape:enemyShape(enemy),cause:{person:p.id},facing:Number.isFinite(p.x)?p.x<enemy.x?-1:1:undefined});
 dropRescuePurse(s,a,enemy);
 if(enemy.items?.length){cacheItems(s,enemy.items,{area:a.id,x:enemy.x,leftBy:p.id,name:'Перехваченная поклажа'});enemy.items=[];}
}
function worldTick(s) {
  harvestFailureTick(s,context(s,'harvest-failure'));
  earthquakesTick(s,context(s,'earthquakes'));
  woundsTick(s,{changed(p,w,kind){const h=woundActor(s,p),view=h?actorView(s,h):s.hero.lineage===p.id?s:null;if(view)log(view,kind==='reopened'?`${w.label}: нагрузка вновь открыла рану.`:kind==='infected'?`${w.label}: загрязнённая рана нагноилась.`:kind==='infection-changed'?`${w.label}: состояние инфекции изменилось, тяжесть ${w.infection.severity}.`:kind==='infection-resolved'?`${w.label}: местное нагноение прошло; восстановление самой раны продолжается.`:`${w.label}: повязку пора сменить.`,'condition');},bleed(p,h,amount,damage){
   const infection=damage?.sources.some(r=>r.kind==='infection'),mixed=infection&&damage.sources.some(r=>r.kind==='bleeding'),cause=infection?(mixed?'Осложнения загрязнённой кровоточащей раны':'Тяжёлое нагноение раны'):'Кровопотеря из незакрывшейся раны';
   if(h){const view=actorView(s,h);h.hp=Math.max(0,h.hp-amount);if(h.hp===0)die(view,{kind:'condition',name:cause});syncActiveActor(view);return;}
   const leader=detailedActors(s).find(h=>h.alive&&h.companions.some(c=>c.person===p.id)),c=leader?.companions.find(c=>c.person===p.id);
   p.health=Math.max(0,p.health-amount);
   if(p.health===0){const passage=patientJourney(s,p);if(passage){p.deathJourney=passage;p.area=null;p.x=null;}p.deathCause=cause;if(c){const view=actorView(s,leader);hurtCompanion(view,c,c.hp,context(view,'local-wounds'),infection?'wound-infection':'bleeding');}else{p.alive=false;p.status='dead';p.died=s.tick;recordPersonRemains(s,p);}}
   else if(c)c.hp=Math.max(1,Math.ceil(c.maxHp*p.health/(p.maxHealth||100)));
  }});
  patientsTick(s,context(s,'injured-party'));
  waitingPackPetsTick(s);
  leverTeamTick(s,context(s,'mechanisms'));
  materialWorldTick(s,context(s,'local-materials'));
  biomaterialTick(s);settleBurialWork(s);
  goodsTick(s);farmingTick(s);
  lodgingTick(s);
  hallActivitiesTick(s,context(s,'hall-activities'));
  for(const h of detailedActors(s))if(selfDrivenActor(s,h)&&!h.transit){const view=actorView(s,h);observeFreightActor(view,s.people[h.lineage],h.area);observeDelveLayout(view);}
  supplyTick(s,context(s,'supply'));
  societyTick(s,context(s,'society'));
  migrationsTick(s,context(s,'migrations'));
  propertyDamageTick(s,context(s,'property-damage'));
  buildingRuinsTick(s,context(s,'building-ruins'));
  propertyContractsTick(s,context(s,'property-contracts'));
  workOrdersTick(s,context(s,'work-orders'));
  workshopDisputesTick(s,context(s,'workshop-dispute'));
  feastTick(s,context(s,'local-feasts'));
  hostileLifeTick(s,context(s,'hostile-life'));rivalryTick(s);decoyWorldTick(s);peopleTick(s,context(s,'people'));diplomacyWorldTick(s);causewayWorldTick(s);
  const localRemains=remainsByArea(s);migrationContactTick(s);
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
    if(o.kind==='enemy'&&o.alive&&!o.resolved&&predatorCarrionTurn(s,a,o,{fighting:activeFights,bodies:localRemains.get(a.id)||[],log})){continue;}
    if (o.kind === 'enemy' && o.alive && !o.resolved && !s.people[o.person]?.hostileLife && o.patrol && !activeFights.has(o.id) && s.tick % 4 === 0) {
      const beforeX=o.x;o.x += areaOffset(a,o.patrol*1.4);creatureTrace(s,a,o,beforeX);
      if (o.x < 29 || o.x > 83) o.patrol *= -1;
    }
  }

  settleCastleDeaths(s,context(s,'royal-libraries'));
  if (s.changes.length > 300) s.changes.splice(0, s.changes.length - 300);
}
function archiveNPCObservers(s){for(const h of detailedActors(s))if(h.actorMode==='npc'&&!h.alive){
 const p=s.people[h.lineage],ended=Number.isInteger(p?.died)&&p.died>=0&&p.died<=s.tick?p.died:h.life.endedAt??s.tick;
 if(s.lives.some(l=>l.lineage===h.lineage&&l.outcome==='dead'&&l.ended===ended))continue;
 const view=actorView(s,h),cause=p?.deathCause||'Гибель жителя мира',late=ended<s.tick||h.life.deathDateKnown===false;
 cancelWeapon(view,'Смерть прекращает подготовку.');cancelWard(view,'Смерть прекращает подготовку.');
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
 worldTick(s);settleRemainsCarriers(s,context(s,'remains-carry'));buildingControlTick(s);horseWorldTick(s);syncWagons(s);ferryWorldTick(s,context(s,'ferry'));syncEnemyPeople(s);syncNPCActors(s);archiveNPCObservers(s);invalidateNPCControl(s);
 const actors=detailedActors(s);
 for(const h of actors){
  applyActorExternal(s,h);retreatTick(actorView(s,h));weaponTick(actorView(s,h));wardTick(actorView(s,h));pairCombatTick(actorView(s,h));if(!selfDrivenActor(s,h)||h.actorStep===s.tick)continue;
  if(!npcAction(s,s.people[h.lineage],'actor','decision'))continue;
  const view=actorView(s,h);observeLocalRoutes(view);observeCampSites(view);
  observeRouteMap(view,s.people[h.lineage]);
  h.actorStep=s.tick;
  if(s.people[h.lineage]?.status==='captive'){h.lastAction='rest';continue;}
  const castsBefore=h.magic.casts;
  try{actObserved(view);woundActivity(s,s.people[h.lineage],h.lastAction==='walk'?'leg':['attack','work'].includes(h.lastAction)?'arm':'body',['rest','sleep'].includes(h.lastAction));finishPositionTurn(view,respondInContact,h.lastAction==='flee'||h.magic.casts>castsBefore&&h.magic.responseSkipped);}finally{syncHorse(view,h);syncWagons(view);advancePackPets(view,{...context(view,'pack-pets'),knownRoute:(world,from,to)=>knownPetRoute(world,from,to,id=>areaAvoided(world,id)),hurtCompanion:(world,c,n,ctx)=>hurtCompanion(world,c,n,ctx,'pack-starvation')});syncPatient(view);syncEnemyPeople(s);pairCombatTick(view);syncActiveActor(view);invalidateNPCControl(s);}
 }
 for(const h of actors)applyActorExternal(s,h);
 settleRemainsCarriers(s,context(s,'remains-carry'));settleBurialWork(s);syncNPCActors(s);archiveNPCObservers(s);finishLootTick(s);return s;
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
export function observeRemains(s,person=s.hero.lineage){const h=s.actorStates?.[person],b=h&&!h.alive&&bodyRemains(s,h);if(s.rules.remains===false||!b||!remainsLocation(s,b))return false;bindObservedJournal(s);s.hero=h;s.generation=h.actorGeneration;s.journal=actorJournal(s,h);s.observation={version:1,person,sequence:(s.observation.sequence||1)+1,started:s.tick};initializeObservation(s);return focusOwnRemains(s);}
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
  musicTick(s,context(s,'camp-music'));
  petTrainingTick(s);
  if(h.petPassage?.lastActionTick===s.tick){h.lastAction='companion';return s;}
  weaponTick(s);wardTick(s);
  pairCombatTick(s);
  rememberPracticalRole(s,s.people[h.lineage],h);
  confirmTracking(s);
  observeServices(s);
  observeOwnCollection(s,context(s,'collections'));
  weatherTick(s,context(s,'weather'));
  propertyMemoryTick(s,context(s,'property-memory'));
  recollectionTick(s,context(s,'recollection'));
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
  const bodyActed=traitsTick(s,context(s,'body'));
  if(h.carryStopTick===s.tick)return s;
  if(h.carriedBy){peopleCarryTurn(s,context(s,'people-carry'));return s;}
  if(s.people[h.lineage]?.caravanPassenger){passengerTurn(s,context(s,'wagons'));return s;}
  if(bodyActed)return s;
  if(peopleCarryTurn(s,context(s,'people-carry')))return s;
  if(heroFordProgress(s,context(s,'fords')))return s;
  if(roadCampNeed(s,context(s,'fieldcamp')))return s;
  if(wagonTurn(s,{...context(s,'wagons'),knownRoute:(world,from,to)=>knownRoute(world,from,to)}))return s;
  if(horseTurn(s,context(s,'riding')))return s;
  if(transitTick(s,context(s,'travel')))return s;
  if(manageHeroRoadStop(s,context(s,'fieldcamp')))return s;
  if(resumeRoadContact(s))return s;
  if(localRoadShop(s,context(s,'road-contact')))return s;
  if(h.delve&&s.areas[h.delve.root]?.dungeon?.layout&&!layoutOn(s))return s;
  observePlaceRule(s,context(s,'place-rules'));
  observeDelveLayout(s);observeGuardians(s);observePositions(s);
  observeTowers(s,context(s,'landmarks'));
  observeScentPlants(s);
  observeNavigationBlockers(s,context(s,'navigation-memory'));
  observeBestiaryTraces(s,s.people[h.lineage],context(s,'bestiary'));
  observeMaterials(s);observeBurialPlaces(s,s.people[h.lineage]);
  if(!enabled(s,'work-materials')&&h.goal?.kind==='serviceSupply')h.goal=null;
  if (h.goal?.kind === 'trade' && s.tick - (h.goal.started ?? s.tick) > 180) {
    h.memory.shopAfter = s.tick + 240; h.goal = null;
    log(s, 'Поиски Савы затянулись. Герой откладывает покупку и возвращается к исследованию.', 'talk');
  }
  adaptLimbPlan(s,context(s,'limb-loss'));
  if(patientPlan(s,{...context(s,'injured-party'),enemyResponse:respondInContact}))return s;
  if(woundCareTurn(s,{...context(s,'wound-care'),cancelWeapon}))return s;
  if(h.combat){const enemy=s.areas[h.area].objects.find(o=>o.id===h.combat);if(!positionPlan(s,enemy,{...context(s,'dungeon-positions'),cancelWeapon})&&!guardianPlan(s,enemy,{...context(s,'guardian-nodes'),cancelWeapon})){fight(s,enemy);return s;}}
  if(prostheticTurn(s,context(s,'prosthetics')))return s;
  if(poisonCareTick(s,context(s,'poison-care')))return s;
  if(rivalryTurn(s,context(s,'craft-rivalry')))return s;
  noticeCaravan(s,context(s,'caravans'));
  // Healing is an autonomous choice; herbs promised to a healer are kept if possible.
  if (h.hp < h.maxHp * .48 && h.inventory.herbs > 0 && activeQuest(h)?.kind !== 'herbs') {
    h.inventory.herbs--; h.hp = Math.min(h.maxHp, h.hp + 9); h.lastAction = 'heal'; log(s, 'Герой прикладывает лунную траву к ране. Знание леса помогает выжить.', 'heal'); return s;
  }
  if(materialOfferTurn(s,s.people[h.lineage],context(s,'material-delivery')))return s;
  if(!holdPoisonRest(s)&&!holdWoundRest(s)&&pairCampCare(s,context(s,'party-relations')))return s;
  const groupNeed=partyDemand(s);
  intentionTick(s,context(s,'intentions'));
  if(enabled(s,'repertoire')&&['craft','navigation','returnship'].includes(h.goal?.repertoire?.line)&&repertoireInterrupt(s,{...context(s,'repertoire'),planQuest:(world,q)=>planQuest(world,q,context(world,'quests'))},currentQuest(h,s)))return s;
  if(!holdWoundRest(s)&&balanceIntentions(s,{...context(s,'intention-balance'),planQuest:(world,q)=>planQuest(world,q,context(world,'quests'))}))return s;
  if(!h.goal?.intention&&respondAid(s,context(s,'personal-aid')))return s;
  if(h.goal?.kind==='leisure'&&h.goal.signals!==undefined&&h.goal.signals!==quietSignals(s))h.goal=null;
  const urgent = groupNeed==='rest'||h.hp < h.maxHp * (.35 + (1 - h.personality.courage) * .28) || h.energy < 23;
  if(!urgent&&h.hunger<=70)navigationToolPlan(s,context(s,'navigation-tools'));
  if(!urgent)actorMaterialDeliveryPlan(s,context(s,'material-delivery'));
  if(!h.goal||h.goal.kind==='provision')collectionPlan(s,context(s,'collections'),{urgentOnly:true});
  if(!urgent&&h.hunger<=75&&!h.goal?.intention)hearCaptivePlan(s,context(s,'dungeon-rescue'));
  if (!h.goal || groupNeed==='food'&&!['provision','eat','forage','brothEat','campPitch'].includes(h.goal.kind) || urgent && !['rest','campPitch', 'provision','eat','forage','brothEat'].includes(h.goal.kind) || enabled(s, 'body') && h.hunger > 75 && !h.goal.collectionEmergency&&!['rest','campPitch', 'provision','eat','forage','brothEat'].includes(h.goal.kind) || h.goal.quest && activeQuest(h) && questReady(s, activeQuest(h)) && !['rest', 'turnin', 'provision','eat','forage','brothEat'].includes(h.goal.kind)) if(plan(s))return s;
  if(reconsiderKnownQuest(s))return s;
  reconsiderMethods(s,(world,g)=>goalReadiness(world,g,{knownRoute},{memory:false}),methodRevision);
  if(h.goal&&['routeWait','leisure','localRecovery'].includes(h.goal.kind)&&h.actionSelection?.deferred.some(e=>e.signature!==methodRevision(s,e.step))){h.goal=null;if(plan(s))return s;}
  if(h.goal){const readiness=goalReadiness(s,h.goal,{knownRoute});if(readiness.status==='waiting'){if(plan(s))return s;}else if(!['ready','progressing'].includes(readiness.status)){const previous=h.goal;if(readiness.status==='blocked')deferMethod(h,previous,readiness,methodRevision(s,previous),s.tick);h.goal=null;if(plan(s))return s;}}
  if(!verifyTarget(s,'navigationReturnTarget',()=>navigationReturnTarget(s,context(s,'navigation-memory'))))return s;
  if(navigationHoldKnownBlocker(s,context(s,'navigation-memory')))return s;
  if(!verifyTarget(s,'rescueTarget',()=>rescueTarget(s,{log,failQuest}))||!verifyTarget(s,'intentionTarget',()=>intentionTarget(s))||!verifyTarget(s,'lodgingTarget',()=>lodgingTarget(s))||!verifyTarget(s,'aidTarget',()=>aidTarget(s))||!verifyTarget(s,'serviceTarget',()=>serviceTarget(s,context(s,'work-orders')))||!verifyTarget(s,'propertyAidTarget',()=>propertyAidTarget(s,context(s,'property-aid')))||!verifyTarget(s,'propertyGiftTarget',()=>propertyGiftTarget(s,context(s,'property-gifts')))||!verifyTarget(s,'propertyContractTarget',()=>propertyContractTarget(s,context(s,'property-contracts')))||!verifyTarget(s,'propertyTarget',()=>propertyTarget(s,context(s,'property'))))return s;
  if(!verifyTarget(s,'itemRepairTarget',()=>itemRepairTarget(s,context(s,'item-wear')))||!verifyTarget(s,'refitTarget',()=>refitTarget(s))||!verifyTarget(s,'workshopWorkTarget',()=>workshopWorkTarget(s,{...context(s,'workshop-interiors'),workspaceAccess:world=>workspaceAccess(world,context(world,'property'))})))return s;
  if(poisonCareTick(s,context(s,'poison-care')))return s;
  if(clothingPriority(s))return s;
  if(!urgent&&packPetCare(s,context(s,'pack-pets')))return s;
  const beforeLateGoal=h.goal;
  if(!urgent)petRetrievalPlan(s,context(s,'pet-passage'));
  if(petPassagePlan(s,context(s,'pet-passage')))return s;
  petBoardingTarget(s);
  if(!urgent)petTransferPlan(s,context(s,'pet-transfer'));
  if(!urgent)packPetPlan(s,context(s,'pack-pets'));
  if(!urgent)clothingPlan(s,context(s,'practical-clothing'));
  if(changeSpareOutfit(s,context(s,'spare-outfit')))return s;
  if(h.goal!==beforeLateGoal)dependency(s,beforeLateGoal,h.goal,methodRevision);
  resumeFordTaskView(s);
  if(!verifyTarget(s,'collectionTarget',()=>collectionTarget(s)))return s;
  if(!verifyTarget(s,'landmarkTarget',()=>landmarkTarget(s)))return s;
  if(!admitAction(s,{assess:(world,g)=>goalReadiness(world,g,{knownRoute}),revision:methodRevision,select:plan,transform:world=>preparePlan(world,context(world,'preparation')),progress:actionProgress,accepted:(world,g)=>preparationAccepted(world,g,log)}))return s;
  const g = h.goal;
  if (!g) return s;
  const beforeAction=actionProgress(s,g);let rejectedBy=null;const execute=(id,run)=>{const value=run();if(value===false)rejectedBy=id;return value;};
  try {
  const a = s.areas[h.area];
  if (g.kind === 'hunt' && g.area === h.area) {
    const enemy = a.objects.find(o => o.id === g.object);
    if (!enemy?.alive) { h.goal = null; return s; } g.x = enemy.x;
  }
  let target = g.x, next = null;
  if (h.area !== g.area) {
    const original=knownRoute(s,h.area,g.area),path=petPassagePath(s,g,fordDetour(s,h,g,g.area,original),id=>areaAvoided(s,id));next=path[1];if(!next){h.goal=null;return s;}
    target = Number(next.slice(1)) > Number(h.area.slice(1)) ? 100 : 0;
    if(ferryOn(s)&&s.ferry?.ports.includes(h.area)&&s.edges[[h.area,next].sort().join('|')]?.mode==='sea')target=50;
    const passage=interiorPassage(s,h.area,next);if(passage){target=passage.x;if(!passage.allowed){if(['mechanism','lift'].includes(passage.kind)){if(passage.kind==='lift'?blockedLiftPlan(s,next,context(s,'mechanisms')):teamLeverPlan(s,next,context(s,'mechanisms'))||blockedGratePlan(s,next,context(s,'mechanisms')))return s;if(physicalDistance(a,h.x,target)<=1){h.goal=null;return s;}}else{h.goal=null;h.tavernAfter=s.tick+240;log(s,'Дверь закрыта. Он возвращается к другим делам.','plan');return s;}}}
  }
  if(positionAction(s,{...context(s,'dungeon-positions'),move,fight,enemyResponse:(world,enemy)=>{contactDelve(world,enemy);enemyResponse(world,enemy);}}))return s;
  if(guardianAction(s,{...context(s,'guardian-nodes'),move,enemyResponse:(world,enemy)=>{contactDelve(world,enemy);enemyResponse(world,enemy);}}))return s;
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
    suspendRoadFight(s,threat);h.combat = threat.id; h.lastAction = 'attack'; h.action = 'БОЙ'; h.intent = `Сражаться: ${threat.name}`; h.reason = 'Противник преградил путь. Герой готовится защищаться.';
    log(s, `${threat.name} преграждает дорогу. Начинается бой.`, 'combat'); return s;
  }
  if (physicalDistance(a,h.x,target) > 1) { if(navigationGate(s,target,context(s,'navigation-tools')))return s;move(s, target); return s; }
  if (next) { const from=h.area,passage=interiorPassage(s,from,next),arrivalX=passage?.arrival??(target===100?5:95);if(!passage&&heroFordGate(s,next,arrivalX,context(s,'fords')))return s;if(!passage&&beginTransit(s,next,arrivalX,context(s,'travel')))return s;h.x=arrivalX;enter(s,next);resumeFordTaskView(s);campCrossed(s,from,next,context(s,'fieldcamp'));h.lastAction='walk';return s; }
  if(['trackStudy','trackLesson'].includes(g.kind)){execute('trackingAction',()=>trackingAction(s,context(s,'tracking')));return s;}
  if(['directionAsk','directionInspect'].includes(g.kind)){execute('routeOpportunityAction',()=>routeOpportunityAction(s,g,{observeLocalRoutes,log}));return s;}
  if(g.kind==='localRecovery'){h.hp=Math.min(h.maxHp,h.hp+restAmount(s,a));h.energy=Math.min(100,h.energy+4);traitsRest(s,context(s,'body'));magicRest(s);partyRest(s);h.lastAction='rest';h.goal=null;return s;}
  if (g.kind === 'rest') {
    restoreCampRestView(s);
    if(lodgingRest(s,context(s,'lodging'),holdPoisonRest(s)||holdWoundRest(s)))return s;
    if(!holdPoisonRest(s)&&!holdWoundRest(s)&&(campAffairTalk(s,context(s,'companion-affairs'))||campLesson(s,context(s,'camp-lesson'))||retreatDrill(s,context(s,'skill-branches'))||pairDrill(s,context(s,'party-combinations'))||campConversation(s,context(s,'camp-life'))||musicCamp(s,context(s,'camp-music'))||pairCampWatch(s,context(s,'party-relations'))||smokeCamp(s,context(s,'smoking'))||sketchCamp(s,context(s,'sketching'))||cookingCamp(s,context(s,'hearth-food'))))return s;
    const amount = restAmount(s,a);
    h.hp = Math.min(h.maxHp, h.hp + amount); h.energy = Math.min(100, h.energy + smokeRestEnergy(s,12)); h.lastAction = 'rest';
    traitsRest(s, context(s, 'body'));
    magicRest(s);
    partyRest(s);
    if (!holdPoisonRest(s)&&!holdWoundRest(s)&&partyRestReady(s)&&h.hp === h.maxHp && h.energy >= 95&&(!enabled(s,'magic')||h.magic.mana>=(g.preparation?.mana||0))) { log(s, 'Силы восстановлены. Можно снова вернуться к своим планам.', 'rest'); h.goal = null;leaveCamp(s,context(s,'fieldcamp')); }
    else h.speech = isTown(a) ? actualService(s,a,'clinic').available?'Лекарь помогает путникам. Здесь можно перевести дух.':'Здесь можно отдохнуть самому; лекарь сейчас не принимает.' : 'Огонь согревает. Обещания подождут до утра.';
  } else if (g.kind === 'campPitch') execute('pitchCamp',()=>pitchCamp(s,context(s,'fieldcamp')));
  else if(g.kind==='campContinue')execute('campContinue',()=>campContinue(s,context(s,'fieldcamp')));
  else if(g.kind==='collectionTrade')execute('collectionAction',()=>collectionAction(s,context(s,'collections')));
  else if(g.kind==='landmarkStudy')execute('landmarkStudy',()=>landmarkStudy(s,context(s,'landmarks')));
  else if (g.kind === 'talk') execute('acceptWork',()=>acceptWork(s));
  else if (g.kind === 'provision') execute('provisions',()=>provisions(s, context(s, 'body')));
  else if (g.kind === 'eat') execute('eat',()=>eat(s,context(s,'supply')));
  else if (g.kind === 'brothCook') execute('brothCookAction',()=>brothCookAction(s,context(s,'hearth-food')));
  else if (g.kind === 'brothEat') execute('brothEatAction',()=>brothEatAction(s,context(s,'hearth-food')));
  else if (g.kind === 'brothLearn') execute('brothLesson',()=>brothLesson(s,context(s,'hearth-food')));
  else if (g.kind === 'forage') execute('forageTick',()=>forageTick(s,context(s,'supply')));
  else if (g.kind === 'assist') execute('assistanceAction',()=>assistanceAction(s,context(s,'intentions')));
  else if(g.kind==='patientClinic')execute('patientClinicAction',()=>patientClinicAction(s,context(s,'injured-party')));
  else if (g.kind === 'work') execute('workTick',()=>workTick(s,context(s,'work')));
  else if(g.kind==='propertyAid')execute('propertyAidAction',()=>propertyAidAction(s,context(s,'property-aid')));
  else if(g.kind==='propertyGift')execute('propertyGiftAction',()=>propertyGiftAction(s,context(s,'property-gifts')));
  else if(g.kind==='propertyBuy')execute('buyProperty',()=>buyProperty(s,context(s,'property')));
  else if(g.kind==='propertyContract')execute('propertyContractAction',()=>propertyContractAction(s,context(s,'property-contracts')));
  else if(g.kind==='propertyRepair')execute('repairProperty',()=>repairProperty(s,context(s,'property')));
  else if(g.kind==='craftStudy')execute('craftStudyAction',()=>craftStudyAction(s,{...context(s,'craft-practice'),craftBench:world=>workspaceAccess(world,context(world,'property'))}));
  else if(['petBoard','petRetrieve','petRecover','petCall'].includes(g.kind))execute('petBoardingAction',()=>petBoardingAction(s,context(s,'pet-passage')));
  else if(g.kind==='petTransfer')execute('petTransferAction',()=>petTransferAction(s,context(s,'pet-transfer')));
  else if(['petPackFit','petPackLoad','petPackUnload'].includes(g.kind))execute('packPetAction',()=>packPetAction(s,context(s,'pack-pets')));
  else if(['clothingBuy','clothingDress','clothingSell'].includes(g.kind))execute('clothingAction',()=>clothingAction(s,context(s,'practical-clothing')));
  else if(g.kind==='navReturn')execute('finishNavigationReturn',()=>finishNavigationReturn(s,context(s,'navigation-memory')));
  else if(g.kind.startsWith('rope'))execute('navigationAction',()=>navigationAction(s,context(s,'navigation-tools')));
  else if(['forgeSupply','forgeWork','forgeLearn','forgeBuy'].includes(g.kind))execute('forgeAction',()=>forgeAction(s,{...context(s,'forging'),workspaceAccess:world=>workspaceAccess(world,context(world,'property'))}));
  else if(['refitMeet','refitMaterial','refitWork'].includes(g.kind))execute('refitAction',()=>refitAction(s,context(s,'knife-refit')));
  else if(['itemRepairMeet','itemRepairMaterial','itemRepairWork','itemGearSwap'].includes(g.kind))execute('itemRepairAction',()=>itemRepairAction(s,context(s,'item-wear')));
  else if(['bodyMaterial','bodyMaterialSale'].includes(g.kind))execute('biomaterialAction',()=>biomaterialAction(s,context(s,'animal-materials')));
  else if(g.kind==='burialWork')execute('burialAction',()=>burialAction(s,context(s,'remains-cycle')));
  else if(g.kind==='materialWait')execute('materialClientAction',()=>materialClientAction(s));
  else if(['materialCollect','materialReturn'].includes(g.kind))execute('workMaterialDelivery',()=>workMaterialDelivery(s,s.people[h.lineage],context(s,'material-delivery')));
  else if(['toolInspect','toolLearn','toolFit','toolSupply','toolInstall'].includes(g.kind))execute('toolAction',()=>toolAction(s,context(s,'workshop-tools')));
  else if(g.kind==='principleReflect')execute('reflectPrinciple',()=>reflectPrinciple(s,context(s,'principles')));
  else if(g.kind==='rescueHear')execute('hearCaptive',()=>hearCaptive(s,context(s,'dungeon-rescue')));
  else if(['rescueApproach','rescueFree','rescueEscort'].includes(g.kind))execute('rescueAction',()=>rescueAction(s,context(s,'dungeon-rescue')));
  else if(['verdictPetition','verdictReview'].includes(g.kind))execute('verdictReviewAction',()=>verdictReviewAction(s,context(s,'verdict-review')));
  else if(['verdictRecord','verdictWitness'].includes(g.kind))execute('verdictInquiryAction',()=>verdictInquiryAction(s,context(s,'verdict-knowledge')));
  else if(g.kind==='serviceAccept')execute('acceptService',()=>acceptService(s,context(s,'work-orders')));
  else if(g.kind==='workshopTalk')execute('workshopDisputeAction',()=>workshopDisputeAction(s,context(s,'workshop-dispute')));
  else if(g.kind==='serviceSupply')execute('buyServiceTool',()=>buyServiceTool(s,s.workOrders[g.service],context(s,'work-materials')));
  else if(g.kind==='serviceDelay')execute('extendService',()=>extendService(s,context(s,'work-orders')));
  else if(g.kind==='aidPerson')execute('performAid',()=>performAid(s,context(s,'personal-aid')));
  else if(['tavernVisit','tavernLeave'].includes(g.kind))execute('tavernAction',()=>tavernAction(s,context(s,'interiors')));
  else if(g.kind==='hallWorkVisit')execute('visitForWork',()=>visitForWork(s,context(s,'hall-activities')));
  else if(g.kind==='roomBook')execute('bookRoom',()=>bookRoom(s,context(s,'lodging')));
  else if (g.kind === 'factionDuty') execute('factionDuty',()=>factionDuty(s,context(s,'faction-paths')));
  else if (g.kind === 'caravanWait') {h.lastAction='wait';h.goal=null;}
  else if (g.kind === 'caravanRaid') execute('caravanRaid',()=>caravanRaid(s,context(s,'caravans')));
  else if (g.kind === 'leisure') execute('leisureTick',()=>leisureTick(s,context(s,'work')));
  else if (g.kind === 'weatherWait') execute('weatherWait',()=>weatherWait(s,context(s,'weather')));
  else if (g.kind === 'govern') execute('governTick',()=>governTick(s,context(s,'politics')));
  else if (g.kind === 'settle') execute('settleLife',()=>settleLife(s,context(s,'life')));
  else if(g.kind==='shipRecover')execute('shipRecoveryAction',()=>shipRecoveryAction(s,context(s,'ship-recovery')));
  else if(['waystoneFill','waystoneTransfer'].includes(g.kind))execute('waystoneAction',()=>waystoneAction(s,context(s,'waystones')));
  else if(g.kind==='pactTalk')execute('pactTalkAction',()=>pactTalkAction(s,context(s,'branch-pacts')));
  else if(g.kind==='feastJoin')execute('feastAction',()=>feastAction(s,context(s,'local-feasts')));
  else if(['literacyStudy','textAloud','literacySell'].includes(g.kind))execute('literacyAction',()=>literacyAction(s,context(s,'literacy')));
  else if(['libraryProtect','librarySteal'].includes(g.kind))execute('librarySecurityAction',()=>librarySecurityAction(s,context(s,'library-security')));
  else if(['libraryDeposit','libraryWithdraw','libraryLend','libraryBorrow','libraryReturn'].includes(g.kind))execute('libraryAction',()=>libraryAction(s,context(s,'libraries')));
  else if(g.kind.startsWith('fx'))execute('currencyHeroAction',()=>currencyHeroAction(s,g,context(s,'finite-exchange')));
  else if(g.kind.startsWith('castle'))execute('castleHeroAction',()=>castleHeroAction(s,g,context(s,'royal-libraries')));
  else if(['maskSupply','maskWork'].includes(g.kind))execute('serviceSignAction',()=>serviceSignAction(s,s.people[h.lineage],g,{...context(s,'service-masks'),workspaceAccess:world=>workspaceAccess(world,context(world,'property'))}));
  else if(['maskPresent','maskAnswer'].includes(g.kind))execute('serviceRoleHeroAction',()=>serviceRoleHeroAction(s,g,context(s,'service-masks')));
  else if(g.kind.startsWith('cargo'))execute('cargoInquiryHeroAction',()=>cargoInquiryHeroAction(s,g,context(s,'cargo-cases')));
  else if(g.kind.startsWith('hobby'))execute('hobbyHeroAction',()=>hobbyHeroAction(s,g,context(s,'hobby-supply')));
  else if(g.kind.startsWith('farm'))execute('farmingHeroAction',()=>farmingHeroAction(s,g,context(s,'farming')));
  else if(['titlePetition','titleHearing'].includes(g.kind))execute('titleHeroAction',()=>titleHeroAction(s,g));
  else if(g.kind==='willProbate')execute('probateHeroAction',()=>probateHeroAction(s,g));
  else if(['willPaper','willLaw','willBegin','willWrite','willAttest','willCollect','willInvite','willRevoke'].includes(g.kind))execute('willHeroAction',()=>willHeroAction(s,g));
  else if(['publicRepairEnact','publicRepairOffice','publicRepairFile','publicRepairTalk','publicRepairBuy'].includes(g.kind))execute('publicRepairHeroAction',()=>publicRepairHeroAction(s,g));
  else if(['diplomacyAnswer','diplomacySupport'].includes(g.kind))execute('diplomacyHeroAction',()=>diplomacyHeroAction(s,g));
  else if(['decoySupply','decoyWork','decoyRetrieve','decoyGift'].includes(g.kind))execute('decoyAction',()=>decoyAction(s,s.people[h.lineage],g,{...context(s,'noise-decoys'),workspaceAccess:world=>workspaceAccess(world,context(world,'property'))}));
  else if(g.kind==='stealthLesson')execute('stealthLessonAction',()=>{const ok=stealthLessonAction(s,s.people[h.lineage],g);h.goal=null;return ok;});
  else if(['spellTextWrite','spellTextStudy','spellTextGift','scholarCompare','scholarInspect','scholarWrite','scholarLesson','textOrderRequest','textOrderWork','textOrderCollect','textPaper','textWrite','textCopy','textRead','textGift','sequenceWrite'].includes(g.kind))execute('textAction',()=>textAction(s,context(s,'texts')));
  else if(['homeBuildHire','homeBuildWork','homeBuildPay'].includes(g.kind))execute('homeBuildingAction',()=>homeBuildingAction(s,context(s,'home-building')));
  else if(['homeAgree','homeFit','homeStore','homeMaterials'].includes(g.kind))execute('homeAction',()=>homeAction(s,context(s,'homes')));
  else if (g.kind === 'storyAction') execute('storyAction',()=>storyAction(s,g.story,context(s,'stories')));
  else if(g.kind==='textRecover')execute('textRecoveryAction',()=>textRecoveryAction(s,context(s,'paper-fire')));
  else if(g.kind==='assetHire')execute('hireStoreGuard',()=>hireStoreGuard(s,context(s,'asset-risk')));
  else if(g.kind==='assetFortify')execute('fortifyStore',()=>fortifyStore(s,context(s,'asset-risk')));
  else if(g.kind==='assetEvacuate')execute('evacuateStore',()=>evacuateStore(s,{...context(s,'asset-risk'),recoverCargo}));
  else if(g.kind==='patronOffer')execute('acceptPatronage',()=>acceptPatronage(s,context(s,'patronage')));
  else if(g.kind==='patronStock')execute('patronStock',()=>patronStock(s,context(s,'patronage')));
  else if(g.kind==='productionReview')execute('reviewProduction',()=>reviewProduction(s,context(s,'production-finance')));
  else if(g.kind==='productionFund')execute('fundProduction',()=>fundProduction(s,context(s,'production-finance')));
  else if(g.kind==='productionPayout')execute('collectProduction',()=>collectProduction(s,context(s,'production-finance')));
  else if(g.kind==='causewayWork')execute('causewayAction',()=>{const ok=causewayAction(s,s.people[h.lineage],g,context(s,'causeways'));h.goal=null;return ok;});
  else if(g.kind==='socketService')execute('socketAction',()=>{const ok=socketAction(s,s.people[h.lineage],g);h.goal=null;return ok;});
  else if(g.kind==='inheritanceClaim')execute('estateClaimAction',()=>{const ok=estateClaimAction(s,s.people[h.lineage],g,context(s,'estate-claims'));h.goal=null;return ok;});
  else if (g.kind === 'moneyCache') execute('moneyCacheAction',()=>moneyCacheAction(s,context(s,'finances')));
  else if (g.kind === 'routeMap') execute('routeMapAction',()=>routeMapAction(s,context(s,'route-maps')));
  else if (g.kind === 'mapCopy') execute('mapCopyAction',()=>mapCopyAction(s,s.people[h.lineage],g,context(s,'route-maps')));
  else if (g.kind === 'studyCreature') execute('studyBestiaryAction',()=>studyBestiaryAction(s,context(s,'bestiary')));
  else if(g.kind==='sequenceAdvice'){askSequenceWitness(s,s.people[h.lineage],s.people[g.person],g.key,context(s,'mechanism-sequences'));h.goal=null;}
  else if (['layoutMove','layoutSurvey','layoutWait'].includes(g.kind))execute('layoutAction',()=>layoutAction(s,context(s,'delve-layouts')));
  else if (['driveInspect','driveConsent','driveLesson'].includes(g.kind)) execute('driveAction',()=>driveAction(s,context(s,'mechanisms')));
  else if (g.kind === 'mechanism') execute('mechanismAction',()=>mechanismAction(s,context(s,'mechanisms')));
  else if (g.kind === 'mechanismHold') execute('leverHoldAction',()=>leverHoldAction(s,context(s,'mechanisms')));
  else if (g.kind === 'liftWork') execute('liftAction',()=>liftAction(s,context(s,'mechanisms')));
  else if (g.kind === 'dogLesson') execute('dogLessonAction',()=>dogLessonAction(s,context(s,'pet-training')));
  else if (g.kind === 'dogSearch') execute('dogSearchAction',()=>dogSearchAction(s,context(s,'pet-training')));
  else if (g.kind === 'dogFeed') execute('dogFeedAction',()=>dogFeedAction(s,context(s,'pet-training')));
  else if (['fieldCraftSupply','fieldCraftStudy','fieldCraftService'].includes(g.kind)) execute('fieldCraftAction',()=>fieldCraftAction(s,s.people[h.lineage],g,context(s,'field-craft')));
  else if (['creditAsk','creditWait','creditDecide','creditWork'].includes(g.kind)) execute('heroCreditAction',()=>heroCreditAction(s,context(s,'provision-credit')));
  else if (['merchantBuy','merchantSell'].includes(g.kind)) execute('heroMerchantAction',()=>heroMerchantAction(s,context(s,'merchant-trips')));
  else if (g.kind === 'questAction') execute('questAction',()=>questAction(s,h.quests.find(q=>q.id===g.quest),context(s,'quests')));
  else if (g.kind === 'encounter') { const object = a.objects.find(o => o.id === g.object); if (object) encounter(s, object, context(s, 'encounters')); else h.goal = null; }
  else if (g.kind === 'turnin') execute('completeQuest',()=>completeQuest(s, h.quests.find(q => q.id === g.quest)));
  else if (g.kind === 'trade') execute('trade',()=>trade(s));
  else if (g.kind === 'collect') { const object = a.objects.find(o => o.id === g.object); if (object) collect(s, object); else h.goal = null; }
  else if (g.kind === 'expand') execute('expand',()=>expand(s));
  else if (g.kind === 'hunt') { h.combat = g.object; fight(s, a.objects.find(o => o.id === g.object)); }
  else {
    const item = a.objects.find(o => (['loot','relic'].includes(o.kind)||o.kind==='heirloom'&&cacheCollectible(s,o)||o.kind==='supplyCache'&&enabled(s,'supply')&&(canLoadPackCargo(s,o)||o.itemOriginals===1&&cacheCollectible(s,o))) && !o.taken || o.kind === 'herb' && o.count > 0&&stackRoom(s,h.lineage,'herbs',1)>0&&scentPlantKnown(s,h,a,o));
    if (item) goal(s, 'collect', a.id, item.x, `Подобрать: ${item.name}`, 'Полезные находки пригодятся в следующем приключении.', { object: item.id });
    else { h.goal = null; log(s, `${a.name} изучено. Герой запоминает путь и смотрит дальше.`, 'discover'); }
  }
  return s;
  } finally {preparationProgress(s,g);const after=actionProgress(s,g),r=executionResult(h,g,beforeAction,after,s.tick,{attemptBasis:methodRevision(s,g),finiteWaiting:goalReadiness(s,g,{knownRoute},{memory:false}).status==='waiting',...(beforeAction===after&&rejectedBy?{status:'blocked',reason:'Обработчик '+rejectedBy+' отказал без выполненного шага.',retryOn:'target-or-resources'}:{}),...(beforeAction===after&&!h.goal?{status:'blocked',reason:'Шаг завершился отказом без выполненного действия.',retryOn:'related-change'}:{})});if(r.status==='blocked'){deferMethod(h,g,r,methodRevision(s,g),s.tick);if(h.goal===g)h.goal=null;}}
}
export function serialize(s) { return JSON.stringify(observationPayload(rootWorld(s))); }
export function restore(text) {
  const s=validateSave(JSON.parse(text));
  s.actorStates[s.hero.lineage]=s.hero;
  s.hero.actorJournal=s.journal;
  restoreActorBindings(s);
  return s;
}

import {walkingEnergy,legacyArmorDefense,hasArmor} from './modules/armor.js';
