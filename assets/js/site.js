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
