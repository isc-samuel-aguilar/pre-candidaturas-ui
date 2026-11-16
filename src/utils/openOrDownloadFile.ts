const PDF_MIME_TYPE = 'application/pdf'

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
