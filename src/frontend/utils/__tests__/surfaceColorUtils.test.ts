import { describe, it, expect } from 'vitest'
import {
  isTagAssigned,
  getBCForTag,
  getRandomColorForId,
  getColorForBCType,
  getColorForTag,
  shouldTagBeVisible,
  DEFAULT_BC_TYPE_COLORS
} from '../surfaceColorUtils'
import { Surface } from '../../types/tag'
import { BoundaryCondition } from '../../types/config'
import { GlobalRenderSettings } from '../../store/appStore'

// Test fixtures
const createSurface = (id: string, tag: number): Surface => ({
  id,
  name: `Surface ${tag}`,
  metadata: { id, tag, tagName: `surface-${tag}` }
})

const createBC = (type: string, tags: number | number[] | string): BoundaryCondition => ({
  id: `bc-${type}`,
  type,
  'mesh boundary tags': tags
})

const defaultSettings: GlobalRenderSettings = {
  colorMode: 'solid',
  hideAssignedTags: false,
  unassignedColor: '#ff4444',
  assignedColor: '#44aa44',
  solidColor: '#4a9eff'
}

describe('isTagAssigned', () => {
  it('returns false when no boundary conditions exist', () => {
    const surface = createSurface('s1', 1)
    expect(isTagAssigned(surface, [])).toBe(false)
  })

  it('returns true when surface tag matches BC with number tag', () => {
    const surface = createSurface('s1', 1)
    const bc = createBC('no slip', 1)
    expect(isTagAssigned(surface, [bc])).toBe(true)
  })

  it('returns true when surface tag is in BC array tags', () => {
    const surface = createSurface('s2', 2)
    const bc = createBC('dirichlet', [1, 2, 3])
    expect(isTagAssigned(surface, [bc])).toBe(true)
  })

  it('returns true when surface tag is in BC string tags', () => {
    const surface = createSurface('s3', 3)
    const bc = createBC('riemann', '1, 2, 3')
    expect(isTagAssigned(surface, [bc])).toBe(true)
  })

  it('returns false when surface tag does not match any BC', () => {
    const surface = createSurface('s5', 5)
    const bc = createBC('no slip', [1, 2, 3])
    expect(isTagAssigned(surface, [bc])).toBe(false)
  })

  it('checks multiple BCs and returns true if any match', () => {
    const surface = createSurface('s2', 2)
    const bc1 = createBC('no slip', 1)
    const bc2 = createBC('dirichlet', 2)
    expect(isTagAssigned(surface, [bc1, bc2])).toBe(true)
  })
})

describe('getBCForTag', () => {
  it('returns null when no boundary conditions exist', () => {
    const surface = createSurface('s1', 1)
    expect(getBCForTag(surface, [])).toBeNull()
  })

  it('returns the matching BC', () => {
    const surface = createSurface('s1', 1)
    const bc = createBC('no slip', 1)
    expect(getBCForTag(surface, [bc])).toEqual(bc)
  })

  it('returns first matching BC when multiple match', () => {
    const surface = createSurface('s1', 1)
    const bc1 = createBC('no slip', 1)
    const bc2 = createBC('dirichlet', 1)
    expect(getBCForTag(surface, [bc1, bc2])).toEqual(bc1)
  })

  it('returns null when no BC matches', () => {
    const surface = createSurface('s5', 5)
    const bc = createBC('no slip', 1)
    expect(getBCForTag(surface, [bc])).toBeNull()
  })
})

describe('getRandomColorForId', () => {
  it('returns a valid HSL color string', () => {
    const color = getRandomColorForId('test-surface')
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
  })

  it('returns the same color for the same ID', () => {
    const color1 = getRandomColorForId('surface-123')
    const color2 = getRandomColorForId('surface-123')
    expect(color1).toBe(color2)
  })

  it('returns different colors for different IDs', () => {
    const color1 = getRandomColorForId('surface-1')
    const color2 = getRandomColorForId('surface-2')
    expect(color1).not.toBe(color2)
  })
})

describe('getColorForBCType', () => {
  it('returns default color for known BC types', () => {
    expect(getColorForBCType('dirichlet')).toBe(DEFAULT_BC_TYPE_COLORS['dirichlet'])
    expect(getColorForBCType('no slip')).toBe(DEFAULT_BC_TYPE_COLORS['no slip'])
  })

  it('returns custom color when provided', () => {
    const customColors = { 'dirichlet': '#123456' }
    expect(getColorForBCType('dirichlet', customColors)).toBe('#123456')
  })

  it('prefers custom color over default', () => {
    const customColors = { 'no slip': '#ffffff' }
    expect(getColorForBCType('no slip', customColors)).toBe('#ffffff')
  })

  it('generates deterministic color for unknown BC types', () => {
    const color1 = getColorForBCType('unknown-type')
    const color2 = getColorForBCType('unknown-type')
    expect(color1).toBe(color2)
    expect(color1).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
  })
})

describe('getColorForTag', () => {
  const surface = createSurface('s1', 1)
  const assignedSurface = createSurface('s2', 2)
  const bcs = [createBC('no slip', 2)]

  it('returns solid color in solid mode', () => {
    const color = getColorForTag(surface, 'solid', defaultSettings, bcs)
    expect(color).toBe(defaultSettings.solidColor)
  })

  it('returns unassigned color for unassigned surface in assigned-status mode', () => {
    const color = getColorForTag(surface, 'assigned-status', defaultSettings, bcs)
    expect(color).toBe(defaultSettings.unassignedColor)
  })

  it('returns assigned color for assigned surface in assigned-status mode', () => {
    const color = getColorForTag(assignedSurface, 'assigned-status', defaultSettings, bcs)
    expect(color).toBe(defaultSettings.assignedColor)
  })

  it('returns BC type color for assigned surface in bc-type mode', () => {
    const color = getColorForTag(assignedSurface, 'bc-type', defaultSettings, bcs)
    expect(color).toBe(DEFAULT_BC_TYPE_COLORS['no slip'])
  })

  it('returns unassigned color for unassigned surface in bc-type mode', () => {
    const color = getColorForTag(surface, 'bc-type', defaultSettings, bcs)
    expect(color).toBe(defaultSettings.unassignedColor)
  })

  it('returns deterministic random color in random mode', () => {
    const color1 = getColorForTag(surface, 'random', defaultSettings, bcs)
    const color2 = getColorForTag(surface, 'random', defaultSettings, bcs)
    expect(color1).toBe(color2)
    expect(color1).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
  })
})

describe('shouldTagBeVisible', () => {
  const surface = createSurface('s1', 1)
  const assignedSurface = createSurface('s2', 2)
  const bcs = [createBC('no slip', 2)]

  it('returns true when hideAssigned is false and no manual override', () => {
    expect(shouldTagBeVisible(surface, false, bcs)).toBe(true)
    expect(shouldTagBeVisible(assignedSurface, false, bcs)).toBe(true)
  })

  it('hides assigned surfaces when hideAssigned is true', () => {
    expect(shouldTagBeVisible(surface, true, bcs)).toBe(true)
    expect(shouldTagBeVisible(assignedSurface, true, bcs)).toBe(false)
  })

  it('respects manual visibility override (false)', () => {
    expect(shouldTagBeVisible(surface, false, bcs, false)).toBe(false)
  })

  it('shows surface when manual visibility is true', () => {
    expect(shouldTagBeVisible(surface, false, bcs, true)).toBe(true)
  })

  it('manual hide takes precedence over hideAssigned setting', () => {
    // Surface is unassigned, hideAssigned is true, but manual is false
    expect(shouldTagBeVisible(surface, true, bcs, false)).toBe(false)
  })
})
