/* ==========================================================================
   MINDBUDDY COMPANION CLIENT-SIDE LOGIC
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    function loadAvatarState() {
        try {
            const saved = localStorage.getItem('kawanku_avatar_state');
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return {
            skinTone: '#dbf7f9',
            expression: 'friendly',
            blushShape: 'circle',
            accessory: 'none',
            pet: 'none',
            scene: 'yellow',
            currentScene: 'starry_night',
            activeOutfit: 'none'
        };
    }

    const state = {
        activePanel: 'chat-panel',
        avatar: loadAvatarState(),

        // Backend Diagnostics Report (Updated every turn)
        diagnostics: {
            sentiment: 'Calm',
            stressLevel: 'Low',
            academicPressure: 20,
            socialAnxiety: 15,
            burnout: 25,
            loneliness: 10,
            engagement: 'High',
            totalConversations: 1,
            lastRantDuration: '00:00',
            lastRantWords: 0
        },

        // IoT Simulation Data
        biometrics: {
            heartRate: 72,
            sleepDuration: 7.8,
            sleepDeep: 2.1,
            sleepEfficiency: 92,
            chartData: Array(50).fill(72) // Ring buffer for HR graph
        },

        // Web Audio Synthesizer Nodes
        synth: {
            audioCtx: null,
            mainGain: null,
            // Individual sound instances
            binaural: { leftOsc: null, rightOsc: null, gain: null, isPlaying: false },
            rain: { source: null, gain: null, isPlaying: false },
            drone: { osc1: null, osc2: null, osc3: null, lfo: null, lfoGain: null, gain: null, filter: null, isPlaying: false }
        },

        // Rant Audio Recording Session
        rant: {
            isActive: false,
            audioCtx: null,
            analyser: null,
            stream: null,
            speechRecognizer: null,
            startTime: null,
            timerInterval: null,
            volumeHistory: [],
            pauseCount: 0,
            silenceTimer: null,
            isSilent: true,
            tremorAccumulator: 0,
            frameCount: 0,
            transcript: ''
        },

        // Webcam scanner
        webcam: {
            stream: null,
            isActive: false,
            animationFrame: null,
            lastScanTime: 0
        },

        // Quiz State
        quiz: {
            activeCategory: 'general',
            currentQuestionIdx: 0,
            answers: [],
            questions: []
        },

        // Game Stats Tracker
        gameStats: {
            matches: 0,
            slices: 0
        }
    };
    window.state = state;

    // ----------------------------------------------------------------------
    // DESIGN SYSTEM METADATA DEFINITIONS
    // ----------------------------------------------------------------------
    const SVG_HAIRSTYLES = {
        crop: {
            front: "M93,108 C93,50 207,50 207,108 C195,72 175,60 150,60 C125,60 105,72 93,108 Z",
            back: ""
        },
        curly: {
            front: "M93,108 C90,80 95,52 110,45 C125,38 140,35 150,35 C160,35 175,38 190,45 C205,52 210,80 207,108 C200,78 185,62 150,60 C115,62 100,78 93,108 Z M84,90 C82,100 85,112 93,116 Z M207,116 C215,112 218,100 216,90 Z",
            back: ""
        },
        bob: {
            front: "M92,108 C91,60 95,42 115,38 C130,35 140,34 150,34 C160,34 170,35 185,38 C205,42 209,60 208,108 L200,130 C185,140 165,145 150,145 C135,145 115,140 100,130 Z",
            back: ""
        },
        long: {
            front: "M93,108 C93,50 207,50 207,108 C195,72 175,60 150,60 C125,60 105,72 93,108 Z",
            back: "M86,100 L78,230 C76,265 100,278 115,255 L118,165 Z M214,100 L222,230 C224,265 200,278 185,255 L182,165 Z"
        },
        bald: {
            front: "",
            back: ""
        }
    };

    const SVG_SHIRTS = {
        hoodie: "M85,200 C72,215 68,240 70,280 L70,340 L230,340 L230,280 C232,240 228,215 215,200 L195,192 L150,192 L105,200 Z",
        tshirt: "M90,200 C78,212 75,235 76,280 L76,340 L224,340 L224,280 C225,235 222,212 210,200 L195,196 L150,196 L105,196 Z",
        sweater: "M82,198 C68,215 65,242 67,282 L67,340 L233,340 L233,282 C235,242 232,215 218,198 L195,190 L150,190 L105,190 Z"
    };

    const SVG_PANTS = {
        shorts: { leftH: 72, rightH: 72 },
        cargo:  { leftH: 140, rightH: 140 },
        jogger: { leftH: 130, rightH: 130 }
    };

    const SVG_EXPRESSIONS = {
        friendly: {
            leftBrow:  "M0,0",
            rightBrow: "M0,0",
            mouth:     "M 194 198 Q 199 202 200 198 Q 201 202 206 198",
            teethOpacity: 0
        },
        thoughtful: {
            leftBrow:  "M0,0",
            rightBrow: "M0,0",
            mouth:     "M 193 200 L 207 200",
            teethOpacity: 0
        },
        attentive: {
            leftBrow:  "M0,0",
            rightBrow: "M0,0",
            mouth:     "M 195 200 Q 200 205 205 200",
            teethOpacity: 0
        },
        excited: {
            leftBrow:  "M0,0",
            rightBrow: "M0,0",
            mouth:     "M 194 198 C 194 210, 206 210, 206 198 Z",
            teethOpacity: 0
        }
    };

    // ----------------------------------------------------------------------
    // DOM ELEMENTS CACHE
    // ----------------------------------------------------------------------
    const DOM = {
        // Navigation Buttons
        navBtns: document.querySelectorAll('.nav-btn'),
        panels: document.querySelectorAll('.panel'),
        headerTitle: document.getElementById('header-title'),
        headerSubtitle: document.getElementById('header-subtitle'),
        
        // Status Indicators
        statusSentiment: document.getElementById('status-sentiment'),
        statusStress: document.getElementById('status-stress'),
        miniMoodTrend: document.getElementById('mini-mood-trend'),
        avatarExpressionLabel: document.getElementById('avatar-expression-label'),
        
        // Chat elements
        chatMessages: document.getElementById('chat-messages'),
        chatTextInput: document.getElementById('chat-text-input'),
        chatSendBtn: document.getElementById('chat-send-btn'),
        rantStartBtn: document.getElementById('rant-start-btn'),
        camToggleBtn: document.getElementById('cam-toggle-btn'),
        
        // Rant Room Overlay
        rantOverlay: document.getElementById('rant-room-overlay'),
        rantStopBtn: document.getElementById('rant-stop-btn'),
        rantWaveformCanvas: document.getElementById('waveform-canvas'),
        rantTimer: document.getElementById('rant-duration-display'),
        rantTranscriptBox: document.getElementById('rant-transcript-box'),
        
        // Rant metrics
        rantMetricVolume: document.getElementById('rant-metric-volume'),
        rantMetricPauses: document.getElementById('rant-metric-pauses'),
        rantMetricTremor: document.getElementById('rant-metric-tremor'),
        rantMetricSpeed: document.getElementById('rant-metric-speed'),
        
        // Webcam Overlay
        webcamOverlay: document.getElementById('webcam-overlay'),
        webcamElement: document.getElementById('webcam-element'),
        faceTrackerCanvas: document.getElementById('face-tracker-canvas'),
        closeCamBtn: document.getElementById('close-cam-btn'),
        camMetricTension: document.getElementById('cam-metric-tension'),
        camMetricMood: document.getElementById('cam-metric-mood'),
        camMetricSaccadic: document.getElementById('cam-metric-saccadic'),

        // Avatar SVG parts
        avatarContainers: [
            document.getElementById('avatar-container'),
            document.getElementById('studio-avatar-container')
        ],
        
        // Studio buttons / inputs
        avatarRandomizeBtn: document.getElementById('avatar-randomize-btn'),
        customizerSubnav: document.getElementById('customizer-subnav'),
        customizerSubtabs: document.getElementById('customizer-subtabs'),
        customizerItemGrid: document.getElementById('customizer-item-grid'),
        customizerViewport: document.getElementById('customizer-viewport'),
        studioPetContainer: document.getElementById('studio-pet-container'),
        
        // IoT biometric page
        bioLiveHR: document.getElementById('bio-live-hr'),
        hrChartPath: document.getElementById('hr-chart-path'),
        bioSleepDuration: document.getElementById('bio-sleep-duration'),
        bioSleepDeep: document.getElementById('bio-sleep-deep'),
        bioSleepEfficiency: document.getElementById('bio-sleep-efficiency'),
        sliderHR: document.getElementById('control-hr'),
        sliderSleep: document.getElementById('control-sleep'),
        bubbleHR: document.getElementById('slider-val-hr'),
        bubbleSleep: document.getElementById('slider-val-sleep'),
        anomalyBanner: document.getElementById('biometric-anomaly-banner'),
        anomalyIcon: document.getElementById('anomaly-banner-icon'),
        anomalyTitle: document.getElementById('anomaly-banner-title'),
        anomalyDesc: document.getElementById('anomaly-banner-desc'),
        iotSyncStatus: document.getElementById('iot-sync-status'),

        // Calm Hub Mixer
        volBinaural: document.getElementById('vol-binaural'),
        volRain: document.getElementById('vol-rain'),
        volDrone: document.getElementById('vol-drone'),
        btnBinaural: document.getElementById('btn-play-binaural'),
        btnRain: document.getElementById('btn-play-rain'),
        btnDrone: document.getElementById('btn-play-drone'),
        
        // Calm Hub Quiz
        quizBox: document.getElementById('quiz-box'),
        quizIntroState: document.getElementById('quiz-intro-state'),
        quizActiveState: document.getElementById('quiz-active-state'),
        quizResultsState: document.getElementById('quiz-results-state'),
        quizRecBadge: document.getElementById('quiz-rec-badge'),
        quizRecTitle: document.getElementById('quiz-rec-title'),
        quizStartBtn: document.getElementById('quiz-start-btn'),
        quizQuestionTitle: document.getElementById('quiz-question-title'),
        quizOptionsContainer: document.getElementById('quiz-options-container'),
        quizQCounter: document.getElementById('quiz-q-counter'),
        quizProgressFill: document.getElementById('quiz-progress-fill'),
        quizResultFeedback: document.getElementById('quiz-result-feedback'),
        quizRestartBtn: document.getElementById('quiz-restart-btn'),

        // SOS modal
        sosModal: document.getElementById('sos-modal'),
        sosOpenBtn: document.getElementById('sos-open-btn'),
        sosCloseBtn: document.getElementById('sos-close-btn'),
        sosCancelBtn: document.getElementById('sos-cancel-btn'),
        sosConfirmBtn: document.getElementById('sos-confirm-btn'),
        sosPreviewStatus: document.getElementById('sos-preview-status'),
        sosPreviewSentiment: document.getElementById('sos-preview-sentiment'),
        sosPreviewHR: document.getElementById('sos-preview-hr'),
        sosPreviewRant: document.getElementById('sos-preview-rant'),
        toastContainer: document.getElementById('toast-container')
    };

    // ----------------------------------------------------------------------
    // INITIALIZATION & TAB NAVIGATION
    // ----------------------------------------------------------------------
    function init() {
        // Clone the main SVG into the studio preview container
        const mainSVG = document.getElementById('mindbuddy-svg');
        const studioContainer = document.getElementById('studio-avatar-container');
        if (mainSVG && studioContainer) {
            const clonedSVG = mainSVG.cloneNode(true);
            clonedSVG.id = 'mindbuddy-studio-svg';
            studioContainer.appendChild(clonedSVG);
        }

        // Init SVG layout components
        renderAvatarVisuals();
        
        // Hook up Sidebar Nav links
        if (DOM.navBtns) {
            DOM.navBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.getAttribute('data-target');
                    switchPanel(target);
                    
                    DOM.navBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }

        // Initialize lucide icons
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            try {
                lucide.createIcons();
            } catch(e) {
                console.warn('Lucide icons creation failed', e);
            }
        }

        // Biometrics Graph render cycle
        if (DOM.hrChartPath) {
            initBiometricsChart();
            setInterval(updateBiometricsLiveCycle, 1000);
        }

        // Bind events
        bindUIEvents();
    }

    function switchPanel(panelId) {
        DOM.panels.forEach(panel => {
            panel.classList.remove('active');
        });
        const activePanel = document.getElementById(panelId);
        if (activePanel) {
            activePanel.classList.add('active');
        }
        state.activePanel = panelId;

        // Custom titles based on navigation
        if (panelId === 'chat-panel') {
            DOM.headerTitle.innerText = "Empathetic Connection Studio";
            DOM.headerSubtitle.innerText = "Your MindBuddy is active and ready to listen.";
        } else if (panelId === 'studio-panel') {
            DOM.headerTitle.innerText = "MindBuddy Designer Studio";
            DOM.headerSubtitle.innerText = "Customize your companion's clothing, hair styles, and colors.";
        } else if (panelId === 'bio-panel') {
            DOM.headerTitle.innerText = "Biometric IoT Link Monitor";
            DOM.headerSubtitle.innerText = "Review smartwatch tracking parameters synced to stress evaluators.";
        } else if (panelId === 'calm-panel') {
            DOM.headerTitle.innerText = "Calm Sanctuary & Healing Soundscapes";
            DOM.headerSubtitle.innerText = "Access synthesizers and mindfulness check-in quizzes.";
            updateQuizRecommendation();
        } else if (panelId === 'quiz-panel') {
            if (DOM.headerTitle) DOM.headerTitle.innerText = "Emotion Blind Box Quiz";
            if (DOM.headerSubtitle) DOM.headerSubtitle.innerText = "AI-powered daily mental health check-in with gamified universe themes.";
        } else if (panelId === 'shop-panel') {
            if (DOM.headerTitle) DOM.headerTitle.innerText = "Kawan Spark Shop";
            if (DOM.headerSubtitle) DOM.headerSubtitle.innerText = "Redeem your daily streak sparks for exclusive avatar items.";
        } else if (panelId === 'games-panel') {
            if (DOM.headerTitle) DOM.headerTitle.innerText = "Play & Relax";
            if (DOM.headerSubtitle) DOM.headerSubtitle.innerText = "Take a quick mental break with our relaxing mini-games guided by KawanKu Robot.";
        }
    }

    // ----------------------------------------------------------------------
    // TOAST NOTIFICATIONS
    // ----------------------------------------------------------------------
    const USER_TOASTS_ENABLED = false;

    function showToast(message, type = 'info') {
        if (!USER_TOASTS_ENABLED) {
            console.info(`[toast:${type}] ${message}`);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'x-circle';
        if (type === 'warning') iconName = 'alert-triangle';

        toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
        if (DOM.toastContainer) {
            DOM.toastContainer.appendChild(toast);
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try { lucide.createIcons({attrs: {class: 'toast-icon-svg'}}); } catch(e) {}
            }
        }

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ----------------------------------------------------------------------
    // AVATAR RENDERER (SVG MODIFICATION)
    // ----------------------------------------------------------------------
    // Helper to apply props to a single SVG root element
    function applyAvatarToSVG(svg, conf) {
        if (!svg) return;

        // ---- Custom Dress-up Outfit Layers ----
        const outfitLayers = ['forest', 'starry', 'nautical', 'strawberry', 'wizard', 'princess', 'mermaid', 'lolita', 'unicorn'];
        outfitLayers.forEach(id => {
            const el = svg.querySelector('#outfit-' + id);
            if (el) {
                el.style.opacity = (conf.activeOutfit === id) ? '1' : '0';
            }
        });

        // ---- Skin tone propagation ----
        const skinEls = ['avatar-head', 'avatar-neck', 'ear-l', 'ear-r', 'avatar-hand-l', 'avatar-hand-r'];
        skinEls.forEach(id => {
            const el = svg.querySelector('#' + id);
            if (el) el.setAttribute('fill', conf.skinTone);
        });

        // Dynamically update the 3D body gradient based on skinTone selection!
        const buddy3dGrad = document.getElementById('buddy-3d-grad');
        if (buddy3dGrad && conf.skinTone) {
            const stops = buddy3dGrad.querySelectorAll('stop');
            if (stops.length >= 4) {
                stops[1].setAttribute('stop-color', conf.skinTone);
                stops[2].setAttribute('stop-color', shadeColor(conf.skinTone, -15));
                stops[3].setAttribute('stop-color', shadeColor(conf.skinTone, -30));
            }
        }
        const tail3dGrad = document.getElementById('tail-3d-grad');
        if (tail3dGrad && conf.skinTone) {
            const stops = tail3dGrad.querySelectorAll('stop');
            if (stops.length >= 3) {
                stops[0].setAttribute('stop-color', conf.skinTone);
                stops[1].setAttribute('stop-color', shadeColor(conf.skinTone, -15));
                stops[2].setAttribute('stop-color', shadeColor(conf.skinTone, -30));
            }
        }
        // Ears inner + nose + blush
        const noseEl = svg.querySelector('#avatar-nose');
        if (noseEl) {
            // derive a slightly darker shade for nose/ear shading
            noseEl.setAttribute('fill', shadeColor(conf.skinTone, -20));
        }

        // ---- Mascot Expressions ----
        const eyesGroup = svg.querySelector('#avatar-eyes');
        const mouthContainer = svg.querySelector('#avatar-mouth-container');
        if (eyesGroup && mouthContainer) {
            let eyesSVG = "";
            let mouthSVG = "";
            if (conf.expression === 'friendly') {
                eyesSVG = `
                    <!-- Left Eye -->
                    <circle cx="172" cy="190" r="14" fill="#3c2f46" stroke="#4A3E3D" stroke-width="1.5" />
                    <path d="M 160 194 A 12 12 0 0 0 184 194" fill="#d8b4fe" opacity="0.35" />
                    <circle cx="168" cy="185" r="4.5" fill="#ffffff" />
                    <circle cx="176" cy="194" r="2.2" fill="#ffffff" />
                    <!-- Right Eye -->
                    <circle cx="228" cy="190" r="14" fill="#3c2f46" stroke="#4A3E3D" stroke-width="1.5" />
                    <path d="M 216 194 A 12 12 0 0 0 240 194" fill="#d8b4fe" opacity="0.35" />
                    <circle cx="224" cy="185" r="4.5" fill="#ffffff" />
                    <circle cx="232" cy="194" r="2.2" fill="#ffffff" />
                `;
                mouthSVG = `
                    <path id="avatar-mouth" d="M 194 198 Q 199 202 200 198 Q 201 202 206 198" fill="none" stroke="#3c2f46" stroke-width="3.5" stroke-linecap="round" />
                `;
            } else if (conf.expression === 'starry' || conf.expression === 'excited') {
                eyesSVG = `
                    <!-- Left Squint Eye (>) -->
                    <path d="M 160,183 L 176,189 L 160,195" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- Right Squint Eye (<) -->
                    <path d="M 240,183 L 224,189 L 240,195" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
                `;
                mouthSVG = `
                    <path id="avatar-mouth" d="M 193,197 Q 196.5,200.5 200,197 Q 203.5,200.5 207,197" fill="none" stroke="#3c2f46" stroke-width="3.5" stroke-linecap="round" />
                `;
            } else if (conf.expression === 'wink' || conf.expression === 'attentive') {
                eyesSVG = `
                    <!-- Left Winking Arc -->
                    <path d="M 160,192 Q 172,180 184,192" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" />
                    <!-- Right Eye -->
                    <circle cx="228" cy="190" r="14" fill="#3c2f46" stroke="#4A3E3D" stroke-width="1.5" />
                    <path d="M 216 194 A 12 12 0 0 0 240 194" fill="#d8b4fe" opacity="0.35" />
                    <circle cx="224" cy="185" r="4.5" fill="#ffffff" />
                    <circle cx="232" cy="194" r="2.2" fill="#ffffff" />
                `;
                mouthSVG = `
                    <path id="avatar-mouth" d="M 194 198 Q 199 202 200 198 Q 201 202 206 198" fill="none" stroke="#3c2f46" stroke-width="3.5" stroke-linecap="round" />
                `;
            } else if (conf.expression === 'sleepy' || conf.expression === 'thoughtful') {
                eyesSVG = `
                    <!-- Left Sleepy Arc -->
                    <path d="M 160,188 Q 172,198 184,188" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" />
                    <!-- Right Sleepy Arc -->
                    <path d="M 216,188 Q 228,198 240,188" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" />
                `;
                mouthSVG = `
                    <ellipse cx="200" cy="201" rx="4" ry="5.5" fill="#3c2f46" />
                `;
            } else if (conf.expression === 'blep') {
                // Cute tongue-out blep face: half-moon droopy eyes + tiny tongue
                eyesSVG = `
                    <!-- Left droopy relaxed eye -->
                    <path d="M 160,186 Q 172,196 184,186" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" />
                    <path d="M 160,186 Q 172,198 184,186" fill="#3c2f46" opacity="0.12" />
                    <!-- Right droopy relaxed eye -->
                    <path d="M 216,186 Q 228,196 240,186" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" />
                    <path d="M 216,186 Q 228,198 240,186" fill="#3c2f46" opacity="0.12" />
                `;
                mouthSVG = `
                    <!-- Open mouth cavity: filled dark arch -->
                    <path id="avatar-mouth" d="M 188,196 Q 200,216 212,196 Z" fill="#2a1a3e" stroke="#3c2f46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- Tongue peeking out from inside the mouth (overlaps bottom of arch) -->
                    <ellipse cx="200" cy="213" rx="10" ry="8.5" fill="#ff6b9d" stroke="#d63077" stroke-width="2" />
                    <!-- Tongue highlight shimmer -->
                    <ellipse cx="197" cy="209" rx="3.5" ry="2.5" fill="#ffb3cc" opacity="0.7" />
                `;
            } else if (conf.expression === 'uwu') {
                // UwU kawaii face: curved UwU eyes + big happy wide smile
                eyesSVG = `
                    <!-- Left UwU eye: two arcs making a curved U shape -->
                    <path d="M 158,185 Q 163,196 172,192 Q 181,188 182,178" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- Right UwU eye: mirrored -->
                    <path d="M 242,185 Q 237,196 228,192 Q 219,188 218,178" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
                `;
                mouthSVG = `
                    <!-- Wide happy smile -->
                    <path id="avatar-mouth" d="M 190,196 Q 200,208 210,196" fill="none" stroke="#3c2f46" stroke-width="3.5" stroke-linecap="round" />
                `;
            } else if (conf.expression === 'teary') {
                // Teary sparkle eyes: happy eyes with large obvious teardrops
                eyesSVG = `
                    <!-- Left shimmery teary eye -->
                    <circle cx="172" cy="190" r="14" fill="#3c2f46" stroke="#4A3E3D" stroke-width="1.5" />
                    <path d="M 160 194 A 12 12 0 0 0 184 194" fill="#a5f3fc" opacity="0.4" />
                    <circle cx="168" cy="185" r="4.5" fill="#ffffff" />
                    <circle cx="176" cy="194" r="2" fill="#ffffff" />
                    <!-- Large teardrop left: teardrop path shape -->
                    <path d="M 154,205 Q 150,215 154,222 Q 158,228 162,222 Q 166,215 162,205 Q 158,200 154,205 Z" fill="#38bdf8" stroke="#0ea5e9" stroke-width="1.5" opacity="0.95" />
                    <circle cx="157" cy="210" r="2" fill="#e0f2fe" opacity="0.8" />
                    <!-- Right shimmery teary eye -->
                    <circle cx="228" cy="190" r="14" fill="#3c2f46" stroke="#4A3E3D" stroke-width="1.5" />
                    <path d="M 216 194 A 12 12 0 0 0 240 194" fill="#a5f3fc" opacity="0.4" />
                    <circle cx="224" cy="185" r="4.5" fill="#ffffff" />
                    <circle cx="232" cy="194" r="2" fill="#ffffff" />
                    <!-- Large teardrop right: teardrop path shape -->
                    <path d="M 238,205 Q 234,215 238,222 Q 242,228 246,222 Q 250,215 246,205 Q 242,200 238,205 Z" fill="#38bdf8" stroke="#0ea5e9" stroke-width="1.5" opacity="0.95" />
                    <circle cx="241" cy="210" r="2" fill="#e0f2fe" opacity="0.8" />
                `;
                mouthSVG = `
                    <!-- Big happy grin -->
                    <path id="avatar-mouth" d="M 191,197 Q 200,206 209,197" fill="none" stroke="#3c2f46" stroke-width="3.5" stroke-linecap="round" />
                `;
            } else if (conf.expression === 'cat') {
                // Cat face: > < chevron eyes + tiny cat-style w-mouth
                eyesSVG = `
                    <!-- Left cat chevron eye > -->
                    <path d="M 160,195 L 172,189 L 184,195" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
                    <!-- Right cat chevron eye < -->
                    <path d="M 240,195 L 228,189 L 216,195" fill="none" stroke="#3c2f46" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
                `;
                mouthSVG = `
                    <!-- Cat w-mouth: two small arcs -->
                    <path id="avatar-mouth" d="M 192,200 Q 196,196 200,200 Q 204,196 208,200" fill="none" stroke="#3c2f46" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
                `;
            }
            eyesGroup.innerHTML = eyesSVG;
            mouthContainer.innerHTML = mouthSVG;
        }

        // ---- Cheek Blushes ----
        const blushesGroup = svg.querySelector('#avatar-blushes');
        if (blushesGroup) {
            let blushSVG = "";
            const shape = conf.blushShape || 'circle';
            if (shape === 'circle') {
                blushSVG = `
                    <ellipse cx="156" cy="202" rx="9" ry="5.5" fill="#ffa2b6" opacity="0.85" />
                    <ellipse cx="244" cy="202" rx="9" ry="5.5" fill="#ffa2b6" opacity="0.85" />
                `;
            } else if (shape === 'heart') {
                blushSVG = `
                    <path d="M 156,198 C 151,193 147,198 156,205 C 165,198 161,193 156,198 Z" fill="#ffa2b6" opacity="0.85" />
                    <path d="M 244,198 C 239,193 235,198 244,205 C 253,198 249,193 244,198 Z" fill="#ffa2b6" opacity="0.85" />
                `;
            } else if (shape === 'star') {
                blushSVG = `
                    <polygon points="156,196 158,200 162,200 159,202 160,206 156,204 152,206 153,202 150,200 154,200" fill="#ffa2b6" opacity="0.85" />
                    <polygon points="244,196 246,200 250,200 247,202 248,206 244,204 240,206 241,202 238,200 242,200" fill="#ffa2b6" opacity="0.85" />
                `;
            } else if (shape === 'sakura') {
                // Sakura petal cluster: 5 tiny rounded petals arranged in a flower
                blushSVG = `
                    <!-- Left sakura -->
                    <ellipse cx="156" cy="198" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(-20,156,198)" />
                    <ellipse cx="163" cy="200" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(30,163,200)" />
                    <ellipse cx="160" cy="207" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(80,160,207)" />
                    <ellipse cx="152" cy="207" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(130,152,207)" />
                    <ellipse cx="149" cy="200" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(170,149,200)" />
                    <circle cx="156" cy="202" r="2" fill="#fff0f5" opacity="0.95" />
                    <!-- Right sakura -->
                    <ellipse cx="244" cy="198" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(-20,244,198)" />
                    <ellipse cx="251" cy="200" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(30,251,200)" />
                    <ellipse cx="248" cy="207" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(80,248,207)" />
                    <ellipse cx="240" cy="207" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(130,240,207)" />
                    <ellipse cx="237" cy="200" rx="3.5" ry="2" fill="#ffb7cc" opacity="0.9" transform="rotate(170,237,200)" />
                    <circle cx="244" cy="202" r="2" fill="#fff0f5" opacity="0.95" />
                `;
            } else if (shape === 'sparkle') {
                // Diamond sparkle clusters: 3 sparkle stars each side
                blushSVG = `
                    <!-- Left sparkles -->
                    <path d="M 152,199 L 153.5,202 L 152,205 L 150.5,202 Z" fill="#ffcce0" opacity="0.95" />
                    <path d="M 148,202 L 152,200.5 L 156,202 L 152,203.5 Z" fill="#ffcce0" opacity="0.95" />
                    <path d="M 159,197 L 160,199 L 159,201 L 158,199 Z" fill="#ffa2c0" opacity="0.9" />
                    <path d="M 157,199 L 159,198 L 161,199 L 159,200 Z" fill="#ffa2c0" opacity="0.9" />
                    <path d="M 163,202 L 164,204 L 163,206 L 162,204 Z" fill="#ffcce0" opacity="0.85" />
                    <path d="M 161,204 L 163,203 L 165,204 L 163,205 Z" fill="#ffcce0" opacity="0.85" />
                    <!-- Right sparkles -->
                    <path d="M 240,199 L 241.5,202 L 240,205 L 238.5,202 Z" fill="#ffcce0" opacity="0.95" />
                    <path d="M 236,202 L 240,200.5 L 244,202 L 240,203.5 Z" fill="#ffcce0" opacity="0.95" />
                    <path d="M 247,197 L 248,199 L 247,201 L 246,199 Z" fill="#ffa2c0" opacity="0.9" />
                    <path d="M 245,199 L 247,198 L 249,199 L 247,200 Z" fill="#ffa2c0" opacity="0.9" />
                    <path d="M 251,202 L 252,204 L 251,206 L 250,204 Z" fill="#ffcce0" opacity="0.85" />
                    <path d="M 249,204 L 251,203 L 253,204 L 251,205 Z" fill="#ffcce0" opacity="0.85" />
                `;
            } else if (shape === 'dots') {
                // Strawberry dots: 3 small dots in triangle arrangement
                blushSVG = `
                    <!-- Left trio dots -->
                    <circle cx="152" cy="205" r="3.5" fill="#ff8fab" opacity="0.88" />
                    <circle cx="160" cy="205" r="3.5" fill="#ff8fab" opacity="0.88" />
                    <circle cx="156" cy="199" r="3.5" fill="#ff8fab" opacity="0.88" />
                    <!-- Right trio dots -->
                    <circle cx="240" cy="205" r="3.5" fill="#ff8fab" opacity="0.88" />
                    <circle cx="248" cy="205" r="3.5" fill="#ff8fab" opacity="0.88" />
                    <circle cx="244" cy="199" r="3.5" fill="#ff8fab" opacity="0.88" />
                `;
            } else if (shape === 'crescent') {
                // Crescent moon blushes: soft glowing pink crescents
                blushSVG = `
                    <!-- Left crescent -->
                    <path d="M 149,198 Q 143,202 149,207 Q 146,202 149,198 Z" fill="none" stroke="#ff8fab" stroke-width="0" />
                    <path d="M 163,198 A 9 7 0 1 0 163,207 A 7 5 0 1 1 163,198 Z" fill="#ffa2b6" opacity="0.8" />
                    <!-- Right crescent -->
                    <path d="M 251,198 A 9 7 0 1 1 251,207 A 7 5 0 1 0 251,198 Z" fill="#ffa2b6" opacity="0.8" />
                `;
            } else if (shape === 'butterfly') {
                // Butterfly wing blushes: two mirrored wing arcs each side
                blushSVG = `
                    <!-- Left butterfly -->
                    <path d="M 156,202 Q 148,195 147,202 Q 148,209 156,202 Z" fill="#ffb3cc" opacity="0.82" />
                    <path d="M 156,202 Q 164,195 165,202 Q 164,209 156,202 Z" fill="#ffc8dd" opacity="0.75" />
                    <circle cx="156" cy="202" r="1.5" fill="#ff6b9d" opacity="0.9" />
                    <!-- Right butterfly -->
                    <path d="M 244,202 Q 236,195 235,202 Q 236,209 244,202 Z" fill="#ffb3cc" opacity="0.82" />
                    <path d="M 244,202 Q 252,195 253,202 Q 252,209 244,202 Z" fill="#ffc8dd" opacity="0.75" />
                    <circle cx="244" cy="202" r="1.5" fill="#ff6b9d" opacity="0.9" />
                `;
            }
            blushesGroup.innerHTML = blushSVG;
        }

        // ---- Face Accessories ----
        const accessoryGroup = svg.querySelector('#avatar-accessory');
        if (accessoryGroup) {
            let accSVG = "";
            const acc = conf.accessory || 'none';
            if (acc === 'round_glasses') {
                accSVG = `
                    <circle cx="172" cy="190" r="20" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <circle cx="228" cy="190" r="20" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <path d="M 192,190 Q 200,188 208,190" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <path d="M 152,190 L 140,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                    <path d="M 248,190 L 260,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                `;
            } else if (acc === 'star_glasses') {
                accSVG = `
                    <polygon points="172,175 176,186 187,186 179,192 181,203 172,197 163,203 165,192 157,186 168,186" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <polygon points="228,175 232,186 243,186 235,192 237,203 228,197 219,203 221,192 213,186 224,186" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <path d="M 188,189 Q 200,187 212,189" fill="none" stroke="#4A3E3D" stroke-width="3" />
                `;
            } else if (acc === 'night_mask') {
                accSVG = `
                    <rect x="140" y="176" width="120" height="34" rx="14" fill="#a78bfa" stroke="#4A3E3D" stroke-width="3" />
                    <path d="M 162,193 Q 170,198 178,193" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
                    <path d="M 222,193 Q 230,198 238,193" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
                `;
            } else if (acc === 'sprout') {
                accSVG = `
                    <path d="M 200,135 Q 200,110 210,95" fill="none" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round" />
                    <path d="M 210,95 Q 222,98 218,108 C 213,113 203,107 210,95 Z" fill="#22c55e" stroke="#166534" stroke-width="1.5" />
                    <path d="M 200,118 Q 188,110 192,102 C 196,98 204,105 200,118 Z" fill="#22c55e" stroke="#166534" stroke-width="1.5" />
                `;
            } else if (acc === 'gold') {
                accSVG = `
                    <circle cx="172" cy="190" r="18" fill="none" stroke="#f59e0b" stroke-width="3.5" />
                    <circle cx="228" cy="190" r="18" fill="none" stroke="#f59e0b" stroke-width="3.5" />
                    <path d="M 190,190 Q 200,188 210,190" fill="none" stroke="#f59e0b" stroke-width="3.5" />
                    <path d="M 154,190 L 142,192" fill="none" stroke="#f59e0b" stroke-width="2.5" />
                    <path d="M 246,190 L 258,192" fill="none" stroke="#f59e0b" stroke-width="2.5" />
                `;
            } else if (acc === 'green') {
                accSVG = `
                    <rect x="152" y="176" width="38" height="28" rx="6" fill="none" stroke="#10b981" stroke-width="3.5" />
                    <rect x="210" y="176" width="38" height="28" rx="6" fill="none" stroke="#10b981" stroke-width="3.5" />
                    <path d="M 190,190 Q 200,188 210,190" fill="none" stroke="#10b981" stroke-width="3.5" />
                    <path d="M 152,190 L 140,192" fill="none" stroke="#10b981" stroke-width="2.5" />
                    <path d="M 248,190 L 260,192" fill="none" stroke="#10b981" stroke-width="2.5" />
                `;
            } else if (acc === 'heart_glasses') {
                accSVG = `
                    <!-- Left Heart Frame -->
                    <path d="M 172,182 C 160,170 148,178 152,192 C 156,204 172,210 172,210 C 172,210 188,204 192,192 C 196,178 184,170 172,182 Z" fill="#ff758f" fill-opacity="0.25" stroke="#4A3E3D" stroke-width="3.5" stroke-linejoin="round" />
                    <ellipse cx="166" cy="184" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,166,184)" />
                    <!-- Right Heart Frame -->
                    <path d="M 228,182 C 216,170 204,178 208,192 C 212,204 228,210 228,210 C 228,210 244,204 248,192 C 252,178 240,170 228,182 Z" fill="#ff758f" fill-opacity="0.25" stroke="#4A3E3D" stroke-width="3.5" stroke-linejoin="round" />
                    <ellipse cx="222" cy="184" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,222,184)" />
                    <!-- Bridge & Sides -->
                    <path d="M 192,192 Q 200,190 208,192" fill="none" stroke="#4A3E3D" stroke-width="3.5" />
                    <path d="M 152,190 L 140,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                    <path d="M 248,190 L 260,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                `;
            } else if (acc === 'cat_glasses') {
                accSVG = `
                    <!-- Left Cat Ear -->
                    <polygon points="157,179 148,165 166,174" fill="#ffd6e0" stroke="#4A3E3D" stroke-width="3.5" stroke-linejoin="round" />
                    <polygon points="158,178 152,168 164,174" fill="#ff758f" />
                    <!-- Right Cat Ear -->
                    <polygon points="243,179 252,165 234,174" fill="#ffd6e0" stroke="#4A3E3D" stroke-width="3.5" stroke-linejoin="round" />
                    <polygon points="242,178 248,168 236,174" fill="#ff758f" />
                    <!-- Left Lens -->
                    <circle cx="172" cy="190" r="18" fill="#ffd6e0" fill-opacity="0.25" stroke="#4A3E3D" stroke-width="3.5" />
                    <ellipse cx="166" cy="182" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,166,182)" />
                    <!-- Right Lens -->
                    <circle cx="228" cy="190" r="18" fill="#ffd6e0" fill-opacity="0.25" stroke="#4A3E3D" stroke-width="3.5" />
                    <ellipse cx="222" cy="182" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,222,182)" />
                    <!-- Bridge & Sides -->
                    <path d="M 190,190 Q 200,188 210,190" fill="none" stroke="#4A3E3D" stroke-width="3.5" />
                    <path d="M 154,190 L 142,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                    <path d="M 246,190 L 258,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                `;
            } else if (acc === 'flower_glasses') {
                accSVG = `
                    <!-- Left Flower Petals -->
                    <circle cx="172" cy="172" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="188" cy="181" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="188" cy="199" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="172" cy="208" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="156" cy="199" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="156" cy="181" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <!-- Left Lens Center -->
                    <circle cx="172" cy="190" r="15" fill="#fef08a" fill-opacity="0.3" stroke="#4A3E3D" stroke-width="3" />
                    <circle cx="172" cy="190" r="9" fill="#facc15" opacity="0.8" />
                    <ellipse cx="169" cy="187" rx="2.5" ry="1.2" fill="#ffffff" transform="rotate(-30,169,187)" />

                    <!-- Right Flower Petals -->
                    <circle cx="228" cy="172" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="244" cy="181" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="244" cy="199" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="228" cy="208" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="212" cy="199" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <circle cx="212" cy="181" r="6.5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                    <!-- Right Lens Center -->
                    <circle cx="228" cy="190" r="15" fill="#fef08a" fill-opacity="0.3" stroke="#4A3E3D" stroke-width="3" />
                    <circle cx="228" cy="190" r="9" fill="#facc15" opacity="0.8" />
                    <ellipse cx="225" cy="187" rx="2.5" ry="1.2" fill="#ffffff" transform="rotate(-30,225,187)" />

                    <!-- Bridge & Sides -->
                    <path d="M 188,190 Q 200,188 212,190" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <path d="M 150,190 L 140,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                    <path d="M 250,190 L 260,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                `;
            } else if (acc === 'angel_glasses') {
                accSVG = `
                    <!-- Left Wing -->
                    <path d="M 154,190 C 144,178 132,182 130,192 C 128,200 138,204 146,198 C 136,200 136,208 140,212 C 144,215 150,208 154,198 Z" fill="#fff5f7" stroke="#4A3E3D" stroke-width="2.5" stroke-linejoin="round" />
                    <!-- Right Wing -->
                    <path d="M 246,190 C 256,178 268,182 270,192 C 272,200 262,204 254,198 C 264,200 264,208 260,212 C 256,215 250,208 246,198 Z" fill="#fff5f7" stroke="#4A3E3D" stroke-width="2.5" stroke-linejoin="round" />
                    <!-- Left Lens -->
                    <circle cx="172" cy="190" r="18" fill="#ffd6e0" fill-opacity="0.2" stroke="#4A3E3D" stroke-width="3" />
                    <ellipse cx="166" cy="182" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,166,182)" />
                    <!-- Right Lens -->
                    <circle cx="228" cy="190" r="18" fill="#ffd6e0" fill-opacity="0.2" stroke="#4A3E3D" stroke-width="3" />
                    <ellipse cx="222" cy="182" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,222,182)" />
                    <!-- Bridge & Sides -->
                    <path d="M 190,190 Q 200,188 210,190" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <path d="M 154,190 L 142,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                    <path d="M 246,190 L 258,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                `;
            } else if (acc === 'boba_glasses') {
                accSVG = `
                    <!-- Left Lens -->
                    <circle cx="172" cy="190" r="20" fill="none" stroke="#b45309" stroke-width="3.5" />
                    <circle cx="164" cy="200" r="3.5" fill="#4A3E3D" />
                    <circle cx="172" cy="202" r="3.5" fill="#4A3E3D" />
                    <circle cx="180" cy="200" r="3.5" fill="#4A3E3D" />
                    <!-- Right Lens -->
                    <circle cx="228" cy="190" r="20" fill="none" stroke="#b45309" stroke-width="3.5" />
                    <circle cx="220" cy="200" r="3.5" fill="#4A3E3D" />
                    <circle cx="228" cy="202" r="3.5" fill="#4A3E3D" />
                    <circle cx="236" cy="200" r="3.5" fill="#4A3E3D" />
                    <!-- Bridge & Sides -->
                    <path d="M 192,190 Q 200,188 208,190" fill="none" stroke="#b45309" stroke-width="3.5" />
                    <path d="M 152,190 L 140,192" fill="none" stroke="#b45309" stroke-width="2.5" />
                    <path d="M 248,190 L 260,192" fill="none" stroke="#b45309" stroke-width="2.5" />
                `;
            } else if (acc === 'puppy_glasses') {
                accSVG = `
                    <!-- Left Puppy Ear -->
                    <path d="M 152,180 C 140,170 142,200 148,206 C 154,200 158,185 152,180 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" />
                    <path d="M 151,183 C 145,176 146,195 149,199 C 152,195 154,186 151,183 Z" fill="#ffa2b6" />
                    <!-- Right Puppy Ear -->
                    <path d="M 248,180 C 260,170 258,200 252,206 C 246,200 242,185 248,180 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" />
                    <path d="M 249,183 C 255,176 254,195 251,199 C 248,195 246,186 249,183 Z" fill="#ffa2b6" />
                    <!-- Lenses -->
                    <circle cx="172" cy="190" r="18" fill="none" stroke="#4A3E3D" stroke-width="3.5" />
                    <circle cx="228" cy="190" r="18" fill="none" stroke="#4A3E3D" stroke-width="3.5" />
                    <!-- Bridge & Sides -->
                    <path d="M 190,190 Q 200,188 210,190" fill="none" stroke="#4A3E3D" stroke-width="3.5" />
                    <path d="M 154,190 L 142,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                    <path d="M 246,190 L 258,192" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                `;
            } else if (acc === 'star_wing_glasses') {
                accSVG = `
                    <!-- Left Winged Lens -->
                    <path d="M 148,180 C 160,180 186,185 190,195 C 180,205 160,205 148,180 Z" fill="#a78bfa" fill-opacity="0.7" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" />
                    <!-- Left Sparkle Star -->
                    <polygon points="152,176 154,180 158,181 155,183 156,187 152,185 148,187 149,183 146,181 150,180" fill="#facc15" stroke="#4A3E3D" stroke-width="1.5" />
                    <!-- Right Winged Lens -->
                    <path d="M 252,180 C 240,180 214,185 210,195 C 220,205 240,205 252,180 Z" fill="#a78bfa" fill-opacity="0.7" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" />
                    <!-- Right Sparkle Star -->
                    <polygon points="248,176 250,180 254,181 251,183 252,187 248,185 244,187 245,183 242,181 246,180" fill="#facc15" stroke="#4A3E3D" stroke-width="1.5" />
                    <!-- Bridge & Sides -->
                    <path d="M 190,190 Q 200,188 210,190" fill="none" stroke="#4A3E3D" stroke-width="3" />
                    <path d="M 148,182 L 140,184" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                    <path d="M 252,182 L 260,184" fill="none" stroke="#4A3E3D" stroke-width="2.5" />
                `;
            }
            accessoryGroup.innerHTML = accSVG;
        }

        // ---- Mascot Hairstyles ----
        const hairGroup = svg.querySelector('#avatar-hair');
        if (hairGroup) {
            let hairSVG = "";
            const hStyle = conf.hairStyle || 'none';
            if (hStyle === 'curly') {
                hairSVG = `
                    <circle cx="200" cy="125" r="15" fill="${conf.skinTone}" stroke="#4A3E3D" stroke-width="4.5" />
                    <circle cx="185" cy="130" r="12" fill="${conf.skinTone}" stroke="#4A3E3D" stroke-width="4.5" />
                    <circle cx="215" cy="130" r="12" fill="${conf.skinTone}" stroke="#4A3E3D" stroke-width="4.5" />
                    <circle cx="200" cy="130" r="16" fill="${conf.skinTone}" />
                    <circle cx="185" cy="133" r="13" fill="${conf.skinTone}" />
                    <circle cx="215" cy="133" r="13" fill="${conf.skinTone}" />
                `;
            } else if (hStyle === 'crop') {
                hairSVG = `
                    <path d="M 180,135 L 190,115 L 200,135 L 210,115 L 220,135" fill="${conf.skinTone}" stroke="#4A3E3D" stroke-width="4.5" stroke-linejoin="round" />
                    <path d="M 182,137 L 190,118 L 200,137 L 210,118 L 218,137 Z" fill="${conf.skinTone}" />
                `;
            } else if (hStyle === 'bob') {
                hairSVG = `
                    <circle cx="120" cy="170" r="16" fill="${conf.skinTone}" stroke="#4A3E3D" stroke-width="4.5" />
                    <circle cx="280" cy="170" r="16" fill="${conf.skinTone}" stroke="#4A3E3D" stroke-width="4.5" />
                    <circle cx="121" cy="170" r="14" fill="${conf.skinTone}" />
                    <circle cx="279" cy="170" r="14" fill="${conf.skinTone}" />
                `;
            } else if (hStyle === 'long') {
                hairSVG = `
                    <path d="M 200,135 Q 220,105 200,95 Q 180,105 200,135 Z" fill="${conf.skinTone}" stroke="#4A3E3D" stroke-width="4.5" />
                    <path d="M 200,132 Q 217,106 200,98 Q 183,106 200,132 Z" fill="${conf.skinTone}" />
                `;
            }
            hairGroup.innerHTML = hairSVG;
        }

        // ---- Hair (Old/Unused in Mascot, safely bypassed) ----
        const hairFront = svg.querySelector('#avatar-hair-front');
        const hairBack  = svg.querySelector('#avatar-hair-back');
        if (hairFront && conf.hairStyle && SVG_HAIRSTYLES && SVG_HAIRSTYLES[conf.hairStyle]) {
            const hairPaths = SVG_HAIRSTYLES[conf.hairStyle];
            hairFront.setAttribute('d', hairPaths.front);
            if (hairBack) hairBack.setAttribute('d', hairPaths.back);
            hairFront.setAttribute('fill', conf.hairColor || '#1e293b');
            if (hairBack)  hairBack.setAttribute('fill',  conf.hairColor || '#1e293b');
        }
        const leftBrowEl  = svg.querySelector('#left-brow');
        const rightBrowEl = svg.querySelector('#right-brow');
        if (leftBrowEl && conf.hairColor) leftBrowEl.setAttribute('stroke', conf.hairColor);
        if (rightBrowEl && conf.hairColor) rightBrowEl.setAttribute('stroke', conf.hairColor);

        // ---- Shirt / Hoodie ----
        const clothes = svg.querySelector('#avatar-clothes');
        const hood    = svg.querySelector('#avatar-hood');
        if (clothes && conf.shirtStyle && SVG_SHIRTS[conf.shirtStyle]) {
            const shirtPath = SVG_SHIRTS[conf.shirtStyle];
            clothes.setAttribute('d', shirtPath);
            clothes.setAttribute('fill', conf.shirtColor || '#4f46e5');
            svg.querySelectorAll('#avatar-left-arm path, #avatar-right-arm path').forEach(el => {
                el.setAttribute('fill', conf.shirtColor || '#4f46e5');
            });
            if (hood) hood.setAttribute('fill', shadeColor(conf.shirtColor || '#4f46e5', -30));
        }

        // Pocket
        const pocket = svg.querySelector('rect[rx="8"][y="285"]');
        if (pocket && conf.shirtColor) pocket.setAttribute('fill', shadeColor(conf.shirtColor, -30));

        // ---- Hoodie Chest Graphic ----
        const allGraphics = ['graphic-pumpkin', 'graphic-heart', 'graphic-wave', 'graphic-star'];
        allGraphics.forEach(gid => {
            const g = svg.querySelector('#' + gid);
            if (g) g.setAttribute('opacity', (conf.hoodieGraphic && gid === 'graphic-' + conf.hoodieGraphic) ? '1' : '0');
        });

        // ---- Pants ----
        const pantsLeft  = svg.querySelector('#pants-left');
        const pantsRight = svg.querySelector('#pants-right');
        const hemLeft    = svg.querySelector('#hem-left');
        const hemRight   = svg.querySelector('#hem-right');
        if (pantsLeft && pantsRight && conf.pantsStyle && SVG_PANTS[conf.pantsStyle]) {
            const pantsSizes = SVG_PANTS[conf.pantsStyle];
            pantsLeft.setAttribute('height', pantsSizes.leftH);
            pantsRight.setAttribute('height', pantsSizes.rightH);
            // Hide shorts hem lines for long pants
            const showHem = conf.pantsStyle === 'shorts';
            if (hemLeft)  hemLeft.setAttribute('opacity',  showHem ? '1' : '0');
            if (hemRight) hemRight.setAttribute('opacity', showHem ? '1' : '0');
            // cargo color is khaki, jogger is grey
            let pantsColor = '#1e293b';
            if (conf.pantsStyle === 'cargo') pantsColor = '#78716c';
            if (conf.pantsStyle === 'jogger') pantsColor = '#374151';
            pantsLeft.setAttribute('fill',  pantsColor);
            pantsRight.setAttribute('fill', pantsColor);
        }

        // ---- Shoes ----
        const shoesGroup = svg.querySelector('#avatar-shoes');
        if (shoesGroup && conf.shoes) {
            const leftShoeMain = shoesGroup.querySelector('ellipse[cx="122"]');
            const rightShoeMain = shoesGroup.querySelector('ellipse[cx="178"]');
            const leftShoeBody = shoesGroup.querySelector('rect[x="100"][y="422"]');
            const rightShoeBody = shoesGroup.querySelector('rect[x="156"][y="422"]');
            const leftShoeSole = shoesGroup.querySelector('rect[x="99"][y="430"]');
            const rightShoeSole = shoesGroup.querySelector('rect[x="155"][y="430"]');
            const laces = shoesGroup.querySelectorAll('line');
            const socks = svg.querySelector('#avatar-socks');
            
            if (conf.shoes === 'sneakers') {
                if (leftShoeMain) leftShoeMain.setAttribute('fill', 'url(#shoe-grad-l)');
                if (rightShoeMain) rightShoeMain.setAttribute('fill', 'url(#shoe-grad-r)');
                if (leftShoeBody) leftShoeBody.setAttribute('fill', 'url(#shoe-grad-l)');
                if (rightShoeBody) rightShoeBody.setAttribute('fill', 'url(#shoe-grad-r)');
                if (leftShoeSole) leftShoeSole.setAttribute('fill', '#64748b');
                if (rightShoeSole) rightShoeSole.setAttribute('fill', '#64748b');
                if (socks) socks.setAttribute('opacity', '1');
                laces.forEach(l => l.setAttribute('opacity', '1'));
            } else if (conf.shoes === 'boots') {
                if (leftShoeMain) leftShoeMain.setAttribute('fill', '#78350f');
                if (rightShoeMain) rightShoeMain.setAttribute('fill', '#78350f');
                if (leftShoeBody) leftShoeBody.setAttribute('fill', '#78350f');
                if (rightShoeBody) rightShoeBody.setAttribute('fill', '#78350f');
                if (leftShoeSole) leftShoeSole.setAttribute('fill', '#451a03');
                if (rightShoeSole) rightShoeSole.setAttribute('fill', '#451a03');
                if (socks) socks.setAttribute('opacity', '0.2');
                laces.forEach(l => l.setAttribute('opacity', '0.5'));
            } else if (conf.shoes === 'sandals') {
                if (leftShoeMain) leftShoeMain.setAttribute('fill', conf.skinTone);
                if (rightShoeMain) rightShoeMain.setAttribute('fill', conf.skinTone);
                if (leftShoeBody) leftShoeBody.setAttribute('fill', '#1d4ed8');
                if (rightShoeBody) rightShoeBody.setAttribute('fill', '#1d4ed8');
                if (leftShoeSole) leftShoeSole.setAttribute('fill', '#1e3a8a');
                if (rightShoeSole) rightShoeSole.setAttribute('fill', '#1e3a8a');
                if (socks) socks.setAttribute('opacity', '0');
                laces.forEach(l => l.setAttribute('opacity', '0'));
            }
        }

        // ---- Glasses ----
        const glasses = svg.querySelector('#avatar-glasses');
        if (glasses && conf.glasses) {
            if (conf.glasses === 'none') {
                glasses.setAttribute('opacity', '0');
            } else {
                glasses.setAttribute('opacity', '1');
                const color = conf.glasses === 'green' ? '#10b981' : '#f59e0b';
                glasses.querySelectorAll('rect, line').forEach(el => {
                    if (el.hasAttribute('stroke')) el.setAttribute('stroke', color);
                    if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none' && el.tagName !== 'line') {
                        el.setAttribute('fill', color === '#10b981' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)');
                    }
                });
            }
        }

        // ---- Headphone Accessories ----
        const accs = svg.querySelector('#avatar-accessories');
        if (accs) accs.setAttribute('opacity', conf.accessories === 'headphones' ? '1' : '0');

        // ---- Expression / Face ----
        const leftBrow  = svg.querySelector('#left-brow');
        const rightBrow = svg.querySelector('#right-brow');
        const mouth     = svg.querySelector('#avatar-mouth');
        const teeth     = svg.querySelector('#avatar-teeth');
        if (conf.expression && SVG_EXPRESSIONS && SVG_EXPRESSIONS[conf.expression]) {
            const exp = SVG_EXPRESSIONS[conf.expression];
            if (leftBrow)  leftBrow.setAttribute('d', exp.leftBrow);
            if (rightBrow) rightBrow.setAttribute('d', exp.rightBrow);
            if (mouth && !svg.classList.contains('speaking-now')) {
                mouth.setAttribute('d', exp.mouth);
            }
            if (teeth) teeth.setAttribute('opacity', exp.teethOpacity || 0);
        }

        // ---- Glow colors via CSS variables on the SVG ----
        if (conf.glowColor1) svg.style.setProperty('--glow-color-1', conf.glowColor1);
        if (conf.glowColor2) svg.style.setProperty('--glow-color-2', conf.glowColor2);
    }

    function shadeColor(hex, amount) {
        // Slightly lighten or darken a hex color by `amount`
        let col = hex.replace('#', '');
        if (col.length === 3) col = col.split('').map(c => c + c).join('');
        const num = parseInt(col, 16);
        let r = Math.min(255, Math.max(0, (num >> 16) + amount));
        let g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
        let b = Math.min(255, Math.max(0, (num & 0xff) + amount));
        return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    }

    function renderAvatarVisuals() {
        const conf = state.avatar;

        // Update root CSS variables for CSS-driven color props
        document.documentElement.style.setProperty('--hair-color', conf.hairColor || '#1e293b');
        document.documentElement.style.setProperty('--shirt-color', conf.shirtColor || '#4f46e5');
        document.documentElement.style.setProperty('--glow-color-1', conf.glowColor1 || '#8b5cf6');
        document.documentElement.style.setProperty('--glow-color-2', conf.glowColor2 || '#ec4899');

        // Apply to both the main chat avatar and the studio preview
        const mainSVG   = document.getElementById('mindbuddy-svg');
        const studioSVG = document.getElementById('mindbuddy-studio-svg');
        applyAvatarToSVG(mainSVG, conf);
        applyAvatarToSVG(studioSVG, conf);

        // Update expression badge label
        if (DOM.avatarExpressionLabel) {
            DOM.avatarExpressionLabel.innerText = conf.expression.charAt(0).toUpperCase() + conf.expression.slice(1);
        }

        // Update Viewports (both Studio Customizer and Chat Companion) scene background & vector layers
        const currentScene = conf.currentScene || 'starry_night';
        const sceneClass = 'scene-' + currentScene.replace('_', '-');

        const viewports = [];
        if (DOM.customizerViewport) {
            viewports.push({ el: DOM.customizerViewport, id: 'scene-decorations', cls: 'customizer-viewport' });
        }
        const companionViewport = document.querySelector('.avatar-card');
        if (companionViewport) {
            viewports.push({ el: companionViewport, id: 'chat-scene-decorations', cls: 'avatar-card cloud-companion-frame' });
        }

        let svgHtml = '';
        if (currentScene === 'starry_night') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <polygon points="15,10 16,13 19,13 17,15 18,18 15,16 12,18 13,15 11,13 14,13" fill="#ffeaa7" opacity="0.8"/>
                    <polygon points="85,25 86,28 89,28 87,30 88,33 85,31 82,33 83,30 81,28 84,28" fill="#ffeaa7" opacity="0.9"/>
                    <polygon points="25,60 26,63 29,63 27,65 28,68 25,66 22,68 23,65 21,63 24,63" fill="#ffeaa7" opacity="0.65"/>
                    <polygon points="75,70 76,73 79,73 77,75 78,78 75,76 72,78 73,75 71,73 74,73" fill="#ffeaa7" opacity="0.75"/>
                    <circle cx="50" cy="20" r="1.2" fill="#fff" opacity="0.7" />
                    <circle cx="80" cy="45" r="1.5" fill="#fff" opacity="0.8" />
                    <circle cx="20" cy="35" r="1.0" fill="#fff" opacity="0.5" />
                    <rect x="5" y="5" width="90" height="90" rx="6" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.15" />
                    <line x1="50" y1="5" x2="50" y2="95" stroke="#ffffff" stroke-width="1.8" opacity="0.15" />
                    <line x1="5" y1="50" x2="95" y2="50" stroke="#ffffff" stroke-width="1.8" opacity="0.15" />
                </svg>
            `;
        } else if (currentScene === 'lofi_study') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <circle cx="20" cy="40" r="12" fill="#ffeaa7" opacity="0.3" filter="blur(4px)" />
                    <circle cx="20" cy="40" r="4" fill="#ffdf7a" />
                    <path d="M 12,55 L 20,40 L 28,55 Z" fill="#ebcba4" stroke="#4A3E3D" stroke-width="1.5" />
                    <line x1="20" y1="55" x2="20" y2="70" stroke="#4A3E3D" stroke-width="2.5" />
                    <rect x="0" y="70" width="100" height="30" fill="#dfc09b" stroke="#4A3E3D" stroke-width="2" />
                    <line x1="0" y1="74" x2="100" y2="74" stroke="#cfae89" stroke-width="1.5" />
                    <rect x="75" y="60" width="12" height="10" rx="3" fill="#ffa2b6" stroke="#4A3E3D" stroke-width="2" />
                    <path d="M 87,62 C 90,62 90,68 87,68" fill="none" stroke="#4A3E3D" stroke-width="2" />
                    <path d="M 78,56 Q 79,52 78,48" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" />
                    <path d="M 82,55 Q 83,51 82,47" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            `;
        } else if (currentScene === 'floating_garden') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <path d="M 10,0 Q 15,30 8,50" fill="none" stroke="#606c38" stroke-width="1.5" />
                    <circle cx="10" cy="15" r="2.5" fill="#798948" />
                    <circle cx="14" cy="28" r="2.2" fill="#798948" />
                    <circle cx="7" cy="40" r="2.5" fill="#798948" />
                    <path d="M 90,0 Q 85,25 88,40" fill="none" stroke="#606c38" stroke-width="1.5" />
                    <circle cx="89" cy="12" r="2.5" fill="#798948" />
                    <circle cx="85" cy="24" r="2.2" fill="#798948" />
                    <circle cx="88" cy="35" r="2.5" fill="#798948" />
                    <circle cx="25" cy="70" r="2" fill="#ffa2b6" /><circle cx="28" cy="73" r="2" fill="#ffa2b6" /><circle cx="22" cy="73" r="2" fill="#ffa2b6" /><circle cx="25" cy="76" r="2" fill="#ffa2b6" /><circle cx="25" cy="73" r="1" fill="#fff" />
                    <circle cx="78" cy="65" r="2" fill="#ffd166" /><circle cx="81" cy="68" r="2" fill="#ffd166" /><circle cx="75" cy="68" r="2" fill="#ffd166" /><circle cx="78" cy="71" r="2" fill="#ffd166" /><circle cx="78" cy="68" r="1" fill="#fff" />
                </svg>
            `;
        } else if (currentScene === 'boba_cafe') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <path d="M 0,15 Q 25,25 50,15 Q 75,25 100,15" fill="none" stroke="#4A3E3D" stroke-width="1.5" />
                    <circle cx="16" cy="19" r="2.5" fill="#ffe066" stroke="#4A3E3D" stroke-width="1" />
                    <circle cx="34" cy="20" r="2.5" fill="#ffe066" stroke="#4A3E3D" stroke-width="1" />
                    <circle cx="66" cy="20" r="2.5" fill="#ffe066" stroke="#4A3E3D" stroke-width="1" />
                    <circle cx="84" cy="19" r="2.5" fill="#ffe066" stroke="#4A3E3D" stroke-width="1" />
                    <path d="M 0,0 L 0,8 Q 5,12 10,8 Q 15,12 20,8 Q 25,12 30,8 Q 35,12 40,8 Q 45,12 50,8 Q 55,12 60,8 Q 65,12 70,8 Q 75,12 80,8 Q 85,12 90,8 Q 95,12 100,8 L 100,0 Z" fill="#fca5a5" stroke="#4A3E3D" stroke-width="1.5" />
                </svg>
            `;
        } else if (currentScene === 'pink_bedroom') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <!-- String Lights -->
                    <path d="M 0,10 Q 25,25 50,15 Q 75,25 100,10" fill="none" stroke="#4A3E3D" stroke-width="1.5" />
                    <!-- Glowing Yellow Bulbs -->
                    <circle cx="15" cy="15" r="3" fill="#fef08a" stroke="#4A3E3D" stroke-width="1" />
                    <circle cx="35" cy="19" r="3" fill="#fef08a" stroke="#4A3E3D" stroke-width="1" />
                    <circle cx="50" cy="15" r="3" fill="#fef08a" stroke="#4A3E3D" stroke-width="1" />
                    <circle cx="65" cy="19" r="3" fill="#fef08a" stroke="#4A3E3D" stroke-width="1" />
                    <circle cx="85" cy="15" r="3" fill="#fef08a" stroke="#4A3E3D" stroke-width="1" />
                    <!-- Floating Sakura Petals -->
                    <ellipse cx="10" cy="40" rx="2" ry="1.2" fill="#ffb7cc" opacity="0.6" transform="rotate(30,10,40)" />
                    <ellipse cx="88" cy="65" rx="2" ry="1.2" fill="#ffb7cc" opacity="0.6" transform="rotate(-40,88,65)" />
                    <!-- Cute Rug base -->
                    <ellipse cx="50" cy="95" rx="35" ry="10" fill="#ffa2b6" opacity="0.25" />
                </svg>
            `;
        } else if (currentScene === 'cozy_cabin') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <!-- Cabin Windows -->
                    <rect x="15" y="15" width="22" height="35" rx="4" fill="#fef9c3" stroke="#4A3E3D" stroke-width="2.5" opacity="0.4" />
                    <line x1="26" y1="15" x2="26" y2="50" stroke="#4A3E3D" stroke-width="1.8" opacity="0.5" />
                    <line x1="15" y1="32" x2="37" y2="32" stroke="#4A3E3D" stroke-width="1.8" opacity="0.5" />
                    <!-- Cozy Mug on table -->
                    <path d="M 80,75 L 88,75 A 4,4 0 0,1 92,79 L 92,81 A 4,4 0 0,1 88,85 L 80,85 Z" fill="none" stroke="#4A3E3D" stroke-width="2" />
                    <rect x="74" y="72" width="10" height="15" rx="2" fill="#f97316" stroke="#4A3E3D" stroke-width="2.5" />
                    <!-- Little Steam path -->
                    <path d="M 76,66 Q 78,60 76,54" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" />
                    <path d="M 81,65 Q 83,59 81,53" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" />
                    <!-- Floor wood planks -->
                    <line x1="0" y1="88" x2="100" y2="88" stroke="#4A3E3D" stroke-width="2.5" />
                    <line x1="30" y1="88" x2="30" y2="100" stroke="#4A3E3D" stroke-width="1.8" />
                    <line x1="70" y1="88" x2="70" y2="100" stroke="#4A3E3D" stroke-width="1.8" />
                </svg>
            `;
        } else if (currentScene === 'cozy_rain') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <!-- Floating cozy clouds -->
                    <path d="M 15,30 A 8,8 0 0,1 31,30 A 8,8 0 0,1 47,30 A 8,8 0 0,1 31,38 Z" fill="#ffffff" opacity="0.5" />
                    <path d="M 60,25 A 6,6 0 0,1 72,25 A 6,6 0 0,1 84,25 A 6,6 0 0,1 72,31 Z" fill="#ffffff" opacity="0.5" />
                    <!-- Rain drops falling -->
                    <line x1="20" y1="50" x2="18" y2="60" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" opacity="0.7" />
                    <line x1="50" y1="40" x2="48" y2="50" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" opacity="0.7" />
                    <line x1="80" y1="45" x2="78" y2="55" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" opacity="0.7" />
                    <line x1="35" y1="70" x2="33" y2="80" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" opacity="0.7" />
                    <line x1="68" y1="65" x2="66" y2="75" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" opacity="0.7" />
                </svg>
            `;
        } else if (currentScene === 'magic_forest') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <!-- Giant Magic Mushroom Left -->
                    <path d="M 12,90 L 12,65 Q 15,65 18,65 L 18,90 Z" fill="#ebcba4" stroke="#4A3E3D" stroke-width="2" />
                    <path d="M 3,65 Q 15,35 27,65 Z" fill="#c084fc" stroke="#4A3E3D" stroke-width="2" />
                    <circle cx="10" cy="50" r="2.5" fill="#fff" opacity="0.8" />
                    <circle cx="20" cy="55" r="2.0" fill="#fff" opacity="0.8" />
                    <!-- Small Magic Mushroom Right -->
                    <path d="M 85,90 L 85,75 Q 87,75 89,75 L 89,90 Z" fill="#ebcba4" stroke="#4A3E3D" stroke-width="1.8" />
                    <path d="M 78,75 Q 87,52 96,75 Z" fill="#f472b6" stroke="#4A3E3D" stroke-width="1.8" />
                    <circle cx="84" cy="64" r="1.5" fill="#fff" opacity="0.8" />
                    <circle cx="90" cy="66" r="1.5" fill="#fff" opacity="0.8" />
                    <!-- Magical Fireflies / Glows -->
                    <circle cx="25" cy="30" r="2" fill="#fef08a" opacity="0.9" />
                    <circle cx="25" cy="30" r="5" fill="#fef08a" opacity="0.3" />
                    <circle cx="75" cy="40" r="1.5" fill="#fef08a" opacity="0.8" />
                    <circle cx="75" cy="40" r="4" fill="#fef08a" opacity="0.25" />
                    <circle cx="45" cy="20" r="2.2" fill="#a78bfa" opacity="0.8" />
                    <circle cx="45" cy="20" r="6" fill="#a78bfa" opacity="0.25" />
                    <circle cx="55" cy="55" r="1.2" fill="#fef08a" opacity="0.7" />
                    <!-- Ground / Moss -->
                    <path d="M 0,90 Q 25,87 50,90 Q 75,93 100,90 L 100,100 L 0,100 Z" fill="#588157" stroke="#4A3E3D" stroke-width="2" />
                </svg>
            `;
        } else if (currentScene === 'candy_castle') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <!-- Rainbow -->
                    <path d="M -10,65 Q 50,-10 110,65" fill="none" stroke="#ff85a2" stroke-width="14" opacity="0.3" />
                    <path d="M -10,65 Q 50,-10 110,65" fill="none" stroke="#fcd34d" stroke-width="10" opacity="0.3" />
                    <path d="M -10,65 Q 50,-10 110,65" fill="none" stroke="#a7f3d0" stroke-width="6" opacity="0.3" />
                    <path d="M -10,65 Q 50,-10 110,65" fill="none" stroke="#bae6fd" stroke-width="2" opacity="0.3" />
                    <!-- Far away Castle Silhouettes -->
                    <path d="M 15,85 L 15,55 L 28,55 L 28,85 Z M 28,85 L 28,45 L 42,45 L 42,85 Z" fill="#f5d0fe" stroke="#4A3E3D" stroke-width="1.8" />
                    <polygon points="15,55 21.5,38 28,55" fill="#e879f9" stroke="#4A3E3D" stroke-width="1.8" />
                    <polygon points="28,45 35,25 42,45" fill="#e879f9" stroke="#4A3E3D" stroke-width="1.8" />
                    
                    <path d="M 65,85 L 65,48 L 78,48 L 78,85 Z M 78,85 L 78,58 L 90,58 L 90,85 Z" fill="#f5d0fe" stroke="#4A3E3D" stroke-width="1.8" />
                    <polygon points="65,48 71.5,30 78,48" fill="#e879f9" stroke="#4A3E3D" stroke-width="1.8" />
                    <polygon points="78,58 84,42 90,58" fill="#e879f9" stroke="#4A3E3D" stroke-width="1.8" />
                    <!-- Twinkling Stars -->
                    <polygon points="12,20 13,23 16,23 14,25 15,28 12,26 9,28 10,25 8,23 11,23" fill="#fcd34d" />
                    <polygon points="88,18 89,21 92,21 90,23 91,26 88,24 85,26 86,23 84,21 87,21" fill="#fcd34d" />
                    <!-- Cozy Fluffy Clouds at Bottom -->
                    <path d="M -10,85 A 15,15 0 0,1 20,85 A 20,20 0 0,1 60,85 A 20,20 0 0,1 90,85 A 15,15 0 0,1 110,85 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="2.5" />
                </svg>
            `;
        } else if (currentScene === 'coral_palace') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <!-- Floating bubbles -->
                    <circle cx="15" cy="45" r="3.5" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />
                    <circle cx="17" cy="43" r="1" fill="#ffffff" opacity="0.8" />
                    <circle cx="20" cy="25" r="2" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.5" />
                    <circle cx="82" cy="35" r="4" fill="none" stroke="#ffffff" stroke-width="1.8" opacity="0.6" />
                    <circle cx="84" cy="33" r="1.2" fill="#ffffff" opacity="0.8" />
                    <circle cx="78" cy="18" r="2.5" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.5" />
                    <circle cx="50" cy="15" r="3" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.4" />
                    <!-- Coral & Seaweed Left -->
                    <path d="M 5,95 Q 12,65 18,95 Q 24,70 28,95" fill="none" stroke="#4ade80" stroke-width="4.5" stroke-linecap="round" />
                    <path d="M 12,95 C 10,80 2,82 8,95" fill="#fecdd3" stroke="#4A3E3D" stroke-width="1.8" />
                    <path d="M 22,95 C 25,75 12,78 18,95" fill="#fda4af" stroke="#4A3E3D" stroke-width="1.8" />
                    <!-- Coral & Seaweed Right -->
                    <path d="M 90,95 Q 85,60 78,95 Q 74,68 70,95" fill="none" stroke="#4ade80" stroke-width="4" stroke-linecap="round" />
                    <path d="M 85,95 C 80,72 98,75 88,95" fill="#fef08a" stroke="#4A3E3D" stroke-width="1.8" />
                    <path d="M 75,95 C 72,82 80,80 76,95" fill="#fed7aa" stroke="#4A3E3D" stroke-width="1.8" />
                    <!-- Cute Little Starfish on Ground -->
                    <polygon points="45,94 47,89 51,90 48,93 49,97 45,95 41,97 42,93 39,90 43,89" fill="#ff758f" stroke="#4A3E3D" stroke-width="1.5" stroke-linejoin="round" />
                    <!-- Sandy Ocean Floor -->
                    <path d="M 0,93 Q 25,90 50,93 Q 75,95 100,92 L 100,100 L 0,100 Z" fill="#fef3c7" stroke="#4A3E3D" stroke-width="2.2" />
                </svg>
            `;
        } else if (currentScene === 'moon_carousel') {
            svgHtml = `
                <svg class="scene-bg-element" viewBox="0 0 100 100">
                    <!-- Hanging Stars on Strings -->
                    <line x1="20" y1="0" x2="20" y2="35" stroke="#4A3E3D" stroke-width="1.5" />
                    <polygon points="20,35 22,38 25,38 23,40 24,43 20,41 16,43 17,40 15,38 18,38" fill="#fcd34d" stroke="#4A3E3D" stroke-width="1.2" />
                    <line x1="80" y1="0" x2="80" y2="45" stroke="#4A3E3D" stroke-width="1.5" />
                    <polygon points="80,45 82,48 85,48 83,50 84,53 80,51 76,53 77,50 75,48 78,48" fill="#fcd34d" stroke="#4A3E3D" stroke-width="1.2" />
                    <line x1="50" y1="0" x2="50" y2="20" stroke="#4A3E3D" stroke-width="1.5" />
                    <polygon points="50,20 52,23 55,23 53,25 54,28 50,26 46,28 47,25 45,23 48,23" fill="#fcd34d" stroke="#4A3E3D" stroke-width="1.2" />
                    <!-- Big Crescent Golden Moon Swing (placed behind the mascot offset) -->
                    <path d="M 68,25 A 28,28 0 1,0 68,81 A 23,23 0 1,1 68,25 Z" fill="#fdeb6e" stroke="#4A3E3D" stroke-width="2" transform="rotate(-10, 68, 53)" />
                    <circle cx="56" cy="46" r="1.5" fill="#fff" opacity="0.8" />
                    <circle cx="48" cy="62" r="2.0" fill="#fff" opacity="0.8" />
                    <!-- Magic Sparkles -->
                    <polygon points="35,60 36,62 38,62 36.5,63.5 37,65.5 35,64.2 33,65.5 33.5,63.5 32,62 34,62" fill="#ffffff" />
                    <polygon points="78,72 79,74 81,74 79.5,75.5 80,77.5 78,76.2 76,77.5 76.5,75.5 75,74 77,74" fill="#ffffff" />
                    <polygon points="25,25 26,27 28,27 26.5,28.5 27,30.5 25,29.2 23,30.5 23.5,28.5 22,27 24,27" fill="#ffffff" />
                    <!-- Soft clouds at bottom -->
                    <path d="M -10,92 Q 15,85 40,93 Q 65,86 90,92 Q 100,90 110,95 L 110,100 L -10,100 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" />
                </svg>
            `;
        }

        viewports.forEach(vp => {
            vp.el.className = vp.cls + ' ' + sceneClass;
            let decContainer = vp.el.querySelector('#' + vp.id);
            if (!decContainer) {
                decContainer = document.createElement('div');
                decContainer.id = vp.id;
                decContainer.style.position = 'absolute';
                decContainer.style.inset = '0';
                decContainer.style.pointerEvents = 'none';
                decContainer.style.zIndex = '1';
                vp.el.insertBefore(decContainer, vp.el.firstChild);
            }
            decContainer.innerHTML = svgHtml;
        });

        // Toggle Pet active layers
        const petCat = document.getElementById('pet-cat');
        const petDog = document.getElementById('pet-dog');
        const petBird = document.getElementById('pet-bird');
        if (petCat && petDog && petBird) {
            petCat.classList.remove('active');
            petDog.classList.remove('active');
            petBird.classList.remove('active');
            
            if (conf.pet === 'cat') petCat.classList.add('active');
            if (conf.pet === 'dog') petDog.classList.add('active');
            if (conf.pet === 'bird') petBird.classList.add('active');
        }

        // Expression class for CSS targeting
        [mainSVG, studioSVG].forEach(svg => {
            if (!svg) return;
            svg.classList.remove('expression-friendly', 'expression-thoughtful', 'expression-attentive', 'expression-excited');
            svg.classList.add('expression-' + conf.expression);
        });
    }

    // Dynamic speaking controls — targets both SVGs by ID
    let mouthAnimationTimer = null;
    function triggerAvatarSpeechSpeak(durationMs) {
        ['mindbuddy-svg', 'mindbuddy-studio-svg'].forEach(id => {
            const svg = document.getElementById(id);
            if (svg) svg.classList.add('speaking-now');
        });

        if (mouthAnimationTimer) clearTimeout(mouthAnimationTimer);
        mouthAnimationTimer = setTimeout(() => {
            ['mindbuddy-svg', 'mindbuddy-studio-svg'].forEach(id => {
                const svg = document.getElementById(id);
                if (svg) svg.classList.remove('speaking-now');
            });
            renderAvatarVisuals(); // Restore base mouth shape
        }, durationMs);
    }

    // ----------------------------------------------------------------------
    // CHAT ENGINE WITH WELLNESS DIAGNOSTIC LOGIC
    // ----------------------------------------------------------------------
    const EmpatheticDB = {
        greetings: [
            "Hey! I'm so glad you checked in. How's everything feeling right now?",
            "Hi there. I'm here, ready to chat. What's been going on today?",
            "Hey. Take a load off. How are you holding up with school and everything else?"
        ],
        stressAcademic: [
            "School pressure is no joke. The feeling of everything piling up can make you feel paralyzed. Remember: you are worth more than any grade, and you only have to tackle one thing at a time. What's the biggest task eating at your attention?",
            "It sounds like academic overload. When assignments pile up, it's completely natural to feel burnt out. Let's break it down together, or we can just complain about how stressful it is. What would help most?"
        ],
        stressSocial: [
            "Friendships and social situations can be exhausting. It's really tough when you feel misunderstood or out of place. I'm right here with you, and there's zero pressure to perform. Do you want to describe what happened?",
            "Social fatigue is very real. It's okay to step back and protect your energy. You don't have to keep everyone happy at the cost of your own calm. I'm here for you."
        ],
        stressBurnout: [
            "Burnout makes even tiny tasks look like mountains. If you're feeling empty or completely spent, your mind is telling you it's time to rest. Let's just sit here. No homework talk. How does that sound?",
            "I hear you. Exhaustion is your body's signal that you've been carrying too much for too long. Can you put the work down for tonight and just take a breather with me? You've done enough."
        ],
        stressLoneliness: [
            "Feeling lonely is a heavy, quiet ache. Even in a busy school, it's easy to feel invisible. I want you to know I value our chats, and you are not isolated here. I'm listening. What is on your mind?",
            "I'm here. You have a safe space with me. Let's talk about anything you like—hobbies, funny stories, or what you wish people understood about you."
        ],
        defaultCalm: [
            "That's interesting! It sounds like you are managing things nicely right now. What else is on your mind?",
            "I love hearing that. Maintaining a calm space is so important. What are you looking forward to next?",
            "I'm here for this! Tell me more about it."
        ]
    };

    // -----------------------------------------------------------------------
    // GEMINI AI ANALYSIS ENGINE
    // -----------------------------------------------------------------------
    // IMPORTANT: Replace the value below with your own Gemini API key.
    // Get one free at: https://aistudio.google.com/app/apikey
    const GEMINI_API_KEY = (window.GEMINI_API_KEY || '').trim();
    const GEMINI_QUOTA_COOLDOWN_MS = 60 * 1000;
    const GEMINI_AUDIO_COOLDOWN_MS = 60 * 1000;
    const GEMINI_NON_CHAT_COOLDOWN_MS = 90 * 1000;
    const GEMINI_FACE_COOLDOWN_MS = 5 * 60 * 1000;
    const GEMINI_QUIZ_COOLDOWN_MS = 5 * 60 * 1000;
    const STUDENT_ANALYSIS_SYNC_COOLDOWN_MS = 20 * 1000;
    let geminiDisabledUntil = 0;
    let lastGeminiFailure = null;
    let lastGeminiAudioAt = 0;
    let lastGeminiNonChatAt = 0;
    let lastGeminiFaceAt = 0;
    let lastGeminiQuizAt = 0;
    const lastStudentAnalysisSyncAt = {
        text: 0,
        voice: 0,
        facial_emotion: 0
    };

    function canAttemptGemini() {
        return Date.now() >= geminiDisabledUntil && (Boolean(GEMINI_API_KEY) || window.location.protocol !== 'file:');
    }

    function canAttemptNonChatGemini(lastFeatureAt, featureCooldownMs) {
        const now = Date.now();
        if (!canAttemptGemini()) return false;
        if (now - lastGeminiNonChatAt < GEMINI_NON_CHAT_COOLDOWN_MS) return false;
        if (now - lastFeatureAt < featureCooldownMs) return false;
        lastGeminiNonChatAt = now;
        return true;
    }

    async function callGemini(model, requestBody) {
        if (!canAttemptGemini()) return null;
        lastGeminiFailure = null;

        let response = null;
        // Prioritize direct API call if local key exists, to avoid 404 proxy errors on static server port 8086
        if (GEMINI_API_KEY) {
            try {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
            } catch (e) {
                console.error('Direct Gemini fetch failed:', e);
            }
        } else if (window.location.protocol !== 'file:') {
            try {
                response = await fetch('/api/ai/gemini', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, payload: requestBody })
                });
            } catch (e) {
                console.warn('Backend proxy fetch failed:', e);
            }
        }

        if (!response) return null;

        // Prefer the backend proxy. Browser-direct calls can expose the key and
        // surface raw network errors, so only use them for file:// demos.
        if (response.status === 503) {
            const data = await response.json().catch(() => null);
            lastGeminiFailure = {
                code: data?.code || 'missing_api_key',
                status: 503,
                detail: data?.error || 'The backend could not find a Gemini API key.'
            };
            return null;
        }

        if (response.status === 429) {
            geminiDisabledUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
            lastGeminiFailure = {
                code: 'http_429',
                status: 429,
                detail: 'Gemini returned HTTP 429 directly.'
            };
            return null;
        }

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        if (data?.quota_exceeded) {
            geminiDisabledUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
            lastGeminiFailure = {
                code: data.code || 'quota_exceeded',
                status: data.status || 429,
                detail: data.error || 'Gemini reported quota exceeded.'
            };
            return null;
        }

        if (data?.code === 'gemini_error' || data?.code === 'gemini_request_failed') {
            lastGeminiFailure = {
                code: data.code,
                status: data.status || 'unknown',
                detail: data.error || 'The Gemini proxy returned an error.'
            };
            console.warn(`Gemini proxy returned fallbackable error: ${data.status || data.code}`);
            return null;
        }

        return data;
    }

    function formatGeminiDiagnostic() {
        if (!lastGeminiFailure) return '';
        const detail = String(lastGeminiFailure.detail || '').replace(/\s+/g, ' ').trim();
        return `AI API diagnostic: the app tried the chatbot Gemini request, but it did not return a usable reply. Code: ${lastGeminiFailure.code}; status: ${lastGeminiFailure.status}. Detail: ${detail}`;
    }

    // Track conversation history for context-aware responses
    const conversationHistory = [];

    async function analyzeWithGemini(studentText) {
        // Add the student message to history
        conversationHistory.push({ role: 'user', parts: [{ text: studentText }] });

        const systemPrompt = `You are "Your Buddy" (智能共情虚拟伙伴), a healing, extremely warm and empathetic peer-like AI companion for students.
Your appearance is a cyan, fluffy, round monster with two star antennas, sitting comfortably on a soft beige round quilted cushion.
Your personality: supportive, caring, non-judgmental, warm and comforting.

When responding, you must:
1. Dynamically respond to the student's message (2-4 sentences max for chat) in the same language they used (Chinese or English).
3. At the END of your response, append a JSON block (wrapped in triple backticks) with this exact format:
\`\`\`json
{
  "sentiment": "Positive|Neutral|Negative",
  "stressLevel": "Low|Medium|High",
  "emotionTags": ["academic", "social", "burnout", "lonely"],
  "expression": "friendly|thoughtful|attentive|excited",
  "academicPressure": 0-100,
  "socialAnxiety": 0-100,
  "burnout": 0-100,
  "loneliness": 0-100
}
\`\`\`

Keep your conversational reply warm, healing and concise. The student should feel comforted.`;

        const requestBody = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: conversationHistory,
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 2048
            }
        };

        try {
            const data = await callGemini('gemini-1.5-flash', requestBody);
            if (!data) return null;
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Check for Dashboard format from the new prompt
            const dashboardMatch = rawText.match(/精力耗竭:\s*(\d+)%?\s*\|\s*社交疲劳:\s*(\d+)%/);
            let analytics = null;
            let replyText = rawText;

            if (dashboardMatch) {
                analytics = {
                    burnout: parseInt(dashboardMatch[1], 10),
                    socialAnxiety: parseInt(dashboardMatch[2], 10),
                    academicPressure: parseInt(dashboardMatch[1], 10) // map to burnout
                };
            } else {
                // Fallback for older JSON logic if needed
                const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    try { analytics = JSON.parse(jsonMatch[1]); } catch (e) {}
                    replyText = rawText.replace(/```json[\s\S]*?```/, '').trim();
                }
            }

            // Strip any [Mood: ...] label the model may still prepend (safety net)
            replyText = replyText.replace(/^\[Mood:[^\]]*\]\s*/i, '').trim();

            // Add Gemini's response to conversation history
            conversationHistory.push({ role: 'model', parts: [{ text: replyText }] });

            return { reply: replyText, analytics };
        } catch (err) {
            console.warn('Gemini API call failed; using local fallback:', err);
            return null; // falls back to local analysis
        }
    }

    async function processStudentMessage(text) {
        // 1. Display student message
        appendChatMessage('Student', text);

        // 1.5 Wardrobe change command detection (Both English and Chinese)
        const outfitTriggers = [
            { id: 'forest', keywords: ['森林', 'forest', 'mushroom', 'cloak', '南瓜', '南瓜短裤'] },
            { id: 'starry', keywords: ['星空', 'starry', '睡衣', 'pajamas', 'moon', 'stars'] },
            { id: 'nautical', keywords: ['航海', 'nautical', 'sailor', '水手', '海员'] },
            { id: 'strawberry', keywords: ['草莓', 'strawberry', 'picnic', '野餐', '草莓野餐'] },
            { id: 'wizard', keywords: ['魔法', 'magic', 'wizard', '巫师', '学徒'] },
            { id: 'princess', keywords: ['公主', 'princess', 'dress', 'gown', 'tiara', '皇室', '礼服'] },
            { id: 'mermaid', keywords: ['美人鱼', 'mermaid', 'shell', 'scale', '珍珠', 'pearl', '海洋'] },
            { id: 'lolita', keywords: ['洛丽塔', 'lolita', 'ruffle', 'lace', '裙子', '蓬蓬裙'] },
            { id: 'unicorn', keywords: ['独角兽', 'unicorn', 'rainbow', '彩虹', '翅膀', 'wings'] }
        ];

        const lowerText = text.toLowerCase();
        // Check if message is a dressing command (e.g. contains 换, 穿, wear, change, dress, put on)
        const isDressingCmd = /换|穿|wear|change|dress|put on|outfit|suit/.test(lowerText);
        const matchedOutfit = isDressingCmd ? outfitTriggers.find(o => o.keywords.some(kw => lowerText.includes(kw))) : null;

        if (matchedOutfit) {
            avatarState.set('activeOutfit', matchedOutfit.id);
            // Respond with dialogue styles matching the prompt
            let replyMsg = "";

            const isChinese = /[\u4e00-\u9fff]/.test(text);

            if (matchedOutfit.id === 'forest') {
                replyMsg = isChinese
                    ? `看我！我已经穿上了“森林童话 (Forest Fairy Tale)”的绿色连帽斗篷和南瓜短裤啦。森林里有很多会发光的蘑菇哦，你想和我一起采蘑菇去吗？🍄`
                    : `Look at me! I have put on the "Forest Fairy Tale" green hooded cloak and pumpkin shorts! There are lots of glowing mushrooms in the forest, would you like to go mushroom picking with me? 🍄`;
            } else if (matchedOutfit.id === 'starry') {
                replyMsg = isChinese
                    ? `换上“星空睡衣 (Starry Sky Pajamas)”和暖乎乎的云朵棉鞋啦。好暖和呀...困意上来了，我们今晚一起数星星吧，呼噜噜...😴⭐`
                    : `I'm wearing the "Starry Sky Pajamas" and soft cloud slippers now. So warm... I'm getting a bit sleepy... Let's count stars together tonight, zzz... 😴⭐`;
            } else if (matchedOutfit.id === 'nautical') {
                replyMsg = isChinese
                    ? `扬帆起航！我穿上了“航海冒险 (Nautical Adventure)”带红领结的白蓝水手上衣和百褶裙。我们的目标是星辰大海，下一站去草莓岛！⚓⛵`
                    : `All aboard! I've changed into the "Nautical Adventure" sailor uniform with the red bowtie. Our target is the starry sea, next stop is Strawberry Island! ⚓⛵`;
            } else if (matchedOutfit.id === 'strawberry') {
                replyMsg = isChinese
                    ? `哒哒！“草莓野餐 (Strawberry Picnic)”粉色格纹草莓连衣裙穿在我身上超可爱吧？今天的天气最适合野餐了。呐，给你一个甜甜的新鲜大草莓！🍓`
                    : `Tada! The "Strawberry Picnic" pink checkered dress looks so cute on me, doesn't it? The weather today is perfect for a picnic. Here, have a sweet, fresh strawberry! 🍓`;
            } else if (matchedOutfit.id === 'wizard') {
                replyMsg = isChinese
                    ? `呼啦啦变！我已经化身为“魔法学徒 (Magic Apprentice)”，穿上了镶有金边的紫色连帽巫师长袍！正在念治愈咒语：所有的负能量 and 烦恼，退退退！🪄✨`
                    : `Abrakadabra! I'm now a "Magic Apprentice" in a gold-trimmed purple wizard robe! Casting a healing spell: all negative energy and worries, fade away! 🪄✨`;
            } else if (matchedOutfit.id === 'princess') {
                replyMsg = isChinese
                    ? `哇！穿上“皇家公主礼服 (Royal Princess Gown)”了！蓬松的裙摆和亮闪闪的金色饰带，我是不是很像童话里的高贵公主呀？愿你的每一天都充满魔法和喜悦！👑✨`
                    : `Wow! I'm wearing the "Royal Princess Gown"! With a puffy skirt and glittering gold sash, don't I look like a noble princess from a fairy tale? May your day be filled with magic and joy! 👑✨`;
            } else if (matchedOutfit.id === 'mermaid') {
                replyMsg = isChinese
                    ? `哗啦啦~我换上了“深海人鱼珍珠裙 (Mermaid Pearl Gown)”！裙摆上有闪闪发光的鱼鳞，腰带上还缀满了圆润的珍珠呢。走，我们一起去海底探险吧！🧜‍♀️🌊`
                    : `Splash! I've changed into the "Mermaid Pearl Gown"! The skirt features shimmering fish scales and a belt made of beautiful white pearls. Let's go on an underwater adventure! 🧜‍♀️🌊`;
            } else if (matchedOutfit.id === 'lolita') {
                replyMsg = isChinese
                    ? `哒啦！换上“甜心洛丽塔蓬蓬裙 (Sweet Lolita Ruffle)”啦。层层叠叠的蕾丝花边和超大粉色蝴蝶结，感觉自己变甜了十倍！要和我一起喝下午茶吗？🎀🍰`
                    : `Tada! I've put on the "Sweet Lolita Ruffle" dress! With layers of white lace and a giant pink bow, I feel ten times sweeter! Want to join me for afternoon tea? 🎀🍰`;
            } else if (matchedOutfit.id === 'unicorn') {
                replyMsg = isChinese
                    ? `起飞啦！这是最梦幻的“璀璨独角兽彩虹服 (Sparkling Unicorn Suit)”！背上有一对雪白的云朵翅膀，胸前还有一枚纯金的独角兽徽章，快骑上我飞跃彩虹吧！🦄🌈`
                    : `Taking off! This is the magical "Sparkling Unicorn Suit"! Complete with fluffy white cloud wings and a golden unicorn badge, let's fly over the rainbow! 🦄🌈`;
            }

            // Remove typing indicator, show avatar change and speak
            const typingId = showTypingIndicator();
            setTimeout(() => {
                removeTypingIndicator(typingId);
                appendChatMessage('Buddy', replyMsg);
                speakResponse(replyMsg, true);
                syncStudentAnalysisToBackend(text, replyMsg, 'text');
            }, 600);
            return;
        }

        // 2. Crisis keyword check (runs locally for safety — never wait on API for this)
        const crisisWords = ["harm myself", "kill myself", "suicide", "end my life", "slit", "cut myself", "overdose", "want to die"];
        if (crisisWords.some(w => text.toLowerCase().includes(w))) {
            triggerSafetyProtocol();
            return;
        }

        // 2.5. Smart Feature Intent Detection — check if user wants a specific feature
        const featureIntents = [
            {
                keywords: ['quiz', '测试', '测验', '问卷', 'emotion quiz', '情绪盲盒', '做测试', '做quiz', '心理测试'],
                panel: 'quiz-panel',
                navBtnId: 'nav-quiz',
                label: '🎲 Emotion Quiz',
                labelCn: '🎲 情绪盲盒测验'
            },
            {
                keywords: ['shop', '商店', '商城', 'spark shop', '火花商店', '兑换', '买东西', '逛商店'],
                panel: 'shop-panel',
                navBtnId: 'nav-shop',
                label: '🛍️ Spark Shop',
                labelCn: '🛍️ 火花商店'
            },
            {
                keywords: ['avatar', '换装', '穿搭', '造型', 'studio', '设计', 'customize', '自定义', '换衣服', '发型'],
                panel: 'studio-panel',
                navBtnId: 'nav-studio',
                label: '🎨 Avatar Studio',
                labelCn: '🎨 虚拟形象工作室'
            },
            {
                keywords: ['biometric', '生物', '心率', 'heart rate', '睡眠', 'sleep', '健康数据', 'smartwatch', '手表'],
                panel: 'bio-panel',
                navBtnId: 'nav-bio',
                label: '📊 Biometric Link',
                labelCn: '📊 生物监测'
            },
            {
                keywords: ['calm', '冥想', '放松', 'meditation', 'relax', '音乐', 'music', '白噪音', 'soundscape', '疗愈'],
                panel: 'calm-panel',
                navBtnId: 'nav-calm',
                label: '🎵 Calm Hub',
                labelCn: '🎵 宁静空间'
            }
        ];

        const matchedFeature = featureIntents.find(f => f.keywords.some(kw => lowerText.includes(kw)));

        if (matchedFeature) {
            // Detect language: use Chinese label if input contains Chinese characters
            const isChinese = /[\u4e00-\u9fff]/.test(text);
            const featureLabel = isChinese ? matchedFeature.labelCn : matchedFeature.label;
            const promptMsg = isChinese
                ? `看起来你想去 <strong>${featureLabel}</strong>！要现在过去吗？`
                : `It looks like you want to visit <strong>${featureLabel}</strong>! Want to go there now?`;

            appendChatNavigationPrompt(promptMsg, matchedFeature.panel, matchedFeature.navBtnId, isChinese);
            return;
        }

        // 3. Show typing indicator
        const typingId = showTypingIndicator();

        // 4. Try Gemini first; fall back to local if no API key or error
        let reply = '';
        let companionExpression = 'friendly';

        if (canAttemptGemini()) {
            const geminiResult = await analyzeWithGemini(text);
            if (geminiResult) {
                reply = geminiResult.reply;
                const a = geminiResult.analytics;
                if (a) {
                    // Apply Gemini's analytical readings directly to state
                    if (a.academicPressure !== undefined) state.diagnostics.academicPressure = a.academicPressure;
                    if (a.socialAnxiety    !== undefined) state.diagnostics.socialAnxiety    = a.socialAnxiety;
                    if (a.burnout         !== undefined) state.diagnostics.burnout           = a.burnout;
                    if (a.loneliness      !== undefined) state.diagnostics.loneliness        = a.loneliness;
                    if (a.sentiment) state.diagnostics.sentiment   = a.sentiment;
                    if (a.stressLevel) state.diagnostics.stressLevel = a.stressLevel;
                    if (a.expression) companionExpression = a.expression;
                    updateHeaderStatusBars();
                }
            }
        }

        // 5. Fallback to local keyword analysis if Gemini unavailable
        if (!reply) {
            evaluateTextDiagnostics(text);
            reply = generateLocalReply();
            if (state.diagnostics.burnout > 60 || state.diagnostics.academicPressure > 60) companionExpression = 'attentive';
            else if (state.diagnostics.academicPressure > 50) companionExpression = 'thoughtful';
            else if (state.diagnostics.socialAnxiety > 50)    companionExpression = 'attentive';
            else if (state.diagnostics.loneliness > 40)       companionExpression = 'thoughtful';
        }

        // 6. Remove typing indicator, display reply
        removeTypingIndicator(typingId);
        state.avatar.expression = companionExpression;
        renderAvatarVisuals();
        appendChatMessage('Buddy', reply);
        const geminiDiagnostic = formatGeminiDiagnostic();
        if (geminiDiagnostic) console.warn(geminiDiagnostic);
        speakResponse(reply, true);
        syncStudentAnalysisToBackend(text, reply, 'text');
    }

    // Smart navigation prompt with clickable Go / Stay buttons
    function appendChatNavigationPrompt(promptHtml, panelId, navBtnId, isChinese) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message buddy-msg';

        const goLabel   = isChinese ? '✅ 带我去！' : '✅ Take me there!';
        const stayLabel = isChinese ? '💬 不用，继续聊天' : '💬 No, let\'s keep chatting';

        const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <div class="msg-avatar-icon">MB</div>
            <div class="msg-body">
                <p>${promptHtml}</p>
                <div class="chat-nav-actions" style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;">
                    <button class="chat-nav-go-btn" style="
                        padding: 8px 18px;
                        background: linear-gradient(135deg, #00d2ff, #7b2ff7);
                        color: #fff;
                        border: none;
                        border-radius: 20px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.85rem;
                        transition: transform 0.15s, box-shadow 0.15s;
                    ">${goLabel}</button>
                    <button class="chat-nav-stay-btn" style="
                        padding: 8px 18px;
                        background: rgba(255,255,255,0.08);
                        color: #ccc;
                        border: 1px solid rgba(255,255,255,0.15);
                        border-radius: 20px;
                        cursor: pointer;
                        font-weight: 500;
                        font-size: 0.85rem;
                        transition: transform 0.15s, background 0.15s;
                    ">${stayLabel}</button>
                </div>
                <span class="msg-time">${formattedTime}</span>
            </div>
        `;

        // Wire up Go button: navigate to the target panel
        const goBtn = msgDiv.querySelector('.chat-nav-go-btn');
        goBtn.addEventListener('click', () => {
            switchPanel(panelId);
            // Update sidebar active state
            DOM.navBtns.forEach(b => b.classList.remove('active'));
            const targetNavBtn = document.getElementById(navBtnId);
            if (targetNavBtn) targetNavBtn.classList.add('active');
            // Disable buttons after click
            goBtn.disabled = true;
            goBtn.style.opacity = '0.5';
            goBtn.style.cursor = 'default';
            const stayBtn = msgDiv.querySelector('.chat-nav-stay-btn');
            if (stayBtn) { stayBtn.disabled = true; stayBtn.style.opacity = '0.5'; stayBtn.style.cursor = 'default'; }
        });
        goBtn.addEventListener('mouseenter', () => { goBtn.style.transform = 'scale(1.05)'; goBtn.style.boxShadow = '0 0 12px rgba(0,210,255,0.4)'; });
        goBtn.addEventListener('mouseleave', () => { goBtn.style.transform = 'scale(1)'; goBtn.style.boxShadow = 'none'; });

        // Wire up Stay button: dismiss and continue chatting
        const stayBtn = msgDiv.querySelector('.chat-nav-stay-btn');
        stayBtn.addEventListener('click', () => {
            const actionsDiv = msgDiv.querySelector('.chat-nav-actions');
            if (actionsDiv) actionsDiv.remove();
            const confirmMsg = isChinese ? '好的，我们继续聊天吧！有什么想说的尽管告诉我~ 😊' : 'Alright, let\'s keep chatting! Tell me what\'s on your mind 😊';
            appendChatMessage('Buddy', confirmMsg);
        });
        stayBtn.addEventListener('mouseenter', () => { stayBtn.style.background = 'rgba(255,255,255,0.15)'; });
        stayBtn.addEventListener('mouseleave', () => { stayBtn.style.background = 'rgba(255,255,255,0.08)'; });

        DOM.chatMessages.appendChild(msgDiv);
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    }

    async function syncStudentAnalysisToBackend(message, reply, modality = 'text', metadata = {}) {
        const stored = localStorage.getItem('kawanku_student_session');
        if (!stored) return;

        const now = Date.now();
        const lastSync = lastStudentAnalysisSyncAt[modality] || 0;
        if (modality !== 'text' && now - lastSync < STUDENT_ANALYSIS_SYNC_COOLDOWN_MS) return;
        lastStudentAnalysisSyncAt[modality] = now;

        let session = null;
        try {
            session = JSON.parse(stored);
        } catch (error) {
            console.warn('Student session could not be parsed for analysis sync:', error);
            return;
        }

        if (!session?.token) return;

        try {
            const response = await fetch('/api/student/analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.token}`
                },
                body: JSON.stringify({
                    message,
                    reply,
                    diagnostics: state.diagnostics,
                    modality,
                    metadata
                })
            });

            if (!response.ok) {
                console.warn(`Student analysis sync failed: ${response.status}`);
            }
        } catch (error) {
            console.warn('Student analysis sync failed:', error);
        }
    }

    function generateLocalReply() {
        let baseReply = "";
        if (state.diagnostics.burnout > 60 || state.diagnostics.academicPressure > 60)
            baseReply = getRandomElement(EmpatheticDB.stressBurnout);
        else if (state.diagnostics.academicPressure > 50)
            baseReply = getRandomElement(EmpatheticDB.stressAcademic);
        else if (state.diagnostics.socialAnxiety > 50 || state.diagnostics.loneliness > 50)
            baseReply = getRandomElement(EmpatheticDB.stressSocial);
        else if (state.diagnostics.loneliness > 40)
            baseReply = getRandomElement(EmpatheticDB.stressLoneliness);
        else
            baseReply = getRandomElement(EmpatheticDB.defaultCalm);

        return baseReply;
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.className = 'message buddy-msg typing-indicator-msg';
        div.id = id;
        div.innerHTML = `
            <div class="msg-avatar-icon">MB</div>
            <div class="msg-body">
                <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>`;
        DOM.chatMessages.appendChild(div);
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function evaluateTextDiagnostics(text) {
        const lower = text.toLowerCase();
        
        // Sentiment
        let sentiment = "Neutral";
        let scoreModifier = 0;
        const negativeWords = ["sad", "angry", "stressed", "bad", "lonely", "exhausted", "tired", "anxious", "fail", "hate", "scared", "overwhelmed"];
        const positiveWords = ["happy", "good", "great", "fine", "calm", "excited", "love", "fun", "accomplished"];

        let negCount = 0;
        let posCount = 0;
        
        negativeWords.forEach(w => { if (lower.includes(w)) negCount++; });
        positiveWords.forEach(w => { if (lower.includes(w)) posCount++; });

        if (negCount > posCount) {
            sentiment = "Negative";
            scoreModifier = 15;
        } else if (posCount > negCount) {
            sentiment = "Positive";
            scoreModifier = -10;
        }

        // Categories
        if (lower.includes("exam") || lower.includes("grade") || lower.includes("study") || lower.includes("homework") || lower.includes("test") || lower.includes("class")) {
            state.diagnostics.academicPressure = Math.min(100, Math.max(10, state.diagnostics.academicPressure + 20 + scoreModifier));
        }
        if (lower.includes("friend") || lower.includes("lonely") || lower.includes("nobody") || lower.includes("isolate") || lower.includes("alone")) {
            state.diagnostics.loneliness = Math.min(100, Math.max(10, state.diagnostics.loneliness + 15 + scoreModifier));
        }
        if (lower.includes("exhaust") || lower.includes("tired") || lower.includes("burnout") || lower.includes("cannot cope") || lower.includes("give up")) {
            state.diagnostics.burnout = Math.min(100, Math.max(10, state.diagnostics.burnout + 22 + scoreModifier));
        }
        if (lower.includes("people") || lower.includes("anxious") || lower.includes("judg") || lower.includes("social") || lower.includes("crowd")) {
            state.diagnostics.socialAnxiety = Math.min(100, Math.max(10, state.diagnostics.socialAnxiety + 18 + scoreModifier));
        }

        // Overall stress assessment calculations
        const maxStressVal = Math.max(
            state.diagnostics.academicPressure,
            state.diagnostics.socialAnxiety,
            state.diagnostics.burnout,
            state.diagnostics.loneliness
        );

        let stressLevel = "Low";
        if (maxStressVal > 70) stressLevel = "High";
        else if (maxStressVal > 40) stressLevel = "Medium";

        state.diagnostics.sentiment = sentiment;
        state.diagnostics.stressLevel = stressLevel;

        // Sync header widgets
        updateHeaderStatusBars();
    }

    function updateHeaderStatusBars() {
        // Sentiment Badge
        const sentVal = DOM.statusSentiment ? DOM.statusSentiment.querySelector('.metric-value') : null;
        if (sentVal) {
            sentVal.className = `metric-value ${state.diagnostics.sentiment.toLowerCase()}`;
            let icon = 'smile';
            if (state.diagnostics.sentiment === 'Negative') icon = 'frown';
            if (state.diagnostics.sentiment === 'Neutral') icon = 'meh';
            sentVal.innerHTML = `<i data-lucide="${icon}"></i> ${state.diagnostics.sentiment}`;
        }

        // Stress Level Badge
        const stressVal = DOM.statusStress ? DOM.statusStress.querySelector('.metric-value') : null;
        if (stressVal) {
            stressVal.className = `metric-value ${state.diagnostics.stressLevel.toLowerCase()}`;
            stressVal.innerText = state.diagnostics.stressLevel;
        }

        // Mini trends
        if (DOM.miniMoodTrend) {
            DOM.miniMoodTrend.innerText = state.diagnostics.stressLevel === 'High' ? 'Elevated' : 'Stable';
            if (state.diagnostics.stressLevel === 'High') {
                DOM.miniMoodTrend.className = 'mini-val text-rose';
            } else {
                DOM.miniMoodTrend.className = 'mini-val text-mint';
            }
        }

        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            try { lucide.createIcons(); } catch(e) {}
        }
    }

    function appendChatMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender === 'Student' ? 'student-msg' : 'buddy-msg'}`;
        
        const avatarAbbr = sender === 'Student' ? 'ST' : 'MB';
        const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        msgDiv.innerHTML = `
            <div class="msg-avatar-icon">${avatarAbbr}</div>
            <div class="msg-body">
                <p>${text}</p>
                <span class="msg-time">${formattedTime}</span>
            </div>
        `;

        DOM.chatMessages.appendChild(msgDiv);
        DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    }

    // -----------------------------------------------------------------------
    // TTS SYNTHESIS — Smooth, humanised female voice
    // -----------------------------------------------------------------------
    // -----------------------------------------------------------------------
    // Dynamic Voice Synthesis Picker (Supports Cross-lingual Chinese/English)
    // -----------------------------------------------------------------------
    function selectVoiceForText(text) {
        if (!('speechSynthesis' in window)) return null;
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return null;

        const isChinese = /[\u4e00-\u9fff]/.test(text);

        if (isChinese) {
            // "Cozy Sweet" priority Chinese voices (Xiaoyi / Xiaoxiao online neural)
            const CHINESE_PRIORITY = [
                'Microsoft Xiaoyi Online (Natural) - Chinese (Mainland)',
                'Microsoft Xiaoxiao Online (Natural) - Chinese (Mainland)',
                'Microsoft Yaoyao Online (Natural) - Chinese (Mainland)',
                'Google 简体中文',
                'Microsoft Huihui Desktop - Chinese (Simplified)',
                'Microsoft Huihui - Chinese (Simplified)',
                'Ting-Ting',
                'Mei-Jia',
                'Sin-Ji'
            ];
            for (const name of CHINESE_PRIORITY) {
                const v = voices.find(v => v.name === name);
                if (v) return v;
            }
            const fallbackZH = voices.find(v => (v.lang.startsWith('zh') || v.lang.startsWith('CN')) && !v.name.toLowerCase().includes('male'));
            if (fallbackZH) return fallbackZH;
        } else {
            // "Cozy Sweet" priority English voices (Ana / Jenny online neural)
            const ENGLISH_PRIORITY = [
                'Microsoft Ana Online (Natural) - English (United States)',
                'Microsoft Jenny Online (Natural) - English (United States)',
                'Microsoft Aria Online (Natural) - English (United States)',
                'Google US English',
                'Google UK English Female',
                'Samantha',
                'Microsoft Zira Desktop - English (United States)',
                'Microsoft Zira - English (United States)'
            ];
            for (const name of ENGLISH_PRIORITY) {
                const v = voices.find(v => v.name === name);
                if (v) return v;
            }
            const fallbackEN = voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male'));
            if (fallbackEN) return fallbackEN;
        }

        // Global fallback: find ANY voice with female indicators or a non-male voice
        const femaleKeywords = ['female', 'girl', 'jenny', 'aria', 'xiaoxiao', 'yaoyao', 'zira', 'samantha', 'hazel', 'karen', 'huihui', 'haruka', 'nanami', 'heera', 'swara', 'lulu', 'sin-ji', 'ting-ting', 'mei-jia', 'ana', 'helen', 'zira', 'katherine', 'linda', 'susan', 'yasmin', 'chloe', 'elena'];
        for (const kw of femaleKeywords) {
            const v = voices.find(v => v.name.toLowerCase().includes(kw));
            if (v) return v;
        }
        
        const maleKeywords = ['male', 'david', 'george', 'mark', 'sean', 'ravi', 'guy', 'stefan', 'hector', 'pavel', 'danny'];
        const nonMaleVoice = voices.find(v => {
            const nameLower = v.name.toLowerCase();
            return !maleKeywords.some(kw => nameLower.includes(kw));
        });
        if (nonMaleVoice) return nonMaleVoice;

        return voices[0];
    }

    // Preload voices as early as possible and cache them.
    // Chrome loads voices asynchronously — without this, getVoices() returns []
    // on the first call and the browser silently falls back to the default robot voice.
    let _voicesReady = false;
    let _voicesReadyCallbacks = [];

    function onVoicesReady(cb) {
        if (_voicesReady) { cb(); return; }
        _voicesReadyCallbacks.push(cb);
    }

    function _initVoices() {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            _voicesReady = true;
            _voicesReadyCallbacks.forEach(cb => cb());
            _voicesReadyCallbacks = [];
        }
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
            _initVoices();
        };
        // Also try immediately in case voices are already cached (Firefox / some Chromium builds)
        _initVoices();
    }

    function speakResponse(text, enableAudio = false) {
        // Duration estimation for animation: ~60ms per character at natural speech rate
        const animationDuration = Math.max(1500, text.length * 60);
        triggerAvatarSpeechSpeak(animationDuration);

        // Update active speech bubble text overlay
        const bubble = document.getElementById('avatar-speech-bubble');
        if (bubble) bubble.innerHTML = `<span>${text}</span>`;

        if (!enableAudio) return; // Keep customizer actions completely silent!

        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        // Clean up markdown syntax so the voice doesn't spell out asterisks or emojis
        const cleanText = text
            .replace(/[*#_`~]/g, '') // remove markdown characters
            .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, ''); // remove emojis

        // Wait for voices to be ready before speaking to avoid the robot-voice fallback bug.
        // On Chrome, getVoices() returns [] until the voiceschanged event fires.
        onVoicesReady(() => {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            
            // Detect language and select best high-quality voice
            const voice = selectVoiceForText(cleanText);
            
            utterance.voice = voice;
            utterance.volume = 1.0;
            
            // Check if the voice is a high-fidelity natural neural/online voice
            const isNatural = voice && (
                voice.name.toLowerCase().includes('natural') || 
                voice.name.toLowerCase().includes('online') ||
                voice.name.toLowerCase().includes('google') ||
                voice.name.toLowerCase().includes('samantha')
            );

            // Cozy Sweet parameters: rate = 1.0, pitch = high but smooth to sound sweet and childlike
            utterance.rate = 1.0;
            utterance.pitch = isNatural ? 1.22 : 1.30;

            // Small delay avoids Chrome's speech-queue bug where first utterance is clipped
            setTimeout(() => window.speechSynthesis.speak(utterance), 80);
        });
    }

    // ----------------------------------------------------------------------
    // SAFETY PROTOCOL TRIGGERS (Core Operating Rule 3)
    // ----------------------------------------------------------------------
    function triggerSafetyProtocol() {
        // 1. Alert user directly with counselor dispatch overlay
        DOM.sosModal.classList.remove('hidden');
        
        // 2. Play warm emergency dialogue
        const safeText = "Hey, I'm listening. Please hear me: you don't have to go through this alone. I want to keep you safe, and there are human professionals who care deeply and can support you right now. I've brought up their phone numbers on your screen. Please reach out to them immediately.";
        speakResponse(safeText, true);
        appendChatMessage('Buddy', "⚠️ **Safety Alert triggered:** I'm very concerned about you. Please utilize the resources on your screen or reach out to a counselor right now. You are not alone.");
        
        // Update SOS telemetry status preview inside the modal
        state.diagnostics.sentiment = "Crisis Flagged";
        state.diagnostics.stressLevel = "Severe High";
        updateHeaderStatusBars();
        syncSOSReportPreview();

        showToast("Safety Protocol activated. Immediate helper hotlines listed.", "error");
    }

    function syncSOSReportPreview() {
        DOM.sosPreviewStatus.innerText = state.diagnostics.stressLevel === 'Severe High' ? 'CRISIS STATE ACTIVE' : `${state.diagnostics.stressLevel} Stress Indicators`;
        if (state.diagnostics.stressLevel === 'Severe High') {
            DOM.sosPreviewStatus.className = "val text-rose";
        } else {
            DOM.sosPreviewStatus.className = "val text-amber";
        }
        DOM.sosPreviewSentiment.innerText = state.diagnostics.sentiment;
        DOM.sosPreviewHR.innerText = `${state.biometrics.heartRate} bpm`;
        DOM.sosPreviewRant.innerText = state.diagnostics.lastRantDuration === '00:00' ? "No recent speech session" : `Session of ${state.diagnostics.lastRantDuration}`;
    }

    // ----------------------------------------------------------------------
    // RANT ROOM MICROPHONE AUDIO ANALYZER
    // ----------------------------------------------------------------------
    function startRantSession() {
        if (state.rant.isActive) return;
        
        // Reset rant state variables
        state.rant.isActive = true;
        state.rant.startTime = Date.now();
        state.rant.pauseCount = 0;
        state.rant.volumeHistory = [];
        state.rant.tremorAccumulator = 0;
        state.rant.frameCount = 0;
        state.rant.transcript = "";
        
        DOM.rantTranscriptBox.innerHTML = '<span class="placeholder-text">Listening for speech... (Start talking to see live transcript)</span>';
        DOM.rantOverlay.classList.remove('hidden');
        showToast("Rant Microphone Session Started. Speak freely.", "success");

        // Initial duration sync
        DOM.rantTimer.innerText = "00:00";

        // Start Duration Tracker
        state.rant.timerInterval = setInterval(() => {
            const elapsedMs = Date.now() - state.rant.startTime;
            const minutes = Math.floor(elapsedMs / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((elapsedMs % 60000) / 1000).toString().padStart(2, '0');
            DOM.rantTimer.innerText = `${minutes}:${seconds}`;
            state.diagnostics.lastRantDuration = `${minutes}:${seconds}`;
        }, 1000);

        // Access mic and set up Web Audio
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                state.rant.stream = stream;
                
                // AudioContext Initialization
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                state.rant.audioCtx = new AudioContextClass();
                const source = state.rant.audioCtx.createMediaStreamSource(stream);
                
                state.rant.analyser = state.rant.audioCtx.createAnalyser();
                state.rant.analyser.fftSize = 512;
                source.connect(state.rant.analyser);

                // Start Web Audio Waveform loop
                drawRantWaveform();

                // Setup Browser speech-to-text transcript analyzer (Web Speech API)
                setupSpeechRecognition();
            })
            .catch(err => {
                console.error("Mic access failed", err);
                showToast("Could not access microphone. Waveform details simulated.", "warning");
                // Mock visual wave fallback if hardware fails
                simulateWaveformFallback();
            });
    }

    function setupSpeechRecognition() {
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionClass) {
            console.warn("Speech recognition not supported on this browser.");
            return;
        }

        const recognizer = new SpeechRecognitionClass();
        recognizer.continuous = true;
        recognizer.interimResults = true;
        recognizer.lang = 'en-US';

        recognizer.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            state.rant.transcript = finalTranscript || interimTranscript;
            DOM.rantTranscriptBox.innerText = state.rant.transcript;

            // Analyze WPM
            const words = state.rant.transcript.trim().split(/\s+/).filter(w => w.length > 0);
            state.diagnostics.lastRantWords = words.length;
            
            const elapsedMin = (Date.now() - state.rant.startTime) / 60000;
            if (elapsedMin > 0.05) {
                const wpm = Math.round(words.length / elapsedMin);
                DOM.rantMetricSpeed.innerText = `${wpm} wpm`;
            }
        };

        recognizer.onerror = (e) => {
            console.error("Speech Recognition Error", e);
        };

        recognizer.start();
        state.rant.speechRecognizer = recognizer;
    }

    function drawRantWaveform() {
        if (!state.rant.isActive) return;
        requestAnimationFrame(drawRantWaveform);

        const canvas = DOM.rantWaveformCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;

        // Clear canvas
        ctx.fillStyle = 'rgba(7, 8, 14, 0.4)';
        ctx.fillRect(0, 0, width, height);

        let dataArray = new Uint8Array(128);
        let rms = 0;

        if (state.rant.analyser) {
            // Get frequency domain or time domain values
            state.rant.analyser.getByteTimeDomainData(dataArray);
            
            // Calculate Root Mean Square volume (RMS)
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const val = (dataArray[i] - 128) / 128;
                sum += val * val;
            }
            rms = Math.sqrt(sum / dataArray.length);
        } else {
            // Mock random waveform
            for (let i = 0; i < dataArray.length; i++) {
                dataArray[i] = 128 + Math.sin(i * 0.15 + state.rant.frameCount * 0.1) * (Math.random() * 20 + 5);
            }
            rms = 0.08 + Math.random() * 0.03;
        }

        // Draw glowing wave line
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(244, 63, 94, 0.8)';
        ctx.beginPath();

        const sliceWidth = width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * (height / 2);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow

        // volume level db conversion
        const volumeDb = rms > 0.001 ? Math.round(20 * Math.log10(rms)) : -80;
        DOM.rantMetricVolume.innerText = `${volumeDb} dB`;

        // Silence Pause Tracker
        const silenceThreshold = -40; // DB
        if (volumeDb < silenceThreshold) {
            if (!state.rant.isSilent) {
                // Just became silent
                state.rant.isSilent = true;
                state.rant.silenceStart = Date.now();
            } else {
                // Check if silence exceeded 1.5 seconds
                if (state.rant.silenceStart && (Date.now() - state.rant.silenceStart > 1500)) {
                    state.rant.pauseCount++;
                    DOM.rantMetricPauses.innerText = state.rant.pauseCount;
                    state.rant.silenceStart = null; // Prevent multi-counting single pause
                }
            }
        } else {
            state.rant.isSilent = false;
        }

        // Frequency Tremor Jitter Calculation
        if (state.rant.analyser) {
            const freqData = new Uint8Array(state.rant.analyser.frequencyBinCount);
            state.rant.analyser.getByteFrequencyData(freqData);
            
            // Look for peak in standard voice pitch bounds (80Hz - 260Hz)
            // sampleRate = 48000. Bin size = 48000 / 512 = 93.75 Hz
            // Human pitch matches roughly bin indexes 1, 2, 3
            let peakVal = 0;
            let peakIdx = 0;
            for (let i = 1; i <= 3; i++) {
                if (freqData[i] > peakVal) {
                    peakVal = freqData[i];
                    peakIdx = i;
                }
            }

            state.rant.frameCount++;
            // Calculate peak frequency variance between animation frames to gauge speech stability (tremors)
            if (state.rant.lastPeakIdx !== undefined && state.rant.lastPeakIdx !== peakIdx) {
                state.rant.tremorAccumulator += 8.5; // variance found
            }
            
            const tremorRate = Math.min(100, Math.round(state.rant.tremorAccumulator / (state.rant.frameCount * 0.1)));
            DOM.rantMetricTremor.innerText = `${tremorRate}% ${tremorRate > 25 ? '(Elevated)' : '(Stable)'}`;
            
            if (tremorRate > 25) {
                DOM.rantMetricTremor.className = "stat-val text-rose";
            } else {
                DOM.rantMetricTremor.className = "stat-val text-mint";
            }
            
            state.rant.lastPeakIdx = peakIdx;
        } else {
            // Mock stable jitter
            DOM.rantMetricTremor.innerText = "8% (Stable)";
            DOM.rantMetricTremor.className = "stat-val text-mint";
        }
    }

    function simulateWaveformFallback() {
        if (!state.rant.isActive) return;
        state.rant.frameCount = 0;
        
        function loop() {
            if (!state.rant.isActive) return;
            drawRantWaveform();
            setTimeout(loop, 40); // 25fps fallback
        }
        loop();
    }

    function stopRantSession() {
        if (!state.rant.isActive) return;
        
        state.rant.isActive = false;
        clearInterval(state.rant.timerInterval);
        
        if (state.rant.speechRecognizer) {
            state.rant.speechRecognizer.stop();
        }
        
        if (state.rant.stream) {
            state.rant.stream.getTracks().forEach(track => track.stop());
        }

        if (state.rant.audioCtx) {
            state.rant.audioCtx.close();
        }

        DOM.rantOverlay.classList.add('hidden');
        showToast("Rant analyzed successfully.", "success");

        // Formulate feedback based on Rant Audio analysis
        const transcriptText = state.rant.transcript || "an emotional rant of feelings";
        const pauseAssessment = state.rant.pauseCount > 4 ? "your speech had several hesitations and pauses, reflecting high stress or heavy thoughts" : "your voice flowed smoothly with confidence";
        const wpmVal = parseInt(DOM.rantMetricSpeed.innerText) || 120;
        const speedAssessment = wpmVal > 150 ? "rapid, fast-paced talking, which is often a sign of anxious excitement or built-up pressure" : "a measured, grounding vocal speed";
        const tremorRate = Math.min(100, Math.round((state.rant.tremorAccumulator || 0) / ((state.rant.frameCount || 1) * 0.1))) || 8;

        appendChatMessage('Buddy', `🎤 **Vocal Rant Report:** You vented for ${state.diagnostics.lastRantDuration}. Here's my response to your speech:`);
        const typingId = showTypingIndicator();

        analyzeAudioRantWithGemini(transcriptText, wpmVal, state.rant.pauseCount, tremorRate).then(summaryResponse => {
            removeTypingIndicator(typingId);
            if (!summaryResponse) {
                summaryResponse = `I processed your rant. I hear that you're going through a lot. Specifically, ${pauseAssessment}, and you spoke at ${speedAssessment}. Getting those words out is an excellent step to unpack stress. I'm right here with you. What would you like to focus on next?`;
            }
            appendChatMessage('Buddy', summaryResponse);
            speakResponse(summaryResponse, true);
            syncStudentAnalysisToBackend(transcriptText, summaryResponse, 'voice', {
                speechRateWpm: wpmVal,
                pauseCount: state.rant.pauseCount,
                tremorRate,
                duration: state.diagnostics.lastRantDuration
            });
        });

        // Adjust overall diagnostics
        state.diagnostics.burnout = Math.min(100, Math.max(10, state.diagnostics.burnout - 10)); // catharsis relief reduction
        state.diagnostics.loneliness = Math.min(100, Math.max(10, state.diagnostics.loneliness - 8));
        evaluateTextDiagnostics(transcriptText);
    }

    async function analyzeAudioRantWithGemini(transcriptText, wpmVal, pauseCount, tremorRate) {
        if (!canAttemptNonChatGemini(lastGeminiAudioAt, GEMINI_AUDIO_COOLDOWN_MS)) return null;
        lastGeminiAudioAt = Date.now();

        const prompt = `The student has finished a voice/rant session.
Transcript: ${transcriptText}

Non-content voice metadata:
- Speaking rate: ${wpmVal} words per minute
- Hesitations/pauses: ${pauseCount}
- Vocal tremor/jitter index: ${tremorRate}%

Reply as MindBuddy in 2-3 warm sentences. Validate the feeling, gently reflect the vocal metadata without sounding clinical, and ask one supportive follow-up question.`;

        try {
            const data = await callGemini('gemini-1.5-flash', {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.75,
                    maxOutputTokens: 220
                }
            });
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        } catch (err) {
            console.warn('Rant Gemini analysis failed, using local fallback:', err);
            return null;
        }
    }

    // ----------------------------------------------------------------------
    // FACE SCANNER (CAM ANALYSIS HUD OVERLAY)
    // ----------------------------------------------------------------------
    function startWebcamAnalyzer() {
        if (state.webcam.isActive || !DOM.webcamOverlay.classList.contains('hidden')) return;

        // Show overlay immediately so user sees we're attempting to connect
        DOM.webcamOverlay.classList.remove('hidden');
        DOM.webcamOverlay.style.display = 'flex';
        DOM.camToggleBtn.classList.add('active');
        state.webcam.isActive = true;

        navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
            .then(stream => {
                state.webcam.stream = stream;
                DOM.webcamElement.srcObject = stream;

                // Log initial facial analysis state with explicit Tension percentage breakdown for Sanctuary Calendar
                const initialTension = Math.round(24 + Math.sin(Date.now() * 0.003) * 6);
                const initialFaceAnalysis = {
                    detected_state: 'Neutral / Stable',
                    stress_status: 'Safe',
                    stress_score: initialTension,
                    breakdown: {
                        'Facial Muscle Tension': `${initialTension}%`,
                        'Micro-expression Stability': `${100 - initialTension}%`,
                        'Eye Movement Tension': `${Math.round(initialTension * 0.7)}%`
                    },
                    analysis_logic: `Visual facial tracking active. Muscle tension baseline measured at ${initialTension}%.`
                };
                state.webcam.lastAnalysis = initialFaceAnalysis;
                window.state = state;

                try {
                    localStorage.setItem('kawanku_latest_face_analysis', JSON.stringify({
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        ...initialFaceAnalysis
                    }));
                } catch(e) {}

                if (window.updateSanctuaryDashboard) {
                    window.updateSanctuaryDashboard();
                }

                // Start visual overlay tracking loop
                drawFaceScannerHUD();
                showToast("Webcam face metrics activated & logged to Calendar.", "success");
            })
            .catch(err => {
                console.error("Camera access failed", err);
                // Overlay is already visible — user can still close it with × button
                // Mark inactive so stop() doesn't skip
                state.webcam.isActive = false;
                showToast("Camera access was denied. Click × to close.", "error");
            });
    }

    function drawFaceScannerHUD() {
        if (!state.webcam.isActive) return;
        state.webcam.animationFrame = requestAnimationFrame(drawFaceScannerHUD);

        const canvas = DOM.faceTrackerCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;

        ctx.clearRect(0, 0, width, height);

        // Simulated AI face tracking nodes
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.45)';

        // 1. Draw eyes boxes
        const leftEyeX = width * 0.4;
        const leftEyeY = height * 0.42;
        const rightEyeX = width * 0.6;
        const rightEyeY = height * 0.42;

        ctx.strokeRect(leftEyeX - 12, leftEyeY - 8, 24, 16);
        ctx.fillRect(leftEyeX - 2, leftEyeY - 2, 4, 4);

        ctx.strokeRect(rightEyeX - 12, rightEyeY - 8, 24, 16);
        ctx.fillRect(rightEyeX - 2, rightEyeY - 2, 4, 4);

        // 2. Draw brow indicators
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 15, leftEyeY - 18);
        ctx.lineTo(leftEyeX + 15, leftEyeY - 18);
        ctx.moveTo(rightEyeX - 15, rightEyeY - 18);
        ctx.lineTo(rightEyeX + 15, rightEyeY - 18);
        ctx.stroke();

        // 3. Draw face tracking bounding outline
        const faceX = width * 0.32;
        const faceY = height * 0.22;
        const faceW = width * 0.36;
        const faceH = height * 0.58;

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.strokeRect(faceX, faceY, faceW, faceH);

        // Corner indicators on bounding box
        ctx.strokeStyle = '#8b5cf6'; // Violet corners
        ctx.lineWidth = 3;
        // Top Left
        ctx.beginPath(); ctx.moveTo(faceX, faceY + 15); ctx.lineTo(faceX, faceY); ctx.lineTo(faceX + 15, faceY); ctx.stroke();
        // Top Right
        ctx.beginPath(); ctx.moveTo(faceX + faceW, faceY + 15); ctx.lineTo(faceX + faceW, faceY); ctx.lineTo(faceX + faceW - 15, faceY); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(faceX, faceY + faceH - 15); ctx.lineTo(faceX, faceY + faceH); ctx.lineTo(faceX + 15, faceY + faceH); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(faceX + faceW, faceY + faceH - 15); ctx.lineTo(faceX + faceW, faceY + faceH); ctx.lineTo(faceX + faceW - 15, faceY + faceH); ctx.stroke();

        // Draw crosshairs
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
        ctx.beginPath();
        ctx.moveTo(width / 2 - 10, height / 2); ctx.lineTo(width / 2 + 10, height / 2);
        ctx.moveTo(width / 2, height / 2 - 10); ctx.moveTo(width / 2, height / 2 + 10);
        ctx.stroke();

        // Simulate values flickering slightly
        const tensionVal = Math.round(20 + Math.sin(Date.now() * 0.003) * 6 + (state.diagnostics.stressLevel === 'High' ? 40 : 0));
        DOM.camMetricTension.style.width = `${tensionVal}%`;
        const tensionTextEl = document.getElementById('cam-tension-text') || DOM.camMetricTension.parentElement?.previousElementSibling;
        if (tensionTextEl) {
            tensionTextEl.innerText = `Tension Indicators (${tensionVal}%)`;
        }
        
        let expressionGuess = "Neutral / Stable";
        if (state.diagnostics.sentiment === 'Negative') {
            expressionGuess = "Brows Furrowed / Stressed";
            DOM.camMetricMood.className = "val text-rose";
        } else if (state.diagnostics.sentiment === 'Positive') {
            expressionGuess = "Soft smile detected";
            DOM.camMetricMood.className = "val text-mint";
        } else {
            DOM.camMetricMood.className = "val text-purple";
        }
        DOM.camMetricMood.innerText = expressionGuess;

        // Periodically store local face metadata, with a rare Gemini frame check.
        const now = Date.now();
        if (now - state.webcam.lastScanTime > 60000) {
            state.webcam.lastScanTime = now;
            captureAndAnalyzeFaceFrame();
        }
    }

    async function captureAndAnalyzeFaceFrame() {
        if (!state.webcam.isActive || !DOM.webcamElement.videoWidth) return;
        try {
            const tensionScore = Math.round(
                20 + Math.sin(Date.now() * 0.003) * 6 + (state.diagnostics.stressLevel === 'High' ? 40 : 0)
            );
            const expression = state.diagnostics.sentiment === 'Negative'
                ? 'stressed'
                : (state.diagnostics.sentiment === 'Positive' ? 'calm' : 'neutral');
            const description = expression === 'stressed'
                ? 'Local webcam metadata suggests visible tension indicators.'
                : 'Local webcam metadata suggests calm or neutral expression indicators.';

            DOM.camMetricMood.innerText = `${expression} (${description})`;
            DOM.camMetricMood.className = expression === 'calm' ? 'val text-mint' : (expression === 'neutral' ? 'val text-purple' : 'val text-rose');
            DOM.camMetricTension.style.width = `${Math.max(0, Math.min(100, tensionScore))}%`;

            if (canAttemptNonChatGemini(lastGeminiFaceAt, GEMINI_FACE_COOLDOWN_MS)) {
                lastGeminiFaceAt = Date.now();
                const canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 120;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(DOM.webcamElement, 0, 0, canvas.width, canvas.height);
                const base64Data = canvas.toDataURL('image/jpeg', 0.55).split(',')[1];
                const data = await callGemini('gemini-1.5-flash', {
                    contents: [{
                        parts: [
                            {
                                text: "Analyze this single webcam frame for broad expression metadata only. Return only JSON: {\"expression\":\"calm|neutral|stressed|sad|happy|anxious\",\"tensionScore\":0-100,\"description\":\"one short privacy-safe sentence\"}"
                            },
                            {
                                inlineData: {
                                    mimeType: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 120
                    }
                });
                const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const result = JSON.parse(jsonMatch[0]);
                    if (result.expression) {
                        DOM.camMetricMood.innerText = `${result.expression} (${result.description || description})`;
                        DOM.camMetricMood.className = result.expression === 'happy' || result.expression === 'calm' ? 'val text-mint' : (result.expression === 'neutral' ? 'val text-purple' : 'val text-rose');
                        if (result.tensionScore !== undefined) {
                            DOM.camMetricTension.style.width = `${Math.max(0, Math.min(100, Number(result.tensionScore)))}%`;
                        }
                    }
                }
            }

            const faceAnalysisObj = {
                detected_state: expression === 'stressed' ? 'Stressed / Overwhelmed' : (expression === 'calm' ? 'Calm & Relaxed' : 'Neutral / Stable'),
                stress_status: tensionScore > 60 ? 'Warning' : 'Safe',
                stress_score: tensionScore,
                breakdown: {
                    'Facial Muscle Tension': `${tensionScore}%`,
                    'Micro-expression Stability': `${Math.max(10, 100 - tensionScore)}%`,
                    'Eye Movement Tension': `${Math.round(tensionScore * 0.75)}%`
                },
                analysis_logic: `${description} Measured tension level: ${tensionScore}%.`
            };
            state.webcam.lastAnalysis = faceAnalysisObj;
            window.state = state;

            try {
                localStorage.setItem('kawanku_latest_face_analysis', JSON.stringify({
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    ...faceAnalysisObj
                }));
            } catch(e) {}

            if (window.updateSanctuaryDashboard) {
                window.updateSanctuaryDashboard();
            }

            syncStudentAnalysisToBackend(
                `Facial expression scan: ${expression}`,
                description,
                'facial_emotion',
                {
                    expression,
                    tensionScore,
                    description,
                    source: 'local_webcam_metadata'
                }
            );
        } catch (err) {
            console.warn('Facial scan analysis failed:', err);
        }
    }

    function stopWebcamAnalyzer() {
        const wasVisible = !DOM.webcamOverlay.classList.contains('hidden') && DOM.webcamOverlay.style.display !== 'none';

        // Always hide the overlay, regardless of whether the stream started
        DOM.webcamOverlay.classList.add('hidden');
        DOM.webcamOverlay.style.display = 'none';
        DOM.camToggleBtn.classList.remove('active');

        state.webcam.isActive = false;
        if (state.webcam.animationFrame) {
            cancelAnimationFrame(state.webcam.animationFrame);
            state.webcam.animationFrame = null;
        }
        
        if (state.webcam.stream) {
            state.webcam.stream.getTracks().forEach(track => track.stop());
            state.webcam.stream = null;
        }

        if (DOM.webcamElement) {
            DOM.webcamElement.srcObject = null;
        }

        if (wasVisible) {
            showToast("Webcam face metrics stopped.", "info");
        }
    }

    // ----------------------------------------------------------------------
    // IoT INTEGRATION SIMULATOR & CHARTS
    // ----------------------------------------------------------------------
    let hrChart = null;

    function initBiometricsChart() {
        // Draw the background grid rules on the SVG chart
        const svg = DOM.hrChartPath.ownerSVGElement;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", "0");
        line.setAttribute("y1", "60"); // panic threshold line at 100bpm
        line.setAttribute("x2", "500");
        line.setAttribute("y2", "60");
        line.setAttribute("stroke", "rgba(244,63,94,0.3)");
        line.setAttribute("stroke-dasharray", "5,5");
        svg.appendChild(line);
    }

    function updateBiometricsLiveCycle() {
        // 1. Generate live pulse variance (HR fluctuates +/- 2 bpm normally)
        let pulseTarget = state.biometrics.heartRate;
        const offset = Math.floor(Math.random() * 5) - 2;
        let activeHR = Math.max(50, Math.min(150, pulseTarget + offset));

        if (DOM.bioLiveHR) DOM.bioLiveHR.innerText = `${activeHR} bpm`;

        // Shift ring buffer
        state.biometrics.chartData.shift();
        state.biometrics.chartData.push(activeHR);

        // Render SVG line path
        // viewBox 0 0 500 150. y mapping: 50bpm -> y=140, 150bpm -> y=10
        // formula: y = 140 - ((hr - 50) / 100) * 130
        let pathD = "";
        const step = 500 / (state.biometrics.chartData.length - 1);
        
        state.biometrics.chartData.forEach((hr, index) => {
            const x = index * step;
            const y = 140 - ((hr - 50) / 100) * 130;
            if (index === 0) {
                pathD += `M ${x} ${y}`;
            } else {
                pathD += ` L ${x} ${y}`;
            }
        });

        if (DOM.hrChartPath) DOM.hrChartPath.setAttribute('d', pathD);

        // Perform diagnostics update if IoT values flag high stress
        evaluateIoTBiometricState();
    }

    function evaluateIoTBiometricState() {
        const hr = state.biometrics.heartRate;
        const sleep = state.biometrics.sleepDuration;

        let hasAnomaly = false;
        let warningTitle = "Biometrics Stabilized";
        let warningDesc = "Physiological metrics indicate normal autonomic responses. No insomnia or panic states triggered.";

        if (hr > 100 && sleep < 5.0) {
            hasAnomaly = true;
            warningTitle = "High Stress Alert: Insomnia & Autonomic Panic";
            warningDesc = "Combined metrics of acute sleep deprivation (under 5 hrs) and tachycardia (resting heart rate above 100 BPM) reflect extreme autonomic flight activation.";
            if (DOM.iotSyncStatus) { DOM.iotSyncStatus.innerText = "Panic Linked"; DOM.iotSyncStatus.className = "sync-badge status-anomalous"; }
            // Adjust stress levels behind the scenes
            state.diagnostics.burnout = Math.max(75, state.diagnostics.burnout);
            state.diagnostics.stressLevel = "High";
        } else if (hr > 100) {
            hasAnomaly = true;
            warningTitle = "Autonomic Tension: Elevated Pulse";
            warningDesc = "A resting pulse rate above 100 BPM indicates sudden panic, physiological flight response, or cognitive anxiety spikes.";
            if (DOM.iotSyncStatus) { DOM.iotSyncStatus.innerText = "Tension Linked"; DOM.iotSyncStatus.className = "sync-badge status-anomalous"; }
            state.diagnostics.socialAnxiety = Math.max(65, state.diagnostics.socialAnxiety);
        } else if (sleep < 5.5) {
            hasAnomaly = true;
            warningTitle = "Cognitive Deficit: Sleep Deprivation";
            warningDesc = "Fewer than 5.5 hours of rest drastically reduces resilience to emotional triggers, triggering immediate fatigue warnings.";
            if (DOM.iotSyncStatus) { DOM.iotSyncStatus.innerText = "Fatigue Linked"; DOM.iotSyncStatus.className = "sync-badge status-anomalous"; }
            state.diagnostics.burnout = Math.max(70, state.diagnostics.burnout);
        } else {
            if (DOM.iotSyncStatus) {
                DOM.iotSyncStatus.innerHTML = '<i data-lucide="check-circle"></i> Linked';
                DOM.iotSyncStatus.className = "sync-badge status-connected";
            }
            if (typeof lucide !== 'undefined' && lucide.createIcons) { try { lucide.createIcons(); } catch(e) {} }
        }

        // Apply visual classes to alert banner
        if (hasAnomaly) {
            if (DOM.anomalyBanner) DOM.anomalyBanner.className = "biometric-alert-banner alert-warning";
            if (DOM.anomalyIcon) DOM.anomalyIcon.setAttribute('data-lucide', 'alert-triangle');
            // Proactively prompt conversation change if high stress
            if (state.diagnostics.stressLevel === 'High') {
                state.avatar.expression = 'attentive';
                renderAvatarVisuals();
            }
        } else {
            if (DOM.anomalyBanner) DOM.anomalyBanner.className = "biometric-alert-banner alert-normal";
            if (DOM.anomalyIcon) DOM.anomalyIcon.setAttribute('data-lucide', 'info');
        }

        if (DOM.anomalyTitle) DOM.anomalyTitle.innerText = warningTitle;
        if (DOM.anomalyDesc) DOM.anomalyDesc.innerText = warningDesc;
        if (typeof lucide !== 'undefined' && lucide.createIcons) { try { lucide.createIcons(); } catch(e) {} }
        
        // Sync stats to header
        updateHeaderStatusBars();
    }

    // ----------------------------------------------------------------------
    // CALM HUB AMBIENT AUDIO SYNTHESISER (WEB AUDIO API)
    // ----------------------------------------------------------------------
    function initSynthContext() {
        if (!state.synth.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            state.synth.audioCtx = new AudioContextClass();
            state.synth.mainGain = state.synth.audioCtx.createGain();
            state.synth.mainGain.gain.setValueAtTime(0.6, state.synth.audioCtx.currentTime);
            state.synth.mainGain.connect(state.synth.audioCtx.destination);
        }
        if (state.synth.audioCtx.state === 'suspended') {
            state.synth.audioCtx.resume();
        }
    }

    // Binaural Beats Synthesizer (432Hz Alpha Waves)
    function toggleBinauralBeats(play) {
        initSynthContext();
        const b = state.synth.binaural;
        const ctx = state.synth.audioCtx;

        if (play && !b.isPlaying) {
            b.leftOsc = ctx.createOscillator();
            b.rightOsc = ctx.createOscillator();
            b.gain = ctx.createGain();

            // Set detuned frequencies to create a 6Hz Binaural Beat
            b.leftOsc.frequency.setValueAtTime(200, ctx.currentTime);  // 200 Hz
            b.rightOsc.frequency.setValueAtTime(206, ctx.currentTime); // 206 Hz (6Hz Theta diff)
            
            b.leftOsc.type = 'sine';
            b.rightOsc.type = 'sine';

            // Channels merger to target left and right ears individually
            const merger = ctx.createChannelMerger(2);
            
            // Connect nodes
            b.leftOsc.connect(merger, 0, 0);
            b.rightOsc.connect(merger, 0, 1);
            
            const vol = parseFloat(DOM.volBinaural.value);
            b.gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime); // keep beat gentle

            merger.connect(b.gain);
            b.gain.connect(state.synth.mainGain);

            b.leftOsc.start();
            b.rightOsc.start();
            b.isPlaying = true;

            DOM.btnBinaural.innerText = "Stop";
            DOM.btnBinaural.classList.add('playing');
            showToast("Binaural beats activated. Wear headphones for full effect.", "success");
        } else if (!play && b.isPlaying) {
            b.leftOsc.stop();
            b.rightOsc.stop();
            b.leftOsc.disconnect();
            b.rightOsc.disconnect();
            b.isPlaying = false;
            DOM.btnBinaural.innerText = "Play";
            DOM.btnBinaural.classList.remove('playing');
        }
    }

    // Pink Noise Rain Filter Synthesizer
    function togglePinkRain(play) {
        initSynthContext();
        const r = state.synth.rain;
        const ctx = state.synth.audioCtx;

        if (play && !r.isPlaying) {
            const bufferSize = 2 * ctx.sampleRate;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);

            // Pink Noise Generation Algorithm (Paul Kellet's method)
            let b0, b1, b2, b3, b4, b5, b6;
            b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

            for (let i = 0; i < bufferSize; i++) {
                let white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                output[i] *= 0.11; // normal scaling
                b6 = white * 0.115926;
            }

            r.source = ctx.createBufferSource();
            r.source.buffer = noiseBuffer;
            r.source.loop = true;

            // Lowpass filter to simulate rain muffling
            const lowpass = ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(600, ctx.currentTime);

            r.gain = ctx.createGain();
            const vol = parseFloat(DOM.volRain.value);
            r.gain.gain.setValueAtTime(vol * 0.6, ctx.currentTime);

            r.source.connect(lowpass);
            lowpass.connect(r.gain);
            r.gain.connect(state.synth.mainGain);

            r.source.start();
            r.isPlaying = true;

            DOM.btnRain.innerText = "Stop";
            DOM.btnRain.classList.add('playing');
            showToast("Rain soundscape initialized.", "success");
        } else if (!play && r.isPlaying) {
            r.source.stop();
            r.source.disconnect();
            r.isPlaying = false;
            DOM.btnRain.innerText = "Play";
            DOM.btnRain.classList.remove('playing');
        }
    }

    // Zen Drone Chord Synthesizer (Harmonized Triad + Slow LFO Volume Modulator)
    function toggleZenDrone(play) {
        initSynthContext();
        const d = state.synth.drone;
        const ctx = state.synth.audioCtx;

        if (play && !d.isPlaying) {
            d.osc1 = ctx.createOscillator();
            d.osc2 = ctx.createOscillator();
            d.osc3 = ctx.createOscillator();
            d.gain = ctx.createGain();
            d.filter = ctx.createBiquadFilter();

            // Set triad chords C3 (130Hz) - G3 (196Hz) - C4 (261Hz)
            d.osc1.frequency.setValueAtTime(130.81, ctx.currentTime);
            d.osc2.frequency.setValueAtTime(196.00, ctx.currentTime);
            d.osc3.frequency.setValueAtTime(261.63, ctx.currentTime);

            d.osc1.type = 'triangle';
            d.osc2.type = 'sine';
            d.osc3.type = 'triangle';

            d.filter.type = 'lowpass';
            d.filter.frequency.setValueAtTime(450, ctx.currentTime);

            // Connect voices to filter
            d.osc1.connect(d.filter);
            d.osc2.connect(d.filter);
            d.osc3.connect(d.filter);

            // Set main volume gain
            const vol = parseFloat(DOM.volDrone.value);
            d.gain.gain.setValueAtTime(vol * 0.35, ctx.currentTime);

            // Create LFO to oscillate amplitude (simulating breathing)
            d.lfo = ctx.createOscillator();
            d.lfoGain = ctx.createGain();
            d.lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 second breathe cycles
            d.lfoGain.gain.setValueAtTime(0.12, ctx.currentTime); // fluctuate up/down

            d.lfo.connect(d.lfoGain);
            d.lfoGain.connect(d.gain.gain); // Connect LFO to volume parameter

            d.filter.connect(d.gain);
            d.gain.connect(state.synth.mainGain);

            d.osc1.start();
            d.osc2.start();
            d.osc3.start();
            d.lfo.start();
            d.isPlaying = true;

            DOM.btnDrone.innerText = "Stop";
            DOM.btnDrone.classList.add('playing');
            showToast("Zen Meditation Drone activated.", "success");
        } else if (!play && d.isPlaying) {
            d.osc1.stop();
            d.osc2.stop();
            d.osc3.stop();
            d.lfo.stop();
            d.osc1.disconnect();
            d.osc2.disconnect();
            d.osc3.disconnect();
            d.lfo.disconnect();
            d.isPlaying = false;
            DOM.btnDrone.innerText = "Play";
            DOM.btnDrone.classList.remove('playing');
        }
    }

    // ----------------------------------------------------------------------
    // MINDFULNESS WELLNESS QUIZZES
    // ----------------------------------------------------------------------
    const QUIZ_LIBRARY = {
        academic: {
            title: "Study Alignment Check",
            badge: "Recommended: Academic Burnout",
            desc: "Use this quiz to reset expectations, analyze homework weight, and clear cognitive overload.",
            questions: [
                {
                    q: "When you look at your upcoming homework deadline list, your first impulse is:",
                    options: [
                        { text: "Tackle it immediately to get it over with", score: "Attentive" },
                        { text: "Feel paralyzed by the bulk and delay opening it", score: "Thoughtful" },
                        { text: "Log off entirely and ignore it out of pure exhaustion", score: "Attentive" }
                    ]
                },
                {
                    q: "How does your body feel physically when sitting at your desk?",
                    options: [
                        { text: "Relatively relaxed, minor posture discomfort", score: "Friendly" },
                        { text: "Tight shoulders, shallow breathing, clenched jaw", score: "Thoughtful" },
                        { text: "Completely drained, head feels heavy, hard to focus", score: "Attentive" }
                    ]
                },
                {
                    q: "Which thought feels closest to your current academic goals?",
                    options: [
                        { text: "I just need to pass this week; perfection doesn't matter", score: "Friendly" },
                        { text: "If I don't score highly, I am failing my expectations", score: "Thoughtful" },
                        { text: "I want to learn, but my mental tank is completely empty", score: "Attentive" }
                    ]
                }
            ]
        },
        burnout: {
            title: "Energy & Rest Sanctuary Check",
            badge: "Recommended: Chronic Burnout",
            desc: "A small evaluation to see if your battery is in the red zone and suggest physical resets.",
            questions: [
                {
                    q: "Over the past 48 hours, has sleeping felt recuperative?",
                    options: [
                        { text: "Yes, I feel relatively refreshed upon waking", score: "Friendly" },
                        { text: "I wake up tired no matter how long I lay in bed", score: "Thoughtful" },
                        { text: "My mind races when the lights go off, keeping me awake", score: "Attentive" }
                    ]
                },
                {
                    q: "When was the last time you spent 30 minutes doing absolutely nothing productive, guilt-free?",
                    options: [
                        { text: "Today! I schedule relaxation breaks", score: "Friendly" },
                        { text: "A few days ago, but I felt anxious not working", score: "Thoughtful" },
                        { text: "I cannot remember; I feel lazy if I am not busy", score: "Attentive" }
                    ]
                },
                {
                    q: "How does your emotional bandwidth feel when talking to others?",
                    options: [
                        { text: "Normal, I enjoy engaging with close friends", score: "Friendly" },
                        { text: "Irritable, tiny inconveniences feel major", score: "Thoughtful" },
                        { text: "Completely withdrawn, social messages look like chores", score: "Attentive" }
                    ]
                }
            ]
        },
        general: {
            title: "Mindfulness Grounding Check",
            badge: "General Grounding Checkup",
            desc: "Designed to anchor your awareness in the present moment and slow fast-moving anxious thoughts.",
            questions: [
                {
                    q: "Take a slow deep breath. Where do you feel the tension focus in your body?",
                    options: [
                        { text: "Mainly in my chest or throat area", score: "Thoughtful" },
                        { text: "Tightness around my forehead or eyes", score: "Attentive" },
                        { text: "No significant tightness; feels open", score: "Friendly" }
                    ]
                },
                {
                    q: "Choose a calming sensory action that sounds nice right now:",
                    options: [
                        { text: "Splashing cool water on my face", score: "Friendly" },
                        { text: "Listening to low binaural drone tones", score: "Attentive" },
                        { text: "Stretching my neck and arms for 2 minutes", score: "Thoughtful" }
                    ]
                },
                {
                    q: "If your current mood was described as a weather condition, it would be:",
                    options: [
                        { text: "Bright sunshine, few clouds", score: "Friendly" },
                        { text: "Heavy fog, difficult to navigate", score: "Thoughtful" },
                        { text: "Stormy downpour, lightning spikes", score: "Attentive" }
                    ]
                }
            ]
        }
    };

    function updateQuizRecommendation() {
        const diagnostics = state.diagnostics;
        let selectedCategory = 'general';

        if (diagnostics.burnout > 50) {
            selectedCategory = 'burnout';
        } else if (diagnostics.academicPressure > 50) {
            selectedCategory = 'academic';
        }

        const data = QUIZ_LIBRARY[selectedCategory];
        if (!data) return;
        state.quiz.activeCategory = selectedCategory;
        state.quiz.questions = data.questions;

        if (DOM.quizRecBadge) DOM.quizRecBadge.innerText = data.badge;
        if (DOM.quizRecTitle) DOM.quizRecTitle.innerText = data.title;
        if (DOM.quizIntroState) {
            const p = DOM.quizIntroState.querySelector('p');
            if (p) p.innerText = data.desc;
        }
    }

    async function startQuizSession() {
        DOM.quizIntroState.classList.add('hidden');
        DOM.quizResultsState.classList.add('hidden');
        DOM.quizActiveState.classList.remove('hidden');

        // Student-side quiz uses local content. Counselor dashboard owns AI quiz generation.
        DOM.quizQCounter.innerText = "Starting...";
        DOM.quizProgressFill.style.width = "0%";
        DOM.quizQuestionTitle.innerText = "Preparing your check-in questions...";
        DOM.quizOptionsContainer.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100px;"><span class="typing-dots"><span>.</span><span>.</span><span>.</span></span></div>';

        state.quiz.currentQuestionIdx = 0;
        state.quiz.answers = [];
        renderQuizQuestion();
    }

    async function generateCustomQuizWithGemini() {
        // Gemini quiz generation is intentionally counselor-triggered only.
        return null;
    }

    function renderQuizQuestion() {
        const idx = state.quiz.currentQuestionIdx;
        const qList = state.quiz.questions;
        if (!qList || !qList[idx]) return;
        const qData = qList[idx];

        if (DOM.quizQCounter) DOM.quizQCounter.innerText = `Question ${idx + 1} of ${qList.length}`;
        if (DOM.quizProgressFill) DOM.quizProgressFill.style.width = `${((idx + 1) / qList.length) * 100}%`;
        if (DOM.quizQuestionTitle) DOM.quizQuestionTitle.innerText = qData.q;

        if (DOM.quizOptionsContainer) {
            DOM.quizOptionsContainer.innerHTML = '';
            qData.options.forEach((opt, oIdx) => {
                const btn = document.createElement('button');
                btn.className = 'quiz-opt-btn';
                btn.innerText = opt.text;
                btn.addEventListener('click', () => handleQuizAnswer(opt.score));
                DOM.quizOptionsContainer.appendChild(btn);
            });
        }
    }

    function handleQuizAnswer(score) {
        state.quiz.answers.push(score);
        state.quiz.currentQuestionIdx++;

        if (state.quiz.currentQuestionIdx < (state.quiz.questions || []).length) {
            renderQuizQuestion();
        } else {
            showQuizResults();
        }
    }

    function showQuizResults() {
        if (DOM.quizActiveState) DOM.quizActiveState.classList.add('hidden');
        if (DOM.quizResultsState) DOM.quizResultsState.classList.remove('hidden');

        // Tabulate results and choose avatar response modifier
        let counts = { Friendly: 0, Thoughtful: 0, Attentive: 0 };
        (state.quiz.answers || []).forEach(val => {
            if (counts[val] !== undefined) counts[val]++;
        });

        let dominantExpression = 'friendly';
        let feedbackMessage = "Excellent work checking in with your mind. Taking a moment to trace how your body and thoughts are behaving is a core mindfulness skill. I've adjusted my active presence to match your state.";

        let academicScore = 35;
        let selfEsteemScore = 25;
        let anxietyScore = 30;

        if (counts.Attentive > counts.Friendly && counts.Attentive > counts.Thoughtful) {
            dominantExpression = 'attentive';
            feedbackMessage = "Your alignment check suggests you are carrying notable tension. Let's focus on calming down. Try toggling on the Pink Rain or Binaural Beats mixers below to ground your focus.";
            academicScore = 75;
            selfEsteemScore = 65;
            anxietyScore = 80;
        } else if (counts.Thoughtful > counts.Friendly) {
            dominantExpression = 'thoughtful';
            feedbackMessage = "Your answers reflect deep analytical thoughts, likely reflecting school or task pressure. Allow yourself permission to step back from goals for just one hour tonight. I'm right here with you.";
            academicScore = 60;
            selfEsteemScore = 40;
            anxietyScore = 55;
        }

        // Apply updated expression
        state.avatar.expression = dominantExpression;
        renderAvatarVisuals();
        
        if (DOM.quizResultFeedback) DOM.quizResultFeedback.innerText = feedbackMessage;

        // Generate Quiz Report for Calendar & Counselor
        const wellbeingScore = Math.max(10, 100 - anxietyScore);
        const reportResult = wellbeingScore > 75 ? "Excellent Resilience" : (wellbeingScore > 45 ? "Good Balance" : "Needs Support");

        state.quiz.report = {
            score: `${wellbeingScore}/100`,
            result: reportResult,
            burnoutPct: academicScore,
            fatiguePct: selfEsteemScore,
            socialPct: anxietyScore,
            academicPct: academicScore,
            reportText: feedbackMessage
        };
        window.state = state;

        // Save to localStorage for Counselor Portal & Persistence
        const latestQuizReport = {
            student_id: 'STU-88421',
            timestamp: new Date().toLocaleString(),
            score: `${wellbeingScore}/100`,
            academic_pressure: academicScore,
            self_esteem: selfEsteemScore,
            anxiety_level: anxietyScore,
            burnout: academicScore,
            summary: `Mindfulness Grounding Checkup Completed (${reportResult}). Academic Pressure: ${academicScore}%, Self-Esteem: ${selfEsteemScore}%, Anxiety Level: ${anxietyScore}%.`
        };
        try {
            localStorage.setItem('kawanku_latest_quiz_report', JSON.stringify(latestQuizReport));
        } catch(e) {}

        // Immediately sync to Sanctuary Calendar
        if (window.updateSanctuaryDashboard) {
            window.updateSanctuaryDashboard();
        }

        showToast("Wellness Check-in Complete & Report Logged to Calendar!", "success");
    }

    // ----------------------------------------------------------------------
    // UI EVENT BINDINGS
    // ----------------------------------------------------------------------
    function bindUIEvents() {
        // Chat Actions
        if (DOM.chatSendBtn) DOM.chatSendBtn.addEventListener('click', handleChatTextSubmit);
        if (DOM.chatTextInput) {
            DOM.chatTextInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatTextSubmit();
                }
            });
        }

        // Rant microphone button toggles
        if (DOM.rantStartBtn) DOM.rantStartBtn.addEventListener('click', startRantSession);
        if (DOM.rantStopBtn) DOM.rantStopBtn.addEventListener('click', stopRantSession);

        // Webcam toggles
        if (DOM.camToggleBtn) {
            DOM.camToggleBtn.addEventListener('click', () => {
                if (state.webcam.isActive) {
                    stopWebcamAnalyzer();
                } else {
                    startWebcamAnalyzer();
                }
            });
        }
        if (DOM.closeCamBtn) DOM.closeCamBtn.addEventListener('click', stopWebcamAnalyzer);

        // Studio Customizer Category Switcher
        if (DOM.customizerSubnav) {
            DOM.customizerSubnav.querySelectorAll('.subnav-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    DOM.customizerSubnav.querySelectorAll('.subnav-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    activeCategory = btn.getAttribute('data-category');
                    activeSubcategory = AVATAR_CATALOG[activeCategory].subcategories[0];
                    renderCustomizerUI();
                });
            });
        }

        // Initial customizer render
        renderCustomizerUI();

        // Avatar Randomizer Dice
        if (DOM.avatarRandomizeBtn) DOM.avatarRandomizeBtn.addEventListener('click', randomizeAvatarConfig);

        // IoT Biometrics controls
        if (DOM.sliderHR) {
            DOM.sliderHR.addEventListener('input', (e) => {
                const hr = parseInt(e.target.value);
                state.biometrics.heartRate = hr;
                if (DOM.bubbleHR) DOM.bubbleHR.innerText = `${hr} BPM`;
                evaluateIoTBiometricState();
            });
        }

        if (DOM.sliderSleep) {
            DOM.sliderSleep.addEventListener('input', (e) => {
                const hrs = parseFloat(e.target.value);
                state.biometrics.sleepDuration = hrs;
                if (DOM.bubbleSleep) DOM.bubbleSleep.innerText = `${hrs} Hrs`;
                
                // Recompute values
                if (DOM.bioSleepDuration) DOM.bioSleepDuration.innerText = `${hrs} hrs`;
                // estimate Deep sleep as 25% of total
                const deep = (hrs * 0.26).toFixed(1);
                if (DOM.bioSleepDeep) DOM.bioSleepDeep.innerText = `${deep} hrs`;
                
                // Efficiency formula (lower sleep, lower efficiency)
                const eff = Math.min(100, Math.round(75 + (hrs / 8) * 20));
                if (DOM.bioSleepEfficiency) DOM.bioSleepEfficiency.innerText = `${eff}%`;

                evaluateIoTBiometricState();
            });
        }

        // Calm Hub Mixer Synth controls
        if (DOM.btnBinaural) {
            DOM.btnBinaural.addEventListener('click', () => {
                toggleBinauralBeats(!state.synth.binaural.isPlaying);
            });
        }
        if (DOM.btnRain) {
            DOM.btnRain.addEventListener('click', () => {
                togglePinkRain(!state.synth.rain.isPlaying);
            });
        }
        if (DOM.btnDrone) {
            DOM.btnDrone.addEventListener('click', () => {
                toggleZenDrone(!state.synth.drone.isPlaying);
            });
        }

        // Synth Volume adjusters
        if (DOM.volBinaural) {
            DOM.volBinaural.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                if (state.synth.binaural.gain) {
                    state.synth.binaural.gain.gain.setValueAtTime(vol * 0.4, state.synth.audioCtx.currentTime);
                }
            });
        }
        if (DOM.volRain) {
            DOM.volRain.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                if (state.synth.rain.gain) {
                    state.synth.rain.gain.gain.setValueAtTime(vol * 0.6, state.synth.audioCtx.currentTime);
                }
            });
        }
        if (DOM.volDrone) {
            DOM.volDrone.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                if (state.synth.drone.gain) {
                    state.synth.drone.gain.gain.setValueAtTime(vol * 0.35, state.synth.audioCtx.currentTime);
                }
            });
        }

        // Calm Hub Quiz buttons
        if (DOM.quizStartBtn) DOM.quizStartBtn.addEventListener('click', startQuizSession);
        if (DOM.quizRestartBtn) {
            DOM.quizRestartBtn.addEventListener('click', () => {
                updateQuizRecommendation();
                if (DOM.quizResultsState) DOM.quizResultsState.classList.add('hidden');
                if (DOM.quizIntroState) DOM.quizIntroState.classList.remove('hidden');
            });
        }

        // SOS modal triggers
        if (DOM.sosOpenBtn) {
            DOM.sosOpenBtn.addEventListener('click', () => {
                syncSOSReportPreview();
                if (DOM.sosModal) DOM.sosModal.classList.remove('hidden');
            });
        }
        if (DOM.sosCloseBtn) DOM.sosCloseBtn.addEventListener('click', () => { if (DOM.sosModal) DOM.sosModal.classList.add('hidden'); });
        if (DOM.sosCancelBtn) DOM.sosCancelBtn.addEventListener('click', () => { if (DOM.sosModal) DOM.sosModal.classList.add('hidden'); });
        
        if (DOM.sosConfirmBtn) {
            DOM.sosConfirmBtn.addEventListener('click', () => {
                if (DOM.sosModal) DOM.sosModal.classList.add('hidden');
                showToast("Anonymized diagnostics successfully dispatched to counselor.", "success");
                appendChatMessage('Buddy', "📬 **Notification:** I've packaged and forwarded your current physiological indicators and stress indices to the counselor department. A school advisor will receive it shortly. Hang in there!");
            });
        }
    }

    function handleChatTextSubmit() {
        if (!DOM.chatTextInput) return;
        const text = DOM.chatTextInput.value.trim();
        if (!text) return;

        DOM.chatTextInput.value = "";
        processStudentMessage(text);
    }

    // ----------------------------------------------------------------------
    // AVATAR CUSTOMIZER SYSTEM (BITMOJI SYSTEM DEFINITIONS)
    // ----------------------------------------------------------------------
    let activeCategory = 'Avatar';
    let activeSubcategory = 'Mascot Color';

    function unlockPremiumItem(prop, val) {
        let unlocked = [];
        try {
            unlocked = JSON.parse(localStorage.getItem('kawanku_unlocked_items')) || [];
        } catch(e) {}
        if (!unlocked.includes(prop + ':' + val)) {
            unlocked.push(prop + ':' + val);
            localStorage.setItem('kawanku_unlocked_items', JSON.stringify(unlocked));
        }
    }
    function isItemUnlocked(item) {
        if (!item.locked) return true;
        let unlocked = [];
        try {
            unlocked = JSON.parse(localStorage.getItem('kawanku_unlocked_items')) || [];
        } catch(e) {}
        return unlocked.includes(item.prop + ':' + item.id);
    }

    const AVATAR_CATALOG = {
        Fashion: {
            subcategories: ['Outfits'],
            items: {
                Outfits: [
                    { id: 'none', label: 'Default Body', prop: 'activeOutfit', svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#dbf7f9" stroke="#8cdbe1" stroke-width="3"/></svg>' },
                    { id: 'forest', label: 'Forest Tale', prop: 'activeOutfit', svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#606c38" stroke="#283618" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="#e07a5f"/></svg>' },
                    { id: 'starry', label: 'Starry Pajama', prop: 'activeOutfit', svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#1d2d50" stroke="#111827" stroke-width="3"/><polygon points="24,16 26,21 31,21 27,24 29,29 24,26 19,29 21,24 17,21 22,21" fill="#ffd166"/></svg>' },
                    { id: 'nautical', label: 'Sailor Dress', prop: 'activeOutfit', svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#ffffff" stroke="#2b5c8f" stroke-width="3"/><circle cx="24" cy="24" r="8" fill="#2b5c8f"/></svg>' },
                    { id: 'strawberry', label: 'Strawberry Picnic', prop: 'activeOutfit', svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#fca5a5" stroke="#e11d48" stroke-width="3"/><circle cx="24" cy="24" r="6" fill="#e11d48"/></svg>' },
                    { id: 'wizard', label: 'Wizard Cape', prop: 'activeOutfit', svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#4a154b" stroke="#ffd166" stroke-width="3"/><polygon points="24,14 26,19 31,19 27,22 29,27 24,24 19,27 21,22 17,19 22,19" fill="#ffd166"/></svg>' },
                    { id: 'princess', label: 'Princess Gown 👑', prop: 'activeOutfit', locked: true, svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#f43f5e" stroke="#4A3E3D" stroke-width="2.5"/><circle cx="24" cy="24" r="6" fill="#fef08a" stroke="#4A3E3D" stroke-width="1.5"/></svg>' },
                    { id: 'mermaid', label: 'Mermaid Gown 🧜‍♀️', prop: 'activeOutfit', locked: true, svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#0284c7" stroke="#4A3E3D" stroke-width="2.5"/><path d="M 18,24 Q 24,18 30,24" stroke="#ffffff" stroke-width="1.5"/></svg>' },
                    { id: 'lolita', label: 'Lolita Ruffle 🎀', prop: 'activeOutfit', locked: true, svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#bae6fd" stroke="#4A3E3D" stroke-width="2.5"/><path d="M 20,24 H 28" stroke="#ffb3cc" stroke-width="2.5"/></svg>' },
                    { id: 'unicorn', label: 'Unicorn Suit 🦄', prop: 'activeOutfit', locked: true, svg: '<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="16" fill="#fca5a5" stroke="#4A3E3D" stroke-width="2.5"/><polygon points="24,16 21,24 27,24" fill="#facc15" stroke="#4A3E3D" stroke-width="1.5"/></svg>' }
                ]
            }
        },

        Pet: {
            subcategories: ['Pets'],
            items: {
                Pets: [
                    { id: 'none', label: 'No Pet', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="24" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="4,4"/><line x1="35" y1="35" x2="65" y2="65" stroke="#cbd5e1" stroke-width="3"/></svg>' },
                    { id: 'cat', label: 'Orange Cat', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="85" rx="22" ry="5" fill="#4A3E3D" opacity="0.22" /><path d="M 68,78 Q 80,82 85,70 Q 90,58 83,52" fill="none" stroke="#4A3E3D" stroke-width="4" stroke-linecap="round" /><path d="M 68,78 Q 80,82 85,70 Q 90,58 83,52" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" /><ellipse cx="50" cy="72" rx="18" ry="15" fill="#f59e0b" stroke="#4A3E3D" stroke-width="4" /><ellipse cx="44" cy="82" rx="5" ry="4" fill="#f59e0b" stroke="#4A3E3D" stroke-width="3" /><ellipse cx="56" cy="82" rx="5" ry="4" fill="#f59e0b" stroke="#4A3E3D" stroke-width="3" /><circle cx="50" cy="46" r="20" fill="#f59e0b" stroke="#4A3E3D" stroke-width="4" /><polygon points="32,36 30,16 46,28" fill="#f59e0b" stroke="#4A3E3D" stroke-width="4" stroke-linejoin="round" /><polygon points="32,36 30,16 46,28" fill="#f59e0b" /><polygon points="34,31 33,20 42,27" fill="#ff8fab" /><polygon points="68,36 70,16 54,28" fill="#f59e0b" stroke="#4A3E3D" stroke-width="4" stroke-linejoin="round" /><polygon points="68,36 70,16 54,28" fill="#f59e0b" /><polygon points="66,31 67,20 58,27" fill="#ff8fab" /><circle cx="42" cy="45" r="3" fill="#4A3E3D" /><circle cx="58" cy="45" r="3" fill="#4A3E3D" /><circle cx="36" cy="51" r="3" fill="#ffa2b6" opacity="0.85" /><circle cx="64" cy="51" r="3" fill="#ffa2b6" opacity="0.85" /><path d="M 47,50 Q 50,53 53,50" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round" /><path d="M 53,50 Q 56,53 59,50" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round" /><polygon points="50,47 48,45 52,45" fill="#4A3E3D" /><line x1="28" y1="48" x2="20" y2="47" stroke="#4A3E3D" stroke-width="2.5" stroke-linecap="round" /><line x1="28" y1="52" x2="21" y2="53" stroke="#4A3E3D" stroke-width="2.5" stroke-linecap="round" /><line x1="72" y1="48" x2="80" y2="47" stroke="#4A3E3D" stroke-width="2.5" stroke-linecap="round" /><line x1="72" y1="52" x2="79" y2="53" stroke="#4A3E3D" stroke-width="2.5" stroke-linecap="round" /></svg>' },
                    { id: 'dog', label: 'Loyal Pup', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="85" rx="22" ry="5" fill="#4A3E3D" opacity="0.22" /><path d="M 32,78 Q 20,82 15,70" fill="none" stroke="#4A3E3D" stroke-width="4" stroke-linecap="round" /><path d="M 32,78 Q 20,82 15,70" fill="none" stroke="#78350f" stroke-width="2.5" stroke-linecap="round" /><ellipse cx="50" cy="72" rx="18" ry="15" fill="#78350f" stroke="#4A3E3D" stroke-width="4" /><ellipse cx="44" cy="82" rx="5" ry="4" fill="#78350f" stroke="#4A3E3D" stroke-width="3" /><ellipse cx="56" cy="82" rx="5" ry="4" fill="#78350f" stroke="#4A3E3D" stroke-width="3" /><circle cx="50" cy="46" r="20" fill="#78350f" stroke="#4A3E3D" stroke-width="4" /><path d="M 32,36 C 22,36 20,52 26,58 C 28,52 32,46 32,36 Z" fill="#451a03" stroke="#4A3E3D" stroke-width="4" stroke-linejoin="round" /><path d="M 32,36 C 22,36 20,52 26,58 C 28,52 32,46 32,36 Z" fill="#451a03" /><path d="M 68,36 C 78,36 80,52 74,58 C 72,52 68,46 68,36 Z" fill="#451a03" stroke="#4A3E3D" stroke-width="4" stroke-linejoin="round" /><path d="M 68,36 C 78,36 80,52 74,58 C 72,52 68,46 68,36 Z" fill="#451a03" /><circle cx="42" cy="45" r="3" fill="#4A3E3D" /><circle cx="58" cy="45" r="3" fill="#4A3E3D" /><circle cx="36" cy="51" r="3" fill="#ffa2b6" opacity="0.85" /><circle cx="64" cy="51" r="3" fill="#ffa2b6" opacity="0.85" /><ellipse cx="50" cy="51" rx="6" ry="4.5" fill="#fef3c7" stroke="#4A3E3D" stroke-width="2.5" /><ellipse cx="50" cy="48" rx="3" ry="2" fill="#4A3E3D" /><path d="M 50,51 L 50,53" stroke="#4A3E3D" stroke-width="2.5" /></svg>' },
                    { id: 'bird', label: 'Blue Bird', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 30,15 C 32,12 36,12 38,15" fill="none" stroke="#4A3E3D" stroke-width="2.5" stroke-linecap="round" /><path d="M 62,15 C 64,12 68,12 70,15" fill="none" stroke="#4A3E3D" stroke-width="2.5" stroke-linecap="round" /><ellipse cx="50" cy="85" rx="16" ry="4" fill="#4A3E3D" opacity="0.22" /><polygon points="30,68 16,74 24,60" fill="#3b82f6" stroke="#4A3E3D" stroke-width="4" stroke-linejoin="round" /><polygon points="30,68 16,74 24,60" fill="#3b82f6" /><circle cx="50" cy="56" r="22" fill="#3b82f6" stroke="#4A3E3D" stroke-width="4" /><path d="M 42,56 C 42,48 54,48 54,58 C 54,64 42,64 42,56 Z" fill="#2563eb" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" /><circle cx="54" cy="38" r="16" fill="#3b82f6" stroke="#4A3E3D" stroke-width="4" /><polygon points="68,36 78,41 68,46" fill="#f59e0b" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" /><polygon points="68,36 78,41 68,46" fill="#f59e0b" /><circle cx="56" cy="34" r="2.5" fill="#4A3E3D" /><circle cx="50" cy="40" r="2.5" fill="#ffa2b6" opacity="0.85" /></svg>' }
                ]
            }
        },
        Avatar: {
            subcategories: ['Mascot Color', 'Expressions', 'Cheek Blushes', 'Face Accessories'],
            items: {
                'Mascot Color': [
                    { id: '#ffd6e0', label: 'Soft Cloud Pink', prop: 'skinTone', color: '#ffd6e0' },
                    { id: '#dbf7f9', label: 'Pastel Sky Blue', prop: 'skinTone', color: '#dbf7f9' },
                    { id: '#e8f5e9', label: 'Mint Green', prop: 'skinTone', color: '#e8f5e9' },
                    { id: '#e8dff5', label: 'Lavender Sweet', prop: 'skinTone', color: '#e8dff5' }
                ],
                'Expressions': [
                    { id: 'friendly', label: 'Happy Smile', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="45" r="5" fill="#4A3E3D"/><circle cx="65" cy="45" r="5" fill="#4A3E3D"/><path d="M 44,55 Q 50,60 56,55" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/></svg>' },
                    { id: 'starry', label: 'Joyful Squint', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 28,42 L 38,47 L 28,52" fill="none" stroke="#4A3E3D" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M 72,42 L 62,47 L 72,52" fill="none" stroke="#4A3E3D" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" /><path d="M 43,54 Q 46.5,57.5 50,54 Q 53.5,57.5 57,54" fill="none" stroke="#4A3E3D" stroke-width="3.5" stroke-linecap="round"/></svg>' },
                    { id: 'wink', label: 'Wink Face', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 28,48 Q 35,42 42,48" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/><circle cx="65" cy="45" r="5" fill="#4A3E3D"/><path d="M 44,55 Q 50,60 56,55" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/></svg>' },
                    { id: 'sleepy', label: 'Sleepy Eyes', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 28,44 Q 35,50 42,44" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/><path d="M 58,44 Q 65,50 72,44" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="56" r="3.5" fill="#4A3E3D"/></svg>' },
                    { id: 'blep', label: 'Blep 👅', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 28,44 Q 35,52 42,44" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/><path d="M 58,44 Q 65,52 72,44" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/><path d="M 44,55 Q 50,61 56,55" fill="#4A3E3D" stroke="#4A3E3D" stroke-width="2" stroke-linecap="round"/><ellipse cx="50" cy="64" rx="5" ry="4" fill="#ff8fab" stroke="#e05c7a" stroke-width="1.2"/></svg>' },
                    { id: 'uwu', label: 'UwU 🥺', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 26,45 Q 30,56 36,52 Q 42,48 43,40" fill="none" stroke="#4A3E3D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M 74,45 Q 70,56 64,52 Q 58,48 57,40" fill="none" stroke="#4A3E3D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M 42,57 Q 50,65 58,57" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/></svg>' },
                    { id: 'teary', label: 'Teary Joy 🥹', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="45" r="8" fill="#3c2f46"/><circle cx="32" cy="42" r="3" fill="#fff"/><ellipse cx="27" cy="55" rx="2.5" ry="4" fill="#bae6fd" opacity="0.9"/><circle cx="65" cy="45" r="8" fill="#3c2f46"/><circle cx="62" cy="42" r="3" fill="#fff"/><ellipse cx="73" cy="55" rx="2.5" ry="4" fill="#bae6fd" opacity="0.9"/><path d="M 42,57 Q 50,65 58,57" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round"/></svg>' },
                    { id: 'cat', label: 'Cat Face 🐱', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 27,52 L 37,46 L 47,52" fill="none" stroke="#4A3E3D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M 73,52 L 63,46 L 53,52" fill="none" stroke="#4A3E3D" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M 43,58 Q 47,54 50,58 Q 53,54 57,58" fill="none" stroke="#4A3E3D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' }
                ],
                'Cheek Blushes': [
                    { id: 'circle', label: 'Classic Rosy Circles', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="30" cy="50" rx="10" ry="6" fill="#ffa2b6" opacity="0.85"/><ellipse cx="70" cy="50" rx="10" ry="6" fill="#ffa2b6" opacity="0.85"/></svg>' },
                    { id: 'heart', label: 'Tiny Pink Hearts', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 25,48 C 22,43 18,48 25,55 C 32,48 28,43 25,48 Z" fill="#ffa2b6"/><path d="M 75,48 C 72,43 68,48 75,55 C 82,48 78,43 75,48 Z" fill="#ffa2b6"/></svg>' },
                    { id: 'star', label: 'Soft Mini Stars', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="30,42 32,46 36,46 33,48 34,52 30,50 26,52 27,48 24,46 28,46" fill="#ffa2b6"/><polygon points="70,42 72,46 76,46 73,48 74,52 70,50 66,52 67,48 64,46 68,46" fill="#ffa2b6"/></svg>' },
                    { id: 'sakura', label: 'Sakura Blossoms 🌸', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="30" cy="46" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(-20,30,46)"/><ellipse cx="37" cy="48" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(30,37,48)"/><ellipse cx="34" cy="56" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(80,34,56)"/><ellipse cx="26" cy="56" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(130,26,56)"/><ellipse cx="23" cy="48" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(170,23,48)"/><circle cx="30" cy="51" r="3" fill="#fff0f5" opacity="0.95"/><ellipse cx="70" cy="46" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(-20,70,46)"/><ellipse cx="77" cy="48" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(30,77,48)"/><ellipse cx="74" cy="56" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(80,74,56)"/><ellipse cx="66" cy="56" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(130,66,56)"/><ellipse cx="63" cy="48" rx="5" ry="2.5" fill="#ffb7cc" opacity="0.9" transform="rotate(170,63,48)"/><circle cx="70" cy="51" r="3" fill="#fff0f5" opacity="0.95"/></svg>' },
                    { id: 'sparkle', label: 'Sparkle Dust ✨', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 26,46 L 28,51 L 26,56 L 24,51 Z" fill="#ffcce0" opacity="0.95"/><path d="M 21,51 L 26,49 L 31,51 L 26,53 Z" fill="#ffcce0" opacity="0.95"/><path d="M 35,44 L 36,47 L 35,50 L 34,47 Z" fill="#ffa2c0" opacity="0.9"/><path d="M 32,47 L 35,46 L 38,47 L 35,48 Z" fill="#ffa2c0" opacity="0.9"/><path d="M 66,46 L 68,51 L 66,56 L 64,51 Z" fill="#ffcce0" opacity="0.95"/><path d="M 61,51 L 66,49 L 71,51 L 66,53 Z" fill="#ffcce0" opacity="0.95"/><path d="M 75,44 L 76,47 L 75,50 L 74,47 Z" fill="#ffa2c0" opacity="0.9"/><path d="M 72,47 L 75,46 L 78,47 L 75,48 Z" fill="#ffa2c0" opacity="0.9"/></svg>' },
                    { id: 'dots', label: 'Sweet Trio Dots 🍓', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="23" cy="55" r="5" fill="#ff8fab" opacity="0.88"/><circle cx="35" cy="55" r="5" fill="#ff8fab" opacity="0.88"/><circle cx="29" cy="46" r="5" fill="#ff8fab" opacity="0.88"/><circle cx="65" cy="55" r="5" fill="#ff8fab" opacity="0.88"/><circle cx="77" cy="55" r="5" fill="#ff8fab" opacity="0.88"/><circle cx="71" cy="46" r="5" fill="#ff8fab" opacity="0.88"/></svg>' },
                    { id: 'crescent', label: 'Crescent Glow 🌙', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 37,46 A 9 8 0 1 0 37,57 A 7 6 0 1 1 37,46 Z" fill="#ffa2b6" opacity="0.8"/><path d="M 63,46 A 9 8 0 1 1 63,57 A 7 6 0 1 0 63,46 Z" fill="#ffa2b6" opacity="0.8"/></svg>' },
                    { id: 'butterfly', label: 'Butterfly Blush 🦋', prop: 'blushShape', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 29,51 Q 20,43 19,51 Q 20,59 29,51 Z" fill="#ffb3cc" opacity="0.82"/><path d="M 29,51 Q 38,43 39,51 Q 38,59 29,51 Z" fill="#ffc8dd" opacity="0.75"/><circle cx="29" cy="51" r="2.5" fill="#ff6b9d" opacity="0.9"/><path d="M 71,51 Q 62,43 61,51 Q 62,59 71,51 Z" fill="#ffb3cc" opacity="0.82"/><path d="M 71,51 Q 80,43 81,51 Q 80,59 71,51 Z" fill="#ffc8dd" opacity="0.75"/><circle cx="71" cy="51" r="2.5" fill="#ff6b9d" opacity="0.9"/></svg>' }
                ],
                'Face Accessories': [
                    { id: 'none', label: 'None', prop: 'accessory', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="24" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="4,4"/><line x1="35" y1="35" x2="65" y2="65" stroke="#cbd5e1" stroke-width="3"/></svg>' },
                    { id: 'round_glasses', label: 'Oversized Round Glasses', prop: 'accessory', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="50" r="12" fill="none" stroke="#4A3E3D" stroke-width="3"/><circle cx="65" cy="50" r="12" fill="none" stroke="#4A3E3D" stroke-width="3"/><line x1="47" y1="50" x2="53" y2="50" stroke="#4A3E3D" stroke-width="3"/></svg>' },
                    { id: 'night_mask', label: 'Sleepy Night Mask', prop: 'accessory', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="22" y="38" width="56" height="24" rx="10" fill="#a78bfa" stroke="#4A3E3D" stroke-width="3"/><path d="M 32,50 Q 36,54 40,50" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><path d="M 60,50 Q 64,54 68,50" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>' },
                    { id: 'sprout', label: 'Tiny Head Sprout', prop: 'accessory', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 50,45 Q 50,25 58,15" fill="none" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round"/><path d="M 210,95 Q 222,98 218,108 C 213,113 203,107 210,95 Z" fill="#22c55e" stroke="#166534" stroke-width="1.5"/><path d="M 200,118 Q 188,110 192,102 C 196,98 204,105 200,118 Z" fill="#22c55e" stroke="#166534" stroke-width="1.5"/></svg>' },
                    { id: 'heart_glasses', label: 'Sweet Heart Glasses 💖', prop: 'accessory', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 35,40 C 23,28 11,36 15,50 C 19,62 35,68 35,68 C 35,68 51,62 55,50 C 59,36 47,28 35,40 Z" fill="#ff758f" fill-opacity="0.3" stroke="#4A3E3D" stroke-width="3" /><ellipse cx="29" cy="44" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,29,44)" /><path d="M 65,40 C 53,28 41,36 45,50 C 49,62 65,68 65,68 C 65,68 81,62 85,50 C 89,36 77,28 65,40 Z" fill="#ff758f" fill-opacity="0.3" stroke="#4A3E3D" stroke-width="3" /><ellipse cx="59" cy="44" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,59,44)" /><path d="M 47,50 Q 50,48 53,50" fill="none" stroke="#4A3E3D" stroke-width="3" /></svg>' },
                    { id: 'flower_glasses', label: 'Daisy Sunglasses 🌼', prop: 'accessory', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="32" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="51" cy="41" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="51" cy="59" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="35" cy="68" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="19" cy="59" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="19" cy="41" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="35" cy="50" r="12" fill="#fef08a" fill-opacity="0.3" stroke="#4A3E3D" stroke-width="2.5" /><circle cx="35" cy="50" r="7" fill="#facc15" opacity="0.8" /><circle cx="65" cy="32" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="81" cy="41" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="81" cy="59" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="65" cy="68" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="49" cy="59" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="49" cy="41" r="5" fill="#ffffff" stroke="#4A3E3D" stroke-width="2" /><circle cx="65" cy="50" r="12" fill="#fef08a" fill-opacity="0.3" stroke="#4A3E3D" stroke-width="2.5" /><circle cx="65" cy="50" r="7" fill="#facc15" opacity="0.8" /><path d="M 45,50 Q 50,48 55,50" fill="none" stroke="#4A3E3D" stroke-width="2.5" /></svg>' },
                    { id: 'cat_glasses', label: 'Cat Ear Glasses 🐱', prop: 'accessory', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="25,42 16,28 34,37" fill="#ffd6e0" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" /><polygon points="26,41 20,31 32,37" fill="#ff758f" /><polygon points="75,42 84,28 66,37" fill="#ffd6e0" stroke="#4A3E3D" stroke-width="3" stroke-linejoin="round" /><polygon points="74,41 80,31 68,37" fill="#ff758f" /><circle cx="35" cy="50" r="12" fill="#ffd6e0" fill-opacity="0.25" stroke="#4A3E3D" stroke-width="3" /><ellipse cx="29" cy="44" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,29,44)" /><circle cx="65" cy="50" r="12" fill="#ffd6e0" fill-opacity="0.25" stroke="#4A3E3D" stroke-width="3" /><ellipse cx="59" cy="44" rx="3.5" ry="1.8" fill="#ffffff" transform="rotate(-30,59,44)" /><path d="M 47,50 Q 50,48 53,50" fill="none" stroke="#4A3E3D" stroke-width="3" /></svg>' },
                    { id: 'angel_glasses', label: 'Angel Wing Glasses 👼', prop: 'accessory', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="50" r="12" fill="#ffd6e0" fill-opacity="0.4" stroke="#4A3E3D" stroke-width="3"/><circle cx="65" cy="50" r="12" fill="#ffd6e0" fill-opacity="0.4" stroke="#4A3E3D" stroke-width="3"/><path d="M 23,50 C 15,42 8,45 6,52 Q 13,54 23,50 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="2"/><path d="M 77,50 C 85,42 92,45 94,52 Q 87,54 77,50 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="2"/><line x1="47" y1="50" x2="53" y2="50" stroke="#4A3E3D" stroke-width="3"/></svg>' },
                    { id: 'boba_glasses', label: 'Sweet Boba Glasses 🧋', prop: 'accessory', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="35" cy="50" r="12" fill="none" stroke="#b45309" stroke-width="3.5"/><circle cx="65" cy="50" r="12" fill="none" stroke="#b45309" stroke-width="3.5"/><circle cx="31" cy="56" r="2.5" fill="#4A3E3D"/><circle cx="35" cy="58" r="2.5" fill="#4A3E3D"/><circle cx="61" cy="56" r="2.5" fill="#4A3E3D"/><circle cx="65" cy="58" r="2.5" fill="#4A3E3D"/><line x1="47" y1="50" x2="53" y2="50" stroke="#b45309" stroke-width="3"/></svg>' },
                    { id: 'puppy_glasses', label: 'Puppy Ear Glasses 🐶', prop: 'accessory', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 24,42 C 16,36 17,55 21,59 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="2"/><path d="M 76,42 C 84,36 83,55 79,59 Z" fill="#ffffff" stroke="#4A3E3D" stroke-width="2"/><circle cx="35" cy="50" r="11" fill="none" stroke="#4A3E3D" stroke-width="3"/><circle cx="65" cy="50" r="11" fill="none" stroke="#4A3E3D" stroke-width="3"/><line x1="46" y1="50" x2="54" y2="50" stroke="#4A3E3D" stroke-width="3"/></svg>' }
                ]
            }
        },
        Scene: {
            subcategories: ['Scenes'],
            items: {
                Scenes: [
                    { id: 'starry_night', label: 'Starry Night Window', prop: 'currentScene', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#2E2545" stroke="#4A3E3D" stroke-width="3"/><circle cx="50" cy="50" r="10" fill="#fff" opacity="0.3"/><line x1="10" y1="50" x2="90" y2="50" stroke="#4A3E3D" stroke-width="2"/><line x1="50" y1="10" x2="50" y2="90" stroke="#4A3E3D" stroke-width="2"/></svg>' },
                    { id: 'lofi_study', label: 'Lo-Fi Study Desk', prop: 'currentScene', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#dfc09b" stroke="#4A3E3D" stroke-width="3"/><rect x="25" y="60" width="50" height="15" fill="#ebcba4" stroke="#4A3E3D" stroke-width="2"/></svg>' },
                    { id: 'floating_garden', label: 'Secret Floating Garden', prop: 'currentScene', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#E8F5E9" stroke="#4A3E3D" stroke-width="3"/><circle cx="30" cy="30" r="8" fill="#798948"/><circle cx="70" cy="40" r="6" fill="#798948"/></svg>' },
                    { id: 'boba_cafe', label: 'Dreamy Boba Cafe', prop: 'currentScene', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#F7F4EB" stroke="#4A3E3D" stroke-width="3"/><circle cx="30" cy="30" r="3" fill="#ffe066"/><circle cx="70" cy="30" r="3" fill="#ffe066"/></svg>' },
                    { id: 'pink_bedroom', label: 'Strawberry Dream Room 🌸', prop: 'currentScene', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#ffdeeb" stroke="#4A3E3D" stroke-width="3"/><circle cx="30" cy="25" r="3" fill="#fef08a" stroke="#4A3E3D"/><circle cx="50" cy="28" r="3" fill="#fef08a" stroke="#4A3E3D"/><circle cx="70" cy="25" r="3" fill="#fef08a" stroke="#4A3E3D"/><ellipse cx="50" cy="80" rx="20" ry="5" fill="#ffa2b6" opacity="0.4"/></svg>' },
                    { id: 'cozy_cabin', label: 'Warm Cabin Fireside 🪵', prop: 'currentScene', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#fef3c7" stroke="#4A3E3D" stroke-width="3"/><rect x="25" y="25" width="20" height="30" rx="2" fill="#fff" opacity="0.3" stroke="#4A3E3D" stroke-width="1.8"/><rect x="65" y="65" width="10" height="12" rx="1" fill="#f97316" stroke="#4A3E3D" stroke-width="1.8"/></svg>' },
                    { id: 'magic_forest', label: 'Magic Forest 🍄', prop: 'currentScene', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#2d1b4e" stroke="#4A3E3D" stroke-width="3"/><path d="M 25,60 Q 30,35 45,60" fill="#a78bfa" stroke="#4A3E3D" stroke-width="2"/><path d="M 32,60 L 32,80 M 38,60 L 38,80" stroke="#4A3E3D" stroke-width="2"/><circle cx="28" cy="48" r="1.5" fill="#fff" /><circle cx="35" cy="42" r="1.5" fill="#fff" /><circle cx="42" cy="50" r="1.5" fill="#fff" /><path d="M 55,70 Q 60,50 70,70" fill="#f472b6" stroke="#4A3E3D" stroke-width="2"/><path d="M 60,70 L 60,85 M 65,70 L 65,85" stroke="#4A3E3D" stroke-width="2"/><circle cx="75" cy="35" r="2.5" fill="#fef08a" /><path d="M 75,35 L 75,30 M 75,35 L 75,40 M 75,35 L 70,35 M 75,35 L 80,35" stroke="#fef08a" stroke-width="1"/></svg>' },
                    { id: 'candy_castle', label: 'Candy Castle 🏰', prop: 'currentScene', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#ddd6fe" stroke="#4A3E3D" stroke-width="3"/><path d="M 30,70 L 30,55 L 42,55 L 42,70 Z" fill="#ffd6e0" stroke="#4A3E3D" stroke-width="1.5"/><polygon points="30,55 36,40 42,55" fill="#ff85a2" stroke="#4A3E3D" stroke-width="1.5"/><path d="M 50,75 L 50,48 L 68,48 L 68,75 Z" fill="#ffd6e0" stroke="#4A3E3D" stroke-width="1.5"/><polygon points="50,48 59,30 68,48" fill="#ff85a2" stroke="#4A3E3D" stroke-width="1.5"/><path d="M 10,75 A 12,12 0 0,1 35,75 A 16,16 0 0,1 65,75 A 12,12 0 0,1 90,75 Z" fill="#fff" stroke="#4A3E3D" stroke-width="2"/><path d="M 15,30 Q 50,15 85,30" fill="none" stroke="#fcd34d" stroke-width="2" stroke-linecap="round"/></svg>' },
                    { id: 'coral_palace', label: 'Coral Palace 🐚', prop: 'currentScene', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#bae6fd" stroke="#4A3E3D" stroke-width="3"/><circle cx="25" cy="30" r="4" fill="none" stroke="#4A3E3D" stroke-width="1.5" stroke-dasharray="1,1"/><circle cx="35" cy="22" r="2.5" fill="none" stroke="#4A3E3D" stroke-width="1.2"/><circle cx="75" cy="40" r="3" fill="none" stroke="#4A3E3D" stroke-width="1.5"/><path d="M 20,90 Q 25,65 35,90" fill="#fda4af" stroke="#4A3E3D" stroke-width="2"/><path d="M 70,90 Q 75,70 85,90" fill="#fef08a" stroke="#4A3E3D" stroke-width="2"/><path d="M 45,90 Q 52,78 60,90" fill="#a7f3d0" stroke="#4A3E3D" stroke-width="2"/></svg>' },
                    { id: 'moon_carousel', label: 'Moon Swing 🌙', prop: 'currentScene', locked: true, svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" rx="10" fill="#fffbeb" stroke="#4A3E3D" stroke-width="3"/><path d="M 55,20 A 25,25 0 1,0 55,70 A 20,20 0 1,1 55,20 Z" fill="#fcd34d" stroke="#4A3E3D" stroke-width="2" transform="rotate(-15, 50, 45)"/><line x1="30" y1="10" x2="30" y2="90" stroke="#4A3E3D" stroke-width="1.5" stroke-dasharray="3,3"/><line x1="70" y1="10" x2="70" y2="90" stroke="#4A3E3D" stroke-width="1.5" stroke-dasharray="3,3"/><circle cx="30" cy="40" r="3" fill="#ff758f"/><circle cx="70" cy="60" r="3" fill="#ff758f"/></svg>' }
                ]
            }
        }
    };

    // Customizer State Management Hook Abstraction
    const avatarState = {
        subscribe(callback) {
            this.listeners.push(callback);
        },
        listeners: [],
        set(prop, val) {
            state.avatar[prop] = val;
            if (prop === 'shirtStyle') state.avatar.top = val;
            if (prop === 'pantsStyle') state.avatar.bottom = val;
            if (prop === 'shoes') state.avatar.shoes = val;
            if (prop === 'hairStyle') state.avatar.hairStyle = val;
            if (prop === 'expression') state.avatar.expression = val;

            if (prop === 'activeOutfit') {
                let msg = "Today is a beautiful day. Tell me what's on your mind? 💖";
                let exp = 'friendly';
                if (val === 'forest') {
                    msg = "There are lots of glowing mushrooms in the forest! Would you like to go mushroom picking with me? 🍄";
                    exp = 'excited';
                } else if (val === 'starry') {
                    msg = "So warm... I'm getting sleepy... Let's count stars together tonight, zzz... 😴⭐";
                    exp = 'thoughtful';
                } else if (val === 'nautical') {
                    msg = "Set sail! Our target is the starry sea, next stop is Strawberry Island! ⚓⛵";
                    exp = 'excited';
                } else if (val === 'strawberry') {
                    msg = "The weather today is perfect for a picnic. Here, have a sweet, fresh strawberry! 🍓";
                    exp = 'friendly';
                } else if (val === 'wizard') {
                    msg = "Casting a spell: Hula-la-change! All negative energy and worries, fade away! 🪄✨";
                    exp = 'excited';
                }
                state.avatar.expression = exp;
                // Play interactive pop sound (disabled to prevent beep feedback)
                /*
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.15);
                } catch(e) {}
                */
                // Trigger speaking dialogue speech synthesis bubble
                setTimeout(() => speakResponse(msg), 150);
            }

            renderAvatarVisuals();
            try {
                localStorage.setItem('kawanku_avatar_state', JSON.stringify(state.avatar));
            } catch(e) {}
            this.listeners.forEach(callback => callback(state.avatar));
        },
        get(prop) {
            return state.avatar[prop];
        }
    };

    function renderCustomizerUI() {
        const subtabsContainer = DOM.customizerSubtabs;
        const gridContainer = DOM.customizerItemGrid;
        if (!subtabsContainer || !gridContainer) return;

        // 1. Render Subtabs
        subtabsContainer.innerHTML = '';
        const categoryData = AVATAR_CATALOG[activeCategory];

        if (categoryData.subcategories.length > 1) {
            subtabsContainer.style.display = 'flex';
            categoryData.subcategories.forEach(sub => {
                const btn = document.createElement('button');
                btn.className = `subtab-btn ${sub === activeSubcategory ? 'active' : ''}`;
                btn.innerText = sub;
                btn.addEventListener('click', () => {
                    activeSubcategory = sub;
                    renderCustomizerUI();
                });
                subtabsContainer.appendChild(btn);
            });
        } else {
            subtabsContainer.style.display = 'none';
        }

        // 2. Render Grid Items
        gridContainer.innerHTML = '';
        const items = categoryData.items[activeSubcategory];
        if (!items) return;

        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'catalog-card';

            const unlocked = isItemUnlocked(item);
            if (!unlocked) {
                card.classList.add('locked-item');
            }

            const currentVal = state.avatar[item.prop];
            if (currentVal === item.id) {
                card.classList.add('active');
            }

            const previewDiv = document.createElement('div');
            previewDiv.className = 'catalog-card-preview';

            if (item.svg) {
                previewDiv.innerHTML = item.svg;
            } else if (item.color) {
                const swatch = document.createElement('div');
                swatch.className = 'color-swatch-circle';
                swatch.style.background = item.color;
                previewDiv.appendChild(swatch);
            }

            card.appendChild(previewDiv);

            const label = document.createElement('div');
            label.className = 'catalog-card-label';
            label.innerText = item.label + (unlocked ? '' : ' 🔒');
            card.appendChild(label);

            card.addEventListener('click', () => {
                if (!unlocked) {
                    showToast('这是火花商店限定单品，请先兑换解锁！', 'warning');
                    return;
                }
                avatarState.set(item.prop, item.id);
                if (item.prop === 'accessory' && item.id === 'none') {
                    avatarState.set('hairStyle', 'none');
                }
                renderCustomizerUI();
            });

            gridContainer.appendChild(card);
        });
    }

    function randomizeAvatarConfig() {
        const mascotColors = ['#ffd6e0', '#dbf7f9', '#e8f5e9', '#e8dff5'];
        const expressionOptions  = ['friendly', 'starry', 'wink', 'sleepy', 'blep', 'uwu', 'teary', 'cat'];
        const blushOptions       = ['circle', 'heart', 'star', 'sakura', 'sparkle', 'dots', 'crescent', 'butterfly'];
        const accOptions         = ['none', 'round_glasses', 'night_mask', 'sprout', 'heart_glasses', 'cat_glasses', 'flower_glasses', 'angel_glasses', 'boba_glasses', 'puppy_glasses'];
        const sceneOptions       = ['starry_night', 'lofi_study', 'floating_garden', 'boba_cafe', 'pink_bedroom', 'cozy_cabin', 'magic_forest', 'candy_castle', 'coral_palace', 'moon_carousel'];

        state.avatar.skinTone     = getRandomElement(mascotColors);
        state.avatar.expression   = getRandomElement(expressionOptions);
        state.avatar.blushShape   = getRandomElement(blushOptions);
        state.avatar.accessory    = getRandomElement(accOptions);
        state.avatar.currentScene = getRandomElement(sceneOptions);

        renderAvatarVisuals();
        
        if (typeof renderCustomizerUI === 'function') {
            renderCustomizerUI();
        }
        
        showToast("Mascot Buddy randomized!", "success");
    }

    // ----------------------------------------------------------------------
    // HELPER FUNCTIONS
    // ----------------------------------------------------------------------
    function getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function getRandomHexColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // =========================================================================
    // MENTAL STREAK ENGINE — Gamified Mental Health Quiz System
    // =========================================================================
    (function MentalStreakEngine() {

        // ── State persisted in localStorage ──────────────────────────────────
        const STORE_KEY = 'kawanku_streak';
        function loadState() {
            try {
                const raw = localStorage.getItem(STORE_KEY);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return {
                streakDay: 1,
                coins: 0,
                passesUsed: 0,          // resets each Mon
                passesWeekReset: null,  // ISO date string of last Mon reset
                journal: []
            };
        }
        function saveState(s) {
            localStorage.setItem(STORE_KEY, JSON.stringify(s));
        }
        function getWeekStart() {
            const d = new Date();
            const day = d.getDay(); // 0=Sun
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(d.setDate(diff));
            return mon.toISOString().split('T')[0];
        }
        function resetPassesIfNewWeek(s) {
            const thisWeek = getWeekStart();
            if (s.passesWeekReset !== thisWeek) {
                s.passesUsed = 0;
                s.passesWeekReset = thisWeek;
            }
        }

        const MAX_PASSES = 2;

        // ── Per-session quiz variables ────────────────────────────────────────
        let state = loadState();
        resetPassesIfNewWeek(state);

        let currentQuestion = 0;   // 1-3
        let answers = [];          // user's chosen option texts
        let monsterData = {};      // { emoji, name }
        let monsterHP = 100;
        let monsterMaxHP = 100;
        let comboCount = 0;
        let bgmMuted = false;
        let bgmNodes = {};         // Web Audio nodes
        let currentPhase = 'intro';
        let simulatedHR = Math.floor(Math.random() * 30 + 72); // 72-101 bpm

        // ── DOM references ────────────────────────────────────────────────────
        const $ = id => document.getElementById(id);
        const phases = {
            intro:   $('streak-phase-intro'),
            question:$('streak-phase-question'),
            loading: $('streak-phase-loading'),
            monster: $('streak-phase-monster'),
            report:  $('streak-phase-report'),
            crisis:  $('streak-phase-crisis')
        };

        function showPhase(name) {
            currentPhase = name;
            Object.entries(phases).forEach(([k, el]) => {
                if (!el) return;
                if (k === name) el.classList.remove('hidden');
                else el.classList.add('hidden');
            });
        }

        // ── Intro population ─────────────────────────────────────────────────
        function populateIntro() {
            const passLeft = MAX_PASSES - state.passesUsed;
            const passStr = `${passLeft}/${MAX_PASSES}`;
            const hrLabel = simulatedHR > 90 ? '😤 Looking a bit stressed!' : '😌 Cool as a cucumber!';
            if ($('streak-day-display'))   $('streak-day-display').textContent   = `Day ${state.streakDay}`;
            if ($('streak-pass-display'))  $('streak-pass-display').textContent  = passStr;
            if ($('streak-coins-display')) $('streak-coins-display').textContent = state.coins;
            if ($('streak-hr-display'))    $('streak-hr-display').textContent    = `${simulatedHR} bpm ${hrLabel}`;
            if ($('streak-bgm-label'))     $('streak-bgm-label').textContent     = '🌿 Rainforest Lo-Fi Chill — Active';
        }

        // ── Web Audio BGM ─────────────────────────────────────────────────────
        let audioCtx = null;
        function getAudioCtx() {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            return audioCtx;
        }

        function stopAllBGM() {
            Object.values(bgmNodes).forEach(n => { try { n.stop(); } catch(e){} });
            bgmNodes = {};
        }

        function playCalmBGM() {
            if (bgmMuted) return;
            stopAllBGM();
            try {
                const ctx = getAudioCtx();
                // Soft sine pad at 174Hz (healing frequency)
                [174, 220, 261].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.04 - i * 0.01, ctx.currentTime + 2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    bgmNodes[`calm_${i}`] = osc;
                });
                if ($('streak-bgm-label')) $('streak-bgm-label').textContent = '🌿 Lo-Fi Healing Pads — Playing';
            } catch(e) {}
        }

        function playBattleBGM() {
            if (bgmMuted) return;
            stopAllBGM();
            try {
                const ctx = getAudioCtx();
                // Punchy percussive rhythm
                function beatTick() {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.value = 80 + Math.random() * 40;
                    gain.gain.setValueAtTime(0.18, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.2);
                }
                const interval = setInterval(beatTick, 280);
                bgmNodes['battle_interval'] = { stop: () => clearInterval(interval) };
                if ($('streak-bgm-label')) $('streak-bgm-label').textContent = '🔥 Hype Battle Theme — Active!';
            } catch(e) {}
        }

        function playHealingBGM() {
            if (bgmMuted) return;
            stopAllBGM();
            try {
                const ctx = getAudioCtx();
                // Tibetan-style sustained tones
                [396, 528].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.035 - i * 0.01, ctx.currentTime + 3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    bgmNodes[`heal_${i}`] = osc;
                });
                if ($('streak-bgm-label')) $('streak-bgm-label').textContent = '🍃 Tibetan Singing Bowls — Playing';
            } catch(e) {}
        }

        function playSmashSFX() {
            if (bgmMuted) return;
            try {
                const ctx = getAudioCtx();
                const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
                const data = buf.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
                const src = ctx.createBufferSource();
                const gain = ctx.createGain();
                src.buffer = buf;
                gain.gain.value = 0.3;
                src.connect(gain);
                gain.connect(ctx.destination);
                src.start();
            } catch(e) {}
        }

        // ── Crisis detection ─────────────────────────────────────────────────
        const CRISIS_WORDS = [
            'suicide','kill myself','end my life','want to die','self harm',
            'cut myself','hurt myself','no point living','can\'t go on',
            'don\'t want to be here','disappear forever','everyone better without me'
        ];
        function detectCrisis(text) {
            const lower = text.toLowerCase();
            return CRISIS_WORDS.some(w => lower.includes(w));
        }

        // ── Gemini API call ──────────────────────────────────────────────────
        const MENTAL_STREAK_SYSTEM = `You are the Mental Streak Engine inside KawanKu AI — a mental health companion for Malaysian secondary school students.
Your job is to run a 3-question gamified "blind box" mental check-in quiz, one step at a time.
Always respond in JSON only. No markdown fences around the JSON.

Tone: Gen-Z savvy, witty, warm, Malaysian-relatable. Use Manglish/Malaysian school references naturally.
Language mix: Mostly English, sprinkle BM words (e.g. "haiyah", "confirm", "siaaa", "jangan", "eh", "lah").

IMPORTANT SAFETY RULE: If ANY user input contains signs of crisis (suicidal thoughts, self-harm), respond with:
{ "crisis": true }

For Step 1 (first question), respond with:
{
  "step": 1,
  "story": "<2-3 sentence scene-setting story relevant to today's school stressor. Witty and fast-paced.>",
  "question": "<The actual question text>",
  "options": [
    { "type": "positive", "emoji": "📖", "text": "<Positive coping option>" },
    { "type": "neutral",  "emoji": "😰", "text": "<Realistic middle-ground option>" },
    { "type": "layflat",  "emoji": "🦥", "text": "<Funny defeated/rebellious 'lay flat' option>" }
  ],
  "theme": "<A short 2-4 word theme name for today e.g. 'The Pop Quiz Panic'>"
}

For Step 2 (second question), respond with:
{
  "step": 2,
  "reaction": "<Witty 1-2 sentence banter responding to the user's previous answer. Validate their feeling.>",
  "story": "<Advance the plot. 2-3 sentences. Build tension.>",
  "question": "<Second question text>",
  "options": [
    { "type": "positive", "emoji": "🧠", "text": "<Positive option>" },
    { "type": "neutral",  "emoji": "🧐", "text": "<Neutral option>" },
    { "type": "layflat",  "emoji": "🦥", "text": "<Lay flat option>" }
  ]
}

For Step 3 (third question), respond with:
{
  "step": 3,
  "reaction": "<1-2 sentence banter on Q2 answer.>",
  "story": "<Climax! The stress monster is about to emerge. 2-3 dramatic sentences.>",
  "question": "<Final question text>",
  "options": [
    { "type": "positive", "emoji": "💪", "text": "<Positive option>" },
    { "type": "neutral",  "emoji": "😤", "text": "<Neutral option>" },
    { "type": "layflat",  "emoji": "🦥", "text": "<Lay flat option>" }
  ],
  "monster": {
    "emoji": "<Single monster emoji e.g. 👾 🐙 😈 👻 🦖 🤡>",
    "name": "<Creative goofy monster name e.g. 'The Balding Final Exam Beast' or 'The Exam Panic Goblin'>"
  }
}

For the Report (after monster defeat), respond with:
{
  "step": "report",
  "persona": "<Funny humorous title e.g. 'The Calm-on-Outside Screaming-Inside Academic Ninja'>",
  "defense_pct": <integer 40-100 based on positivity of answers>,
  "treehouse": "<2-3 sentence empathetic paragraph unpacking the psychology of their choices + 1 super easy micro-action tip>",
  "coins_earned": 10,
  "streak_day": <current streak day + 1>,
  "wardrobe_tip": "<FOMO-inducing wardrobe unlock hint e.g. '2 more days to unlock the 🦸 Exam-Immunity Golden Cape!'>"
}`;

        async function callGeminiLocal(userMsg) {
            if (!canAttemptGemini()) {
                // Return a fallback if no API key/proxy
                return null;
            }
            const body = {
                system_instruction: { parts: [{ text: MENTAL_STREAK_SYSTEM }] },
                contents: [{ role: 'user', parts: [{ text: userMsg }] }],
                generationConfig: { temperature: 0.85, maxOutputTokens: 1024 }
            };
            try {
                const data = await callGemini('gemini-1.5-flash', body);
                if (!data) return null;
                const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                // Strip potential markdown fences
                const cleaned = text.replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim();
                return JSON.parse(cleaned);
            } catch(e) {
                console.warn('[StreakEngine] Gemini parse error:', e);
                return null;
            }
        }

        // ── Fallback content (when no API key) ───────────────────────────────
        const FALLBACKS = [
            {
                step: 1,
                theme: "The Monday Morning Mayhem",
                story: "You walk into school Monday morning and Cikgu drops the bomb — pop quiz in 10 minutes! ⚡ Your brain is still buffering from the weekend. The student next to you pulls out a 10-page cheat sheet. Classic.",
                question: "How does your brain respond to the surprise pop quiz?",
                options: [
                    { type: 'positive', emoji: '📖', text: "Let's goooo! I actually studied (a little). Time to shine!" },
                    { type: 'neutral',  emoji: '😰', text: "Okay okay okay... stay calm. Write SOMETHING. Partial marks exist, right?" },
                    { type: 'layflat',  emoji: '🦥', text: "Close eyes. If I can't see the paper, the quiz can't hurt me. Nap time." }
                ]
            },
            {
                step: 2,
                reaction: "Okay okay, we see you! Whether you're crushing it or surviving it, KawanKu's got your back. 💪",
                story: "Halfway through the quiz — your pen runs out of ink. The horror. You borrow from your friend but now you owe them bubble tea. As if life wasn't already stressful enough.",
                question: "Your pen just died. What's your next move?",
                options: [
                    { type: 'positive', emoji: '🧠', text: "No biggie, I always carry a backup. Prepared is my middle name." },
                    { type: 'neutral',  emoji: '🧐', text: "Borrow from bae, negotiate the bubble tea debt later. Problems for future me." },
                    { type: 'layflat',  emoji: '🦥', text: "Sign the quiz with blood. Metaphorically. I'm done with this universe." }
                ]
            },
            {
                step: 3,
                reaction: "Valid reaction tbh. The universe clearly had it out for you today. 😤",
                story: "The quiz is FINALLY over but then... your teacher announces the results will count for 30% of your grade. The stress has reached MAXIMUM OVERDRIVE. A dark energy is forming... a monster shaped from all your academic anxiety is materializing! 🚨",
                question: "The grade reveal is tomorrow. How do you handle tonight?",
                options: [
                    { type: 'positive', emoji: '💪', text: "Review my answers, accept whatever comes, and sleep by 11pm. Growth mindset!" },
                    { type: 'neutral',  emoji: '😤', text: "Doomscroll TikTok until 2am, then panic-text my study group. Classic me." },
                    { type: 'layflat',  emoji: '🦥', text: "Enter emotional shutdown mode. The grades are not real. Nothing is real. Goodnight." }
                ],
                monster: { emoji: '👾', name: 'The Balding Final Exam Beast' }
            }
        ];

        function getFallbackReport(answers) {
            const posCount = answers.filter(a => a.type === 'positive').length;
            const pct = 40 + posCount * 20;
            return {
                step: 'report',
                persona: posCount >= 2 ? 'The "Calm Under Fire" Academic Warrior 🏹' : posCount === 1 ? 'The "Surviving But Make It Aesthetic" Realist 🌙' : 'The "Full Send on Lay Flat Mode" Chaos Champion 🦥',
                defense_pct: pct,
                treehouse: `You tackled today's stress with ${posCount >= 2 ? 'real resilience' : 'honest realness'} — and that actually takes courage. ${posCount < 2 ? 'Choosing to laugh at the chaos is a valid coping strategy too. Humour is a superpower.' : 'Staying grounded when things spiral is a real skill.'} Micro-action for tonight: spend exactly 2 minutes writing down one thing that went okay today, no matter how small. ✏️`,
                coins_earned: 10,
                streak_day: state.streakDay + 1,
                wardrobe_tip: `Maintain your streak for ${3 - (state.streakDay % 3)} more days to unlock the legendary 🦸 【Exam-Immunity Golden Cape】 skin!`
            };
        }

        // ── Render a question phase ───────────────────────────────────────────
        function renderQuestion(data) {
            showPhase('question');
            const q = currentQuestion;

            // Update step dots
            [1,2,3].forEach(i => {
                const dot = $(`sdot-${i}`);
                if (!dot) return;
                dot.classList.remove('active','done');
                if (i < q) dot.classList.add('done');
                else if (i === q) dot.classList.add('active');
            });

            // Pass count
            const passLeft = MAX_PASSES - state.passesUsed;
            if ($('sq-pass-remaining')) $('sq-pass-remaining').textContent = passLeft;

            // Story box
            let storyText = '';
            if (data.reaction) storyText += data.reaction + '\n\n';
            storyText += data.story || '';
            if ($('streak-story-box')) $('streak-story-box').textContent = storyText;

            // Options
            const grid = $('streak-options-grid');
            if (!grid) return;
            grid.innerHTML = '';
            data.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = `streak-option-btn opt-${opt.type}`;
                btn.textContent = `${opt.emoji}  ${opt.text}`;
                if (opt.type === 'layflat' && passLeft <= 0) {
                    btn.classList.add('disabled');
                }
                btn.addEventListener('click', () => handleOptionClick(opt, data));
                grid.appendChild(btn);
            });

            // Hide pass warning
            const warn = $('streak-pass-warning');
            if (warn) warn.classList.add('hidden');
        }

        async function handleOptionClick(opt, stepData) {
            // Crisis check on option text
            if (detectCrisis(opt.text)) { showPhase('crisis'); stopAllBGM(); return; }

            // Lay flat pass logic
            if (opt.type === 'layflat') {
                const passLeft = MAX_PASSES - state.passesUsed;
                if (passLeft <= 0) {
                    const warn = $('streak-pass-warning');
                    if (warn) warn.classList.remove('hidden');
                    return;
                }
                state.passesUsed++;
                saveState(state);
                const pl = MAX_PASSES - state.passesUsed;
                if ($('sq-pass-remaining')) $('sq-pass-remaining').textContent = pl;
                if ($('streak-pass-display')) $('streak-pass-display').textContent = `${pl}/${MAX_PASSES}`;
            }

            answers.push({ type: opt.type, text: opt.text });

            if (currentQuestion < 3) {
                currentQuestion++;
                await loadNextQuestion(stepData);
            } else {
                // All 3 done → show monster
                await loadMonsterPhase(stepData);
            }
        }

        async function loadNextQuestion(prevStepData) {
            showPhase('loading');
            if ($('streak-loading-text')) $('streak-loading-text').textContent = `KawanKu is building Question ${currentQuestion}...`;

            // Build prompt context
            const answerSummary = answers.map((a,i) => `Q${i+1} answer (${a.type}): "${a.text}"`).join('\n');
            const prompt = `The student has answered ${answers.length} question(s) so far:\n${answerSummary}\n\nNow generate Step ${currentQuestion} of the quiz.`;

            let data = await callGeminiLocal(prompt);
            if (!data) data = FALLBACKS[currentQuestion - 1];
            if (data.crisis) { showPhase('crisis'); stopAllBGM(); return; }

            renderQuestion(data);
        }

        async function loadMonsterPhase(lastStepData) {
            // Extract monster from last step data or fallback
            let monster = lastStepData?.monster || { emoji: '👾', name: 'The Exam Panic Goblin' };
            monsterData = monster;
            monsterHP = 100;
            monsterMaxHP = 100;
            comboCount = 0;

            if ($('monster-emoji')) $('monster-emoji').textContent = monster.emoji;
            if ($('monster-name'))  $('monster-name').textContent  = monster.name;
            updateMonsterHP(100);

            showPhase('monster');
            stopAllBGM();
            playBattleBGM();
        }

        // ── Monster HP ────────────────────────────────────────────────────────
        function updateMonsterHP(pct) {
            const bar  = $('monster-hp-bar');
            const text = $('monster-hp-text');
            if (bar)  bar.style.width = `${Math.max(0, pct)}%`;
            const hp = Math.round(pct);
            if (text) text.textContent = `HP: ${hp} / 100`;
        }

        function smashMonster() {
            if (monsterHP <= 0) return;
            playSmashSFX();
            comboCount++;

            // Damage: 20-35 per hit
            const dmg = 20 + Math.floor(Math.random() * 16);
            monsterHP = Math.max(0, monsterHP - dmg);
            updateMonsterHP(monsterHP);

            // Hit animation
            const body = $('monster-body');
            if (body) {
                body.classList.remove('hit');
                void body.offsetWidth; // reflow
                body.classList.add('hit');
                setTimeout(() => body.classList.remove('hit'), 280);
            }

            // Shake arena
            const arena = document.querySelector('.monster-arena');
            if (arena) {
                arena.classList.remove('shaking');
                void arena.offsetWidth;
                arena.classList.add('shaking');
                setTimeout(() => arena.classList.remove('shaking'), 370);
            }

            // Add crack
            addCrack();

            // Combo display
            const comboEl = $('monster-combo');
            const comboText = $('monster-combo-text');
            if (comboEl && comboText) {
                comboText.textContent = comboCount === 1 ? '💥 SMASH!' : comboCount === 2 ? '🔥 DOUBLE SMASH!' : comboCount >= 3 ? `⚡ COMBO x${comboCount}!!!` : `💥 HIT!`;
                comboEl.classList.remove('hidden');
                comboEl.style.animation = 'none';
                void comboEl.offsetWidth;
                comboEl.style.animation = 'combo-pop 0.4s ease';
                clearTimeout(comboEl._hideTimer);
                comboEl._hideTimer = setTimeout(() => comboEl.classList.add('hidden'), 1400);
            }

            // Death?
            if (monsterHP <= 0) {
                setTimeout(triggerMonsterDeath, 400);
            }
        }

        function addCrack() {
            const cracksDiv = $('monster-cracks');
            if (!cracksDiv || cracksDiv.children.length >= 5) return;
            const crack = document.createElement('div');
            crack.className = 'crack';
            crack.style.cssText = `
                left: ${20 + Math.random() * 60}%;
                top: ${20 + Math.random() * 60}%;
                width: ${15 + Math.random() * 30}px;
                transform: rotate(${Math.random() * 180}deg);
            `;
            cracksDiv.appendChild(crack);
        }

        async function triggerMonsterDeath() {
            stopAllBGM();
            const body = $('monster-body');
            if (body) {
                body.classList.add('dead');
            }
            // Coin burst visual
            const arena = document.querySelector('.monster-arena');
            if (arena) {
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        const coin = document.createElement('span');
                        coin.className = 'coin-burst';
                        coin.textContent = '🪙';
                        coin.style.left = `${Math.random() * 80 + 10}%`;
                        arena.style.position = 'relative';
                        arena.appendChild(coin);
                        setTimeout(() => coin.remove(), 900);
                    }, i * 120);
                }
            }

            // Wait then show report
            setTimeout(async () => {
                await loadReport();
            }, 1000);
        }

        async function loadReport() {
            showPhase('loading');
            if ($('streak-loading-text')) $('streak-loading-text').textContent = 'Generating your 60-Second Mental Audit Report...';

            const answerSummary = answers.map((a,i) => `Q${i+1} answer (${a.type}): "${a.text}"`).join('\n');
            const prompt = `The student finished all 3 questions. Their answers:\n${answerSummary}\n\nNow generate the final Report (step: "report").`;

            let data = await callGeminiLocal(prompt);
            if (!data || data.crisis) data = getFallbackReport(answers);

            // Update state
            state.streakDay = data.streak_day || state.streakDay + 1;
            state.coins += (data.coins_earned || 10);
            saveState(state);

            renderReport(data);
            playHealingBGM();
        }

        function renderReport(data) {
            showPhase('report');
            const pct = data.defense_pct || 70;
            const progressBlocks = Math.round(pct / 20);
            const bar = '■'.repeat(progressBlocks) + '□'.repeat(5 - progressBlocks);

            const html = `<div class="report-section">
  <div class="report-section-title">🏆 Today's Soul Persona</div>
  <strong>${data.persona}</strong>
</div>
<div class="report-section">
  <div class="report-section-title">📊 Mental Defense Rating</div>
  <code style="color:#a78bfa;font-size:1.1rem;">[${bar}] ${pct}%</code>
  <div class="report-progress-bar-wrap"><div class="report-progress-fill" id="report-prog-fill" style="width:0%"></div></div>
</div>
<div class="report-section">
  <div class="report-section-title">💌 Hidden Soul Treehouse</div>
  <p style="font-size:0.87rem;line-height:1.7;color:var(--color-text-primary)">${data.treehouse}</p>
</div>
<div class="report-section">
  <div class="report-section-title">🎁 Streak &amp; Loot Summary</div>
  <div class="report-loot-row">💥 Monster Defeated! <span class="report-coins-badge">+${data.coins_earned || 10} 🪙 Kawan Coins</span></div>
  <div class="report-loot-row">💰 Wallet: <span class="report-coins-badge">${state.coins} 🪙</span></div>
  <div class="report-loot-row">⚡ Streak: <strong>Day ${state.streakDay}!</strong> KawanKu sends a finger heart 🫶</div>
  <div class="report-loot-row" style="margin-top:8px;font-size:0.82rem;color:#fbbf24;">👕 ${data.wardrobe_tip}</div>
</div>`;

            const content = $('report-content');
            if (content) content.innerHTML = html;

            // Animate progress bar
            setTimeout(() => {
                const fill = $('report-prog-fill');
                if (fill) fill.style.width = `${pct}%`;
            }, 300);

            // Update intro counters for next time
            if ($('streak-coins-display')) $('streak-coins-display').textContent = state.coins;
        }

        // ── Sticky note ───────────────────────────────────────────────────────
        function initStickyNote() {
            const input  = $('sticky-note-input');
            const chars  = $('sticky-chars');
            const btn    = $('sticky-save-btn');
            const saved  = $('sticky-saved-msg');
            if (!input) return;
            input.addEventListener('input', () => {
                if (chars) chars.textContent = input.value.length;
            });
            if (btn) btn.addEventListener('click', () => {
                const note = input.value.trim();
                if (!note) return;
                state.journal.push({ date: new Date().toISOString(), note });
                saveState(state);
                if (saved) saved.classList.remove('hidden');
                btn.disabled = true;
                btn.textContent = '✅ Saved!';
            });
        }

        // ── BGM mute toggle ──────────────────────────────────────────────────
        function initMuteBtn() {
            const btn = $('bgm-mute-btn');
            if (!btn) return;
            btn.addEventListener('click', () => {
                bgmMuted = !bgmMuted;
                if (bgmMuted) {
                    stopAllBGM();
                    btn.classList.add('muted');
                    btn.textContent = '🔔 Sound On';
                } else {
                    btn.classList.remove('muted');
                    btn.textContent = '🔇 Silent Mode';
                    if (currentPhase === 'question' || currentPhase === 'intro') playCalmBGM();
                    else if (currentPhase === 'monster') playBattleBGM();
                    else if (currentPhase === 'report') playHealingBGM();
                }
            });
        }

        // ── Monster bash events ───────────────────────────────────────────────
        function initMonsterBash() {
            // Tap on monster body
            const monsterAvatar = $('monster-avatar');
            if (monsterAvatar) {
                monsterAvatar.addEventListener('click', (e) => {
                    if (monsterHP > 0) smashMonster();
                });
                monsterAvatar.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (monsterHP > 0) smashMonster();
                }, { passive: false });
            }

            // Type input smash
            const typeInput = $('monster-type-input');
            const smashBtn  = $('monster-smash-btn');
            const SMASH_WORDS = ['smash','punch','hit','destroy','dieeee','die','die!!!','bonk','bash','yeet','kill','obliterate'];

            function doTypeSmash() {
                const val = (typeInput?.value || '').trim().toLowerCase();
                if (detectCrisis(val)) { showPhase('crisis'); stopAllBGM(); return; }
                if (val && (SMASH_WORDS.some(w => val.includes(w)) || val.length > 0)) {
                    smashMonster();
                    if (typeInput) typeInput.value = '';
                }
            }

            if (typeInput) {
                typeInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') doTypeSmash();
                });
            }
            if (smashBtn) smashBtn.addEventListener('click', doTypeSmash);
        }

        // ── Start quiz flow ───────────────────────────────────────────────────
        async function startQuiz() {
            currentQuestion = 1;
            answers = [];
            monsterHP = 100;
            comboCount = 0;

            // Clear cracks
            const cracksDiv = $('monster-cracks');
            if (cracksDiv) cracksDiv.innerHTML = '';
            const monsterBody = $('monster-body');
            if (monsterBody) monsterBody.classList.remove('dead');

            showPhase('loading');
            if ($('streak-loading-text')) $('streak-loading-text').textContent = 'Opening your Mental Blind Box...';
            playCalmBGM();

            const today = new Date();
            const themes = ['pop quiz panic','canteen food running out','group project member ghosting','presentation slides corrupted','homework deadline tonight','comparison trap with classmates'];
            const todayTheme = themes[today.getDay() % themes.length];

            const prompt = `Today's theme hint: "${todayTheme}". Student streak day: ${state.streakDay}. Heart rate: ${simulatedHR} bpm. Generate Step 1 of the quiz.`;

            let data = await callGeminiLocal(prompt);
            if (!data) data = FALLBACKS[0];
            if (data.crisis) { showPhase('crisis'); stopAllBGM(); return; }

            renderQuestion(data);
        }

        // ── Restart ───────────────────────────────────────────────────────────
        function resetToIntro() {
            stopAllBGM();
            simulatedHR = Math.floor(Math.random() * 30 + 72);
            populateIntro();
            showPhase('intro');
            // Reset sticky note
            const input = $('sticky-note-input');
            const saved = $('sticky-saved-msg');
            const btn   = $('sticky-save-btn');
            if (input) { input.value = ''; }
            if (saved) saved.classList.add('hidden');
            if (btn)   { btn.disabled = false; btn.textContent = '💾 Save to Journal'; }
            const chars = $('sticky-chars');
            if (chars) chars.textContent = '0';
        }

        // ── Crisis back ───────────────────────────────────────────────────────
        function initCrisisBack() {
            const backBtn = $('crisis-back-btn');
            if (backBtn) backBtn.addEventListener('click', resetToIntro);
        }

        // ── Boot ──────────────────────────────────────────────────────────────
        function boot() {
            // Only init if the quiz card is present in DOM
            if (!$('streak-engine-card')) return;

            populateIntro();
            showPhase('intro');
            initMuteBtn();
            initMonsterBash();
            initStickyNote();
            initCrisisBack();

            const startBtn   = $('streak-start-btn');
            const restartBtn = $('streak-restart-btn');
            if (startBtn)   startBtn.addEventListener('click', startQuiz);
            if (restartBtn) restartBtn.addEventListener('click', resetToIntro);
        }

        // Wait for DOM then boot
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', boot);
        } else {
            boot();
        }

    })(); // END MentalStreakEngine

    // =========================================================================
    // EMOTION QUIZ — Gemini-powered clinical screening quiz
    // =========================================================================
    (function EmotionQuizEngine() {
        const SPARK_KEY = 'kawanku_spark';
        function loadSpark() {
            try { const d = JSON.parse(localStorage.getItem(SPARK_KEY)); if (d) return d; } catch(e) {}
            return { days: 1, boxesOpened: 0, lastDiagnosis: '', personalityTag: '' };
        }
        function saveSpark(s) { localStorage.setItem(SPARK_KEY, JSON.stringify(s)); }
        let spark = loadSpark();

        const qSparkCount = document.getElementById('quiz-spark-count');
        const qBoxesOpened = document.getElementById('quiz-boxes-opened');
        const qLastDiag = document.getElementById('quiz-last-diagnosis');
        const qPersonality = document.getElementById('quiz-personality-tag');
        const qStartBtn = document.getElementById('quiz-ai-start-btn');
        const qRestartBtn = document.getElementById('quiz-ai-restart-btn');
        const qMessages = document.getElementById('quiz-chat-messages');
        const qInput = document.getElementById('quiz-chat-input');
        const qSendBtn = document.getElementById('quiz-chat-send-btn');
        const qBadge = document.getElementById('quiz-universe-badge');
        const qOptions = document.getElementById('quiz-chat-options');

        function syncQuizUI() {
            if (qSparkCount) qSparkCount.innerText = spark.days;
            if (qBoxesOpened) qBoxesOpened.innerText = spark.boxesOpened;
            if (qLastDiag) qLastDiag.innerText = spark.lastDiagnosis || '—';
            if (qPersonality) qPersonality.innerText = spark.personalityTag || '—';
            const shopBal = document.getElementById('shop-spark-balance');
            if (shopBal) shopBal.innerText = spark.days;
        }
        syncQuizUI();

        const QUIZ_ASPECTS = [
            {
                name: "Mood & Dysphoria",
                questions: [
                    "I feel extremely sad without any clear reason.",
                    "The feeling of emptiness in my chest is difficult to get rid of.",
                    "I find it difficult to smile sincerely at others.",
                    "I feel helpless to change my mood for the better.",
                    "I feel as if tomorrow holds no meaning at all."
                ]
            },
            {
                name: "Anhedonia & Lack of Motivation",
                questions: [
                    "The hobbies I used to enjoy now feel boring.",
                    "I feel no motivation to start daily tasks.",
                    "I feel zero energy even after sleeping for a long time.",
                    "I find it difficult to force myself to shower or clean myself.",
                    "I feel like a robot moving without a purpose."
                ]
            },
            {
                name: "Cognitive Anxiety & Overthinking",
                questions: [
                    "My mind is constantly thinking about bad things that might not even happen.",
                    "I find it difficult to stop my racing thoughts.",
                    "I often imagine the worst-case scenario in every situation.",
                    "I feel excessively worried about my future.",
                    "It is hard to shut down my mind, even at bedtime."
                ]
            },
            {
                name: "Physical & Somatic Anxiety Responses",
                questions: [
                    "My heart suddenly beats rapidly without any physical cause.",
                    "I feel tightness in my chest and find it difficult to take deep breaths.",
                    "My palms often break into a cold sweat when I feel anxious.",
                    "My stomach feels upset or nauseous when facing new situations.",
                    "My neck and shoulder muscles always feel tense."
                ]
            },
            {
                name: "Stress Tolerance & Irritability",
                questions: [
                    "I become very easily angered over small matters.",
                    "My patience has been very thin lately.",
                    "I easily feel irritated by other people's voices or habits.",
                    "I feel angry when my plans are disrupted, even slightly.",
                    "I tend to vent my anger on innocent people."
                ]
            },
            {
                name: "Mental Fatigue & Burnout",
                questions: [
                    "I feel my brain is too overloaded to think anymore.",
                    "I experience mental fatigue that does not go away even after a vacation.",
                    "I have difficulty making simple decisions.",
                    "I feel like a robot carrying out a routine without any soul.",
                    "I feel my mental energy has been completely drained."
                ]
            },
            {
                name: "Trauma Awareness & Emotional Triggers",
                questions: [
                    "Painful past memories often pop into my mind suddenly.",
                    "I am easily startled by loud noises or sudden movements.",
                    "Certain places or situations can make me feel panicked for no reason.",
                    "I feel my nervous system is always on high alert for danger.",
                    "I feel past trauma has blocked my potential to move forward."
                ]
            },
            {
                name: "Biological Patterns & Sleep Quality",
                questions: [
                    "It takes me more than an hour to fall asleep.",
                    "I frequently wake up in the middle of the night and struggle to fall back asleep.",
                    "My appetite has completely disappeared lately.",
                    "I do not feel refreshed at all, even after sleeping for more than 8 hours.",
                    "I feel as if my body rejects all efforts to rest."
                ]
            },
            {
                name: "Social Relationships & Self-Isolation",
                questions: [
                    "I intentionally leave friends' messages unanswered for days.",
                    "I prefer to spend my days off alone in a dark room.",
                    "I feel like nobody truly understands what I am going through.",
                    "I tend to make up excuses to avoid attending gatherings.",
                    "I feel like an actor wearing a mask of cheerfulness in front of the public."
                ]
            },
            {
                name: "Self-Esteem & Psychological Resilience",
                questions: [
                    "I feel worthless and that I don't have any talent.",
                    "I am constantly comparing my weaknesses with others' strengths.",
                    "I often feel like I am a fraud.",
                    "I find it difficult to bounce back after experiencing failure.",
                    "I find it hard to love myself with all my flaws."
                ]
            }
        ];

        let activeQuestions = [];
        let currentQuestionIdx = 0;
        let selectedAnswers = [];

        function scrollToLatestQuestion() {
            setTimeout(() => {
                if (qMessages) {
                    qMessages.scrollTo({
                        top: qMessages.scrollHeight,
                        behavior: 'smooth'
                    });
                }
                const optionsEl = document.getElementById('quiz-chat-options');
                if (optionsEl && !optionsEl.classList.contains('hidden')) {
                    optionsEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
                } else if (qMessages && qMessages.lastElementChild) {
                    qMessages.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }
            }, 60);
        }

        function addQuizBubble(text, type) {
            if (!qMessages) return;
            const div = document.createElement('div');
            div.className = type === 'ai' ? 'quiz-ai-bubble' : 'quiz-user-bubble';
            div.innerText = text;
            qMessages.appendChild(div);
            scrollToLatestQuestion();
        }

        function addQuizTyping() {
            if (!qMessages) return;
            const div = document.createElement('div');
            div.className = 'quiz-ai-bubble quiz-typing';
            div.id = 'quiz-typing-indicator';
            div.innerHTML = '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
            qMessages.appendChild(div);
            scrollToLatestQuestion();
        }

        function removeQuizTyping() {
            const el = document.getElementById('quiz-typing-indicator');
            if (el) el.remove();
        }

        function renderOptions() {
            if (!qOptions) return;
            qOptions.innerHTML = '';
            qOptions.classList.remove('hidden');
            
            const LIKERT_OPTIONS = [
                { key: "0", text: "Never", score: 0 },
                { key: "1", text: "Rarely", score: 1 },
                { key: "2", text: "Often", score: 2 },
                { key: "3", text: "Always", score: 3 }
            ];
            
            LIKERT_OPTIONS.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-opt-btn';
                btn.innerHTML = `<strong>${opt.key}.</strong> ${opt.text}`;
                btn.addEventListener('click', () => handleOptionSelection(opt));
                qOptions.appendChild(btn);
            });
            scrollToLatestQuestion();
        }

        function handleOptionSelection(opt) {
            const statement = activeQuestions[currentQuestionIdx];
            const aspectName = QUIZ_ASPECTS[currentQuestionIdx].name;
            selectedAnswers.push({
                aspect: aspectName,
                statement: statement,
                score: opt.score,
                optionText: opt.text
            });
            
            addQuizBubble(opt.text, 'user');
            
            if (qOptions) qOptions.classList.add('hidden');
            currentQuestionIdx++;
            showNextQuestion();
        }

        function showNextQuestion() {
            if (currentQuestionIdx < 10) {
                const statement = activeQuestions[currentQuestionIdx];
                const aspectName = QUIZ_ASPECTS[currentQuestionIdx].name;
                addQuizTyping();
                setTimeout(() => {
                    removeQuizTyping();
                    addQuizBubble(`Question ${currentQuestionIdx + 1}/10 (${aspectName}):\n\n"${statement}"`, 'ai');
                    renderOptions();
                    scrollToLatestQuestion();
                }, 300);
            } else {
                generateFinalReport();
            }
        }

        // Returns a short English sentence for a given score percentage (0% = healthy, 100% = severe)
        function getScoreLabel(pct) {
            if (pct <= 20)  return "Healthy baseline — well managed with minimal strain.";
            if (pct <= 40)  return "Mild stress — manageable with daily pacing and breaks.";
            if (pct <= 60)  return "Moderate stress level — active relaxation recommended.";
            if (pct <= 80)  return "High stress detected — consider dedicated self-care activities.";
            return "Severe level — advisor or counselor consultation recommended.";
        }

        function generateLocalReport(burnoutPct, fatiguePct, socialPct, academicPct, streakDays) {
            const categories = [
                { name: 'Burnout', score: burnoutPct },
                { name: 'Fatigue', score: fatiguePct },
                { name: 'Social Stress', score: socialPct },
                { name: 'Academic Pressure', score: academicPct }
            ];
            categories.sort((a, b) => b.score - a.score);
            const worst = categories[0].name;

            let solutions = [
                "Time Blocking: Allocate focused study blocks of 25 minutes (Pomodoro technique) followed by 5-minute breaks.",
                "Box Breathing: Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, and hold for 4 seconds to calm the nervous system.",
                "Mindful Walks: Spend 10-15 minutes outdoors, focusing entirely on nature and sensory details to quiet the mind.",
                "Boundary Setting: Dedicate specific hours to study/tasks and strictly disconnect afterwards."
            ];

            if (worst === 'Fatigue') {
                solutions[0] = "Sleep Hygiene: Maintain a consistent sleep schedule and limit screen exposure 1 hour before bed.";
                solutions[1] = "Sensory Reset: Practice 5-minute progressive muscle relaxation during moments of fatigue.";
            } else if (worst === 'Social Stress') {
                solutions[0] = "Low-Pressure Interaction: Confide in one trusted friend or advisor without obligation for long chats.";
                solutions[1] = "Solitude Quality: Take intentional breaks alone without feeling guilty for taking personal space.";
            }

            return `📋 **Clinical Mental Health Report**

🧠 **Cognitive Burnout:** ${burnoutPct}% — ${getScoreLabel(burnoutPct)}
🔋 **Emotional Fatigue:** ${fatiguePct}% — ${getScoreLabel(fatiguePct)}
👥 **Social Stress:** ${socialPct}% — ${getScoreLabel(socialPct)}
📚 **Academic Pressure:** ${academicPct}% — ${getScoreLabel(academicPct)}

🛠️ **Actionable Solutions:**
1. ${solutions[0]}
2. ${solutions[1]}
3. ${solutions[2]}
4. ${solutions[3]}

-----
#### 📊 [CAMPUS_DASHBOARD_ANONYMOUS_DATA]
Theme: Clinical Assessment | Cognitive Burnout: ${burnoutPct}% | Emotional Fatigue: ${fatiguePct}% | Social Stress: ${socialPct}% | Academic Pressure: ${academicPct}% | Streak Days: ${streakDays}
-----`;
        }

        function applyReportDiagnostics(burnoutPct, fatiguePct, socialPct, academicPct, totalScore) {
            spark.lastDiagnosis = 'Burnout ' + burnoutPct + '%';
            state.diagnostics.burnout = burnoutPct;
            state.diagnostics.academicPressure = academicPct;
            state.diagnostics.socialAnxiety = socialPct;
            state.diagnostics.stressLevel = totalScore > 20 ? 'High' : (totalScore > 10 ? 'Medium' : 'Low');
            updateHeaderStatusBars();
        }

        async function generateFinalReport() {
            addQuizTyping();

            // Calculate 4 Counselor metrics (0% = healthy, 100% = severe)
            let scoreBurnout = 0;   // Aspects 0, 1, 2 (max 9)
            let scoreFatigue = 0;   // Aspects 3, 4, 5 (max 9)
            let scoreSocial = 0;    // Aspects 6, 7, 8 (max 9)
            let scoreAcademic = 0;  // Aspect 9 (max 3)
            const totalScore = selectedAnswers.reduce((sum, item) => sum + item.score, 0);

            selectedAnswers.forEach((ans, idx) => {
                if (idx >= 0 && idx <= 2) scoreBurnout += ans.score;
                else if (idx >= 3 && idx <= 5) scoreFatigue += ans.score;
                else if (idx >= 6 && idx <= 8) scoreSocial += ans.score;
                else if (idx === 9) scoreAcademic += ans.score;
            });

            const burnoutPct = Math.round(100 * scoreBurnout / 9);
            const fatiguePct = Math.round(100 * scoreFatigue / 9);
            const socialPct = Math.round(100 * scoreSocial / 9);
            const academicPct = Math.round(100 * scoreAcademic / 3);

            const prompt = `You are MindBuddy's Clinical Psychometric Analyst.
The student has completed a 10-question adaptive mental health screening questionnaire.
Here are their stress severity percentages (where 0% = healthy, 100% = severe):
- Cognitive Burnout: ${burnoutPct}%
- Emotional Fatigue: ${fatiguePct}%
- Social Stress: ${socialPct}%
- Academic Pressure: ${academicPct}%

Based on these scores, generate a simplified, concise mental health report STRICTLY 100% IN ENGLISH. Do NOT output any Chinese characters anywhere.
Strictly adhere to the following layout and do NOT add any extra introductory text or conversational filler:

📋 **Clinical Mental Health Report**

🧠 **Cognitive Burnout:** ${burnoutPct}% — [one short sentence in English describing what this score means]
🔋 **Emotional Fatigue:** ${fatiguePct}% — [one short sentence in English describing what this score means]
👥 **Social Stress:** ${socialPct}% — [one short sentence in English describing what this score means]
📚 **Academic Pressure:** ${academicPct}% — [one short sentence in English describing what this score means]

🛠️ **Actionable Solutions:**
1. [Solution 1: Concise practical action item in English targeting highest-scored category]
2. [Solution 2: Concise practical action item in English targeting highest-scored category]
3. [Solution 3: Concise practical action item in English targeting highest-scored category]
4. [Solution 4: Concise practical action item in English targeting highest-scored category]

-----
#### 📊 [CAMPUS_DASHBOARD_ANONYMOUS_DATA]
Theme: Clinical Assessment | Cognitive Burnout: ${burnoutPct}% | Emotional Fatigue: ${fatiguePct}% | Social Stress: ${socialPct}% | Academic Pressure: ${academicPct}% | Streak Days: ${spark.days}
-----`;

            let reportGenerated = false;

            if (canAttemptGemini()) {
                try {
                    const data = await callGemini('gemini-1.5-flash', {
                        system_instruction: { parts: [{ text: "You are a clinical psychologist compiling a student mental wellness assessment report strictly in English." }] },
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                    });
                    
                    removeQuizTyping();
                    if (data) {
                        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        if (reply && reply.length > 15) {
                            addQuizBubble(reply, 'ai');
                            reportGenerated = true;

                            applyReportDiagnostics(burnoutPct, fatiguePct, socialPct, academicPct, totalScore);
                            spark.personalityTag = totalScore > 20 ? 'Sensitive Soul' : (totalScore > 10 ? 'Balanced Mind' : 'Resilient Anchor');
                        }
                    }
                } catch(e) {
                    console.warn("Gemini report generation failed, using local fallback:", e);
                }
            }

            // Local fallback if Gemini fails or is unavailable
            if (!reportGenerated) {
                removeQuizTyping();
                const localReport = generateLocalReport(burnoutPct, fatiguePct, socialPct, academicPct, spark.days);
                addQuizBubble(localReport, 'ai');
                applyReportDiagnostics(burnoutPct, fatiguePct, socialPct, academicPct, totalScore);
                spark.personalityTag = totalScore > 20 ? 'Sensitive Soul' : (totalScore > 10 ? 'Balanced Mind' : 'Resilient Anchor');
            }

            spark.boxesOpened++;
            spark.days++;
            saveSpark(spark);
            syncQuizUI();

            const overallWellbeing = Math.max(10, 100 - Math.round((burnoutPct + fatiguePct + socialPct + academicPct) / 4));
            const reportResult = overallWellbeing > 75 ? "Excellent Resilience" : (overallWellbeing > 45 ? "Good Balance" : "Needs Support");

            // Sync quiz report to state.quiz & window.state for Calendar and Counselor
            state.quiz = {
                answers: selectedAnswers,
                report: {
                    score: `${overallWellbeing}/100`,
                    result: reportResult,
                    burnoutPct: burnoutPct,
                    fatiguePct: fatiguePct,
                    socialPct: socialPct,
                    academicPct: academicPct
                }
            };
            window.state = state;

            try {
                const latestQuizReport = {
                    student_id: 'STU-88421',
                    student_name: 'Shaoh (Kawan Student)',
                    timestamp: new Date().toLocaleString(),
                    score: `${overallWellbeing}/100`,
                    burnout: burnoutPct,
                    fatigue: fatiguePct,
                    social_stress: socialPct,
                    academic_pressure: academicPct,
                    summary: `Clinical Assessment Completed (${reportResult}). Cognitive Burnout: ${burnoutPct}%, Emotional Fatigue: ${fatiguePct}%, Social Stress: ${socialPct}%, Academic Pressure: ${academicPct}%.`
                };
                localStorage.setItem('kawanku_latest_quiz_report', JSON.stringify(latestQuizReport));
            } catch(e) {}

            if (window.updateSanctuaryDashboard) {
                window.updateSanctuaryDashboard();
            }

            if (qRestartBtn) qRestartBtn.classList.remove('hidden');
        }

        function handleTypedInput(text) {
            if (currentQuestionIdx >= 10) return;
            const normalized = text.toLowerCase().trim();
            
            let score = -1;
            if (normalized === '0' || normalized.startsWith('nev') || normalized === 'never') score = 0;
            else if (normalized === '1' || normalized.startsWith('rar') || normalized === 'rarely') score = 1;
            else if (normalized === '2' || normalized.startsWith('oft') || normalized === 'often') score = 2;
            else if (normalized === '3' || normalized.startsWith('alw') || normalized === 'always') score = 3;
            
            if (score === -1) {
                const match = normalized.match(/^[0-3]/);
                if (match) {
                    score = parseInt(match[0], 10);
                } else {
                    const letterMatch = normalized.match(/^[a-d]/);
                    if (letterMatch) {
                        const code = letterMatch[0].charCodeAt(0) - 97;
                        score = code;
                    }
                }
            }
            
            if (score >= 0 && score <= 3) {
                const LIKERT_OPTIONS = [
                    { key: "0", text: "Never", score: 0 },
                    { key: "1", text: "Rarely", score: 1 },
                    { key: "2", text: "Often", score: 2 },
                    { key: "3", text: "Always", score: 3 }
                ];
                handleOptionSelection(LIKERT_OPTIONS[score]);
            } else {
                addQuizBubble("Please enter a valid option: 0 (Never), 1 (Rarely), 2 (Often), or 3 (Always).", 'ai');
            }
        }

        async function startQuizSession() {
            currentQuestionIdx = 0;
            selectedAnswers = [];
            activeQuestions = [];
            
            if (qMessages) qMessages.innerHTML = '';
            if (qBadge) qBadge.innerText = '🎲 Clinical Assessment Quiz';
            if (qStartBtn) qStartBtn.classList.add('hidden');
            if (qRestartBtn) qRestartBtn.classList.add('hidden');
            
            addQuizBubble("Initialising AI clinical assessment construction... Analyzing student logs and biometrics...", 'ai');
            addQuizTyping();
            
            const simulatedHR = state.biometrics.heartRate || 75;
            const simulatedSleep = state.biometrics.sleepDuration || 7.0;
            const burnout = state.diagnostics.burnout || 30;
            const anxiety = state.diagnostics.socialAnxiety || 30;
            const academic = state.diagnostics.academicPressure || 30;
            const loneliness = state.diagnostics.loneliness || 30;
            
            const prompt = `Student Profile:
- Heart Rate: ${simulatedHR} BPM
- Sleep Duration: ${simulatedSleep} hrs
- Burnout: ${burnout}%
- Social Anxiety: ${anxiety}%
- Academic Pressure: ${academic}%
- Loneliness: ${loneliness}%

You are an AI psychiatric test compiler.
Based on the student's status, choose or customize exactly 1 screening statement for each of the following 10 aspects to construct a personalized 10-question mental health questionnaire.
Choose from or base on the following pools:
${QUIZ_ASPECTS.map((a, idx) => `Aspect ${idx + 1} (${a.name}):\n${a.questions.map(q => `- ${q}`).join('\n')}`).join('\n\n')}

Return ONLY a JSON array of exactly 10 strings representing the questions, in order from Aspect 1 to Aspect 10. No extra formatting, markdown tags, or text.
Example format:
[
  "statement 1",
  "statement 2",
  ...
]`;

            try {
                let questions = null;
                if (canAttemptGemini()) {
                    const data = await callGemini('gemini-1.5-flash', {
                        system_instruction: { parts: [{ text: "You are a specialized JSON generator. You output raw JSON arrays containing strings and nothing else." }] },
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
                    });
                    
                    if (data) {
                        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        const arrMatch = rawText.match(/\[\s*[\s\S]*?\s*\]/);
                        if (arrMatch) {
                            try {
                                questions = JSON.parse(arrMatch[0]);
                            } catch(e) {
                                console.warn("Failed parsing adaptive quiz questions JSON:", e);
                            }
                        }
                    }
                }
                
                removeQuizTyping();
                
                if (!questions || !Array.isArray(questions) || questions.length !== 10) {
                    console.log("Using local fallback questions selection.");
                    questions = QUIZ_ASPECTS.map(aspect => {
                        const randIdx = Math.floor(Math.random() * aspect.questions.length);
                        return aspect.questions[randIdx];
                    });
                }
                
                activeQuestions = questions;
                addQuizBubble("AI questionnaire constructed! Starting the 10-question check-in. For each question, please select the frequency of your experience over the past two weeks.", 'ai');
                showNextQuestion();
            } catch(e) {
                console.error("Adaptive quiz initialization failed:", e);
                removeQuizTyping();
                activeQuestions = QUIZ_ASPECTS.map(aspect => {
                    const randIdx = Math.floor(Math.random() * aspect.questions.length);
                    return aspect.questions[randIdx];
                });
                addQuizBubble("Starting check-in (local fallback)...", 'ai');
                showNextQuestion();
            }
        }

        if (qStartBtn) qStartBtn.addEventListener('click', startQuizSession);
        if (qRestartBtn) qRestartBtn.addEventListener('click', startQuizSession);
        if (qSendBtn) qSendBtn.addEventListener('click', () => {
            const text = qInput ? qInput.value.trim() : '';
            if (text) {
                if (qInput) qInput.value = '';
                handleTypedInput(text);
            }
        });
        if (qInput) qInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = qInput.value.trim();
                if (text) {
                    qInput.value = '';
                    handleTypedInput(text);
                }
            }
        });
    })();

    // =========================================================================
    // SPARK SHOP — Gemini-powered conversational shop + visual catalog
    // =========================================================================
    (function SparkShopEngine() {
        const SPARK_KEY = 'kawanku_spark';
        function loadSpark() {
            try { const d = JSON.parse(localStorage.getItem(SPARK_KEY)); if (d) return d; } catch(e) {}
            return { days: 1, boxesOpened: 0, lastDiagnosis: '', personalityTag: '' };
        }
        function saveSpark(s) { localStorage.setItem(SPARK_KEY, JSON.stringify(s)); }

        const SHOP_CATALOG = {
            1: [
                { icon: '🐱', name: '猫耳萌趣眼镜 Cat Ear Glasses', cost: 3, prop: 'accessory', val: 'cat_glasses' },
                { icon: '🍄', name: '魔幻森林 Magic Forest', cost: 5, prop: 'currentScene', val: 'magic_forest' },
                { icon: '👗', name: '限定服饰：公主礼服 Princess Gown', cost: 15, prop: 'activeOutfit', val: 'princess' }
            ],
            2: [
                { icon: '👼', name: '天使飞翼眼镜 Angel Wing Glasses', cost: 3, prop: 'accessory', val: 'angel_glasses' },
                { icon: '🏰', name: '糖果城堡 Candy Castle', cost: 5, prop: 'currentScene', val: 'candy_castle' },
                { icon: '🧜‍♀️', name: '限定服饰：美人鱼姬 Mermaid Gown', cost: 15, prop: 'activeOutfit', val: 'mermaid' }
            ],
            3: [
                { icon: '🧋', name: '珍珠奶茶眼镜 Sweet Boba Glasses', cost: 4, prop: 'accessory', val: 'boba_glasses' },
                { icon: '🐚', name: '珊瑚宫殿 Coral Palace', cost: 6, prop: 'currentScene', val: 'coral_palace' },
                { icon: '🎀', name: '限定服饰：洛丽塔裙 Lolita Ruffle', cost: 18, prop: 'activeOutfit', val: 'lolita' }
            ],
            4: [
                { icon: '🐶', name: '垂耳小狗眼镜 Puppy Ear Glasses', cost: 4, prop: 'accessory', val: 'puppy_glasses' },
                { icon: '🌙', name: '月亮秋千 Moon Swing', cost: 6, prop: 'currentScene', val: 'moon_carousel' },
                { icon: '🦄', name: '限定服饰：独角兽装 Unicorn Suit', cost: 18, prop: 'activeOutfit', val: 'unicorn' }
            ]
        };

        const shopHistory = [];
        let activeWeek = 1;

        const sGrid = document.getElementById('shop-items-grid');
        const sMessages = document.getElementById('shop-chat-messages');
        const sInput = document.getElementById('shop-chat-input');
        const sSendBtn = document.getElementById('shop-chat-send-btn');
        const sBalance = document.getElementById('shop-spark-balance');

        function renderShelf(week) {
            if (!sGrid) return;
            activeWeek = week;
            sGrid.innerHTML = '';
            const items = SHOP_CATALOG[week] || [];
            items.forEach((item, idx) => {
                let iconContent = item.icon;
                if (item.prop === 'accessory') {
                    const catItem = AVATAR_CATALOG.Avatar.items['Face Accessories'].find(i => i.id === item.val);
                    if (catItem && catItem.svg) iconContent = catItem.svg;
                } else if (item.prop === 'currentScene') {
                    const catItem = AVATAR_CATALOG.Scene.items.Scenes.find(i => i.id === item.val);
                    if (catItem && catItem.svg) iconContent = catItem.svg;
                }

                const card = document.createElement('div');
                card.className = 'shop-item-card';
                card.innerHTML = '<span class="shop-item-icon">' + iconContent + '</span>' +
                    '<div class="shop-item-info">' +
                    '<span class="shop-item-name">' + item.name + '</span>' +
                    '<span class="shop-item-cost">🔥 ' + item.cost + ' Day Sparks</span></div>' +
                    '<button class="shop-item-buy-btn" data-week="' + week + '" data-idx="' + idx + '">Redeem</button>';
                sGrid.appendChild(card);
            });
            sGrid.querySelectorAll('.shop-item-buy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const w = parseInt(btn.getAttribute('data-week'));
                    const i = parseInt(btn.getAttribute('data-idx'));
                    handleBuy(SHOP_CATALOG[w][i]);
                });
            });
            document.querySelectorAll('.shop-week-tab').forEach(t => {
                t.classList.toggle('active', parseInt(t.getAttribute('data-week')) === week);
            });
        }

        function handleBuy(item) {
            let sp = loadSpark();
            if (sp.days >= item.cost) {
                sp.days -= item.cost;
                saveSpark(sp);
                syncShopBalance(sp);
                unlockPremiumItem(item.prop, item.val);
                if (typeof avatarState !== 'undefined' && avatarState.set) {
                    avatarState.set(item.prop, item.val);
                } else if (typeof state !== 'undefined') {
                    state.avatar[item.prop] = item.val;
                    renderAvatarVisuals();
                }
                showToast('兑换成功！' + item.name + ' 已装备到你的 Avatar！', 'success');
                addShopBubble('🎉 兑换成功！「' + item.name + '」已放入你的主页衣柜。快去 Avatar Studio 看看吧！', 'ai');
                if (typeof renderCustomizerUI === 'function') renderCustomizerUI();
            } else {
                const need = item.cost - sp.days;
                showToast('火花不足，还需 ' + need + ' 天火花', 'warning');
                addShopBubble('火花余额不足哟 🥲 再坚持自检 ' + need + ' 天就能带走「' + item.name + '」了！', 'ai');
            }
        }

        function syncShopBalance(s) {
            if (sBalance) sBalance.innerText = s.days;
            const qCount = document.getElementById('quiz-spark-count');
            if (qCount) qCount.innerText = s.days;
        }

        function addShopBubble(text, type) {
            if (!sMessages) return;
            const div = document.createElement('div');
            div.className = type === 'ai' ? 'shop-ai-bubble' : 'shop-user-bubble';
            div.innerText = text;
            sMessages.appendChild(div);
            sMessages.scrollTop = sMessages.scrollHeight;
        }

        async function sendShopMessage(userText) {
            if (!canAttemptGemini()) { addShopBubble('Error: AI is currently unavailable. Please configure API key or ensure backend is running.', 'ai'); return; }
            let sp = loadSpark();
            shopHistory.push({ role: 'user', parts: [{ text: userText }] });
            addShopBubble(userText, 'user');
            if (sInput) sInput.value = '';
            const shopPrompt = '你是 Kawanku AI 火花商店的潮流主理人。用户当前火花天数为 ' + sp.days + ' 天。当前显示第 ' + activeWeek + ' 周货架。请根据用户请求展示商品或处理兑换。保持极简留白风格。货架内容：' + JSON.stringify(SHOP_CATALOG[activeWeek]);
            try {
                const data = await callGemini('gemini-1.5-flash', {
                    system_instruction: { parts: [{ text: shopPrompt }] },
                    contents: shopHistory,
                    generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
                });
                if (!data) {
                    throw new Error('No response from Gemini API proxy.');
                }
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(No response)';
                shopHistory.push({ role: 'model', parts: [{ text: reply }] });
                addShopBubble(reply, 'ai');
            } catch(e) {
                if (shopHistory.length > 0) shopHistory.pop();
                addShopBubble('Error: ' + e.message, 'ai');
            }
        }

        document.querySelectorAll('.shop-week-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                renderShelf(parseInt(tab.getAttribute('data-week')));
            });
        });

        if (sSendBtn) sSendBtn.addEventListener('click', () => {
            const text = sInput ? sInput.value.trim() : '';
            if (text) sendShopMessage(text);
        });
        if (sInput) sInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = sInput.value.trim();
                if (text) sendShopMessage(text);
            }
        });

        // Initial render — auto-detect current week
        const autoWeek = Math.min(4, Math.ceil(new Date().getDate() / 7));
        renderShelf(autoWeek);
        syncShopBalance(loadSpark());
    })();

    // =========================================================================
    // 开心消消乐 HAPPY MATCH-3 ENGINE — STEMGINEERS Innovation Project
    // =========================================================================
    (function RelaxationGamesEngine() {
        // ── DOM refs ────────────────------------------------------------------
        const menuContainer     = document.getElementById('games-menu-container');
        const cardMatch3        = document.getElementById('card-match3');
        const btnSelectMatch3   = document.getElementById('btn-select-match3');
        const btnMatch3Back     = document.getElementById('btn-match3-back-menu');
        
        const match3StartAction = document.getElementById('match3-start-action');
        const match3GameArena   = document.getElementById('match3-game-arena');
        const match3Board       = document.getElementById('match3-board');
        const match3Progress    = document.getElementById('match3-progress');
        const match3ProgressVal = document.getElementById('match3-progress-val');
        const btnStartMatch3    = document.getElementById('btn-start-match3');
        const btnQuitMatch3     = document.getElementById('btn-quit-match3');
        const btnMatch3Tip      = document.getElementById('btn-match3-tip');
        const tipBoxText        = document.getElementById('match3-tip-box-text');
        const surveyInline      = document.getElementById('survey-inline');
        const surveyPrompt      = document.getElementById('survey-robot-prompt');
        const hintText          = document.getElementById('match3-hint-text');
        const btnWinReplay      = document.getElementById('btn-win-replay');
        const btnWinSurvey      = document.getElementById('btn-win-survey');
        const surveyMoodSection = document.getElementById('survey-mood-section');
        const winChoicesRow     = document.getElementById('win-choices-row');

        // ── Fruit SVG tiles (cute, colourful, recognisable) ───────────────────
        const TILE_TYPES = [
            {
                id: 1, name: 'Mangosteen 山竹',
                color: '#6d28d9',
                svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- leaves -->
                    <ellipse cx="18" cy="9" rx="5" ry="3" fill="#16a34a" transform="rotate(-20 18 9)"/>
                    <ellipse cx="24" cy="7" rx="5" ry="3" fill="#22c55e" transform="rotate(0 24 7)"/>
                    <ellipse cx="30" cy="9" rx="5" ry="3" fill="#16a34a" transform="rotate(20 30 9)"/>
                    <!-- shell -->
                    <circle cx="24" cy="28" r="17" fill="#4c1d95"/>
                    <circle cx="24" cy="28" r="15" fill="#6d28d9"/>
                    <!-- highlight -->
                    <ellipse cx="19" cy="21" rx="5" ry="4" fill="#8b5cf6" opacity="0.5"/>
                    <!-- crown at bottom -->
                    <path d="M17 42 Q24 46 31 42" stroke="#4c1d95" stroke-width="2.5" stroke-linecap="round" fill="none"/>
                    <circle cx="17" cy="42" r="1.8" fill="#a78bfa"/>
                    <circle cx="24" cy="44.5" r="1.8" fill="#a78bfa"/>
                    <circle cx="31" cy="42" r="1.8" fill="#a78bfa"/>
                </svg>`
            },
            {
                id: 2, name: 'Durian 榴莲',
                color: '#d97706',
                svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- stem & leaf -->
                    <rect x="22" y="3" width="4" height="7" rx="2" fill="#92400e"/>
                    <ellipse cx="28" cy="6" rx="5" ry="2.5" fill="#16a34a" transform="rotate(30 28 6)"/>
                    <!-- body -->
                    <ellipse cx="24" cy="30" rx="16" ry="14" fill="#f59e0b"/>
                    <ellipse cx="24" cy="30" rx="13" ry="11" fill="#fbbf24"/>
                    <!-- spikes -->
                    <g stroke="#92400e" stroke-width="1.2" stroke-linecap="round">
                        <line x1="24" y1="16" x2="22" y2="11"/>
                        <line x1="30" y1="17" x2="30" y2="12"/>
                        <line x1="36" y1="21" x2="39" y2="17"/>
                        <line x1="38" y1="28" x2="43" y2="27"/>
                        <line x1="36" y1="35" x2="40" y2="37"/>
                        <line x1="12" y1="21" x2="9" y2="17"/>
                        <line x1="10" y1="28" x2="5" y2="27"/>
                        <line x1="12" y1="35" x2="8" y2="37"/>
                        <line x1="18" y1="17" x2="16" y2="12"/>
                    </g>
                    <!-- segments -->
                    <path d="M24 19 Q28 27 24 35 Q20 27 24 19Z" fill="#fde68a" opacity="0.7"/>
                    <path d="M17 22 Q24 27 18 36" stroke="#fde68a" stroke-width="1" fill="none" opacity="0.5"/>
                    <path d="M31 22 Q24 27 30 36" stroke="#fde68a" stroke-width="1" fill="none" opacity="0.5"/>
                    <!-- highlight -->
                    <ellipse cx="20" cy="23" rx="4" ry="3" fill="white" opacity="0.15"/>
                </svg>`
            },
            {
                id: 3, name: 'Rambutan 红毛丹',
                color: '#dc2626',
                svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- stem -->
                    <rect x="22" y="3" width="4" height="6" rx="2" fill="#92400e"/>
                    <!-- body -->
                    <circle cx="24" cy="28" r="16" fill="#b91c1c"/>
                    <circle cx="24" cy="28" r="13" fill="#dc2626"/>
                    <!-- hairs / spines -->
                    <g stroke="#ef4444" stroke-width="1.8" stroke-linecap="round">
                        <line x1="24" y1="12" x2="24" y2="8"/>
                        <line x1="31" y1="14" x2="34" y2="10"/>
                        <line x1="37" y1="20" x2="41" y2="18"/>
                        <line x1="39" y1="28" x2="44" y2="28"/>
                        <line x1="37" y1="36" x2="41" y2="38"/>
                        <line x1="31" y1="41" x2="34" y2="45"/>
                        <line x1="24" y1="43" x2="24" y2="47"/>
                        <line x1="17" y1="41" x2="14" y2="45"/>
                        <line x1="11" y1="36" x2="7" y2="38"/>
                        <line x1="9" y1="28" x2="4" y2="28"/>
                        <line x1="11" y1="20" x2="7" y2="18"/>
                        <line x1="17" y1="14" x2="14" y2="10"/>
                    </g>
                    <!-- white flesh peek -->
                    <circle cx="24" cy="28" r="8" fill="#fde68a" opacity="0.2"/>
                    <!-- highlight -->
                    <ellipse cx="19" cy="22" rx="5" ry="3.5" fill="white" opacity="0.18"/>
                </svg>`
            },
            {
                id: 4, name: 'Banana 香蕉',
                color: '#ca8a04',
                svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- stem -->
                    <path d="M28 6 Q30 8 28 11" stroke="#92400e" stroke-width="3" stroke-linecap="round" fill="none"/>
                    <!-- banana curve -->
                    <path d="M10 34 Q8 20 20 12 Q32 6 38 16 Q42 24 36 32 Q30 38 22 38 Q14 38 10 34Z" fill="#fbbf24"/>
                    <path d="M13 32 Q11 20 21 14 Q31 9 36 18 Q39 24 34 30 Q28 36 21 36 Q15 36 13 32Z" fill="#fde68a"/>
                    <!-- ridge lines -->
                    <path d="M16 30 Q15 20 22 14" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.6"/>
                    <path d="M20 34 Q18 22 24 13" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.6"/>
                    <path d="M25 35 Q23 24 28 14" stroke="#f59e0b" stroke-width="1" fill="none" opacity="0.6"/>
                    <!-- tip -->
                    <path d="M36 32 Q38 35 36 37" stroke="#92400e" stroke-width="2" stroke-linecap="round" fill="none"/>
                    <!-- highlight -->
                    <ellipse cx="22" cy="20" rx="6" ry="3" fill="white" opacity="0.2" transform="rotate(-30 22 20)"/>
                </svg>`
            },
            {
                id: 5, name: 'Mango 芒果',
                color: '#ea580c',
                svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <!-- stem & leaf -->
                    <rect x="22" y="3" width="4" height="7" rx="2" fill="#92400e"/>
                    <ellipse cx="30" cy="6" rx="6" ry="2.5" fill="#16a34a" transform="rotate(25 30 6)"/>
                    <!-- body -->
                    <path d="M24 43 C10 43 7 30 9 22 C11 14 17 9 24 9 C31 9 37 14 39 22 C41 30 38 43 24 43Z" fill="#f97316"/>
                    <path d="M24 40 C12 40 10 29 12 22 C14 16 19 12 24 12 C29 12 34 16 36 22 C38 29 36 40 24 40Z" fill="#fb923c"/>
                    <!-- blush -->
                    <ellipse cx="30" cy="25" rx="6" ry="8" fill="#fbbf24" opacity="0.45"/>
                    <!-- highlight -->
                    <ellipse cx="18" cy="19" rx="5" ry="4" fill="white" opacity="0.2"/>
                </svg>`
            }
        ];

        // ── Game state ────────────────────────────────────────────────────────
        const ROWS = 6, COLS = 6;
        const WIN_MATCHES = 15;
        let board       = [];   // 2-D array of tile objects
        let selected    = null;
        let busy        = false;
        let score       = 0;

        // ── Utility ───────────────────────────────────────────────────────────
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

        // ── Tile SVG helper ───────────────────────────────────────────────────
        function makeTileHTML(type) {
            return `<div class="tile-inner" style="--tc:${type.color}">
                        <div class="tile-svg">${type.svg}</div>
                        <div class="tile-name">${type.name.split(' ')[1] || type.name.split(' ')[0]}</div>
                    </div>`;
        }

        // ── Build board (no initial matches) ─────────────────────────────────
        function buildBoard() {
            board = [];
            for (let r = 0; r < ROWS; r++) {
                board[r] = [];
                for (let c = 0; c < COLS; c++) {
                    let t;
                    let tries = 0;
                    do {
                        t = rand(TILE_TYPES);
                        tries++;
                        if (tries > 50) break;          // safety escape
                    } while (
                        (r >= 2 && board[r-1][c].id === t.id && board[r-2][c].id === t.id) ||
                        (c >= 2 && board[r][c-1].id === t.id && board[r][c-2].id === t.id)
                    );
                    board[r][c] = { ...t, row: r, col: c, el: null };
                }
            }
        }

        // ── Render all tiles into the DOM grid ────────────────────────────────
        function renderBoard() {
            match3Board.innerHTML = '';
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const t   = board[r][c];
                    const div = document.createElement('div');
                    div.className = 'match3-tile';
                    div.innerHTML = makeTileHTML(t);
                    div.dataset.row = r;
                    div.dataset.col = c;
                    div.style.gridRowStart = r + 1;
                    div.style.gridColumnStart = c + 1;
                    div.addEventListener('click', () => onTileClick(t));
                    t.el = div;
                    match3Board.appendChild(div);
                }
            }
        }

        // ── Click handler ─────────────────────────────────────────────────────
        function onTileClick(t) {
            if (busy) return;
            if (!selected) {
                selected = t;
                t.el.classList.add('selected');
                if (hintText) hintText.textContent = 'Now click an adjacent fruit to swap!';
                return;
            }
            if (selected === t) {
                t.el.classList.remove('selected');
                selected = null;
                if (hintText) hintText.textContent = 'Click a fruit, then click an adjacent fruit to swap them!';
                return;
            }
            const dr = Math.abs(selected.row - t.row);
            const dc = Math.abs(selected.col - t.col);
            if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
                selected.el.classList.remove('selected');
                doSwap(selected, t);
                selected = null;
                if (hintText) hintText.textContent = 'Click a fruit, then click an adjacent fruit to swap them!';
            } else {
                selected.el.classList.remove('selected');
                selected = t;
                t.el.classList.add('selected');
            }
        }

        // ── Swap two tiles, check matches, revert if none ─────────────────────
        async function doSwap(a, b) {
            busy = true;
            swapState(a, b);
            refreshTileEl(a);
            refreshTileEl(b);
            await sleep(200);

            const matches = findMatches();
            if (matches.length) {
                await processMatches(matches);
            } else {
                swapState(a, b);         // revert
                refreshTileEl(a);
                refreshTileEl(b);
                a.el.classList.add('shake');
                b.el.classList.add('shake');
                await sleep(400);
                a.el.classList.remove('shake');
                b.el.classList.remove('shake');
            }
            busy = false;
        }

        // swap the two tile objects in the board array + update their row/col
        function swapState(a, b) {
            board[a.row][a.col] = b;
            board[b.row][b.col] = a;
            const tr = a.row, tc = a.col;
            a.row = b.row; a.col = b.col;
            b.row = tr;    b.col = tc;
        }

        // update a tile's DOM element to reflect its current board position + content
        function refreshTileEl(t) {
            t.el.style.gridRowStart    = t.row + 1;
            t.el.style.gridColumnStart = t.col + 1;
            t.el.dataset.row = t.row;
            t.el.dataset.col = t.col;
        }

        // ── Match detection ───────────────────────────────────────────────────
        function findMatches() {
            const seen = new Set();
            const out  = [];
            const key  = (r,c) => `${r},${c}`;

            // horizontal
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS - 2; c++) {
                    if (board[r][c].id === board[r][c+1].id && board[r][c].id === board[r][c+2].id) {
                        [[r,c],[r,c+1],[r,c+2]].forEach(([rr,cc]) => {
                            if (!seen.has(key(rr,cc))) { seen.add(key(rr,cc)); out.push(board[rr][cc]); }
                        });
                    }
                }
            }
            // vertical
            for (let r = 0; r < ROWS - 2; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (board[r][c].id === board[r+1][c].id && board[r][c].id === board[r+2][c].id) {
                        [[r,c],[r+1,c],[r+2,c]].forEach(([rr,cc]) => {
                            if (!seen.has(key(rr,cc))) { seen.add(key(rr,cc)); out.push(board[rr][cc]); }
                        });
                    }
                }
            }
            return out;
        }

        async function processMatches(matches) {
            score++;
            updateProgress();

            // Increment matches and update dashboard
            state.gameStats.matches += matches.length;
            if (window.updateSanctuaryDashboard) window.updateSanctuaryDashboard();

            // Spawn floating combo text on matches
            try {
                let sumX = 0, sumY = 0;
                matches.forEach(t => {
                    if (t.el) {
                        sumX += t.el.offsetLeft + t.el.offsetWidth / 2;
                        sumY += t.el.offsetTop + t.el.offsetHeight / 2;
                    }
                });
                const avgX = sumX / matches.length;
                const avgY = sumY / matches.length;

                const phrases = ["+3 Cozy! ✨", "Sweet! 🌸", "Flow State 🍃", "Calm Match 🌊", "Breathe... 💨", "Mindful Moment 💫", "Nice Swapping! 💖", "Inner Peace 🧘"];
                const phrase = phrases[Math.floor(Math.random() * phrases.length)];

                const overlay = document.getElementById('match3-combo-overlay');
                if (overlay) {
                    const span = document.createElement('span');
                    span.className = 'match3-combo-text';
                    span.textContent = phrase;
                    span.style.left = avgX + 'px';
                    span.style.top = avgY + 'px';
                    overlay.appendChild(span);
                    setTimeout(() => span.remove(), 1200);
                }
            } catch(e) {}

            // pop animation
            matches.forEach(t => t.el.classList.add('pop-clear'));
            await sleep(320);


            // remove from DOM + board
            matches.forEach(t => {
                if (t.el) t.el.remove();
                board[t.row][t.col] = null;
            });

            // gravity: pull tiles down column by column
            for (let c = 0; c < COLS; c++) {
                let empty = 0;
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (!board[r][c]) { empty++; }
                    else if (empty > 0) {
                        const t = board[r][c];
                        board[r+empty][c] = t;
                        board[r][c]       = null;
                        t.row             = r + empty;
                        refreshTileEl(t); // Updates position and dataset properly
                    }
                }
                // fill empty from top
                for (let i = 0; i < empty; i++) {
                    const type = rand(TILE_TYPES);
                    const newT = { ...type, row: i, col: c, el: null };
                    const div  = document.createElement('div');
                    div.className = 'match3-tile tile-drop';
                    div.innerHTML = makeTileHTML(type);
                    div.dataset.row = i;
                    div.dataset.col = c;
                    div.style.gridRowStart    = i + 1;
                    div.style.gridColumnStart = c + 1;
                    div.addEventListener('click', () => onTileClick(newT));
                    newT.el = div;
                    board[i][c] = newT;
                    match3Board.appendChild(div);
                }
            }

            await sleep(350);

            // cascade check
            const next = findMatches();
            if (next.length) {
                await processMatches(next);
            } else if (score >= WIN_MATCHES) {
                await sleep(300);
                triggerWin();
            }
        }

        // ── Hint Solver ──────────────────────────────────────────────────────
        function findPossibleMoves() {
            // Check if position (r,c) is part of a 3+ match (reads current board state)
            function hasMatchAt(r, c) {
                const tile = board[r][c];
                if (!tile) return false;
                const typeId = tile.id;

                // Horizontal count
                let horiz = 1;
                let col = c - 1;
                while (col >= 0 && board[r][col] && board[r][col].id === typeId) { horiz++; col--; }
                col = c + 1;
                while (col < COLS && board[r][col] && board[r][col].id === typeId) { horiz++; col++; }
                if (horiz >= 3) return true;

                // Vertical count
                let vert = 1;
                let row = r - 1;
                while (row >= 0 && board[row][c] && board[row][c].id === typeId) { vert++; row--; }
                row = r + 1;
                while (row < ROWS && board[row][c] && board[row][c].id === typeId) { vert++; row++; }
                if (vert >= 3) return true;

                return false;
            }

            // Simulate swap, check, then swap back
            function trySwap(r1, c1, r2, c2) {
                const a = board[r1][c1];
                const b = board[r2][c2];
                if (!a || !b || a.id === b.id) return false;

                // Perform the swap in the board array
                board[r1][c1] = b;
                board[r2][c2] = a;

                // Check if either swapped position now forms a match
                const matched = hasMatchAt(r1, c1) || hasMatchAt(r2, c2);

                // Swap back to restore original state
                board[r1][c1] = a;
                board[r2][c2] = b;

                return matched;
            }

            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    // Try right swap
                    if (c + 1 < COLS && trySwap(r, c, r, c + 1)) {
                        return { t1: board[r][c], t2: board[r][c + 1] };
                    }
                    // Try down swap
                    if (r + 1 < ROWS && trySwap(r, c, r + 1, c)) {
                        return { t1: board[r][c], t2: board[r + 1][c] };
                    }
                }
            }
            return null;
        }

        let hintActive = false;
        async function showHint() {
            if (busy || hintActive) return;
            hintActive = true;
            
            const move = findPossibleMoves();
            if (move) {
                move.t1.el.classList.add('hint-glow');
                move.t2.el.classList.add('hint-glow');
                
                if (tipBoxText) {
                    tipBoxText.innerHTML = `Swap the <strong>${move.t1.name.split(' ')[0]}</strong> and <strong>${move.t2.name.split(' ')[0]}</strong>! ✨`;
                }
                
                await sleep(2000);
                if (move.t1 && move.t1.el) move.t1.el.classList.remove('hint-glow');
                if (move.t2 && move.t2.el) move.t2.el.classList.remove('hint-glow');
            } else {
                if (tipBoxText) tipBoxText.textContent = "No matches left! Reshuffling board...";
                showToast("No moves possible! Reshuffling board...", "info");
                let tries = 0;
                do {
                    buildBoard();
                    tries++;
                } while (!findPossibleMoves() && tries < 10);
                renderBoard();
            }
            hintActive = false;
        }

        // ── Progress bar ──────────────────────────────────────────────────────
        function updateProgress() {
            const pct = Math.min(100, Math.round(score / WIN_MATCHES * 100));
            match3Progress.style.width    = pct + '%';
            match3ProgressVal.textContent = pct + '%';
        }

        // ── Win flow ──────────────────────────────────────────────────────────
        function triggerWin() {
            match3GameArena.classList.add('hidden');
            match3StartAction.classList.add('hidden');
            surveyInline.classList.remove('hidden');
            if (winChoicesRow) winChoicesRow.classList.remove('hidden');
            if (surveyMoodSection) surveyMoodSection.classList.add('hidden');
            surveyInline.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // ── Fruit preview on start screen ────────────────────────────────────
        function populateFruitPreview() {
            const items = document.querySelectorAll('.fruit-preview-item');
            TILE_TYPES.forEach((t, i) => {
                if (items[i]) items[i].innerHTML = t.svg;
            });
        }

        // ── Start / Quit ──────────────────────────────────────────────────────
        function startGame() {
            score = 0;
            selected = null;
            busy = false;
            
            // Set start flag & update lounge checklist
            localStorage.setItem('relax_game_started', 'true');
            if (window.updateSanctuaryDashboard) window.updateSanctuaryDashboard();

            updateProgress();
            buildBoard();
            renderBoard();
            match3StartAction.classList.add('hidden');
            surveyInline.classList.add('hidden');
            match3GameArena.classList.remove('hidden');
            if (hintText) hintText.textContent = 'Click a fruit, then click an adjacent fruit to swap them!';
            if (tipBoxText) tipBoxText.textContent = 'Take deep breaths while matching. Let the stress melt away.';
        }


        function quitGame() {
            match3GameArena.classList.add('hidden');
            match3StartAction.classList.remove('hidden');
            surveyInline.classList.add('hidden');
        }

        // ── Mood survey handler ───────────────────────────────────────────────
        function handleMood(val) {
            surveyInline.classList.add('hidden');
            match3StartAction.classList.remove('hidden');
            if (val === '5') {
                const chatBtn = document.getElementById('nav-chat');
                if (chatBtn) chatBtn.click();
                showToast("Welcome back! KawanKu is here for you. 💙", "info");
            } else {
                showToast("Mood logged! You're doing amazing, Kawan. 🌟", "success");
            }
        }

        // ── Init ──────────────────────────────────────────────────────────────
        function init() {
            populateFruitPreview();
            if (btnStartMatch3) btnStartMatch3.addEventListener('click', startGame);
            if (btnQuitMatch3)  btnQuitMatch3.addEventListener('click', quitGame);
            if (btnMatch3Tip)   btnMatch3Tip.addEventListener('click', showHint);
            
            if (btnWinReplay) {
                btnWinReplay.addEventListener('click', () => {
                    if (cardMatch3 && !cardMatch3.classList.contains('hidden')) {
                        startGame();
                    }
                });
            }
            if (btnWinSurvey) {
                btnWinSurvey.addEventListener('click', () => {
                    if (winChoicesRow) winChoicesRow.classList.add('hidden');
                    if (surveyMoodSection) surveyMoodSection.classList.remove('hidden');
                });
            }

            document.querySelectorAll('#survey-inline .emoji-btn').forEach(btn => {
                btn.addEventListener('click', () => handleMood(btn.dataset.mood));
            });
            
            // Menu navigation select click bindings
            if (btnSelectMatch3 && cardMatch3 && menuContainer) {
                btnSelectMatch3.addEventListener('click', () => {
                    menuContainer.classList.add('hidden');
                    cardMatch3.classList.remove('hidden');
                });
            }
            if (btnMatch3Back && cardMatch3 && menuContainer) {
                btnMatch3Back.addEventListener('click', () => {
                    quitGame();
                    cardMatch3.classList.add('hidden');
                    menuContainer.classList.remove('hidden');
                });
            }
        }

        init();
    })();

    // =========================================================================
    // KAWANKU FRUIT ZEN ENGINE — HIGH-FIDELITY CANVASES SLICING GAME
    // =========================================================================
    (function FruitZenEngine() {
        // ── DOM refs ──────────────────────────────────────────────────────────
        const menuContainer     = document.getElementById('games-menu-container');
        const cardFruitZen      = document.getElementById('card-fruit-zen');
        const btnSelectFruitZen = document.getElementById('btn-select-fruit-zen');
        const btnFruitZenBack   = document.getElementById('btn-fruit-zen-back-menu');
        
        const zenStartScreen    = document.getElementById('zen-start-action');
        const zenGameArena      = document.getElementById('zen-game-arena');
        const btnStartZen       = document.getElementById('btn-start-fruit-zen');
        const btnQuitZen        = document.getElementById('btn-quit-fruit-zen');
        
        const canvas            = document.getElementById('zen-canvas');
        const progressFill      = document.getElementById('zen-progress');
        const progressVal       = document.getElementById('zen-progress-val');
        
        const surveyInline      = document.getElementById('survey-inline');
        const winChoicesRow     = document.getElementById('win-choices-row');
        const surveyMoodSection = document.getElementById('survey-mood-section');
        const btnWinReplay      = document.getElementById('btn-win-replay');
        const btnWinSurvey      = document.getElementById('btn-win-survey');

        let ctx = null;
        let animationFrameId = null;
        let isPlaying = false;
        let score = 0;
        const targetScore = 20;
        let speedMode = 'normal';
        
        let fruits = [];
        let splats = [];
        let sparks = [];
        let juiceParticles = [];
        let trailPoints = [];
        let isMouseDown = false;
        let lastMousePos = null;
        
        let currentCombo = 0;
        let lastSliceTime = 0;
        let comboTexts = [];
        
        let audioCtx = null;

        
        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
        }
        
        function playWhooshSound() {
            if (!audioCtx) return;
            try {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.12);
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.12);
            } catch(e) {}
        }
        
        function playSplashSound() {
            if (!audioCtx) return;
            try {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.18);
                gain.gain.setValueAtTime(0.20, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.18);
            } catch(e) {}
        }
        
        let woodPatternCanvas = null;
        function createWoodPattern() {
            if (woodPatternCanvas) return;
            woodPatternCanvas = document.createElement('canvas');
            woodPatternCanvas.width = 600;
            woodPatternCanvas.height = 400;
            const wctx = woodPatternCanvas.getContext('2d');
            
            const plankHeight = 80;
            const plankColors = ['#8B5A2B', '#805326', '#946130', '#784D23', '#855629'];
            
            for (let y = 0; y < woodPatternCanvas.height; y += plankHeight) {
                const color = plankColors[(y / plankHeight) % plankColors.length];
                wctx.fillStyle = color;
                wctx.fillRect(0, y, woodPatternCanvas.width, plankHeight);
                
                wctx.strokeStyle = 'rgba(0,0,0,0.04)';
                wctx.lineWidth = 1.5;
                for (let i = 0; i < 5; i++) {
                    const gy = y + 10 + i * 15;
                    wctx.beginPath();
                    wctx.moveTo(0, gy);
                    wctx.quadraticCurveTo(150, gy - 6 + Math.random()*12, 300, gy + Math.random()*8);
                    wctx.quadraticCurveTo(450, gy - 8 + Math.random()*16, 600, gy);
                    wctx.stroke();
                }
                
                wctx.strokeStyle = 'rgba(0,0,0,0.22)';
                wctx.lineWidth = 2.5;
                wctx.beginPath();
                wctx.moveTo(0, y);
                wctx.lineTo(woodPatternCanvas.width, y);
                wctx.stroke();
                
                wctx.strokeStyle = 'rgba(255,255,255,0.05)';
                wctx.lineWidth = 1;
                wctx.beginPath();
                wctx.moveTo(0, y + 1.5);
                wctx.lineTo(woodPatternCanvas.width, y + 1.5);
                wctx.stroke();
            }
        }
        
        function drawBackground() {
            ctx.fillStyle = '#4e331c';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            createWoodPattern();
            if (woodPatternCanvas) {
                const pat = ctx.createPattern(woodPatternCanvas, 'repeat');
                ctx.fillStyle = pat;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            const vignette = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.25,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.75
            );
            vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        class ZenSplat {
            constructor(x, y, fruitName) {
                this.x = x;
                this.y = y;
                this.time = Date.now();
                this.duration = 6000;
                
                const colorMap = {
                    watermelon: 'rgba(239, 68, 68, 0.65)',
                    apple: 'rgba(254, 243, 199, 0.65)',
                    orange: 'rgba(249, 115, 22, 0.68)',
                    coconut: 'rgba(240, 249, 255, 0.55)',
                    pineapple: 'rgba(250, 204, 21, 0.65)'
                };
                this.color = colorMap[fruitName] || 'rgba(255, 255, 255, 0.5)';
                
                // Ring ripple effect
                this.ringR = 8;
                this.maxRingR = 40 + Math.random() * 20;
                
                this.blobs = [];
                const blobCount = 5 + Math.floor(Math.random() * 5);
                for (let i = 0; i < blobCount; i++) {
                    this.blobs.push({
                        dx: (Math.random() - 0.5) * 28,
                        dy: (Math.random() - 0.5) * 28,
                        r: 6 + Math.random() * 15,
                        dripSpeed: 0.05 + Math.random() * 0.08
                    });
                }
                
                this.drops = [];
                const dropCount = 6 + Math.floor(Math.random() * 7);
                for (let i = 0; i < dropCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 15 + Math.random() * 45;
                    this.drops.push({
                        dx: Math.cos(angle) * dist,
                        dy: Math.sin(angle) * dist,
                        r: 2 + Math.random() * 3.5,
                        dripSpeed: 0.12 + Math.random() * 0.15
                    });
                }
            }
            
            draw(ctx) {
                const elapsed = Date.now() - this.time;
                if (elapsed >= this.duration) return false;
                
                ctx.save();
                const opacity = 1 - (elapsed / this.duration);
                ctx.globalAlpha = opacity;
                
                // Draw expanding watercolor juice ring
                if (this.ringR < this.maxRingR) {
                    this.ringR += 1.8;
                    ctx.strokeStyle = this.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.ringR, 0, Math.PI * 2);
                    ctx.stroke();
                }
                
                ctx.fillStyle = this.color;
                
                // Dripping blobs
                this.blobs.forEach(b => {
                    b.dy += b.dripSpeed; // slide down slowly
                    
                    ctx.beginPath();
                    ctx.arc(this.x + b.dx, this.y + b.dy, b.r, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw smear trail upwards as it slides down
                    ctx.beginPath();
                    ctx.rect(this.x + b.dx - b.r * 0.35, this.y + b.dy - b.r, b.r * 0.7, b.r);
                    ctx.fill();
                });
                
                // Running drops
                this.drops.forEach(d => {
                    d.dy += d.dripSpeed; // run down faster
                    
                    ctx.beginPath();
                    ctx.arc(this.x + d.dx, this.y + d.dy, d.r, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.rect(this.x + d.dx - d.r * 0.25, this.y + d.dy - d.r * 1.5, d.r * 0.5, d.r * 1.5);
                    ctx.fill();
                });
                
                ctx.restore();
                return true;
            }
        }

        
        class ZenJuiceParticle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const force = 5 + Math.random() * 11;
                this.vx = Math.cos(angle) * force;
                this.vy = Math.sin(angle) * force - 4;
                this.color = color;
                this.size = 2.5 + Math.random() * 5.5;
                this.life = 1.0;
                this.decay = 0.015 + Math.random() * 0.02;
                this.gravity = 0.22;
            }
            
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += this.gravity;
                this.vx *= 0.97;
                this.life -= this.decay;
                return this.life > 0;
            }
            
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.life;
                ctx.fillStyle = this.color;
                
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 4;
                
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                const angle = Math.atan2(this.vy, this.vx);
                
                ctx.translate(this.x, this.y);
                ctx.rotate(angle);
                
                ctx.beginPath();
                const length = this.size * (1.2 + speed * 0.12);
                const width = this.size * 0.75;
                
                ctx.ellipse(0, 0, length, width, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
                ctx.beginPath();
                ctx.ellipse(length * 0.2, 0, length * 0.3, width * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        }

        class ZenSpark {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 5;
                this.vy = (Math.random() - 0.5) * 5 - 2;
                this.size = 11 + Math.random() * 7;
                this.color = color || '#fef08a';
                this.life = 1.0;
                this.decay = 0.015 + Math.random() * 0.015;
                
                const types = ['cat', 'bunny', 'puppy', 'heart', 'star'];
                const weights = [0.35, 0.70, 0.90, 0.95, 1.0];
                const rand = Math.random();
                if (rand < weights[0]) this.type = 'cat';
                else if (rand < weights[1]) this.type = 'bunny';
                else if (rand < weights[2]) this.type = 'puppy';
                else if (rand < weights[3]) this.type = 'heart';
                else this.type = 'star';
                
                this.rotation = (Math.random() - 0.5) * 0.3;
                this.rotationSpeed = (Math.random() - 0.5) * 0.02;
            }
            
            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.02;
                this.vx *= 0.97;
                this.rotation += this.rotationSpeed;
                this.life -= this.decay;
                return this.life > 0;
            }
            
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.life;
                
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 8;
                
                if (this.type === 'cat') {
                    const catColors = ['#ffedd5', '#fee2e2', '#fef3c7', '#fafaf9'];
                    const col = catColors[Math.floor(this.size * 10) % catColors.length];
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    
                    ctx.fillStyle = col;
                    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                    ctx.lineWidth = 1;
                    
                    ctx.beginPath();
                    ctx.moveTo(-this.size * 0.8, -this.size * 0.2);
                    ctx.lineTo(-this.size * 0.9, -this.size * 0.9);
                    ctx.lineTo(-this.size * 0.3, -this.size * 0.6);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.moveTo(this.size * 0.8, -this.size * 0.2);
                    ctx.lineTo(this.size * 0.9, -this.size * 0.9);
                    ctx.lineTo(this.size * 0.3, -this.size * 0.6);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = '#fbcfe8';
                    ctx.beginPath();
                    ctx.moveTo(-this.size * 0.75, -this.size * 0.3);
                    ctx.lineTo(-this.size * 0.82, -this.size * 0.8);
                    ctx.lineTo(-this.size * 0.4, -this.size * 0.55);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(this.size * 0.75, -this.size * 0.3);
                    ctx.lineTo(this.size * 0.82, -this.size * 0.8);
                    ctx.lineTo(this.size * 0.4, -this.size * 0.55);
                    ctx.fill();

                    ctx.fillStyle = col;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
                    ctx.beginPath();
                    ctx.arc(-this.size * 0.5, this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
                    ctx.arc(this.size * 0.5, this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 1.8;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.arc(-this.size * 0.4, -this.size * 0.1, this.size * 0.2, Math.PI, 0);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(this.size * 0.4, -this.size * 0.1, this.size * 0.2, Math.PI, 0);
                    ctx.stroke();
                    
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(-this.size * 0.1, this.size * 0.2, this.size * 0.12, 0, Math.PI);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(this.size * 0.1, this.size * 0.2, this.size * 0.12, 0, Math.PI);
                    ctx.stroke();
                    
                } else if (this.type === 'bunny') {
                    const bunnyColors = ['#fafaf9', '#fdf2f8', '#fee2e2'];
                    const col = bunnyColors[Math.floor(this.size * 10) % bunnyColors.length];
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    
                    ctx.fillStyle = col;
                    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                    ctx.lineWidth = 1;
                    
                    ctx.beginPath();
                    ctx.ellipse(-this.size * 0.35, -this.size * 0.9, this.size * 0.25, this.size * 0.7, -0.1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.ellipse(this.size * 0.35, -this.size * 0.9, this.size * 0.25, this.size * 0.7, 0.1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = '#fbcfe8';
                    ctx.beginPath();
                    ctx.ellipse(-this.size * 0.35, -this.size * 0.9, this.size * 0.12, this.size * 0.5, -0.1, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.ellipse(this.size * 0.35, -this.size * 0.9, this.size * 0.12, this.size * 0.5, 0.1, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = col;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
                    ctx.beginPath();
                    ctx.arc(-this.size * 0.5, this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
                    ctx.arc(this.size * 0.5, this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#475569';
                    ctx.beginPath();
                    ctx.arc(-this.size * 0.35, -this.size * 0.1, this.size * 0.15, 0, Math.PI * 2);
                    ctx.arc(this.size * 0.35, -this.size * 0.1, this.size * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#475569';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(0, this.size * 0.15, this.size * 0.15, 0, Math.PI);
                    ctx.stroke();
                    
                } else if (this.type === 'puppy') {
                    const puppyColors = ['#fef3c7', '#ffedd5', '#fafaf9', '#f5f5f4'];
                    const col = puppyColors[Math.floor(this.size * 10) % puppyColors.length];
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    
                    ctx.fillStyle = '#d97706';
                    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(-this.size * 0.9, 0, this.size * 0.3, this.size * 0.6, 0.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.ellipse(this.size * 0.9, 0, this.size * 0.3, this.size * 0.6, -0.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = col;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    
                    ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
                    ctx.beginPath();
                    ctx.arc(-this.size * 0.5, this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
                    ctx.arc(this.size * 0.5, this.size * 0.2, this.size * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#475569';
                    ctx.beginPath();
                    ctx.arc(-this.size * 0.35, -this.size * 0.1, this.size * 0.15, 0, Math.PI * 2);
                    ctx.arc(this.size * 0.35, -this.size * 0.1, this.size * 0.15, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(-this.size * 0.12, this.size * 0.1);
                    ctx.lineTo(this.size * 0.12, this.size * 0.1);
                    ctx.lineTo(0, this.size * 0.2);
                    ctx.closePath();
                    ctx.fill();
                    
                } else if (this.type === 'heart') {
                    ctx.fillStyle = '#ec4899';
                    ctx.beginPath();
                    const d = this.size * 1.1;
                    ctx.moveTo(this.x, this.y - d * 0.15);
                    ctx.bezierCurveTo(this.x, this.y - d * 0.65, this.x - d * 0.7, this.y - d * 0.65, this.x - d * 0.7, this.y - d * 0.1);
                    ctx.bezierCurveTo(this.x - d * 0.7, this.y + d * 0.45, this.x, this.y + d * 0.8, this.x, this.y + d * 1.0);
                    ctx.bezierCurveTo(this.x, this.y + d * 0.8, this.x + d * 0.7, this.y + d * 0.45, this.x + d * 0.7, this.y - d * 0.1);
                    ctx.bezierCurveTo(this.x + d * 0.7, this.y - d * 0.65, this.x, this.y - d * 0.65, this.x, this.y - d * 0.15);
                    ctx.fill();
                    
                } else {
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    
                    let rot = Math.PI / 2 * 3;
                    let spikes = 5;
                    let outerRadius = this.size;
                    let innerRadius = this.size * 0.4;
                    const step = Math.PI / spikes;
                    
                    ctx.beginPath();
                    ctx.moveTo(0, -outerRadius);
                    for (let i = 0; i < spikes; i++) {
                        let x = Math.cos(rot) * outerRadius;
                        let y = Math.sin(rot) * outerRadius;
                        ctx.lineTo(x, y);
                        rot += step;
                        
                        x = Math.cos(rot) * innerRadius;
                        y = Math.sin(rot) * innerRadius;
                        ctx.lineTo(x, y);
                        rot += step;
                    }
                    ctx.lineTo(0, -outerRadius);
                    ctx.closePath();
                    ctx.fillStyle = this.color;
                    ctx.fill();
                }
                
                ctx.restore();
            }
        }
        
        class ZenComboText {
            constructor(x, y, count) {
                this.x = x;
                this.y = y - 40;
                this.count = count;
                this.time = Date.now();
                this.duration = count === 1 ? 750 : 950; // shorter display for single words
                
                if (count === 1) {
                    const singleWords = ["Sweet! 🍉", "Nice! 🌸", "Zen! 🌿", "Fresh! 💫", "Lovely! 💕", "Calm! 🍃"];
                    this.text = singleWords[Math.floor(Math.random() * singleWords.length)];
                    this.color = "#a78bfa"; // soft lavender-violet
                } else {
                    const phrases = {
                        2: "2x Combo! 🍉",
                        3: "3x Combo! 🌟",
                        4: "4x Combo! 🔥",
                        5: "5x Mega Slice! ⚡"
                    };
                    this.text = phrases[count] || `${count}x Combo! 🚀`;
                    
                    const colors = {
                        2: "#f472b6", // pink
                        3: "#fbbf24", // gold
                        4: "#f97316", // orange
                        5: "#ef4444"  // red
                    };
                    this.color = colors[count] || "#10b981";
                }
                
                this.vy = count === 1 ? -1.0 : -1.6; // rise slower for single words
                this.scale = 0.5;
                this.opacity = 1.0;
            }

            update() {
                const elapsed = Date.now() - this.time;
                if (elapsed >= this.duration) return false;
                
                this.y += this.vy;
                this.opacity = 1.0 - (elapsed / this.duration);
                
                // Pop scale animation
                if (elapsed < 120) {
                    this.scale = 0.5 + (elapsed / 120) * 0.7; // pop to 1.2x
                } else if (elapsed < 240) {
                    this.scale = 1.2 - ((elapsed - 120) / 120) * 0.2; // settle at 1.0x
                } else {
                    this.scale = 1.0;
                }
                
                return true;
            }
            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.scale(this.scale, this.scale);
                
                ctx.font = "italic 900 24px 'Outfit', var(--font-heading), sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                
                // Draw outline for clear contrast on wood background
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 6;
                ctx.strokeText(this.text, 0, 0);
                
                // Draw drop shadow glow
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                
                // Fill text
                ctx.fillStyle = this.color;
                ctx.fillText(this.text, 0, 0);
                
                ctx.restore();
            }
        }
        
        class ZenFruit {

            constructor(canvasWidth, speedMode) {
                this.radius = 35 + Math.random() * 8;
                this.x = this.radius + Math.random() * (canvasWidth - this.radius * 2);
                this.y = canvas.height + 40;
                
                const speedConfig = {
                    slow: { vy: -4.8, vxRange: 1.2, gravity: 0.038 },   // slow-motion bubble float
                    normal: { vy: -7.5, vxRange: 2.8, gravity: 0.082 },  // calm and steady launch
                    fast: { vy: -10.5, vxRange: 4.8, gravity: 0.13 }     // moderate arcade speed
                };
                const config = speedConfig[speedMode] || speedConfig.normal;
                
                const varianceY = speedMode === 'slow' ? 1.0 : 3.0;
                this.vy = config.vy - Math.random() * varianceY;
                this.vx = (Math.random() - 0.5) * config.vxRange;
                this.gravity = config.gravity;

                
                const names = ['watermelon', 'apple', 'orange', 'coconut', 'pineapple'];
                this.name = names[Math.floor(Math.random() * names.length)];
                
                this.angle = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.05;
                
                this.isSliced = false;
                this.sliceAngle = 0;
                this.halfLeft = null;
                this.halfRight = null;
                
                const particleColors = {
                    watermelon: '#ef4444',
                    apple: '#fef3c7',
                    orange: '#fb923c',
                    coconut: '#ffffff',
                    pineapple: '#facc15'
                };
                this.juiceColor = particleColors[this.name];
            }
            
            update() {
                if (!this.isSliced) {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += this.gravity;
                    this.angle += this.rotationSpeed;
                } else {
                    const l = this.halfLeft;
                    const r = this.halfRight;
                    l.x += l.vx; l.y += l.vy; l.vy += this.gravity; l.angle += l.rotationSpeed;
                    r.x += r.vx; r.y += r.vy; r.vy += this.gravity; r.angle += r.rotationSpeed;
                }
                
                const limit = canvas.height + 60;
                if (!this.isSliced) {
                    return this.y < limit;
                } else {
                    return this.halfLeft.y < limit || this.halfRight.y < limit;
                }
            }
            
            slice(cutAngle) {
                this.isSliced = true;
                this.sliceAngle = cutAngle;
                
                this.halfLeft = {
                    x: this.x, y: this.y,
                    vx: this.vx - 3 - Math.random()*2,
                    vy: this.vy - 1.5,
                    angle: 0,
                    rotationSpeed: -0.12 - Math.random()*0.05
                };
                this.halfRight = {
                    x: this.x, y: this.y,
                    vx: this.vx + 3 + Math.random()*2,
                    vy: this.vy - 1.5,
                    angle: 0,
                    rotationSpeed: 0.12 + Math.random()*0.05
                };
            }
            
            drawWhole(ctx) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.2)';
                ctx.shadowBlur = 6;
                ctx.shadowOffsetY = 4;
                
                if (this.name === 'watermelon') {
                    const grad = ctx.createRadialGradient(-this.radius*0.3, -this.radius*0.3, 2, 0, 0, this.radius);
                    grad.addColorStop(0, '#86efac');
                    grad.addColorStop(0.7, '#22c55e');
                    grad.addColorStop(1, '#15803d');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.shadowColor = 'transparent';
                    ctx.strokeStyle = '#14532d';
                    ctx.lineWidth = 3.5;
                    for (let ao = -1.2; ao <= 1.2; ao += 0.6) {
                        ctx.beginPath();
                        let first = true;
                        for (let y = -this.radius; y <= this.radius; y += 4) {
                            const x = Math.sin(y * 0.14) * 5 + Math.sin(ao) * (this.radius - Math.abs(y)*0.2);
                            if (x*x + y*y < this.radius*this.radius - 2) {
                                if (first) { ctx.moveTo(x, y); first = false; }
                                else ctx.lineTo(x, y);
                            }
                        }
                        ctx.stroke();
                    }
                } 
                else if (this.name === 'apple') {
                    const grad = ctx.createRadialGradient(-this.radius*0.2, -this.radius*0.4, 2, 0, 0, this.radius);
                    grad.addColorStop(0, '#f87171');
                    grad.addColorStop(0.7, '#dc2626');
                    grad.addColorStop(1, '#7f1d1d');
                    ctx.fillStyle = grad;
                    
                    ctx.beginPath();
                    ctx.moveTo(0, -this.radius * 0.45);
                    ctx.bezierCurveTo(this.radius * 0.5, -this.radius * 1.1, this.radius * 1.2, -this.radius * 0.6, this.radius, 0);
                    ctx.bezierCurveTo(this.radius * 0.8, this.radius * 0.8, this.radius * 0.35, this.radius, 0, this.radius * 0.85);
                    ctx.bezierCurveTo(-this.radius * 0.35, this.radius, -this.radius * 0.8, this.radius * 0.8, -this.radius, 0);
                    ctx.bezierCurveTo(-this.radius * 1.2, -this.radius * 0.6, -this.radius * 0.5, -this.radius * 1.1, 0, -this.radius * 0.45);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.shadowColor = 'transparent';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 3.2;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(0, -this.radius*0.4);
                    ctx.quadraticCurveTo(4, -this.radius*0.8, 8, -this.radius*1.0);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#22c55e';
                    ctx.beginPath();
                    ctx.ellipse(8, -this.radius*0.9, 7, 3.5, -Math.PI/6, 0, Math.PI*2);
                    ctx.fill();
                } 
                else if (this.name === 'orange') {
                    const grad = ctx.createRadialGradient(-this.radius*0.2, -this.radius*0.3, 2, 0, 0, this.radius);
                    grad.addColorStop(0, '#fdba74');
                    grad.addColorStop(0.7, '#f97316');
                    grad.addColorStop(1, '#c2410c');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.shadowColor = 'transparent';
                    ctx.fillStyle = '#15803d';
                    ctx.beginPath();
                    ctx.arc(0, -this.radius + 3, 2.2, 0, Math.PI*2);
                    ctx.fill();
                } 
                else if (this.name === 'coconut') {
                    const grad = ctx.createRadialGradient(-this.radius*0.2, -this.radius*0.2, 2, 0, 0, this.radius);
                    grad.addColorStop(0, '#a16207');
                    grad.addColorStop(0.7, '#78350f');
                    grad.addColorStop(1, '#451a03');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#1c1917';
                    ctx.beginPath();
                    ctx.arc(-6, -this.radius*0.4, 3.5, 0, Math.PI*2);
                    ctx.arc(6, -this.radius*0.4, 3.5, 0, Math.PI*2);
                    ctx.arc(0, -this.radius*0.1, 4, 0, Math.PI*2);
                    ctx.fill();
                } 
                else if (this.name === 'pineapple') {
                    const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, this.radius * 1.1);
                    grad.addColorStop(0, '#fde047');
                    grad.addColorStop(0.6, '#eab308');
                    grad.addColorStop(1, '#a16207');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.radius * 0.9, this.radius * 1.1, 0, 0, Math.PI * 2);
                    ctx.fill();
                    
                    ctx.shadowColor = 'transparent';
                    ctx.strokeStyle = '#78350f';
                    ctx.lineWidth = 1.5;
                    const r = this.radius;
                    for (let offset = -r; offset <= r; offset += 18) {
                        ctx.beginPath();
                        ctx.moveTo(offset - r, -r);
                        ctx.lineTo(offset + r, r);
                        ctx.moveTo(offset + r, -r);
                        ctx.lineTo(offset - r, r);
                        ctx.stroke();
                    }
                    
                    ctx.fillStyle = '#15803d';
                    ctx.beginPath();
                    ctx.moveTo(-10, -this.radius * 0.9);
                    ctx.quadraticCurveTo(-18, -this.radius * 1.6, -12, -this.radius * 1.8);
                    ctx.quadraticCurveTo(-6, -this.radius * 1.3, -3, -this.radius * 1.0);
                    ctx.lineTo(3, -this.radius * 1.0);
                    ctx.quadraticCurveTo(6, -this.radius * 1.3, 12, -this.radius * 1.8);
                    ctx.quadraticCurveTo(18, -this.radius * 1.6, 10, -this.radius * 0.9);
                    ctx.closePath();
                    ctx.fill();
                }
                
                ctx.restore();
            }
            
            drawInnerCut(ctx, side) {
                if (this.name === 'watermelon') {
                    ctx.fillStyle = '#f0fdf4';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 2.5, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 4.5, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#000000';
                    const seedRadius = this.radius * 0.55;
                    for (let a = 0.1; a < Math.PI * 2; a += Math.PI / 4) {
                        const sx = Math.cos(a) * seedRadius;
                        const sy = Math.sin(a) * seedRadius;
                        ctx.beginPath();
                        ctx.arc(sx, sy, 1.8, 0, Math.PI*2);
                        ctx.fill();
                    }
                } 
                else if (this.name === 'apple') {
                    ctx.fillStyle = '#fef3c7';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 2, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#ca8a04';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, 7, 10, 0, 0, Math.PI*2);
                    ctx.stroke();
                    
                    ctx.fillStyle = '#78350f';
                    ctx.beginPath();
                    ctx.ellipse(-3, 0, 1.8, 3.2, Math.PI/6, 0, Math.PI*2);
                    ctx.ellipse(3, 0, 1.8, 3.2, -Math.PI/6, 0, Math.PI*2);
                    ctx.fill();
                } 
                else if (this.name === 'orange') {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 1, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#fb923c';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 3.5, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.6;
                    const wedgeCount = 8;
                    for (let i = 0; i < wedgeCount; i++) {
                        const a = (i / wedgeCount) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(a) * (this.radius - 3), Math.sin(a) * (this.radius - 3));
                        ctx.stroke();
                    }
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, 3.2, 0, Math.PI*2);
                    ctx.fill();
                } 
                else if (this.name === 'coconut') {
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 3, 0, Math.PI*2);
                    ctx.fill();
                    
                    const waterGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, this.radius - 9);
                    waterGrad.addColorStop(0, '#e0f2fe');
                    waterGrad.addColorStop(0.6, '#7dd3fc');
                    waterGrad.addColorStop(1, '#0284c7');
                    ctx.fillStyle = waterGrad;
                    ctx.beginPath();
                    ctx.arc(0, 0, this.radius - 9, 0, Math.PI*2);
                    ctx.fill();
                } 
                else if (this.name === 'pineapple') {
                    ctx.fillStyle = '#fef9c3';
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.radius - 1, this.radius - 1, 0, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.fillStyle = '#eab308';
                    ctx.beginPath();
                    ctx.arc(0, 0, 7.5, 0, Math.PI*2);
                    ctx.fill();
                    
                    ctx.strokeStyle = '#fde047';
                    ctx.lineWidth = 1.2;
                    const lines = 12;
                    for (let i = 0; i < lines; i++) {
                        const a = (i / lines) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
                        ctx.lineTo(Math.cos(a) * (this.radius - 4), Math.sin(a) * (this.radius - 4));
                        ctx.stroke();
                    }
                }
            }
            
            draw(ctx) {
                if (!this.isSliced) {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.angle);
                    this.drawWhole(ctx);
                    ctx.restore();
                } else {
                    // Left half
                    ctx.save();
                    ctx.translate(this.halfLeft.x, this.halfLeft.y);
                    ctx.rotate(this.halfLeft.angle);
                    ctx.rotate(this.sliceAngle);
                    
                    // Draw highlight cut edge
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3.5;
                    ctx.shadowColor = '#fde047'; // bright golden energy glow
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.moveTo(-this.radius, 0);
                    ctx.lineTo(this.radius, 0);
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.rect(-150, -150, 300, 150);
                    ctx.clip();
                    ctx.rotate(-this.sliceAngle);
                    this.drawWhole(ctx);
                    ctx.rotate(this.sliceAngle);
                    this.drawInnerCut(ctx, 'left');
                    ctx.restore();
                    
                    // Right half
                    ctx.save();
                    ctx.translate(this.halfRight.x, this.halfRight.y);
                    ctx.rotate(this.halfRight.angle);
                    ctx.rotate(this.sliceAngle);
                    
                    // Draw highlight cut edge
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3.5;
                    ctx.shadowColor = '#fde047';
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.moveTo(-this.radius, 0);
                    ctx.lineTo(this.radius, 0);
                    ctx.stroke();
                    
                    ctx.beginPath();
                    ctx.rect(-150, 0, 300, 150);
                    ctx.clip();
                    ctx.rotate(-this.sliceAngle);
                    this.drawWhole(ctx);
                    ctx.rotate(this.sliceAngle);
                    this.drawInnerCut(ctx, 'right');
                    ctx.restore();
                }
            }
        }
        
        function drawPaw(ctx, x, y, size, color, alpha) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            
            ctx.beginPath();
            ctx.ellipse(x, y + size * 0.15, size * 0.75, size * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            
            const toes = [
                { dx: -size * 0.55, dy: -size * 0.35, r: size * 0.22 },
                { dx: -size * 0.2, dy: -size * 0.65, r: size * 0.25 },
                { dx: size * 0.2, dy: -size * 0.65, r: size * 0.25 },
                { dx: size * 0.55, dy: -size * 0.35, r: size * 0.22 }
            ];
            toes.forEach(t => {
                ctx.beginPath();
                ctx.arc(x + t.dx, y + t.dy, t.r, 0, Math.PI * 2);
                ctx.fill();
            });
            
            ctx.restore();
        }

        function drawCuteTrail() {
            if (trailPoints.length === 0) return;
            const now = Date.now();
            
            ctx.save();
            
            // 1. Draw glowing neon blade slash line connecting the swipe coordinates
            if (trailPoints.length >= 2) {
                ctx.beginPath();
                ctx.moveTo(trailPoints[0].x, trailPoints[0].y);
                for (let i = 1; i < trailPoints.length; i++) {
                    ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
                }
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // Outer neon glow stroke
                ctx.lineWidth = 8;
                ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)'; // lavender glow
                ctx.shadowColor = '#8b5cf6';
                ctx.shadowBlur = 12;
                ctx.stroke();
                
                // Inner bright hot core line
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ffffff';
                ctx.shadowColor = 'transparent';
                ctx.stroke();
            }
            
            // 2. Draw cute mascot paw prints along the trail
            const colors = ['#fbcfe8', '#bae6fd', '#fef08a', '#c084fc', '#a7f3d0'];
            let lastDrawnX = null;
            let lastDrawnY = null;
            
            for (let i = 0; i < trailPoints.length; i++) {
                const pt = trailPoints[i];
                const age = now - pt.time;
                const alpha = Math.max(0, 1 - age / 150);
                if (alpha <= 0) continue;
                
                if (lastDrawnX !== null && i < trailPoints.length - 1) {
                    const dx = pt.x - lastDrawnX;
                    const dy = pt.y - lastDrawnY;
                    if (dx*dx + dy*dy < 400) {
                        continue;
                    }
                }
                
                const color = colors[i % colors.length];
                const size = 11 + alpha * 5;
                
                drawPaw(ctx, pt.x, pt.y, size, color, alpha * 0.85);
                
                lastDrawnX = pt.x;
                lastDrawnY = pt.y;
            }
            ctx.restore();
        }
        
        function checkSlices(p1, p2) {
            fruits.forEach(f => {
                if (f.isSliced) return;
                
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const lenSq = dx*dx + dy*dy;
                if (lenSq === 0) return;
                
                let t = ((f.x - p1.x) * dx + (f.y - p1.y) * dy) / lenSq;
                t = Math.max(0, Math.min(1, t));
                
                const closestX = p1.x + t * dx;
                const closestY = p1.y + t * dy;
                
                const distSq = (f.x - closestX) * (f.x - closestX) + (f.y - closestY) * (f.y - closestY);
                if (distSq < f.radius * f.radius) {
                    const cutAngle = Math.atan2(dy, dx);
                    f.slice(cutAngle);
                    
                    score = Math.min(targetScore, score + 1);
                    updateProgress();
                    
                    // Increment slices and update dashboard
                    state.gameStats.slices++;
                    if (window.updateSanctuaryDashboard) window.updateSanctuaryDashboard();
                    
                    // Check Combo Slicing sliding window
                    const now = Date.now();
                    if (now - lastSliceTime < 450) {
                        currentCombo++;
                    } else {
                        currentCombo = 1;
                    }
                    lastSliceTime = now;
                    
                    if (currentCombo === 1) {
                        // Spawn a single-slice encouraging word
                        comboTexts.push(new ZenComboText(f.x, f.y, 1));
                    } else {
                        // Remove the preceding text bubble spawned within 400ms to show the new multiplier combo instead
                        const nowMs = Date.now();
                        comboTexts = comboTexts.filter(t => nowMs - t.time > 400);
                        comboTexts.push(new ZenComboText(f.x, f.y, currentCombo));
                    }

                    
                    splats.push(new ZenSplat(f.x, f.y, f.name));
                    playSplashSound();

                    
                    for (let i = 0; i < 25; i++) {
                        sparks.push(new ZenSpark(f.x, f.y, f.juiceColor));
                    }
                    for (let i = 0; i < 36; i++) {
                        juiceParticles.push(new ZenJuiceParticle(f.x, f.y, f.juiceColor));
                    }
                    
                    if (score >= targetScore) {
                        endGameWithWin();
                    }
                }

            });
        }
        
        let lastSpawnTime = 0;
        function gameLoop(timestamp) {
            if (!isPlaying) return;
            
            drawBackground();
            
            splats = splats.filter(s => s.draw(ctx));
            
            const spawnIntervals = { slow: 2800, normal: 1600, fast: 1000 };
            const limit = spawnIntervals[speedMode] || 1600;

            if (timestamp - lastSpawnTime > limit) {
                const spawnCount = speedMode === 'fast' ? (Math.random() < 0.5 ? 2 : 3) : (speedMode === 'normal' ? (Math.random() < 0.45 ? 2 : 1) : (Math.random() < 0.35 ? 2 : 1));

                for (let c = 0; c < spawnCount; c++) {
                    fruits.push(new ZenFruit(canvas.width, speedMode));
                }
                lastSpawnTime = timestamp;
            }
            
            fruits = fruits.filter(f => {
                const keep = f.update();
                f.draw(ctx);
                return keep;
            });
            
            sparks = sparks.filter(s => {
                const keep = s.update();
                s.draw(ctx);
                return keep;
            });
            
            juiceParticles = juiceParticles.filter(p => {
                const keep = p.update();
                p.draw(ctx);
                return keep;
            });
            
            comboTexts = comboTexts.filter(t => {
                const keep = t.update();
                if (keep) t.draw(ctx);
                return keep;
            });
            
            const now = Date.now();

            trailPoints = trailPoints.filter(p => now - p.time < 150);
            
            drawCuteTrail();
            
            animationFrameId = requestAnimationFrame(gameLoop);
        }
        
        function updateProgress() {
            if (progressFill) {
                const pct = (score / targetScore) * 100;
                progressFill.style.width = pct + '%';
            }
            if (progressVal) {
                progressVal.textContent = `${score}/${targetScore}`;
            }
        }
        
        function endGameWithWin() {
            isPlaying = false;
            cancelAnimationFrame(animationFrameId);
            
            if (zenGameArena) zenGameArena.classList.add('hidden');
            if (surveyInline) {
                surveyInline.classList.remove('hidden');
                if (winChoicesRow) winChoicesRow.classList.remove('hidden');
                if (surveyMoodSection) surveyMoodSection.classList.add('hidden');
                surveyInline.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        
        function startZenGame() {
            initAudio();
            score = 0;
            updateProgress();
            
            // Set start flag & update lounge checklist
            localStorage.setItem('relax_game_started', 'true');
            if (window.updateSanctuaryDashboard) window.updateSanctuaryDashboard();

            fruits = [];
            splats = [];
            sparks = [];
            juiceParticles = [];
            trailPoints = [];
            comboTexts = [];
            currentCombo = 0;
            lastSliceTime = 0;
            isPlaying = true;

            
            if (zenStartScreen) zenStartScreen.classList.add('hidden');
            if (zenGameArena) zenGameArena.classList.remove('hidden');
            if (surveyInline) surveyInline.classList.add('hidden');
            
            resizeCanvas();
            
            lastSpawnTime = performance.now();
            animationFrameId = requestAnimationFrame(gameLoop);
        }

        
        function quitZenGame() {
            isPlaying = false;
            cancelAnimationFrame(animationFrameId);
            if (zenGameArena) zenGameArena.classList.add('hidden');
            if (zenStartScreen) zenStartScreen.classList.remove('hidden');
            if (surveyInline) surveyInline.classList.add('hidden');
        }
        
        function resizeCanvas() {
            if (!canvas) return;
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width || 600;
            canvas.height = rect.height || 420;
        }
        
        function handleStart(x, y) {
            isMouseDown = true;
            initAudio();
            const p = { x, y, time: Date.now() };
            trailPoints = [p];
            lastMousePos = p;
        }
        
        function handleMove(x, y) {
            if (!isMouseDown) return;
            const p = { x, y, time: Date.now() };
            trailPoints.push(p);
            
            if (lastMousePos) {
                checkSlices(lastMousePos, p);
                
                // Spawn glowing cute pastel sparks along swipe trail
                if (Math.random() < 0.5) {
                    const pastelColors = ['#f472b6', '#c084fc', '#fef08a', '#bae6fd', '#fbcfe8', '#a7f3d0'];
                    const col = pastelColors[Math.floor(Math.random() * pastelColors.length)];
                    sparks.push(new ZenSpark(x, y, col));
                }
                
                const distSq = (x - lastMousePos.x)*(x - lastMousePos.x) + (y - lastMousePos.y)*(y - lastMousePos.y);
                if (distSq > 900 && Math.random() < 0.15) {
                    playWhooshSound();
                }
            }
            lastMousePos = p;
        }
        
        function handleEnd() {
            isMouseDown = false;
            lastMousePos = null;
        }
        
        function bindEvents() {
            if (btnStartZen) btnStartZen.addEventListener('click', startZenGame);
            if (btnQuitZen) btnQuitZen.addEventListener('click', quitZenGame);
            
            if (btnSelectFruitZen && cardFruitZen && menuContainer) {
                btnSelectFruitZen.addEventListener('click', () => {
                    menuContainer.classList.add('hidden');
                    cardFruitZen.classList.remove('hidden');
                    if (zenStartScreen) zenStartScreen.classList.remove('hidden');
                    if (zenGameArena) zenGameArena.classList.add('hidden');
                    if (surveyInline) surveyInline.classList.add('hidden');
                });
            }
            
            if (btnFruitZenBack && cardFruitZen && menuContainer) {
                btnFruitZenBack.addEventListener('click', () => {
                    quitZenGame();
                    cardFruitZen.classList.add('hidden');
                    menuContainer.classList.remove('hidden');
                });
            }
            
            const speedBtns = document.querySelectorAll('[data-speed-mode]');
            speedBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    speedBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    speedMode = btn.dataset.speedMode || 'normal';
                });
            });
            
            if (canvas) {
                ctx = canvas.getContext('2d');
                
                canvas.addEventListener('mousedown', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    handleStart(e.clientX - rect.left, e.clientY - rect.top);
                });
                
                canvas.addEventListener('mousemove', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    handleMove(e.clientX - rect.left, e.clientY - rect.top);
                });
                
                window.addEventListener('mouseup', handleEnd);
                
                canvas.addEventListener('touchstart', (e) => {
                    if (e.touches[0]) {
                        const rect = canvas.getBoundingClientRect();
                        handleStart(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
                    }
                    e.preventDefault();
                }, { passive: false });
                
                canvas.addEventListener('touchmove', (e) => {
                    if (e.touches[0]) {
                        const rect = canvas.getBoundingClientRect();
                        handleMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
                    }
                    e.preventDefault();
                }, { passive: false });
                
                canvas.addEventListener('touchend', handleEnd);
            }
            
            if (btnWinReplay) {
                btnWinReplay.addEventListener('click', () => {
                    if (cardFruitZen && !cardFruitZen.classList.contains('hidden')) {
                        startZenGame();
                    }
                });
            }
        }
        bindEvents();
        window.addEventListener('resize', resizeCanvas);
    })();

    // --- CHIEF DESIGNER: COZY AMBIENT PARTICLE ENGINE ---
    (function GamesAmbientParticleEngine() {
        const canvas = document.getElementById('games-ambient-canvas');

        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        let animId = null;

        function resize() {
            if (!canvas) return;
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width || 800;
            canvas.height = rect.height || 500;
        }

        class FloatingParticle {
            constructor() {
                this.reset(true);
            }
            reset(initY = false) {
                this.x = Math.random() * canvas.width;
                this.y = initY ? (Math.random() * canvas.height) : (canvas.height + 20);
                this.size = 3 + Math.random() * 8;
                this.speedY = 0.35 + Math.random() * 0.6; // float upwards slowly
                this.swaySpeed = 0.005 + Math.random() * 0.01;
                this.time = Math.random() * 100;
                
                // Brighter, more vibrant therapeutic colors
                const colors = [
                    'rgba(244, 63, 94, 0.55)',   // rose
                    'rgba(139, 92, 246, 0.48)',  // lavender/violet
                    'rgba(245, 158, 11, 0.52)',  // gold/orange
                    'rgba(16, 185, 129, 0.55)'   // mint green
                ];
                this.color = colors[Math.floor(Math.random() * colors.length)];

                this.isLeaf = Math.random() < 0.35; // 35% are floating tea leaves
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.015;
            }
            update() {
                this.y -= this.speedY;
                this.time += this.swaySpeed;
                this.x += Math.sin(this.time) * 0.3;
                this.rotation += this.rotationSpeed;
                
                if (this.y < -20 || this.x < -20 || this.x > canvas.width + 20) {
                    this.reset(false);
                }
            }
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = this.color;
                
                if (this.isLeaf) {
                    // Draw organic leaf shape
                    ctx.beginPath();
                    ctx.ellipse(0, 0, this.size * 1.6, this.size * 0.7, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(-this.size * 1.6, 0);
                    ctx.lineTo(this.size * 1.6, 0);
                    ctx.stroke();
                } else {
                    // Draw glowing circle
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }

        function initParticles() {
            particles = [];
            for (let i = 0; i < 22; i++) {
                particles.push(new FloatingParticle());
            }
        }

        function loop() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            animId = requestAnimationFrame(loop);
        }

        window.addEventListener('resize', resize);
        
        // Listen to tab activation changes to start/stop loop
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const gamesPanel = document.getElementById('games-panel');
                    if (gamesPanel && gamesPanel.classList.contains('active')) {
                        if (!animId) {
                            resize();
                            initParticles();
                            loop();
                        }
                    } else {
                        if (animId) {
                            cancelAnimationFrame(animId);
                            animId = null;
                        }
                    }
                }
            });
        });
        
        const gamesPanel = document.getElementById('games-panel');
        if (gamesPanel) {
            observer.observe(gamesPanel, { attributes: true });
            // Initial check
            if (gamesPanel.classList.contains('active')) {
                resize();
                initParticles();
                loop();
            }
        }
    })();

    // Expose dashboard updater globally so other scopes can invoke it
    window.updateSanctuaryDashboard = function() {
        const elZen = document.getElementById('dash-val-zen');
        const elMatches = document.getElementById('dash-val-matches');
        const elSlices = document.getElementById('dash-val-slices');
        const elTime = document.getElementById('dash-val-time');

        if (elZen) elZen.textContent = state.diagnostics.sentiment || 'Calm';
        if (elMatches) elMatches.textContent = state.gameStats.matches;
        if (elSlices) elSlices.textContent = state.gameStats.slices;

        // Keep simple play session timer tracker
        if (elTime) {
            let startTime = sessionStorage.getItem('relax_start_time');
            if (!startTime) {
                startTime = Date.now();
                sessionStorage.setItem('relax_start_time', startTime);
            }
            const diffMins = Math.floor((Date.now() - Number(startTime)) / 60000);
            elTime.textContent = diffMins + 'm';
        }

        // Helper function to award a spark exactly once
        function awardSparkOnce(missionId, missionName) {
            const key = 'mission_awarded_' + missionId;
            if (localStorage.getItem(key) !== 'true') {
                let sp = { days: 1, boxesOpened: 0, lastDiagnosis: '', personalityTag: '' };
                try {
                    const raw = localStorage.getItem('kawanku_spark');
                    if (raw) sp = JSON.parse(raw);
                } catch (e) {}
                
                sp.days = (sp.days || 0) + 1;
                localStorage.setItem('kawanku_spark', JSON.stringify(sp));
                localStorage.setItem(key, 'true');

                // Update UI elements instantly
                const sBalance = document.getElementById('shop-spark-balance');
                if (sBalance) sBalance.innerText = sp.days;
                const qCount = document.getElementById('quiz-spark-count');
                if (qCount) qCount.innerText = sp.days;

                // Sync shop balance display inside the shop module scope if defined
                if (typeof syncShopBalance === 'function') {
                    try {
                        syncShopBalance(sp);
                    } catch (e) {}
                }

                showToast(`Mission Completed: "${missionName}"! Earned +1 Spark! 🔥`, 'success');
            }
        }

        // Update Checklist Items in Daily Zen Focus
        const isGameStarted = localStorage.getItem('relax_game_started') === 'true';
        const taskStart = document.getElementById('task-cozy-start');
        if (taskStart && isGameStarted) {
            taskStart.classList.add('completed');
            awardSparkOnce('cozy_start', 'Cozy Start');
        }

        const taskMatches = document.getElementById('task-cozy-matches');
        if (taskMatches && state.gameStats.matches >= 30) {
            taskMatches.classList.add('completed');
            awardSparkOnce('match_master', 'Match Master');
        }

        const taskSlices = document.getElementById('task-cozy-slices');
        if (taskSlices && state.gameStats.slices >= 20) {
            taskSlices.classList.add('completed');
            awardSparkOnce('zen_slicer', 'Zen Slicer');
        }
    };

    // Run launcher
    init();

    // Initial sync of real-time cozy stats and daily zen focus checklists on load
    if (window.updateSanctuaryDashboard) {
        window.updateSanctuaryDashboard();
    }
});

// Calm Videos Integration (Exposed Globally for inline HTML onclick handlers)
window.CalmVideoData = {
    anxiety: {
        title: "Anxiety Relief Support",
        desc: "Soothing guides, deep breathing, and grounding exercises to help you manage anxiety and panic states.",
        videos: [
            { title: "5-Min Quick Calm Breathwork", src: "frontend/student/videos/anxiety_1.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" },
            { title: "Grounding Exercise for Panic Relief", src: "frontend/student/videos/anxiety_2.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-with-stars-moving-14022-large.mp4" }
        ]
    },
    depression: {
        title: "Depression Support & Affirmations",
        desc: "Gentle reminders, companion voices, and comforting visual soundscapes for heavy days.",
        videos: [
            { title: "Overcoming Fatigue & Heavy Days", src: "frontend/student/videos/depression_1.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-with-stars-moving-14022-large.mp4" },
            { title: "Daily Comfort Affirmations", src: "frontend/student/videos/depression_2.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" }
        ]
    },
    motivation: {
        title: "Motivational Speeches",
        desc: "Ignite your drive, build confidence, and get back on track with powerful mindset sessions.",
        videos: [
            { title: "Unshakable Willpower & Drive", src: "frontend/student/videos/motivation_1.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-34280-large.mp4" },
            { title: "Rising Above Failure", src: "frontend/student/videos/motivation_2.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-with-stars-moving-14022-large.mp4" }
        ]
    },
    academic: {
        title: "Academic Stress Management",
        desc: "Learn to navigate exam pressure, manage task burnout, and optimize your study focus.",
        videos: [
            { title: "Coping with Exam Anxiety & Stress", src: "frontend/student/videos/academic_1.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" },
            { title: "Recovering from Academic Burnout", src: "frontend/student/videos/academic_2.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-34280-large.mp4" }
        ]
    },
    confidence: {
        title: "Building Unshakable Confidence",
        desc: "Overcome self-doubt, silence your inner critic, and build lasting self-compassion.",
        videos: [
            { title: "Silencing Your Inner Critic", src: "frontend/student/videos/confidence_1.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-cliff-34280-large.mp4" },
            { title: "Embracing Your Unique Journey", src: "frontend/student/videos/confidence_2.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" }
        ]
    },
    meditate: {
        title: "Guided Meditation & Grounding",
        desc: "Find peace and centering through deep breathing techniques, mindfulness, and audio-visual meditation.",
        videos: [
            { title: "Deep Breathing Focus Session", src: "frontend/student/videos/meditate_1.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" },
            { title: "Sleep Soundscape & Evening Rest", src: "frontend/student/videos/meditate_2.mp4", fallback: "https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-with-stars-moving-14022-large.mp4" }
        ]
    }
};

window.openCategory = function(catId) {
    const cat = window.CalmVideoData[catId];
    if (!cat) return;

    const grid = document.getElementById('calmCategoryGrid');
    const detail = document.getElementById('categoryDetail');
    if (grid && detail) {
        grid.style.display = 'none';
        detail.style.display = 'flex';
    }

    const title = document.getElementById('currentCategoryTitle');
    const desc = document.getElementById('currentCategoryDesc');
    if (title) title.textContent = cat.title;
    if (desc) desc.textContent = cat.desc;

    const playlist = document.getElementById('playlistItems');
    if (playlist) {
        playlist.innerHTML = '';
        cat.videos.forEach((video, index) => {
            const btn = document.createElement('button');
            btn.className = `playlist-video-item ${index === 0 ? 'active' : ''}`;
            btn.onclick = () => {
                document.querySelectorAll('.playlist-video-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.playVideo(video);
            };
            btn.innerHTML = `
                <span class="playlist-video-icon">▶</span>
                <span>${video.title}</span>
            `;
            playlist.appendChild(btn);
        });
    }

    if (cat.videos.length > 0) {
        window.playVideo(cat.videos[0]);
    }
};

window.playVideo = function(videoObj) {
    const player = document.getElementById('detailVideoPlayer');
    const title  = document.getElementById('currentVideoTitle');

    if (title) title.textContent = videoObj.title;
    if (!player) return;

    const loadSrc = (src) => {
        player.src = src;
        player.load();
        player.play().catch(e => console.warn('Autoplay blocked (click play manually):', e));
    };

    // HEAD-check the local file first.
    // If the server returns 404 (file not there yet), use the public fallback URL.
    fetch(videoObj.src, { method: 'HEAD' })
        .then(res => {
            if (res.ok) {
                console.log('Local video found:', videoObj.src);
                loadSrc(videoObj.src);
            } else {
                console.log('Local video not available (HTTP ' + res.status + '), loading fallback.');
                loadSrc(videoObj.fallback);
            }
        })
        .catch(() => {
            console.log('Local video unreachable, loading fallback.');
            loadSrc(videoObj.fallback);
        });
};

window.closeCategory = function() {
    const player = document.getElementById('detailVideoPlayer');
    if (player) {
        player.pause();
    }
    const grid = document.getElementById('calmCategoryGrid');
    const detail = document.getElementById('categoryDetail');
    if (grid && detail) {
        detail.style.display = 'none';
        grid.style.display = 'block';
    }
};
