// Each course lives in its own file under api/courseData/ — see
// docs/superpowers/specs/2026-08-18-learn-section-content-redesign-design.md.
// Splitting them out lets each course be authored/edited independently
// without every change touching one giant array literal.
import { gardening } from './courseData/gardening.js'
import { robotics } from './courseData/robotics.js'
import { science } from './courseData/science.js'
import { cooking } from './courseData/cooking.js'
import { animals } from './courseData/animals.js'
import { space } from './courseData/space.js'
import { music } from './courseData/music.js'
import { literacy } from './courseData/literacy.js'
import { numeracy } from './courseData/numeracy.js'
import { sel } from './courseData/sel.js'
import { art } from './courseData/art.js'
import { body } from './courseData/body.js'
import { weather } from './courseData/weather.js'
import { community } from './courseData/community.js'

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
