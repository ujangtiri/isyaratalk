const URL_MODEL = "js/model_tfjs/model.json";
const URL_CLASSES = "js/model_classes.json";
let model;

class MockModel {
    constructor() {
        this.isMock = true;
        console.warn("Using MockModel. Real model not found.");
    }
    
    predict(tensor) {
        // Return a dummy tensor with shape [1, 4+80, 8400] (or similar)
        // We assume 26 classes for A-Z, plus 4 coords = 30 channels.
        // YOLOv8 output: [batch, channels, anchors]
        return tf.tidy(() => {
            // Create a tensor of zeros [1, 33, 8400] (29 classes + 4)
            // This will result in 0 confidence for all classes, so no detections.
            return tf.zeros([1, 33, 8400]); 
        });
    }
}

async function loadClasses() {
    try {
        const response = await fetch(URL_CLASSES);
        if (response.ok) {
            const classes = await response.json();
            window.MODEL_CLASSES = classes;
            console.log("Model classes loaded:", classes.length);
        }
    } catch (e) {
        console.warn("Failed to load model classes", e);
    }
}

async function loadModel() {
  // Load classes first
  await loadClasses();

  try {
    // YOLOv8 exports as GraphModel usually
    try {
        model = await tf.loadGraphModel(URL_MODEL);
    } catch (e) {
        console.log("Failed to load as GraphModel, trying LayersModel...", e);
        try {
            model = await tf.loadLayersModel(URL_MODEL);
        } catch (e2) {
            console.error("Failed to load as LayersModel", e2);
            throw e2;
        }
    }
    console.log("Model loaded");
  } catch (e) {
    console.error("Model load error:", e);
    // Fallback to MockModel to prevent crash and allow UI testing
    console.log("Falling back to MockModel for testing/development...");
    model = new MockModel();
    
    // Notify user via UI (if possible, or just console)
    if (typeof window !== 'undefined') {
        // Create a toast or alert
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50';
        toast.innerHTML = `
            <p class="font-bold">Mode Simulasi</p>
            <p>Model AI belum tersedia. Website berjalan dalam mode simulasi (Mock).</p>
            <p class="text-xs mt-1">Silakan latih model atau gunakan tombol simulasi pada kuis.</p>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 10000);
    }
  }
  return model;
}

// Kept for backward compatibility if needed, but YOLO uses preprocessYolo in yolo_utils.js
function preprocessFrame(videoFrame) {
  return tf.tidy(() => {
    let tensor = tf.browser.fromPixels(videoFrame)
      .resizeNearestNeighbor([224, 224])
      .toFloat()
      .div(255);
    return tensor;
  });
}

// For YOLO, we return the raw prediction tensor to be post-processed
async function predictYolo(tensor) {
  return model.predict(tensor);
}

async function predictFrame(imageTensor) {
  // Legacy support for MobileNet classification if needed
  const prediction = model.predict(imageTensor.expandDims(0));
  const result = prediction.dataSync();
  return result;
}

export { loadModel, preprocessFrame, predictFrame, predictYolo, model };
