const el = document.getElementById('typed');
const cursorEl = document.getElementById('typedCursor');
function startTextType({ el, cursorEl, text, typingSpeed = 50, initialDelay = 0, pauseDuration = 2000, deletingSpeed = 30, loop = true, showCursor = true, hideCursorWhileTyping = false, cursorCharacter = '|', startOnVisible = false, variableSpeed, reverseMode = false }) {
  let displayedText = '';
  let currentCharIndex = 0;
  let isDeleting = false;
  let currentTextIndex = 0;
  const textArray = Array.isArray(text) ? text : [text];
  const getRandomSpeed = () => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  };
  const render = () => {
    const html = displayedText.replace(/IsyaraTalk/g, '<span class="text-blue-600">IsyaraTalk</span>');
    el.innerHTML = html;
    if (cursorEl) {
      cursorEl.textContent = cursorCharacter;
      const hide = hideCursorWhileTyping && (!isDeleting && currentCharIndex < (reverseMode ? textArray[currentTextIndex].length : textArray[currentTextIndex].length));
      cursorEl.style.visibility = hide ? 'hidden' : 'visible';
    }
  };
  let visible = !startOnVisible;
  if (startOnVisible && el) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { visible = true; } });
    }, { threshold: 0.1 });
    obs.observe(el);
  }
  let t;
  const loopFn = () => {
    if (!visible) { t = setTimeout(loopFn, 200); return; }
    const currentText = textArray[currentTextIndex];
    const processed = reverseMode ? currentText.split('').reverse().join('') : currentText;
    if (isDeleting) {
      if (displayedText === '') {
        isDeleting = false;
        if (currentTextIndex === textArray.length - 1 && !loop) return;
        currentTextIndex = (currentTextIndex + 1) % textArray.length;
        currentCharIndex = 0;
        t = setTimeout(loopFn, pauseDuration);
      } else {
        displayedText = displayedText.slice(0, -1);
        render();
        t = setTimeout(loopFn, deletingSpeed);
      }
    } else {
      if (currentCharIndex < processed.length) {
        displayedText += processed[currentCharIndex];
        currentCharIndex += 1;
        render();
        t = setTimeout(loopFn, variableSpeed ? getRandomSpeed() : typingSpeed);
      } else {
        if (!loop && currentTextIndex === textArray.length - 1) return;
        t = setTimeout(() => { isDeleting = true; loopFn(); }, pauseDuration);
      }
    }
  };
  setTimeout(loopFn, initialDelay);
}
startTextType({ el, cursorEl, text: ['Selamat Datang di IsyaraTalk'], typingSpeed: 75, pauseDuration: 1500, deletingSpeed: 35, loop: true, showCursor: true, startOnVisible: true });