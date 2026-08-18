export const music = {
    id: 'music',
    subject: 'creativity',
    title: 'Music & Instruments',
    emoji: '🎵',
    color: ['#be185d', '#db2777'],
    description: 'Discover how instruments make sound and find the rhythm inside you',
    lessons: [
      {
        id: 'sounds',
        title: 'How Instruments Make Sound',
        emoji: '🎸',
        steps: [
          {
            type: 'explain',
            narration: 'Every instrument makes sound the same magic way — something wiggles super fast! We call that wiggle a vibration.',
            narrations: [
              'Every instrument makes sound the same magic way — something wiggles super fast! We call that wiggle a vibration.',
              'Pluck a guitar string and watch closely — it wiggles back and forth so fast it blurs! That wiggle is called a vibration, and it\'s how every sound is made.',
            ],
            narrationYoung: 'Instruments make sound by wiggling really, really fast! That wiggle is called a vibration!',
            emoji: '🪕',
            fact: 'Sound is made when something vibrates so fast our ears can hear it — a guitar string might wiggle hundreds of times every second!',
          },
          {
            type: 'quiz',
            narration: 'Quick check — what makes the sound in every instrument?',
            question: 'What makes an instrument\'s sound?',
            options: ['🪕 A fast wiggle (vibration)', '🧲 A magic sticker', '❄️ Cold air', '💡 A light bulb'],
            correct: 0,
          },
          {
            type: 'explain',
            narration: 'Bigger, longer things vibrate slower and make LOW sounds, like a big tuba. Small, short things vibrate fast and make HIGH sounds, like a tiny flute!',
            narrations: [
              'Bigger, longer things vibrate slower and make LOW sounds, like a big tuba. Small, short things vibrate fast and make HIGH sounds, like a tiny flute!',
              'Here\'s a fun instrument secret — big and long makes a low rumbly sound, small and short makes a high squeaky sound!',
            ],
            narrationYoung: 'Big instruments make low sounds! Small instruments make high sounds!',
            emoji: '🎺',
            fact: 'A double bass is huge and makes deep low notes, while a tiny piccolo is short and makes high squeaky notes!',
          },
          {
            type: 'label',
            narration: 'Let\'s sort instruments by their sound! Tap each one in order!',
            visual: '🎶',
            items: ['🎻 Big cello: low sound', '🎺 Tiny piccolo: high sound', '🥁 A drum skin vibrates', '👂 Our ears catch the vibration'],
          },
          {
            type: 'quiz',
            narration: 'One more! Which instrument would make a LOW rumbly sound?',
            question: 'Which one sounds low and rumbly?',
            options: ['🎻 A big cello', '🎺 A tiny piccolo', '🔔 A little bell', '🐣 A chick tweeting'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Awesome! Tell me — if you tap a table or clap your hands, what kind of sound do you make?',
            narrations: [
              'Awesome! Tell me — if you tap a table or clap your hands, what kind of sound do you make?',
              'You\'re a sound scientist now! Try tapping something near you — what does it sound like?',
            ],
          },
        ],
        printSheet: {
          title: 'How Instruments Make Sound',
          facts: [
            'Sound is made when something vibrates fast enough for our ears to hear.',
            'Big, long things vibrate slowly and make low sounds.',
            'Small, short things vibrate quickly and make high sounds.',
          ],
          colourPrompt: 'Colour a big tuba making a low sound and a tiny flute making a high sound!',
          visual: '🎵',
        },
      },
      {
        id: 'families',
        title: 'Instrument Families',
        emoji: '🥁',
        steps: [
          {
            type: 'explain',
            narration: 'Instruments live in families, just like people! There are strings you pluck, drums you hit, and horns you blow into.',
            narrations: [
              'Instruments live in families, just like people! There are strings you pluck, drums you hit, and horns you blow into.',
              'Did you know instruments have families too? Strings, percussion, and wind — each family makes sound its own special way!',
            ],
            narrationYoung: 'Instruments have families! Strings you pluck, drums you hit, and horns you blow!',
            emoji: '🎻',
            fact: 'The three big instrument families are strings (plucked or bowed), percussion (hit or shaken), and wind (blown into).',
          },
          {
            type: 'quiz',
            narration: 'Let\'s check — which family does a guitar belong to?',
            question: 'A guitar belongs to which family?',
            options: ['🎸 Strings', '🥁 Percussion', '🎺 Wind', '🎹 Keys'],
            correct: 0,
          },
          {
            type: 'explain',
            narration: 'Percussion is the family you hit, tap, or shake — drums, tambourines, and even pots and pans count! It\'s usually the very first instrument family kids learn to play.',
            narrations: [
              'Percussion is the family you hit, tap, or shake — drums, tambourines, and even pots and pans count! It\'s usually the very first instrument family kids learn to play.',
              'Here\'s a fun one — the percussion family is anything you hit, tap, or shake, like drums and tambourines. Even a pot and a wooden spoon count!',
            ],
            narrationYoung: 'Percussion is anything you hit, tap, or shake, like drums!',
            emoji: '🪘',
            fact: 'Percussion is often the very first instrument family young children learn, because you don\'t need to blow or pluck — just tap!',
          },
          {
            type: 'label',
            narration: 'Let\'s sort these instruments into their families! Tap each one in order!',
            visual: '🎻',
            items: ['🎸 Guitar: strings', '🥁 Drum: percussion', '🎺 Trumpet: wind', '🎹 Piano: keys'],
          },
          {
            type: 'quiz',
            narration: 'Last one! Which family do you hit, tap, or shake?',
            question: 'Which family do you hit or shake?',
            options: ['🥁 Percussion', '🎸 Strings', '🎺 Wind', '🎹 Keys'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Wonderful! Tell me — which instrument family sounds like the most fun to you?',
            narrations: [
              'Wonderful! Tell me — which instrument family sounds like the most fun to you?',
              'You\'re an instrument expert now! Strings, percussion, or wind — which family would you want to play?',
            ],
          },
        ],
        printSheet: {
          title: 'Instrument Families',
          facts: [
            'Strings are plucked or bowed, like a guitar or violin.',
            'Percussion is hit, tapped, or shaken, like a drum.',
            'Wind instruments are blown into, like a trumpet or flute.',
          ],
          colourPrompt: 'Colour one instrument from each family: strings, percussion, and wind!',
          visual: '🥁',
        },
      },
      {
        id: 'rhythm',
        title: 'Rhythm and Beat',
        emoji: '🥁',
        steps: [
          {
            type: 'explain',
            narration: 'A beat is like music\'s heartbeat — a steady clap you can count along to, again and again: 1, 2, 3, 4!',
            narrations: [
              'A beat is like music\'s heartbeat — a steady clap you can count along to, again and again: 1, 2, 3, 4!',
              'Every song has a heartbeat hiding inside it, called a beat! It\'s the steady clap you can tap your foot to.',
            ],
            narrationYoung: 'A beat is like music\'s heartbeat! Clap along: 1, 2, 3, 4!',
            emoji: '💓',
            fact: 'A steady beat is the pulse of a song — musicians count "1, 2, 3, 4" to stay together while they play.',
          },
          {
            type: 'quiz',
            narration: 'Quick question — what do we call music\'s steady heartbeat?',
            question: 'What is music\'s steady heartbeat called?',
            options: ['🥁 The beat', '🎨 The colour', '🌤️ The weather', '📐 The shape'],
            correct: 0,
          },
          {
            type: 'explain',
            narration: 'Rhythm is a pattern of long and short sounds dancing on top of the beat — like clapping "clap...clap-clap...clap" instead of just clap, clap, clap!',
            narrations: [
              'Rhythm is a pattern of long and short sounds dancing on top of the beat — like clapping "clap...clap-clap...clap" instead of just clap, clap, clap!',
              'Rhythm is the fun pattern that dances on top of the beat — sometimes fast little claps, sometimes one big long clap!',
            ],
            narrationYoung: 'Rhythm is a fun pattern of claps, some short and some long!',
            emoji: '👐',
            fact: 'Rhythm is the pattern of long and short sounds in music, while the beat is the steady pulse underneath it.',
          },
          {
            type: 'label',
            narration: 'Let\'s build a beat together! Tap each clap in order!',
            visual: '👏',
            items: ['1️⃣ Clap', '2️⃣ Clap', '3️⃣ Clap', '4️⃣ Clap'],
          },
          {
            type: 'quiz',
            narration: 'Last one! What dances on top of the steady beat?',
            question: 'What dances on top of the beat?',
            options: ['👐 Rhythm', '🌤️ Weather', '🎨 Colour', '📐 Shape'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Great clapping! Tell me — can you clap a fun rhythm for me right now?',
            narrations: [
              'Great clapping! Tell me — can you clap a fun rhythm for me right now?',
              'You\'ve got rhythm! Clap a pattern for me — I bet it sounds amazing!',
            ],
          },
        ],
        printSheet: {
          title: 'Rhythm and Beat',
          facts: [
            'A beat is music\'s steady heartbeat — 1, 2, 3, 4.',
            'Rhythm is a pattern of long and short sounds on top of the beat.',
            'Musicians count the beat out loud to stay together.',
          ],
          colourPrompt: 'Draw yourself clapping along to a beat, with music notes floating around you!',
          visual: '👏',
        },
      },
      {
        id: 'make-one',
        title: 'Make Your Own Instrument',
        emoji: '🪇',
        steps: [
          {
            type: 'explain',
            narration: 'You don\'t need a store to get an instrument — a jar of rice becomes a shaker, and a pot and spoon become a drum!',
            narrations: [
              'You don\'t need a store to get an instrument — a jar of rice becomes a shaker, and a pot and spoon become a drum!',
              'Guess what? You can make an instrument from things at home! A jar of rice shakes like a maraca, and a pot makes a great drum!',
            ],
            narrationYoung: 'You can make instruments at home! A jar of rice becomes a shaker!',
            emoji: '🪙',
            fact: 'A "homemade" instrument works the same way as a store-bought one — it just needs something that can vibrate to make a sound!',
          },
          {
            type: 'quiz',
            narration: 'Quick check — what could you fill a jar with to make a shaker?',
            question: 'What makes a good shaker filling?',
            options: ['🍚 Rice or beans', '💧 Water only', '💨 Nothing at all', '🧊 Ice cubes'],
            correct: 0,
          },
          {
            type: 'explain',
            narration: 'Rubber bands stretched over a box make a twangy guitar sound, because a stretched band vibrates just like a real guitar string!',
            narrations: [
              'Rubber bands stretched over a box make a twangy guitar sound, because a stretched band vibrates just like a real guitar string!',
              'Here\'s a neat trick — stretch rubber bands over an open box and pluck them. It twangs just like a guitar, because it vibrates the same way!',
            ],
            narrationYoung: 'Rubber bands on a box make a twangy sound, just like a guitar!',
            emoji: '📦',
            fact: 'A rubber band stretched tight vibrates when plucked, just like a guitar string — tighter bands make higher sounds!',
          },
          {
            type: 'label',
            narration: 'Let\'s gather what we need to build a rice shaker! Tap each one in order!',
            visual: '🪇',
            items: ['🥘 An empty jar', '🍚 Rice or beans', '🔒 A tight lid', '👋 A good shake'],
          },
          {
            type: 'quiz',
            narration: 'One more! Why does a stretched rubber band make a sound when plucked?',
            question: 'Why does a plucked rubber band make sound?',
            options: ['🪕 It vibrates', '❄️ It gets cold', '💡 It lights up', '💨 It blows air'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'You\'re a real instrument maker now! Tell me — what would you use at home to build your own instrument?',
            narrations: [
              'You\'re a real instrument maker now! Tell me — what would you use at home to build your own instrument?',
              'Amazing! If you built your own instrument today, what household things would you use?',
            ],
          },
        ],
        printSheet: {
          title: 'Make Your Own Instrument',
          facts: [
            'A jar filled with rice or beans becomes a shaker.',
            'Rubber bands stretched over a box twang like a guitar.',
            'Any instrument, homemade or store-bought, needs something that vibrates.',
          ],
          colourPrompt: 'Draw your own homemade instrument and colour it in!',
          visual: '🪇',
        },
      },
    ],
  }
