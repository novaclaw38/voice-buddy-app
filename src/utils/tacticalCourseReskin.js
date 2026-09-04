/**
 * Tactical Course Reskin — maps existing course IDs to their Tactical Academy
 * specialization (Wing), commander dialogue, and tool-unlock metadata.
 *
 * Based on Docs 2 & 5 ("Beast Intelligence Division", "Command Hub Dept Selection",
 * "Tool Vault & Month 1 Rewards") and the Master Landing Page Blueprint §3.
 *
 * This module does NOT modify course content — it is a metadata layer that
 * wraps the existing curriculum with tactical framing. The base courses
 * (animals, cooking, weather, gardening, robotics) remain intact for all
 * age bands; the tactical layer is activated for 9+ year olds.
 */

// ── 5 Wings mapping ──────────────────────────────────────────────────────
// Maps course.id → tactical wing metadata
export const TACTICAL_WINGS = {
  robotics: {
    id: 'robotics',
    title: 'ROBOTICS WING',
    tagline: 'Build the Brains',
    rank: 'Jr. Engineer',
    icon: '🤖',
    color: '#00F5FF', // Tactical Teal
    description: 'Logic, Engineering, and the science of building autonomous systems.',
  },
  animals: {
    id: 'beast-intel',
    title: 'BEAST INTELLIGENCE DIVISION',
    tagline: 'Decode the Wild',
    rank: 'Bio-Analyst',
    icon: '🦁',
    color: '#FF8A00', // Alert Orange
    description: 'Biology, Camouflage, and the study of nature\'s high-tech units.',
    parentReportTitle: 'Intelligence Report',
  },
  cooking: {
    id: 'field-rations',
    title: 'FIELD RATIONS OPS',
    tagline: 'Fuel the Mission',
    rank: 'Logistics Officer',
    icon: '🍳',
    color: '#D4AF37', // Academy Gold
    description: 'Chemistry, Nutrition, and the engineering of survival fuel.',
    parentReportTitle: 'Rations Report',
    parentReportFrame: 'Commander [Name] is now a certified Logistics Officer. They can now assist in "Base Fueling" (Meal prep).',
  },
  weather: {
    id: 'env-recon',
    title: 'ENVIRONMENTAL RECON',
    tagline: 'Map the Sector',
    rank: 'Senior Scout',
    icon: '🧭',
    color: '#9D50BB', // Buddy Purple (sub-brand exception)
    description: 'Observation, Navigation, and Atmospheric Intelligence.',
    parentReportTitle: 'Reconnaissance Report',
    parentReportFrame: 'Your child is becoming aware of their environment — a Junior Navigator.',
  },
  gardening: {
    id: 'botany-ops',
    title: 'BOTANY OPS',
    tagline: 'Grow the Future',
    rank: 'Junior Botanist',
    icon: '🌱',
    color: '#27AE60', // Academy Green
    description: 'Sustainability, Botany, and Self-Sustaining Resource Generation.',
    parentReportTitle: 'Sustainment Report',
    parentReportFrame: 'Your child is successfully managing a living system.',
  },
}

