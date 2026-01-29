import { describe, it, expect } from 'vitest'
import { stripJsonComments } from '../jsonComments'

describe('stripJsonComments', () => {
  describe('C-style // comments', () => {
    it('removes // comments at end of lines', () => {
      const input = '{"key": "value" // this is a comment}'
      const expected = '{"key": "value"'
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('removes // comments on separate lines', () => {
      const input = `{
  "key": "value",
  // This is a comment line
  "key2": "value2"
}`
      const expected = `{
  "key": "value",

  "key2": "value2"
}`
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('removes multiple // comments in same file', () => {
      const input = `{
  "a": 1, // comment 1
  "b": 2, // comment 2
  "c": 3  // comment 3
}`
      const expected = `{
  "a": 1,
  "b": 2,
  "c": 3
}`
      expect(stripJsonComments(input)).toBe(expected)
    })
  })

  describe('shell-style # comments', () => {
    it('removes # comments at end of lines', () => {
      const input = '{"key": "value" # this is a comment}'
      const expected = '{"key": "value"'
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('removes # comments on separate lines', () => {
      const input = `{
  "key": "value",
  # This is a comment line
  "key2": "value2"
}`
      const expected = `{
  "key": "value",

  "key2": "value2"
}`
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('removes multiple # comments in same file', () => {
      const input = `{
  "a": 1, # comment 1
  "b": 2, # comment 2
  "c": 3  # comment 3
}`
      const expected = `{
  "a": 1,
  "b": 2,
  "c": 3
}`
      expect(stripJsonComments(input)).toBe(expected)
    })
  })

  describe('mixed comment styles', () => {
    it('handles both // and # in same file', () => {
      const input = `{
  "a": 1, // C-style comment
  "b": 2, # shell-style comment
  "c": 3
}`
      const expected = `{
  "a": 1,
  "b": 2,
  "c": 3
}`
      expect(stripJsonComments(input)).toBe(expected)
    })
  })

  describe('string preservation', () => {
    it('preserves URLs with // in strings', () => {
      const input = '{"url": "https://example.com/path"}'
      const expected = '{"url": "https://example.com/path"}'
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('preserves URLs with // and trailing comment', () => {
      const input = '{"url": "https://example.com" // website}'
      const expected = '{"url": "https://example.com"'
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('preserves # characters in strings', () => {
      const input = '{"color": "#FF0000"}'
      const expected = '{"color": "#FF0000"}'
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('preserves # in strings with trailing comment', () => {
      const input = '{"color": "#FF0000" # red color}'
      const expected = '{"color": "#FF0000"'
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('preserves escaped quotes in strings', () => {
      const input = '{"text": "She said \\"hello\\"" // greeting}'
      const expected = '{"text": "She said \\"hello\\""'
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('preserves strings with both URL and comment symbols', () => {
      const input = '{"data": "https://example.com#anchor" // link}'
      const expected = '{"data": "https://example.com#anchor"'
      expect(stripJsonComments(input)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(stripJsonComments('')).toBe('')
    })

    it('handles file with only comments', () => {
      const input = `// comment 1
# comment 2
// comment 3`
      const expected = `

`
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('handles lines with only whitespace before comment', () => {
      const input = `{
  "key": "value",
    // indented comment
  "key2": "value2"
}`
      const expected = `{
  "key": "value",

  "key2": "value2"
}`
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('preserves empty lines', () => {
      const input = `{
  "a": 1,

  "b": 2
}`
      const expected = `{
  "a": 1,

  "b": 2
}`
      expect(stripJsonComments(input)).toBe(expected)
    })

    it('handles comment at start of line with no whitespace', () => {
      const input = `{
//comment
"key": "value"
}`
      const expected = `{

"key": "value"
}`
      expect(stripJsonComments(input)).toBe(expected)
    })
  })

  describe('real-world CFD config examples', () => {
    it('processes realistic CFD config with comments', () => {
      const input = `{
  "mesh filename": "waverider.csm",  // geometry file path
  "HyperSolve": {
    "boundary conditions": [
      { "type": "no slip", "mesh boundary tags": 1 },  # wall surface
      { "type": "riemann", "mesh boundary tags": 2 }   // freestream
    ],
    "states": {
      "freestream": {
        "mach number": 8.0,    # hypersonic flow
        "temperature": 300.0   // kelvin
      }
    }
  }
}`

      const result = stripJsonComments(input)
      const parsed = JSON.parse(result)
      
      expect(parsed['mesh filename']).toBe('waverider.csm')
      expect(parsed.HyperSolve['boundary conditions']).toHaveLength(2)
      expect(parsed.HyperSolve.states.freestream['mach number']).toBe(8.0)
    })

    it('handles nested objects with comments after items', () => {
      const input = `{
  "thermodynamics": {
    "species": ["N2", "O2", "NO"],  // reactive species
    "chemistry model": "finite-rate"  # enable chemistry
  }
}`

      const result = stripJsonComments(input)
      const parsed = JSON.parse(result)
      
      expect(parsed.thermodynamics.species).toEqual(['N2', 'O2', 'NO'])
      expect(parsed.thermodynamics['chemistry model']).toBe('finite-rate')
    })

    it('handles arrays with comments', () => {
      const input = `{
  "boundary conditions": [
    { "type": "no slip" },     // wall
    { "type": "riemann" },     // inlet
    { "type": "extrapolate" }  // outlet
  ]
}`

      const result = stripJsonComments(input)
      const parsed = JSON.parse(result)
      
      expect(parsed['boundary conditions']).toHaveLength(3)
    })
  })

  describe('comment markers not at end of line', () => {
    it('handles // in middle of line (outside strings)', () => {
      // This is technically invalid JSON, but we should handle it gracefully
      const input = '{ "a": 1 // comment } "b": 2 }'
      const result = stripJsonComments(input)
      // Everything after // should be removed
      expect(result).toBe('{ "a": 1')
    })

    it('handles # in middle of line (outside strings)', () => {
      const input = '{ "a": 1 # comment } "b": 2 }'
      const result = stripJsonComments(input)
      expect(result).toBe('{ "a": 1')
    })
  })
})
