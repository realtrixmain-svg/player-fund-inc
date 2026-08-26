// nav toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('open')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}

// scroll reveals
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
  );
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 90}ms`;
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

// contact form -> Formspree
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('form-status');
    status.textContent = 'Sending...';
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        status.textContent = 'Thank you. Your message has been noted, a member of the team will reply shortly.';
        form.reset();
      } else {
        status.textContent = 'Something went wrong sending your message. Please email us directly at investors@player-fund.com.';
      }
    } catch {
      status.textContent = 'Something went wrong sending your message. Please email us directly at investors@player-fund.com.';
    }
  });
}

// terms of use modal
const termsModal = document.getElementById('terms-modal');
if (termsModal) {
  document.querySelectorAll('[data-open-terms]').forEach((el) =>
    el.addEventListener('click', () => termsModal.showModal())
  );
  termsModal.querySelectorAll('[data-close-terms]').forEach((el) =>
    el.addEventListener('click', () => termsModal.close())
  );
  if (!localStorage.getItem('pf-terms-seen')) {
    termsModal.showModal();
  }
  termsModal.addEventListener('close', () => localStorage.setItem('pf-terms-seen', '1'));
}
