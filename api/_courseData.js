// Each course lives in its own file under api/_courseData/ — see
// docs/superpowers/specs/2026-08-18-learn-section-content-redesign-design.md.
// Splitting them out lets each course be authored/edited independently
// without every change touching one giant array literal. The directory is
// underscore-prefixed (like this file) so Vercel doesn't treat its 14 files
// as 14 separate Serverless Functions — the Hobby plan caps at 12 total,
// and these are plain data modules, not request handlers.
import { gardening } from './_courseData/gardening.js'
import { robotics } from './_courseData/robotics.js'
import { science } from './_courseData/science.js'
import { cooking } from './_courseData/cooking.js'
import { animals } from './_courseData/animals.js'
import { space } from './_courseData/space.js'
import { music } from './_courseData/music.js'
import { literacy } from './_courseData/literacy.js'
import { numeracy } from './_courseData/numeracy.js'
import { sel } from './_courseData/sel.js'
import { art } from './_courseData/art.js'
import { body } from './_courseData/body.js'
import { weather } from './_courseData/weather.js'
import { community } from './_courseData/community.js'

export const COURSES = [
  gardening,
  robotics,
  science,
  cooking,
  animals,
  space,
  music,
  literacy,
  numeracy,
  sel,
  art,
  body,
  weather,
  community,
]
