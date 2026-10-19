import QUIZ_DATA from './quiz_data.js';
import { loadModel, predictYolo, model } from './model.js';
import { preprocessYolo, postprocessYolo } from './yolo_utils.js';

// DOM Elements
const levelScreen = document.getElementById('levelScreen');
const levelList = document.getElementById('levelList');
const quizContainer = document.getElementById('quizContainer');
const questionText = document.getElementById('questionText');
const questionContent = document.getElementById('questionContent');
const optionsGrid = document.getElementById('optionsGrid');
const bottomBar = document.getElementById('bottomBar');
const checkBtn = document.getElementById('checkBtn');
const nextBtn = document.getElementById('nextBtn');
const feedbackArea = document.getElementById('feedbackArea');
const feedbackTitle = document.getElementById('feedbackTitle');
const feedbackMessage = document.getElementById('feedbackMessage');
const feedbackIcon = document.getElementById('feedbackIcon');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultScreen = document.getElementById('resultScreen');
const resultAccuracy = document.getElementById('resultAccuracy');
const restartBtn = document.getElementById('restartBtn');

// Audio
const sfxCorrect = document.getElementById('sfxCorrect');
const sfxWrong = document.getElementById('sfxWrong');
const sfxWin = document.getElementById('sfxWin');

// State
let currentLevel = null;
let currentQuestionIndex = 0;
let selectedOption = null;
let isCheckMode = true; // true = Check, false = Next
let correctAnswers = 0;
let totalAttempts = 0; // For accuracy

// Camera State
let stream = null;
let videoEl = null;
let canvasEl = null;
let isCameraRunning = false;
let cameraInterval = null;
let modelReady = false;

// --- Initialization ---

function init() {
    renderLevels();
    checkBtn.addEventListener('click', handleCheck);
    nextBtn.addEventListener('click', handleNext);
    restartBtn.addEventListener('click', () => location.reload());
}

function renderLevels() {
    levelList.innerHTML = '';
    const levels = (QUIZ_DATA && Array.isArray(QUIZ_DATA.levels)) ? QUIZ_DATA.levels : [];
    if (levels.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'bg-slate-800 p-4 rounded-xl border-2 border-slate-700 text-slate-300';
        empty.textContent = 'Belum ada unit latihan untuk ditampilkan.';
        levelList.appendChild(empty);
        return;
    }
    levels.forEach(level => {
        const btn = document.createElement('div');
        btn.className = 'level-card bg-slate-800 p-4 rounded-xl cursor-pointer flex items-center gap-4 border-2 border-slate-700 hover:border-blue-500';
        btn.innerHTML = `
            <div class="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center text-blue-400 text-xl font-bold">
                ${level.id}
            </div>
            <div class="flex-1">
                <h3 class="font-bold text-lg text-white">${level.name}</h3>
                <p class="text-sm text-slate-400">${level.description}</p>
            </div>
        `;
        btn.addEventListener('click', () => startLevel(level));
        levelList.appendChild(btn);
    });

    // Coming Soon Card
    const soonBtn = document.createElement('div');
    soonBtn.className = 'level-card bg-slate-800/50 p-4 rounded-xl flex items-center gap-4 border-2 border-slate-700 border-dashed opacity-75 cursor-not-allowed';
    soonBtn.innerHTML = `
        <div class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center text-slate-500 text-xl font-bold">
            <i class="fa-solid fa-person-digging"></i>
        </div>
        <div class="flex-1">
            <h3 class="font-bold text-lg text-slate-400">Unit Selanjutnya</h3>
            <p class="text-sm text-slate-500">Sedang dalam tahap pengembangan...</p>
        </div>
    `;
    levelList.appendChild(soonBtn);
}

function startLevel(level) {
    // Shuffle questions
    const shuffledQuestions = [...level.questions].sort(() => Math.random() - 0.5);
    
    currentLevel = {
        ...level,
        questions: shuffledQuestions
    };
    
    currentQuestionIndex = 0;
    correctAnswers = 0;
    totalAttempts = 0;
    
    // Switch Screens
    levelScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    bottomBar.classList.remove('hidden');
    if (progressContainer) progressContainer.classList.remove('hidden');
    
    updateProgress();
    loadQuestion();
}

// --- Question Handling ---

function loadQuestion() {
    const q = currentLevel.questions[currentQuestionIndex];
    
    // Reset UI
    questionText.textContent = q.question;
    questionContent.innerHTML = '';
    optionsGrid.innerHTML = '';
    optionsGrid.classList.remove('hidden'); // Show by default
    
    // Reset Bottom Bar
    resetBottomBar();
    updateProgress();
    
    // Stop Camera if running from previous question
    stopCamera();

    if (q.type === 'choice') {
        renderChoiceQuestion(q);
    } else if (q.type === 'camera') {
        renderCameraQuestion(q);
    }
}

