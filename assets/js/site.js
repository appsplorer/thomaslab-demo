(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const doc = document.documentElement;

  const isReduced = () => prefersReducedMotion.matches;

  /* ---------- reveal ---------- */
  const revealItems = [...document.querySelectorAll('.reveal')];
  revealItems.forEach((el) => {
    const delay = Number.parseInt(el.dataset.delay || '0', 10);
    el.style.setProperty('--reveal-delay', `${Math.max(0, Math.min(delay, 600))}ms`);
  });

  if (!('IntersectionObserver' in window) || isReduced()) {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.09, rootMargin: '0px 0px -4% 0px' });
    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- hero constellation pointer field ---------- */
  const constellation = document.querySelector('[data-constellation]');
  if (constellation && finePointer.matches && !isReduced()) {
    let frame = 0;
    const update = (event) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = constellation.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) - 0.5;
        const ny = ((event.clientY - rect.top) / rect.height) - 0.5;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        constellation.style.setProperty('--parallax-x', `${nx * 14}px`);
        constellation.style.setProperty('--parallax-y', `${ny * 12}px`);
        constellation.style.setProperty('--cursor-x', `${px}px`);
        constellation.style.setProperty('--cursor-y', `${py}px`);
        constellation.style.setProperty('--core-x', `${nx * 7}px`);
        constellation.style.setProperty('--core-y', `${ny * 7}px`);
      });
    };
    constellation.addEventListener('pointermove', update, { passive: true });
    constellation.addEventListener('pointerleave', () => {
      constellation.style.setProperty('--parallax-x', '0px');
      constellation.style.setProperty('--parallax-y', '0px');
      constellation.style.setProperty('--cursor-x', '50%');
      constellation.style.setProperty('--cursor-y', '50%');
      constellation.style.setProperty('--core-x', '0px');
      constellation.style.setProperty('--core-y', '0px');
    }, { passive: true });
  }

  /* ---------- card spotlight + restrained 3D tilt ---------- */
  if (finePointer.matches && !isReduced()) {
    document.querySelectorAll('[data-spotlight]').forEach((card) => {
      let frame = 0;
      const onMove = (event) => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          const rect = card.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const nx = x / rect.width - 0.5;
          const ny = y / rect.height - 0.5;
          card.style.setProperty('--mouse-x', `${x}px`);
          card.style.setProperty('--mouse-y', `${y}px`);
          if (card.hasAttribute('data-tilt')) {
            const rotateY = nx * 5.2;
            const rotateX = -ny * 4.2;
            card.style.setProperty('--tilt-x', `${rotateX.toFixed(2)}deg`);
            card.style.setProperty('--tilt-y', `${rotateY.toFixed(2)}deg`);
          }
        });
      };
      const reset = () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      };
      card.addEventListener('pointermove', onMove, { passive: true });
      card.addEventListener('pointerleave', reset, { passive: true });
    });
  }

  /* ---------- accessible left mobile drawer ---------- */
  const drawer = document.getElementById('tl-mobile-drawer');
  const drawerToggle = document.querySelector('.tl-drawer-toggle');
  const drawerClosers = document.querySelectorAll('[data-drawer-close]');
  let previouslyFocused = null;

  const getFocusable = () => drawer ? [...drawer.querySelectorAll('a[href], button:not([disabled])')] : [];

  const openDrawer = () => {
    if (!drawer || !drawerToggle) return;
    previouslyFocused = document.activeElement;
    doc.classList.add('tl-drawer-open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.removeAttribute('inert');
    drawerToggle.setAttribute('aria-expanded', 'true');
    drawerToggle.setAttribute('aria-label', 'Close navigation');
    const focusable = getFocusable();
    window.setTimeout(() => focusable[0]?.focus(), 80);
  };

  const closeDrawer = ({ restoreFocus = true } = {}) => {
    if (!drawer || !drawerToggle) return;
    doc.classList.remove('tl-drawer-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
    drawerToggle.setAttribute('aria-expanded', 'false');
    drawerToggle.setAttribute('aria-label', 'Open navigation');
    if (restoreFocus && previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
  };

  if (drawer && drawerToggle) {
    drawerToggle.addEventListener('click', () => {
      if (doc.classList.contains('tl-drawer-open')) closeDrawer();
      else openDrawer();
    });
    drawerClosers.forEach((button) => button.addEventListener('click', () => closeDrawer()));
    drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeDrawer({ restoreFocus: false })));

    document.addEventListener('keydown', (event) => {
      if (!doc.classList.contains('tl-drawer-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    const desktopQuery = window.matchMedia('(min-width: 821px)');
    const closeOnDesktop = (event) => { if (event.matches) closeDrawer({ restoreFocus: false }); };
    desktopQuery.addEventListener?.('change', closeOnDesktop);
  }

  /* ---------- sticky header state ---------- */
  const header = document.querySelector('.tl-header');
  if (header) {
    const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 14);
    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }
})();

/* V4: progressive enhancement hooks */
document.addEventListener("click",(event)=>{
  const a=event.target.closest("a[href]");
  if(!a) return;
  if(a.target==="_blank") a.rel="noopener noreferrer";
});


/* ---------- user-friendly utilities: publication search, copy citation, back to top ---------- */
(() => {
  'use strict';

  const publicationSearch = document.querySelector('[data-publication-search]');
  if (publicationSearch) {
    const cards = [...document.querySelectorAll('[data-publication-card]')];
    const years = [...document.querySelectorAll('[data-publication-year]')];
    const count = document.querySelector('[data-publication-count]');
    const empty = document.querySelector('[data-publication-empty]');

    const applyFilter = () => {
      const query = publicationSearch.value.trim().toLowerCase();
      let visible = 0;
      for (const card of cards) {
        const text = (card.dataset.filterText || '').toLowerCase();
        const match = !query || text.includes(query);
        card.hidden = !match;
        if (match) visible += 1;
      }
      for (const year of years) {
        year.hidden = !year.querySelector('[data-publication-card]:not([hidden])');
      }
      if (count) count.textContent = String(visible);
      if (empty) empty.hidden = visible !== 0;
    };

    publicationSearch.addEventListener('input', applyFilter, { passive: true });
  }

  document.querySelectorAll('[data-copy-text]').forEach((button) => {
    button.addEventListener('click', async () => {
      const text = button.dataset.copyText || '';
      if (!text) return;
      const originalNodes = [...button.childNodes].map((node) => node.cloneNode(true));
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        textarea.remove();
      }
      if (copied) {
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-check';
        button.replaceChildren(icon, document.createTextNode(' Copied'));
        window.setTimeout(() => {
          button.replaceChildren(...originalNodes.map((node) => node.cloneNode(true)));
        }, 1600);
      }
    });
  });

  /* ---------- homepage gallery lightbox ---------- */
  const galleryItems = [...document.querySelectorAll('[data-gallery-item]')];
  const galleryDialog = document.querySelector('[data-gallery-lightbox]');
  if (galleryItems.length && typeof HTMLDialogElement !== 'undefined' && galleryDialog instanceof HTMLDialogElement) {
    const galleryImage = galleryDialog.querySelector('[data-gallery-image]');
    const galleryCaption = galleryDialog.querySelector('[data-gallery-caption]');
    const galleryMeta = galleryDialog.querySelector('[data-gallery-meta]');
    const galleryCounter = galleryDialog.querySelector('[data-gallery-counter]');
    const galleryPrev = galleryDialog.querySelector('[data-gallery-prev]');
    const galleryNext = galleryDialog.querySelector('[data-gallery-next]');
    const galleryClose = galleryDialog.querySelector('[data-gallery-close]');
    let currentIndex = 0;
    let opener = null;

    const renderGalleryItem = (index) => {
      currentIndex = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[currentIndex];
      if (galleryImage) {
        galleryImage.src = item.dataset.gallerySrc || '';
        galleryImage.alt = item.dataset.galleryAlt || '';
      }
      if (galleryCaption) galleryCaption.textContent = item.dataset.galleryCaption || 'Lab life';
      if (galleryMeta) {
        galleryMeta.textContent = item.dataset.galleryMeta || '';
        galleryMeta.hidden = !(item.dataset.galleryMeta || '');
      }
      if (galleryCounter) galleryCounter.textContent = String(currentIndex + 1).padStart(2, '0') + ' / ' + String(galleryItems.length).padStart(2, '0');
      if (galleryPrev) galleryPrev.hidden = galleryItems.length < 2;
      if (galleryNext) galleryNext.hidden = galleryItems.length < 2;
    };

    const openGallery = (index, source) => {
      opener = source;
      renderGalleryItem(index);
      document.documentElement.classList.add('tl-lightbox-open');
      galleryDialog.showModal();
      window.setTimeout(() => galleryClose?.focus(), 0);
    };

    const closeGallery = () => {
      if (galleryDialog.open) galleryDialog.close();
    };

    galleryItems.forEach((item, index) => item.addEventListener('click', () => openGallery(index, item)));
    galleryPrev?.addEventListener('click', () => renderGalleryItem(currentIndex - 1));
    galleryNext?.addEventListener('click', () => renderGalleryItem(currentIndex + 1));
    galleryClose?.addEventListener('click', closeGallery);

    galleryDialog.addEventListener('click', (event) => {
      if (event.target === galleryDialog) closeGallery();
    });
    galleryDialog.addEventListener('close', () => {
      document.documentElement.classList.remove('tl-lightbox-open');
      if (galleryImage) galleryImage.removeAttribute('src');
      if (opener instanceof HTMLElement) opener.focus();
    });
    galleryDialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' && galleryItems.length > 1) {
        event.preventDefault();
        renderGalleryItem(currentIndex - 1);
      } else if (event.key === 'ArrowRight' && galleryItems.length > 1) {
        event.preventDefault();
        renderGalleryItem(currentIndex + 1);
      }
    });
  }

  const backTop = document.querySelector('[data-backtop]');
  if (backTop) {
    const scrollPosition = () => Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    );
    const syncBackTop = () => {
      const show = scrollPosition() > Math.max(520, window.innerHeight * 0.7);
      backTop.classList.toggle('is-visible', show);
      backTop.tabIndex = show ? 0 : -1;
      backTop.setAttribute('aria-hidden', show ? 'false' : 'true');
    };
    syncBackTop();
    window.addEventListener('scroll', syncBackTop, { passive: true });
    document.addEventListener('scroll', syncBackTop, { passive: true, capture: true });
    backTop.addEventListener('click', () => {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      window.scrollTo({ top: 0, behavior });
      document.documentElement.scrollTo?.({ top: 0, behavior });
      document.body.scrollTo?.({ top: 0, behavior });
      if (behavior === 'auto') {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    });
  }
})();
