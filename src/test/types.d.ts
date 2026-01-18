// Global type extensions for test environment
declare global {
  // File System Access API
  function showOpenFilePicker(options?: {
    types?: Array<{
      description: string
      accept: Record<string, string[]>
    }>
    multiple?: boolean
  }): Promise<FileSystemFileHandle[]>

  function showSaveFilePicker(options?: {
    suggestedName?: string
    types?: Array<{
      description: string
      accept: Record<string, string[]>
    }>
  }): Promise<FileSystemFileHandle>

  interface FileSystemFileHandle {
    getFile(): Promise<File>
    createWritable(): Promise<FileSystemWritableFileStream>
  }

  interface FileSystemWritableFileStream {
    write(data: Blob | BufferSource | string): Promise<void>
    close(): Promise<void>
  }

  // Vitest globals
  var showOpenFilePicker: typeof globalThis.showOpenFilePicker | undefined
  var showSaveFilePicker: typeof globalThis.showSaveFilePicker | undefined
}

export {}
