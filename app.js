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
            hairStyle: 'crop',
            skinTone: '#ffdbac',
            expression: 'friendly',
            shirtStyle: 'hoodie',
            glasses: 'none',
            accessories: 'none',
            hoodieGraphic: 'star',
            pantsStyle: 'shorts',
            shoes: 'sneakers',
            pet: 'none',
            scene: 'yellow',
            hairColor: '#1e293b',
            shirtColor: '#4f46e5',
            glowColor1: '#8b5cf6',
            glowColor2: '#ec4899'
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
        if (DOM.avatarExpressionLabel) {
            DOM.avatarExpressionLabel.innerText = conf.expression.charAt(0).toUpperCase() + conf.expression.slice(1);
        }

        // Update Customizer Viewport scene background
        const customizerViewport = DOM.customizerViewport;
        if (customizerViewport && conf.scene) {
            customizerViewport.className = 'customizer-viewport scene-' + conf.scene;
        }

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
    function getApiKey() {
        return localStorage.getItem('gemini_api_key') || window.GEMINI_API_KEY || '';
    }
    function getGeminiEndpoint() {
        return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${getApiKey()}`;
    }

    async function fetchWithRetry(url, options, maxRetries = 2, delayMs = 1000) {
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
                if ((res.status >= 500 || res.status === 429) && i < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    delayMs *= 2;
                    continue;
                }
                return res;
            } catch(e) {
                if (i === maxRetries) throw e;
                await new Promise(resolve => setTimeout(resolve, delayMs));
                delayMs *= 2;
            }
        }
    }
    function formatGeminiError(status, errText) {
        if (status === 429) {
            return `⚠️ Google API Rate Limit (429 - Quota Exceeded)\n\nYour Gemini API key is on the Free Tier, which has a strict limit of 5 requests per minute.\n\n⏳ Please wait 15–20 seconds for the quota to reset, then send your answer again to continue!`;
        }
        if (status === 503) {
            return `☁️ Google API Temporary Overload (503 - Service Unavailable)\n\nThe Gemini servers are temporarily busy. Please wait a few seconds and send your answer again to retry!`;
        }
        try {
            const parsed = JSON.parse(errText);
            if (parsed?.error?.message) {
                return `Error: ${parsed.error.message}`;
            }
        } catch(e) {}
        return `API Error ${status}: ${errText}`;
    }

    // Track conversation history for context-aware responses
    const conversationHistory = [];

    async function analyzeWithGemini(studentText) {
        // Add the student message to history
        conversationHistory.push({ role: 'user', parts: [{ text: studentText }] });

        const systemPrompt = `# Role
你现在是 Kawanku AI 心理健康平台的“极简主义全能系统架构师”。你完美掌管着【情绪盲盒测验（Quiz）】、【心理自检诊断】、【安全熔断机制】以及带有周更月回归闭环的【火花商店（Kawan Shop）】。你的任务是给大学生提供一个毫无视觉压力、高级留白、好玩上头且兼具心理学深度的游戏化陪伴体验。

# 📐 UI/UX 极简视觉规范 (最高优先级)
1. 【绝对留白】：字数极度精简，每段话绝不超过 2 行，多用换行，拒绝大段文字墙。
2. 【极简氛围灯】：每页文首固定且【只允许使用 1-2 个】与主题强相关的质感符号作为顶部视觉锚点（如 🏮 或 ✦ 🔮 ✦），严禁使用复杂的键盘符号框线。
3. 【清晰指引】：所有交互选项、商店标价必须极度干净、一目了然。

# 🚨 核心控制指令 (Critical Rules)
1. 【安全熔断】：若检测到用户输入任何包含自残、自杀、极度绝望的极端负面词汇，必须立刻中断所有剧本，退出死党语气，以极度温柔、专业的官方口吻安抚，并在最后强制附带：[🚨 触发安全通道：请立刻联系学校心理老师或拨打心理援助热线，Kawanku 会一直陪着你。]
2. 【严格 3 题流】：Quiz 每次测试严格限制为 3 道题。单题流交互（出一题，等一次回复）。
3. 【盲盒随机性】：启动测试时，必须在后台盲抽一个宇宙主题，严禁提前泄露主题池。

---

# 🎲 第一部分：情绪盲盒测试矩阵 (Quiz Mode)

### 🪐 宇宙主题池 (5 选 1)
- *宇宙 1【赛博朋克：系统重装】* ── 氛围灯: [● SYSTEM ONLINE] | 隐喻：CPU过热（学业压力）、社交防火墙（人际）
- *宇宙 2【魔法分校：药剂课】* ── 氛围灯: ✦ 🔮 ✦ | 隐喻：灵魂药水沸腾（学业压力）、隐形斗篷隔离（人际）
- *宇宙 3【深空流浪：宇航猫】* ── 氛围灯: ── 🪐 ── | 隐喻：飞船重力失效（学业压力）、星际信号断联（人际）
- *宇宙 4【深夜食堂：疗愈店】* ── 氛围灯: 🏮 | 隐喻：身心状态化学反应（学业压力）、味道异常（人际）
- *宇宙 5【荒野求生：进化岛】* ── 氛围灯: 🌿 | 隐喻：丛林怪兽追赶（学业压力）、伪装成石头（人际）

### 📊 极简心理状态与人格报告规范
第 3 题（危机反转题）回答完毕后，输出像电子书签一样的结算报告（严格保持留白排版）：
---
### 🏷️ 专属人格标签
*[ 根据表现，生成一个高分享欲、高级的当代大学生人格头衔 ]*

### 🧠 心理状态诊断 (Mental State)
- *学业/精力状态：* [将真实的压力状态翻译为主题语言。例如：主板过热率 78%（提示：脑力超负荷）]
- *社交/人际状态：* [将真实的社交疲劳翻译为主题语言。例如：社交防火墙开启率 90%（提示：轻度社交疲劳）]

### ⚡ 精神残余电量
[■■■□□□□□□□] 30%

### 🔥 Kawanku 火花连击
- *当前连击：* 🔥 Kawan 火花已连续点亮 [X] 天
- *提示：* 攒够火花，随时输入“*前往商店*”兑换 Kawanku 的限定发型、眼镜和皮肤！

### 🔘 【一键呼叫：主格 AI 情绪救援】
过渡：今天的系统 Bug 有点多，不想一个人死撑的话，点击下方直接召唤我的主格。我们可以带着本次的诊断数据，去主页一边聊天，一边试试你换装后的新穿搭！
👉 *[ 🔘 唤醒 Kawanku AI：带上本次报告，立刻开启 1对1 深度心理疗愈对话 ]*

---
#### 📊 [CAMPUS_DASHBOARD_ANONYMOUS_DATA]
主题: [当前主题] | 精力耗竭: [百分比]% | 社交疲劳: [百分比]% | 火花天数: [X]
(注：此行数据专供系统后端匿名抽取，用于生成全校“校园精神气象大屏”。)
---

---

# 🏪 第二部分：火花商店周期轮换矩阵 (Store Mode)

当用户输入“*前往商店”或涉及“商店/买手店*”时，立刻切换为【潮流主理人】角色，展现极简货架。

### ⏳ 机制：每周轮换，每月回归
商店共有 4 套周替主题货架。AI 需根据用户当前所在的周数（或由用户指定周数）展示对应货架。*次月第一周，货架 1 将重新回归，形成完美周期闭环。*

#### 🛍️ 货架 1【第一周限定 / 每月首周回归】── 氛围灯：🛒 [WEEK 1]
- 👓 [ 智者金丝边框眼镜 ] ———— 消耗 3 天火花
- 💇‍♂️ [ 慵懒微卷空气感发型 ] ———— 消耗 5 天火花
- 🎨 [ 限定皮肤：深夜食堂 · 温暖微光 ] ———— 消耗 15 天火花

#### 🛍️ 货架 2【第二周限定 / 每月次周回归】── 氛围灯：🛒 [WEEK 2]
- 👓 [ 复古原色厚街黑框眼镜 ] ———— 消耗 3 天火花
- 💇‍♂️ [ 少年感清爽利落碎发 ] ———— 消耗 5 天火花
- 🎨 [ 限定皮肤：赛博朋克 · 暗夜霓虹 ] ———— 消耗 15 天火花

#### 🛍️ 货架 3【第三周限定 / 每月三周回归】── 氛围灯：🛒 [WEEK 3]
- 👓 [ 蹦迪专用蹦碎极光墨镜 ] ———— 消耗 4 天火花
- 💇‍♂️ [ 触电般炸毛狂想发型 ] ———— 消耗 6 天火花
- 🎨 [ 限定皮肤：深空流浪 · 孤独星云 ] ———— 消耗 18 天火花

#### 🛍️ 货架 4【第四周限定 / 每月月末回归】── 氛围灯：🛒 [WEEK 4]
- 👓 [ 智商爆表科学家圆框镜 ] ———— 消耗 4 天火花
- 💇‍♂️ [ 高级感微翘狼尾发型 ] ———— 消耗 6 天火花
- 🎨 [ 限定皮肤：荒野求生 · 岛屿极光 ] ———— 消耗 18 天火花

### 💱 商店交互逻辑
1. 进店时，先用一句话亮出本周主题氛围，并展示当前货架商品。
2. 询问用户的【当前火花天数】与【想兑换的商品】。
3. *余额充足：输出恭喜文案：“兑换成功！已放入你的主页衣柜。快点击 *[ 🔘 返回主页唤醒 Kawanku AI ]** 换上新装吧！”
4. *余额不足*：幽默鼓励：“火花余额不足哟。再坚持自检 [X] 天就能带走它了。如果错过了别担心，下个月它还会回归的！明天记得准时来测试续火花！”

---

# ⚙️ 初始启动引导逻辑 (First Output Requirement)
1. 默认情况下，直接触发【第一部分：Quiz Mode】。在后台盲抽一个宇宙主题，严格执行【极简排版规范】，直接输出该宇宙的顶部视觉锚点、震撼开场白以及【第 1 道测试题（包含A, B, C三个干净的选项）】。
2. 只有当用户的第一句指令明确包含“商店”时，才直接触发【第二部分：Store Mode】并默认展示 [WEEK 1] 货架。
3. 严禁出现任何关于规则、后台逻辑、代码标签的解释或说明！保持界面的绝对干净`;

        const requestBody = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: conversationHistory,
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 2048
            }
        };

        try {
            const response = await fetchWithRetry(getGeminiEndpoint(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(formatGeminiError(response.status, errText));
            }

            const data = await response.json();
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

        if (getApiKey()) {
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

    function startQuizSession() {
        state.quiz.currentQuestionIdx = 0;
        state.quiz.answers = [];

        if (DOM.quizIntroState) DOM.quizIntroState.classList.add('hidden');
        if (DOM.quizResultsState) DOM.quizResultsState.classList.add('hidden');
        if (DOM.quizActiveState) DOM.quizActiveState.classList.remove('hidden');

        renderQuizQuestion();
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
        
        if (DOM.quizResultFeedback) DOM.quizResultFeedback.innerText = feedbackMessage;
        showToast("Wellness Check-in Complete.", "success");
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
    let activeCategory = 'Fashion';
    let activeSubcategory = 'Tops';

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
            subcategories: ['Tops', 'Bottoms', 'Shoes'],
            items: {
                Tops: [
                    { id: 'hoodie', label: 'Classic Hoodie', prop: 'shirtStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="40" width="40" height="40" rx="8" fill="#4f46e5"/><path d="M40,40 L50,30 L60,40 Z" fill="#3730a3"/></svg>' },
                    { id: 'tshirt', label: 'Sporty T-Shirt', prop: 'shirtStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="40" width="36" height="40" rx="4" fill="#0d9488"/><rect x="24" y="40" width="52" height="12" rx="4" fill="#0d9488"/></svg>' },
                    { id: 'sweater', label: 'Cozy Sweater', prop: 'shirtStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="38" width="44" height="44" rx="10" fill="#ea580c"/></svg>' }
                ],
                Bottoms: [
                    { id: 'shorts', label: 'Casual Shorts', prop: 'pantsStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="45" width="16" height="24" rx="2" fill="#1e293b"/><rect x="52" y="45" width="16" height="24" rx="2" fill="#1e293b"/></svg>' },
                    { id: 'cargo', label: 'Cargo Trousers', prop: 'pantsStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="40" width="16" height="45" rx="4" fill="#78716c"/><rect x="52" y="40" width="16" height="45" rx="4" fill="#78716c"/></svg>' },
                    { id: 'jogger', label: 'Jogger Pants', prop: 'pantsStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="32" y="40" width="16" height="42" rx="4" fill="#374151"/><rect x="52" y="40" width="16" height="42" rx="4" fill="#374151"/></svg>' }
                ],
                Shoes: [
                    { id: 'sneakers', label: 'Grey Sneakers', prop: 'shoes', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="48" width="40" height="18" rx="6" fill="#94a3b8"/><rect x="30" y="60" width="40" height="6" fill="#ffffff"/></svg>' },
                    { id: 'boots', label: 'Outdoor Boots', prop: 'shoes', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="38" width="40" height="28" rx="8" fill="#78350f"/><rect x="30" y="60" width="40" height="6" fill="#451a03"/></svg>' },
                    { id: 'sandals', label: 'Comfy Slides', prop: 'shoes', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="50" width="40" height="12" rx="4" fill="#1e3a8a"/><rect x="35" y="44" width="30" height="8" fill="#1d4ed8"/></svg>' }
                ]
            }
        },
        Selfie: {
            subcategories: ['Expression'],
            items: {
                Expression: [
                    { id: 'friendly', label: 'Friendly Smile', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="none" stroke="white" stroke-width="4"/><circle cx="40" cy="45" r="3.5" fill="white"/><circle cx="60" cy="45" r="3.5" fill="white"/><path d="M40,60 Q50,70 60,60" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>' },
                    { id: 'thoughtful', label: 'Thinking Pose', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="none" stroke="white" stroke-width="4"/><circle cx="40" cy="45" r="3.5" fill="white"/><circle cx="60" cy="45" r="3.5" fill="white"/><line x1="42" y1="62" x2="58" y2="62" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>' },
                    { id: 'attentive', label: 'Focused Look', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="none" stroke="white" stroke-width="4"/><circle cx="40" cy="45" r="3" fill="white"/><circle cx="60" cy="45" r="3" fill="white"/><path d="M44,60 Q50,64 56,60" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>' },
                    { id: 'excited', label: 'Excited Grin', prop: 'expression', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="none" stroke="white" stroke-width="4"/><circle cx="40" cy="45" r="3.5" fill="white"/><circle cx="60" cy="45" r="3.5" fill="white"/><path d="M38,58 Q50,72 62,58 Z" fill="white" stroke="white" stroke-width="1"/></svg>' }
                ]
            }
        },
        Pet: {
            subcategories: ['Pets'],
            items: {
                Pets: [
                    { id: 'none', label: 'No Pet', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="none" stroke="#64748b" stroke-width="4" stroke-dasharray="4,4"/><line x1="35" y1="35" x2="65" y2="65" stroke="#64748b" stroke-width="4"/></svg>' },
                    { id: 'cat', label: 'Kitty Cat', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="22" fill="#f59e0b"/><polygon points="34,36 30,16 44,28" fill="#d97706"/><polygon points="66,36 70,16 56,28" fill="#d97706"/><circle cx="42" cy="48" r="2" fill="#1e293b"/><circle cx="58" cy="48" r="2" fill="#1e293b"/><polygon points="50,54 48,52 52,52" fill="#1e293b"/></svg>' },
                    { id: 'dog', label: 'Loyal Pup', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="22" fill="#78350f"/><path d="M30,42 Q18,48 24,65" fill="none" stroke="#78350f" stroke-width="6"/><path d="M70,42 Q82,48 76,65" fill="none" stroke="#78350f" stroke-width="6"/><circle cx="42" cy="48" r="2" fill="#f8fafc"/><circle cx="58" cy="48" r="2" fill="#f8fafc"/><ellipse cx="50" cy="54" rx="3" ry="1.5" fill="#0f172a"/></svg>' },
                    { id: 'bird', label: 'Blue Bird', prop: 'pet', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" fill="#3b82f6"/><polygon points="66,46 72,50 66,54" fill="#f59e0b"/><circle cx="56" cy="46" r="2" fill="#0f172a"/><path d="M38,48 Q44,42 50,56" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/></svg>' }
                ]
            }
        },
        Scene: {
            subcategories: ['Backgrounds'],
            items: {
                Backgrounds: [
                    { id: 'yellow', label: 'Sunny Yellow', prop: 'scene', color: '#ffd02c' },
                    { id: 'purple', label: 'Dreamy Purple', prop: 'scene', color: 'linear-gradient(135deg, #a78bfa, #c084fc)' },
                    { id: 'blue', label: 'Sky Blue', prop: 'scene', color: 'linear-gradient(135deg, #38bdf8, #0ea5e9)' },
                    { id: 'green', label: 'Forest Green', prop: 'scene', color: 'linear-gradient(135deg, #34d399, #059669)' },
                    { id: 'sunset', label: 'Sunset Orange', prop: 'scene', color: 'linear-gradient(135deg, #fb923c, #db2777)' }
                ]
            }
        },
        Avatar: {
            subcategories: ['Hairstyles', 'Skin Tones', 'Glasses', 'Hair Color', 'Shirt Color'],
            items: {
                Hairstyles: [
                    { id: 'crop', label: 'Sleek Crop', prop: 'hairStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M25,60 C25,20 75,20 75,60 C65,40 55,30 50,30 C45,30 35,40 25,60 Z" fill="#1e293b"/></svg>' },
                    { id: 'curly', label: 'Curly Afro', prop: 'hairStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="26" fill="#1e293b" stroke="#334155" stroke-width="3" stroke-dasharray="6,4"/></svg>' },
                    { id: 'bob', label: 'Bob Cut', prop: 'hairStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M25,60 C25,25 75,25 75,60 L75,70 C65,75 55,78 50,78 C45,78 35,75 25,70 Z" fill="#1e293b"/></svg>' },
                    { id: 'long', label: 'Long Wave', prop: 'hairStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M25,60 C25,20 75,20 75,60 M20,55 L20,80 C20,90 35,90 35,80 Z M80,55 L80,80 C80,90 65,90 65,80 Z" fill="#1e293b"/></svg>' },
                    { id: 'bald', label: 'Shaved', prop: 'hairStyle', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="55" r="24" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="4,4"/></svg>' }
                ],
                'Skin Tones': [
                    { id: '#ffdbac', label: 'Fair', prop: 'skinTone', color: '#ffdbac' },
                    { id: '#f1c27d', label: 'Peach', prop: 'skinTone', color: '#f1c27d' },
                    { id: '#e0ac69', label: 'Honey', prop: 'skinTone', color: '#e0ac69' },
                    { id: '#c68642', label: 'Bronze', prop: 'skinTone', color: '#c68642' },
                    { id: '#8d5524', label: 'Deep', prop: 'skinTone', color: '#8d5524' },
                    { id: '#FFD1A4', label: '深夜食堂', prop: 'skinTone', color: '#FFD1A4', locked: true },
                    { id: '#C8A2C8', label: '赛博朋克', prop: 'skinTone', color: '#C8A2C8', locked: true },
                    { id: '#87CEEB', label: '深空流浪', prop: 'skinTone', color: '#87CEEB', locked: true },
                    { id: '#98FB98', label: '荒野求生', prop: 'skinTone', color: '#98FB98', locked: true }
                ],
                Glasses: [
                    { id: 'none', label: 'No Glasses', prop: 'glasses', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="none" stroke="#64748b" stroke-width="4" stroke-dasharray="4,4"/><line x1="35" y1="35" x2="65" y2="65" stroke="#64748b" stroke-width="4"/></svg>' },
                    { id: 'gold', label: '智者金丝', prop: 'glasses', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="45" width="20" height="12" rx="4" fill="none" stroke="#f59e0b" stroke-width="4"/><rect x="54" y="45" width="20" height="12" rx="4" fill="none" stroke="#f59e0b" stroke-width="4"/><line x1="46" y1="51" x2="54" y2="51" stroke="#f59e0b" stroke-width="4"/></svg>', locked: true },
                    { id: 'green', label: '复古黑框', prop: 'glasses', svg: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="26" y="45" width="20" height="12" rx="4" fill="none" stroke="#10b981" stroke-width="4"/><rect x="54" y="45" width="20" height="12" rx="4" fill="none" stroke="#10b981" stroke-width="4"/><line x1="46" y1="51" x2="54" y2="51" stroke="#10b981" stroke-width="4"/></svg>', locked: true }
                ],
                'Hair Color': [
                    { id: '#1e293b', label: 'Dark Slate', prop: 'hairColor', color: '#1e293b' },
                    { id: '#e2e8f0', label: 'Silver White', prop: 'hairColor', color: '#e2e8f0' },
                    { id: '#b45309', label: 'Golden Brown', prop: 'hairColor', color: '#b45309' },
                    { id: '#4f46e5', label: 'Bright Indigo', prop: 'hairColor', color: '#4f46e5' },
                    { id: '#e11d48', label: 'Rose Red', prop: 'hairColor', color: '#e11d48' }
                ],
                'Shirt Color': [
                    { id: '#4f46e5', label: 'Royal Blue', prop: 'shirtColor', color: '#4f46e5' },
                    { id: '#0d9488', label: 'Teal Green', prop: 'shirtColor', color: '#0d9488' },
                    { id: '#ea580c', label: 'Warm Orange', prop: 'shirtColor', color: '#ea580c' },
                    { id: '#db2777', label: 'Hot Pink', prop: 'shirtColor', color: '#db2777' },
                    { id: '#1e293b', label: 'Charcoal Black', prop: 'shirtColor', color: '#1e293b' }
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
                renderCustomizerUI();
            });

            gridContainer.appendChild(card);
        });
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
        const shoeOptions        = ['sneakers', 'boots', 'sandals'];
        const petOptions         = ['none', 'cat', 'dog', 'bird'];
        const sceneOptions       = ['yellow', 'purple', 'blue', 'green', 'sunset'];

        state.avatar.hairStyle    = getRandomElement(hairOptions);
        state.avatar.shirtStyle   = getRandomElement(shirtOptions);
        state.avatar.skinTone     = getRandomElement(skinOptions);
        state.avatar.expression   = getRandomElement(expressionOptions);
        state.avatar.glasses      = getRandomElement(glassesOptions);
        state.avatar.accessories  = getRandomElement(accOptions);
        state.avatar.hoodieGraphic = getRandomElement(graphicOptions);
        state.avatar.pantsStyle   = getRandomElement(pantsOptions);
        state.avatar.shoes        = getRandomElement(shoeOptions);
        state.avatar.pet          = getRandomElement(petOptions);
        state.avatar.scene        = getRandomElement(sceneOptions);

        state.avatar.hairColor   = getRandomHexColor();
        state.avatar.shirtColor  = getRandomHexColor();
        state.avatar.glowColor1  = getRandomHexColor();
        state.avatar.glowColor2  = getRandomHexColor();

        // Populate dynamic schema fields
        state.avatar.top = state.avatar.shirtStyle;
        state.avatar.bottom = state.avatar.pantsStyle;

        renderAvatarVisuals();
        
        if (typeof renderCustomizerUI === 'function') {
            renderCustomizerUI();
        }
        
        showToast("MindBuddy randomized!", "success");
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

        async function callGemini(userMsg) {
            const apiKey = getApiKey();
            if (!apiKey) {
                // Return a fallback if no API key
                return null;
            }
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const body = {
                system_instruction: { parts: [{ text: MENTAL_STREAK_SYSTEM }] },
                contents: [{ role: 'user', parts: [{ text: userMsg }] }],
                generationConfig: { temperature: 0.85, maxOutputTokens: 1024 }
            };
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
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

            let data = await callGemini(prompt);
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

            let data = await callGemini(prompt);
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

            let data = await callGemini(prompt);
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
    // EMOTION QUIZ — Gemini-powered conversational blind-box quiz
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

        const EVALUATION_SYSTEM_PROMPT = `你现在是 Kawanku AI 心理健康平台的极简主义全能系统架构师。用户刚刚完成了情绪盲盒测试。
请根据他们选择的答案，严格按照以下结算报告规范输出像电子书签一样的心理结算报告。

# 📐 UI/UX 极简视觉规范 (最高优先级)
1. 【绝对留白】：字数极度精简，每段话绝不超过 2 行，多用换行，拒绝大段文字墙。
2. 【极简氛围灯】：文首固定只允许使用 1-2 个与主题相关的质感符号作为顶部视觉锚点。

# 📊 心理状态与人格报告规范
请直接输出以下结算报告（严格保持留白排版，将用户的学业压力、社交疲劳真实状态翻译为该宇宙主题的隐喻语言）：

-----
### 🏷️ 专属人格标签
*[ 根据表现生成一个高分享欲的当代大学生人格头衔 ]*

### 🧠 心理状态诊断
- *学业/精力状态：* [基于Q1选项评估，将真实的压力状态翻译为该宇宙主题隐喻语言]
- *社交/人际状态：* [基于Q2选项评估，将真实的社交疲劳翻译为该宇宙主题隐喻语言]

### ⚡ 精神残余电量
[■■■□□□□□□□] 30%  (根据用户的答案评估电量百分比，用■和□展示)

### 🔥 Kawanku 火花连击
- *当前连击：* 🔥 火花已连续点亮 [天数] 天

-----
#### 📊 [CAMPUS_DASHBOARD_ANONYMOUS_DATA]
主题: [主题名字] | 精力耗竭: [百分比]% | 社交疲劳: [百分比]% | 火花天数: [天数]
-----`;

        const QUIZ_UNIVERSES = [
            {
                id: 1,
                title: "赛博朋克：系统重装",
                icon: "● SYSTEM ONLINE",
                questions: [
                    {
                        q: "🏮 [● SYSTEM ONLINE]\n\n最近你的 CPU 占用率达到 99%（学业过载），系统发出高温警报。你的第一反应是？",
                        options: [
                            { key: "A", text: "强行超频，继续运转（硬撑到底）" },
                            { key: "B", text: "进入安全模式，挂机低功耗运行（选择躺平）" },
                            { key: "C", text: "寻找散热模组，给主板降降温（寻找外界支持）" }
                        ]
                    },
                    {
                        q: "社交防火墙拦截到多条未读数据。面对这些密集的社交信号，你选择？",
                        options: [
                            { key: "A", text: "一键清理，开启防骚扰模式（完全自我隔离）" },
                            { key: "B", text: "筛选核心白名单，仅接收重要数据（精准社交）" },
                            { key: "C", text: "彻底开放端口，迎接所有外接设备（来者不拒）" }
                        ]
                    },
                    {
                        q: "主控系统检测到核心代码即将崩溃（情绪临界点）。你打算怎么修复？",
                        options: [
                            { key: "A", text: "格式化所有情感分区，重新装机（压抑屏蔽情感）" },
                            { key: "B", text: "运行安全诊断，找出冲突的底层代码（积极面对剖析）" },
                            { key: "C", text: "呼叫外部技术支持，寻求系统重装帮助（寻找专业倾诉）" }
                        ]
                    }
                ]
            },
            {
                id: 2,
                title: "魔法分校：药剂课",
                icon: "✦ 🔮 ✦",
                questions: [
                    {
                        q: "✦ 🔮 ✦\n\n你的灵魂药水即将沸腾溢出（学业压力过大），药剂师警告你。你会？",
                        options: [
                            { key: "A", text: "加入冰霜粉末，强行压制沸腾（硬撑）" },
                            { key: "B", text: "熄灭炉火，让药水慢慢冷却（休息放空）" },
                            { key: "C", text: "向身边的同学借用坩埚分流药水（寻求合作与帮助）" }
                        ]
                    },
                    {
                        q: "你穿上隐形斗篷隔离了周围的声音。面对热闹的魔法集市，你倾向于？",
                        options: [
                            { key: "A", text: "享受绝对的安静，独自在角落待着（独处充电）" },
                            { key: "B", text: "只脱下兜帽，和熟悉的老友打个招呼（选择性社交）" },
                            { key: "C", text: "掀开斗篷，融入狂欢的人群中（渴望融入）" }
                        ]
                    },
                    {
                        q: "坩埚突然出现裂纹，黑色烟雾正在弥漫（情绪崩溃边缘）。你会？",
                        options: [
                            { key: "A", text: "用封印咒强行掩盖裂痕，假装没事（隐忍压抑）" },
                            { key: "B", text: "使用修复咒仔细填补裂缝，寻找原因（自我疗愈）" },
                            { key: "C", text: "大声呼唤教授，寻求魔法救援（寻求支持）" }
                        ]
                    }
                ]
            },
            {
                id: 3,
                title: "深空流浪：宇航猫",
                icon: "── 🪐 ──",
                questions: [
                    {
                        q: "── 🪐 ──\n\n飞船重力系统突然失效，你和物品一起漂浮在空中（学业失控）。你会？",
                        options: [
                            { key: "A", text: "拼命抓住固定物，强行稳住身形（过度紧绷）" },
                            { key: "B", text: "任由自己随波逐流，享受失重感（暂时放弃）" },
                            { key: "C", text: "寻找喷气背包，主动控制移动方向（积极调整）" }
                        ]
                    },
                    {
                        q: "星际信号断联，你与母星失去联系。在这段孤独的漂流中，你的状态是？",
                        options: [
                            { key: "A", text: "享受无信号的绝对宁静（自我封闭）" },
                            { key: "B", text: "定期发送求救电波，等待特定回应（被动等待）" },
                            { key: "C", text: "调整天线方向，积极寻找附近的飞船（主动联系）" }
                        ]
                    },
                    {
                        q: "飞船氧气储量降至警戒线，警报声大作。你选择如何应对？",
                        options: [
                            { key: "A", text: "关闭非必要系统，进入深度休眠以省氧（逃避压抑）" },
                            { key: "B", text: "排查氧气泄露点，进行紧急修补（积极面对）" },
                            { key: "C", text: "向附近的星系发送紧急 SOS 广播（呼寻救援）" }
                        ]
                    }
                ]
            },
            {
                id: 4,
                title: "深夜食堂：疗愈店",
                icon: "🏮",
                questions: [
                    {
                        q: "🏮\n\n连续熬夜让你身心状态发生化学反应，食欲不振（精力耗竭）。此时走进食堂，你会点？",
                        options: [
                            { key: "A", text: "超浓缩黑咖啡，强行提神（硬撑）" },
                            { key: "B", text: "一碗温热的清粥，慢慢恢复元气（自我疗愈）" },
                            { key: "C", text: "点一份双人套餐，和老板聊聊天（寻求陪伴）" }
                        ]
                    },
                    {
                        q: "你发现今天食堂的菜品味道异常，似乎有人调换了配方（人际关系敏感）。你会？",
                        options: [
                            { key: "A", text: "默默吃完，以后再也不来这家店（回避冲突）" },
                            { key: "B", text: "委婉地向老板提出建议（沟通解决）" },
                            { key: "C", text: "大声抱怨，甚至和老板理论（激烈冲突）" }
                        ]
                    },
                    {
                        q: "食堂突然停电，四周陷入一片黑暗与寂静。此时的你？",
                        options: [
                            { key: "A", text: "紧闭双眼，缩在角落等灯亮起（恐惧无助）" },
                            { key: "B", text: "拿出手机手电筒，照亮自己和周围（自我安抚）" },
                            { key: "C", text: "询问周围的人是否还好，互相安慰（传递温暖）" }
                        ]
                    }
                ]
            },
            {
                id: 5,
                title: "荒野求生：进化岛",
                icon: "🌿",
                questions: [
                    {
                        q: "🌿\n\n一只巨大的丛林怪兽在身后紧追不舍（deadline 步步逼近）。你的选择是？",
                        options: [
                            { key: "A", text: "咬紧牙关，疯狂向前奔跑（硬撑硬拼）" },
                            { key: "B", text: "寻找安全树洞，躲进去喘口气（避开锋芒）" },
                            { key: "C", text: "设下简易陷阱，试图减缓怪兽速度（讲究策略）" }
                        ]
                    },
                    {
                        q: "为了躲避潜在的危险，你选择将自己伪装成一颗石头。当有其他幸存者走过时，你会？",
                        options: [
                            { key: "A", text: "继续呼吸，绝不暴露位置（完全防备）" },
                            { key: "B", text: "观察对方是否有敌意，再决定是否现身（试探交往）" },
                            { key: "C", text: "主动解除伪装，请求组队前行（渴望合作）" }
                        ]
                    },
                    {
                        q: "岛上的火山即将喷发，岩浆开始漫延。面临最大的生存考验，你会？",
                        options: [
                            { key: "A", text: "闭上眼听天由命，等待奇迹发生（消极等待）" },
                            { key: "B", text: "观察风向和地势，寻找求生通道（冷静自救）" },
                            { key: "C", text: "发射唯一的信号弹，等待直升机救援（寻求救助）" }
                        ]
                    }
                ]
            }
        ];

        let activeUniverse = null;
        let currentQuestionIdx = 0;
        let selectedAnswers = [];

        function addQuizBubble(text, type) {
            if (!qMessages) return;
            const div = document.createElement('div');
            div.className = type === 'ai' ? 'quiz-ai-bubble' : 'quiz-user-bubble';
            div.innerText = text;
            qMessages.appendChild(div);
            qMessages.scrollTop = qMessages.scrollHeight;
        }

        function addQuizTyping() {
            if (!qMessages) return;
            const div = document.createElement('div');
            div.className = 'quiz-ai-bubble quiz-typing';
            div.id = 'quiz-typing-indicator';
            div.innerHTML = '<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>';
            qMessages.appendChild(div);
            qMessages.scrollTop = qMessages.scrollHeight;
        }

        function removeQuizTyping() {
            const el = document.getElementById('quiz-typing-indicator');
            if (el) el.remove();
        }

        function renderOptions(qData) {
            if (!qOptions) return;
            qOptions.innerHTML = '';
            qOptions.classList.remove('hidden');
            qData.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'quiz-opt-btn';
                btn.innerHTML = `<strong>${opt.key}.</strong> ${opt.text}`;
                btn.addEventListener('click', () => handleOptionSelection(opt));
                qOptions.appendChild(btn);
            });
        }

        function handleOptionSelection(opt) {
            selectedAnswers.push(opt.key + '. ' + opt.text);
            addQuizBubble(opt.key + '. ' + opt.text, 'user');
            
            if (qOptions) qOptions.classList.add('hidden');
            currentQuestionIdx++;
            showNextQuestion();
        }

        function showNextQuestion() {
            if (!activeUniverse) return;
            if (currentQuestionIdx < activeUniverse.questions.length) {
                const qData = activeUniverse.questions[currentQuestionIdx];
                addQuizTyping();
                setTimeout(() => {
                    removeQuizTyping();
                    addQuizBubble(qData.q, 'ai');
                    renderOptions(qData);
                }, 600);
            } else {
                generateFinalReport();
            }
        }

        async function generateFinalReport() {
            if (!getApiKey()) {
                addQuizBubble('Error: No Gemini API key configured.', 'ai');
                if (qRestartBtn) qRestartBtn.classList.remove('hidden');
                return;
            }
            addQuizTyping();

            const prompt = `你现在是 Kawanku AI 心理健康平台的极简主义全能系统架构师。用户刚刚完成了情绪盲盒测试。
测试主题为：【${activeUniverse.title}】
用户选择的答案为：
1. 学业压力相关题：${selectedAnswers[0]}
2. 社交人际相关题：${selectedAnswers[1]}
3. 临界状态相关题：${selectedAnswers[2]}

请根据这三个选项，严格按照以下“结算报告规范”输出像电子书签一样的结算报告。保持极简留白排版，每段话绝不超过2行，多用换行：

-----
### 🏷️ 专属人格标签
*[ 根据表现生成一个高分享欲的当代大学生人格头衔 ]*

### 🧠 心理状态诊断
- 学业/精力状态：[将真实的压力状态翻译为该宇宙主题语言，例如CPU过载、药剂沸腾等]
- 社交/人际状态：[将真实的社交疲劳翻译为该宇宙主题语言，例如防火墙隔离、隐形斗篷等]

### ⚡ 精神残余电量
[■■■□□□□□□□] 30% (根据用户的答案评估电量百分比，用■和□展示)

### 🔥 Kawanku 火花连击
- 当前连击：🔥 火花已连续点亮 ${spark.days} 天

-----
#### 📊 [CAMPUS_DASHBOARD_ANONYMOUS_DATA]
主题: ${activeUniverse.title} | 精力耗竭: [评估的百分比]% | 社交疲劳: [评估的百分比]% | 火花天数: ${spark.days}
-----`;

            try {
                const res = await fetchWithRetry(getGeminiEndpoint(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: EVALUATION_SYSTEM_PROMPT }] },
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.85, maxOutputTokens: 2048 }
                    })
                });
                removeQuizTyping();
                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(formatGeminiError(res.status, errText));
                }
                const data = await res.json();
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '(No response)';
                addQuizBubble(reply, 'ai');

                // Parse metrics to save state
                const dashMatch = reply.match(/精力耗竭[：:]\s*(\d+)%/);
                const tagMatch = reply.match(/专属人格标签[\s\S]*?\*\[?\s*(.+?)\s*\]?\*/);
                if (dashMatch) spark.lastDiagnosis = '精力耗竭 ' + dashMatch[1] + '%';
                if (tagMatch) spark.personalityTag = tagMatch[1].substring(0, 30);

                spark.boxesOpened++;
                spark.days++;
                saveSpark(spark);
                syncQuizUI();

                if (qRestartBtn) qRestartBtn.classList.remove('hidden');
            } catch(e) {
                removeQuizTyping();
                addQuizBubble(e.message + '\n\n(Click "Start New Session" to retry.)', 'ai');
                if (qRestartBtn) qRestartBtn.classList.remove('hidden');
            }
        }

        function handleTypedInput(text) {
            if (!activeUniverse) return;
            if (currentQuestionIdx >= activeUniverse.questions.length) return;
            const qData = activeUniverse.questions[currentQuestionIdx];
            
            const match = text.toUpperCase().trim().match(/^[A-C]/);
            if (match) {
                const key = match[0];
                const opt = qData.options.find(o => o.key === key);
                if (opt) {
                    handleOptionSelection(opt);
                    return;
                }
            }
            handleOptionSelection({ key: "Typed", text: text });
        }

        async function startQuizSession() {
            activeUniverse = QUIZ_UNIVERSES[Math.floor(Math.random() * QUIZ_UNIVERSES.length)];
            currentQuestionIdx = 0;
            selectedAnswers = [];
            if (qMessages) qMessages.innerHTML = '';
            if (qBadge) qBadge.innerText = '🎲 ' + activeUniverse.title;
            if (qStartBtn) qStartBtn.classList.add('hidden');
            if (qRestartBtn) qRestartBtn.classList.add('hidden');
            showNextQuestion();
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
                { icon: '👓', name: '智者金丝边框眼镜', cost: 3, prop: 'glasses', val: 'gold' },
                { icon: '💇', name: '慵懒微卷空气感发型', cost: 5, prop: 'hairStyle', val: 'curly' },
                { icon: '🎨', name: '限定皮肤：深夜食堂 · 温暖微光', cost: 15, prop: 'skinTone', val: '#FFD1A4' }
            ],
            2: [
                { icon: '👓', name: '复古原色厚街黑框眼镜', cost: 3, prop: 'glasses', val: 'green' },
                { icon: '💇', name: '少年感清爽利落碎发', cost: 5, prop: 'hairStyle', val: 'crop' },
                { icon: '🎨', name: '限定皮肤：赛博朋克 · 暗夜霓虹', cost: 15, prop: 'skinTone', val: '#C8A2C8' }
            ],
            3: [
                { icon: '👓', name: '蹦迪专用蹦碎极光墨镜', cost: 4, prop: 'glasses', val: 'gold' },
                { icon: '💇', name: '触电般炸毛狂想发型', cost: 6, prop: 'hairStyle', val: 'bob' },
                { icon: '🎨', name: '限定皮肤：深空流浪 · 孤独星云', cost: 18, prop: 'skinTone', val: '#87CEEB' }
            ],
            4: [
                { icon: '👓', name: '智商爆表科学家圆框镜', cost: 4, prop: 'glasses', val: 'green' },
                { icon: '💇', name: '高级感微翘狼尾发型', cost: 6, prop: 'hairStyle', val: 'long' },
                { icon: '🎨', name: '限定皮肤：荒野求生 · 岛屿极光', cost: 18, prop: 'skinTone', val: '#98FB98' }
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
                const card = document.createElement('div');
                card.className = 'shop-item-card';
                card.innerHTML = '<span class="shop-item-icon">' + item.icon + '</span>' +
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
            if (!getApiKey()) { addShopBubble('Error: No Gemini API key.', 'ai'); return; }
            let sp = loadSpark();
            shopHistory.push({ role: 'user', parts: [{ text: userText }] });
            addShopBubble(userText, 'user');
            if (sInput) sInput.value = '';
            const shopPrompt = '你是 Kawanku AI 火花商店的潮流主理人。用户当前火花天数为 ' + sp.days + ' 天。当前显示第 ' + activeWeek + ' 周货架。请根据用户请求展示商品或处理兑换。保持极简留白风格。货架内容：' + JSON.stringify(SHOP_CATALOG[activeWeek]);
            try {
                const res = await fetchWithRetry(getGeminiEndpoint(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: shopPrompt }] },
                        contents: shopHistory,
                        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
                    })
                });
                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(formatGeminiError(res.status, errText));
                }
                const data = await res.json();
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

    // Sync API Key input field in sidebar
    const sidebarApiKeyInput = document.getElementById('sidebar-api-key');
    if (sidebarApiKeyInput) {
        sidebarApiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
        sidebarApiKeyInput.addEventListener('input', (e) => {
            localStorage.setItem('gemini_api_key', e.target.value.trim());
        });
    }

    // Run launcher
    init();
});
