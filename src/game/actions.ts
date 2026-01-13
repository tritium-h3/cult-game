// actions.ts
import { Outcome, Follower, GameState, City, Action, ActionMap } from "./types";
import { getCityById } from "./world";

// ============================================================================
// OUTCOME TYPES & SERIALIZATION
// ============================================================================

type OutcomeData = 
    | { type: 'NoOutcome' }
    | { type: 'UnlockAction'; city:  string; actionId: string }
    | { type: 'GainSkill'; skill: string }
    | { type: 'GainTrait'; trait: string }
    | { type: 'AddFollower'; skills: string[] }
    | { type: 'MultiEffect'; effects: OutcomeData[] };

interface OutcomeWithData extends Outcome {
    _data: OutcomeData;
}

// ============================================================================
// HELPERS
// ============================================================================

const hasSkill = (follower: Follower, skill: string) => follower.skills.includes(skill);

// ============================================================================
// OUTCOME FACTORIES
// ============================================================================

const outcomes = {
    noOutcome: (): OutcomeWithData => ({
        id: "no-outcome",
        odds: () => 1,
        enact: () => {},
        getDescription: (_follower: Follower) => "Nothing of note happens.",
        _data: { type: 'NoOutcome' }
    }),

    unlockAction: (city: string, actionId: string, description: string): OutcomeWithData => ({
        id: `unlock-${actionId}-${city}`,
        odds: () => 1,
        enact: (_follower: Follower, gameState: GameState) => {
            if (gameState.map) {
                const cityObj = getCityById(city);
                if (cityObj) {
                    const actionFactory = (actions as any)[actionId];
                    if (actionFactory) {
                        gameState.map[city].push(actionFactory(cityObj));
                    }
                }
            }
        },
        getDescription: () => description,
        _data: { type: 'UnlockAction', city, actionId }
    }),

    gainSkill: (skill: string, description: string): OutcomeWithData => ({
        id: `gain-skill-${skill}`,
        odds: () => 1,
        enact: (follower: Follower) => {
            if (!follower.skills.includes(skill)) {
                follower.skills.push(skill);
            }
        },
        getDescription: () => description,
        _data: { type: 'GainSkill', skill }
    }),

    gainTrait: (trait: string, description: string): OutcomeWithData => ({
        id: `gain-trait-${trait}`,
        odds: () => 1,
        enact: (follower: Follower) => {
            if (!follower.traits.includes(trait)) {
                follower.traits.push(trait);
            }
        },
        getDescription: () => description,
        _data: { type: 'GainTrait', trait }
    }),

    addFollower: (skills: string[], description: string): OutcomeWithData => ({
        id: `add-follower-${skills.join('-')}`,
        odds: () => 1,
        enact: (_follower: Follower, gameState: GameState) => {
            const newFollower: Follower = {
                id: `follower-${Date.now()}`,
                name: "[GENERATED_NAME]",
                background: "[GENERATED_BACKGROUND]",
                location: _follower.location,
                traits: [],
                skills: skills
            };
            gameState.followers.push(newFollower);
        },
        getDescription: () => description,
        _data: { type: 'AddFollower', skills }
    }),

    multiEffect: (effects: OutcomeWithData[], description: string): OutcomeWithData => ({
        id: `multi-${effects.map(e => e.id).join('-')}`,
        odds: () => 1,
        enact: (follower: Follower, gameState: GameState) => {
            effects.forEach(effect => effect.enact(follower, gameState));
        },
        getDescription: () => description,
        _data: { type: 'MultiEffect', effects: effects.map(e => e._data) }
    })
};

// ============================================================================
// ACTION FACTORIES
// ============================================================================

