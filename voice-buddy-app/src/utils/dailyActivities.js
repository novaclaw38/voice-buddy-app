const ACTIVITIES = [
  { emoji: '🍃', title: 'Leaf Explorer', description: 'Go outside and find 3 different leaves. Line them up from smallest to biggest!' },
  { emoji: '⭐', title: 'Star Artist', description: 'Draw your own constellation using dots on paper, then connect them into a picture!' },
  { emoji: '🐛', title: 'Bug Safari', description: 'Look under a rock or leaf outside and count all the tiny creatures you find!' },
  { emoji: '🫧', title: 'Bubble Science', description: 'Blow soap bubbles outside and see how big you can make them without popping!' },
  { emoji: '🪨', title: 'Rock Painter', description: 'Find a smooth rock outside and draw a face or pattern on it with pens or paint!' },
  { emoji: '🎵', title: 'Dance Inventor', description: 'Make up a 10-second dance to your favourite song and teach it to someone at home!' },
  { emoji: '🌈', title: 'Colour Hunt', description: 'Find one object for every colour of the rainbow somewhere in your house!' },
  { emoji: '🏗️', title: 'Tower Builder', description: 'Build the tallest tower you can using only books or boxes, then knock it down!' },
  { emoji: '🍎', title: 'Fruit Faces', description: 'Use pieces of fruit or vegetables to make a funny face on a plate!' },
  { emoji: '🌬️', title: 'Wind Watcher', description: 'Hold a tissue outside and watch how the wind moves it. Draw an arrow for which way it blows!' },
  { emoji: '🐾', title: 'Animal Parade', description: 'Walk around your home pretending to be 3 different animals one after another!' },
  { emoji: '💧', title: 'Water Painter', description: 'Paint with water on the pavement or a dark surface and watch your picture slowly disappear!' },
  { emoji: '📦', title: 'Box Robot', description: 'Collect empty boxes and build your own cardboard robot or spaceship!' },
  { emoji: '🌿', title: 'Seed Planter', description: 'Find a seed in the kitchen like an apple pip or bean and plant it in a cup of soil!' },
  { emoji: '🎭', title: 'Mirror Actor', description: 'Stand in front of a mirror and make 10 completely different funny faces!' },
  { emoji: '🧊', title: 'Ice Racer', description: 'Put an ice cube in a sunny spot and one in the shade — time which melts faster!' },
  { emoji: '🎈', title: 'Balloon Games', description: 'Blow up a balloon and keep it in the air as long as possible without letting it touch the floor!' },
  { emoji: '🌀', title: 'Paper Spinner', description: 'Cut a circle from paper, colour it in, then spin it on a pencil like a top!' },
  { emoji: '🌙', title: 'Cloud Watcher', description: 'Go outside and find 3 clouds that look like something. Draw them and write what they look like!' },
  { emoji: '🐠', title: 'Paper Fish', description: 'Fold a piece of paper in half and cut a fish shape, then decorate it with scales and patterns!' },
  { emoji: '🏃', title: 'Obstacle Course', description: 'Use cushions, chairs, and tape to make an obstacle course and time yourself through it!' },
  { emoji: '🌺', title: 'Nature Printer', description: 'Press a leaf or flower onto paper with paint to make a beautiful nature print!' },
  { emoji: '🎲', title: 'Dice Movement', description: 'Roll a dice — do that many jumping jacks, then roll again and do that many hops!' },
  { emoji: '🐦', title: 'Bird Watcher', description: 'Sit near a window for 5 minutes and count how many different birds you see or hear!' },
  { emoji: '🎨', title: 'Emotion Painter', description: 'Draw how you are feeling today using only colours and shapes — no words or people!' },
  { emoji: '🌊', title: 'Sound Map', description: 'Close your eyes for 1 minute and then draw everything you HEARD on a piece of paper!' },
  { emoji: '🪄', title: 'Magic Show', description: 'Practise one magic trick — like hiding a coin in your hand — and perform it for your family!' },
  { emoji: '🧁', title: 'Kitchen Helper', description: 'Help someone at home make one food item today — even if it\'s just stirring or pouring!' },
  { emoji: '📸', title: 'Photo Safari', description: 'Take 5 photos of interesting things in your home or garden using a device — make them beautiful!' },
  { emoji: '🗺️', title: 'Treasure Map', description: 'Draw a map of your home or garden and hide a small object for someone to find!' },
]

const dateKey = () => new Date().toISOString().slice(0, 10)

export function getDailyActivity() {
  const day = Math.floor(Date.now() / 86400000)
  return ACTIVITIES[day % ACTIVITIES.length]
}

export function isDailyActivityDismissed() {
  try {
    return localStorage.getItem('buddy_activity_' + dateKey()) === '1'
  } catch {
    return false
  }
}

export function dismissDailyActivity() {
  try {
    localStorage.setItem('buddy_activity_' + dateKey(), '1')
  } catch {}
}
