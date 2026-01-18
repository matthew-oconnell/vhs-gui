import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.showOpenFilePicker and window.showSaveFilePicker for file operations tests
// @ts-ignore - Global assignment for test environment
globalThis.showOpenFilePicker = globalThis.showOpenFilePicker || (() => Promise.reject(new Error('Not implemented in test environment')))
// @ts-ignore - Global assignment for test environment
globalThis.showSaveFilePicker = globalThis.showSaveFilePicker || (() => Promise.reject(new Error('Not implemented in test environment')))
