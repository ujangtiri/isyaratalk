import os
import sys
import yaml
import json
from ultralytics import YOLO

# Configuration
# Assuming script is run from project root
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")  # Roboflow YOLOv8 export, not included
DATA_YAML_PATH = os.path.join(DATASET_DIR, "data.yaml")
OUTPUT_DIR = os.path.join(BASE_DIR, "..", "web", "js", "model_tfjs")
CLASSES_JSON_PATH = os.path.join(BASE_DIR, "..", "web", "js", "model_classes.json")

def fix_data_yaml():
    """Ensure data.yaml has absolute paths to avoid YOLO errors"""
    with open(DATA_YAML_PATH, 'r') as f:
        data = yaml.safe_load(f)
    
    # Update paths to absolute
    data['path'] = DATASET_DIR
    data['train'] = "train/images"
    data['val'] = "train/images" # Use train for val if val folder is empty or to simplify
    # Check if valid folder exists
    if os.path.exists(os.path.join(DATASET_DIR, "valid", "images")):
         data['val'] = "valid/images"
    if os.path.exists(os.path.join(DATASET_DIR, "test", "images")):
         data['test'] = "test/images"
         
    with open(DATA_YAML_PATH, 'w') as f:
        yaml.dump(data, f)
    print(f"Updated data.yaml with absolute path: {DATASET_DIR}")
    
    return data['names']

def train():
    print("Checking dependencies...")
    try:
        import ultralytics
        print(f"Ultralytics version: {ultralytics.__version__}")
    except ImportError:
        print("Error: 'ultralytics' library not found.")
        print("Please install it running: pip install ultralytics")
        return

    # Fix yaml and get classes
    class_names = fix_data_yaml()
    
    # Save classes to JSON for frontend
    with open(CLASSES_JSON_PATH, 'w') as f:
        json.dump(class_names, f)
    print(f"Saved class names to {CLASSES_JSON_PATH}")

    # Load model
    print("Loading YOLOv8s model...")
    model = YOLO("yolov8s.pt")  # load a pretrained model (recommended for training)

    # Train
    print("Starting training...")
      # epochs=20 is reasonable for demo, can be increased.
    # exist_ok=True overwrites the project/name folder so we always know where to find the model
    results = model.train(data=DATA_YAML_PATH, epochs=20, imgsz=640, project="runs", name="isyarat_yolo", exist_ok=True)

    # Validate
    print("Validating...")
    metrics = model.val()
    
    # Export to TFJS
    print("Exporting to TFJS...")
    # This will create 'runs/isyarat_yolo/weights/best_web_model'
    success = model.export(format="tfjs") 
    
    print("Training and export complete!")
    print(f"Model saved in 'runs/isyarat_yolo/weights/best_web_model'")
    print("Please move the content of that folder to 'js/model_tfjs/' manually, or I can try to copy it now.")
    
    # Try to copy
    import shutil
    source_dir = os.path.join(BASE_DIR, "runs", "isyarat_yolo", "weights", "best_web_model")
    if os.path.exists(source_dir):
        if os.path.exists(OUTPUT_DIR):
            shutil.rmtree(OUTPUT_DIR)
        shutil.copytree(source_dir, OUTPUT_DIR)
        print(f"Copied model to {OUTPUT_DIR}")
    else:
        print(f"Could not find exported model at {source_dir}")

if __name__ == "__main__":
    train()
