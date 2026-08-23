import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SkillTreeMap from './SkillTreeMap.jsx'

const MISSION_IDS = ['mission-neural-uplink', 'mission-sensory-array', 'mission-kinetic-deployment', 'mission-voltage-surge']

describe('SkillTreeMap', () => {
  it('renders all 6 months', () => {
    render(<SkillTreeMap completions={new Set()} />)
    expect(screen.getByText(/operation iron blueprint/i)).toBeInTheDocument()
    expect(screen.getByText(/path-finder/i)).toBeInTheDocument()
    expect(screen.getByText(/code-breaker/i)).toBeInTheDocument()
    expect(screen.getByText(/heavy-lift/i)).toBeInTheDocument()
    expect(screen.getByText(/autonomous-command/i)).toBeInTheDocument()
    expect(screen.getByText(/omniscience/i)).toBeInTheDocument()
  })

  it('shows Month 1 as locked with 0 of 4 missions when nothing is completed', () => {
    render(<SkillTreeMap completions={new Set()} />)
    expect(screen.getByText(/0\s*\/\s*4/)).toBeInTheDocument()
  })

  it('shows Month 1 as in-progress once some missions are completed', () => {
    const completions = new Set(MISSION_IDS.slice(0, 2).map((id) => `robotics:${id}`))
    render(<SkillTreeMap completions={completions} />)
    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument()
  })

  it('always renders Months 2-6 as locked, regardless of completions', () => {
    const completions = new Set(MISSION_IDS.map((id) => `robotics:${id}`))
    render(<SkillTreeMap completions={completions} />)
    const lockedLabels = screen.getAllByText(/coming soon/i)
    expect(lockedLabels.length).toBe(5)
  })
})
