class PhotoLightbox extends HTMLElement {
  #images = []
  #currentIndex = -1
  #keyHandler = null
  #triggerElement = null
  #config = { maxHeight: 600, viewportRatio: 0.8, fadeDelay: 10 }
  #els = {}

  connectedCallback() {
    this.#render()
    this.#attachListeners()
  }

  disconnectedCallback() {
    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler)
      this.#keyHandler = null
    }
  }

  set images(arr) {
    this.#images = arr
  }

  #icon(classes) {
    const i = document.createElement('i')
    i.className = classes
    return i
  }

  #btn(classes, ...children) {
    const btn = document.createElement('button')
    btn.className = classes
    children.forEach(c => btn.appendChild(c))
    return btn
  }

  #render() {
    this.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden'
    this.setAttribute('aria-hidden', 'true')
    this.setAttribute('role', 'dialog')
    this.setAttribute('aria-modal', 'true')

    const wrapper = document.createElement('div')
    wrapper.className = 'absolute inset-0 flex items-center justify-center'

    const closeBtn = this.#btn(
      'lightbox-close absolute top-4 right-4 text-white/70 hover:text-white transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10',
      this.#icon('fa-solid fa-xmark text-xl')
    )

    const downloadBtn = this.#btn(
      'lightbox-download absolute top-4 right-16 bg-white/20 hover:bg-white/30 text-white w-10 h-10 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center',
      this.#icon('fa-solid fa-download text-sm')
    )

    const counter = document.createElement('div')
    counter.className = 'lightbox-counter absolute top-4 left-4 text-white/60 text-sm'

    const prevBtn = this.#btn(
      'lightbox-prev hidden md:flex text-white/60 hover:text-white transition-colors w-12 h-12 items-center justify-center rounded-full hover:bg-white/10 flex-shrink-0',
      this.#icon('fa-solid fa-chevron-left text-xl')
    )

    const nextBtn = this.#btn(
      'lightbox-next hidden md:flex text-white/60 hover:text-white transition-colors w-12 h-12 items-center justify-center rounded-full hover:bg-white/10 flex-shrink-0',
      this.#icon('fa-solid fa-chevron-right text-xl')
    )

    const imgSkeleton = document.createElement('div')
    imgSkeleton.className = 'lightbox-img-skeleton skeleton'
    imgSkeleton.style.cssText = 'width:400px;height:300px'

    const img = document.createElement('img')
    img.className = 'lightbox-img max-w-[90vw] max-h-[80vh] md:max-h-[85vh] object-contain hidden transition-opacity duration-300'
    img.src = ''
    img.alt = ''

    const imgWrapper = document.createElement('div')
    imgWrapper.className = 'flex items-center justify-center'
    imgWrapper.appendChild(imgSkeleton)
    imgWrapper.appendChild(img)

    const imageRow = document.createElement('div')
    imageRow.className = 'flex items-center gap-4 max-w-[95vw] max-h-screen'
    imageRow.appendChild(prevBtn)
    imageRow.appendChild(imgWrapper)
    imageRow.appendChild(nextBtn)

    const prevMobileBtn = this.#btn(
      'lightbox-prev-mobile text-white/70 hover:text-white transition-colors w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20',
      this.#icon('fa-solid fa-chevron-left text-xl')
    )
    const nextMobileBtn = this.#btn(
      'lightbox-next-mobile text-white/70 hover:text-white transition-colors w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20',
      this.#icon('fa-solid fa-chevron-right text-xl')
    )

    const mobileNav = document.createElement('div')
    mobileNav.className = 'absolute bottom-6 left-0 right-0 flex justify-center gap-8 md:hidden'
    mobileNav.appendChild(prevMobileBtn)
    mobileNav.appendChild(nextMobileBtn)

    wrapper.appendChild(closeBtn)
    wrapper.appendChild(downloadBtn)
    wrapper.appendChild(counter)
    wrapper.appendChild(imageRow)
    wrapper.appendChild(mobileNav)
    this.appendChild(wrapper)

    this.#els = { img, imgSkeleton, counter, closeBtn, prevBtn, nextBtn, prevMobileBtn, nextMobileBtn, downloadBtn }
  }

  #attachListeners() {
    this.#els.closeBtn?.addEventListener('click', () => this.hide())
    this.#els.prevBtn?.addEventListener('click', () => this.#navigate(-1))
    this.#els.nextBtn?.addEventListener('click', () => this.#navigate(1))
    this.#els.prevMobileBtn?.addEventListener('click', () => this.#navigate(-1))
    this.#els.nextMobileBtn?.addEventListener('click', () => this.#navigate(1))
    this.#els.downloadBtn?.addEventListener('click', () => this.#download())
  }

  show(index) {
    this.#triggerElement = document.activeElement
    this.classList.remove('hidden')
    this.setAttribute('aria-hidden', 'false')
    document.body.classList.add('lightbox-open')
    this.#showImage(index)
    this.#keyHandler = e => {
      if (e.key === 'Escape') this.hide()
      else if (e.key === 'ArrowLeft') this.#navigate(-1)
      else if (e.key === 'ArrowRight') this.#navigate(1)
    }
    document.addEventListener('keydown', this.#keyHandler)
    this.#els.closeBtn?.focus()
  }

  hide() {
    this.classList.add('hidden')
    this.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('lightbox-open')
    if (this.#els.img) this.#els.img.src = ''
    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler)
      this.#keyHandler = null
    }
    this.#currentIndex = -1
    this.#triggerElement?.focus()
  }

  #showImage(index) {
    this.#currentIndex = index
    const image = this.#images[index]
    const { img, imgSkeleton, prevBtn, nextBtn, prevMobileBtn, nextMobileBtn, counter } = this.#els

    imgSkeleton.style.display = 'block'
    img.classList.add('hidden')
    img.style.opacity = '0'

    const isFirst = index === 0
    const isLast = index === this.#images.length - 1

    if (prevBtn) prevBtn.style.visibility = isFirst ? 'hidden' : 'visible'
    if (nextBtn) nextBtn.style.visibility = isLast ? 'hidden' : 'visible'
    if (prevMobileBtn) prevMobileBtn.style.visibility = isFirst ? 'hidden' : 'visible'
    if (nextMobileBtn) nextMobileBtn.style.visibility = isLast ? 'hidden' : 'visible'
    if (counter) counter.textContent = `${index + 1} / ${this.#images.length}`

    img.src = ''
    img.onload = () => {
      imgSkeleton.style.display = 'none'
      img.classList.remove('hidden')
      setTimeout(() => { img.style.opacity = '1' }, this.#config.fadeDelay)
    }
    img.onerror = () => {
      imgSkeleton.style.display = 'none'
      img.classList.remove('hidden')
      img.style.opacity = '1'
    }
    img.src = image.fullUrl

    const aspect = image.width / image.height
    const maxH = Math.min(window.innerHeight * this.#config.viewportRatio, this.#config.maxHeight)
    const skeletonW = Math.min(maxH * aspect, window.innerWidth * 0.85)
    imgSkeleton.style.width = `${skeletonW}px`
    imgSkeleton.style.height = `${maxH}px`
  }

  #navigate(direction) {
    const newIndex = this.#currentIndex + direction
    if (newIndex >= 0 && newIndex < this.#images.length) {
      this.#showImage(newIndex)
    }
  }

  #download() {
    if (this.#currentIndex < 0) return
    const image = this.#images[this.#currentIndex]
    const a = document.createElement('a')
    a.href = image.downloadUrl
    a.download = image.fileName || `zdjecie-${this.#currentIndex + 1}.jpg`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

customElements.define('photo-lightbox', PhotoLightbox)
