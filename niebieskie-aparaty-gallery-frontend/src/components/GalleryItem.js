class GalleryItem extends HTMLElement {
  #observer = null
  #imgLoaded = false

  static get observedAttributes() {
    return ['src', 'aspect-width', 'aspect-height', 'filename', 'download-url', 'index']
  }

  connectedCallback() {
    this.classList.add('masonry-item', 'group')
    this.dataset.index = this.getAttribute('index') || '0'
    this.#render()
    this.#setupObserver()
  }

  disconnectedCallback() {
    this.#observer?.unobserve(this)
    this.#observer?.disconnect()
    this.#observer = null
  }

  #render() {
    const inner = document.createElement('div')
    inner.className = 'relative overflow-hidden cursor-pointer shadow-md w-full h-full'

    const skeleton = document.createElement('div')
    skeleton.className = 'skeleton absolute inset-0'

    const downloadBtn = document.createElement('button')
    downloadBtn.className =
      'absolute top-2 right-2 bg-white/90 hover:bg-white w-9 h-9 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10'
    downloadBtn.title = 'Pobierz zdjęcie'
    const icon = document.createElement('i')
    icon.className = 'fa-solid fa-download text-gray-700 text-xs'
    downloadBtn.appendChild(icon)
    downloadBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.#download()
    })

    inner.appendChild(skeleton)
    inner.appendChild(downloadBtn)
    this.appendChild(inner)

    inner.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('gallery-item-click', {
        bubbles: true,
        composed: true,
        detail: { index: parseInt(this.getAttribute('index') || '0') },
      }))
    })
  }

  #setupObserver() {
    this.#observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || this.#imgLoaded) return
        this.#imgLoaded = true
        this.#observer.unobserve(this)
        this.#loadImage()
      },
      { rootMargin: '300px 0px' }
    )
    this.#observer.observe(this)
  }

  #loadImage() {
    const src = this.getAttribute('src')
    if (!src) return

    const inner = this.firstElementChild
    const skeleton = inner?.querySelector('.skeleton')

    const img = document.createElement('img')
    img.src = src
    img.alt = `Zdjęcie ${parseInt(this.getAttribute('index') || '0') + 1}`
    img.className = 'absolute inset-0 w-full h-full object-cover opacity-0'
    img.style.transition = 'opacity 500ms ease'

    img.onload = () => {
      img.style.opacity = '1'
      setTimeout(() => skeleton?.remove(), 500)
    }

    img.onerror = () => {
      if (skeleton) {
        skeleton.classList.remove('skeleton')
        skeleton.style.background = '#f3f4f6'
      }
    }

    inner?.insertBefore(img, inner.firstChild)
  }

  #download() {
    const url = this.getAttribute('download-url')
    const filename =
      this.getAttribute('filename') ||
      `zdjecie-${parseInt(this.getAttribute('index') || '0') + 1}.jpg`

    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

customElements.define('gallery-item', GalleryItem)