export const actions = {
    // TIER 0 - Starting Actions
    
    attendCulturalEvents: (city: City): Action => ({
        id: "attend-cultural-events",
        title: "Attend Cultural Events",
        description: `Mingle with ${city.name}'s cultural scene at galleries, readings, and performances.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "performAtOpenMic", "You're invited to perform at an open mic night."),
                    outcomes.gainSkill("networking", "You develop networking skills.")
                ], "You make valuable connections in the cultural scene."),
                odds: (f) => hasSkill(f, 'networking') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "joinArtCollective", "An art collective invites you to join."),
                    outcomes.gainSkill("persuasion", "You develop persuasion skills.")
                ], "You charm the local artists and gain their trust."),
                odds: (f) => hasSkill(f, 'persuasion') ? 3 : 1
            },
            {
                ...outcomes.unlockAction(city.id, "organizePrivateSalon", "You could organize a private salon."),
                odds: () => 2
            },
            {
                ...outcomes.noOutcome(),
                odds: (f) => hasSkill(f, 'networking') || hasSkill(f, 'persuasion') ? 1 : 3
            }
        ]
    }),

    researchAtLibraries: (city: City): Action => ({
        id: "research-at-libraries",
        title: "Research at Libraries",
        description: `Search ${city.name}'s public archives and university collections for occult knowledge.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "studyForbiddenSection", "You find references to a forbidden section."),
                    outcomes.gainSkill("research", "You develop research skills.")
                ], "You uncover references to restricted texts."),
                odds: (f) => hasSkill(f, 'research') ? 4 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "studyForbiddenSection", "The forbidden section calls to you."),
                    outcomes.unlockAction(city.id, "befriendOccultBookshopOwner", "You learn of an occult bookshop.")
                ], "Your occult knowledge reveals hidden patterns in the texts."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 3 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "interviewLocalHistorians", "Local historians might know more."),
                odds: () => 2
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    exploreHistoricSites: (city: City): Action => ({
        id: "explore-historic-sites",
        title: "Explore Historic Sites",
        description: `Visit ${city.name}'s old churches, cemeteries, and forgotten places.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "investigateOldChurch", "An old church shows signs of occult activity."),
                    outcomes.unlockAction(city.id, "mapUndergroundTunnels", "You discover entrances to underground tunnels.")
                ], "Your analytical eye reveals hidden patterns."),
                odds: (f) => hasSkill(f, 'analysis') ? 3 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "mapUndergroundTunnels", "You find tunnel entrances."),
                odds: (f) => hasSkill(f, 'physical') ? 2 : 1
            },
            {
                ...outcomes.gainTrait("suspicious", "You attract unwanted attention."),
                odds: (f) => hasSkill(f, 'stealth') ? 0 : 2
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    visitCoffeeShops: (city: City): Action => ({
        id: "visit-coffee-shops",
        title: "Visit Coffee Shops",
        description: `Network in ${city.name}'s cafes and intellectual hangouts.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "recruitSympatheticStudent", "You could recruit someone interested."),
                    outcomes.gainSkill("persuasion", "You develop persuasion skills.")
                ], "You find someone sympathetic to esoteric ideas."),
                odds: (f) => hasSkill(f, 'persuasion') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "befriendOccultBookshopOwner", "You hear of an occult bookshop owner."),
                    outcomes.gainSkill("networking", "You develop networking skills.")
                ], "Your connections lead you to the occult underground."),
                odds: (f) => hasSkill(f, 'networking') ? 3 : 1
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    // TIER 1 - First Discoveries
    
    performAtOpenMic: (city: City): Action => ({
        id: "perform-at-open-mic",
        title: "Perform at Open Mic Night",
        description: `Showcase your talents to ${city.name}'s artistic community.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "organizePrivateSalon", "You could organize a private salon."),
                    outcomes.gainSkill("performance", "You develop performance skills.")
                ], "Your performance captivates the audience."),
                odds: (f) => hasSkill(f, 'performance') ? 4 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "recruitSympatheticStudent", "Someone approaches you after."),
                    outcomes.unlockAction(city.id, "organizePrivateSalon", "You could gather these people.")
                ], "Your charisma draws both followers and opportunities."),
                odds: (f) => hasSkill(f, 'persuasion') && hasSkill(f, 'performance') ? 2 : 0
            },
            {
                ...outcomes.gainTrait("self-doubting", "The poor reception shakes your confidence."),
                odds: (f) => hasSkill(f, 'performance') ? 1 : 3
            }
        ]
    }),

    joinArtCollective: (city: City): Action => ({
        id: "join-art-collective",
        title: "Join Art Collective",
        description: `Become part of ${city.name}'s underground art scene.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "organizeExhibition", "The collective wants to exhibit."),
                    outcomes.unlockAction(city.id, "befriendOccultBookshopOwner", "An artist knows an occult bookshop.")
                ], "Your networking opens new doors."),
                odds: (f) => hasSkill(f, 'networking') ? 3 : 1
            },
            {
                ...outcomes.unlockAction(city.id, "organizePrivateSalon", "You could host a salon."),
                odds: (f) => hasSkill(f, 'persuasion') ? 2 : 1
            },
            {
                ...outcomes.gainTrait("disillusioned", "The collective's politics frustrate you."),
                odds: (f) => hasSkill(f, 'networking') || hasSkill(f, 'persuasion') ? 1 : 3
            }
        ]
    }),

    studyForbiddenSection: (city: City): Action => ({
        id: "study-forbidden-section",
        title: "Study Forbidden Section",
        description: `Access ${city.name}'s restricted occult texts.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "attemptTranslation", "Ancient texts need translation."),
                    outcomes.gainSkill("occult-knowledge", "Your understanding deepens.")
                ], "You unlock forbidden knowledge."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "purchaseRareTexts", "You need these texts."),
                    outcomes.unlockAction(city.id, "attemptTranslation", "Translation is needed.")
                ], "Your linguistic skills reveal secrets."),
                odds: (f) => hasSkill(f, 'languages') ? 3 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("haunted", "What you read haunts you."),
                    outcomes.unlockAction(city.id, "interviewLocalHistorians", "You need context.")
                ], "Unprepared, the texts disturb you deeply."),
                odds: (f) => hasSkill(f, 'occult-knowledge') || hasSkill(f, 'languages') ? 0 : 3
            },
            {
                ...outcomes.gainTrait("marked", "The librarians ban you."),
                odds: (f) => hasSkill(f, 'stealth') ? 0 : 1
            }
        ]
    }),

    // Continue with more// Add these to the actions object after studyForbiddenSection:

    // TIER 1 (continued)

    interviewLocalHistorians: (city: City): Action => ({
        id: "interview-local-historians",
        title: "Interview Local Historians",
        description: `Speak with ${city.name}'s historians about local legends and forgotten history.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "accessUniversityArchives", "They grant you archive access."),
                    outcomes.unlockAction(city.id, "investigateOldChurch", "They mention an interesting church.")
                ], "Your research skills impress them."),
                odds: (f) => hasSkill(f, 'research') ? 4 : 1
            },
            {
                ...outcomes.unlockAction(city.id, "accessUniversityArchives", "They open doors for you."),
                odds: (f) => hasSkill(f, 'persuasion') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("watched", "They seem suspicious of your interest."),
                    outcomes.unlockAction(city.id, "researchOccultSocieties", "Their wariness confirms something.")
                ], "Your occult knowledge makes them nervous."),
                odds: (f) => hasSkill(f, 'occult-knowledge') && !hasSkill(f, 'persuasion') ? 2 : 0
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    investigateOldChurch: (city: City): Action => ({
        id: "investigate-old-church",
        title: "Investigate Old Church",
        description: `Explore an abandoned church in ${city.name} with a dark reputation.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "accessSealedBasement", "You understand what lies beneath."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "accessSealedBasement", "You find the way in."),
                    outcomes.unlockAction(city.id, "mapUndergroundTunnels", "Tunnels connect to it.")
                ], "Your stealth reveals hidden passages."),
                odds: (f) => hasSkill(f, 'stealth') ? 3 : 1
            },
            {
                ...outcomes.unlockAction(city.id, "documentStrangeSymbols", "Symbols cover the walls."),
                odds: (f) => hasSkill(f, 'analysis') ? 2 : 0
            },
            {
                ...outcomes.gainTrait("unnerved", "Something feels wrong here."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 0 : 2
            }
        ]
    }),

    mapUndergroundTunnels: (city: City): Action => ({
        id: "map-underground-tunnels",
        title: "Map Underground Tunnels",
        description: `Navigate ${city.name}'s forgotten underground passages.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "discoverHiddenChamber", "You find a sealed chamber."),
                    outcomes.unlockAction(city.id, "accessSealedBasement", "The tunnels connect everywhere.")
                ], "Your physical prowess and analytical mind map everything."),
                odds: (f) => hasSkill(f, 'physical') && hasSkill(f, 'analysis') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "discoverHiddenChamber", "You find something hidden."),
                odds: (f) => hasSkill(f, 'physical') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("claustrophobic", "The tunnels terrify you now."),
                ], "You get lost in the dark for hours."),
                odds: (f) => hasSkill(f, 'physical') ? 1 : 4
            },
            {
                ...outcomes.unlockAction(city.id, "accessUniversityArchives", "You find old surveyor records."),
                odds: (f) => hasSkill(f, 'analysis') ? 2 : 0
            }
        ]
    }),

    recruitSympatheticStudent: (city: City): Action => ({
        id: "recruit-sympathetic-student",
        title: "Recruit Sympathetic Student",
        description: `Bring a curious student into your circle.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.addFollower(["research"], "A research-focused student joins."),
                    outcomes.unlockAction(city.id, "organizePrivateSalon", "They suggest gathering others.")
                ], "Your persuasion wins them over completely."),
                odds: (f) => hasSkill(f, 'persuasion') ? 3 : 1
            },
            {
                ...outcomes.addFollower(["networking"], "A socially-connected student joins."),
                odds: (f) => hasSkill(f, 'networking') ? 2 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("investigated", "They reported you to authorities."),
                ], "They were horrified and went to the police."),
                odds: (f) => hasSkill(f, 'persuasion') || hasSkill(f, 'networking') ? 1 : 3
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    befriendOccultBookshopOwner: (city: City): Action => ({
        id: "befriend-occult-bookshop-owner",
        title: "Befriend Occult Bookshop Owner",
        description: `Build a relationship with ${city.name}'s occult underground.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "purchaseRareTexts", "They offer you their private collection."),
                    outcomes.unlockAction(city.id, "researchOccultSocieties", "They know the history.")
                ], "Your networking and knowledge impress them deeply."),
                odds: (f) => hasSkill(f, 'networking') && hasSkill(f, 'occult-knowledge') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "purchaseRareTexts", "They'll sell to you... for a price."),
                odds: (f) => hasSkill(f, 'wealth') ? 2 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "studyForbiddenSection", "They guide you to sources."),
                    outcomes.unlockAction(city.id, "researchOccultSocieties", "They share their knowledge.")
                ], "Your mutual interest creates a bond."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 3 : 0
            },
            {
                ...outcomes.noOutcome(),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 0 : 2
            }
        ]
    }),

    // TIER 2 - Building the Network

    organizePrivateSalon: (city: City): Action => ({
        id: "organize-private-salon",
        title: "Organize Private Salon",
        description: `Host intimate gatherings to share esoteric ideas.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "establishDiscussionGroup", "The group coheres into something more."),
                    outcomes.gainTrait("devoted", "Your followers deepen their commitment.")
                ], "Your persuasion and following create something powerful."),
                odds: (f, gs) => hasSkill(f, 'persuasion') && (gs.followers.length >= 2) ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "organizeExhibition", "The salon inspires artistic collaboration."),
                odds: (f) => hasSkill(f, 'performance') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("skeptical", "One follower begins to doubt."),
                    outcomes.unlockAction(city.id, "establishDiscussionGroup", "But others remain committed.")
                ], "Without enough followers, tensions emerge."),
                odds: (f, gs) => hasSkill(f, 'persuasion') && (gs.followers.length < 2) ? 3 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("compromised", "An outsider infiltrated the salon."),
                ], "Your lack of caution let someone dangerous in."),
                odds: (f) => hasSkill(f, 'stealth') || hasSkill(f, 'analysis') ? 0 : 2
            }
        ]
    }),

    accessUniversityArchives: (city: City): Action => ({
        id: "access-university-archives",
        title: "Access University Archives",
        description: `Dive into ${city.name}'s academic occult collections.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "researchOccultSocieties", "The archives hold everything."),
                odds: (f) => hasSkill(f, 'research') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "researchOccultSocieties", "You find restricted materials."),
                    outcomes.unlockAction(city.id, "studyRitualTheory", "Theoretical texts abound.")
                ], "Your stealth grants access to everything."),
                odds: (f) => hasSkill(f, 'stealth') ? 3 : 1
            },
            {
                ...outcomes.unlockAction(city.id, "purchaseRareTexts", "You find catalog references."),
                odds: (f) => hasSkill(f, 'research') ? 2 : 1
            },
            {
                ...outcomes.gainTrait("blacklisted", "Security caught you in restricted areas."),
                odds: (f) => hasSkill(f, 'stealth') ? 0 : 2
            }
        ]
    }),

    accessSealedBasement: (city: City): Action => ({
        id: "access-sealed-basement",
        title: "Access Sealed Basement",
        description: `Enter the sealed space beneath the old church.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "documentStrangeSymbols", "Symbols cover every surface."),
                odds: (f) => hasSkill(f, 'stealth') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "documentStrangeSymbols", "You understand their meaning immediately."),
                ], "Your occult knowledge reveals the truth."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 3 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "documentStrangeSymbols", "You break in forcefully."),
                    outcomes.gainTrait("wanted", "The building owner reports the break-in.")
                ], "Brute force works, but draws attention."),
                odds: (f) => hasSkill(f, 'physical') ? 2 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("obsessed", "What you saw below consumes your thoughts."),
                    outcomes.unlockAction(city.id, "studyRitualTheory", "You must understand this.")
                ], "Unprepared, the basement overwhelms you."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 0 : 2
            }
        ]
    }),

    discoverHiddenChamber: (city: City): Action => ({
        id: "discover-hidden-chamber",
        title: "Discover Hidden Chamber",
        description: `Uncover a sealed chamber in the tunnels.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "documentStrangeSymbols", "The chamber is covered in symbols."),
                ], "Your knowledge and strength reveal everything."),
                odds: (f) => hasSkill(f, 'occult-knowledge') && hasSkill(f, 'physical') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "researchOccultSocieties", "Historical context becomes clear."),
                odds: (f) => hasSkill(f, 'analysis') ? 3 : 1
            },
            {
                ...outcomes.gainTrait(Math.random() > 0.5 ? "enlightened" : "terrified", "The chamber changes you."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 2 : 2
            },
            {
                ...outcomes.gainTrait("scarred", "The chamber collapses, injuring you badly."),
                odds: (f) => hasSkill(f, 'physical') ? 0 : 3
            }
        ]
    }),

    purchaseRareTexts: (city: City): Action => ({
        id: "purchase-rare-texts",
        title: "Purchase Rare Texts",
        description: `Acquire forbidden books from private collections.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "studyRitualTheory", "The texts contain ritual knowledge."),
                    outcomes.unlockAction(city.id, "attemptTranslation", "Some texts need translation.")
                ], "Your wealth and knowledge secure the best texts."),
                odds: (f) => hasSkill(f, 'wealth') && hasSkill(f, 'occult-knowledge') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "befriendOccultBookshopOwner", "You need help understanding them."),
                odds: (f) => hasSkill(f, 'wealth') ? 2 : 0
            },
            {
                ...outcomes.gainTrait("indebted", "You borrowed money you can't repay."),
                odds: (f) => hasSkill(f, 'wealth') ? 0 : 3
            },
            {
                ...outcomes.gainTrait("deceived", "The texts are worthless forgeries."),
                odds: (f) => hasSkill(f, 'analysis') ? 0 : 1
            }
        ]
    }),

    organizeExhibition: (city: City): Action => ({
        id: "organize-exhibition",
        title: "Organize Exhibition",
        description: `Mount a public exhibition of esoteric art.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "attractWealthyPatron", "A wealthy patron takes interest."),
                odds: (f) => hasSkill(f, 'networking') && hasSkill(f, 'performance') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "establishDiscussionGroup", "People want to discuss the ideas."),
                odds: (f) => hasSkill(f, 'performance') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "attractWealthyPatron", "Controversy draws attention."),
                    outcomes.gainTrait("notorious", "You're known now, for better or worse.")
                ], "Your work provokes strong reactions."),
                odds: (f) => hasSkill(f, 'performance') && !hasSkill(f, 'networking') ? 2 : 0
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    attemptTranslation: (city: City): Action => ({
        id: "attempt-translation",
        title: "Attempt Translation of Ancient Text",
        description: `Translate obscure texts written in dead languages.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "studyRitualTheory", "The translation reveals ritual knowledge."),
                    outcomes.unlockAction(city.id, "documentStrangeSymbols", "Similar symbols appear everywhere.")
                ], "Your linguistic and occult skills unlock secrets."),
                odds: (f) => hasSkill(f, 'languages') && hasSkill(f, 'occult-knowledge') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "studyRitualTheory", "Partial translation yields some knowledge."),
                odds: (f) => hasSkill(f, 'languages') ? 2 : 0
            },
            {
                ...outcomes.gainTrait("deluded", "You misunderstood everything."),
                odds: (f) => hasSkill(f, 'languages') && !hasSkill(f, 'occult-knowledge') ? 2 : 0
            },
            {
                ...outcomes.noOutcome(),
                odds: (f) => hasSkill(f, 'languages') || hasSkill(f, 'occult-knowledge') ? 0 : 3
            }
        ]
    }),

    // TIER 3 - Convergence (The Threshold)

    establishDiscussionGroup: (city: City): Action => ({
        id: "establish-discussion-group",
        title: "Establish Discussion Group",
        description: `Formalize your followers into a cohesive group.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "mysteryThreshold", "Something emerges from your work together."),
                odds: (f, gs) => (gs.followers.length >= 3) && hasSkill(f, 'persuasion') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "mysteryThreshold", "Your followers gain true understanding."),
                ], "Your occult knowledge elevates the group."),
                odds: (f, gs) => (gs.followers.length >= 2) && hasSkill(f, 'occult-knowledge') ? 3 : 0
            },
            {
                ...outcomes.noOutcome(),
                odds: (f, gs) => gs.followers.length >= 2 ? 2 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("watched", "All members are now monitored."),
                ], "Without stealth, you've been infiltrated."),
                odds: (f, gs) => gs.followers.some((follower: Follower) => hasSkill(follower, 'stealth')) ? 0 : 2
            }
        ]
    }),

    researchOccultSocieties: (city: City): Action => ({
        id: "research-occult-societies",
        title: "Research Occult Societies",
        description: `Uncover the hidden history of occult organizations.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "mysteryThreshold", "You understand the pattern."),
                odds: (f) => hasSkill(f, 'research') && hasSkill(f, 'occult-knowledge') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("paranoid", "What you learned terrifies you."),
                    outcomes.unlockAction(city.id, "mysteryThreshold", "But you can't stop now.")
                ], "Dangerous knowledge comes at a cost."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 3 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "studyRitualTheory", "More research is needed."),
                odds: (f) => hasSkill(f, 'research') ? 2 : 0
            },
            {
                ...outcomes.gainTrait("monitored", "Your research attracted attention."),
                odds: (f) => hasSkill(f, 'stealth') ? 0 : 2
            }
        ]
    }),

    documentStrangeSymbols: (city: City): Action => ({
        id: "document-strange-symbols",
        title: "Document Strange Symbols",
        description: `Record and analyze the occult symbols you've found.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "mysteryThreshold", "The symbols reveal their meaning."),
                odds: (f) => hasSkill(f, 'occult-knowledge') && hasSkill(f, 'analysis') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "attemptTranslation", "The symbols are a language."),
                    outcomes.unlockAction(city.id, "studyRitualTheory", "They describe rituals.")
                ], "Perfect documentation opens new paths."),
                odds: (f) => hasSkill(f, 'analysis') ? 3 : 1
            },
            {
                ...outcomes.noOutcome(),
                odds: (f) => hasSkill(f, 'analysis') ? 0 : 2
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("touched-by-beyond", "The symbols moved. You saw."),
                    outcomes.unlockAction(city.id, "mysteryThreshold", "You cannot unsee this.")
                ], "Without preparation, the symbols affect you directly."),
                odds: (f) => hasSkill(f, 'occult-knowledge') && !hasSkill(f, 'analysis') ? 2 : 0
            }
        ]
    }),

    studyRitualTheory: (city: City): Action => ({
        id: "study-ritual-theory",
        title: "Study Ritual Theory",
        description: `Master the theoretical foundations of occult practice.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "mysteryThreshold", "Theory and practice unite."),
                odds: (f) => hasSkill(f, 'occult-knowledge') && hasSkill(f, 'languages') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "researchOccultSocieties", "Historical context deepens understanding."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 3 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("obsessed", "You can think of nothing else."),
                    outcomes.unlockAction(city.id, "mysteryThreshold", "But you're so close.")
                ], "The knowledge consumes you."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 2 : 0
            },
            {
                ...outcomes.noOutcome(),
                odds: (f) => hasSkill(f, 'research') ? 2 : 1
            }
        ]
    }),

    attractWealthyPatron: (city: City): Action => ({
        id: "attract-wealthy-patron",
        title: "Attract Wealthy Patron",
        description: `Gain the financial backing of someone influential.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "securePrivateMeetingSpace", "They fund your work completely."),
                odds: (f) => hasSkill(f, 'networking') && hasSkill(f, 'persuasion') ? 4 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "establishDiscussionGroup", "They want to join your circle."),
                odds: (f) => hasSkill(f, 'performance') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("compromised", "They have their own agenda."),
                ], "Without discernment, you accepted the wrong patron."),
                odds: (f) => hasSkill(f, 'analysis') ? 0 : 2
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("exposed", "The patron was investigating you."),
                ], "It was a trap all along."),
                odds: (f) => hasSkill(f, 'stealth') || hasSkill(f, 'analysis') ? 0 : 2
            }
        ]
    }),

    securePrivateMeetingSpace: (city: City): Action => ({
        id: "secure-private-meeting-space",
        title: "Secure Private Meeting Space",
        description: `Establish a permanent, private location for your work.`,
        outcomes: [
            {
                ...outcomes.unlockAction(city.id, "mysteryThreshold", "With space and resources, true work begins."),
                odds: () => 4
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 1
            }
        ]
    }),

    mysteryThreshold: (city: City): Action => ({
        id: "mystery-threshold",
        title: "???",
        description: `Something waits beyond the threshold of understanding...`,
        outcomes: [
            {
                ...outcomes.noOutcome(),
                odds: () => 1
            }
        ]
    })
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function prototypeActionsForCity(city: City): Action[] {
    return [
        actions.attendCulturalEvents(city),
        actions.researchAtLibraries(city),
        actions.exploreHistoricSites(city),
        actions.visitCoffeeShops(city)
    ];
}

