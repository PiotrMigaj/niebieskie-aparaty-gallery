export class Lightbox {
  #images;
  #currentIndex;
  #keyHandler;
  #elements;
  #config;
  #triggerElement;

  constructor(images, rootSelector = '#lightbox', config = {}) {
    this.#images = images;
    this.#currentIndex = -1;
    this.#keyHandler = null;
    this.#triggerElement = null;

    this.#config = {
      maxHeight: 600,
      viewportRatio: 0.8,
      fadeDelay: 10,
      ...config
    };

    const root = document.querySelector(rootSelector);
    if (!root) throw new Error(`Lightbox root element ${rootSelector} not found.`);

    this.#elements = {
      root,
      img: root.querySelector('.lightbox-img'),
      imgSkeleton: root.querySelector('.lightbox-img-skeleton'),
      counter: root.querySelector('.lightbox-counter'),
      closeBtn: root.querySelector('.lightbox-close'),
      prevBtn: root.querySelector('.lightbox-prev'),
      nextBtn: root.querySelector('.lightbox-next'),
      prevMobileBtn: root.querySelector('.lightbox-prev-mobile'),
      nextMobileBtn: root.querySelector('.lightbox-next-mobile'),
      downloadBtn: root.querySelector('.lightbox-download')
    };

    this.close = this.close.bind(this);
    this.next = () => this.#navigate(1);
    this.prev = () => this.#navigate(-1);
    this.download = this.#download.bind(this);

    this.#attachListeners();
  }

  #attachListeners() {
    this.#elements.closeBtn?.addEventListener('click', this.close);
    this.#elements.prevBtn?.addEventListener('click', this.prev);
    this.#elements.nextBtn?.addEventListener('click', this.next);
    this.#elements.prevMobileBtn?.addEventListener('click', this.prev);
    this.#elements.nextMobileBtn?.addEventListener('click', this.next);
    this.#elements.downloadBtn?.addEventListener('click', this.download);
  }

  destroy() {
    this.#elements.closeBtn?.removeEventListener('click', this.close);
    this.#elements.prevBtn?.removeEventListener('click', this.prev);
    this.#elements.nextBtn?.removeEventListener('click', this.next);
    this.#elements.prevMobileBtn?.removeEventListener('click', this.prev);
    this.#elements.nextMobileBtn?.removeEventListener('click', this.next);
    this.#elements.downloadBtn?.removeEventListener('click', this.download);
    this.close();
  }

  open(index) {
    this.#triggerElement = document.activeElement;

    this.#elements.root.classList.remove('hidden');
    this.#elements.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');

    this.#show(index);

    this.#keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
      else if (e.key === 'ArrowLeft') this.#navigate(-1);
      else if (e.key === 'ArrowRight') this.#navigate(1);
    };

    document.addEventListener('keydown', this.#keyHandler);
    this.#elements.closeBtn?.focus();
  }

  close() {
    this.#elements.root.classList.add('hidden');
    this.#elements.root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    this.#elements.img.src = '';

    if (this.#keyHandler) {
      document.removeEventListener('keydown', this.#keyHandler);
      this.#keyHandler = null;
    }

    this.#currentIndex = -1;

    if (this.#triggerElement) {
      this.#triggerElement.focus();
    }
  }

  #show(index) {
    this.#currentIndex = index;
    const image = this.#images[index];
    const { img, imgSkeleton, prevBtn, nextBtn, prevMobileBtn, nextMobileBtn, counter } = this.#elements;

    imgSkeleton.style.display = 'block';
    img.classList.add('hidden');
    img.style.opacity = '0';

    const isFirst = index === 0;
    const isLast = index === this.#images.length - 1;

    if (prevBtn) prevBtn.style.visibility = isFirst ? 'hidden' : 'visible';
    if (nextBtn) nextBtn.style.visibility = isLast ? 'hidden' : 'visible';
    if (prevMobileBtn) prevMobileBtn.style.visibility = isFirst ? 'hidden' : 'visible';
    if (nextMobileBtn) nextMobileBtn.style.visibility = isLast ? 'hidden' : 'visible';

    if (counter) counter.textContent = `${index + 1} / ${this.#images.length}`;

    img.src = '';

    img.onload = () => {
      imgSkeleton.style.display = 'none';
      img.classList.remove('hidden');
      setTimeout(() => { img.style.opacity = '1'; }, this.#config.fadeDelay);
    };

    img.onerror = () => {
      imgSkeleton.style.display = 'none';
      img.classList.remove('hidden');
      img.style.opacity = '1';
    };

    img.src = image.fullUrl;

    const aspect = image.width / image.height;
    const maxH = Math.min(window.innerHeight * this.#config.viewportRatio, this.#config.maxHeight);
    const skeletonW = Math.min(maxH * aspect, window.innerWidth * 0.85);

    imgSkeleton.style.width = `${skeletonW}px`;
    imgSkeleton.style.height = `${maxH}px`;
  }

  #navigate(direction) {
    const newIndex = this.#currentIndex + direction;
    if (newIndex >= 0 && newIndex < this.#images.length) {
      this.#show(newIndex);
    }
  }

  #download() {
    if (this.#currentIndex < 0) return;
    const image = this.#images[this.#currentIndex];

    const a = document.createElement('a');
    a.href = image.downloadUrl;
    a.download = image.fileName || `zdjecie-${this.#currentIndex + 1}.jpg`;
    a.target = '_blank';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
