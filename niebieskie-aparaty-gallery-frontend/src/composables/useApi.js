export function useApi() {
  async function get(url) {
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw Object.assign(new Error(body.error || 'error'), { status: res.status })
    }
    return res.json()
  }
  return { get }
}
