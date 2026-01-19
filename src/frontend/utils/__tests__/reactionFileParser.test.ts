import { describe, it, expect } from 'vitest'
import { parseReactionFile } from '../reactionFileParser'

describe('parseReactionFile', () => {
  it('extracts species from H2-O2 reaction mechanism', () => {
    const fileContent = `**** potentially comments here with lines starting with "*"
REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1        H2 + O2  <=> 2OH
2         H + O2  <=> OH + O
3 OH + H2 <=> H2O + H
4 O + H2 <=> OH + H
5 OH + OH <=> H2O + O
6 H + OH + M <=> H2O + M
7 2H + M <=> H2 + M
FORWARD REACTION MODEL 0.0`

    const result = parseReactionFile(fileContent)
    
    expect(result.species).toContain('H2')
    expect(result.species).toContain('O2')
    expect(result.species).toContain('OH')
    expect(result.species).toContain('H')
    expect(result.species).toContain('O')
    expect(result.species).toContain('H2O')
    // M is a third body indicator, not included in species list
    expect(result.species).not.toContain('M')
    expect(result.species).toHaveLength(6)
  })

  it('handles species with commas in names', () => {
    const fileContent = `REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1 CH2CO,ketene + O2 <=> CO2 + H2O
FORWARD REACTION MODEL 0.0`

    const result = parseReactionFile(fileContent)
    
    expect(result.species).toContain('CH2CO,ketene')
    expect(result.species).toContain('O2')
    expect(result.species).toContain('CO2')
    expect(result.species).toContain('H2O')
  })

  it('handles species with hyphens in names', () => {
    const fileContent = `REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1 C4H9,s-butyl + O2 <=> products
FORWARD REACTION MODEL 0.0`

    const result = parseReactionFile(fileContent)
    
    expect(result.species).toContain('C4H9,s-butyl')
  })

  it('handles species with parentheses', () => {
    const fileContent = `REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1 CH3(OH) + O2 <=> H2O + CO
FORWARD REACTION MODEL 0.0`

    const result = parseReactionFile(fileContent)
    
    expect(result.species).toContain('CH3(OH)')
  })

  it('stops parsing at non-reaction lines', () => {
    const fileContent = `REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1 H2 + O2 <=> 2OH
2 H + O2 <=> OH + O
FORWARD REACTION MODEL 0.0
*** the file has more below this
3 OH + OH <=> H2O + O`

    const result = parseReactionFile(fileContent)
    
    // Should only parse first 2 reactions
    expect(result.species).toContain('H2')
    expect(result.species).toContain('O2')
    expect(result.species).toContain('OH')
    expect(result.species).toContain('H')
    expect(result.species).toContain('O')
    // H2O should NOT be present (from line 3 which is after FORWARD REACTION MODEL)
    expect(result.species).not.toContain('H2O')
  })

  it('handles floating point stoichiometric coefficients', () => {
    const fileContent = `REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1 1.5H2 + O2 <=> H2O + 0.5O2
FORWARD REACTION MODEL 0.0`

    const result = parseReactionFile(fileContent)
    
    expect(result.species).toContain('H2')
    expect(result.species).toContain('O2')
    expect(result.species).toContain('H2O')
  })

  it('returns empty array for invalid content', () => {
    const fileContent = `This is not a reaction file`

    const result = parseReactionFile(fileContent)
    
    expect(result.species).toEqual([])
  })

  it('ignores comment lines starting with asterisk', () => {
    const fileContent = `**** This is a comment
* Another comment
REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1 H2 + O2 <=> 2OH
FORWARD REACTION MODEL 0.0`

    const result = parseReactionFile(fileContent)
    
    expect(result.species).toContain('H2')
    expect(result.species).toContain('O2')
    expect(result.species).toContain('OH')
  })

  it('removes M from species list as it is a third body', () => {
    const fileContent = `REACTION MECHANISM EQUATION LIST
REACTION REACTANT SIDE PRODUCT SIDE
1 H + OH + M <=> H2O + M
2 2H + M <=> H2 + M
FORWARD REACTION MODEL 0.0`

    const result = parseReactionFile(fileContent)
    
    // M is a third body, not a chemical species
    expect(result.species).not.toContain('M')
    expect(result.species).toContain('H')
    expect(result.species).toContain('OH')
    expect(result.species).toContain('H2O')
    expect(result.species).toContain('H2')
  })
})
