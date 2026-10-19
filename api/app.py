import io
import os
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

# Initialize FastAPI
app = FastAPI(title="IsyaraTalk Inference (Simplified)")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
# Weights path: set MODEL_PATH, otherwise weights/best.pt next to this file.
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights", "best.pt"),
)

model = None
try:
    if os.path.exists(MODEL_PATH):
        print(f"Loading model from: {MODEL_PATH}")
        model = YOLO(MODEL_PATH)
    else:
        print(f"ERROR: model file not found at {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model: {e}")

# Load class names mapping if needed (optional, YOLO models usually have names embedded)
# But we can try to load from json to be safe or just use model.names
CLASSES = {}
try:
    if model:
        CLASSES = model.names
        print(f"Model classes loaded: {CLASSES}")
except Exception:
    pass

@app.get('/health')
def health():
    return {
        'status': 'ok', 
        'model_loaded': model is not None, 
        'backend': 'ultralytics_pytorch',
        'model_path': os.path.basename(MODEL_PATH)
    }

@app.post('/detect')
async def detect(file: UploadFile = File(...)):
    if model is None:
        return {'error': 'Model not loaded', 'predictions': []}

    try:
        # Read Image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Inference using Ultralytics
        # conf=0.15 to ensure we catch things (user can filter later or we filter here)
        results = model.predict(source=image, conf=0.15)
        
        preds = []
        if len(results) > 0:
            result = results[0]
            
            # Process boxes
            for box in result.boxes:
                # box.xyxy is [x1, y1, x2, y2]
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = xyxy
                
                # Confidence
                conf = float(box.conf[0])
                
                # Class
                cls_id = int(box.cls[0])
                cls_name = result.names[cls_id]
                
                # Create prediction object
                # Structure must match what frontend expects: 
                # { box: {x1, y1, x2, y2}, score: float, class_id: int, class_name: str }
                preds.append({
                    'box': {
                        'x1': x1, 'y1': y1, 
                        'x2': x2, 'y2': y2,
                        # Add width/height for convenience (though frontend calculates it too)
                        'w': x2 - x1, 'h': y2 - y1
                    },
                    'score': conf,
                    'class_id': cls_id,
                    'class_name': cls_name
                })
                
        return {'predictions': preds}

    except Exception as e:
        print(f"Inference error: {e}")
        return {'error': str(e), 'predictions': []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
