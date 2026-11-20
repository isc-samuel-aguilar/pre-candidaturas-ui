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
    exampleFilename: 'EJEMPLO LLENADO - DIPUTADO RP.xlsx',
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

export interface DemarcationDemoMapping {
  entryId: string
  demarcations: readonly string[]
  prefixes?: readonly string[]
  renameDownload?: boolean
}

export const DEMARCATION_DEMO_MAPPINGS: readonly DemarcationDemoMapping[] = [
  { entryId: 'ayto-aguascalientes', demarcations: ['AYTO AGUASCALIENTES'] },
  { entryId: 'gubernatura', demarcations: ['GUBERNATURA'] },
  { entryId: 'diputado-rp', demarcations: ['DIPUTADO RP'] },
  { entryId: 'diputado-mr', demarcations: [], prefixes: ['DTTO'], renameDownload: true },
  {
    entryId: 'aytos-menos-de-30-hab',
    demarcations: [
      'AYTO ASIENTOS',
      'AYTO COSIO',
      'AYTO EL LLANO',
      'AYTO SAN JOSE DE GRACIA',
      'AYTO TEPEZALA',
    ],
    renameDownload: true,
  },
  {
    entryId: 'aytos-mas-de-30-hab',
    demarcations: [
      'AYTO CALVILLO',
      'AYTO JESUS MARIA',
      'AYTO PABELLON DE ARTEAGA',
      'AYTO RINCON DE ROMOS',
      'AYTO SAN FRANCISCO DE LOS ROMO',
    ],
    renameDownload: true,
  },
]

export interface DemarcationDemoFile {
  filename: string
  downloadFilename: string
}

function normalizeDemarcation(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

export function getDemarcationDemoFile(
  demarcation: string,
  type: DemoFileType
): DemarcationDemoFile | undefined {
  const normalized = normalizeDemarcation(demarcation)
  const mapping = DEMARCATION_DEMO_MAPPINGS.find((candidate) =>
    candidate.demarcations.some((name) => normalizeDemarcation(name) === normalized) ||
    candidate.prefixes?.some((prefix) => normalized.startsWith(normalizeDemarcation(prefix)))
  )
  const entry = mapping && getDemoFileEntry(mapping.entryId)
  if (!entry) return undefined

  const filename = getDemoFilename(entry, type)
  return {
    filename,
    downloadFilename: mapping.renameDownload ? demarcacionDemoFilename(demarcation.trim(), type) : filename,
  }
}

export function demarcacionDemoFilename(demarcacion: string, type: DemoFileType): string {
  return type === 'example' ? `EJEMPLO LLENADO - ${demarcacion}.xlsx` : `${demarcacion}.xlsx`
}

// The remaining aliases come from the demarcation catalog seed.
const DEMARCACION_ALIASES = [
  'GUBERNATURA',
  'AYTO AGUASCALIENTES',
  'AYTO ASIENTOS',
  'AYTO CALVILLO',
  'AYTO COSIO',
  'AYTO JESUS MARIA',
  'AYTO PABELLON DE ARTEAGA',
  'AYTO RINCON DE ROMOS',
  'AYTO SAN JOSE DE GRACIA',
  'AYTO TEPEZALA',
  'AYTO SAN FRANCISCO DE LOS ROMO',
  'AYTO EL LLANO',
  ...Array.from({ length: 18 }, (_, index) => `DTTO ${index + 1}`),
  'DIPUTADO RP',
]

export const DEMO_FILES_FILENAMES: readonly string[] = [
  ...DEMO_FILES_CATALOG.flatMap((entry) => [entry.exampleFilename, entry.cleanFilename]),
  ...DEMARCACION_ALIASES.flatMap((alias) => [
    demarcacionDemoFilename(alias, 'example'),
    demarcacionDemoFilename(alias, 'clean'),
  ]),
]

export function demoFileHref(filename: string): string {
  return `${DEMO_FILES_URL_PREFIX}/${encodeURIComponent(filename)}`
}
