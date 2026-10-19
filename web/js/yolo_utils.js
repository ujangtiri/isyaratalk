
import { LABELS } from './data.js';

// YOLOv8 constants
const IMG_SIZE = 640;
const CONF_THRESHOLD = 0.25;
const IOU_THRESHOLD = 0.45;

/**
 * Prepares the input tensor for YOLOv8
 * @param {HTMLVideoElement} video 
 * @returns {tf.Tensor} [1, 640, 640, 3]
 */
export function preprocessYolo(video) {
  return tf.tidy(() => {
    return tf.browser.fromPixels(video)
      .resizeNearestNeighbor([IMG_SIZE, IMG_SIZE])
      .div(255.0)
      .expandDims(0);
  });
}

/**
 * Post-processes YOLOv8 output
 * @param {tf.Tensor} outputTensor [1, 4+nc, 8400]
 * @param {number} imgWidth Original image width
 * @param {number} imgHeight Original image height
 * @returns {Promise<Array>} Array of {box: [x, y, w, h], score, label}
 */
export async function postprocessYolo(outputTensor, imgWidth, imgHeight) {
  // 1. Transpose to [1, 8400, 4+nc]
  // Output shape from YOLOv8 is [1, 4+nc, anchors]
  const trans = outputTensor.transpose([0, 2, 1]); // [1, 8400, 84]
  const data = await trans.array();
  tf.dispose([trans, outputTensor]);

  const rows = data[0]; // 8400 rows
  const boxes = [];
  const scores = [];
  const classIndices = [];

  // 2. Filter by confidence
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const box = row.slice(0, 4); // xc, yc, w, h
    const clsScores = row.slice(4);
    
    // Find max score
    let maxScore = -Infinity;
    let maxClass = -1;
    for (let j = 0; j < clsScores.length; j++) {
      if (clsScores[j] > maxScore) {
        maxScore = clsScores[j];
        maxClass = j;
      }
    }

    if (maxScore >= CONF_THRESHOLD) {
      // Convert xc, yc, w, h to x1, y1, x2, y2
      const w = box[2];
      const h = box[3];
      const x1 = box[0] - w / 2;
      const y1 = box[1] - h / 2;
      const x2 = box[0] + w / 2;
      const y2 = box[1] + h / 2;
      
      boxes.push([x1, y1, x2, y2]);
      scores.push(maxScore);
      classIndices.push(maxClass);
    }
  }

  if (boxes.length === 0) return [];

  // 3. NMS
  const boxesTensor = tf.tensor2d(boxes);
  const scoresTensor = tf.tensor1d(scores);
  
  const nmsIndices = await tf.image.nonMaxSuppressionAsync(
    boxesTensor, 
    scoresTensor, 
    20, // max output size
    IOU_THRESHOLD, 
    CONF_THRESHOLD
  );
  
  const indices = await nmsIndices.array();
  
  tf.dispose([boxesTensor, scoresTensor, nmsIndices]);

  // 4. Map back to original image size
  const results = [];
  const scaleX = imgWidth / IMG_SIZE;
  const scaleY = imgHeight / IMG_SIZE;

  for (const i of indices) {
    const b = boxes[i]; // [x1, y1, x2, y2] normalized to 640x640 space? No, YOLO output is in pixel coordinates of the 640x640 input
    
    const x1 = b[0] * scaleX;
    const y1 = b[1] * scaleY;
    const x2 = b[2] * scaleX;
    const y2 = b[3] * scaleY;
    
    // Determine label
    let label = LABELS[classIndices[i]] || '?';
    // Use dynamic labels if available
    if (window.MODEL_CLASSES && window.MODEL_CLASSES[classIndices[i]]) {
        label = window.MODEL_CLASSES[classIndices[i]];
    }

    results.push({
      box: [x1, y1, x2 - x1, y2 - y1], // x, y, w, h
      score: scores[i],
      label: label
    });
  }

  return results;
}
