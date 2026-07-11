/* ==========================================================================
   MINDBUDDY COMPANION CLIENT-SIDE LOGIC
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // GLOBAL STATE MANAGEMENT
    // ----------------------------------------------------------------------
    const state = {
        activePanel: 'chat-panel',
        
        // Sparks Economy
        sparks: 100,
        inventory: [
            'hair-crop', 'hair-curly', 'hair-bob', 'hair-bald',
            'top-hoodie', 'top-tshirt', 'top-sweater',
            'bottom-shorts', 'bottom-cargo', 'bottom-jogger',
            'shoes-sneakers',
            'acc-glasses-emerald', 'acc-glasses-gold', 'acc-glasses-none',
            'acc-headphones-none',
            'scene-yellow', 'pet-none'
        ],

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
            shoesStyle: 'sneakers',
            pet: 'none',
            scene: 'yellow',
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



        // Mood Calendar State
        calendar: {
            selectedDate: null,
            logs: []
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
        mohawk: {
            front: "M132,55 L150,22 L168,55 L164,72 L150,67 L136,72 Z",
            back: "M142,50 L150,18 L158,50 Z"
        },
        spacebuns: {
            front: "M93,108 C93,50 207,50 207,108 C195,72 175,60 150,60 C125,60 105,72 93,108 Z M90,55 C82,30 65,45 80,68 Z M210,55 C218,30 235,45 220,68 Z",
            back: ""
        },
        bald: {
            front: "",
            back: ""
        }
    };

    const SVG_SHIRTS = {
        hoodie: "M85,200 C72,215 68,240 70,280 L70,340 L230,340 L230,280 C232,240 228,215 215,200 L195,192 L150,192 L105,200 Z",
        tshirt: "M90,200 C78,212 75,235 76,280 L76,340 L224,340 L224,280 C225,235 222,212 210,200 L195,196 L150,196 L105,196 Z",
        sweater: "M82,198 C68,215 65,242 67,282 L67,340 L233,340 L233,282 C235,242 232,215 218,198 L195,190 L150,190 L105,190 Z",
        varsity: "M85,200 C72,215 68,240 70,280 L70,340 L230,340 L230,280 C232,240 228,215 215,200 L195,192 L150,192 L105,200 Z",
        armor: "M82,198 C68,215 65,242 67,282 L67,340 L233,340 L233,282 C235,242 232,215 218,198 L195,190 L150,190 L105,190 Z"
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
        toastContainer: document.getElementById('toast-container'),

        // Mood Calendar
        calendarDaysGrid: document.getElementById('calendar-days-grid'),
        calendarDetailBadge: document.getElementById('calendar-detail-badge'),
        calendarEmptyPlaceholder: document.getElementById('calendar-empty-placeholder'),
        calendarActiveDetail: document.getElementById('calendar-active-detail'),
        calendarDetailDate: document.getElementById('calendar-detail-date'),
        calendarDetailState: document.getElementById('calendar-detail-state'),
        calendarDetailScore: document.getElementById('calendar-detail-score'),
        calendarDetailMeterFill: document.getElementById('calendar-detail-meter-fill'),
        calendarDetailSnippet: document.getElementById('calendar-detail-snippet')
    };

    // ----------------------------------------------------------------------
    // INITIALIZATION & TAB NAVIGATION
    // ----------------------------------------------------------------------
    function init() {
        // Initialize Mock Calendar Data
        state.calendar.logs = generateMockCalendarData();

        // Clone the multi-layered avatar viewport into the studio preview container
        const chatViewport = document.getElementById('chat-avatar-viewport');
        const studioContainer = document.getElementById('studio-avatar-container');
        if (chatViewport && studioContainer) {
            const clonedViewport = chatViewport.cloneNode(true);
            clonedViewport.id = 'studio-avatar-viewport';
            // Remap all IDs with -studio suffix so both viewports can coexist
            clonedViewport.querySelectorAll('[id]').forEach(el => {
                el.id = el.id + '-studio';
            });
            studioContainer.appendChild(clonedViewport);
        }

        // Init all avatar layers and render sparks display
        renderAvatarVisuals();
        updateSparksDisplay();
        renderAllCatalogPanels();
        renderDailyQuiz();
        
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
        bindSubNavEvents();
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

        } else if (panelId === 'mood-panel') {
            DOM.headerTitle.innerText = "Student Psychological State & Mood Calendar";
            DOM.headerSubtitle.innerText = "A 7x4 vertical monthly mood calendar mapping student emotional logs.";
            renderMoodCalendar();
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
    // AVATAR RENDERER (MULTI-LAYER SVG SYSTEM)
    // ----------------------------------------------------------------------
    // Returns a querySelector scope for a given viewport prefix ("", "-studio")
    function getViewportScope(suffix) {
        const viewportId = suffix ? 'studio-avatar-viewport' : 'chat-avatar-viewport';
        return document.getElementById(viewportId);
    }

    // Returns an element by ID within the correct viewport scope
    function getLayerEl(viewport, id) {
        if (!viewport) return null;
        // Studio viewports have -studio suffix on all IDs
        const suffix = viewport.id === 'studio-avatar-viewport' ? '-studio' : '';
        return viewport.querySelector('#' + id + suffix);
    }

    // Helper to apply props to a single avatar viewport (new layered system)
    function applyAvatarToViewport(viewport, conf) {
        if (!viewport) return;

        // q() — querySelector with auto-suffix for studio viewport
        const q = (id) => getLayerEl(viewport, id);

        // ---- Skin tone propagation ----
        ['avatar-head', 'avatar-neck', 'avatar-hand-l', 'avatar-hand-r', 'ear-l', 'ear-r'].forEach(id => {
            const el = q(id);
            if (el) el.setAttribute('fill', conf.skinTone);
        });
        const noseEl = q('avatar-nose');
        if (noseEl) noseEl.setAttribute('fill', shadeColor(conf.skinTone, -20));

        // ---- Hair ----
        const hairFront = q('avatar-hair-front');
        const hairBack  = q('avatar-hair-back');
        const hairPaths = SVG_HAIRSTYLES[conf.hairStyle] || SVG_HAIRSTYLES.crop;
        if (hairFront) { hairFront.setAttribute('d', hairPaths.front); hairFront.setAttribute('fill', conf.hairColor); }
        if (hairBack)  { hairBack.setAttribute('d',  hairPaths.back);  hairBack.setAttribute('fill',  conf.hairColor); }
        const leftBrowEl  = q('left-brow');
        const rightBrowEl = q('right-brow');
        if (leftBrowEl)  leftBrowEl.setAttribute('stroke', conf.hairColor);
        if (rightBrowEl) rightBrowEl.setAttribute('stroke', conf.hairColor);

        // ---- Shirt / Hoodie ----
        const clothes  = q('avatar-clothes');
        const hood     = q('avatar-hood');
        const pocket   = q('avatar-pocket');
        const shirtPath = SVG_SHIRTS[conf.shirtStyle || 'hoodie'];
        if (clothes) { if (shirtPath) clothes.setAttribute('d', shirtPath); clothes.setAttribute('fill', conf.shirtColor); }
        if (hood)    hood.setAttribute('fill', shadeColor(conf.shirtColor, -30));
        if (pocket)  pocket.setAttribute('fill', shadeColor(conf.shirtColor, -30));

        // Arms must match shirt color (uses broader viewport querySelectorAll)
        viewport.querySelectorAll('[id$="avatar-left-arm"] path, [id$="avatar-right-arm"] path').forEach(el => {
            el.setAttribute('fill', conf.shirtColor);
        });

        // Varsity / Cyber detail overlays
        const varsity = q('varsity-details');
        const cyber   = q('cyber-details');
        if (varsity) varsity.setAttribute('opacity', conf.shirtStyle === 'varsity' ? '1' : '0');
        if (cyber)   cyber.setAttribute('opacity',   conf.shirtStyle === 'armor'   ? '1' : '0');

        // Drawstring visibility (hide on non-hoodie tops)
        const ds = q('avatar-drawstrings');
        if (ds) ds.setAttribute('opacity', conf.shirtStyle === 'hoodie' ? '1' : '0');

        // ---- Hoodie Chest Graphic ----
        ['graphic-pumpkin','graphic-heart','graphic-wave','graphic-star'].forEach(gid => {
            const g = q(gid);
            if (g) g.setAttribute('opacity', (conf.hoodieGraphic && gid === 'graphic-' + conf.hoodieGraphic) ? '1' : '0');
        });

        // ---- Pants ----
        const pantsSizes = SVG_PANTS[conf.pantsStyle || 'shorts'];
        const pantsLeft  = q('pants-left');
        const pantsRight = q('pants-right');
        const hemLeft    = q('hem-left');
        const hemRight   = q('hem-right');
        const rips       = q('pants-rips');
        if (pantsLeft && pantsRight && pantsSizes) {
            pantsLeft.setAttribute('height',  pantsSizes.leftH);
            pantsRight.setAttribute('height', pantsSizes.rightH);
            const showHem = conf.pantsStyle === 'shorts';
            if (hemLeft)  hemLeft.setAttribute('opacity',  showHem ? '1' : '0');
            if (hemRight) hemRight.setAttribute('opacity', showHem ? '1' : '0');
            let pantsColor = '#1e293b';
            if (conf.pantsStyle === 'cargo')  pantsColor = '#78716c';
            if (conf.pantsStyle === 'jogger') pantsColor = '#374151';
            pantsLeft.setAttribute('fill',  pantsColor);
            pantsRight.setAttribute('fill', pantsColor);
        }
        if (rips) rips.setAttribute('opacity', conf.pantsStyle === 'ripped' ? '1' : '0');

        // ---- Glasses ----
        const glasses = q('avatar-glasses');
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

        // ---- Accessories ----
        const accs      = q('avatar-accessories');
        const catears   = q('avatar-catears');
        const vrgoggles = q('avatar-vrgoggles');
        if (accs)      accs.setAttribute('opacity',      conf.accessories === 'headphones' ? '1' : '0');
        if (catears)   catears.setAttribute('opacity',   conf.accessories === 'catears'    ? '1' : '0');
        if (vrgoggles) vrgoggles.setAttribute('opacity', conf.accessories === 'vrgoggles'  ? '1' : '0');

        // ---- Pet Companion ----
        const pet = q('avatar-pet');
        if (pet) pet.setAttribute('opacity', conf.pet === 'cat' ? '1' : '0');

        // ---- Scene / Background ----
        const sceneMap = {
            yellow: { fill: '#facc15', starry: '0', zen: '0' },
            purple: { fill: '#7c3aed', starry: '0', zen: '0' },
            sky:    { fill: '#0ea5e9', starry: '0', zen: '0' },
            starry: { fill: '#0f172a', starry: '1', zen: '0' },
            zen:    { fill: '#d1fae5', starry: '0', zen: '1' }
        };
        const scene = sceneMap[conf.scene] || sceneMap.yellow;
        const sceneBg   = q('avatar-scene-bg');
        const starryEl  = q('scene-elements-starry');
        const zenEl     = q('scene-elements-zen');
        if (sceneBg)  sceneBg.setAttribute('fill', scene.fill);
        viewport.style.backgroundColor = scene.fill;
        if (starryEl) starryEl.setAttribute('opacity', scene.starry);
        if (zenEl)    zenEl.setAttribute('opacity',    scene.zen);

        // ---- Expression / Face ----
        const leftBrow  = q('left-brow');
        const rightBrow = q('right-brow');
        const mouth     = q('avatar-mouth');
        const teeth     = q('avatar-teeth');
        const exp = SVG_EXPRESSIONS[conf.expression] || SVG_EXPRESSIONS.friendly;
        if (leftBrow)  leftBrow.setAttribute('d', exp.leftBrow);
        if (rightBrow) rightBrow.setAttribute('d', exp.rightBrow);
        if (mouth && !viewport.classList.contains('speaking-now')) mouth.setAttribute('d', exp.mouth);
        if (teeth) teeth.setAttribute('opacity', exp.teethOpacity || 0);

        // ---- Glow colors via CSS variables on each SVG layer ----
        viewport.querySelectorAll('svg').forEach(svg => {
            svg.style.setProperty('--glow-color-1', conf.glowColor1);
            svg.style.setProperty('--glow-color-2', conf.glowColor2);
        });
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

        // Update root CSS custom properties
        document.documentElement.style.setProperty('--hair-color',   conf.hairColor);
        document.documentElement.style.setProperty('--shirt-color',  conf.shirtColor);
        document.documentElement.style.setProperty('--glow-color-1', conf.glowColor1);
        document.documentElement.style.setProperty('--glow-color-2', conf.glowColor2);

        // Apply to both layered viewports
        const chatViewport   = document.getElementById('chat-avatar-viewport');
        const studioViewport = document.getElementById('studio-avatar-viewport');
        applyAvatarToViewport(chatViewport,   conf);
        applyAvatarToViewport(studioViewport, conf);

        // Update expression badge label in sidebar
        if (DOM.avatarExpressionLabel) {
            DOM.avatarExpressionLabel.innerText = conf.expression.charAt(0).toUpperCase() + conf.expression.slice(1);
        }
    }

    // Dynamic speaking controls — targets both viewports
    let mouthAnimationTimer = null;
    function triggerAvatarSpeechSpeak(durationMs) {
        ['chat-avatar-viewport', 'studio-avatar-viewport'].forEach(id => {
            const vp = document.getElementById(id);
            if (vp) vp.classList.add('speaking-now');
        });

        if (mouthAnimationTimer) clearTimeout(mouthAnimationTimer);
        mouthAnimationTimer = setTimeout(() => {
            ['chat-avatar-viewport', 'studio-avatar-viewport'].forEach(id => {
                const vp = document.getElementById(id);
                if (vp) vp.classList.remove('speaking-now');
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

    function generateMockCalendarData() {
        return [
            { date: "2026-06-01", psychologicalState: "Calm", emotionalScore: 0.1, journalSnippet: "Started the week fresh. Had a nice chat with my roommate." },
            { date: "2026-06-02", psychologicalState: "Focused", emotionalScore: 0.2, journalSnippet: "Studied for 4 hours straight. Feels good to get things done." },
            { date: "2026-06-03", psychologicalState: "Peaceful", emotionalScore: 0.05, journalSnippet: "Woke up early, meditated, and had a delicious breakfast." },
            { date: "2026-06-04", psychologicalState: "Restless", emotionalScore: 0.45, journalSnippet: "Couldn't sleep well last night. Mind kept wandering." },
            { date: "2026-06-05", psychologicalState: null, emotionalScore: null, journalSnippet: null }, // Missing Log
            { date: "2026-06-06", psychologicalState: "Focused", emotionalScore: 0.15, journalSnippet: "Finished my history essay. Really satisfied with my argument." },
            { date: "2026-06-07", psychologicalState: "Calm", emotionalScore: 0.25, journalSnippet: "Spent the Sunday reading a book in the park. Quiet day." },
            { date: "2026-06-08", psychologicalState: "Anxious", emotionalScore: 0.6, journalSnippet: "Heard about a surprise quiz. My heart started beating fast." },
            { date: "2026-06-09", psychologicalState: "Stressed", emotionalScore: 0.7, journalSnippet: "Too many deadlines overlapping. Feeling a bit crushed." },
            { date: "2026-06-10", psychologicalState: "Burnout", emotionalScore: 0.9, journalSnippet: "Extremely exhausted. Can't bring myself to study anymore. Just want to sleep." },
            { date: "2026-06-11", psychologicalState: "Fatigued", emotionalScore: 0.65, journalSnippet: "Slept for 10 hours but still feel drained. Took a slow day." },
            { date: "2026-06-12", psychologicalState: "Calm", emotionalScore: 0.3, journalSnippet: "Slowly catching up. Listened to the soundscapes for grounding." },
            { date: "2026-06-13", psychologicalState: "Peaceful", emotionalScore: 0.08, journalSnippet: "Weekend hike with friends. Nature really helped clear my head." },
            { date: "2026-06-14", psychologicalState: null, emotionalScore: null, journalSnippet: null }, // Missing Log
            { date: "2026-06-15", psychologicalState: "Focused", emotionalScore: 0.12, journalSnippet: "Met with my study group. Group study went surprisingly well." },
            { date: "2026-06-16", psychologicalState: "Anxious", emotionalScore: 0.55, journalSnippet: "Worried about the math exam next week. Math has always been hard." },
            { date: "2026-06-17", psychologicalState: "High Stress", emotionalScore: 0.78, journalSnippet: "Failed a mock test. Feel like I'm falling behind my classmates." },
            { date: "2026-06-18", psychologicalState: "Burnout", emotionalScore: 0.85, journalSnippet: "Studied late until 3 AM. Head is pounding. Hard to think." },
            { date: "2026-06-19", psychologicalState: "Fatigued", emotionalScore: 0.5, journalSnippet: "Decided to take the afternoon off. Brain feels like mush." },
            { date: "2026-06-20", psychologicalState: "Calm", emotionalScore: 0.22, journalSnippet: "Feeling much better after taking a full day of rest. Ready to try again." },
            { date: "2026-06-21", psychologicalState: "Peaceful", emotionalScore: 0.02, journalSnippet: "Had a great Sunday dinner. Feeling content and safe." },
            { date: "2026-06-22", psychologicalState: "Focused", emotionalScore: 0.18, journalSnippet: "Reviewed 3 chapters of chemistry. Understood most of it." },
            { date: "2026-06-23", psychologicalState: null, emotionalScore: null, journalSnippet: null }, // Missing Log
            { date: "2026-06-24", psychologicalState: "Restless", emotionalScore: 0.4, journalSnippet: "Tired but had too much coffee. Can't focus properly." },
            { date: "2026-06-25", psychologicalState: "Anxious", emotionalScore: 0.58, journalSnippet: "Presentation tomorrow. Terrified of public speaking." },
            { date: "2026-06-26", psychologicalState: "High Stress", emotionalScore: 0.82, journalSnippet: "Presentation went okay, but I felt extremely tense throughout." },
            { date: "2026-06-27", psychologicalState: "Calm", emotionalScore: 0.28, journalSnippet: "Vented in the rant room. Getting those words out really helped." },
            { date: "2026-06-28", psychologicalState: "Peaceful", emotionalScore: 0.06, journalSnippet: "Played video games with my brother. Laughed a lot." },
            { date: "2026-06-29", psychologicalState: "Focused", emotionalScore: 0.14, journalSnippet: "Planning my schedule for July. Feeling structured." },
            { date: "2026-06-30", psychologicalState: "Calm", emotionalScore: 0.2, journalSnippet: "End of the month. Looking forward to the summer holidays." }
        ];
    }

    function getMoodColor(score) {
        if (score === null || score === undefined) return 'var(--border-glass)';
        const hue = (1.0 - score) * 140;
        return `hsl(${hue}, 85%, 45%)`;
    }

    function renderMoodCalendar() {
        if (!DOM.calendarDaysGrid) return;
        DOM.calendarDaysGrid.innerHTML = '';

        const displayLogs = state.calendar.logs.slice(0, 28);

        displayLogs.forEach((entry, idx) => {
            const dayNum = idx + 1;
            
            const cell = document.createElement('div');
            cell.className = 'calendar-day-cell';

            const node = document.createElement('div');
            node.className = 'calendar-day-node buoyant';
            node.setAttribute('data-date', entry.date);

            const numSpan = document.createElement('span');
            numSpan.className = 'day-num';
            numSpan.innerText = dayNum;
            node.appendChild(numSpan);

            if (entry.psychologicalState) {
                const labelSpan = document.createElement('span');
                labelSpan.className = 'day-label';
                labelSpan.innerText = entry.psychologicalState;
                node.appendChild(labelSpan);

                const score = entry.emotionalScore;
                const color = getMoodColor(score);
                const hue = (1.0 - score) * 140;

                const offset = (score - 0.5) * 16; 
                node.style.setProperty('--day-offset', `${offset}px`);
                
                const shadowY = score > 0.5 ? 8 : 2;
                const shadowBlur = score > 0.5 ? 6 : 14;
                
                node.style.setProperty('--day-shadow-y', `${shadowY}px`);
                node.style.setProperty('--day-shadow-blur', `${shadowBlur}px`);
                node.style.setProperty('--day-shadow-color', `hsla(${hue}, 85%, 45%, 0.2)`);
                node.style.setProperty('--day-shadow-hover-color', `hsla(${hue}, 85%, 45%, 0.35)`);
                
                node.style.border = `1.5px solid ${color}`;
                node.style.background = `radial-gradient(circle at center, hsla(${hue}, 85%, 45%, 0.12) 0%, hsla(${hue}, 85%, 45%, 0.03) 100%)`;
            } else {
                const labelSpan = document.createElement('span');
                labelSpan.className = 'day-label';
                labelSpan.innerText = 'No Log';
                node.appendChild(labelSpan);

                node.style.setProperty('--day-offset', '0px');
                node.style.setProperty('--day-shadow-y', '2px');
                node.style.setProperty('--day-shadow-blur', '4px');
                node.style.setProperty('--day-shadow-color', 'rgba(0, 0, 0, 0.15)');
                node.style.setProperty('--day-shadow-hover-color', 'rgba(255, 255, 255, 0.05)');
                
                node.style.border = `1.5px dashed rgba(255, 255, 255, 0.15)`;
                node.style.background = `rgba(255, 255, 255, 0.01)`;
            }

            node.addEventListener('click', () => {
                DOM.calendarDaysGrid.querySelectorAll('.calendar-day-node').forEach(n => {
                    n.classList.remove('active-selected');
                });
                node.classList.add('active-selected');
                state.calendar.selectedDate = entry.date;
                showDayDetails(entry);
            });

            if (state.calendar.selectedDate === entry.date) {
                node.classList.add('active-selected');
            }

            cell.appendChild(node);
            DOM.calendarDaysGrid.appendChild(cell);
        });

        if (state.calendar.selectedDate) {
            const selectedEntry = state.calendar.logs.find(e => e.date === state.calendar.selectedDate);
            if (selectedEntry) showDayDetails(selectedEntry);
        } else {
            DOM.calendarEmptyPlaceholder.classList.remove('hidden');
            DOM.calendarActiveDetail.classList.add('hidden');
        }
    }

    function showDayDetails(entry) {
        if (!DOM.calendarActiveDetail || !DOM.calendarEmptyPlaceholder) return;
        
        if (!entry || !entry.psychologicalState) {
            DOM.calendarEmptyPlaceholder.classList.remove('hidden');
            DOM.calendarActiveDetail.classList.add('hidden');
            return;
        }

        DOM.calendarEmptyPlaceholder.classList.add('hidden');
        DOM.calendarActiveDetail.classList.remove('hidden');

        DOM.calendarDetailDate.innerText = entry.date;
        DOM.calendarDetailState.innerText = entry.psychologicalState;
        
        const score = entry.emotionalScore;
        const color = getMoodColor(score);
        const hue = (1.0 - score) * 140;

        DOM.calendarDetailScore.innerText = score.toFixed(2);
        DOM.calendarDetailMeterFill.style.width = `${score * 100}%`;
        
        DOM.calendarDetailState.style.setProperty('--state-glow-color', `hsla(${hue}, 85%, 45%, 0.3)`);
        DOM.calendarActiveDetail.style.setProperty('--state-color', color);
        DOM.calendarDetailSnippet.innerText = `"${entry.journalSnippet}"`;

        let category = "Normal Check";
        if (score > 0.7) category = "Critical Support Required";
        else if (score > 0.4) category = "Elevated Tension";
        else if (score < 0.15) category = "Peaceful State";

        DOM.calendarDetailBadge.innerText = category;
        DOM.calendarDetailBadge.style.background = `hsla(${hue}, 85%, 45%, 0.15)`;
        DOM.calendarDetailBadge.style.border = `1px solid ${color}`;
        DOM.calendarDetailBadge.style.color = color;
    }

    // ----------------------------------------------------------------------
    // SPARKS ECONOMY — DISPLAY UPDATE
    // ----------------------------------------------------------------------
    function updateSparksDisplay() {
        const el = document.getElementById('sparks-balance-display');
        if (el) el.innerText = state.sparks;
    }

    function awardSparks(amount, reason) {
        state.sparks += amount;
        updateSparksDisplay();
        showToast(`+${amount} Sparks earned! ${reason}`, 'success');
    }

    // ----------------------------------------------------------------------
    // CATALOG DATA (items for Fashion/Avatar/Pet/Scene panels)
    // ----------------------------------------------------------------------
    const CATALOG_DATA = {
        fashion: {
            title: 'Try a new look — Fashion',
            sections: [
                {
                    label: '👕 Tops',
                    prop: 'shirtStyle',
                    items: [
                        { id: 'top-hoodie',  val: 'hoodie',  label: 'Hoodie',       emoji: '🧥', cost: 0 },
                        { id: 'top-tshirt',  val: 'tshirt',  label: 'T-Shirt',      emoji: '👕', cost: 0 },
                        { id: 'top-sweater', val: 'sweater', label: 'Sweater',      emoji: '🧶', cost: 0 },
                        { id: 'top-varsity', val: 'varsity', label: 'Varsity',      emoji: '🎽', cost: 50 },
                        { id: 'top-armor',   val: 'armor',   label: 'Cyber Armor',  emoji: '🤖', cost: 120 },
                    ]
                },
                {
                    label: '👖 Bottoms',
                    prop: 'pantsStyle',
                    items: [
                        { id: 'bottom-shorts', val: 'shorts',  label: 'Shorts',   emoji: '🩳', cost: 0 },
                        { id: 'bottom-cargo',  val: 'cargo',   label: 'Cargo',    emoji: '🪖', cost: 0 },
                        { id: 'bottom-jogger', val: 'jogger',  label: 'Joggers',  emoji: '🏃', cost: 0 },
                        { id: 'bottom-ripped', val: 'ripped',  label: 'Ripped',   emoji: '✂️', cost: 40 },
                    ]
                },
                {
                    label: '👟 Shoes',
                    prop: 'shoesStyle',
                    items: [
                        { id: 'shoes-sneakers', val: 'sneakers', label: 'Sneakers',  emoji: '👟', cost: 0 },
                        { id: 'shoes-boots',    val: 'boots',    label: 'Boots',     emoji: '🥾', cost: 60 },
                        { id: 'shoes-heels',    val: 'heels',    label: 'Heels',     emoji: '👠', cost: 60 },
                    ]
                },
                {
                    label: '🎨 Hoodie Graphics',
                    prop: 'hoodieGraphic',
                    items: [
                        { id: 'graphic-none',    val: 'none',    label: 'None',      emoji: '🔲', cost: 0 },
                        { id: 'graphic-pumpkin', val: 'pumpkin', label: 'Pumpkin',   emoji: '🎃', cost: 0 },
                        { id: 'graphic-heart',   val: 'heart',   label: 'Heart',     emoji: '❤️', cost: 0 },
                        { id: 'graphic-wave',    val: 'wave',    label: 'Wave',      emoji: '🌊', cost: 30 },
                        { id: 'graphic-star',    val: 'star',    label: 'Star',      emoji: '⭐', cost: 0 },
                    ]
                },
            ]
        },
        avatar: {
            title: 'Try a new look — Avatar',
            sections: [
                {
                    label: '💇 Hairstyle',
                    prop: 'hairStyle',
                    items: [
                        { id: 'hair-crop',      val: 'crop',      label: 'Crop',       emoji: '✂️', cost: 0  },
                        { id: 'hair-curly',     val: 'curly',     label: 'Curly',      emoji: '🌀', cost: 0  },
                        { id: 'hair-bob',       val: 'bob',       label: 'Bob',        emoji: '💁', cost: 0  },
                        { id: 'hair-long',      val: 'long',      label: 'Long',       emoji: '🧖', cost: 0  },
                        { id: 'hair-mohawk',    val: 'mohawk',    label: 'Mohawk',     emoji: '🤘', cost: 50 },
                        { id: 'hair-spacebuns', val: 'spacebuns', label: 'Space Buns', emoji: '👻', cost: 40 },
                        { id: 'hair-bald',      val: 'bald',      label: 'Bald',       emoji: '🧑‍🦲', cost: 0 },
                    ]
                },
                {
                    label: '🕶️ Glasses',
                    prop: 'glasses',
                    items: [
                        { id: 'acc-glasses-none',    val: 'none',    label: 'None',         emoji: '🔲', cost: 0  },
                        { id: 'acc-glasses-emerald', val: 'green',   label: 'Emerald',      emoji: '💚', cost: 0  },
                        { id: 'acc-glasses-gold',    val: 'gold',    label: 'Gold',         emoji: '💛', cost: 0  },
                        { id: 'acc-glasses-cyber',   val: 'cyber',   label: 'Cyber',        emoji: '🤖', cost: 80 },
                    ]
                },
                {
                    label: '🎧 Accessories',
                    prop: 'accessories',
                    items: [
                        { id: 'acc-headphones-none',  val: 'none',       label: 'None',        emoji: '🔲', cost: 0   },
                        { id: 'acc-headphones',       val: 'headphones', label: 'Headphones',  emoji: '🎧', cost: 0   },
                        { id: 'acc-catears',          val: 'catears',    label: 'Cat Ears',    emoji: '🐱', cost: 70  },
                        { id: 'acc-vrgoggles',        val: 'vrgoggles',  label: 'VR Goggles',  emoji: '🥽', cost: 100 },
                    ]
                },
            ]
        },
        pet: {
            title: 'Try a new look — Pets',
            sections: [
                {
                    label: '🐾 Companion',
                    prop: 'pet',
                    items: [
                        { id: 'pet-none', val: 'none', label: 'None',        emoji: '🔲', cost: 0   },
                        { id: 'pet-cat',  val: 'cat',  label: 'Cat',         emoji: '🐱', cost: 0   },
                        { id: 'pet-dog',  val: 'dog',  label: 'Dog',         emoji: '🐶', cost: 80  },
                        { id: 'pet-bunny',val: 'bunny',label: 'Bunny',       emoji: '🐰', cost: 80  },
                        { id: 'pet-bird', val: 'bird', label: 'Bird',        emoji: '🐦', cost: 120 },
                    ]
                }
            ]
        },
        scene: {
            title: 'Try a new look — Scenes',
            sections: [
                {
                    label: '🌅 Background Scene',
                    prop: 'scene',
                    items: [
                        { id: 'scene-yellow', val: 'yellow', label: 'Sunshine',   emoji: '🌞', cost: 0  },
                        { id: 'scene-purple', val: 'purple', label: 'Galaxy',     emoji: '🔮', cost: 0  },
                        { id: 'scene-sky',    val: 'sky',    label: 'Ocean Sky',  emoji: '🌊', cost: 0  },
                        { id: 'scene-starry', val: 'starry', label: 'Starry Night',emoji: '🌟',cost: 60 },
                        { id: 'scene-zen',    val: 'zen',    label: 'Zen Garden', emoji: '🌿', cost: 60 },
                    ]
                }
            ]
        }
    };

    // ----------------------------------------------------------------------
    // CATALOG RENDERING (Bitmoji-style "Try a new look" grid)
    // ----------------------------------------------------------------------
    function renderAllCatalogPanels() {
        ['fashion', 'avatar', 'pet', 'scene'].forEach(tab => {
            const panel = document.getElementById('catalog-' + tab);
            if (!panel) return;
            const data = CATALOG_DATA[tab];
            if (!data) return;

            panel.innerHTML = '';

            data.sections.forEach(section => {
                const sectionEl = document.createElement('div');
                sectionEl.style.cssText = 'margin-bottom:20px;';

                const labelEl = document.createElement('p');
                labelEl.style.cssText = 'font-size:0.8rem; font-weight:600; color:var(--color-text-muted); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;';
                labelEl.innerText = section.label;
                sectionEl.appendChild(labelEl);

                const grid = document.createElement('div');
                grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(90px, 1fr)); gap:10px;';

                section.items.forEach(item => {
                    const owned = state.inventory.includes(item.id);
                    const isActive = state.avatar[section.prop] === item.val;

                    const card = document.createElement('button');
                    card.className = 'catalog-item-card' + (isActive ? ' active' : '') + (owned ? '' : ' locked');
                    card.setAttribute('data-item-id', item.id);
                    card.setAttribute('data-prop', section.prop);
                    card.setAttribute('data-val', item.val);
                    card.setAttribute('data-cost', item.cost);
                    card.style.cssText = `
                        background: ${isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)'};
                        border: 1.5px solid ${isActive ? 'var(--color-violet)' : (owned ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)')};
                        border-radius: 14px;
                        padding: 12px 8px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 6px;
                        cursor: ${owned ? 'pointer' : 'default'};
                        transition: all 0.2s ease;
                        position: relative;
                        opacity: ${owned ? '1' : '0.6'};
                    `;

                    const emojiEl = document.createElement('span');
                    emojiEl.style.cssText = 'font-size:1.6rem; line-height:1;';
                    emojiEl.innerText = item.emoji;

                    const labelTxt = document.createElement('span');
                    labelTxt.style.cssText = 'font-size:0.72rem; font-weight:500; color:var(--color-text-muted); text-align:center;';
                    labelTxt.innerText = item.label;

                    card.appendChild(emojiEl);
                    card.appendChild(labelTxt);

                    if (!owned && item.cost > 0) {
                        const lockBadge = document.createElement('span');
                        lockBadge.style.cssText = `
                            position:absolute; top:6px; right:6px;
                            background:rgba(245,158,11,0.15);
                            border:1px solid rgba(245,158,11,0.3);
                            border-radius:8px;
                            font-size:0.6rem;
                            font-weight:700;
                            color:#f59e0b;
                            padding:1px 5px;
                        `;
                        lockBadge.innerText = `⚡ ${item.cost}`;
                        card.appendChild(lockBadge);
                    }

                    card.addEventListener('click', () => {
                        if (!owned) {
                            // Purchase flow
                            if (item.cost > 0 && state.sparks >= item.cost) {
                                state.sparks -= item.cost;
                                state.inventory.push(item.id);
                                updateSparksDisplay();
                                showToast(`Purchased ${item.label}! (${item.cost} Sparks spent)`, 'success');
                                // Apply immediately after purchase
                                state.avatar[section.prop] = item.val;
                                renderAvatarVisuals();
                                renderAllCatalogPanels(); // Re-render to reflect ownership
                            } else if (item.cost > 0) {
                                showToast(`Not enough Sparks! You need ${item.cost} but have ${state.sparks}.`, 'error');
                            }
                            return;
                        }

                        // Equip flow
                        state.avatar[section.prop] = item.val;
                        renderAvatarVisuals();

                        // Update active state on sibling cards
                        const allCards = grid.querySelectorAll('.catalog-item-card');
                        allCards.forEach(c => {
                            const active = c.getAttribute('data-val') === item.val;
                            c.style.background = active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.03)';
                            c.style.border = `1.5px solid ${active ? 'var(--color-violet)' : 'rgba(255,255,255,0.08)'}`;
                        });
                    });

                    grid.appendChild(card);
                });

                sectionEl.appendChild(grid);
                panel.appendChild(sectionEl);
            });
        });
    }

    // ----------------------------------------------------------------------
    // SUB-NAV SWITCHING (Fashion / Avatar / Pet / Scene / Selfie)
    // ----------------------------------------------------------------------
    function bindSubNavEvents() {
        const subNavBtns = document.querySelectorAll('.studio-sub-nav .sub-nav-btn');
        const catalogPanels = document.querySelectorAll('.catalog-panel');
        const sheetTitle = document.getElementById('options-sheet-title');

        subNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-subnav');

                subNavBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                catalogPanels.forEach(p => {
                    if (p.id === 'catalog-' + target) {
                        p.style.display = target === 'selfie' ? 'flex' : 'block';
                        p.classList.add('active');
                    } else {
                        p.style.display = 'none';
                        p.classList.remove('active');
                    }
                });

                const titles = {
                    fashion: 'Try a new look — Fashion',
                    avatar:  'Try a new look — Avatar',
                    pet:     'Try a new look — Pets',
                    scene:   'Try a new look — Scenes',
                    selfie:  'Daily Challenges & Selfie'
                };
                if (sheetTitle) sheetTitle.innerText = titles[target] || 'Try a new look';
            });
        });
    }

    // ----------------------------------------------------------------------
    // DAILY QUIZ (Sparks earn mechanism)
    // ----------------------------------------------------------------------
    const QUIZ_QUESTIONS = [
        {
            q: "When you feel overwhelmed, which coping strategy do you prefer?",
            options: ["Take a short walk", "Call a friend", "Write in a journal", "Deep breathing"],
            correct: null, // Wellness quiz — all answers are 'right'
            sparksReward: 20
        },
        {
            q: "Which of these best describes psychological burnout?",
            options: ["Being physically tired after sport", "Emotional exhaustion from prolonged stress", "Feeling hungry before lunch", "Short-term excitement"],
            correct: 1,
            sparksReward: 25
        },
        {
            q: "A student notices their friend has been skipping meals and isolating. Best response?",
            options: ["Mind your own business", "Tease them about it", "Gently check in and offer support", "Tell the whole friend group"],
            correct: 2,
            sparksReward: 30
        },
        {
            q: "Which of these activities can improve mental wellbeing?",
            options: ["Scrolling social media for 3+ hours", "Mindful journaling", "Procrastinating on tasks", "Avoiding sleep"],
            correct: 1,
            sparksReward: 20
        },
        {
            q: "What does the 5-4-3-2-1 grounding technique involve?",
            options: ["A countdown for stress", "Naming things you can sense in the present moment", "5 minutes of exercise", "Taking 5 deep breaths"],
            correct: 1,
            sparksReward: 35
        }
    ];

    function renderDailyQuiz() {
        const container = document.getElementById('quiz-container');
        const statusMsg = document.getElementById('quiz-status-msg');
        if (!container) return;

        // Find an unanswered question
        const answered = state.quiz ? state.quiz.answered : [];
        const nextQ = QUIZ_QUESTIONS.find((_, i) => !answered.includes(i));

        if (!nextQ) {
            container.innerHTML = `<p style="color:var(--color-text-muted); font-size:0.9rem; text-align:center; padding:24px 0;">🎉 All daily challenges completed! Come back tomorrow.</p>`;
            if (statusMsg) { statusMsg.innerText = 'Completed'; statusMsg.style.color = '#f59e0b'; }
            return;
        }

        const qIdx = QUIZ_QUESTIONS.indexOf(nextQ);
        if (statusMsg) statusMsg.innerText = `${qIdx + 1}/${QUIZ_QUESTIONS.length}`;

        container.innerHTML = '';

        const questionText = document.createElement('p');
        questionText.style.cssText = 'font-size:0.9rem; color:white; font-weight:500; margin-bottom:14px; line-height:1.5;';
        questionText.innerText = nextQ.q;
        container.appendChild(questionText);

        const optionsGrid = document.createElement('div');
        optionsGrid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px;';

        nextQ.options.forEach((opt, optIdx) => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 10px 12px;
                color: var(--color-text-muted);
                font-size: 0.82rem;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            btn.innerText = opt;

            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(139,92,246,0.12)';
                btn.style.borderColor = 'rgba(139,92,246,0.4)';
                btn.style.color = 'white';
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.classList.contains('answered')) {
                    btn.style.background = 'rgba(255,255,255,0.03)';
                    btn.style.borderColor = 'rgba(255,255,255,0.1)';
                    btn.style.color = 'var(--color-text-muted)';
                }
            });

            btn.addEventListener('click', () => {
                const isCorrect = nextQ.correct === null || nextQ.correct === optIdx;

                // Visual feedback
                optionsGrid.querySelectorAll('button').forEach(b => {
                    b.disabled = true;
                    b.classList.add('answered');
                });

                btn.style.background = isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.15)';
                btn.style.borderColor = isCorrect ? '#10b981' : '#f43f5e';
                btn.style.color = isCorrect ? '#10b981' : '#f43f5e';

                if (nextQ.correct !== null && !isCorrect) {
                    const correctBtn = optionsGrid.querySelectorAll('button')[nextQ.correct];
                    if (correctBtn) {
                        correctBtn.style.background = 'rgba(16,185,129,0.2)';
                        correctBtn.style.borderColor = '#10b981';
                        correctBtn.style.color = '#10b981';
                    }
                }

                // Track answered
                if (!state.quiz) state.quiz = { answered: [] };
                state.quiz.answered.push(qIdx);

                // Award sparks
                const reward = isCorrect ? nextQ.sparksReward : Math.round(nextQ.sparksReward * 0.5);
                awardSparks(reward, isCorrect ? 'Correct answer!' : 'Participation reward!');

                // Show "Next" button
                setTimeout(() => {
                    const nextBtn = document.createElement('button');
                    nextBtn.style.cssText = `
                        margin-top:12px;
                        width:100%;
                        padding:10px;
                        background: linear-gradient(135deg, var(--color-violet), #4f46e5);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        cursor: pointer;
                    `;
                    nextBtn.innerText = 'Next Question →';
                    nextBtn.addEventListener('click', () => renderDailyQuiz());
                    container.appendChild(nextBtn);
                }, 800);
            });

            optionsGrid.appendChild(btn);
        });

        container.appendChild(optionsGrid);
    }

    // Run launcher
    init();
});
