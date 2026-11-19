const PDF_MIME_TYPE = 'application/pdf'

const POPUP_BLOCKED_MESSAGE = 'Permite las ventanas emergentes para abrir el documento'

const EXTENSION_MIME_TYPES: Record<string, string> = {
  '.pdf': PDF_MIME_TYPE,
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
}

function resolveMimeType(filename: string, blob: Blob): string {
  const declared = (blob.type.split(';', 1)[0] ?? '').trim().toLowerCase()
  if (declared && declared !== 'application/octet-stream') return declared

  const match = /\.([^./\\]+)$/.exec(filename)
  const extension = match ? `.${(match[1] ?? '').toLowerCase()}` : ''
  return EXTENSION_MIME_TYPES[extension] ?? declared
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildViewerPage(
  filename: string,
  fileUrl: string,
  mimeType: string,
  isPdf: boolean
): string {
  const safeFilename = escapeHtml(filename)
  const body = isPdf
    ? `<embed type="application/pdf" src="${fileUrl}" style="position:fixed;inset:0;width:100%;height:100%;border:0">` +
      `<a href="${fileUrl}" download="${safeFilename}" style="position:fixed;top:8px;right:8px;font:12px sans-serif;color:#666;background:#fff;padding:4px 8px;text-decoration:none">Descargar</a>`
    : `<img src="${fileUrl}" alt="${safeFilename}" style="max-width:100%;max-height:100vh;display:block;margin:auto">`

  return `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<meta name="content-type" content="${escapeHtml(mimeType)}">` +
    `<title>${safeFilename}</title>` +
    `<style>html,body{margin:0;padding:0;height:100%;background:#fff}</style></head>` +
    `<body>${body}</body></html>`
}

export async function openFileInNewTab(
  filename: string,
  load: () => Promise<Blob>
): Promise<void> {
  const tab = window.open('', '_blank')
  if (!tab) throw new Error(POPUP_BLOCKED_MESSAGE)
  tab.opener = null

  const createdUrls: string[] = []
  const revokeCreatedUrls = () => {
    while (createdUrls.length > 0) {
      const url = createdUrls.pop()
      if (url) URL.revokeObjectURL(url)
    }
  }

  try {
    const blob = await load()
    if (tab.closed) return

    const declaredType = (blob.type.split(';', 1)[0] ?? '').trim().toLowerCase()
    const mimeType = resolveMimeType(filename, blob)
    const fileBlob =
      mimeType && declaredType !== mimeType
        ? blob.slice(0, blob.size, mimeType)
        : blob

    if (mimeType === PDF_MIME_TYPE || mimeType.startsWith('image/')) {
      const fileUrl = URL.createObjectURL(fileBlob)
      createdUrls.push(fileUrl)
      const pageUrl = URL.createObjectURL(
        new Blob([buildViewerPage(filename, fileUrl, mimeType, mimeType === PDF_MIME_TYPE)], {
          type: 'text/html',
        })
      )
      createdUrls.push(pageUrl)
      tab.location.replace(pageUrl)
    } else {
      const url = URL.createObjectURL(fileBlob)
      createdUrls.push(url)
      tab.location.replace(url)
    }

    const cleanup = window.setInterval(() => {
      if (tab.closed) {
        window.clearInterval(cleanup)
        revokeCreatedUrls()
      }
    }, 1000)
  } catch (error) {
    revokeCreatedUrls()
    tab.close()
    throw error
  }
}

export async function openOrDownloadFile(
  filename: string,
  load: () => Promise<Blob>
): Promise<void> {
  const isPdfFilename = /\.pdf$/i.test(filename)
  const hasExtension = /\.[^./\\]+$/.test(filename)
  const mayBePdf = isPdfFilename || !hasExtension
  let tab = mayBePdf ? window.open('', '_blank') : null

  try {
    if (tab) tab.opener = null
    const blob = await load()
    const [mimeType = ''] = blob.type.split(';', 1)
    const isPdf = mimeType === PDF_MIME_TYPE ||
      (isPdfFilename && (!mimeType || mimeType === 'application/octet-stream'))

    if (isPdf) {
      if (!mayBePdf) tab = window.open('', '_blank')
      if (!tab) throw new Error('Permite las ventanas emergentes para abrir el PDF')
      if (tab.closed) return
      tab.opener = null
      const viewer = tab
      const url = URL.createObjectURL(
        blob.type === PDF_MIME_TYPE ? blob : blob.slice(0, blob.size, PDF_MIME_TYPE)
      )
      try {
        viewer.location.replace(url)
      } catch (error) {
        URL.revokeObjectURL(url)
        throw error
      }

      const cleanup = window.setInterval(() => {
        if (viewer.closed) {
          window.clearInterval(cleanup)
          URL.revokeObjectURL(url)
        }
      }, 1000)
      return
    }

    tab?.close()
    tab = null
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    try {
      anchor.click()
    } finally {
      anchor.remove()
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    tab?.close()
    throw error
  }
}
