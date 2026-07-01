/* ==========================================================================
   MINDBUDDY COMPANION CLIENT-SIDE LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // GLOBAL STATE MANAGEMENT
    // ----------------------------------------------------------------------
    const state = {
        activePanel: 'chat-panel',
        
        // Avatar Configuration
        avatar: {
            hairStyle: 'crop',
            skinTone: '#ffdbac',
            expression: 'friendly',
            shirtStyle: 'hoodie',
            glasses: 'none',
            accessories: 'none',
            hoodieGraphic: 'star',
            pantsStyle: 'shorts',
            hairColor: '#1e293b',
            shirtColor: '#4f46e5',
            glowColor1: '#8b5cf6',
            glowColor2: '#ec4899'
        },

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
            animationFrame: null
        },

        // Quiz State
        quiz: {
            activeCategory: 'general',
            currentQuestionIdx: 0,
            answers: [],
            questions: []
        }
    };

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
            leftBrow:  "M118,88 Q130,83 140,88",
            rightBrow: "M160,88 Q170,83 182,88",
            mouth:     "M138,133 Q150,143 162,133",
            teethOpacity: 0
        },
        thoughtful: {
            leftBrow:  "M118,85 Q130,80 140,88",
            rightBrow: "M160,88 Q170,80 182,85",
            mouth:     "M140,136 L160,136",
            teethOpacity: 0
        },
        attentive: {
            leftBrow:  "M118,88 Q130,84 140,84",
            rightBrow: "M160,84 Q170,84 182,88",
            mouth:     "M140,135 Q150,139 160,135",
            teethOpacity: 0
        },
        excited: {
            leftBrow:  "M118,82 Q130,76 140,82",
            rightBrow: "M160,82 Q170,76 182,82",
            mouth:     "M136,132 Q150,146 164,132",
            teethOpacity: 1
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
        studioTabBtns: document.querySelectorAll('.opt-tab-btn'),
        studioPanelGroups: document.querySelectorAll('.options-content .options-panel-group'),
        avatarRandomizeBtn: document.getElementById('avatar-randomize-btn'),
        pickerHair: document.getElementById('picker-hair'),
        pickerShirt: document.getElementById('picker-shirt'),
        pickerGlow1: document.getElementById('picker-glow1'),
        pickerGlow2: document.getElementById('picker-glow2'),
        
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
            // Remap all IDs with a -studio suffix so both SVGs can coexist
            clonedSVG.querySelectorAll('[id]').forEach(el => {
                el.id = el.id + '-studio';
            });
            studioContainer.appendChild(clonedSVG);
        }

        // Init SVG layout components
        renderAvatarVisuals();
        
        // Hook up Sidebar Nav links
        DOM.navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                switchPanel(target);
                
                DOM.navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Initialize lucide icons
        lucide.createIcons();

        // Biometrics Graph render cycle
        initBiometricsChart();
        setInterval(updateBiometricsLiveCycle, 1000);

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
        }
    }

    // ----------------------------------------------------------------------
    // TOAST NOTIFICATIONS
    // ----------------------------------------------------------------------
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'x-circle';
        if (type === 'warning') iconName = 'alert-triangle';

        toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
        DOM.toastContainer.appendChild(toast);
        lucide.createIcons({attrs: {class: 'toast-icon-svg'}});

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

        // ---- Skin tone propagation ----
        const skinEls = ['avatar-head', 'avatar-neck', 'avatar-hand-l', 'avatar-hand-r', 'ear-l', 'ear-r'];
        skinEls.forEach(id => {
            const el = svg.querySelector('#' + id);
            if (el) el.setAttribute('fill', conf.skinTone);
        });
        // Ears inner + nose + blush
        const noseEl = svg.querySelector('#avatar-nose');
        if (noseEl) {
            // derive a slightly darker shade for nose/ear shading
            noseEl.setAttribute('fill', shadeColor(conf.skinTone, -20));
        }

        // ---- Hair ----
        const hairFront = svg.querySelector('#avatar-hair-front');
        const hairBack  = svg.querySelector('#avatar-hair-back');
        const hairPaths = SVG_HAIRSTYLES[conf.hairStyle];
        if (hairFront && hairPaths) hairFront.setAttribute('d', hairPaths.front);
        if (hairBack  && hairPaths) hairBack.setAttribute('d',  hairPaths.back);
        // Apply hair color via attribute (CSS variable fallback also works)
        if (hairFront) hairFront.setAttribute('fill', conf.hairColor);
        if (hairBack)  hairBack.setAttribute('fill',  conf.hairColor);
        const leftBrowEl  = svg.querySelector('#left-brow');
        const rightBrowEl = svg.querySelector('#right-brow');
        if (leftBrowEl)  leftBrowEl.setAttribute('stroke', conf.hairColor);
        if (rightBrowEl) rightBrowEl.setAttribute('stroke', conf.hairColor);

        // ---- Shirt / Hoodie ----
        const clothes = svg.querySelector('#avatar-clothes');
        const hood    = svg.querySelector('#avatar-hood');
        const shirtPath = SVG_SHIRTS[conf.shirtStyle || 'hoodie'];
        if (clothes && shirtPath) clothes.setAttribute('d', shirtPath);
        if (clothes) clothes.setAttribute('fill', conf.shirtColor);

        // Arms must match shirt color
        svg.querySelectorAll('#avatar-left-arm path, #avatar-right-arm path').forEach(el => {
            el.setAttribute('fill', conf.shirtColor);
        });
        // Hood slightly darker
        if (hood) hood.setAttribute('fill', shadeColor(conf.shirtColor, -30));

        // Pocket
        const pocket = svg.querySelector('rect[rx="8"][y="285"]');
        if (pocket) pocket.setAttribute('fill', shadeColor(conf.shirtColor, -30));

        // ---- Hoodie Chest Graphic ----
        const allGraphics = ['graphic-pumpkin', 'graphic-heart', 'graphic-wave', 'graphic-star'];
        allGraphics.forEach(gid => {
            const g = svg.querySelector('#' + gid);
            if (g) g.setAttribute('opacity', (conf.hoodieGraphic && gid === 'graphic-' + conf.hoodieGraphic) ? '1' : '0');
        });

        // ---- Pants ----
        const pantsSizes = SVG_PANTS[conf.pantsStyle || 'shorts'];
        const pantsLeft  = svg.querySelector('#pants-left');
        const pantsRight = svg.querySelector('#pants-right');
        const hemLeft    = svg.querySelector('#hem-left');
        const hemRight   = svg.querySelector('#hem-right');
        if (pantsLeft && pantsRight && pantsSizes) {
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

        // ---- Glasses ----
        const glasses = svg.querySelector('#avatar-glasses');
        if (glasses) {
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
        const exp = SVG_EXPRESSIONS[conf.expression] || SVG_EXPRESSIONS.friendly;
        if (leftBrow)  leftBrow.setAttribute('d', exp.leftBrow);
        if (rightBrow) rightBrow.setAttribute('d', exp.rightBrow);
        if (mouth && !svg.classList.contains('speaking-now')) {
            mouth.setAttribute('d', exp.mouth);
        }
        if (teeth) teeth.setAttribute('opacity', exp.teethOpacity || 0);

        // ---- Glow colors via CSS variables on the SVG ----
        svg.style.setProperty('--glow-color-1', conf.glowColor1);
        svg.style.setProperty('--glow-color-2', conf.glowColor2);
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
        document.documentElement.style.setProperty('--hair-color', conf.hairColor);
        document.documentElement.style.setProperty('--shirt-color', conf.shirtColor);
        document.documentElement.style.setProperty('--glow-color-1', conf.glowColor1);
        document.documentElement.style.setProperty('--glow-color-2', conf.glowColor2);

        // Apply to both the main chat avatar and the studio preview
        const mainSVG   = document.getElementById('mindbuddy-svg');
        const studioSVG = document.getElementById('mindbuddy-studio-svg');
        applyAvatarToSVG(mainSVG, conf);
        applyAvatarToSVG(studioSVG, conf);

        // Update expression badge label
        DOM.avatarExpressionLabel.innerText = conf.expression.charAt(0).toUpperCase() + conf.expression.slice(1);

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
    const GEMINI_API_KEY = window.GEMINI_API_KEY || '';
    const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Track conversation history for context-aware responses
    const conversationHistory = [];

    async function analyzeWithGemini(studentText) {
        // Add the student message to history
        conversationHistory.push({ role: 'user', parts: [{ text: studentText }] });

        const systemPrompt = `You are MindBuddy, an empathetic, warm, peer-like AI companion for students.
Your personality: supportive, non-judgmental, casual and friendly — never clinical or robotic.
Your responses should feel like talking to a caring, understanding friend who happens to be very emotionally intelligent.

When responding, you must:
1. Respond conversationally and warmly to the student's message (2-4 sentences max for chat)
2. At the END of your response, append a JSON block (wrapped in triple backticks) with this exact format:
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

Keep your conversational reply warm, human and concise. The student should feel heard and understood.`;

        const requestBody = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: conversationHistory,
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 400
            }
        };

        try {
            const response = await fetch(GEMINI_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const data = await response.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse out the JSON analytics block
            const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/);
            let analytics = null;
            let replyText = rawText.replace(/```json[\s\S]*?```/, '').trim();

            if (jsonMatch) {
                try { analytics = JSON.parse(jsonMatch[1]); } catch (e) { console.warn('Analytics JSON parse failed', e); }
            }

            // Add Gemini's response to conversation history
            conversationHistory.push({ role: 'model', parts: [{ text: replyText }] });

            return { reply: replyText, analytics };
        } catch (err) {
            console.error('Gemini API call failed:', err);
            return null; // falls back to local analysis
        }
    }

    async function processStudentMessage(text) {
        // 1. Display student message
        appendChatMessage('Student', text);

        // 2. Crisis keyword check (runs locally for safety — never wait on API for this)
        const crisisWords = ["harm myself", "kill myself", "suicide", "end my life", "slit", "cut myself", "overdose", "want to die"];
        if (crisisWords.some(w => text.toLowerCase().includes(w))) {
            triggerSafetyProtocol();
            return;
        }

        // 3. Show typing indicator
        const typingId = showTypingIndicator();

        // 4. Try Gemini first; fall back to local if no API key or error
        let reply = '';
        let companionExpression = 'friendly';

        if (GEMINI_API_KEY) {
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
        speakResponse(reply);
    }

    function generateLocalReply() {
        if (state.diagnostics.burnout > 60 || state.diagnostics.academicPressure > 60)
            return getRandomElement(EmpatheticDB.stressBurnout);
        if (state.diagnostics.academicPressure > 50)
            return getRandomElement(EmpatheticDB.stressAcademic);
        if (state.diagnostics.socialAnxiety > 50 || state.diagnostics.loneliness > 50)
            return getRandomElement(EmpatheticDB.stressSocial);
        if (state.diagnostics.loneliness > 40)
            return getRandomElement(EmpatheticDB.stressLoneliness);
        return getRandomElement(EmpatheticDB.defaultCalm);
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
        const sentVal = DOM.statusSentiment.querySelector('.metric-value');
        sentVal.className = `metric-value ${state.diagnostics.sentiment.toLowerCase()}`;
        
        let icon = 'smile';
        if (state.diagnostics.sentiment === 'Negative') icon = 'frown';
        if (state.diagnostics.sentiment === 'Neutral') icon = 'meh';

        sentVal.innerHTML = `<i data-lucide="${icon}"></i> ${state.diagnostics.sentiment}`;

        // Stress Level Badge
        const stressVal = DOM.statusStress.querySelector('.metric-value');
        stressVal.className = `metric-value ${state.diagnostics.stressLevel.toLowerCase()}`;
        stressVal.innerText = state.diagnostics.stressLevel;

        // Mini trends
        DOM.miniMoodTrend.innerText = state.diagnostics.stressLevel === 'High' ? 'Elevated' : 'Stable';
        if (state.diagnostics.stressLevel === 'High') {
            DOM.miniMoodTrend.className = 'mini-val text-rose';
        } else {
            DOM.miniMoodTrend.className = 'mini-val text-mint';
        }

        lucide.createIcons();
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
    // Cache the preferred voice after voices load
    let _selectedVoice = null;

    function loadFemaleVoice() {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return null;

        // Priority list — most natural/female-sounding voices across browsers
        const FEMALE_PRIORITY = [
            'Google UK English Female',
            'Microsoft Aria Online (Natural) - English (United States)',
            'Microsoft Aria - English (United States)',
            'Microsoft Jenny Online (Natural) - English (United States)',
            'Microsoft Jenny - English (United States)',
            'Microsoft Zira - English (United States)',
            'Samantha',          // macOS
            'Karen',             // macOS Australian
            'Moira',             // macOS Irish
            'Google US English', // generic Google female
        ];

        for (const name of FEMALE_PRIORITY) {
            const v = voices.find(v => v.name === name);
            if (v) return v;
        }

        // Fallback: pick any voice whose name contains 'female' or whose lang starts with 'en'
        return (
            voices.find(v => v.name.toLowerCase().includes('female')) ||
            voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male')) ||
            voices[0]
        );
    }

    // Voices may not be available synchronously on first load
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
            _selectedVoice = loadFemaleVoice();
        };
        // Also attempt immediately (works in Firefox & Safari)
        _selectedVoice = loadFemaleVoice();
    }

    function speakResponse(text) {
        // Duration estimation for animation: ~60ms per character at natural speech rate
        const animationDuration = Math.max(1500, text.length * 60);
        triggerAvatarSpeechSpeak(animationDuration);

        // Update active speech bubble text overlay
        const bubble = document.getElementById('avatar-speech-bubble');
        if (bubble) bubble.innerHTML = `<span>${text}</span>`;

        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate  = 0.95;  // Slightly slower than default — warm, unhurried pace
        utterance.pitch = 1.15;  // Slightly higher — soft feminine register
        utterance.volume = 1.0;

        // Assign cached voice (re-fetch if not yet loaded)
        if (!_selectedVoice) _selectedVoice = loadFemaleVoice();
        if (_selectedVoice) utterance.voice = _selectedVoice;

        // Small delay avoids Chrome's speech-queue bug where first utterance is clipped
        setTimeout(() => window.speechSynthesis.speak(utterance), 80);
    }

    // ----------------------------------------------------------------------
    // SAFETY PROTOCOL TRIGGERS (Core Operating Rule 3)
    // ----------------------------------------------------------------------
    function triggerSafetyProtocol() {
        // 1. Alert user directly with counselor dispatch overlay
        DOM.sosModal.classList.remove('hidden');
        
        // 2. Play warm emergency dialogue
        const safeText = "Hey, I'm listening. Please hear me: you don't have to go through this alone. I want to keep you safe, and there are human professionals who care deeply and can support you right now. I've brought up their phone numbers on your screen. Please reach out to them immediately.";
        speakResponse(safeText);
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

        const summaryResponse = `I processed your rant. I hear that you're going through a lot. Specifically, ${pauseAssessment}, and you spoke at ${speedAssessment}. Getting those words out is an excellent step to unpack stress. I'm right here with you. What would you like to focus on next?`;
        
        appendChatMessage('Buddy', `🎤 **Vocal Rant Report:** You vented for ${state.diagnostics.lastRantDuration}. Here's my response to your speech:`);
        appendChatMessage('Buddy', summaryResponse);
        speakResponse(summaryResponse);

        // Adjust overall diagnostics
        state.diagnostics.burnout = Math.min(100, Math.max(10, state.diagnostics.burnout - 10)); // catharsis relief reduction
        state.diagnostics.loneliness = Math.min(100, Math.max(10, state.diagnostics.loneliness - 8));
        evaluateTextDiagnostics(transcriptText);
    }

    // ----------------------------------------------------------------------
    // FACE SCANNER (CAM ANALYSIS HUD OVERLAY)
    // ----------------------------------------------------------------------
    function startWebcamAnalyzer() {
        if (state.webcam.isActive) return;

        // Show overlay immediately so user sees we're attempting to connect
        DOM.webcamOverlay.classList.remove('hidden');
        DOM.camToggleBtn.classList.add('active');

        navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
            .then(stream => {
                state.webcam.stream = stream;
                state.webcam.isActive = true;
                DOM.webcamElement.srcObject = stream;

                // Start visual overlay tracking loop
                drawFaceScannerHUD();
                showToast("Webcam face metrics activated.", "success");
            })
            .catch(err => {
                console.error("Camera access failed", err);
                // Overlay is already visible — user can still close it with × button
                // Mark inactive so stop() doesn't skip
                state.webcam.isActive = true; // trick: lets stopWebcamAnalyzer clean up
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
        const tensionVal = 20 + Math.sin(Date.now() * 0.003) * 6 + (state.diagnostics.stressLevel === 'High' ? 40 : 0);
        DOM.camMetricTension.style.width = `${tensionVal}%`;
        
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
    }

    function stopWebcamAnalyzer() {
        // Always hide the overlay, regardless of whether the stream started
        DOM.webcamOverlay.classList.add('hidden');
        DOM.camToggleBtn.classList.remove('active');

        if (!state.webcam.isActive) return;

        state.webcam.isActive = false;
        cancelAnimationFrame(state.webcam.animationFrame);
        
        if (state.webcam.stream) {
            state.webcam.stream.getTracks().forEach(track => track.stop());
            state.webcam.stream = null;
        }

        showToast("Webcam face metrics stopped.", "info");
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

        DOM.bioLiveHR.innerText = `${activeHR} bpm`;

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

        DOM.hrChartPath.setAttribute('d', pathD);

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
            DOM.iotSyncStatus.innerText = "Panic Linked";
            DOM.iotSyncStatus.className = "sync-badge status-anomalous";
            
            // Adjust stress levels behind the scenes
            state.diagnostics.burnout = Math.max(75, state.diagnostics.burnout);
            state.diagnostics.stressLevel = "High";
        } else if (hr > 100) {
            hasAnomaly = true;
            warningTitle = "Autonomic Tension: Elevated Pulse";
            warningDesc = "A resting pulse rate above 100 BPM indicates sudden panic, physiological flight response, or cognitive anxiety spikes.";
            DOM.iotSyncStatus.innerText = "Tension Linked";
            DOM.iotSyncStatus.className = "sync-badge status-anomalous";
            
            state.diagnostics.socialAnxiety = Math.max(65, state.diagnostics.socialAnxiety);
        } else if (sleep < 5.5) {
            hasAnomaly = true;
            warningTitle = "Cognitive Deficit: Sleep Deprivation";
            warningDesc = "Fewer than 5.5 hours of rest drastically reduces resilience to emotional triggers, triggering immediate fatigue warnings.";
            DOM.iotSyncStatus.innerText = "Fatigue Linked";
            DOM.iotSyncStatus.className = "sync-badge status-anomalous";
            
            state.diagnostics.burnout = Math.max(70, state.diagnostics.burnout);
        } else {
            DOM.iotSyncStatus.innerHTML = '<i data-lucide="check-circle"></i> Linked';
            DOM.iotSyncStatus.className = "sync-badge status-connected";
            lucide.createIcons();
        }

        // Apply visual classes to alert banner
        if (hasAnomaly) {
            DOM.anomalyBanner.className = "biometric-alert-banner alert-warning";
            DOM.anomalyIcon.setAttribute('data-lucide', 'alert-triangle');
            
            // Proactively prompt conversation change if high stress
            if (state.diagnostics.stressLevel === 'High') {
                state.avatar.expression = 'attentive';
                renderAvatarVisuals();
            }
        } else {
            DOM.anomalyBanner.className = "biometric-alert-banner alert-normal";
            DOM.anomalyIcon.setAttribute('data-lucide', 'info');
        }

        DOM.anomalyTitle.innerText = warningTitle;
        DOM.anomalyDesc.innerText = warningDesc;
        lucide.createIcons();
        
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
        state.quiz.activeCategory = selectedCategory;
        state.quiz.questions = data.questions;

        DOM.quizRecBadge.innerText = data.badge;
        DOM.quizRecTitle.innerText = data.title;
        DOM.quizIntroState.querySelector('p').innerText = data.desc;
    }

    function startQuizSession() {
        state.quiz.currentQuestionIdx = 0;
        state.quiz.answers = [];

        DOM.quizIntroState.classList.add('hidden');
        DOM.quizResultsState.classList.add('hidden');
        DOM.quizActiveState.classList.remove('hidden');

        renderQuizQuestion();
    }

    function renderQuizQuestion() {
        const idx = state.quiz.currentQuestionIdx;
        const qList = state.quiz.questions;
        const qData = qList[idx];

        DOM.quizQCounter.innerText = `Question ${idx + 1} of ${qList.length}`;
        DOM.quizProgressFill.style.width = `${((idx + 1) / qList.length) * 100}%`;
        DOM.quizQuestionTitle.innerText = qData.q;

        DOM.quizOptionsContainer.innerHTML = '';
        qData.options.forEach((opt, oIdx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt-btn';
            btn.innerText = opt.text;
            btn.addEventListener('click', () => handleQuizAnswer(opt.score));
            DOM.quizOptionsContainer.appendChild(btn);
        });
    }

    function handleQuizAnswer(score) {
        state.quiz.answers.push(score);
        state.quiz.currentQuestionIdx++;

        if (state.quiz.currentQuestionIdx < state.quiz.questions.length) {
            renderQuizQuestion();
        } else {
            showQuizResults();
        }
    }

    function showQuizResults() {
        DOM.quizActiveState.classList.add('hidden');
        DOM.quizResultsState.classList.remove('hidden');

        // Tabulate results and choose avatar response modifier
        let counts = { Friendly: 0, Thoughtful: 0, Attentive: 0 };
        state.quiz.answers.forEach(val => {
            if (counts[val] !== undefined) counts[val]++;
        });

        let dominantExpression = 'friendly';
        let feedbackMessage = "Excellent work checking in with your mind. Taking a moment to trace how your body and thoughts are behaving is a core mindfulness skill. I've adjusted my active presence to match your state.";

        if (counts.Attentive > counts.Friendly && counts.Attentive > counts.Thoughtful) {
            dominantExpression = 'attentive';
            feedbackMessage = "Your alignment check suggests you are carrying notable tension. Let's focus on calming down. Try toggling on the Pink Rain or Binaural Beats mixers below to ground your focus.";
        } else if (counts.Thoughtful > counts.Friendly) {
            dominantExpression = 'thoughtful';
            feedbackMessage = "Your answers reflect deep analytical thoughts, likely reflecting school or task pressure. Allow yourself permission to step back from goals for just one hour tonight. I'm right here with you.";
        }

        // Apply updated expression
        state.avatar.expression = dominantExpression;
        renderAvatarVisuals();
        
        DOM.quizResultFeedback.innerText = feedbackMessage;
        showToast("Wellness Check-in Complete.", "success");
    }

    // ----------------------------------------------------------------------
    // UI EVENT BINDINGS
    // ----------------------------------------------------------------------
    function bindUIEvents() {
        // Chat Actions
        DOM.chatSendBtn.addEventListener('click', handleChatTextSubmit);
        DOM.chatTextInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatTextSubmit();
            }
        });

        // Rant microphone button toggles
        DOM.rantStartBtn.addEventListener('click', startRantSession);
        DOM.rantStopBtn.addEventListener('click', stopRantSession);

        // Webcam toggles
        DOM.camToggleBtn.addEventListener('click', () => {
            if (state.webcam.isActive) {
                stopWebcamAnalyzer();
            } else {
                startWebcamAnalyzer();
            }
        });
        DOM.closeCamBtn.addEventListener('click', stopWebcamAnalyzer);

        // Studio Designer events
        const selectBtns = document.querySelectorAll('.selection-grid .select-btn');
        selectBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const prop = btn.getAttribute('data-avatar-prop');
                const val = btn.getAttribute('data-val');

                state.avatar[prop] = val;
                
                // Toggle active state in sibling button group
                const row = btn.closest('.selection-grid');
                row.querySelectorAll('.select-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                renderAvatarVisuals();
            });
        });

        // Studio Designer Color Pickers
        DOM.pickerHair.addEventListener('input', (e) => {
            state.avatar.hairColor = e.target.value;
            renderAvatarVisuals();
        });
        DOM.pickerShirt.addEventListener('input', (e) => {
            state.avatar.shirtColor = e.target.value;
            renderAvatarVisuals();
        });
        DOM.pickerGlow1.addEventListener('input', (e) => {
            state.avatar.glowColor1 = e.target.value;
            renderAvatarVisuals();
        });
        DOM.pickerGlow2.addEventListener('input', (e) => {
            state.avatar.glowColor2 = e.target.value;
            renderAvatarVisuals();
        });

        // Studio Swapping subtabs
        DOM.studioTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.studioTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const target = btn.getAttribute('data-opt-group');
                DOM.studioPanelGroups.forEach(g => {
                    g.classList.remove('active');
                    if (g.id === `opt-${target}`) {
                        g.classList.add('active');
                    }
                });
            });
        });

        // Avatar Randomizer Dice
        DOM.avatarRandomizeBtn.addEventListener('click', randomizeAvatarConfig);

        // IoT Biometrics controls
        DOM.sliderHR.addEventListener('input', (e) => {
            const hr = parseInt(e.target.value);
            state.biometrics.heartRate = hr;
            DOM.bubbleHR.innerText = `${hr} BPM`;
            evaluateIoTBiometricState();
        });

        DOM.sliderSleep.addEventListener('input', (e) => {
            const hrs = parseFloat(e.target.value);
            state.biometrics.sleepDuration = hrs;
            DOM.bubbleSleep.innerText = `${hrs} Hrs`;
            
            // Recompute values
            DOM.bioSleepDuration.innerText = `${hrs} hrs`;
            // estimate Deep sleep as 25% of total
            const deep = (hrs * 0.26).toFixed(1);
            DOM.bioSleepDeep.innerText = `${deep} hrs`;
            
            // Efficiency formula (lower sleep, lower efficiency)
            const eff = Math.min(100, Math.round(75 + (hrs / 8) * 20));
            DOM.bioSleepEfficiency.innerText = `${eff}%`;

            evaluateIoTBiometricState();
        });

        // Calm Hub Mixer Synth controls
        DOM.btnBinaural.addEventListener('click', () => {
            toggleBinauralBeats(!state.synth.binaural.isPlaying);
        });
        DOM.btnRain.addEventListener('click', () => {
            togglePinkRain(!state.synth.rain.isPlaying);
        });
        DOM.btnDrone.addEventListener('click', () => {
            toggleZenDrone(!state.synth.drone.isPlaying);
        });

        // Synth Volume adjusters
        DOM.volBinaural.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            if (state.synth.binaural.gain) {
                state.synth.binaural.gain.gain.setValueAtTime(vol * 0.4, state.synth.audioCtx.currentTime);
            }
        });
        DOM.volRain.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            if (state.synth.rain.gain) {
                state.synth.rain.gain.gain.setValueAtTime(vol * 0.6, state.synth.audioCtx.currentTime);
            }
        });
        DOM.volDrone.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            if (state.synth.drone.gain) {
                state.synth.drone.gain.gain.setValueAtTime(vol * 0.35, state.synth.audioCtx.currentTime);
            }
        });

        // Calm Hub Quiz buttons
        DOM.quizStartBtn.addEventListener('click', startQuizSession);
        DOM.quizRestartBtn.addEventListener('click', () => {
            updateQuizRecommendation();
            DOM.quizResultsState.classList.add('hidden');
            DOM.quizIntroState.classList.remove('hidden');
        });

        // SOS modal triggers
        DOM.sosOpenBtn.addEventListener('click', () => {
            syncSOSReportPreview();
            DOM.sosModal.classList.remove('hidden');
        });
        DOM.sosCloseBtn.addEventListener('click', () => DOM.sosModal.classList.add('hidden'));
        DOM.sosCancelBtn.addEventListener('click', () => DOM.sosModal.classList.add('hidden'));
        
        DOM.sosConfirmBtn.addEventListener('click', () => {
            DOM.sosModal.classList.add('hidden');
            showToast("Anonymized diagnostics successfully dispatched to counselor.", "success");
            appendChatMessage('Buddy', "📬 **Notification:** I've packaged and forwarded your current physiological indicators and stress indices to the counselor department. A school advisor will receive it shortly. Hang in there!");
        });
    }

    function handleChatTextSubmit() {
        const text = DOM.chatTextInput.value.trim();
        if (!text) return;

        DOM.chatTextInput.value = "";
        processStudentMessage(text);
    }

    function randomizeAvatarConfig() {
        const hairOptions = ['crop', 'curly', 'bob', 'long', 'bald'];
        const shirtOptions = ['hoodie', 'tshirt', 'sweater'];
        const skinOptions  = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524'];
        const expressionOptions  = ['friendly', 'thoughtful', 'attentive', 'excited'];
        const glassesOptions     = ['none', 'green', 'gold'];
        const accOptions         = ['none', 'headphones'];
        const graphicOptions     = ['none', 'pumpkin', 'heart', 'wave', 'star'];
        const pantsOptions       = ['shorts', 'cargo', 'jogger'];

        state.avatar.hairStyle    = getRandomElement(hairOptions);
        state.avatar.shirtStyle   = getRandomElement(shirtOptions);
        state.avatar.skinTone     = getRandomElement(skinOptions);
        state.avatar.expression   = getRandomElement(expressionOptions);
        state.avatar.glasses      = getRandomElement(glassesOptions);
        state.avatar.accessories  = getRandomElement(accOptions);
        state.avatar.hoodieGraphic = getRandomElement(graphicOptions);
        state.avatar.pantsStyle   = getRandomElement(pantsOptions);

        state.avatar.hairColor   = getRandomHexColor();
        state.avatar.shirtColor  = getRandomHexColor();
        state.avatar.glowColor1  = getRandomHexColor();
        state.avatar.glowColor2  = getRandomHexColor();

        DOM.pickerHair.value   = state.avatar.hairColor;
        DOM.pickerShirt.value  = state.avatar.shirtColor;
        DOM.pickerGlow1.value  = state.avatar.glowColor1;
        DOM.pickerGlow2.value  = state.avatar.glowColor2;

        // Sync active class selections on designer studio grids
        syncSelectorActiveStates();
        
        renderAvatarVisuals();
        showToast("MindBuddy randomized!", "success");
    }

    function syncSelectorActiveStates() {
        const selectBtns = document.querySelectorAll('.selection-grid .select-btn');
        selectBtns.forEach(btn => {
            const prop = btn.getAttribute('data-avatar-prop');
            const val = btn.getAttribute('data-val');
            
            if (state.avatar[prop] === val) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
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

    // Run launcher
    init();
});
