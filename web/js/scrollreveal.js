// ScrollReveal dengan GSAP + ScrollTrigger - Enhanced Version
// Elemen target: [data-scroll-reveal]

gsap.registerPlugin(ScrollTrigger);

// Split text menjadi kata-kata individual
function splitIntoWords(el) {
  const text = el.textContent;
  const parts = text.split(/(\s+)/);
  el.innerHTML = '';
  
  parts.forEach((p) => {
    if (/^\s+$/.test(p)) {
      // Whitespace
      el.appendChild(document.createTextNode(p));
    } else {
      // Kata
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = p;
      el.appendChild(span);
    }
  });
}

// Initialize scroll reveal animation
function initReveal(el) {
  // Baca parameter dari data attributes
  const baseOpacity = parseFloat(el.dataset.baseOpacity || '0');
  const baseRotation = parseFloat(el.dataset.baseRotation || '2');
  const blurStrength = parseFloat(el.dataset.blurStrength || '6');
  const enableBlur = (el.dataset.enableBlur || 'true') !== 'false';
  
  // Split text menjadi words
  splitIntoWords(el);
  const words = el.querySelectorAll('.word');
  
  // Animasi rotasi pada container
  gsap.fromTo(
    el,
    { 
      transformOrigin: '0% 50%', 
      rotate: baseRotation,
      opacity: 0.3
    },
    {
      rotate: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        end: 'top 60%',
        scrub: 1,
        toggleActions: 'play none none reverse'
      }
    }
  );
  
  // Animasi per-word dengan blur dan fade
  gsap.fromTo(
    words,
    {
      opacity: baseOpacity,
      y: 12,
      scale: 0.95,
      filter: enableBlur ? `blur(${blurStrength}px)` : 'blur(0px)'
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      stagger: {
        amount: 0.5,
        from: 'start',
        ease: 'power1.inOut'
      },
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        end: 'top 55%',
        scrub: 1.5,
        toggleActions: 'play none none reverse',
        onEnter: () => el.classList.add('revealed'),
        onLeaveBack: () => el.classList.remove('revealed')
      }
    }
  );
  
  // Tandai animasi selesai untuk enable text selection
  ScrollTrigger.create({
    trigger: el,
    start: 'top 50%',
    onEnter: () => {
      setTimeout(() => {
        el.classList.add('animation-complete');
      }, 800);
    }
  });
}

// Initialize semua elemen dengan data-scroll-reveal
function initAllReveals() {
  const elements = document.querySelectorAll('[data-scroll-reveal]');
  elements.forEach(initReveal);
}

// Run saat DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAllReveals);
} else {
  initAllReveals();
}

// Refresh ScrollTrigger saat window resize (debounced)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    ScrollTrigger.refresh();
  }, 250);
});