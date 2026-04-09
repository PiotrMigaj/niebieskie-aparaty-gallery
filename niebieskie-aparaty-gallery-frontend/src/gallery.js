import Masonry from 'masonry-layout'

export class Gallery {
  #images;
  #onImageClick;
  #container;
  #msnry;
  #observer;
  #resizeTimer;
  #itemEls;

  constructor(images, onImageClick) {
    this.#images = images
    this.#onImageClick = onImageClick
    this.#container = document.getElementById('gallery-container')
    this.#msnry = null
    this.#observer = null
    this.#resizeTimer = null
    this.#itemEls = []
  }

  // Public — call after constructing
  init() {
    this.#buildItems()
    this.#applyHeights()
    this.#initMasonry()
    this.#setupObserver()
    window.addEventListener('resize', () => this.#onResize())
  }

  #applyHeights() {
    const sizer = this.#container.querySelector('.masonry-sizer')
    const itemWidth = sizer
      ? sizer.getBoundingClientRect().width
      : this.#itemEls[0]?.el.getBoundingClientRect().width
    if (!itemWidth) return
    this.#itemEls.forEach(({ el, image }) => {
      el.style.height = Math.round(itemWidth / (image.width / image.height)) + 'px'
    })
  }

  #initMasonry() {
    this.#msnry = new Masonry(this.#container, {
      itemSelector: '.masonry-item',
      columnWidth: '.masonry-sizer',
      gutter: 16,
      percentPosition: true,
      transitionDuration: 0,
      resizeContainer: true,
    })
  }

  #buildItems() {
    this.#container.textContent = ''
    this.#itemEls = []

    const sizer = document.createElement('div')
    sizer.className = 'masonry-sizer'
    this.#container.appendChild(sizer)

    this.#images.forEach((image, index) => {
      const item = document.createElement('div')
      item.className = 'masonry-item group'
      item.dataset.index = index

      const inner = document.createElement('div')
      inner.className = 'relative overflow-hidden rounded-sm cursor-pointer shadow-md w-full h-full'

      const skeleton = document.createElement('div')
      skeleton.className = 'skeleton absolute inset-0'

      const downloadBtn = document.createElement('button')
      downloadBtn.className =
        'absolute top-2 right-2 bg-white/90 hover:bg-white w-9 h-9 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center z-10'
      downloadBtn.title = 'Pobierz zdjęcie'
      downloadBtn.appendChild(Gallery.#createIcon('fa-solid fa-download text-gray-700 text-xs'))
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        Gallery.#downloadImage(image.downloadUrl, image.fileName || `zdjecie-${index + 1}.jpg`)
      })

      inner.appendChild(skeleton)
      inner.appendChild(downloadBtn)
      item.appendChild(inner)
      this.#container.appendChild(item)
      this.#itemEls.push({ el: item, inner, skeleton, image, index, imgLoaded: false })

      inner.addEventListener('click', () => this.#onImageClick(index))
    })
  }

  #setupObserver() {
    if (this.#observer) this.#observer.disconnect()

    this.#observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const index = parseInt(entry.target.dataset.index)
          const item = this.#itemEls[index]
          if (!item || item.imgLoaded) return
          item.imgLoaded = true
          this.#observer.unobserve(entry.target)
          this.#loadImage(item)
        })
      },
      { rootMargin: '300px 0px' }
    )

    this.#itemEls.forEach(({ el }) => this.#observer.observe(el))
  }

  #loadImage(item) {
    const { inner, skeleton, image } = item
    const img = document.createElement('img')
    img.src = image.thumbnailUrl
    img.alt = `Zdjęcie ${item.index + 1}`
    img.className = 'absolute inset-0 w-full h-full object-cover opacity-0'
    img.style.transition = 'opacity 500ms ease'

    img.onload = () => {
      img.style.opacity = '1'
      setTimeout(() => {
        if (skeleton.parentNode) skeleton.remove()
      }, 500)
    }

    img.onerror = () => {
      skeleton.classList.remove('skeleton')
      skeleton.style.background = '#f3f4f6'
    }

    inner.insertBefore(img, inner.firstChild)
  }

  #onResize() {
    clearTimeout(this.#resizeTimer)
    this.#resizeTimer = setTimeout(() => {
      this.#applyHeights()
      this.#msnry.layout()
    }, 150)
  }

  static #createIcon(classes) {
    const icon = document.createElement('i')
    icon.className = classes
    return icon
  }

  static #downloadImage(url, filename) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}
