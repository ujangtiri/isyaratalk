import { loadModel, predictYolo, model } from './model.js';
import { preprocessYolo, postprocessYolo } from './yolo_utils.js';
import { LABELS } from './data.js';

const BACKEND_URL = `http://${window.location.hostname}:8001`;
let useServer = false;
let useMediaPipe = false;
let handsDetector = null;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loadingEl = document.getElementById('loading');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
// Fix ID mismatch: detection.html uses 'prediction' and 'confidence'
const predLabel = document.getElementById('prediction');
const predConf = document.getElementById('confidence');
// confBar might not exist in HTML, check first
const confBar = document.getElementById('confBar');

let stream;
let running = false;
let modelReady = false;
let loadingError = false;

// Mock simulation state
let simulateDetection = false;
let lastSpokenLabel = '';
let lastSpokenTime = 0;

function speakResult(label) {
  const now = Date.now();
  // Speak only if label changed or 3 seconds passed
  if (label !== lastSpokenLabel || (now - lastSpokenTime > 3000)) {
    lastSpokenLabel = label;
    lastSpokenTime = now;

    // Simple browser TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(label);
      utterance.lang = 'id-ID'; // Indonesian
      window.speechSynthesis.speak(utterance);
    }
  }
}

// Load dynamic classes
fetch('js/model_classes.json')
  .then(res => res.json())
  .then(data => {
    window.MODEL_CLASSES = data;
    console.log("Loaded dynamic classes:", data);
  })
  .catch(e => console.warn("Could not load model_classes.json, using default LABELS"));

// Early init: probe backend or load model so UI is ready
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const backendOk = await checkServerHealth();
    useServer = backendOk;
    if (backendOk && loadingEl) {
      loadingEl.style.display = 'none';
    }
    if (!backendOk) {
      await ensureModel();
      if (loadingEl) loadingEl.style.display = 'none';
    }
  } catch (e) {
    console.warn('Initial detection init failed', e);
    if (loadingEl) loadingEl.style.display = 'none';
  }
});

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  // Wait for video metadata to set canvas size
  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  };
}

async function ensureModel() {
  if (!modelReady) {
    try {
      await loadModel();
      modelReady = true;
      loadingError = false;
      if (loadingEl) loadingEl.style.display = 'none';
    } catch (e) {
      loadingError = true;
    }
  }
}

async function checkServerHealth() {
  try {
    console.log(`Checking backend at ${BACKEND_URL}/health...`);
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) {
      console.warn(`Backend health check failed with status: ${res.status}`);
      return false;
    }
    const j = await res.json();
    console.log("Backend status:", j);
    return !!j.model_loaded;
  } catch (e) {
    console.warn(`Backend unreachable at ${BACKEND_URL}:`, e);
    return false;
  }
}

