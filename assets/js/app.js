(() => {
  const cfg = window.LUXE_WEBSITE_CONFIG || {};
  const fallbackSettings = {
    site_name: cfg.SITE_NAME || 'SHREE',
    topbar_text: 'Browse products, inquire online, Instagram, or WhatsApp us directly.',
    hero_title: 'Boutique Styles, Curated by Category',
    hero_text: 'Explore boutique styles by category and send inquiries directly from the website.',
    hero_image: '',
    whatsapp_number: cfg.WHATSAPP_NUMBER || '9779868800001',
    instagram_url: cfg.INSTAGRAM_URL || '',
    default_message: cfg.DEFAULT_MESSAGE || 'Hello, I want to inquire about your boutique products.',
    contact_heading: 'Contact SHREE',
    contact_text: 'Use the inquiry form, Instagram, or WhatsApp for direct messages.',
    fonts: {
      body: 'Poppins, Arial, sans-serif',
      heading: 'Playfair Display, Georgia, serif',
      nav: 'Poppins, Arial, sans-serif',
      button: 'Poppins, Arial, sans-serif',
      body_size: '16px',
      heading_weight: '700'
    }
  };

  const state = {
    settings: { ...fallbackSettings },
    categories: [],
    products: [],
    connected: false,
    loading: true,
    error: ''
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  const cleanBase = () => String(cfg.CONTENT_API_BASE || '').trim().replace(/\/+$/, '');
  const contentConfigured = () => {
    const base = cleanBase();
    return /^https?:\/\//i.test(base) && !/your-site/i.test(base);
  };

  function apiUrl(endpoint) {
    return `${cleanBase()}/${String(endpoint || '').replace(/^\/+/, '')}`;
  }

  async function apiGet(endpoint) {
    const res = await fetch(apiUrl(endpoint), { headers: { accept: 'application/json' }, cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.message || `Content request failed: ${res.status}`);
    return json;
  }

  async function apiPost(endpoint, payload) {
    const res = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload || {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.ok === false) throw new Error(json.message || `Content request failed: ${res.status}`);
    return json;
  }

  const trackedOnce = new Set();

  function trackEvent(eventType, product, extra = {}) {
    if (!contentConfigured() || !eventType || !product) return;
    const payload = {
      event_type: eventType,
      product_id: product.id || '',
      product_slug: product.slug || slugify(product.title || product.id || ''),
      product_title: product.title || '',
      page: location.hash || '#home',
      source: 'website',
      ...extra
    };
    fetch(apiUrl('track'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }

  function trackOnce(key, eventType, product, extra = {}) {
    if (trackedOnce.has(key)) return;
    trackedOnce.add(key);
    trackEvent(eventType, product, extra);
  }

  function arrayFromPayload(payload, key) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.[key])) return payload[key];
    return [];
  }

  async function loadContent() {
    state.loading = true;
    state.error = '';
    if (!contentConfigured()) {
      state.loading = false;
      state.connected = false;
      state.error = 'Website content is not configured yet. Edit config.js and set CONTENT_API_BASE to your live API URL.';
      render();
      return;
    }

    try {
      const [home, productsPayload] = await Promise.all([apiGet('home'), apiGet('products')]);
      state.settings = { ...fallbackSettings, ...(home.settings || {}) };
      state.categories = Array.isArray(home.categories) ? home.categories : [];
      state.products = arrayFromPayload(productsPayload, 'products');
      state.connected = true;
    } catch (error) {
      state.connected = false;
      state.error = error.message || 'Could not load website content.';
    }
    state.loading = false;
    render();
  }

  function slugify(value) {
    return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function getRoute() {
    const raw = (location.hash || '#home').replace(/^#\/?/, '');
    const [pathPart, queryPart = ''] = raw.split('?');
    const parts = pathPart.split('/').filter(Boolean);
    return { name: parts[0] || 'home', slug: parts[1] || '', params: new URLSearchParams(queryPart) };
  }

  function setTitle(title) {
    document.title = `${title} - ${siteName()}`;
  }

  function siteName() {
    return state.settings.site_name || fallbackSettings.site_name || 'SHREE';
  }

  function setting(key, fallback = '') {
    return state.settings?.[key] ?? fallbackSettings[key] ?? fallback;
  }

  function whatsappNumber() {
    return String(setting('whatsapp_number', cfg.WHATSAPP_NUMBER || '')).replace(/\D+/g, '') || '9779868800001';
  }

  function whatsappLink(message) {
    const text = message || setting('default_message', fallbackSettings.default_message);
    return `https://wa.me/${encodeURIComponent(whatsappNumber())}?text=${encodeURIComponent(text)}`;
  }

  function instagramUrl() {
    let url = String(setting('instagram_url', cfg.INSTAGRAM_URL || '') || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) url = `https://${url.replace(/^\/+/, '')}`;
    return url;
  }

  function normalizeExternalUrl(value) {
    let url = String(value || '').trim();
    if (!url) return '';
    if (/^(https?:|mailto:|tel:|sms:)/i.test(url)) return url;
    return `https://${url.replace(/^\/+/, '')}`;
  }

  function linkLabelFromUrl(url) {
    const lower = String(url || '').toLowerCase();
    if (lower.includes('instagram.com')) return 'Instagram';
    if (lower.includes('tiktok.com')) return 'TikTok';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
    if (lower.includes('facebook.com')) return 'Facebook';
    if (lower.includes('maps.google') || lower.includes('goo.gl/maps') || lower.includes('maps.app.goo.gl')) return 'Location';
    return 'Open link';
  }

  function productMediaLinks(product) {
    const links = Array.isArray(product?.media_links) ? product.media_links : (Array.isArray(product?.links) ? product.links : []);
    return links.map((link, index) => {
      if (typeof link === 'string') return { label: linkLabelFromUrl(link), url: normalizeExternalUrl(link), hidden: false, sort_order: index + 1 };
      return {
        label: String(link?.label || '').trim() || linkLabelFromUrl(link?.url),
        url: normalizeExternalUrl(link?.url),
        hidden: !!link?.hidden,
        sort_order: Number(link?.sort_order || index + 1)
      };
    }).filter((link) => link.url && !link.hidden).sort((a, b) => Number(a.sort_order || 999) - Number(b.sort_order || 999));
  }

  function productMediaLinksHtml(product, compact = false) {
    const links = productMediaLinks(product);
    if (!links.length) return '';
    const title = compact ? '' : '<h3>Videos & links</h3><p>Open product videos, social posts, location, or other links shared by the boutique.</p>';
    return `<div class="${compact ? 'product-links product-links-compact' : 'product-links'}">${title}<div>${links.map((link) => `<a class="btn btn-outline" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)}</a>`).join('')}</div></div>`;
  }

  function productImages(product) {
    const images = [];
    if (product?.image) images.push(product.image);
    (product?.gallery || []).forEach((image) => { if (image) images.push(image); });
    const seen = new Set();
    return images.map(String).map((s) => s.trim()).filter(Boolean).filter((src) => {
      if (seen.has(src)) return false;
      seen.add(src);
      return true;
    });
  }

  function imagePlaceholder(label = 'Image coming soon') {
    return `<div class="image-placeholder"><span>${esc(label)}</span></div>`;
  }

  function primaryImage(product) {
    return productImages(product)[0] || '';
  }

  function moneyDisplay(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const numeric = raw.replace(/[^0-9.]/g, '');
    if (numeric && !Number.isNaN(Number(numeric))) {
      const amount = Number(numeric);
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
    }
    return raw;
  }

  function priceHtml(product, large = false) {
    if (product?.price === undefined || product?.price === null || String(product.price).trim() === '') return '';
    const compare = product.compare_price;
    return `<div class="${large ? 'product-price-large' : ''}"><span class="price">NPR ${esc(moneyDisplay(product.price))}${compare ? ` <del>NPR ${esc(moneyDisplay(compare))}</del>` : ''}</span></div>`;
  }

  function discountLabel(item) {
    const label = String(item?.discount_label || '').trim();
    if (label) return label;
    const percent = Number(item?.discount_percent || 0);
    if (percent > 0) return `${percent % 1 ? percent.toFixed(1) : percent}% OFF`;
    const price = Number(String(item?.price || '').replace(/[^0-9.]/g, ''));
    const compare = Number(String(item?.compare_price || '').replace(/[^0-9.]/g, ''));
    if (compare > price && price > 0) return `${Math.round((1 - price / compare) * 100)}% OFF`;
    return '';
  }

  function categoryOfferText(category) {
    if (!category) return '';
    return String(category.offer_text || '').trim() || discountLabel(category);
  }

  function colorHex(hex) {
    const value = String(hex || '').trim();
    return /^#[0-9a-f]{3,8}$/i.test(value) ? value : '#dddddd';
  }

  function productCategorySlugs(product) {
    return (product?.category_slugs || []).map(slugify).filter(Boolean);
  }

  function hasCategory(product, slug) {
    const clean = slugify(slug);
    return clean ? productCategorySlugs(product).includes(clean) : true;
  }

  function categoryCount(slug) {
    return state.products.filter((product) => hasCategory(product, slug)).length;
  }

  function categoryBySlug(slug) {
    const clean = slugify(slug);
    return state.categories.find((cat) => slugify(cat.slug) === clean) || null;
  }

  function productHref(product, categorySlug = '') {
    const slug = product.slug || slugify(product.title || product.id || 'product');
    const params = new URLSearchParams();
    if (product.id) params.set('id', product.id);
    if (categorySlug) params.set('category', slugify(categorySlug));
    const query = params.toString();
    return `#product/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`;
  }

  function inquiryHref(product) {
    if (!product) return '#inquiry';
    const slug = product.slug || slugify(product.title || product.id || 'product');
    const params = new URLSearchParams({ product: slug });
    if (product.id) params.set('id', product.id);
    return `#inquiry?${params.toString()}`;
  }

  function categoryCard(category) {
    const slug = slugify(category.slug || category.name);
    const img = category.image ? `<img src="${esc(category.image)}" alt="${esc(category.name || 'Category')}" loading="lazy">` : imagePlaceholder('Image coming soon');
    const count = category.count ?? categoryCount(slug);
    const discount = discountLabel(category);
    return `<a class="category-tile" href="#products?category=${encodeURIComponent(slug)}">${img}${discount ? `<span class="category-offer">${esc(discount)}</span>` : ''}<span class="tile-label"><strong>${esc(category.name || 'Category')}</strong><small>${esc(count)} items</small></span></a>`;
  }

  function productCard(product, categorySlug = '') {
    const title = product.title || 'Product';
    const image = primaryImage(product);
    const discount = discountLabel(product);
    const sizes = Array.isArray(product.sizes) ? product.sizes.slice(0, 4) : [];
    const colors = Array.isArray(product.colors) ? product.colors.slice(0, 3) : [];
    const productMessage = `Hello, I want to inquire about ${title}.`;
    const detailsUrl = productHref(product, categorySlug);
    return `<article class="product-card">
      <a class="media" href="${esc(detailsUrl)}">${image ? `<img src="${esc(image)}" alt="${esc(title)}" loading="lazy">` : imagePlaceholder('Image coming soon')}</a>
      <div class="body">
        <div class="badges">
          ${discount ? `<span class="badge badge-sale">${esc(discount)}</span>` : ''}
          ${product.new_arrival ? '<span class="badge">New</span>' : ''}
          ${product.featured ? '<span class="badge">Featured</span>' : ''}
          ${product.stock_label ? `<span class="badge">${esc(product.stock_label)}</span>` : ''}
        </div>
        <h3><a href="${esc(detailsUrl)}">${esc(title)}</a></h3>
        ${product.excerpt ? `<p>${esc(product.excerpt)}</p>` : ''}
        ${priceHtml(product)}
        ${discount ? `<div class="offer-line">Offer: ${esc(discount)}</div>` : ''}
        ${(sizes.length || colors.length) ? `<div class="mini-options">${sizes.map((size) => `<span>${esc(size)}</span>`).join('')}${colors.map((color) => `<span>${esc(color.name || '')}</span>`).join('')}</div>` : ''}
        ${productMediaLinksHtml(product, true)}
        <div class="product-actions">
          <a class="btn btn-outline" href="${esc(detailsUrl)}">View</a>
          <a class="btn btn-gold" href="${esc(inquiryHref(product))}" data-track-inquiry-click="${esc(product.id || product.slug || title)}">Inquiry</a>
          <a class="btn btn-whatsapp" href="${esc(whatsappLink(productMessage))}" target="_blank" rel="noopener" data-track-whatsapp-inquiry="${esc(product.id || product.slug || title)}">WhatsApp</a>
        </div>
      </div>
    </article>`;
  }

  function statusNotice() {
    if (state.loading) return '<div class="notice">Loading website content...</div>';
    if (state.error) return `<div class="notice error"><strong>Website notice:</strong> ${esc(state.error)}</div>`;
    return '';
  }

  function renderHome() {
    setTitle('Home');
    const settings = state.settings;
    const heroImage = settings.hero_image || '';
    const featured = state.products.filter((product) => product.featured).slice(0, 8);
    const newArrivals = state.products.filter((product) => product.new_arrival).slice(0, 8);
    $('#app').innerHTML = `
      <section class="hero ${heroImage ? '' : 'hero-no-image'}">
        ${heroImage ? `<img src="${esc(heroImage)}" alt="Boutique hero">` : ''}
        <div class="container hero-content">
          <span class="eyebrow">New Collection</span>
          <h1>${esc(settings.hero_title || fallbackSettings.hero_title)}</h1>
          <p>${esc(settings.hero_text || fallbackSettings.hero_text)}</p>
          <a class="btn btn-light" href="#categories">Browse Categories</a>
          <a class="btn btn-gold" href="#products">View Products</a>
        </div>
      </section>
      <section class="section"><div class="container">${statusNotice()}<div class="section-head"><span class="eyebrow">Categories</span><h2>Shop From Category</h2><p>Browse styles by category.</p></div>${state.categories.length ? `<div class="grid grid-3">${state.categories.slice(0, 6).map(categoryCard).join('')}</div>` : '<div class="empty">No categories available yet.</div>'}</div></section>
      <section class="section section-soft"><div class="container"><div class="section-head"><span class="eyebrow">Featured</span><h2>Featured Products</h2><p>Explore selected products, pricing, sizes, colours, and offers.</p></div>${featured.length ? `<div class="grid grid-4">${featured.map((product) => productCard(product)).join('')}</div>` : '<div class="empty">No featured products yet.</div>'}</div></section>
      <section class="section"><div class="container"><div class="section-head"><span class="eyebrow">New</span><h2>New Arrivals</h2></div>${newArrivals.length ? `<div class="grid grid-4">${newArrivals.map((product) => productCard(product)).join('')}</div>` : '<div class="empty">No new arrivals yet.</div>'}</div></section>`;
  }

  function renderCategories() {
    setTitle('Categories');
    $('#app').innerHTML = `<section class="page-hero"><div class="container page-title"><span class="eyebrow">Browse</span><h1>Product Categories</h1><p>Choose a category to see products inside it.</p></div></section><section class="section"><div class="container">${statusNotice()}${state.categories.length ? `<div class="grid grid-3">${state.categories.map(categoryCard).join('')}</div>` : '<div class="empty">No categories available yet.</div>'}</div></section>`;
  }

  function renderProducts() {
    const route = getRoute();
    const selectedCategory = slugify(route.params.get('category') || '');
    const q = (route.params.get('q') || '').trim().toLowerCase();
    const selectedCategoryObj = selectedCategory ? categoryBySlug(selectedCategory) : null;
    const selectedCategoryName = selectedCategoryObj?.name || '';
    const categoryOffer = categoryOfferText(selectedCategoryObj);
    let products = state.products.slice();
    if (selectedCategory) products = products.filter((product) => hasCategory(product, selectedCategory));
    if (q) products = products.filter((product) => [product.title, product.excerpt, product.content, product.sku, product.fabric].some((value) => String(value || '').toLowerCase().includes(q)));
    setTitle(selectedCategoryName || 'Products');
    $('#app').innerHTML = `<section class="page-hero"><div class="container page-title"><span class="eyebrow">Catalogue</span><h1>${esc(selectedCategoryName || 'All Products')}</h1><p>${esc(selectedCategoryObj?.description || 'View photos, sizes, colours, prices, and current offers.')}</p>${categoryOffer ? `<div class="category-offer-page">${esc(categoryOffer)}</div>` : ''}</div></section><section class="section"><div class="container">${statusNotice()}<div class="filters"><a class="chip ${selectedCategory ? '' : 'active'}" href="#products">All</a>${state.categories.map((cat) => { const slug = slugify(cat.slug || cat.name); return `<a class="chip ${selectedCategory === slug ? 'active' : ''}" href="#products?category=${encodeURIComponent(slug)}">${esc(cat.name)}</a>`; }).join('')}<input class="search-input" data-search-products placeholder="Search products" value="${esc(route.params.get('q') || '')}"></div>${products.length ? `<div class="grid grid-4">${products.map((product) => productCard(product, selectedCategory)).join('')}</div>` : '<div class="empty">No products found in this category.</div>'}</div></section>`;
  }

  function findProduct(slug, id = '') {
    const cleanId = decodeURIComponent(String(id || ''));
    if (cleanId) {
      const byId = state.products.find((product) => String(product.id || '') === cleanId);
      if (byId) return byId;
    }
    const cleanSlug = decodeURIComponent(slug || '');
    const normalized = slugify(cleanSlug);
    return state.products.find((product) => product.slug === cleanSlug) || state.products.find((product) => slugify(product.slug) === normalized) || null;
  }

  async function fetchProductIfNeeded(slug, id = '') {
    if (!contentConfigured() || !slug || findProduct(slug, id)) return;
    try {
      const payload = await apiGet(`products/${encodeURIComponent(slug)}`);
      const product = payload.product || payload;
      if (product?.slug) state.products.push(product);
    } catch (error) {
      state.error = error.message || state.error;
    }
  }

  function renderProduct(product, returnCategory = '') {
    const title = product.title || 'Product';
    const images = productImages(product);
    const main = images[0] || '';
    const discount = discountLabel(product);
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const categoryNames = (product.categories || []).map((cat) => cat.name).join(', ') || productCategorySlugs(product).join(', ');
    const message = `Hello, I want to inquire about ${title}.`;
    const backHref = returnCategory ? `#products?category=${encodeURIComponent(slugify(returnCategory))}` : '#products';
    setTitle(title);
    $('#app').innerHTML = `<section class="page-hero"><div class="container page-title"><span class="eyebrow">Product Detail</span><h1>${esc(title)}</h1><p>${esc(product.excerpt || 'See images, sizes, colours, price, and inquiry options.')}</p></div></section><section class="section"><div class="container product-layout">
      <div class="product-gallery">
        <div class="gallery-main">${main ? `<img src="${esc(main)}" alt="${esc(title)}" data-gallery-main>` : imagePlaceholder('Image coming soon')}</div>
        ${images.length > 1 ? `<div class="thumbs">${images.map((src) => `<button type="button" data-gallery-thumb="${esc(src)}"><img src="${esc(src)}" alt="${esc(title)}"></button>`).join('')}</div>` : ''}
        ${productMediaLinksHtml(product)}
      </div>
      <div class="product-summary">
        <div class="badges">${discount ? `<span class="badge badge-sale">${esc(discount)}</span>` : ''}${product.new_arrival ? '<span class="badge">New</span>' : ''}${product.featured ? '<span class="badge">Featured</span>' : ''}${product.stock_label ? `<span class="badge">${esc(product.stock_label)}</span>` : ''}</div>
        <h1>${esc(title)}</h1>
        ${priceHtml(product, true)}
        ${discount ? `<div class="offer-box"><strong>Offer</strong><span>${esc(discount)}</span></div>` : ''}
        ${product.content ? `<p>${esc(product.content)}</p>` : ''}
        <div class="meta-list">
          ${categoryNames ? `<div class="meta-row"><strong>Category</strong><span>${esc(categoryNames)}</span></div>` : ''}
          ${product.sku ? `<div class="meta-row"><strong>SKU</strong><span>${esc(product.sku)}</span></div>` : ''}
          ${product.fabric ? `<div class="meta-row"><strong>Fabric</strong><span>${esc(product.fabric)}</span></div>` : ''}
          ${sizes.length ? `<div class="meta-row"><strong>Sizes</strong><span class="option-pills">${sizes.map((size) => `<span>${esc(size)}</span>`).join('')}</span></div>` : ''}
          ${colors.length ? `<div class="meta-row"><strong>Colours</strong><span class="option-pills">${colors.map((color) => `<span><i class="color-dot" style="background:${esc(colorHex(color.hex))}"></i>${esc(color.name || '')}</span>`).join('')}</span></div>` : ''}
        </div>
        <div class="product-actions product-actions-large"><a class="btn btn-gold" href="${esc(inquiryHref(product))}" data-track-inquiry-click="${esc(product.id || product.slug || title)}">Send Inquiry</a><a class="btn btn-whatsapp" href="${esc(whatsappLink(message))}" target="_blank" rel="noopener" data-track-whatsapp-inquiry="${esc(product.id || product.slug || title)}">WhatsApp Inquiry</a><a class="btn btn-outline" href="${esc(backHref)}">Back to Products</a></div>
      </div>
    </div></section>`;
    trackOnce(`product_view:${product.id || product.slug || title}`, 'product_view', product);
  }

  async function renderProductRoute(slug) {
    const route = getRoute();
    const id = route.params.get('id') || '';
    const returnCategory = route.params.get('category') || '';
    await fetchProductIfNeeded(slug, id);
    const product = findProduct(slug, id);
    if (!product) {
      setTitle('Product Not Found');
      $('#app').innerHTML = `<section class="page-hero"><div class="container page-title"><span class="eyebrow">Not Found</span><h1>Product not found</h1><p>This product may be hidden or unavailable.</p></div></section><section class="section"><div class="container">${statusNotice()}<a class="btn btn-gold" href="#products">View Products</a></div></section>`;
      return;
    }
    renderProduct(product, returnCategory);
  }

  function inquiryProductFromRoute() {
    const route = getRoute();
    const slug = route.params.get('product') || '';
    const id = route.params.get('id') || '';
    return slug || id ? findProduct(slug, id) : null;
  }

  function optionSelect(name, options, placeholder) {
    if (!options || !options.length) return '';
    return `<label>${esc(placeholder)}<select name="${esc(name)}"><option value="">Select ${esc(placeholder.toLowerCase())}</option>${options.map((item) => `<option value="${esc(item.name || item)}">${esc(item.name || item)}</option>`).join('')}</select></label>`;
  }

  function renderInquiry() {
    const product = inquiryProductFromRoute();
    const title = product?.title || '';
    const image = product ? primaryImage(product) : '';
    setTitle('Inquiry');
    $('#app').innerHTML = `<section class="page-hero"><div class="container page-title"><span class="eyebrow">Inquiry</span><h1>Send Product Inquiry</h1><p>Your inquiry can also be sent through WhatsApp.</p></div></section><section class="section"><div class="container grid grid-2">${statusNotice()}<div class="form-card"><div id="formNotice" hidden></div><form class="form-grid" data-inquiry-form><input type="hidden" name="product_slug" value="${esc(product?.slug || '')}"><input type="hidden" name="product_title" value="${esc(title)}"><label>Your name<input name="name" required placeholder="Full name"></label><label>Phone / WhatsApp<input name="phone" required placeholder="98XXXXXXXX"></label><label>Email optional<input name="email" type="email" placeholder="you@example.com"></label>${optionSelect('size', product?.sizes || [], 'Size')}${optionSelect('color', product?.colors || [], 'Colour')}<label class="full">Message<textarea name="message" required>${esc(title ? `Hello, I want to inquire about ${title}.` : setting('default_message', fallbackSettings.default_message))}</textarea></label><button class="btn btn-gold" type="submit">Submit Inquiry</button><a class="btn btn-whatsapp" href="${esc(whatsappLink(title ? `Hello, I want to inquire about ${title}.` : undefined))}" target="_blank" rel="noopener" data-track-whatsapp-inquiry="${esc(product?.id || product?.slug || title)}">Send on WhatsApp</a></form></div><aside class="info-card inquiry-side"><h2>${esc(title || 'General Inquiry')}</h2>${image ? `<img src="${esc(image)}" alt="${esc(title)}">` : imagePlaceholder(product ? 'Image coming soon' : 'Select a product for image preview')}<p>${esc(product?.excerpt || 'Choose a product and send size or colour preference.')}</p><div class="social-actions"><a class="btn btn-whatsapp" href="${esc(whatsappLink())}" target="_blank" rel="noopener" ${product ? `data-track-whatsapp-inquiry="${esc(product.id || product.slug || title)}"` : ''}>WhatsApp</a>${instagramUrl() ? `<a class="btn btn-outline" href="${esc(instagramUrl())}" target="_blank" rel="noopener">Instagram</a>` : ''}</div></aside></div></section>`;
    if (product) trackOnce(`inquiry_open:${product.id || product.slug || title}`, 'inquiry_open', product);
  }

  function renderContact() {
    setTitle('Contact');
    $('#app').innerHTML = `<section class="page-hero"><div class="container page-title"><span class="eyebrow">Contact</span><h1>${esc(setting('contact_heading', 'Contact SHREE'))}</h1><p>${esc(setting('contact_text', 'Use the inquiry form, Instagram, or WhatsApp for direct messages.'))}</p></div></section><section class="section"><div class="container grid grid-3">${statusNotice()}<div class="info-card contact-card"><h2>Direct WhatsApp</h2><p>Press the WhatsApp button and send a pre-filled message to our number.</p><a class="btn btn-whatsapp" target="_blank" rel="noopener" href="${esc(whatsappLink())}">Message on WhatsApp</a></div><div class="info-card contact-card"><h2>Product Inquiry</h2><p>Open a product and press Send Inquiry, or use the general inquiry form.</p><a class="btn btn-gold" href="#inquiry">Send Inquiry</a></div><div class="info-card contact-card"><h2>Instagram</h2><p>${instagramUrl() ? 'Connect with the boutique on Instagram.' : 'Instagram link coming soon.'}</p>${instagramUrl() ? `<a class="btn btn-outline" href="${esc(instagramUrl())}" target="_blank" rel="noopener">Open Instagram</a>` : ''}</div></div></section>`;
  }

  function applyGlobalSettings() {
    const settings = state.settings;
    $$('[data-site-name]').forEach((el) => { el.textContent = siteName(); });
    const topbar = $('#topbar');
    if (topbar) topbar.textContent = settings.topbar_text || fallbackSettings.topbar_text;
    const footerText = $('[data-footer-text]');
    if (footerText) footerText.textContent = settings.hero_text || 'Browse our latest boutique products and offers.';
    const footerWhatsapp = $('[data-footer-whatsapp]');
    if (footerWhatsapp) footerWhatsapp.textContent = `WhatsApp: +${whatsappNumber()}`;
    const wa = whatsappLink();
    $$('[data-whatsapp-nav],[data-whatsapp-float]').forEach((el) => { el.href = wa; });
    const ig = instagramUrl();
    $$('[data-instagram-nav],[data-instagram-footer]').forEach((el) => {
      el.hidden = !ig;
      if (ig) el.href = ig;
    });
    const fonts = settings.fonts || fallbackSettings.fonts;
    document.body.style.fontFamily = fonts.body || fallbackSettings.fonts.body;
    document.body.style.fontSize = fonts.body_size || fallbackSettings.fonts.body_size;
    document.documentElement.style.setProperty('--heading-font', fonts.heading || fallbackSettings.fonts.heading);
    $('#year').textContent = new Date().getFullYear();
  }

  async function render() {
    applyGlobalSettings();
    const route = getRoute();
    if (route.name === 'categories') return renderCategories();
    if (route.name === 'products') return renderProducts();
    if (route.name === 'product') return renderProductRoute(route.slug);
    if (route.name === 'inquiry') return renderInquiry();
    if (route.name === 'contact') return renderContact();
    return renderHome();
  }

  document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-menu-toggle]');
    if (toggle) $('[data-menu]')?.classList.toggle('open');
    const thumb = event.target.closest('[data-gallery-thumb]');
    if (thumb) {
      const main = $('[data-gallery-main]');
      const src = thumb.getAttribute('data-gallery-thumb');
      if (main && src) main.setAttribute('src', src);
    }
    const inquiryClick = event.target.closest('[data-track-inquiry-click]');
    if (inquiryClick) {
      const key = String(inquiryClick.getAttribute('data-track-inquiry-click') || '');
      const product = state.products.find((item) => String(item.id || item.slug || item.title || '') === key) || null;
      if (product) trackEvent('inquiry_click', product);
    }
    const whatsappClick = event.target.closest('[data-track-whatsapp-inquiry]');
    if (whatsappClick) {
      const key = String(whatsappClick.getAttribute('data-track-whatsapp-inquiry') || '');
      const product = state.products.find((item) => String(item.id || item.slug || item.title || '') === key) || null;
      if (product) trackEvent('whatsapp_click', product);
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target.closest('[data-search-products]');
    if (!input) return;
    clearTimeout(input._timer);
    input._timer = setTimeout(() => {
      const route = getRoute();
      const params = new URLSearchParams(route.params.toString());
      const value = input.value.trim();
      if (value) params.set('q', value); else params.delete('q');
      location.hash = `products${params.toString() ? `?${params.toString()}` : ''}`;
    }, 350);
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-inquiry-form]');
    if (!form) return;
    event.preventDefault();
    const notice = $('#formNotice');
    const data = Object.fromEntries(new FormData(form).entries());
    data.source = 'website';
    if (notice) {
      notice.hidden = false;
      notice.className = 'notice';
      notice.textContent = 'Submitting inquiry...';
    }
    try {
      if (!contentConfigured()) throw new Error('Website content is not configured. Please use WhatsApp for now.');
      await apiPost('inquiries', data);
      const product = data.product_slug ? findProduct(data.product_slug, '') : null;
      if (product) trackEvent('inquiry_submit', product);
      if (notice) notice.textContent = 'Inquiry sent successfully.';
      form.reset();
    } catch (error) {
      if (notice) {
        notice.className = 'notice error';
        notice.textContent = error.message || 'Inquiry could not be sent. Please use WhatsApp.';
      }
    }
  });

  window.addEventListener('hashchange', () => render());
  loadContent();
})();