// ── Month 1 Missions per Wing ────────────────────────────────────────────
// Maps course.id → array of 4 mission briefings for Month 1
export const MONTH_1_MISSIONS = {
  robotics: [
    {
      id: 'robotics-m1',
      title: 'Operation Neural Uplink',
      objective: 'Understand how machines process information.',
      commanderDialogue: 'Recruit, I need you to think about how a computer "thinks." What are the two types of "words" a computer uses? Hint: they are ON and OFF.',
      offScreenAction: 'Child identifies binary/ON-OFF logic in everyday objects.',
      aar: 'Operative has demonstrated foundational logic gate comprehension.',
    },
  ],
  animals: [
    {
      id: 'beast-intel-m1',
      title: "The Ghost Protocol (Camouflage & Stealth)",
      objective: "Analyze how animals disappear using patterns and shadows.",
      commanderDialogue: 'Recruit, the enemy is everywhere and nowhere. I need you to study the "Chameleon Shift." It\'s the ultimate stealth tech. Your mission: Find one object in your house that is "hiding" in plain sight (same color as the background). Report its coordinates.',
      offScreenAction: 'Child finds an object that matches its surroundings.',
      aar: "Operative analyzed advanced camouflage techniques, identifying the 'Ghost Protocol' in household environments. Stealth rating: Elite.",
    },
    {
      id: 'beast-intel-m2',
      title: 'Sonic Radar (Bats & Dolphins)',
      objective: 'Understanding Echolocation (Biological Sonar).',
      commanderDialogue: 'Field vision is zero. We\'re switching to Sound Logic. Bats use "Echolocation" to map the world. Close your eyes. I\'m going to make a sound, and you tell me which "Sector" (left/right/center) it\'s coming from.',
      offScreenAction: 'Child practices sound localization with eyes closed.',
      aar: 'Operative has mastered biological sonar principles and demonstrated directional hearing acuity.',
    },
    {
      id: 'beast-intel-m3',
      title: 'The Swarm Network (Ants & Bees)',
      objective: 'Teamwork and decentralized communication.',
      commanderDialogue: 'One bot is a target. A million bots is a "Swarm." Ants don\'t have leaders; they have "Signals." Your mission: Organize a "Supply Chain" of 10 items (like socks or toys) from your bed to the door without leaving any gaps.',
      offScreenAction: 'Child organizes items following swarm-like rules.',
      aar: 'Operative has demonstrated emergent coordination theory through practical supply chain management.',
    },
    {
      id: 'beast-intel-m4',
      title: 'Armor & Defense (Turtles & Armadillos)',
      objective: '"Hard-Body" protection.',
      commanderDialogue: 'Sometimes the best offense is a solid shield. Your mission: Design an "Armor Plate" for your favorite toy using only paper and tape. It has to survive a "Drop Test" from your bed.',
      offScreenAction: 'Child builds and tests an armor prototype.',
      aar: 'Operative has demonstrated engineering principles through protective gear design and structural testing.',
    },
  ],
  cooking: [
    {
      id: 'field-rations-m1',
      title: 'The Energy Matrix (The 3 Fuels)',
      objective: 'Learning about Proteins, Carbs, and Fats.',
      commanderDialogue: 'Recruit, a machine with no fuel is just a statue. I\'m uploading the "Energy Matrix." Proteins build the chassis. Carbs power the engines. Fats are the backup batteries. I need a "Fuel Scan" of your kitchen — find one thing with Protein and one with Carbs.',
      offScreenAction: 'Child identifies ingredients in the kitchen.',
      aar: 'Logistics Officer has mastered the Energy Matrix and demonstrated field ration identification skills.',
    },
    {
      id: 'field-rations-m2',
      title: 'Chemical Reaction (The Rise)',
      objective: 'Understanding baking powder/yeast as "Gas Generators."',
      commanderDialogue: 'We\'re doing some "Chemical Engineering." We\'re going to make "Command Cakes" (Pancakes). I want you to watch the "Bubbles" in the batter. Those are gas packets — the secret to a light and fast ration. Report when you see the "Reaction" start.',
      offScreenAction: 'Child observes chemical reactions in cooking.',
      aar: 'Logistics Officer has demonstrated chemical reaction comprehension and successfully operated the Thermal Reactor.',
    },
  ],
  weather: [
    {
      id: 'env-recon-m1',
      title: 'The Perimeter Sweep',
      objective: 'Identifying "Hazards" and "Resources" in a local area.',
      commanderDialogue: 'Recruit, you can\'t defend what you haven\'t mapped. Your mission: Conduct a "Perimeter Sweep" of your back yard or local park. I need you to identify 3 "Natural Obstacles" (rocks, thorns) and 1 "Water Source".',
      offScreenAction: 'Child explores and reports findings.',
      aar: 'Senior Scout conducted a full perimeter sweep and demonstrated advanced situational awareness.',
    },
    {
      id: 'env-recon-m2',
      title: 'Weather Dynamics (Cloud Logic)',
      objective: 'Sensing atmospheric changes.',
      commanderDialogue: 'The weather is a "Tactical Variable." It dictates our mission speed. I need a "Cloud ID" check. Look up. Are the clouds "Infiltration Clouds" (thin/wispy) or "Heavy Support" (thick/dark)? Report the sky status.',
      offScreenAction: 'Child identifies cloud types and weather patterns.',
      aar: 'Senior Scout has demonstrated meteorological analysis and atmospheric change prediction capabilities.',
    },
  ],
  gardening: [
    {
      id: 'botany-m1',
      title: 'The Resource Seed (Planting)',
      objective: 'Understanding the "Genetic Blueprint" of a seed.',
      commanderDialogue: 'Recruit, we\'re starting the "Botany Protocol." Every seed contains a "Hidden Blueprint." Your mission: Deploy one seed into a "Soil Containment Unit" (A pot or cup). Give it 20ml of "Tactical Hydration". Mission starts now.',
      offScreenAction: 'Child plants a seed in a pot.',
      aar: 'Junior Botanist has activated a Hidden Genetic Blueprint and initiated the Germination Protocol.',
    },
    {
      id: 'botany-m2',
      title: 'Photosynthesis (The Solar Grid)',
      objective: 'Understanding leaves as "Solar Panels."',
      commanderDialogue: 'Plants have "Internal Solar Panels." They eat light! Your mission: Move your "Deployment Unit" to the "Primary Solar Zone" (The sunniest spot). If it doesn\'t get UV data, the blueprint won\'t activate.',
      offScreenAction: 'Child moves plant to the sunniest spot.',
      aar: 'Junior Botanist has successfully managed the Living Solar Grid and demonstrated photosynthetic energy conversion awareness.',
    },
  ],
}

