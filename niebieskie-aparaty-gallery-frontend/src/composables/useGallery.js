import { useApi } from './useApi.js'

export function useGallery() {
  const { get } = useApi()
  const state = { images: [], loading: false, error: null }

  async function load(eventId) {
    state.loading = true
    state.error = null
    try {
      const items = await get(`/api/gallery/${encodeURIComponent(eventId)}`)
      state.images = mapToImages(items)
    } catch {
      state.error = 'server_error'
    } finally {
      state.loading = false
    }
    return state
  }

  function mapToImages(items) {
    return items.map((item, i) => ({
      id: i,
      width: parseInt(item.compressedFileWidth, 10),
      height: parseInt(item.compressedFileHeight, 10),
      thumbnailUrl: item.compressedFilePresignedUrl,
      fullUrl: item.compressedFilePresignedUrl,
      downloadUrl: item.originalFilePresignedUrl,
      fileName: item.fileName,
    }))
  }

  return { state, load }
}
