const PAGE_ICON_URLS = Object.freeze({
  brewing: new URL('../../assets/icons/icon-brewing-cauldron-tab.webp', import.meta.url).href,
  garden: new URL('../../assets/icons/icon-garden-plot-tab.webp', import.meta.url).href,
  prestige: new URL('../../assets/icons/icon-crystal.png', import.meta.url).href,
  research: new URL('../../assets/icons/icon-research-telescope-tab.webp', import.meta.url).href,
  shop: new URL('../../assets/icons/icon-shop-market-stall-tab.webp', import.meta.url).href,
  workshop: new URL('../../assets/icons/icon-workshop-house-tab.webp', import.meta.url).href,
});

export function getPageIconUrl(pageId) {
  return PAGE_ICON_URLS[String(pageId ?? '')] ?? '';
}

export function createPageIcon(pageId, className = '') {
  const iconUrl = getPageIconUrl(pageId);

  if (!iconUrl) {
    return null;
  }

  const image = document.createElement('img');
  image.className = className;
  image.src = iconUrl;
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.setAttribute('aria-hidden', 'true');
  return image;
}
