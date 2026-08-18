export const sel = {
    id: 'sel',
    subject: 'sel',
    title: 'Feelings & Friends',
    emoji: '💛',
    color: ['#a16207', '#ca8a04'],
    description: 'Naming feelings, calming down, and getting along',
    lessons: [
      {
        id: 'naming-feelings',
        title: 'Naming My Feelings',
        emoji: '😊',
        ageBand: 'young',
        objective: 'Name three basic feelings and recognize them on a face.',
        steps: [
          {
            type: 'teach',
            narration: 'Everybody has feelings! Happy feels like smiling and warm. Sad feels like a heavy, quiet feeling. Mad feels hot and tight.',
            emoji: '💛',
            fact: 'Happy, sad, and mad are all okay feelings to have — everybody feels them sometimes!',
          },
          {
            type: 'teach',
            narration: 'There\'s one more feeling to learn — scared! Scared feels like a jumpy, shaky feeling, like when you hear a loud surprise noise.',
            emoji: '😨',
            fact: 'Scared is a jumpy, shaky feeling — like when something surprises you. It\'s okay to feel scared sometimes too!',
          },
          {
            type: 'story-build',
            narration: 'Let\'s think about feelings with a little story!',
            beats: [
              {
                prompt: 'Your ice cream fell on the ground! How do you feel?',
                choices: [
                  { text: '😢 Sad', response: 'Yes, that\'s a sad feeling — it\'s okay to feel sad about that.', isIdeal: true },
                  { text: '😠 Mad', response: 'That makes sense too — losing your ice cream can feel frustrating!', isIdeal: true },
                  { text: '😄 Happy', response: 'That\'s an interesting choice — tell Buddy more about that sometime!', isIdeal: false },
                ],
              },
              {
                prompt: 'A loud thunder crash surprised you! How do you feel?',
                choices: [
                  { text: '😨 Scared', response: 'That\'s right — loud surprises can feel scary! It\'s okay to feel that way.', isIdeal: true },
                  { text: '😄 Happy', response: 'That\'s an interesting choice — loud surprises feel scary for a lot of people!', isIdeal: false },
                  { text: '😴 Sleepy', response: 'That\'s an interesting choice — a loud crash usually wakes people up with a jump!', isIdeal: false },
                ],
              },
            ],
          },
          {
            type: 'explore',
            mode: 'match',
            narration: 'Now let\'s match faces to their feeling words!',
            instruction: 'Tap a face, then tap its feeling word!',
            items: [
              { left: '😊', right: 'Happy' },
              { left: '😢', right: 'Sad' },
              { left: '😠', right: 'Mad' },
              { left: '😨', right: 'Scared' },
            ],
          },
          {
            type: 'open-response',
            narration: 'Tell Buddy about a time you felt happy!',
            objective: 'Name a feeling and describe any moment connected to it.',
            rubric: 'The child should name any feeling and give any reason. This is about expression, not accuracy — always respond warmly.',
          },
          {
            type: 'mastery-check',
            narration: 'Let\'s check what you remember!',
            items: [
              { question: 'Which face is "sad"?', options: ['😊 Happy face', '😢 Sad face', '😠 Mad face'], correct: 1, hints: [] },
              { question: 'Which face is "scared"?', options: ['😨 Scared face', '😄 Happy face', '😠 Mad face'], correct: 0, hints: [] },
            ],
          },
        ],
        printSheet: {
          title: 'Naming My Feelings',
          facts: ['Happy, sad, mad, and scared are all okay feelings.', 'It\'s okay to feel more than one feeling at once.', 'Talking about feelings helps us feel better.'],
          colourPrompt: 'Colour the happy, sad, mad, and scared faces!',
          visual: '😊😢😠😨',
        },
      },
      {
        id: 'big-feelings',
        title: 'Big Feelings, Big Solutions',
        emoji: '🌊',
        ageBand: 'middle',
        objective: 'Recognize a big feeling building up and pick a calming strategy to handle it.',
        steps: [
          {
            type: 'teach',
            narration: 'Sometimes feelings get really big — like a wave! When that happens, we can use a calming strategy, like taking deep breaths or counting to five.',
            emoji: '🌊',
            fact: 'Big feelings are normal! Deep breaths, counting to five, or asking for a break can help a big feeling get smaller.',
          },
          {
            type: 'story-build',
            narration: 'Let\'s practice with a story!',
            beats: [
              {
                prompt: 'You\'ve been building a tower for 20 minutes and it just fell down, right before you finished. What do you do?',
                choices: [
                  { text: '😤 Yell and knock over the rest', response: 'That happens to a lot of people! Next time, try taking 3 deep breaths first — it helps the big feeling get smaller before you decide what to do.', isIdeal: false },
                  { text: '🫁 Take 3 deep breaths', response: 'Great choice! Deep breaths help your body calm down so you can think clearly again.', isIdeal: true },
                  { text: '🧱 Start rebuilding right away', response: 'That can work too — sometimes jumping back in helps, as long as the big feeling doesn\'t control what you do next.', isIdeal: true },
                ],
              },
              {
                prompt: 'You\'re waiting in a long line and it feels like it\'s taking forever. You feel worried you\'ll never get to the front. What do you do?',
                choices: [
                  { text: '🔢 Count slowly to five in your head', response: 'Great choice! Counting slowly gives your mind something calm to focus on while you wait.', isIdeal: true },
                  { text: '🤗 Ask a grown-up for a hug', response: 'That works too — asking for comfort when you\'re worried is a great strategy!', isIdeal: true },
                  { text: '😖 Push past everyone in line', response: 'That might make the worried feeling worse, not better — next time, try counting to five instead.', isIdeal: false },
                ],
              },
            ],
          },
          {
            type: 'explore',
            mode: 'match',
            narration: 'Match each feeling to a strategy that could help!',
            instruction: 'Tap a feeling, then tap a strategy!',
            items: [
              { left: '😤 Frustrated', right: '🫁 Deep breaths' },
              { left: '😰 Worried', right: '🔢 Count to five' },
              { left: '😢 Sad', right: '🤗 Ask for a hug' },
            ],
          },
          {
            type: 'practice',
            narration: 'If you feel a big worried feeling building up while waiting, what\'s a good strategy?',
            question: 'Feeling worried while waiting? Try…',
            options: ['🔢 Counting slowly to five', '😖 Pushing past people', '📢 Yelling louder'],
            correct: 0,
            hints: [null, 'Pushing past people usually makes a big feeling bigger, not smaller.', 'Yelling louder usually makes a big feeling bigger, not smaller.'],
          },
          {
            type: 'open-response',
            narration: 'Tell Buddy a strategy you could use when you feel frustrated.',
            objective: 'Name any calming strategy (deep breaths, counting, asking for help, taking a break).',
            rubric: 'The child should name any reasonable calming strategy. Give warm, specific feedback either way.',
          },
          {
            type: 'mastery-check',
            narration: 'Let\'s check what you remember!',
            items: [
              { question: 'What can help calm a big feeling?', options: ['🫁 Deep breaths', '📺 Ignore it forever', '🏃 Run away from everyone'], correct: 0, hints: ['Think about what slows your body down.'] },
              { question: 'Is it okay to feel frustrated?', options: ['✅ Yes, everyone does sometimes', '❌ No, never', '🤷 Only grown-ups feel that'], correct: 0, hints: ['Everybody has big feelings sometimes — even grown-ups!'] },
              { question: 'What can help a worried feeling while waiting?', options: ['🔢 Counting slowly', '😖 Pushing past people', '📢 Yelling'], correct: 0, hints: ['Think about which one gives your mind something calm to focus on.'] },
            ],
          },
        ],
        printSheet: {
          title: 'Big Feelings, Big Solutions',
          facts: ['Big feelings are normal for everyone.', 'Deep breaths and counting to five can help.', 'It\'s okay to ask for help with a big feeling.'],
          colourPrompt: 'Draw a wave, then draw yourself taking a deep breath next to it!',
          visual: '🌊',
        },
      },
      {
        id: 'perspective-taking',
        title: 'Walking in Someone Else\'s Shoes',
        emoji: '👟',
        ageBand: 'old',
        objective: 'Consider another person\'s perspective in a conflict and suggest a fair solution.',
        steps: [
          {
            type: 'teach',
            narration: 'When two people disagree, it helps to think about how the OTHER person feels too — not just how you feel. That\'s called perspective-taking.',
            emoji: '👟',
            fact: 'Perspective-taking means imagining how a situation feels from someone else\'s point of view, not just your own.',
          },
          {
            type: 'story-build',
            narration: 'Let\'s practice with a story about two friends.',
            beats: [
              {
                prompt: 'Jordan and Alex both want to be first in line for the game. Jordan says "I asked first!" Alex says "But I\'ve been waiting longer!" What\'s a fair way to solve this?',
                choices: [
                  { text: '🎲 Flip a coin to decide fairly', response: 'That\'s a fair idea — it treats both people\'s feelings as equally important.', isIdeal: true },
                  { text: '🥇 Jordan should just go first since they asked', response: 'That might feel unfair to Alex, who\'d been waiting a long time — how do you think Alex would feel?', isIdeal: false },
                  { text: '🔄 Take turns going first next time', response: 'That\'s a thoughtful solution — it considers both people\'s feelings over time, not just right now.', isIdeal: true },
                ],
              },
              {
                prompt: 'Maya worked hard on a group project, but her partner Sam barely helped. Maya wants to tell the teacher Sam did nothing. What\'s a thoughtful first step?',
                choices: [
                  { text: '🗣️ Talk to Sam first about how she feels', response: 'That\'s thoughtful — it gives Sam a chance to explain, and Maya a chance to be heard, before anyone else gets involved.', isIdeal: true },
                  { text: '📢 Tell the teacher right away without talking to Sam', response: 'That could work, but Sam might have a reason we don\'t know about yet — how do you think Sam might feel if Maya skipped straight to that?', isIdeal: false },
                  { text: '😤 Redo the whole project alone and say nothing', response: 'That might feel easier in the moment, but it also means Sam never finds out how Maya felt — talking it through usually helps more.', isIdeal: false },
                ],
              },
            ],
          },
          {
            type: 'open-response',
            narration: 'How do you think Alex felt when Jordan said "I asked first"?',
            objective: 'Describe a plausible feeling for Alex (e.g. frustrated, unheard, impatient) with a reason.',
            rubric: 'The child should name a plausible feeling for Alex and connect it to the situation — reasoning matters more than the exact word.',
          },
          {
            type: 'practice',
            narration: 'If Maya talks to Sam first about how she feels, what\'s most likely to happen?',
            question: 'Talking to Sam first is likely to…',
            options: ['💬 Give Sam a chance to explain or help more', '🚫 Make things worse for no reason', '😴 Have no effect at all'],
            correct: 0,
            hints: [null, 'Talking things through usually opens a door, not closes one.', 'Talking things through usually does something — it opens a door for both people.'],
          },
          {
            type: 'mastery-check',
            narration: 'Let\'s check your perspective-taking skills!',
            items: [
              {
                question: 'Your friend seems upset after losing a game. What\'s the most understanding thing to think?',
                options: ['💭 They might feel disappointed — that\'s normal', '😒 They\'re just being dramatic', '🙄 Games don\'t matter, they should get over it'],
                correct: 0,
                hints: ['Try imagining how losing might genuinely feel for them.'],
              },
              {
                question: 'Two kids both want the last swing. What\'s the fairest solution?',
                options: ['⏱️ Take turns with a timer', '💪 Whoever gets there first, forever', '🚫 No one gets to swing'],
                correct: 0,
                hints: ['Think about a solution that considers both kids\' feelings.'],
              },
              {
                question: 'A classmate snaps at you, but you later learn they didn\'t sleep well last night. What\'s the most understanding response?',
                options: ['💭 They might be tired and cranky, not really mad at you', '😠 Snap back at them right away', '🙅 Never talk to them again'],
                correct: 0,
                hints: ['Think about how being tired might affect someone\'s mood, even if it\'s not really about you.'],
              },
            ],
          },
        ],
        printSheet: {
          title: 'Walking in Someone Else\'s Shoes',
          facts: ['Perspective-taking means imagining how someone else feels.', 'Fair solutions consider everyone\'s feelings.', 'Taking turns and compromise help solve conflicts.'],
          colourPrompt: 'Draw two friends shaking hands after solving a disagreement!',
          visual: '🤝',
        },
      },
    ],
  }