function renderChoiceQuestion(q) {
    // If question has an image to identify
    if (q.image) {
        questionContent.innerHTML = `
            <div class="w-full aspect-video bg-slate-800 rounded-xl overflow-hidden mb-4 border-2 border-slate-700">
                <img src="${q.image}" class="w-full h-full object-contain p-4" alt="Question Image">
            </div>
        `;
    }

    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn w-full p-4 rounded-xl text-left font-semibold text-slate-200 bg-slate-800 border-2 border-slate-700 hover:bg-slate-700';
        
        // Content: Image + Text or just Text
        if (opt.image) {
             btn.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full">
                    <img src="${opt.image}" class="w-28 h-28 object-contain" alt="${opt.label}">
                </div>
            `;
            btn.classList.add('h-full'); // For grid consistency
        } else {
            btn.textContent = opt.text || opt.label;
        }

        btn.dataset.id = opt.id;
        btn.onclick = () => selectOption(btn);
        optionsGrid.appendChild(btn);
    });
}

async function renderCameraQuestion(q) {
    optionsGrid.classList.add('hidden'); // Hide standard options
    
    // Create Camera UI
    const wrapper = document.createElement('div');
    wrapper.className = 'camera-frame aspect-video w-full max-w-lg mx-auto bg-black';
    wrapper.innerHTML = `
        <video id="quizVideo" autoplay playsinline class="w-full h-full object-cover transform -scale-x-100"></video>
        <canvas id="quizCanvas" class="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"></canvas>
        <div class="camera-overlay">
            <div class="pulse-dot"></div>
            <span>LIVE</span>
        </div>
        <div id="camHint" class="absolute bottom-4 left-0 right-0 text-center text-white bg-black/50 py-2 mx-4 rounded-lg backdrop-blur-sm">
            ${q.hint || "Tunjukkan gesture ke kamera"}
        </div>
    `;
    questionContent.appendChild(wrapper);
    
    // Initialize Camera Logic
    videoEl = wrapper.querySelector('#quizVideo');
    canvasEl = wrapper.querySelector('#quizCanvas');
    
    // Mock Mode Button
    if (model && model.isMock) {
        const mockBtn = document.createElement('button');
        mockBtn.className = 'absolute top-4 right-4 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-sm font-bold z-20 shadow-lg transition-colors';
        mockBtn.innerHTML = '<i class="fa-solid fa-bolt mr-2"></i>Simulasi Benar';
        mockBtn.onclick = (e) => {
            e.preventDefault();
            lastPredictionCorrect = true;
            const camHint = document.getElementById('camHint');
            if(camHint) {
                camHint.textContent = "Terdeteksi (Simulasi)! Tekan PERIKSA.";
                camHint.className = "absolute bottom-4 left-0 right-0 text-center text-green-400 bg-black/70 py-2 mx-4 rounded-lg font-bold border border-green-500";
            }
            checkBtn.disabled = false;
            // Optional: Auto-check
            // handleCheck(); 
        };
        wrapper.appendChild(mockBtn);
    }

    await startCamera();
    startPredictionLoop(q.targetLabel);
}

// --- Interaction Logic ---

function selectOption(btn) {
    if (!isCheckMode) return; // Prevent changing when showing result
    
    // Remove selected from others
    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    
    btn.classList.add('selected');
    selectedOption = btn.dataset.id;
    checkBtn.disabled = false;
}

async function handleCheck() {
    const q = currentLevel.questions[currentQuestionIndex];
    let isCorrect = false;

    if (q.type === 'choice') {
        isCorrect = (selectedOption === q.answer);
    } else if (q.type === 'camera') {
        // Camera logic is handled in the loop, but user clicks Check to confirm "I did it"
        // OR we can auto-check. For simplicity, let's say the button is "Verify"
        // But better: Use the AI confidence accumulated
        // If current prediction matches target with high confidence
        isCorrect = lastPredictionCorrect;
    }

    totalAttempts++;
    if (isCorrect) {
        correctAnswers++;
        showFeedback(true, "Jawaban kamu tepat!");
        sfxCorrect.play();
    } else {
        showFeedback(false, q.type === 'choice' ? "Jawaban yang benar: " + getCorrectText(q) : "Coba lagi, perhatikan posisi tanganmu.");
        sfxWrong.play();
    }

    updateProgress();
}

function getCorrectText(q) {
    const correctOpt = q.options.find(o => o.id === q.answer);
    return correctOpt.text || correctOpt.label;
}

function handleNext() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentLevel.questions.length) {
        loadQuestion();
    } else {
        showResult();
    }
}

// --- Feedback & Progress ---

function showFeedback(isCorrect, message) {
    isCheckMode = false;
    
    // Hide Check, Show Next
    checkBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    
    feedbackArea.classList.remove('hidden');
    feedbackArea.className = isCorrect ? "flex items-center gap-4 text-green-700" : "flex items-center gap-4 text-red-700";
    
    feedbackTitle.textContent = isCorrect ? "Benar!" : "Salah";
    feedbackMessage.textContent = message;
    
    feedbackIcon.className = `w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`;
    feedbackIcon.innerHTML = isCorrect ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>';
    
    bottomBar.className = `fixed bottom-0 inset-x-0 border-t p-4 z-30 animate-slide-up ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`;

    if (currentLevel.questions[currentQuestionIndex].type === 'choice') {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            const q = currentLevel.questions[currentQuestionIndex];
            if (btn.dataset.id === q.answer) {
                btn.classList.add('correct');
            } else if (btn.dataset.id === selectedOption && !isCorrect) {
                btn.classList.add('wrong');
            }
        });
    }
}

function resetBottomBar() {
    isCheckMode = true;
    selectedOption = null;
    lastPredictionCorrect = false;
    
    checkBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    checkBtn.disabled = true; // Disabled until selection or camera active
    
    feedbackArea.classList.add('hidden');
    bottomBar.className = "fixed bottom-0 inset-x-0 bg-slate-800 border-t border-slate-700 p-4 z-30 animate-slide-up";
}

function updateProgress() {
    if (!progressBar || !currentLevel) return;
    const total = currentLevel.questions.length;
    // Progress bar shows completion towards next question
    const progress = (currentQuestionIndex / total) * 100;
    progressBar.style.width = `${progress}%`;
    
    if (progressText) {
        progressText.textContent = `${currentQuestionIndex + 1} / ${total}`;
    }
}

function showResult() {
    quizContainer.classList.add('hidden');
    bottomBar.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    // Calc stats
    const accuracy = Math.round((correctAnswers / currentLevel.questions.length) * 100);
    resultAccuracy.textContent = accuracy + "%";
    
    sfxWin.play();
}

// --- Camera & AI Logic ---

let lastPredictionCorrect = false;

async function startCamera() {
    if (isCameraRunning) return;
    
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoEl.srcObject = stream;
        
        await new Promise(resolve => {
            videoEl.onloadedmetadata = () => {
                videoEl.play();
                canvasEl.width = videoEl.videoWidth;
                canvasEl.height = videoEl.videoHeight;
                resolve();
            };
        });
        
        isCameraRunning = true;
        
        // Ensure model is loaded
        if (!modelReady) {
            try {
                await loadModel();
                modelReady = true;
            } catch (e) {
                console.error("Model load failed", e);
                alert("Gagal memuat model AI. Pastikan model tersedia.");
            }
        }
        
    } catch (err) {
        console.error("Camera access denied", err);
        alert("Akses kamera diperlukan untuk soal ini.");
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    isCameraRunning = false;
    if (cameraInterval) cancelAnimationFrame(cameraInterval);
}

function startPredictionLoop(targetLabel) {
    if (!isCameraRunning) return;
    
    // Enable check button automatically since we are in camera mode
    // Ideally we wait until user does something, but for UX flow:
    checkBtn.disabled = false;

    async function loop() {
        if (!isCameraRunning) return;
        
        if (modelReady) {
            const tensor = preprocessYolo(videoEl);
            const output = await predictYolo(tensor);
            const results = await postprocessYolo(output, videoEl.videoWidth, videoEl.videoHeight);
            tensor.dispose();
            
            // Draw
            const ctx = canvasEl.getContext('2d');
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            
            // Logic: Check if top prediction matches targetLabel
            let best = null;
            if (results.length > 0) {
                results.sort((a, b) => b.score - a.score);
                best = results[0];
                
                // Draw Box
                const [x, y, w, h] = best.box;
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, w, h);
                
                // Draw Label
                ctx.fillStyle = '#00FF00';
                ctx.font = '20px Arial';
                ctx.fillText(`${best.label} ${(best.score * 100).toFixed(0)}%`, x, y - 5);
            }
            
            // Validation Logic
            const THRESHOLD = 0.5; // 50% confidence
            if (best && best.label.toLowerCase() === targetLabel.toLowerCase() && best.score > THRESHOLD) {
                lastPredictionCorrect = true;
                document.getElementById('camHint').textContent = "Terdeteksi! Tekan PERIKSA.";
                document.getElementById('camHint').className = "absolute bottom-4 left-0 right-0 text-center text-green-400 bg-black/70 py-2 mx-4 rounded-lg font-bold border border-green-500";
            } else {
                lastPredictionCorrect = false;
                 document.getElementById('camHint').textContent = `Target: ${targetLabel}`;
                 document.getElementById('camHint').className = "absolute bottom-4 left-0 right-0 text-center text-white bg-black/50 py-2 mx-4 rounded-lg backdrop-blur-sm";
            }
        }
        
        cameraInterval = requestAnimationFrame(loop);
    }
    
    loop();
}

// Start
init();
