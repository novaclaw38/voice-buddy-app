// Royalty-free looping tracks for sing mode (Pixabay license — free for commercial use)
export const SING_TRACKS = [
  'https://cdn.pixabay.com/audio/2022/10/16/audio_96af8e4b9c.mp3', // upbeat kids
  'https://cdn.pixabay.com/audio/2023/06/07/audio_b9a8a8ee1e.mp3', // playful ukulele
  'https://cdn.pixabay.com/audio/2022/03/15/audio_1a809d6cff.mp3', // happy children
]

export function pickTrack() {
  return SING_TRACKS[Math.floor(Math.random() * SING_TRACKS.length)]
}