// Standalone serialization functions
function serializeOutcome(outcome: Outcome): OutcomeData {
    return (outcome as OutcomeWithData)._data;
}

function serializeAction(action: Action): any { 
    return {
        id: action.id,
        title: action.title,
        description: action.description,
        outcomes: action.outcomes.map(serializeOutcome)
    };
}

// Deserialization
export function deserializeOutcome(data: OutcomeData): OutcomeWithData {
    switch (data.type) {
        case 'NoOutcome':
            return outcomes.noOutcome();
        case 'UnlockAction':
            return outcomes.unlockAction(data.city, data.actionId, "[DESCRIPTION]");
        case 'GainSkill':
            return outcomes.gainSkill(data.skill, "[DESCRIPTION]");
        case 'GainTrait':
            return outcomes.gainTrait(data.trait, "[DESCRIPTION]");
        case 'AddFollower':
            return outcomes.addFollower(data.skills, "[DESCRIPTION]");
        case 'MultiEffect':
            return outcomes.multiEffect(
                data.effects.map(deserializeOutcome),
                "[DESCRIPTION]"
            );
        default:
            console.error('Unknown outcome type during deserialization:', data);
            return outcomes.noOutcome();
    }
}

function deserializeAction(data: any): Action {
    const deserializedOutcomes = data.outcomes
        .map(deserializeOutcome)
        .filter((outcome: OutcomeWithData | undefined) => outcome !== undefined);
    
    // Ensure at least one outcome exists (fallback to noOutcome)
    if (deserializedOutcomes.length === 0) {
        console.warn('Action had no valid outcomes after deserialization, adding noOutcome:', data.id);
        deserializedOutcomes.push(outcomes.noOutcome());
    }
    
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        outcomes: deserializedOutcomes as OutcomeWithData[]
    };
}

