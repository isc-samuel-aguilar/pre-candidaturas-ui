const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const PDF_TYPE = 'application/pdf'

const MAX_IMAGE_SIZE = 1 * 1024 * 1024
const MAX_PDF_SIZE = 2 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 1920

export function isImageFile(file: File): boolean {
  return IMAGE_TYPES.includes(file.type)
}

export function isPdfFile(file: File): boolean {
  return file.type === PDF_TYPE
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!isImageFile(file) && !isPdfFile(file)) {
    return {
      valid: false,
      error: 'Solo se permiten imágenes (JPG, PNG, GIF, WEBP) o PDF',
    }
  }

  if (isPdfFile(file) && file.size > MAX_PDF_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `El PDF pesa ${sizeMB} MB. El máximo permitido es 2 MB`,
    }
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

export async function compressImage(file: File, maxSizeBytes: number = MAX_IMAGE_SIZE): Promise<File> {
  if (file.size <= maxSizeBytes) {
    return file
  }

  const img = await loadImage(file)
  const { width, height } = getTargetDimensions(img.naturalWidth, img.naturalHeight)

  const qualities = [0.8, 0.6, 0.4, 0.3]
  for (const quality of qualities) {
    const blob = await imageToBlob(img, width, height, quality)
    if (blob.size <= maxSizeBytes) {
      return new File([blob], file.name, { type: 'image/jpeg' })
    }
  }

  const scale = 0.5
  const smallWidth = Math.round(width * scale)
  const smallHeight = Math.round(height * scale)
  const blob = await imageToBlob(img, smallWidth, smallHeight, 0.3)

  if (blob.size <= maxSizeBytes) {
    return new File([blob], file.name, { type: 'image/jpeg' })
  }

  return new File([blob], file.name, { type: 'image/jpeg' })
}
