export const COURSES = [
  {
    id: 'gardening',
    title: 'Gardening for Kids',
    emoji: '🌱',
    color: ['#14532d', '#166534'],
    description: 'Learn to grow your own food and care for plants',
    lessons: [
      {
        id: 'seeds',
        title: 'How Seeds Grow',
        emoji: '🌰',
        steps: [
          {
            type: 'explain',
            narration: 'Did you know a tiny seed holds a whole plant sleeping inside it? Let\'s find out how it wakes up!',
            narrations: [
              'Did you know a tiny seed holds a whole plant sleeping inside it? Let\'s find out how it wakes up!',
              'Every big tree you\'ve ever seen started as a tiny little seed! Want to learn how it grows?',
            ],
            narrationYoung: 'A little seed has a baby plant sleeping inside! Let\'s wake it up!',
            emoji: '🌰',
            fact: 'Seeds need water and warmth to wake up and start growing. Inside every seed is a tiny baby plant!',
          },
          {
            type: 'quiz',
            narration: 'Now let\'s test what you learned — what does a seed need to wake up and start growing?',
            question: 'What wakes a seed up?',
            options: ['🌧️ Water & warmth', '🍦 Ice cream', '🌑 Darkness', '🎵 Music'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Amazing! Now let\'s name the parts of a plant. Tap each label in order!',
            visual: '🌱',
            items: ['🌿 Roots', '🌾 Stem', '🍃 Leaves', '🌸 Flower'],
          },
          {
            type: 'activity',
            narration: 'Great job! Tell me — what is one thing a plant needs to grow?',
            narrations: [
              'Great job! Tell me — what is one thing a plant needs to grow?',
              'You\'re a plant expert now! Can you tell me — what does a plant need to be happy?',
            ],
          },
        ],
        printSheet: {
          title: 'How Seeds Grow',
          facts: [
            'Seeds need water and warmth to wake up and start growing.',
            'Roots drink water from the soil.',
            'Leaves catch sunlight to make food for the plant.',
          ],
          colourPrompt: 'Colour the plant and draw raindrops falling on it!',
          visual: '🌱',
        },
      },
      {
        id: 'soil',
        title: 'What Plants Need',
        emoji: '☀️',
        steps: [
          {
            type: 'explain',
            narration: 'Plants make their own food from sunlight, water, air, and nutrients in the soil — like a recipe with four ingredients!',
            narrations: [
              'Plants make their own food from sunlight, water, air, and nutrients in the soil — like a recipe with four ingredients!',
              'Here\'s something amazing — plants don\'t eat food like you do, they MAKE their own! Want to know how?',
            ],
            narrationYoung: 'Plants eat sunlight like you eat food! They also need water, air, and soil.',
            emoji: '☀️',
            fact: 'Plants make food using sunlight — this is called photosynthesis. They need sun, water, air and soil nutrients!',
          },
          {
            type: 'quiz',
            narration: 'Let\'s play a quiz! Which of these does a plant NOT need to grow?',
            question: 'Which does a plant NOT need?',
            options: ['☀️ Sunlight', '💧 Water', '🍦 Ice cream', '🌍 Soil'],
            correct: 2,
          },
          {
            type: 'explain',
            narration: 'Soil is full of tiny nutrients — like vitamins for plants. Earthworms help dig through the soil and make it better!',
            narrations: [
              'Soil is full of tiny nutrients — like vitamins for plants. Earthworms help dig through the soil and make it better!',
              'Here\'s a cool secret — the soil under your feet is full of tiny helpers! And earthworms are the very best ones!',
            ],
            narrationYoung: 'Soil has tiny food bits inside for plants! Worms help mix the soil.',
            emoji: '🌍',
            fact: 'Earthworms improve the soil by tunnelling through it and mixing in nutrients. They are a plant\'s best friend!',
          },
          {
            type: 'activity',
            narration: 'Wonderful! Can you name all four things a plant needs to grow? Say them out loud!',
            narrations: [
              'Wonderful! Can you name all four things a plant needs to grow? Say them out loud!',
              'You\'ve learned so much about plants! Can you remember the four things they need? Give it a try!',
            ],
          },
        ],
        printSheet: {
          title: 'What Plants Need',
          facts: [
            'Plants need sunlight, water, air, and soil nutrients to grow.',
            'Photosynthesis is how plants make food from sunlight.',
            'Earthworms improve the soil by tunnelling through it.',
          ],
          colourPrompt: 'Draw a plant soaking up sunlight and drinking water through its roots!',
          visual: '🌍',
        },
      },
      {
        id: 'grow',
        title: 'Grow Your First Plant',
        emoji: '🪴',
        steps: [
          {
            type: 'explain',
            narration: 'You can grow a bean plant at home with just a cup, some soil, a bean seed, and a little water. Let\'s learn how!',
            narrations: [
              'You can grow a bean plant at home with just a cup, some soil, a bean seed, and a little water. Let\'s learn how!',
              'Guess what? You can be a real gardener today! All you need is a cup, soil, a seed, and water!',
            ],
            narrationYoung: 'We can grow our own plant at home! We just need a cup, soil, a seed, and water!',
            emoji: '🪴',
            fact: 'Bean seeds sprout in 5 to 10 days! Keep the soil damp and put your cup in a sunny spot.',
          },
          {
            type: 'label',
            narration: 'Here are the steps to plant your bean seed. Tap them in order!',
            visual: '🪴',
            items: ['🪣 Fill cup with soil', '🫘 Push seed 2 cm in', '💧 Water gently', '🌤️ Place in sunlight'],
          },
          {
            type: 'quiz',
            narration: 'How deep should you plant a bean seed?',
            question: 'How deep does a bean seed go?',
            options: ['👍 About 2 cm — thumb depth', '⬇️ Very deep — 10 cm', '🪴 Just sit on top of soil'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Great! What container could you use to grow your plant at home? Be creative!',
            narrations: [
              'Great! What container could you use to grow your plant at home? Be creative!',
              'You know how to grow a bean plant now! What would you use as your pot if you tried it today?',
            ],
          },
        ],
        printSheet: {
          title: 'Grow Your First Plant',
          facts: [
            'Fill a cup with soil and push a bean seed in 2 cm deep.',
            'Water it gently and place it in a sunny spot.',
            'Your bean sprout will appear in 5 to 10 days!',
          ],
          colourPrompt: 'Draw your bean plant growing in its cup — add roots, a stem, and leaves!',
          visual: '🪴',
        },
      },
      {
        id: 'bugs',
        title: 'Garden Helpers & Bugs',
        emoji: '🐛',
        steps: [
          {
            type: 'explain',
            narration: 'Bees are garden superheroes! They carry pollen from flower to flower — this is called pollination and it helps plants make fruit and seeds.',
            narrations: [
              'Bees are garden superheroes! They carry pollen from flower to flower — this is called pollination and it helps plants make fruit and seeds.',
              'Did you know bees are some of the hardest workers in nature? They visit flowers all day carrying something very special!',
            ],
            narrationYoung: 'Bees carry pollen to flowers to help make fruit and seeds!',
            emoji: '🐝',
            fact: 'Without bees to pollinate flowers, most fruits and vegetables would not grow. Bees are essential for our food!',
          },
          {
            type: 'quiz',
            narration: 'Which creature helps the garden by improving the soil?',
            question: 'Who helps improve garden soil?',
            options: ['🪱 Earthworm', '🦟 Mosquito', '🦋 Butterfly', '🕷️ Spider'],
            correct: 0,
          },
          {
            type: 'explain',
            narration: 'Ladybugs are tiny garden protectors. They eat aphids — tiny bugs that damage plants. One ladybug can eat 5 000 aphids in its lifetime!',
            narrations: [
              'Ladybugs are tiny garden protectors. They eat aphids — tiny bugs that damage plants. One ladybug can eat 5 000 aphids in its lifetime!',
              'Here\'s a tiny but mighty garden hero — the ladybug! It eats the bad bugs that try to hurt plants!',
            ],
            narrationYoung: 'Ladybugs eat the bad bugs that hurt plants. They help keep the garden safe!',
            emoji: '🐞',
            fact: 'A single ladybug can eat up to 5 000 aphids in its lifetime, protecting plants from damage.',
          },
          {
            type: 'activity',
            narration: 'Which garden bug is your favourite, and why? Tell me!',
            narrations: [
              'Which garden bug is your favourite, and why? Tell me!',
              'Now you know about bees, earthworms, and ladybugs! Which one is your favourite? Tell me why!',
            ],
          },
        ],
        printSheet: {
          title: 'Garden Helpers & Bugs',
          facts: [
            'Bees pollinate flowers so plants can make fruit and seeds.',
            'Earthworms tunnel through soil and make it better for plants.',
            'Ladybugs eat aphids that would otherwise damage plants.',
          ],
          colourPrompt: 'Draw a bee visiting a flower and colour the whole garden scene!',
          visual: '🌸',
        },
      },
    ],
  },
  {
    id: 'robotics',
    title: 'Robotics for Kids',
    emoji: '🤖',
    color: ['#1e3a8a', '#1e40af'],
    description: 'Discover how robots work and learn to think like an engineer',
    lessons: [
      {
        id: 'what',
        title: 'What is a Robot?',
        emoji: '🦾',
        steps: [
          {
            type: 'explain',
            narration: 'A robot is a machine that can sense its surroundings, think about what to do, and then act. Just like you — but made of metal and code!',
            narrations: [
              'A robot is a machine that can sense its surroundings, think about what to do, and then act. Just like you — but made of metal and code!',
              'Have you ever wondered how robots work? They\'re actually a lot like you — they can sense, think, and move!',
            ],
            narrationYoung: 'A robot can see, think, and move — like a helpful machine friend!',
            emoji: '🤖',
            fact: 'Robots have three main abilities: sensing (cameras, microphones), thinking (a computer brain), and acting (motors that move things).',
          },
          {
            type: 'quiz',
            narration: 'Which of these is a real working robot?',
            question: 'Which one is a real robot?',
            options: ['🤖 A robot vacuum cleaner', '🚗 A toy car (no sensors)', '✏️ A pencil', '📚 A book'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Every robot has three parts. Tap the labels to match them!',
            visual: '🤖',
            items: ['👁️ Sensors (sense)', '💻 Computer (think)', '⚙️ Motors (act)'],
          },
          {
            type: 'activity',
            narration: 'Can you name a robot you have seen in real life or on TV? Tell me about it!',
            narrations: [
              'Can you name a robot you have seen in real life or on TV? Tell me about it!',
              'You\'re a robot expert now! Tell me — have you ever seen a real robot, and what did it do?',
            ],
          },
        ],
        printSheet: {
          title: 'What is a Robot?',
          facts: [
            'Robots can sense, think, and act.',
            'A robot vacuum cleaner senses dirt and navigates around your house.',
            'Mars rovers are robots that explore another planet!',
          ],
          colourPrompt: 'Draw your own robot and label its sensors (eyes), computer brain, and motors (legs or wheels)!',
          visual: '🤖',
        },
      },
      {
        id: 'sensors',
        title: 'How Robots See & Feel',
        emoji: '👁️',
        steps: [
          {
            type: 'explain',
            narration: 'Robots use sensors to understand the world around them. Cameras are like eyes, microphones are like ears, and touch sensors are like skin!',
            narrations: [
              'Robots use sensors to understand the world around them. Cameras are like eyes, microphones are like ears, and touch sensors are like skin!',
              'How does a robot know what\'s happening around it? It uses special parts called sensors — like superpowers for robots!',
            ],
            narrationYoung: 'Robots have sensor eyes, ears, and skin to feel the world around them!',
            emoji: '👁️',
            fact: 'Some robots use infrared sensors to see heat, or sonar to detect distance — like a bat using echoes to navigate!',
          },
          {
            type: 'quiz',
            narration: 'What sensor would help a robot see clearly in total darkness?',
            question: 'What helps a robot see in the dark?',
            options: ['🌡️ Infrared camera', '🎙️ Microphone', '🎡 Wheel sensor', '🔘 Button'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Match each sensor to what it does for the robot!',
            visual: '🤖',
            items: ['📷 Camera = Eyes', '🎙️ Microphone = Ears', '🤚 Touch pad = Skin'],
          },
          {
            type: 'activity',
            narration: 'If you were building a robot to cook food, which sensors would it need? Think carefully!',
            narrations: [
              'If you were building a robot to cook food, which sensors would it need? Think carefully!',
              'Great thinking! Now imagine your very own cooking robot — what would it need to see, hear, and touch? Tell me!',
            ],
          },
        ],
        printSheet: {
          title: 'How Robots See & Feel',
          facts: [
            'Cameras help robots see their environment.',
            'Microphones help robots hear and understand speech.',
            'Touch sensors help robots feel and handle objects safely.',
          ],
          colourPrompt: 'Draw a robot and add its sensors — label the camera (eyes), microphone (ears), and touch sensor (hands)!',
          visual: '👁️',
        },
      },
      {
        id: 'code',
        title: 'Giving Robots Instructions',
        emoji: '💻',
        steps: [
          {
            type: 'explain',
            narration: 'Code is like a recipe — it gives the robot step-by-step instructions. The robot follows every single step in exactly the right order!',
            narrations: [
              'Code is like a recipe — it gives the robot step-by-step instructions. The robot follows every single step in exactly the right order!',
              'Imagine giving your robot a list of instructions to follow perfectly every time. That list is called CODE!',
            ],
            narrationYoung: 'Code tells robots what to do, step by step — like a recipe!',
            emoji: '💻',
            fact: 'Robots follow code instructions perfectly. If you make even one mistake in your code, the robot does the wrong thing!',
          },
          {
            type: 'label',
            narration: 'Here is a robot\'s morning routine algorithm. Tap the steps in order!',
            visual: '🤖',
            items: ['😴 Wake up sensors', '👀 Check surroundings', '🤔 Make a decision', '⚙️ Move motors', '🔄 Repeat'],
          },
          {
            type: 'quiz',
            narration: 'What is code most like?',
            question: 'Code is most like a…',
            options: ['📖 Recipe with exact steps', '💭 Random idea', '✨ Magic spell', '🎨 Drawing'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'If you were coding a robot to make a sandwich, what would be your very first step? Tell me!',
            narrations: [
              'If you were coding a robot to make a sandwich, what would be your very first step? Tell me!',
              'You know how to think like a coder! What would step one be if your robot had to make a sandwich?',
            ],
          },
        ],
        printSheet: {
          title: 'Giving Robots Instructions',
          facts: [
            'Code gives robots step-by-step instructions to follow.',
            'Robots follow every instruction exactly — no skipping allowed!',
            'Loops in code make robots repeat steps automatically.',
          ],
          colourPrompt: 'Write your own robot recipe! Draw the steps your robot takes to do a task of your choice.',
          visual: '💻',
        },
      },
      {
        id: 'build',
        title: 'Design Your Own Robot',
        emoji: '🔧',
        steps: [
          {
            type: 'explain',
            narration: 'Every great robot starts with a question: what problem does it solve? Engineers always design robots to help with something important!',
            narrations: [
              'Every great robot starts with a question: what problem does it solve? Engineers always design robots to help with something important!',
              'Before any engineer builds a robot, they ask one big question — what problem will this robot solve? That\'s the most important step!',
            ],
            narrationYoung: 'Robots are built to help solve problems. What problem could your robot fix?',
            emoji: '🔧',
            fact: 'The best engineers always start with the problem, not the gadget. Understanding the problem deeply leads to better inventions!',
          },
          {
            type: 'quiz',
            narration: 'What is the very first thing an engineer thinks about when designing a new robot?',
            question: 'What does an engineer design first?',
            options: ['🔧 What problem it solves', '🎨 What colour to paint it', '🛞 How many wheels it has', '🏷️ What name to give it'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Engineers follow a design loop. Tap the steps in order!',
            visual: '🔧',
            items: ['🔍 Sense the problem', '💡 Plan a solution', '🔨 Build and test', '✨ Improve it'],
          },
          {
            type: 'activity',
            narration: 'Now it\'s your turn! Describe your dream robot — what problem does it solve and what does it look like?',
            narrations: [
              'Now it\'s your turn! Describe your dream robot — what problem does it solve and what does it look like?',
              'You think like a real engineer! Tell me about your dream robot — what would it do, and what would it look like?',
            ],
          },
        ],
        printSheet: {
          title: 'Design Your Own Robot',
          facts: [
            'Always start with the problem your robot will solve.',
            'Sensors help the robot sense its environment.',
            'Motors make the robot move, grab, and interact.',
          ],
          colourPrompt: 'Draw your dream robot! Label its sensors, computer brain, and motors. Give it a name!',
          visual: '🔧',
        },
      },
    ],
  },
  {
    id: 'science',
    title: 'Science Experiments',
    emoji: '🔬',
    color: ['#7c2d12', '#9a3412'],
    description: 'Do fun experiments and discover how the world works',
    lessons: [
      {
        id: 'volcano',
        title: 'Baking Soda Volcano',
        emoji: '🌋',
        steps: [
          {
            type: 'explain',
            narration: 'When baking soda — a base — meets vinegar — an acid — they react and make lots of carbon dioxide gas. That\'s what causes the fizzy eruption!',
            narrations: [
              'When baking soda — a base — meets vinegar — an acid — they react and make lots of carbon dioxide gas. That\'s what causes the fizzy eruption!',
              'Here\'s a fun science secret — two ordinary kitchen things can make a mini explosion when they meet! Want to find out what they are?',
            ],
            narrationYoung: 'Baking soda and vinegar have a fizzy reaction when they touch each other!',
            emoji: '🌋',
            fact: 'Acids and bases react together to make carbon dioxide gas. The bubbles rush out so fast they look like a volcano erupting!',
          },
          {
            type: 'label',
            narration: 'What do you need for the volcano experiment? Tap the ingredients in order!',
            visual: '🌋',
            items: ['🧪 Baking soda', '🫙 Vinegar', '🎨 Food colouring', '🥣 Container'],
          },
          {
            type: 'quiz',
            narration: 'Why does the baking soda volcano fizz?',
            question: 'Why does the volcano fizz?',
            options: ['⚗️ An acid meets a base', '🔥 It gets too hot', '💧 Water is boiling', '✨ Magic!'],
            correct: 0,
          },
          {
            type: 'activity',
            narration: 'Have you ever tried this experiment at home? Tell me what you saw — or what you think would happen!',
            narrations: [
              'Have you ever tried this experiment at home? Tell me what you saw — or what you think would happen!',
              'You\'re a scientist now! Have you done the volcano experiment? Tell me what happened — or what you predict would happen!',
            ],
          },
        ],
        printSheet: {
          title: 'Baking Soda Volcano',
          facts: [
            'Baking soda is a BASE and vinegar is an ACID.',
            'When an acid and base meet, they make carbon dioxide gas.',
            'The gas bubbles up and creates a fizzy "eruption"!',
          ],
          colourPrompt: 'Draw your volcano erupting! Colour the fizzy lava bursting out.',
          visual: '🌋',
        },
      },
      {
        id: 'rainbow',
        title: 'Make a Rainbow',
        emoji: '🌈',
        steps: [
          {
            type: 'explain',
            narration: 'White sunlight is actually made of ALL the colours mixed together. When light bends through water or glass, it splits into a beautiful rainbow!',
            narrations: [
              'White sunlight is actually made of ALL the colours mixed together. When light bends through water or glass, it splits into a beautiful rainbow!',
              'Here\'s an amazing secret about sunshine — it looks white, but it\'s hiding ALL the colours of the rainbow inside it!',
            ],
            narrationYoung: 'Sunlight has all the colours hiding inside it. Water bends the light and shows them all!',
            emoji: '🌈',
            fact: 'You can make a rainbow at home by holding a glass of water in bright sunlight over a white sheet of paper. Try it!',
          },
          {
            type: 'quiz',
            narration: 'What splits white sunlight into rainbow colours?',
            question: 'What splits light into colours?',
            options: ['💧 Water or glass', '🪞 A mirror', '🔦 A torch', '☁️ A cloud'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Rainbows always have the same colours in the same order. Tap them from top to bottom!',
            visual: '🌈',
            items: ['🔴 Red', '🟡 Yellow', '🟢 Green', '🔵 Blue'],
          },
          {
            type: 'activity',
            narration: 'Can you describe a rainbow you have seen? Where were you, and what did it look like?',
            narrations: [
              'Can you describe a rainbow you have seen? Where were you, and what did it look like?',
              'Rainbows are so magical! Have you ever seen one? Tell me where you were and all the colours you spotted!',
            ],
          },
        ],
        printSheet: {
          title: 'Make a Rainbow',
          facts: [
            'White light contains all the colours of the rainbow mixed together.',
            'Water and glass bend light to reveal all the colours.',
            'Rainbow colours always appear in order: red, orange, yellow, green, blue, violet.',
          ],
          colourPrompt: 'Colour in the rainbow using all the colours in the right order from top to bottom!',
          visual: '🌈',
        },
      },
      {
        id: 'float',
        title: 'Why Things Float',
        emoji: '🚢',
        steps: [
          {
            type: 'explain',
            narration: 'Things float when they push aside more water than they weigh. A huge ship floats because it\'s hollow inside — it pushes out a lot of water!',
            narrations: [
              'Things float when they push aside more water than they weigh. A huge ship floats because it\'s hollow inside — it pushes out a lot of water!',
              'Have you ever wondered why a giant ship floats but a tiny coin sinks? The answer is all about how much water something pushes away!',
            ],
            narrationYoung: 'Big hollow ships float because they push lots of water out of the way. Small solid coins sink!',
            emoji: '🚢',
            fact: 'This is called buoyancy. If an object weighs less than the water it pushes aside, it floats. If it weighs more, it sinks.',
          },
          {
            type: 'quiz',
            narration: 'Why does a huge heavy ship float but a tiny coin sinks?',
            question: 'Why does a ship float?',
            options: ['🚢 It\'s hollow and pushes out lots of water', '🪵 Ships are made of wood', '🧲 Coins are magnetic', '⚙️ Ships have engines'],
            correct: 0,
          },
          {
            type: 'label',
            narration: 'Can you sort these objects? Tap them in order — which float first, then which sink!',
            visual: '🌊',
            items: ['🪶 Cork (floats)', '🪵 Wood (floats)', '🪙 Coin (sinks)', '🪨 Rock (sinks)'],
          },
          {
            type: 'activity',
            narration: 'Try dropping different objects in water at home. Which ones float and which ones sink? Tell me what you found!',
            narrations: [
              'Try dropping different objects in water at home. Which ones float and which ones sink? Tell me what you found!',
              'You\'re a floating expert! What do you think would happen if you dropped a grape and a cork in water? Tell me your prediction!',
            ],
          },
        ],
        printSheet: {
          title: 'Why Things Float',
          facts: [
            'Objects float when they weigh less than the water they push aside.',
            'Ships are hollow, so they push out lots of water and float.',
            'Density is how heavy something is for its size.',
          ],
          colourPrompt: 'Draw objects floating and sinking in a bucket of water. Label each one "floats" or "sinks"!',
          visual: '🌊',
        },
      },
    ],
  },
]
