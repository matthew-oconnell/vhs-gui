import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MapEditor from '../MapEditor'

describe('MapEditor', () => {
  describe('string values', () => {
    it('renders existing key-value pairs', () => {
      const onChange = vi.fn()
      const value = { species1: 'N2', species2: 'O2' }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="string"
          label="Species Map"
        />
      )
      
      expect(screen.getByDisplayValue('species1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('N2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('species2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('O2')).toBeInTheDocument()
    })
    
    it('adds new entry when clicking add button', () => {
      const onChange = vi.fn()
      const value = { key1: 'value1' }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="string"
          label="Map"
        />
      )
      
      const addButton = screen.getByText(/add/i)
      fireEvent.click(addButton)
      
      expect(onChange).toHaveBeenCalledWith({ key1: 'value1', '': '' })
    })
    
    it('removes entry when clicking delete button', () => {
      const onChange = vi.fn()
      const value = { key1: 'value1', key2: 'value2', key3: 'value3' }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="string"
          label="Map"
        />
      )
      
      const deleteButtons = screen.getAllByTitle(/delete/i)
      fireEvent.click(deleteButtons[1]) // Delete second entry
      
      expect(onChange).toHaveBeenCalledWith({ key1: 'value1', key3: 'value3' })
    })
    
    it('updates key when editing', () => {
      const onChange = vi.fn()
      const value = { oldKey: 'value1' }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="string"
          label="Map"
        />
      )
      
      const keyInput = screen.getByDisplayValue('oldKey')
      fireEvent.change(keyInput, { target: { value: 'newKey' } })
      
      expect(onChange).toHaveBeenCalledWith({ newKey: 'value1' })
    })
    
    it('updates value when editing', () => {
      const onChange = vi.fn()
      const value = { key1: 'oldValue' }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="string"
          label="Map"
        />
      )
      
      const valueInput = screen.getByDisplayValue('oldValue')
      fireEvent.change(valueInput, { target: { value: 'newValue' } })
      
      expect(onChange).toHaveBeenCalledWith({ key1: 'newValue' })
    })
  })
  
  describe('number values', () => {
    it('renders number values correctly', () => {
      const onChange = vi.fn()
      const value = { weight1: 10.5, weight2: 20.3 }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="number"
          label="Weights"
        />
      )
      
      expect(screen.getByDisplayValue('10.5')).toBeInTheDocument()
      expect(screen.getByDisplayValue('20.3')).toBeInTheDocument()
    })
    
    it('converts string to number for values', () => {
      const onChange = vi.fn()
      const value = { weight1: 10 }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="number"
          label="Weights"
        />
      )
      
      const valueInput = screen.getByDisplayValue('10')
      fireEvent.change(valueInput, { target: { value: '25.5' } })
      
      expect(onChange).toHaveBeenCalledWith({ weight1: 25.5 })
    })
    
    it('validates number input for values', () => {
      const onChange = vi.fn()
      const value = { weight1: 10 }
      
      render(
        <MapEditor
          value={value}
          onChange={onChange}
          valueType="number"
          label="Weights"
        />
      )
      
      const valueInput = screen.getByDisplayValue('10')
      fireEvent.change(valueInput, { target: { value: 'invalid' } })
      
      // Should not call onChange with invalid number
      expect(onChange).not.toHaveBeenCalled()
    })
  })
  
  describe('empty maps', () => {
    it('renders empty state with add button', () => {
      const onChange = vi.fn()
      
      render(
        <MapEditor
          value={{}}
          onChange={onChange}
          valueType="string"
          label="Items"
        />
      )
      
      expect(screen.getByText(/add/i)).toBeInTheDocument()
    })
  })
  
  describe('placeholders', () => {
    it('shows placeholder text for keys and values', () => {
      const onChange = vi.fn()
      
      render(
        <MapEditor
          value={{ '': '' }}
          onChange={onChange}
          valueType="string"
          label="Map"
          keyPlaceholder="Enter key"
          valuePlaceholder="Enter value"
        />
      )
      
      expect(screen.getByPlaceholderText('Enter key')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
    })
  })
})