export function performAction(action: Action, follower: Follower, gameState: GameState): Outcome {
    // Calculate total odds
    const totalOdds = action.outcomes.reduce((sum, outcome) => sum + outcome.odds(follower, gameState), 0);
    const rand = Math.random() * totalOdds;
    let cumulative = 0;

    for (const outcome of action.outcomes) {
        cumulative += outcome.odds(follower, gameState);
        if (rand <= cumulative) {
            return outcome;
        }
    }
    throw new Error("No outcome selected, this should not happen.");
}

export function performCityActions(assignments: { [actionId: string]: string }, actions: Action[], gameState: GameState) : { [actionId: string]: Outcome } {
    const results: { [actionId: string]: Outcome } = {};
    for (const [actionId, followerId] of Object.entries(assignments)) {
        const action = actions.find(a => a.id === actionId);
        if (!action) {
            throw new Error(`Action with id ${actionId} not found in action map.`);
        }
        const follower = gameState.followers.find(f => f.id === followerId);
        if (!follower) {
            throw new Error(`Follower with id ${followerId} not found in game state.`);
        }
        const outcome = performAction(action, follower, gameState);
        results[actionId] = outcome;
    }
    return results;
}

export function enactCityActions(assignments: { [actionId: string]: string }, results: { [actionId: string]: Outcome }, gameState: GameState): void {
    for (const [actionId, outcome] of Object.entries(results)) {
        const followerId = assignments[actionId];
        if (!followerId) {
            throw new Error(`No follower assigned to action ${actionId}.`);
        }
        const follower = gameState.followers.find(f => f.id === followerId);
        if (!follower) {
            throw new Error(`Follower with id ${followerId} not found in game state.`);
        }
        outcome.enact(follower, gameState);
    }
}

