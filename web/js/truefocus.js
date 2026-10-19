import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm';

const container = document.getElementById('focusButtons');
if (container) {
  const buttons = Array.from(container.querySelectorAll('.focus-word'));
  const frame = container.querySelector('.focus-frame');
  const borderColor = container.dataset.borderColor || '#3b82f6';
  const blurAmount = parseFloat(container.dataset.blurAmount || '3');
  const duration = parseFloat(container.dataset.duration || '0.6');
  const pause = parseFloat(container.dataset.pause || '1.0');

  container.style.setProperty('--border-color', borderColor);
  buttons.forEach(b => b.style.setProperty('--blur-amount', `${blurAmount}px`));

  let idx = 0;

  function updateFrameTo(el) {
    const parentRect = container.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const x = rect.left - parentRect.left;
    const y = rect.top - parentRect.top;
    const width = rect.width;
    const height = rect.height;

    gsap.to(frame, { x, y, width, height, opacity: 1, duration, ease: 'power2.out' });
  }

  function setActive(i) {
    idx = i % buttons.length;
    buttons.forEach((b, j) => {
      if (j === idx) {
        b.classList.remove('blur');
      } else {
        b.classList.add('blur');
      }
    });
    updateFrameTo(buttons[idx]);
  }

  // Hover interaction: focus hovered button immediately
  buttons.forEach((b, i) => {
    b.addEventListener('mouseenter', () => setActive(i));
  });

  // Auto cycle
  setActive(0);
  setTimeout(() => updateFrameTo(buttons[0]), 50);
  setInterval(() => setActive((idx + 1) % buttons.length), (duration + pause) * 1000);

  // Resize handler keeps frame aligned
  function onResize() { updateFrameTo(buttons[idx]); }
  window.addEventListener('resize', onResize);
}