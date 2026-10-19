const containers = Array.from(document.querySelectorAll('.scroller'));

function duplicateToFill(scroller){
  const parent = scroller.parentElement;
  const parentWidth = parent.offsetWidth;
  const originalCount = scroller.children.length;
  const gap = parseFloat(getComputedStyle(scroller).gap) || 0;
  let totalWidth = Array.from(scroller.children).reduce((acc, el) => acc + el.offsetWidth + gap, 0);
  const original = Array.from(scroller.children);
  while (totalWidth < parentWidth * 2){
    original.forEach(el => scroller.appendChild(el.cloneNode(true)));
    totalWidth = Array.from(scroller.children).reduce((acc, el) => acc + el.offsetWidth + gap, 0);
  }
  const oneCopyWidth = Array.from(scroller.children).slice(0, originalCount).reduce((acc, el) => acc + el.offsetWidth + gap, 0);
  return oneCopyWidth;
}

function wrap(min, max, v){
  const range = max - min;
  const mod = (((v - min) % range) + range) % range;
  return mod + min;
}

let lastY = window.scrollY;
let lastT = performance.now();
let velPxPerMs = 0;
let velSmoothed = 0;

function updateScrollVelocity(){
  const y = window.scrollY;
  const t = performance.now();
  const dy = y - lastY;
  const dt = Math.max(1, t - lastT);
  velPxPerMs = dy / dt;
  // low-pass filter for smoother response
  velSmoothed = velSmoothed * 0.9 + velPxPerMs * 0.1;
  lastY = y; lastT = t;
}
window.addEventListener('scroll', updateScrollVelocity, { passive: true });

class LineAnimator{
  constructor(scroller){
    this.scroller = scroller;
    this.baseVelocity = parseFloat(scroller.dataset.velocity || '40');
    this.baseX = 0;
    this.copyWidth = 0;
    this.raf = 0;
    this.onResize = this.onResize.bind(this);
  }
  onResize(){
    this.copyWidth = duplicateToFill(this.scroller);
  }
  tick(now, delta){
    const dir = this.baseVelocity >= 0 ? 1 : -1;
    const moveBase = Math.abs(this.baseVelocity) * (delta / 1000);
    const factor = Math.max(-0.8, Math.min(2.0, velSmoothed * 20));
    const speedMul = Math.max(2, 1 + factor);
    const move = dir * (moveBase * speedMul);
    this.baseX += move;
    if (dir === 1){
      this.baseX = wrap(-this.copyWidth, 0, this.baseX);
    } else {
      this.baseX = wrap(0, this.copyWidth, this.baseX);
    }
    this.scroller.style.transform = `translate3d(${this.baseX}px,0,0)`;
  }
  start(){
    this.onResize();
    let last = performance.now();
    const loop = (t)=>{
      const d = t - last; last = t;
      this.tick(t, d);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this.onResize);
  }
}

containers.forEach(c => {
  const parent = c.parentElement;
  parent.style.setProperty('--scroll-color','#ffffff');
  parent.style.setProperty('--scroll-alt-color','#e2e8f0');
  parent.style.setProperty('--bullet-color','#60a5fa');
  new LineAnimator(c).start();
});