// Serialization support for ActionMap
export function serializeActionMap(map: ActionMap): string {
    const serialized: Record<string, any[]> = {};
    for (const [cityId, actions] of Object.entries(map)) {
        serialized[cityId] = actions.map(serializeAction);
    }
    return JSON.stringify(serialized);
}

export function deserializeActionMap(json: string): ActionMap {
    const parsed: Record<string, any[]> = JSON.parse(json);
    const map: ActionMap = {};
    for (const [cityId, serializedActions] of Object.entries(parsed)) {
        map[cityId] = serializedActions.map(deserializeAction);
    }
    return map;
}

/**
 * Complete a week's work: perform actions and increment week
 * Does NOT enact outcomes - that happens in saveGameState
 * @returns Object with results and updated game state
 */
export function completeWeek(
    assignments: Record<string, string>,
    actions: Action[],
    gameState: GameState
): { results: Record<string, Outcome>; updatedState: GameState } {
    // Perform actions to determine outcomes
    const results = performCityActions(assignments, actions, gameState);
    
    // Update week counter
    const updatedState = { ...gameState, week: gameState.week + 1 };
    
    return { results, updatedState };
}

/**
 * Enact outcomes and persist game state to localStorage
 */
export function saveGameState(
    assignments: Record<string, string>,
    results: Record<string, Outcome>,
    gameState: GameState
): void {
    // Enact the outcomes (mutates gameState)
    enactCityActions(assignments, results, gameState);
    
    // Save action map separately using serialization
    if (gameState.map) {
        localStorage.setItem('cultGameActionMap', serializeActionMap(gameState.map));
    }
    // Save game state without map (map is saved separately)
    const { map, ...stateToSave } = gameState;
    localStorage.setItem('cultGameState', JSON.stringify(stateToSave));
}