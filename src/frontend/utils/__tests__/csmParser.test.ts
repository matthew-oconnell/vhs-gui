import { describe, it, expect } from 'vitest'
import { parseCSMImports, hasImports, getBasename } from '../csmParser'

describe('csmParser', () => {
  describe('parseCSMImports', () => {
    it('extracts import statements', () => {
      const csm = `
        sphere 0 0 0 100
        import waverider.stp
        subtract
      `
      const imports = parseCSMImports(csm)
      expect(imports).toEqual(['waverider.stp'])
    })

    it('extracts restore statements for files', () => {
      const csm = `
        sphere 0 0 0 100
        restore geometry.egads
        subtract
      `
      const imports = parseCSMImports(csm)
      expect(imports).toEqual(['geometry.egads'])
    })

    it('excludes restore of stored bodies', () => {
      const csm = `
        box 0 0 0 10 10 10
        store mybox
        sphere 0 0 0 20
        restore mybox
        subtract
      `
      const imports = parseCSMImports(csm)
      expect(imports).toEqual([])
    })

    it('excludes restore . (mark stack)', () => {
      const csm = `
        import waverider.stp
        mark
        sphere 0 0 0 110.22758490476976
        restore .
        subtract
      `
      const imports = parseCSMImports(csm)
      expect(imports).toEqual(['waverider.stp'])
    })

    it('excludes restore .. (parent)', () => {
      const csm = `
        import part.stp
        restore ..
        union
      `
      const imports = parseCSMImports(csm)
      expect(imports).toEqual(['part.stp'])
    })

    it('handles multiple imports', () => {
      const csm = `
        import wing.stp
        import fuselage.step
        restore tail.iges
        union
      `
      const imports = parseCSMImports(csm)
      expect(imports).toContain('wing.stp')
      expect(imports).toContain('fuselage.step')
      expect(imports).toContain('tail.iges')
      expect(imports).length(3)
    })

    it('handles case-insensitive commands', () => {
      const csm = `
        IMPORT Wing.STP
        Import Fuselage.step
        RESTORE Tail.iges
      `
      const imports = parseCSMImports(csm)
      expect(imports).toContain('Wing.STP')
      expect(imports).toContain('Fuselage.step')
      expect(imports).toContain('Tail.iges')
    })

    it('excludes duplicates', () => {
      const csm = `
        import part.stp
        restore part.stp
        import part.stp
      `
      const imports = parseCSMImports(csm)
      expect(imports).toEqual(['part.stp'])
    })
  })

  describe('hasImports', () => {
    it('returns true when imports exist', () => {
      const csm = 'import file.stp'
      expect(hasImports(csm)).toBe(true)
    })

    it('returns false when no imports', () => {
      const csm = 'box 0 0 0 10 10 10'
      expect(hasImports(csm)).toBe(false)
    })

    it('returns false when only restore . is present', () => {
      const csm = `
        mark
        box 0 0 0 10 10 10
        restore .
      `
      expect(hasImports(csm)).toBe(false)
    })
  })

  describe('getBasename', () => {
    it('extracts filename from Unix path', () => {
      expect(getBasename('path/to/file.stp')).toBe('file.stp')
    })

    it('extracts filename from Windows path', () => {
      expect(getBasename('C:\\path\\to\\file.stp')).toBe('file.stp')
    })

    it('returns filename when no path', () => {
      expect(getBasename('file.stp')).toBe('file.stp')
    })
  })
})
