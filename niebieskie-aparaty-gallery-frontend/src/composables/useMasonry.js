import Masonry from 'masonry-layout'

export function useMasonry(containerEl) {
  let msnry = null
  let resizeTimer = null

  function init() {
    msnry = new Masonry(containerEl, {
      itemSelector: '.masonry-item',
      columnWidth: '.masonry-sizer',
      gutter: 8,
      percentPosition: true,
      transitionDuration: 0,
      resizeContainer: true,
    })
    window.addEventListener('resize', onResize)
  }

  function layout() {
    msnry?.layout()
  }

  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const sizer = containerEl.querySelector('.masonry-sizer')
      const itemWidth = sizer?.getBoundingClientRect().width || 0
      if (itemWidth > 0) {
        containerEl.querySelectorAll('gallery-item').forEach(item => {
          const w = parseInt(item.getAttribute('aspect-width') || '1')
          const h = parseInt(item.getAttribute('aspect-height') || '1')
          item.style.height = Math.round(itemWidth / (w / h)) + 'px'
        })
      }
      msnry?.layout()
    }, 150)
  }

  function destroy() {
    clearTimeout(resizeTimer)
    window.removeEventListener('resize', onResize)
    msnry?.destroy()
    msnry = null
  }

  return { init, layout, destroy }
}
