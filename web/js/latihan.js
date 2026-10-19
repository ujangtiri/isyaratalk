import { loadModel, predictYolo, model } from './model.js';
import { preprocessYolo, postprocessYolo } from './yolo_utils.js';
import { LABELS } from './data.js';

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const predLabel = document.getElementById('predLabel');
const predConf = document.getElementById('predConf');
const targetSelect = document.getElementById('targetSelect');
const feedback = document.getElementById('feedback');
const countCorrect = document.getElementById('countCorrect');
const countWrong = document.getElementById('countWrong');
const countTotal = document.getElementById('countTotal');

let stream;
let running = false;
let modelReady = false;
let loadingError = false;
let correct = 0;
let wrong = 0;
let total = 0;
let target = '';

// Populate select
function populateSelect(labels) {
    targetSelect.innerHTML = '';
    labels.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l;
        opt.textContent = l;
        targetSelect.appendChild(opt);
    });
    if (labels.length > 0) {
        target = labels[0];
        targetSelect.value = target;
    }
}

// Initial population
populateSelect(LABELS);

// Load dynamic classes
fetch('js/model_classes.json')
  .then(res => res.json())
  .then(data => {
    window.MODEL_CLASSES = data;
    console.log("Loaded dynamic classes:", data);
    populateSelect(data);
  })
  .catch(e => console.warn("Could not load model_classes.json, using default LABELS"));

targetSelect.addEventListener('change', (e) => {
  target = e.target.value;
  feedback.textContent = 'Menunggu';
  feedback.className = 'text-2xl font-bold';
});

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
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
    } catch (e) {
      loadingError = true;
    }
  }
}

function updateCounts() {
  countCorrect.textContent = String(correct);
  countWrong.textContent = String(wrong);
  countTotal.textContent = String(total);
}

// Throttle feedback updates to avoid rapid flickering
let lastUpdate = 0;
const UPDATE_INTERVAL = 500; // ms

async function loop() {
  if (!running) return;
  await ensureModel();
  if (loadingError) {
    predLabel.textContent = '-';
    predConf.textContent = '0%';
    feedback.textContent = 'Model belum dimuat';
    feedback.className = 'text-2xl font-bold';
    requestAnimationFrame(loop);
    return;
  }
  
  // Preprocess
  const tensor = preprocessYolo(video);
  
  // Predict
  const output = await predictYolo(tensor);
  tensor.dispose();
  
  // Postprocess
  const results = await postprocessYolo(output, video.videoWidth, video.videoHeight);
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  let best = null;
  if (results.length > 0) {
      results.sort((a, b) => b.score - a.score);
      best = results[0];
      
      // Draw box
      const [x, y, w, h] = best.box;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2563eb';
      ctx.strokeRect(x, y, w, h);
  }
  
  const now = Date.now();
  if (now - lastUpdate > UPDATE_INTERVAL) {
      lastUpdate = now;
      
      if (best) {
          const label = best.label;
          const conf = Math.round(best.score * 100);
          
          predLabel.textContent = label;
          predConf.textContent = conf + '%';
          
          const threshold = 60;
          if (conf >= threshold) {
              total++;
              if (label === target) {
                  correct++;
                  feedback.textContent = 'Benar!';
                  feedback.className = 'text-2xl font-bold text-green-600';
              } else {
                  wrong++;
                  feedback.textContent = 'Coba lagi';
                  feedback.className = 'text-2xl font-bold text-red-600';
              }
              updateCounts();
          } else {
              feedback.textContent = 'Kurang jelas...';
              feedback.className = 'text-2xl font-bold text-yellow-600';
          }
      } else {
          predLabel.textContent = '-';
          predConf.textContent = '0%';
          feedback.textContent = 'Tidak ada tangan';
          feedback.className = 'text-2xl font-bold text-gray-500';
      }
  }
  
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', async () => {
  await startCamera();
  running = true;
  loop();
});

stopBtn.addEventListener('click', () => {
  running = false;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
