import { appConfigDir, homeDir, join } from '@tauri-apps/api/path'
import { mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { isTauri } from './fileUtils'

export type AppSettings = {
  editorVimMode: boolean
  editorFontSize: number
  uiFontSize: number
  treeFontSize: number
  menuFontSize: number
}

export const defaultAppSettings: AppSettings = {
  editorVimMode: false,
  editorFontSize: 14,
  uiFontSize: 13,
  treeFontSize: 13,
  menuFontSize: 13
}

const SETTINGS_FILENAME = 'settings.json'
const STORAGE_KEY = 'app-settings'
const APP_CONFIG_DIRNAME = 'vhs-cfd-gui'

const readLegacyLocalStorage = (): AppSettings => {
  if (typeof localStorage === 'undefined') {
    return { ...defaultAppSettings }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Partial<AppSettings>
      return { ...defaultAppSettings, ...parsed }
    } catch {
      return { ...defaultAppSettings }
    }
  }

  const editorVimMode = localStorage.getItem('editorVimMode') === 'true'
  const editorFontSize = Number(localStorage.getItem('editorFontSize') ?? defaultAppSettings.editorFontSize)
  const uiFontSize = Number(localStorage.getItem('uiFontSize') ?? defaultAppSettings.uiFontSize)
  const treeFontSize = Number(localStorage.getItem('treeFontSize') ?? defaultAppSettings.treeFontSize)
  const menuFontSize = Number(localStorage.getItem('menuFontSize') ?? defaultAppSettings.menuFontSize)

  return {
    editorVimMode,
    editorFontSize,
    uiFontSize,
    treeFontSize,
    menuFontSize
  }
}

const getSettingsDirectory = async (): Promise<string> => {
  const configDir = await appConfigDir()
  if (configDir.includes('/Library/Application Support/')) {
    const home = await homeDir()
    return join(home, '.config', APP_CONFIG_DIRNAME)
  }

  return configDir
}

const getSettingsPath = async (): Promise<string> => {
  const dir = await getSettingsDirectory()
  return join(dir, SETTINGS_FILENAME)
}

export const loadAppSettings = async (): Promise<AppSettings> => {
  if (!isTauri()) {
    return readLegacyLocalStorage()
  }

  try {
    const settingsPath = await getSettingsPath()
    const contents = await readTextFile(settingsPath)
    const parsed = JSON.parse(contents) as Partial<AppSettings>
    return { ...defaultAppSettings, ...parsed }
  } catch {
    return readLegacyLocalStorage()
  }
}

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  if (!isTauri()) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    localStorage.setItem('editorVimMode', String(settings.editorVimMode))
    localStorage.setItem('editorFontSize', String(settings.editorFontSize))
    localStorage.setItem('uiFontSize', String(settings.uiFontSize))
    localStorage.setItem('treeFontSize', String(settings.treeFontSize))
    localStorage.setItem('menuFontSize', String(settings.menuFontSize))
    return
  }

  const settingsPath = await getSettingsPath()
  const settingsDir = await getSettingsDirectory()
  await mkdir(settingsDir, { recursive: true })
  await writeTextFile(settingsPath, JSON.stringify(settings, null, 2))
}
