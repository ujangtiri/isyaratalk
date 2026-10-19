import cv2
from ultralytics import YOLO

# Path to the trained weights
model_path = "../api/weights/best.pt"
model = YOLO(model_path)

# Buka webcam default
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Tidak dapat mengakses kamera!")
    exit()

print("Tekan 'q' untuk keluar")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # YOLO inference
    results = model.predict(frame, verbose=False)
    frame_result = results[0].plot()  # gambar bounding box + class + confidence

    # Tampilkan frame
    cv2.imshow("YOLO Webcam", frame_result)

    # Tekan 'q' untuk keluar
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Bersihkan
cap.release()
cv2.destroyAllWindows()
print("Selesai.")