async function initMediaPipe() {
  if (handsDetector) return true;
  try {
    // Inject MediaPipe Hands UMD script for wider browser compatibility
    const url = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    await new Promise((resolve, reject) => {
      if (window.Hands) return resolve();
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
    handsDetector = new window.Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}` });
    handsDetector.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      selfieMode: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    handsDetector.onResults((results) => {
      // store last results for loop to draw
      window._mpHandsResults = results;
    });
    return true;
  } catch (e) {
    console.warn('MediaPipe init failed', e);
    return false;
  }
}

async function runMediaPipeFrame() {
  if (!handsDetector) return [];
  // Create an offscreen canvas to send a 640x480 frame to MediaPipe
  const off = document.createElement('canvas');
  off.width = 640;
  off.height = 480;
  const offCtx = off.getContext('2d');
  offCtx.drawImage(video, 0, 0, off.width, off.height);
  const bitmap = off;
  window._mpHandsResults = null;
  await handsDetector.send({ image: bitmap });
  const results = window._mpHandsResults;
  if (!results || !results.multiHandLandmarks) return [];
  // Map results to same format used by drawing code: [{label, score, box:[x,y,w,h]}]
  const out = [];
  for (let i = 0; i < results.multiHandLandmarks.length; i++) {
    const landmarks = results.multiHandLandmarks[i];
    // compute bounding box from landmarks
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    landmarks.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    // landmarks are normalized [0..1] relative to image width/height
    const imgW = video.videoWidth || canvas.width || off.width;
    const imgH = video.videoHeight || canvas.height || off.height;
    const x = minX * imgW;
    const y = minY * imgH;
    const w = (maxX - minX) * imgW;
    const h = (maxY - minY) * imgH;
    out.push({ label: 'hand', score: 0.9, box: [x, y, w, h], landmarks });
  }
  return out;
}

async function sendFrameToServer() {
  // draw video to offscreen canvas 640x640
  const off = document.createElement('canvas');
  off.width = 640;
  off.height = 640;
  const offCtx = off.getContext('2d');
  offCtx.drawImage(video, 0, 0, off.width, off.height);

  return new Promise((resolve, reject) => {
    off.toBlob(async (blob) => {
      try {
        const fd = new FormData();
        fd.append('file', blob, 'frame.jpg');
        const r = await fetch(`${BACKEND_URL}/detect`, { method: 'POST', body: fd });
        if (!r.ok) {
          resolve([]);
          return;
        }
        const json = await r.json();
        // Map server predictions to array like postprocessYolo output
        const preds = (json.predictions || []).map(p => {
          const x1 = p.box.x1;
          const y1 = p.box.y1;
          const x2 = p.box.x2;
          const y2 = p.box.y2;
          const w = x2 - x1;
          const h = y2 - y1;
          return { label: p.class_name, score: p.score, box: [x1, y1, w, h] };
        });
        resolve(preds);
      } catch (e) {
        resolve([]);
      }
    }, 'image/jpeg', 0.8);
  });
}

async function loop() {
  if (!running) return;
  await ensureModel();
  // Check backend once when starting
  if (!useServer) {
    useServer = await checkServerHealth();
    if (useServer) console.log('Using backend inference at', BACKEND_URL);
  }
  if (useServer && loadingEl) loadingEl.style.display = 'none';

  if (loadingError) {
    predLabel.textContent = 'Error';
    predConf.textContent = 'Model not found';
    // feedback element might not exist in detection.html, but let's check
    // In detection.html provided earlier, there is no 'feedback' ID. It was in latihan.html.
    // So we just update the labels.
    requestAnimationFrame(loop);
    return;
  }

  let results = [];
  if (useServer) {
    // send frame to backend and use its predictions
    results = await sendFrameToServer();
  } else {
    // prefer TFJS model if loaded
    if (modelReady && !loadingError) {
      const tensor = preprocessYolo(video);
      const output = await predictYolo(tensor);
      tensor.dispose();
      results = await postprocessYolo(output, video.videoWidth, video.videoHeight);
    } else {
      // Try MediaPipe fallback if model/backend not available
      if (!useMediaPipe) {
        useMediaPipe = await initMediaPipe();
        if (useMediaPipe) console.log('Using MediaPipe Hands fallback');
      }
      if (useMediaPipe) {
        results = await runMediaPipeFrame();
      } else {
        results = [];
      }
    }
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.length > 0) {
    // Find best result for main display
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    const best = results[0];

    // Update UI
    predLabel.textContent = best.label;
    const conf = Math.round(best.score * 100);
    predConf.textContent = conf + '%';
    if (confBar) confBar.style.width = conf + '%';

    // Speak the result if it's a new stable detection
    speakResult(best.label);

    // Draw all boxes
    ctx.lineWidth = 4;
    ctx.font = 'bold 20px Inter';

    results.forEach(res => {
      const [x, y, w, h] = res.box;
      const scorePct = Math.round(res.score * 100);

      // Color based on confidence
      ctx.strokeStyle = '#2563eb'; // blue-600
      ctx.fillStyle = '#2563eb';

      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();

      // Label background
      const text = `${res.label} ${scorePct}%`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x, y - 30, textWidth + 20, 30);

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x + 10, y - 8);
    });

  } else {
    predLabel.textContent = '-';
    predConf.textContent = '0%';
    if (confBar) confBar.style.width = '0%';
  }

  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', async () => {
  if (loadingEl) loadingEl.style.display = 'flex';
  useServer = await checkServerHealth();
  if (useServer && loadingEl) loadingEl.style.display = 'none';
  if (!useServer) {
    await ensureModel();
    if (!modelReady) {
      useMediaPipe = await initMediaPipe();
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }
  await startCamera();
  running = true;
  try {
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
  } catch (e) { }
  loop();
});

stopBtn.addEventListener('click', () => {
  running = false;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try {
    stopBtn.classList.add('hidden');
    startBtn.classList.remove('hidden');
  } catch (e) { }
});
