# Buddy Avatar Redesign — Squishy Living Blob

**Date:** 2026-07-02
**Status:** Approved for planning

## Goal

Replace the flat SVG animal-face avatar with a single squishy jelly-blob character
that genuinely feels alive — it breathes, blinks, glances around, bounces,
squishes when poked, and moves its mouth in sync with the actual TTS audio.
The existing six avatar choices (bear, cat, dog, bunny, alien, dino) become
**costumes** worn by the blob, so the AvatarPicker feature and saved preferences
keep working unchanged.

## Non-goals

- No new animation runtime (Rive/Lottie) or physics engine — pure SVG + CSS + a
  small rAF spring in JS.
- No changes to voice flow, chat logic, or lesson content.
- No drag/flick physics — poke (tap) is the only direct interaction.

## The character

- One blob body: soft, slightly pear-shaped (wider at the bottom, so it reads as
  having weight), glossy gradient fill, belly highlight, big glassy eyes with
  double catch-lights, small mouth, blush cheeks.
- Color behavior is unchanged: the child's chosen `avatarColor` tints the body
  when idle; state colors (green listening / amber speaking / blue thinking)
  take over otherwise, with the existing glow halo.
- Costumes are SVG groups pinned to the blob surface and rendered inside the
  same squish transform, so ears/spikes flop and squash with the body:
  - **bear** round ears · **cat** pointed ears + whiskers · **dog** floppy ears
  - **bunny** tall ears · **alien** antenna · **dino** back spikes

## Behavior by state

| State | Behavior |
|---|---|
| idle | Breathing (slow y-scale swell), blink on randomized 2–6 s timer with occasional double-blink, pupils glance around occasionally, spontaneous bounce every ~10–15 s with squash-and-stretch takeoff and jelly-wobble landing |
| listening | Eyes widen, body leans in, costume ears perk/twitch (existing per-costume listening accents kept), quicker attentive bob |
| thinking | Pupils drift up-and-aside, slow sway, existing thought-dots retained |
| speaking | Mouth openness driven by live TTS loudness (see Mouth sync); body bobs subtly with volume; existing sparkles retained |
| poke | `pointerdown` on the SVG → jelly squash + springy wobble rebound + one of 2–3 short giggle/boing sounds; ~1.5 s cooldown so mashing doesn't spam |

Accessibility & perf guards:

- `prefers-reduced-motion`: calm variant — no bouncing, no wobble; simple
  cross-fades and gentle mouth movement only.
- Picker thumbnails render with `live={false}`: static pose, no timers or rAF,
  so seven instances on screen cost nothing.
- Timers/rAF clean up on unmount and pause when the tab is hidden.

## Architecture

### Components (rewrite of `src/components/BuddyAvatar.jsx` + module CSS)

- **`BuddyAvatar`** — public component. Props unchanged: `status`, `avatarColor`,
  `type`, `size`. New optional props: `audioRef` (TTS `<audio>` element ref for
  mouth sync) and `live` (default `true`; `false` = static pose for thumbnails).
  Call sites (ChildPage, LessonPage, AvatarPicker) keep working without edits;
  ChildPage/LessonPage optionally pass `audioRef` from `useSpeech` to enable
  real mouth sync.
- **`BlobBody`** — the deformable jelly path + gradient + highlight.
- **`Face`** — eyes (white/pupil/catch-lights), mouth, blush; consumes CSS vars.
- **`Costume`** — per-type SVG group (`bear|cat|dog|bunny|alien|dino`), rendered
  inside the body transform group.

### Life system — `src/hooks/useBuddyLife.js`

One hook owning all liveliness. It schedules blinks/glances/bounces with
randomized timers and runs a small critically-damped spring on
`requestAnimationFrame` for poke wobbles and bounce landings. Output is written
directly to CSS custom properties on the container element (no per-frame React
renders):

```
--squash, --stretch   body deformation
--bounce-y            vertical offset during bounces
--mouth-open          0..1 mouth openness
--pupil-x, --pupil-y  gaze offset
--blink               0..1 eyelid closure
```

The rAF loop runs only while something is animating (poke, bounce, speaking)
and idles otherwise; ambient loops (breathing, glow pulse) stay in CSS.

### Mouth sync — `useMouthLevel(audioRef, isSpeaking)`

- Google TTS path: `useSpeech` already exposes `audioRef` (an `<audio>` playing
  a base64 MP3). Create one shared `AudioContext` + `AnalyserNode` lazily on
  first speak (inside a user-gesture-derived flow, so autoplay policy is
  satisfied), connect via `createMediaElementSource(audio)` → analyser →
  destination, and read time-domain volume each frame while speaking. Note: a
  media element can only be connected once — the context/source is created per
  new `<audio>` element and reused for its lifetime.
- Fallback path (browser `speechSynthesis`, or `AudioContext` unavailable):
  produce a randomized-but-organic level (noise-driven with word-ish cadence).
  Same output interface, so the avatar never looks broken.

### Poke sounds

2–3 short giggle/boing MP3s in `public/sfx/`, preloaded lazily on first poke,
random pick per poke, 1.5 s cooldown shared with the wobble animation.

## Error handling

- `AudioContext` construction or `createMediaElementSource` throws → silently
  fall back to the randomized mouth level.
- SFX file fails to load/play → poke still wobbles, just silently.
- Unknown `type` prop → default to bear costume (matches current behavior).

## Testing

Manual verification matrix (no test framework in repo):

1. All 6 costumes × 4 states on ChildPage and in AvatarPicker.
2. Poke: wobble + giggle, cooldown works, no wobble/giggle with
   `prefers-reduced-motion`.
3. Mouth sync audibly matches Google TTS; fallback mouth animates on browser TTS.
4. Picker thumbnails static; no console errors; timers stop after unmount
   (navigate away while speaking).
5. Smooth on a low-end device / CPU-throttled DevTools profile.
