import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { X, Save } from 'lucide-react'
import { initVimMode, VimMode } from 'monaco-vim'
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
  vimModeEnabled: boolean
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
  onChangeContent,
  vimModeEnabled
}: TextEditorProps) => {
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0]
  const editorRef = useRef<any>(null)
  const vimModeRef = useRef<any>(null)
  const vimStatusRef = useRef<HTMLDivElement | null>(null)
  const activeTabIdRef = useRef<string | null>(null)
  const onSaveTabRef = useRef(onSaveTab)
  const onCloseTabRef = useRef(onCloseTab)
  const vimCommandsReadyRef = useRef(false)

  useEffect(() => {
    activeTabIdRef.current = activeTab?.id ?? null
  }, [activeTab?.id])

  useEffect(() => {
    onSaveTabRef.current = onSaveTab
    onCloseTabRef.current = onCloseTab
  }, [onSaveTab, onCloseTab])

  useEffect(() => {
    if (vimCommandsReadyRef.current) return
    if (!VimMode?.Vim?.defineEx) return

    const runSave = () => {
      const tabId = activeTabIdRef.current
      if (!tabId) return
      onSaveTabRef.current(tabId)
    }

    const runClose = () => {
      const tabId = activeTabIdRef.current
      if (!tabId) return
      onCloseTabRef.current(tabId)
    }

    VimMode.Vim.defineEx('w', 'w', () => {
      runSave()
    })

    VimMode.Vim.defineEx('q', 'q', () => {
      runClose()
    })

    VimMode.Vim.defineEx('wq', 'wq', () => {
      runSave()
      runClose()
    })
    vimCommandsReadyRef.current = true
  }, [])

  useEffect(() => {
    if (!editorRef.current) return

    if (vimModeEnabled && !vimModeRef.current) {
      vimModeRef.current = initVimMode(editorRef.current, vimStatusRef.current || undefined)
    }

    if (!vimModeEnabled && vimModeRef.current) {
      vimModeRef.current.dispose()
      vimModeRef.current = null
      if (vimStatusRef.current) {
        vimStatusRef.current.textContent = ''
      }
    }
  }, [vimModeEnabled])

  useEffect(() => {
    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose()
        vimModeRef.current = null
      }
    }
  }, [])

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
        {vimModeEnabled && <div ref={vimStatusRef} className="text-editor-vim-status" />}
      </div>
      <div className="text-editor-content">
        {activeTab ? (
          <Editor
            height="100%"
            language={getLanguageForFilename(activeTab.filename)}
            value={activeTab.content}
            onChange={handleEditorChange}
            onMount={(editorInstance) => {
              editorRef.current = editorInstance
            }}
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
