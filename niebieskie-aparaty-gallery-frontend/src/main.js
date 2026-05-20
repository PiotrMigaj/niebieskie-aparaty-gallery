import './components/GalleryItem.js'
import './components/GalleryGrid.js'
import './components/PhotoLightbox.js'
import { useEvent } from './composables/useEvent.js'
import { useGallery } from './composables/useGallery.js'

const ERROR_MESSAGES = {
  token_expired: 'Link do galerii wygasł.',
  not_found: 'Nie znaleziono galerii.',
  server_error: 'Wystąpił błąd serwera. Spróbuj ponownie.',
}

function getTokenId() {
  const params = new URLSearchParams(window.location.search)
  const tokenId = params.get('tokenId')
  return tokenId && tokenId.trim().length > 0 ? tokenId.trim() : null
}

function showAccessDenied(error = null) {
  document.getElementById('app').classList.add('hidden')
  const el = document.getElementById('access-denied')
  if (error) el.querySelector('p').textContent = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.server_error
  el.classList.remove('hidden')
}

function renderEventMeta(event, imageCount) {
  const metaText = `${imageCount} zdjęć`
  document.getElementById('gallery-meta').textContent = metaText
  document.getElementById('gallery-meta-mobile').textContent = metaText
  document.getElementById('event-title').textContent = event.title
  document.getElementById('event-date').textContent = new Date(event.createdAt).toLocaleDateString(
    'pl-PL',
    { year: 'numeric', month: 'long', day: 'numeric' }
  )
  document.getElementById('event-header').classList.remove('hidden')
  document.getElementById('loading-state').classList.add('hidden')
  document.getElementById('gallery-container').classList.remove('hidden')
}

document.addEventListener('DOMContentLoaded', async () => {
  const tokenId = getTokenId()
  if (!tokenId) {
    showAccessDenied()
    return
  }

  document.getElementById('app').classList.remove('hidden')

  const { state: eventState, load: loadEvent } = useEvent()
  await loadEvent(tokenId)

  if (eventState.error) {
    showAccessDenied(eventState.error)
    return
  }

  const { state: galleryState, load: loadGallery } = useGallery()
  await loadGallery(eventState.data.eventId)

  if (galleryState.error) {
    showAccessDenied(galleryState.error)
    return
  }

  renderEventMeta(eventState.data, galleryState.images.length)

  const grid = document.querySelector('gallery-grid')
  const lightbox = document.querySelector('photo-lightbox')
  lightbox.images = galleryState.images

  grid.addEventListener('gallery-item-click', e => lightbox.show(e.detail.index))
  grid.addImages(galleryState.images)
})
