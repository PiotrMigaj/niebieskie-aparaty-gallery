const ApiService = {
  async fetchEvent(tokenId) {
    const res = await fetch(`/api/event/${encodeURIComponent(tokenId)}`)
    if (res.status === 400) throw new Error('token_expired')
    if (res.status === 404) throw new Error('not_found')
    if (!res.ok) throw new Error('server_error')
    return res.json()
  },

  async fetchGallery(eventId) {
    const res = await fetch(`/api/gallery/${encodeURIComponent(eventId)}`)
    if (!res.ok) throw new Error('server_error')
    return res.json()
  },

  mapToImages(items) {
    return items.map((item, i) => ({
      id: i,
      width: parseInt(item.compressedFileWidth, 10),
      height: parseInt(item.compressedFileHeight, 10),
      thumbnailUrl: item.compressedFilePresignedUrl,
      fullUrl: item.compressedFilePresignedUrl,
      downloadUrl: item.originalFilePresignedUrl,
      fileName: item.fileName,
    }))
  },
}

export default ApiService
