import { useMasonry } from '../composables/useMasonry.js'

class GalleryGrid extends HTMLElement {
  #masonry = null

  connectedCallback() {
    const sizer = document.createElement('div')
    sizer.className = 'masonry-sizer'
    this.appendChild(sizer)
  }

  disconnectedCallback() {
    this.#masonry?.destroy()
    this.#masonry = null
  }

  addImages(images) {
    const sizer = this.querySelector('.masonry-sizer')
    const itemWidth = sizer?.getBoundingClientRect().width || 0

    images.forEach(image => {
      const item = document.createElement('gallery-item')
      item.setAttribute('src', image.thumbnailUrl)
      item.setAttribute('aspect-width', image.width)
      item.setAttribute('aspect-height', image.height)
      item.setAttribute('filename', image.fileName)
      item.setAttribute('download-url', image.downloadUrl)
      item.setAttribute('index', image.id)

      if (itemWidth > 0) {
        item.style.height = Math.round(itemWidth / (image.width / image.height)) + 'px'
      }

      this.appendChild(item)
    })

    if (!this.#masonry) {
      this.#masonry = useMasonry(this)
      this.#masonry.init()
    } else {
      this.#masonry.layout()
    }
  }
}

customElements.define('gallery-grid', GalleryGrid)
