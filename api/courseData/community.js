export const community = {
  id: 'community',
  subject: 'community',
  title: 'Community Helpers',
  emoji: '🤝',
  color: ['#b45309', '#f59e0b'],
  description: 'Jobs, kindness, and the people who help us',
  lessons: [
    {
      id: 'meet-the-helpers',
      title: 'Meet the Helpers',
      emoji: '👩‍🚒',
      ageBand: 'young',
      objective: 'Recognize a few community helpers and say what each one does.',
      steps: [
        {
          type: 'teach',
          narration: 'A firefighter puts out fires and keeps us safe! They wear a big red helmet and drive a loud fire truck.',
          emoji: '👩‍🚒',
          fact: 'A firefighter puts out fires and helps people who are in danger.',
          checkQuestion: 'What does a firefighter do?',
          checkAnswer: 'A firefighter puts out fires and keeps people safe.',
        },
        {
          type: 'teach',
          narration: 'A doctor helps us feel better when we are sick or hurt. They check our ears, our tummy, and give us medicine if we need it.',
          emoji: '🩺',
          fact: 'A doctor helps people feel better when they are sick or hurt.',
          checkQuestion: 'What does a doctor do?',
          checkAnswer: 'A doctor helps people who are sick or hurt feel better.',
        },
        {
          type: 'teach',
          narration: 'A mail carrier brings letters and packages right to your house! They walk or drive all around the neighborhood every day.',
          emoji: '📬',
          fact: 'A mail carrier brings letters and packages to homes.',
          checkQuestion: 'What does a mail carrier bring?',
          checkAnswer: 'A mail carrier brings letters and packages.',
        },
        {
          type: 'explore',
          mode: 'match',
          narration: 'Let\'s match each helper to their job!',
          instruction: 'Tap a helper, then tap what they do!',
          items: [
            { left: '👩‍🚒', right: '🚒' },
            { left: '🩺', right: '💊' },
            { left: '📬', right: '✉️' },
          ],
        },
        {
          type: 'practice',
          narration: 'Who helps you when you are sick?',
          question: 'Who helps you when you are sick?',
          options: ['🩺 The doctor', '👩‍🚒 The firefighter', '📬 The mail carrier'],
          correct: 0,
          hints: [null, 'A firefighter helps with fires, not tummy aches.', 'A mail carrier brings letters, not medicine.'],
        },
        {
          type: 'open-response',
          narration: 'What job would you like to try someday?',
          objective: 'Name any job or helper they find interesting.',
          rubric: 'The child should name any job, helper, or activity. This is about curiosity, not accuracy — always respond warmly and enthusiastically.',
        },
      ],
      printSheet: {
        title: 'Meet the Helpers',
        facts: ['Firefighters put out fires and keep us safe.', 'Doctors help us feel better when we are sick.', 'Mail carriers bring letters and packages.'],
        colourPrompt: 'Colour the firefighter, the doctor, and the mail carrier!',
        visual: '👩‍🚒🩺📬',
      },
    },
    {
      id: 'sharing-and-kindness',
      title: 'Sharing and Kindness',
      emoji: '🤗',
      ageBand: 'middle',
      objective: 'Recognize a moment someone needs help and choose a kind way to respond.',
      steps: [
        {
          type: 'teach',
          narration: 'Being kind means noticing when someone needs help and doing something about it — like sharing, including someone, or lending a hand.',
          emoji: '🤗',
          fact: 'Kindness means noticing when someone needs help and doing something about it.',
          checkQuestion: 'What does being kind mean?',
          checkAnswer: 'Noticing when someone needs help and doing something about it.',
        },
        {
          type: 'story-build',
          narration: 'Let\'s practice with a story!',
          beats: [
            {
              prompt: 'Your friend forgot their lunch and looks worried. What do you do?',
              choices: [
                { text: '🥪 Offer to share your lunch', response: 'That\'s a really kind choice! Sharing what you have helps a friend feel less worried.', isIdeal: true },
                { text: '🙊 Eat your lunch and say nothing', response: 'That happens sometimes! Next time, try offering to share — it can turn a worried moment into a good one.', isIdeal: false },
                { text: '🧑‍🏫 Tell a teacher your friend needs help', response: 'That\'s a thoughtful choice too — grown-ups can help find a solution when you\'re not sure what to do.', isIdeal: true },
              ],
            },
            {
              prompt: 'A new student is sitting alone at recess and looks unsure where to go. What do you do?',
              choices: [
                { text: '👋 Invite them to play with you', response: 'Wonderful choice! Inviting someone in is one of the kindest things you can do.', isIdeal: true },
                { text: '🤷 Keep playing with your usual friends', response: 'That\'s okay too, but next time try saying hi — a new friend might really appreciate it!', isIdeal: false },
                { text: '❓ Ask them what games they like', response: 'Great idea! Asking questions is a friendly way to help someone feel welcome.', isIdeal: true },
              ],
            },
          ],
        },
        {
          type: 'explore',
          mode: 'sort',
          narration: 'Let\'s sort these actions into kind and unkind!',
          instruction: 'Tap each action and put it in the right bucket!',
          items: [
            { text: '🤝 Sharing your crayons' },
            { text: '😤 Grabbing a toy without asking' },
            { text: '👂 Listening when a friend is sad' },
            { text: '🙅 Leaving someone out on purpose' },
          ],
          buckets: ['Kind', 'Unkind'],
        },
        {
          type: 'open-response',
          narration: 'Tell Buddy about a time you were kind to someone, or someone was kind to you.',
          objective: 'Describe any moment of kindness, given or received.',
          rubric: 'The child should describe any kind act, however small. This is about reflection, not precision. Always respond warmly.',
        },
        {
          type: 'mastery-check',
          narration: 'Let\'s check what you remember!',
          items: [
            { question: 'A friend forgot their lunch. What\'s a kind thing to do?', options: ['🥪 Offer to share', '🙊 Ignore them', '😤 Tell them to go hungry'], correct: 0, hints: ['Think about what would make your friend feel less worried.'] },
            { question: 'A new kid is sitting alone. What\'s a kind thing to do?', options: ['👋 Invite them to play', '🤷 Walk away', '🙅 Pretend not to see them'], correct: 0, hints: ['Think about what would help someone feel welcome.'] },
          ],
        },
      ],
      printSheet: {
        title: 'Sharing and Kindness',
        facts: ['Kindness means noticing when someone needs help.', 'Sharing and including others are kind actions.', 'Small kind acts can make a big difference.'],
        colourPrompt: 'Draw yourself sharing something with a friend!',
        visual: '🤗',
      },
    },
    {
      id: 'working-together',
      title: 'Working Together',
      emoji: '🏙️',
      ageBand: 'old',
      objective: 'Explain how different community jobs depend on one another and propose a fair way to resolve a disagreement.',
      steps: [
        {
          type: 'teach',
          narration: 'A community is like a team — every job depends on other jobs to work well. A farmer grows food, a truck driver carries it to stores, and a shopkeeper sells it to families. If one job stopped, the others would have a harder time too!',
          emoji: '🏙️',
          fact: 'Community jobs depend on each other — like a farmer growing food that a truck driver delivers to a store.',
          checkQuestion: 'Why do community jobs depend on each other?',
          checkAnswer: 'Because each job relies on other jobs to get their work done, like a farmer needing a truck driver to deliver food.',
        },
        {
          type: 'story-build',
          narration: 'Let\'s think through a disagreement between two neighbors.',
          beats: [
            {
              prompt: 'Two neighbors both want to use the community garden plot this weekend — one to plant vegetables, one to host a birthday picnic. How could they solve this fairly?',
              choices: [
                { text: '🗓️ Split the weekend into time slots for each', response: 'That\'s a fair solution — it lets both neighbors use the space without anyone missing out entirely.', isIdeal: true },
                { text: '🥇 Whoever asked first gets the whole weekend', response: 'That could work, but how might the other neighbor feel about getting nothing at all? A compromise might work better for both.', isIdeal: false },
                { text: '🤝 Talk it through and find a plan that works for both', response: 'Excellent thinking — talking it through usually finds a solution neither person thought of alone.', isIdeal: true },
              ],
            },
            {
              prompt: 'The town is deciding whether to spend money fixing the library roof or adding new streetlights, and can only afford one this year. How should the community decide fairly?',
              choices: [
                { text: '🗳️ Let community members vote on it', response: 'That\'s a fair approach — it gives everyone in the community a say in the decision.', isIdeal: true },
                { text: '👑 Let the mayor decide alone with no input', response: 'That might be fast, but how would people feel if a decision that affects everyone was made without asking them?', isIdeal: false },
                { text: '📋 Gather facts about which need is more urgent, then decide', response: 'Smart approach — understanding the real need behind each option helps make a fairer decision.', isIdeal: true },
              ],
            },
          ],
        },
        {
          type: 'explore',
          mode: 'sequence',
          narration: 'Let\'s put the steps of getting bread to your table in order!',
          instruction: 'Tap the steps in the order they happen!',
          items: ['🌾 Farmer grows wheat', '🏭 Factory turns wheat into flour', '🍞 Baker bakes the bread', '🚚 Truck driver delivers it to the store'],
        },
        {
          type: 'open-response',
          narration: 'Pick two community jobs and explain, in your own words, how they depend on each other.',
          objective: 'Explain a plausible relationship between two community jobs, in their own words.',
          rubric: 'The child should name two jobs and describe any reasonable way they depend on or help each other. Reasoning and explanation matter more than a single "correct" pair.',
        },
        {
          type: 'mastery-check',
          narration: 'Let\'s check your understanding of how communities work together!',
          items: [
            {
              question: 'Why might a baker depend on a farmer?',
              options: ['🌾 The farmer grows the wheat used to make flour', '🚒 The farmer puts out fires at the bakery', '📬 The farmer delivers the mail'],
              correct: 0,
              hints: ['Think about what ingredient bread needs, and where it comes from.'],
            },
            {
              question: 'Two neighbors disagree about how to use a shared space. What\'s the fairest first step?',
              options: ['🗣️ Talk it through together', '😤 Whoever is louder wins', '🚫 No one gets to use it, forever'],
              correct: 0,
              hints: ['Think about a solution that considers both people\'s needs.'],
            },
            {
              question: 'A town can only afford one project this year. What\'s a fair way to decide?',
              options: ['🗳️ Let the community have a say, like a vote', '👑 One person decides alone with no input', '🎲 Flip a coin without any discussion'],
              correct: 0,
              hints: ['Think about which option gives everyone affected a chance to be heard.'],
            },
          ],
        },
      ],
      printSheet: {
        title: 'Working Together',
        facts: ['Community jobs depend on each other, like farmers and truck drivers.', 'Fair solutions consider everyone\'s needs.', 'Talking things through helps solve community disagreements.'],
        colourPrompt: 'Draw a map of your community with your favorite helpers on it!',
        visual: '🏙️',
      },
    },
  ],
}
