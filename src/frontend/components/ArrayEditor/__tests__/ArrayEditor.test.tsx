import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ArrayEditor from '../ArrayEditor'

describe('ArrayEditor', () => {
  describe('string arrays', () => {
    it('renders existing string items', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={['N2', 'O2', 'NO']}
          onChange={onChange}
          itemType="string"
          label="Species"
        />
      )
      
      expect(screen.getByDisplayValue('N2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('O2')).toBeInTheDocument()
      expect(screen.getByDisplayValue('NO')).toBeInTheDocument()
    })
    
    it('adds new item when clicking add button', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={['N2']}
          onChange={onChange}
          itemType="string"
          label="Species"
        />
      )
      
      const addButton = screen.getByText(/add/i)
      fireEvent.click(addButton)
      
      expect(onChange).toHaveBeenCalledWith(['N2', ''])
    })
    
    it('removes item when clicking delete button', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={['N2', 'O2', 'NO']}
          onChange={onChange}
          itemType="string"
          label="Species"
        />
      )
      
      const deleteButtons = screen.getAllByTitle(/delete/i)
      fireEvent.click(deleteButtons[1]) // Delete 'O2'
      
      expect(onChange).toHaveBeenCalledWith(['N2', 'NO'])
    })
    
    it('updates item value when typing', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={['N2', 'O2']}
          onChange={onChange}
          itemType="string"
          label="Species"
        />
      )
      
      const input = screen.getByDisplayValue('N2')
      fireEvent.change(input, { target: { value: 'N' } })
      
      expect(onChange).toHaveBeenCalledWith(['N', 'O2'])
    })
  })
  
  describe('number arrays', () => {
    it('renders existing number items', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={[10, 14, 21]}
          onChange={onChange}
          itemType="number"
          label="Mesh Tags"
        />
      )
      
      expect(screen.getByDisplayValue('10')).toBeInTheDocument()
      expect(screen.getByDisplayValue('14')).toBeInTheDocument()
      expect(screen.getByDisplayValue('21')).toBeInTheDocument()
    })
    
    it('converts string input to number', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={[10]}
          onChange={onChange}
          itemType="number"
          label="Tags"
        />
      )
      
      const input = screen.getByDisplayValue('10')
      fireEvent.change(input, { target: { value: '25' } })
      
      expect(onChange).toHaveBeenCalledWith([25])
    })
    
    it('validates number input', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={[10]}
          onChange={onChange}
          itemType="number"
          label="Tags"
        />
      )
      
      const input = screen.getByDisplayValue('10')
      fireEvent.change(input, { target: { value: 'invalid' } })
      
      // Should not call onChange with invalid number
      expect(onChange).not.toHaveBeenCalled()
    })
  })
  
  describe('empty arrays', () => {
    it('renders empty state with add button', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={[]}
          onChange={onChange}
          itemType="string"
          label="Items"
        />
      )
      
      expect(screen.getByText(/add/i)).toBeInTheDocument()
    })
  })
  
  describe('placeholder', () => {
    it('shows placeholder text in new items', () => {
      const onChange = vi.fn()
      render(
        <ArrayEditor
          value={['']}
          onChange={onChange}
          itemType="string"
          label="Species"
          placeholder="Enter species name"
        />
      )
      
      const input = screen.getByPlaceholderText('Enter species name')
      expect(input).toBeInTheDocument()
    })
  })
})
