export type DemoFileType = 'example' | 'clean'

export interface DemoFileEntry {
  id: string
  label: string
  exampleFilename: string
  cleanFilename: string
}

export const DEMO_FILES_CATALOG: readonly DemoFileEntry[] = [
  {
    id: 'ayto-aguascalientes',
    label: 'AYTO AGUASCALIENTES',
    exampleFilename: 'EJEMPLO LLENADO - AYTO AGUASCALIENTES.xlsx',
    cleanFilename: 'AYTO AGUASCALIENTES.xlsx',
  },
  {
    id: 'aytos-mas-de-30-hab',
    label: 'AYTOS MAS DE 30 HAB',
    exampleFilename: 'EJEMPLO LLENADO - AYTOS MAS DE 30 HAB.xlsx',
    cleanFilename: 'AYTOS MAS DE 30 HAB.xlsx',
  },
  {
    id: 'aytos-menos-de-30-hab',
    label: 'AYTOS MENOS DE 30 HAB',
    exampleFilename: 'EJEMPLO LLENADO - AYTOS MENOS DE 30 HAB.xlsx',
    cleanFilename: 'AYTOS MENOS DE 30 HAB.xlsx',
  },
  {
    id: 'diputado-mr',
    label: 'DIPUTADO MR',
    exampleFilename: 'EJEMPLO LLENADO - DIP MR.xlsx',
    cleanFilename: 'DIPUTADO MR.xlsx',
  },
  {
    id: 'diputado-rp',
    label: 'DIPUTADO RP',
    exampleFilename: 'EJEMPLO LLENADO - DIP RP.xlsx',
    cleanFilename: 'DIPUTADO RP.xlsx',
  },
  {
    id: 'gubernatura',
    label: 'GUBERNATURA',
    exampleFilename: 'EJEMPLO LLENADO - GUBERNATURA.xlsx',
    cleanFilename: 'GUBERNATURA.xlsx',
  },
]

export function getDemoFileEntry(id: string): DemoFileEntry | undefined {
  return DEMO_FILES_CATALOG.find((entry) => entry.id === id)
}

export function getDemoFilename(entry: DemoFileEntry, type: DemoFileType): string {
  return type === 'example' ? entry.exampleFilename : entry.cleanFilename
}

export const DEMO_FILES_URL_PREFIX = '/demo-files'
export const DEMO_FILES_FILENAMES: readonly string[] = DEMO_FILES_CATALOG.flatMap(
  (entry) => [entry.exampleFilename, entry.cleanFilename]
)

export function demoFileHref(filename: string): string {
  return `${DEMO_FILES_URL_PREFIX}/${encodeURIComponent(filename)}`
}
