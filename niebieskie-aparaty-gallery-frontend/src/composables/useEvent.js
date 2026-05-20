import { useApi } from './useApi.js'

export function useEvent() {
  const { get } = useApi()
  const state = { data: null, loading: false, error: null }

  async function load(tokenId) {
    state.loading = true
    state.error = null
    try {
      state.data = await get(`/api/event/${encodeURIComponent(tokenId)}`)
    } catch (err) {
      if (err.status === 400) state.error = 'token_expired'
      else if (err.status === 404) state.error = 'not_found'
      else state.error = 'server_error'
    } finally {
      state.loading = false
    }
    return state
  }

  return { state, load }
}
