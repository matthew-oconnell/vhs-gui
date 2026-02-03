/**
 * CategoryDropdown - Collapsible category of setup wizards
 * 
 * Shows category badge with completion status.
 * Click to expand dropdown showing individual wizard items.
 */

import { useState, useRef, useEffect } from 'react'
import { Check, Circle, AlertCircle, ChevronDown } from 'lucide-react'
import './CategoryDropdown.css'

export interface WizardItem {
  id: string
  label: string
  isComplete: boolean
  details?: string
  onClick?: () => void
}

interface CategoryDropdownProps {
  title: string
  icon: string
  wizards: WizardItem[]
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

function CategoryDropdown({ 
  title, 
  icon, 
  wizards, 
  isOpen, 
  onToggle,
  onClose 
}: CategoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Calculate completion statistics
  const totalItems = wizards.length
  const completedItems = wizards.filter(w => w.isComplete).length
  const allComplete = totalItems > 0 && completedItems === totalItems
  const someComplete = completedItems > 0 && completedItems < totalItems
  const noneComplete = completedItems === 0

  // Determine category status class
  const statusClass = allComplete 
    ? 'category-complete' 
    : someComplete 
    ? 'category-partial' 
    : 'category-incomplete'

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleWizardClick = (wizard: WizardItem) => {
    if (wizard.onClick) {
      wizard.onClick()
      onClose() // Close dropdown after launching wizard
    }
  }

  return (
    <div className="category-dropdown" ref={dropdownRef}>
      {/* Category Badge */}
      <button
        className={`category-badge ${statusClass}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="category-icon">{icon}</span>
        <span className="category-title">{title}</span>
        <span className="category-count">
          {completedItems}/{totalItems}
        </span>
        {allComplete && <Check size={14} className="category-status-icon" />}
        {someComplete && <AlertCircle size={14} className="category-status-icon" />}
        {noneComplete && <Circle size={14} className="category-status-icon" />}
        <ChevronDown 
          size={14} 
          className={`category-chevron ${isOpen ? 'category-chevron-open' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="category-dropdown-panel">
          <div className="category-dropdown-header">
            <span className="category-dropdown-title">{icon} {title}</span>
            <span className="category-dropdown-count">{completedItems}/{totalItems}</span>
          </div>
          <div className="category-dropdown-items">
            {wizards.map((wizard) => (
              <div
                key={wizard.id}
                className={`wizard-item ${wizard.onClick ? 'wizard-item-clickable' : ''} ${
                  wizard.isComplete ? 'wizard-item-complete' : 'wizard-item-incomplete'
                }`}
                onClick={() => handleWizardClick(wizard)}
                role={wizard.onClick ? 'button' : undefined}
                tabIndex={wizard.onClick ? 0 : undefined}
              >
                <div className="wizard-item-icon">
                  {wizard.isComplete ? (
                    <Check size={16} className="wizard-icon-complete" />
                  ) : (
                    <Circle size={16} className="wizard-icon-incomplete" />
                  )}
                </div>
                <div className="wizard-item-content">
                  <div className="wizard-item-label">{wizard.label}</div>
                  {wizard.details && (
                    <div className="wizard-item-details">{wizard.details}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CategoryDropdown
