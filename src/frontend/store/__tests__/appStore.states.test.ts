import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../appStore'

describe('appStore - state management', () => {
  beforeEach(() => {
    // Reset store to clean state before each test
    useAppStore.setState({
      configData: { states: {} },
      selectedState: null
    })
  })

  it('adds a state to the configuration', () => {
    const state = {
      id: 'state-1',
      name: 'freestream',
      'mach number': 5.0,
      temperature: 300,
      pressure: 101325
    }
    
    useAppStore.getState().addState(state)
    
    const result = useAppStore.getState()
    expect(result.configData.states).toHaveProperty('freestream')
    expect(result.configData.states?.freestream).toEqual(state)
    expect(result.selectedState).toEqual(state)
  })
  
  it('adds multiple states without overwriting', () => {
    const state1 = {
      id: 'state-1',
      name: 'freestream',
      'mach number': 5.0,
      temperature: 300,
      pressure: 101325
    }
    
    const state2 = {
      id: 'state-2', 
      name: 'wall',
      'mach number': 0,
      temperature: 500,
      pressure: 101325
    }
    
    useAppStore.getState().addState(state1)
    useAppStore.getState().addState(state2)
    
    const states = useAppStore.getState().configData.states
    expect(states).toHaveProperty('freestream')
    expect(states).toHaveProperty('wall')
    expect(Object.keys(states || {}).length).toBe(2)
  })
  
  it('selects the newly added state', () => {
    const state = {
      id: 'state-1',
      name: 'freestream',
      'mach number': 5.0,
      temperature: 300,
      pressure: 101325
    }
    
    useAppStore.getState().addState(state)
    
    expect(useAppStore.getState().selectedState).toEqual(state)
  })
  
  it('adds a state with mass fractions for multispecies', () => {
    const state = {
      id: 'state-1',
      name: 'freestream',
      'mach number': 5.0,
      temperature: 300,
      pressure: 101325,
      'mass fractions': {
        'N2': 0.78,
        'O2': 0.22
      }
    }
    
    useAppStore.getState().addState(state)
    
    const result = useAppStore.getState()
    expect(result.configData.states?.freestream).toEqual(state)
    expect(result.configData.states?.freestream['mass fractions']).toEqual({
      'N2': 0.78,
      'O2': 0.22
    })
  })
  
  it('adds a state without mass fractions for single-species', () => {
    const state = {
      id: 'state-1',
      name: 'freestream',
      'mach number': 5.0,
      temperature: 300,
      pressure: 101325
    }
    
    useAppStore.getState().addState(state)
    
    const result = useAppStore.getState()
    expect(result.configData.states?.freestream['mass fractions']).toBeUndefined()
  })
})