// ── Tool Vault definitions (Doc 3: The Tool Vault & Month 1 Rewards) ──────
// Each tool unlocks at Month 1 completion for its wing
export const TOOL_VAULT = {
  robotics: {
    name: 'Signal Analyzer',
    function: 'When in chat, a real-time "Frequency Wave" (Glow-Line) ripples at the bottom, reacting to Buddy\'s voice.',
    tacticalValue: 'Makes the child feel like a Hardware Engineer monitoring a live data stream.',
    icon: '📡',
  },
  animals: {
    name: 'Anatomy Scanner',
    function: 'Digital magnifying lens that reveals a "Sketch/Schematic" of the animal\'s skeleton or muscles underneath.',
    tacticalValue: 'Frames biology as "Organic Engineering."',
    icon: '🔬',
  },
  cooking: {
    name: 'Macro-Overlay',
    function: 'When using the camera to show Buddy a meal, the screen displays floating text tags: [PROTEIN-CORE], [CARB-POWER], [FAT-STILL].',
    tacticalValue: 'Gamifies healthy eating habits.',
    icon: '🍽️',
  },
  weather: {
    name: 'HUD Compass',
    function: 'Permanent compass element at the top of the screen (N/S/E/W) that rotates as the phone rotates.',
    tacticalValue: 'Solidifies the "Specialist Navigator" identity.',
    icon: '🧭',
  },
  gardening: {
    name: 'Time-Traveler',
    function: 'A slider tool for plant photos. Dragging it "simulates" the plant\'s growth over the next 14 days (visual overlay).',
    tacticalValue: 'Teaches patience and long-term planning.',
    icon: '⏳',
  },
}

/**
 * Get tactical wing metadata for a course ID.
 * Falls back to a general training wing if no match.
 */
export function getWingForCourse(courseId) {
  // robotics course already has its own tactical framing in prompts.js
  return TACTICAL_WINGS[courseId] || {
    id: 'general',
    title: 'GENERAL TRAINING',
    tagline: 'Foundation Skills',
    rank: 'Recruit',
    icon: '🎯',
    color: '#00F5FF',
    description: 'Core competencies for all specialists.',
  }
}

/**
 * Get the 4 Month 1 missions for a given course ID.
 */
export function getMonth1Missions(courseId) {
  return MONTH_1_MISSIONS[courseId] || []
}

/**
 * Get the Tool Vault tool for a given course ID.
 */
export function getToolForCourse(courseId) {
  return TOOL_VAULT[courseId] || null
}
