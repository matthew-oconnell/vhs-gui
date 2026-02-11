import Editor from '@monaco-editor/react'
import { X, Save } from 'lucide-react'
import './TextEditor.css'

export interface TextEditorTab {
  id: string
  filename: string
  content: string
  isDirty: boolean
  kind: 'csm' | 'text'
}

interface TextEditorProps {
  tabs: TextEditorTab[]
  activeTabId: string | null
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onSaveTab: (tabId: string) => void
  onChangeContent: (tabId: string, newContent: string) => void
}

const getLanguageForFilename = (filename: string) => {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.json')) return 'json'
  return 'plaintext'
}

const TextEditor = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onSaveTab,
  onChangeContent
}: TextEditorProps) => {
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0]

  const handleEditorChange = (value: string | undefined) => {
    if (!activeTab || value === undefined) return
    onChangeContent(activeTab.id, value)
  }

  const handleSave = () => {
    if (!activeTab) return
    onSaveTab(activeTab.id)
  }

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find(item => item.id === tabId)
    if (!tab) return
    if (tab.isDirty) {
      const confirm = window.confirm(
        'You have unsaved changes. Are you sure you want to close this tab?'
      )
      if (!confirm) return
    }
    onCloseTab(tabId)
  }

  const saveLabel = activeTab?.kind === 'csm' ? 'Save & Reload' : 'Save'
  const saveTitle = activeTab?.kind === 'csm'
    ? 'Save and rebuild geometry'
    : 'Save file'

  return (
    <div className="text-editor-container">
      <div className="text-editor-header">
        <div className="text-editor-tabs">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`text-editor-tab ${tab.id === activeTab?.id ? 'active' : ''}`}
              onClick={() => onSelectTab(tab.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  onSelectTab(tab.id)
                }
              }}
            >
              <span className="text-editor-tab-title">{tab.filename}</span>
              {tab.isDirty && <span className="text-editor-tab-modified">●</span>}
              <button
                type="button"
                className="text-editor-tab-close"
                onClick={(event) => {
                  event.stopPropagation()
                  handleCloseTab(tab.id)
                }}
                title="Close tab"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        {activeTab && (
          <div className="text-editor-actions">
            <button 
              className="text-editor-button text-editor-button-save" 
              onClick={handleSave}
              disabled={!activeTab.isDirty}
              title={saveTitle}
            >
              <Save size={16} />
              <span>{saveLabel}</span>
            </button>
          </div>
        )}
      </div>
      <div className="text-editor-content">
        {activeTab ? (
          <Editor
            height="100%"
            language={getLanguageForFilename(activeTab.filename)}
            value={activeTab.content}
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
        ) : (
          <div className="text-editor-empty">No file open</div>
        )}
      </div>
    </div>
  )
}

export default TextEditor
