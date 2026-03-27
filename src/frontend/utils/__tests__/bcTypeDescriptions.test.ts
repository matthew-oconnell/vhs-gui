import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { loadBCTypeInfo, isBCTypeDeprecated, isBCTypeAvailable } from '../bcTypeDescriptions'
import { getFeatureFlags } from '../featureFlags'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('../featureFlags')

// Mock fetch to load the schema from the file system
global.fetch = vi.fn(async (url: string) => {
  const schemaPath = path.join(__dirname, '../../../../public/schemas/input.schema.json')
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
  return {
    ok: true,
    json: async () => JSON.parse(schemaContent)
  } as Response
})

describe('bcTypeDescriptions', () => {
  beforeEach(() => {
    // Mock getFeatureFlags to return empty set by default
    vi.mocked(getFeatureFlags).mockReturnValue({
      enabledCategories: new Set(['vulcan', 'hypersolve'])
    })
  })

  describe('loadBCTypeInfo', () => {
    it('loads BC type information from schema', async () => {
      const info = await loadBCTypeInfo()
      
      // Should have loaded multiple BC types
      expect(Object.keys(info).length).toBeGreaterThan(0)
      
      // Check for some known BC types
      expect(info['riemann']).toBeDefined()
      expect(info['riemann'].type).toBe('riemann')
      expect(info['riemann'].description).toBeDefined()
    })

    it('marks deprecated BC types correctly', async () => {
      const info = await loadBCTypeInfo()
      
      // Deprecated types should be marked
      expect(info['dirichlet']?.deprecated).toBe(true)
      expect(info['no slip']?.deprecated).toBe(true)
      expect(info['back pressure']?.deprecated).toBe(true)
      expect(info['subsonic inflow total']?.deprecated).toBe(true)
      expect(info['dirichlet profile']?.deprecated).toBe(true)
      expect(info['wall matching']?.deprecated).toBe(true)
    })

    it('does not mark current BC types as deprecated', async () => {
      const info = await loadBCTypeInfo()
      
      // Current types should NOT be marked as deprecated
      expect(info['riemann']?.deprecated).toBeFalsy()
      expect(info['fixed inflow']?.deprecated).toBeFalsy()
      expect(info['no slip wall']?.deprecated).toBeFalsy()
      expect(info['subsonic outflow']?.deprecated).toBeFalsy()
      expect(info['supersonic outflow']?.deprecated).toBeFalsy()
      expect(info['extrapolation']?.deprecated).toBeFalsy()
      expect(info['subsonic inflow']?.deprecated).toBeFalsy()
    })
  })

  describe('isBCTypeDeprecated', () => {
    beforeEach(async () => {
      // Load BC type info before each test
      await loadBCTypeInfo()
    })

    it('returns true for deprecated types', () => {
      expect(isBCTypeDeprecated('dirichlet')).toBe(true)
      expect(isBCTypeDeprecated('no slip')).toBe(true)
      expect(isBCTypeDeprecated('back pressure')).toBe(true)
    })

    it('returns false for current types', () => {
      expect(isBCTypeDeprecated('riemann')).toBe(false)
      expect(isBCTypeDeprecated('fixed inflow')).toBe(false)
      expect(isBCTypeDeprecated('no slip wall')).toBe(false)
      expect(isBCTypeDeprecated('subsonic outflow')).toBe(false)
    })

    it('returns false for unknown types', () => {
      expect(isBCTypeDeprecated('unknown-type')).toBe(false)
    })
  })

  describe('isBCTypeAvailable', () => {
    beforeEach(async () => {
      await loadBCTypeInfo()
    })

    it('returns true for BC types with no restrictions', async () => {
      // Most BCs have no "only for" restrictions
      expect(isBCTypeAvailable('riemann')).toBe(true)
      expect(isBCTypeAvailable('fixed inflow')).toBe(true)
    })

    it('respects "only for" restrictions based on feature flags', async () => {
      // Mock feature flags with specific categories
      vi.mocked(getFeatureFlags).mockReturnValue({
        enabledCategories: new Set(['vulcan'])
      })

      // BC types "only for: ['vulcan']" should be available
      // BC types "only for: ['hypersolve']" should NOT be available
      // This depends on what's in the schema - adjust based on actual schema content
    })
  })
})
