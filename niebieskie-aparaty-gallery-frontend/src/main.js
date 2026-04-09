import ApiService from './services/ApiService.js'
import { Gallery } from './gallery.js'
import { Lightbox } from './lightbox.js'

function getTokenId() {
  const params = new URLSearchParams(window.location.search)
  const tokenId = params.get('tokenId')
  return tokenId && tokenId.trim().length > 0 ? tokenId.trim() : null
}

function showAccessDenied(message) {
  document.getElementById('app').classList.add('hidden')
  const el = document.getElementById('access-denied')
  el.querySelector('p').textContent = message
  el.classList.remove('hidden')
}

document.addEventListener('DOMContentLoaded', async () => {
  const tokenId = getTokenId()
  if (!tokenId) {
    document.getElementById('access-denied').classList.remove('hidden')
    return
  }

  document.getElementById('app').classList.remove('hidden')

  try {
    const event = await ApiService.fetchEvent(tokenId)
    const items = await ApiService.fetchGallery(event.eventId)
    const images = ApiService.mapToImages(items)

    const metaText = `${images.length} zdjęć`
    document.getElementById('gallery-meta').textContent = metaText
    document.getElementById('gallery-meta-mobile').textContent = metaText

    document.getElementById('event-title').textContent = event.title
    document.getElementById('event-date').textContent = new Date(event.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })
    document.getElementById('event-header').classList.remove('hidden')

    document.getElementById('loading-state').classList.add('hidden')
    document.getElementById('gallery-container').classList.remove('hidden')

    const lightbox = new Lightbox(images)
    const gallery = new Gallery(images, (index) => lightbox.open(index))
    gallery.init()
  } catch (err) {
    const messages = {
      token_expired: 'Link do galerii wygasł.',
      not_found: 'Nie znaleziono galerii.',
      server_error: 'Wystąpił błąd serwera. Spróbuj ponownie.',
    }
    showAccessDenied(messages[err.message] || 'Wystąpił błąd serwera. Spróbuj ponownie.')
  }
})
