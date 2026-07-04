// Nursery rhymes for sing-along mode.
// Each song has a REAL sung recording (audio) sourced from Wikimedia Commons,
// converted to mp3 and self-hosted under /public/songs. `credit` carries the
// attribution required by the file's licence (see the in-app credits screen).
//
// Most of the original Wikimedia recordings turned out to be piano-only (no
// vocals) or poor quality on actual listen — see git history for the removed
// entries (twinkle, baa-baa, old-macdonald, row-row, jack-and-jill, abc,
// itsy-bitsy). Only this one held up; more should only be added once
// confirmed by ear to have both clear vocals and a real tune.
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
]
