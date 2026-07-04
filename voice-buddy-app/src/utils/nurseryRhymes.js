// Nursery rhymes for sing-along mode. Each song has a REAL sung recording
// (audio) self-hosted under /public/songs. `credit` carries attribution.
//
// mary-lamb is the one survivor of the original Wikimedia Commons batch —
// the rest turned out to be piano-only or poor quality on actual listen (see
// git history). The rest below are from a royalty-free pack the user
// confirmed the licence on. They ship with a generic placeholder `lines`
// entry instead of transcribed lyrics — add the real lyrics per song
// (replacing the placeholder) whenever someone's actually listened and typed
// them in; that's what drives the karaoke word-highlight.
const PACK_CREDIT = { author: 'FreeSongPackage', license: 'Royalty-free', source: '' }
const PLACEHOLDER = ['🎵 Sing along with the music!']

export const NURSERY_RHYMES = [
  {
    id: 'mary-lamb',
    title: 'Mary Had a Little Lamb',
    emoji: '🐏',
    audio: '/songs/mary-lamb.mp3',
    duration: 22.8,
    credit: { author: 'Celestianpower', license: 'Public domain', source: 'https://commons.wikimedia.org/wiki/File:Mary_Had_a_Little_Lamb.ogg' },
    lines: [
      'Mary had a little lamb',
      'Its fleece was white as snow',
      'And everywhere that Mary went',
      'The lamb was sure to go',
    ],
  },
  { id: 'abc', title: 'The Alphabet Song', emoji: '🔤', audio: '/songs/abc.mp3', duration: 50.3, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'baa-baa', title: 'Baa Baa Black Sheep', emoji: '🐑', audio: '/songs/baa-baa.mp3', duration: 81.5, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'bingo', title: 'Bingo', emoji: '🐶', audio: '/songs/bingo.mp3', duration: 96.2, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'brother-john', title: 'Are You Sleeping (Brother John)', emoji: '🔔', audio: '/songs/brother-john.mp3', duration: 86.9, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'clap-your-hands', title: 'Clap Clap Clap Your Hands', emoji: '👏', audio: '/songs/clap-your-hands.mp3', duration: 82.0, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'finger-family', title: 'Finger Family', emoji: '✋', audio: '/songs/finger-family.mp3', duration: 63.6, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'five-little-monkeys', title: 'Five Little Monkeys', emoji: '🐒', audio: '/songs/five-little-monkeys.mp3', duration: 122.3, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'happy-birthday', title: 'Happy Birthday', emoji: '🎂', audio: '/songs/happy-birthday.mp3', duration: 172.8, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'head-shoulders-knees-toes', title: 'Head, Shoulders, Knees and Toes', emoji: '🕺', audio: '/songs/head-shoulders-knees-toes.mp3', duration: 121.7, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'hickory-dickory-dock', title: 'Hickory Dickory Dock', emoji: '🕰️', audio: '/songs/hickory-dickory-dock.mp3', duration: 74.8, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'hush-little-baby', title: 'Hush Little Baby', emoji: '🌙', audio: '/songs/hush-little-baby.mp3', duration: 73.2, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'if-youre-happy', title: "If You're Happy and You Know It", emoji: '😃', audio: '/songs/if-youre-happy.mp3', duration: 94.8, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'im-a-little-star', title: "I'm a Little Star", emoji: '⭐', audio: '/songs/im-a-little-star.mp3', duration: 78.1, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'im-a-little-teapot', title: "I'm a Little Teapot", emoji: '🫖', audio: '/songs/im-a-little-teapot.mp3', duration: 22.2, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'little-snowflake', title: 'Little Snowflake', emoji: '❄️', audio: '/songs/little-snowflake.mp3', duration: 132.8, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'london-bridge', title: 'London Bridge Is Falling Down', emoji: '🌉', audio: '/songs/london-bridge.mp3', duration: 85.7, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'muffin-man', title: 'The Muffin Man', emoji: '🧁', audio: '/songs/muffin-man.mp3', duration: 108.2, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'pat-a-cake', title: 'Pat-a-Cake', emoji: '🍰', audio: '/songs/pat-a-cake.mp3', duration: 144.0, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'rain-rain-go-away', title: 'Rain, Rain, Go Away', emoji: '🌧️', audio: '/songs/rain-rain-go-away.mp3', duration: 105.8, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'ring-a-ring-o-roses', title: "Ring a Ring o' Roses", emoji: '🌹', audio: '/songs/ring-a-ring-o-roses.mp3', duration: 94.2, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'shes-coming-round-the-mountain', title: "She'll Be Coming Round the Mountain", emoji: '⛰️', audio: '/songs/shes-coming-round-the-mountain.mp3', duration: 189.6, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'teddy-bear', title: 'Teddy Bear, Teddy Bear', emoji: '🧸', audio: '/songs/teddy-bear.mp3', duration: 76.9, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'ten-in-the-bed', title: 'Ten in the Bed', emoji: '🛏️', audio: '/songs/ten-in-the-bed.mp3', duration: 160.2, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'twinkle', title: 'Twinkle Twinkle Little Star', emoji: '⭐', audio: '/songs/twinkle.mp3', duration: 135.4, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'wheels-on-the-bus', title: 'Wheels on the Bus', emoji: '🚌', audio: '/songs/wheels-on-the-bus.mp3', duration: 108.4, credit: PACK_CREDIT, lines: PLACEHOLDER },
  { id: 'yankee-doodle', title: 'Yankee Doodle', emoji: '🇺🇸', audio: '/songs/yankee-doodle.mp3', duration: 84.9, credit: PACK_CREDIT, lines: PLACEHOLDER },
]
