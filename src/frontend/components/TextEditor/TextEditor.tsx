import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { X, Save } from 'lucide-react'
import './TextEditor.css'

interface TextEditorProps {
  content: string
  filename: string
  onSave: (newContent: string) => void
  onClose: () => void
}

const TextEditor = ({ content, filename, onSave, onClose }: TextEditorProps) => {
  const [currentContent, setCurrentContent] = useState(content)
  const [hasChanges, setHasChanges] = useState(false)

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCurrentContent(value)
      setHasChanges(value !== content)
    }
  }

  const handleSave = () => {
    onSave(currentContent)
    setHasChanges(false)
  }

  const handleClose = () => {
    if (hasChanges) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close the editor?'
      )
      if (!confirm) return
    }
    onClose()
  }

  return (
    <div className="text-editor-container">
      <div className="text-editor-header">
        <div className="text-editor-title">
          <span className="text-editor-filename">{filename}</span>
          {hasChanges && <span className="text-editor-modified">●</span>}
        </div>
        <div className="text-editor-actions">
          <button 
            className="text-editor-button text-editor-button-save" 
            onClick={handleSave}
            disabled={!hasChanges}
            title="Save and reload geometry"
          >
            <Save size={16} />
            <span>Save & Reload</span>
          </button>
          <button 
            className="text-editor-button text-editor-button-close" 
            onClick={handleClose}
            title="Close editor"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="text-editor-content">
        <Editor
          height="100%"
          defaultLanguage="plaintext"
          value={currentContent}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on'
          }}
        />
      </div>
    </div>
  )
}

export default TextEditor
