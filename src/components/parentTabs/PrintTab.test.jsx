import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PrintTab from './PrintTab.jsx'

const baseProps = {
  printData: null,
  printType: 'story',
  onSelectType: vi.fn(),
  onSetSample: vi.fn(),
  childName: 'Sam',
}

describe('PrintTab', () => {
  it('disables Print Now with no content selected, and explains why', () => {
    render(<PrintTab {...baseProps} />)
    expect(screen.getByText('Print Now').closest('button')).toBeDisabled()
    expect(screen.getByText(/Select an item from History to print/)).toBeInTheDocument()
  })

  it('enables Print Now once printData is set', () => {
    render(<PrintTab {...baseProps} printData={{ mode: 'chat', userText: 'hi', ts: Date.now() }} />)
    expect(screen.getByText('Print Now').closest('button')).not.toBeDisabled()
  })

  it('the "games" type is always printable even with no printData', () => {
    render(<PrintTab {...baseProps} printType="games" printData={null} />)
    expect(screen.getByText('Print Now').closest('button')).not.toBeDisabled()
    expect(screen.getByText(/generic worksheet/)).toBeInTheDocument()
  })

  it('calls onSelectType when switching print type', () => {
    const onSelectType = vi.fn()
    render(<PrintTab {...baseProps} onSelectType={onSelectType} />)
    fireEvent.click(screen.getByText('Activity'))
    expect(onSelectType).toHaveBeenCalledWith('activity')
  })

  it('"Use Sample" builds sample content for the current type', () => {
    const onSetSample = vi.fn()
    render(<PrintTab {...baseProps} onSetSample={onSetSample} />)
    fireEvent.click(screen.getByText('Use Sample'))
    expect(onSetSample).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'story',
      buddyText: expect.stringContaining('Sam'),
    }))
  })

  it('hides "Use Sample" for the games type', () => {
    render(<PrintTab {...baseProps} printType="games" />)
    expect(screen.queryByText('Use Sample')).not.toBeInTheDocument()
  })
})
