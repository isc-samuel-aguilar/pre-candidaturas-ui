const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const PDF_TYPE = 'application/pdf'
const OFFICE_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
const OFFICE_EXTENSIONS = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i

const EXECUTABLE_EXTENSIONS =
  /\.(exe|msi|bat|cmd|com|scr|pif|jar|vbs|ps1|sh|apk|dll|sys|reg|lnk|wsf|hta|iso|bin|run|dmg|pkg|deb|rpm|app|elf|so)$/i
const EXECUTABLE_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-ms-installer',
  'application/vnd.microsoft.portable-executable',
  'application/x-executable',
  'application/x-sharedlib',
  'application/x-sh',
  'application/x-bat',
  'application/java-archive',
  'application/x-java-archive',
  'application/vnd.android.package-archive',
  'application/x-apple-disk-image',
]

// Limite unico de validacion para cualquier tipo de archivo subido
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
// Objetivo de compresion de imagenes (se convierten siempre a JPG)
const COMPRESS_TARGET_SIZE = 1 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1920

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type)
}

export function isPdfFile(file: File): boolean {
  return file.type === PDF_TYPE
}

export function isOfficeFile(file: File): boolean {
  return OFFICE_TYPES.includes(file.type) || OFFICE_EXTENSIONS.test(file.name)
}

export function isExecutableFile(file: File): boolean {
  return EXECUTABLE_TYPES.includes(file.type) || EXECUTABLE_EXTENSIONS.test(file.name)
}

export interface ValidateFileOptions {
  allowOffice?: boolean
}

function buildSizeError(label: string, file: File): { valid: false; error: string } {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
  return {
    valid: false,
    error: `${label} pesa ${sizeMB} MB. El máximo permitido es 10 MB`,
  }
}

export function validateFile(
  file: File,
  options: ValidateFileOptions = {}
): { valid: boolean; error?: string } {
  if (isExecutableFile(file)) {
    return {
      valid: false,
      error: 'No se permiten archivos ejecutables',
    }
  }

  if (options.allowOffice && isOfficeFile(file)) {
    if (file.size > MAX_UPLOAD_SIZE) {
      return buildSizeError('El archivo ofimático', file)
    }
    return { valid: true }
  }

  if (!isImageFile(file) && !isPdfFile(file)) {
    return {
      valid: false,
      error: 'Solo se permiten imágenes (JPG, PNG, GIF, WEBP) o PDF',
    }
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return buildSizeError(isPdfFile(file) ? 'El PDF' : 'La imagen', file)
  }

  return { valid: true }
}

function getTargetDimensions(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
    return { width, height }
  }

  const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height)
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

function imageToBlob(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('No se pudo crear el canvas'))
      return
    }

    // Fondo blanco: JPEG no soporta transparencia (el canvas la pintaria de negro)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Error al convertir la imagen'))
      },
      'image/jpeg',
      quality
    )
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = URL.createObjectURL(file)
  })
}

function toJpegFilename(name: string): string {
  return /\.[^.]+$/.test(name) ? name.replace(/\.[^.]+$/, '.jpg') : `${name}.jpg`
}

export async function compressImage(
  file: File,
  maxSizeBytes: number = COMPRESS_TARGET_SIZE
): Promise<File> {
  const img = await loadImage(file)
  const { width, height } = getTargetDimensions(img.naturalWidth, img.naturalHeight)

  const qualities = [0.8, 0.6, 0.4, 0.3]
  for (const quality of qualities) {
    const blob = await imageToBlob(img, width, height, quality)
    if (blob.size <= maxSizeBytes) {
      return new File([blob], toJpegFilename(file.name), { type: 'image/jpeg' })
    }
  }

  const scale = 0.5
  const smallWidth = Math.round(width * scale)
  const smallHeight = Math.round(height * scale)
  const blob = await imageToBlob(img, smallWidth, smallHeight, 0.3)

  return new File([blob], toJpegFilename(file.name), { type: 'image/jpeg' })
}
