// js/app.js

if (typeof Alpine === 'undefined') {
    console.error('Alpine.js is not loaded. Please check script order.');
}

if (typeof YT === 'undefined' && document.getElementById('youtube-player')) {
    console.warn('YouTube API not loaded. Video may not play.');
}

document.addEventListener('alpine:init', () => {
    Alpine.data('toolkit', () => ({
        // ------------------------------------------------------------------
        // INITIALIZATION
        // ------------------------------------------------------------------
        init() {

            // check if user previously entered
const hasEnteredBefore = localStorage.getItem('app_entered') === 'true';

// If they entered before, skip landing page
if (hasEnteredBefore) {
    this.showLanding = false;
    this.setupActivityTracking();
}

            this.isMobile = window.innerWidth < 768;
            window.addEventListener('resize', () => { this.isMobile = window.innerWidth < 768; });


            // Initialize Supabase Client
const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
    
if (window.supabase) {
    this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    this.teamManager.supabase = this.supabase; 
} else {
    console.error("Supabase library not loaded.");
}
            
            // PWA & Install Logic
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');

            // 1. Capture the event for Android/Chrome (so we can trigger it later)
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
            });

                this.$nextTick(() => {
        this.updateTalentChart();
    });


            // VIP & Challenger Logic
            const params = new URLSearchParams(window.location.search);
            if (params.get('access') === 'vip_nfc_001') this.triggerVipSequence();
            
            const teamCode = params.get('team_code');
            if (teamCode) {
                console.log("Team Invite Detected:", teamCode); // Debugging line
                this.currentTab = 'assessment';
                this.$nextTick(() => {
                    if(this.teamManager) {
                        this.teamManager.joinByLink(teamCode);
                    }
                });
            }

            const challenger = params.get('challenger');
            if (challenger) {
                try {
                    this.challengerData = JSON.parse(atob(challenger));
                    this.currentTab = 'assessment';
                } catch (e) { console.error("URL Parameter Error", e); }
            }

            // Restore Data
            try {
                const savedKey = localStorage.getItem('bilingual_api_key');
                if(savedKey) this.userApiKey = savedKey;

                const savedScores = localStorage.getItem('bilingual_scores');
                if (savedScores) {
                    const parsed = JSON.parse(savedScores);
                    this.assessmentData.forEach((section, sIdx) => {
                        section.questions.forEach((q, qIdx) => { if(parsed[sIdx] && parsed[sIdx][qIdx]) q.score = parsed[sIdx][qIdx]; });
                    });
                }
                
                const savedTeam = localStorage.getItem('bilingual_active_team');
                if (savedTeam) {
                    this.teamManager.activeTeam = JSON.parse(savedTeam);
                    this.teamManager.view = 'dashboard';
                    // We use $nextTick to ensure Supabase client is ready
                    this.$nextTick(() => {
                        this.teamManager.fetchResults();
                    });
                }
            } catch(e) {}

            // Watchers
            this.$watch('assessmentData', (val) => {
                const simpleScores = val.map(s => s.questions.map(q => q.score));
                try { localStorage.setItem('bilingual_scores', JSON.stringify(simpleScores)); } catch (e) {}
            });

            this.$watch('mobileMenuOpen', (value) => {
                if (value) document.body.classList.add('mobile-menu-open');
                else document.body.classList.remove('mobile-menu-open');
            });

            // NEW: Talent chart watchers
this.$watch('currentTab', (value) => {
    if (value === 'talent') {
        // Give DOM time to render
        setTimeout(() => {
            this.updateTalentChart();
        }, 200);
    }
});

// Also watch for skill changes
this.$watch('talentSkills', () => {
    if (this.currentTab === 'talent') {
        this.updateTalentChart();
    }
}, { deep: true });

            this.culturalMonitor.init(); 


        },

        

    
        // YouTube Player Initialization Method
initYouTubePlayer() {
    const initPlayer = () => {
        this.player = new YT.Player('youtube-player', {
            videoId: '8GvrODrkQ7M',
            playerVars: {
                'autoplay': 0,
                'controls': 0,           // Hide YouTube's native controls
                'rel': 0,
                'modestbranding': 1,
                'loop': 0,
                'playlist': '8GvrODrkQ7M',
                'playsinline': 1,
                'enablejsapi': 1         // CRITICAL: Enable JavaScript API
            },
            events: {
'onReady': (event) => {
    // Do not mute on start
    this.videoMuted = false;
    this.videoPlaying = false;
    
    // Get video duration
    this.videoDuration = event.target.getDuration();
    
    // Set initial volume
    this.videoVolume = 50;
    event.target.setVolume(50);

    // Initialize fullscreen listeners
    this.initFullscreenListeners();
},

                'onStateChange': (event) => {
                    // When video starts playing
                    if (event.data === YT.PlayerState.PLAYING) {
                        this.videoPlaying = true;
                        
                        // Start updating current time every second
    this.updateTimeInterval = setInterval(() => {
        if (this.player && this.player.getCurrentTime) {
            this.videoCurrentTime = this.player.getCurrentTime();
            
            // Also update duration if not set
            if (!this.videoDuration && this.player.getDuration) {
                this.videoDuration = this.player.getDuration();
            }
        }
    }, 200); // Update every 200ms for smoother animation
}
                    // When video is paused, buffering, or ended
                    else if (event.data === YT.PlayerState.PAUSED || 
                             event.data === YT.PlayerState.BUFFERING || 
                             event.data === YT.PlayerState.ENDED) {
                        this.videoPlaying = false;
                        
                        // Clear the interval
                        if (this.updateTimeInterval) {
                            clearInterval(this.updateTimeInterval);
                            this.updateTimeInterval = null;
                        }
                        
                        // Update time one last time
                        if (this.player && this.player.getCurrentTime) {
                            this.videoCurrentTime = this.player.getCurrentTime();
                        }
                    }
                }
            }
        });
    };


            // Scenario A: API is already ready (e.g. cached or reload)
            if (window.YT && window.YT.Player) {
                initPlayer();
            } 
            // Scenario B: API needs to be loaded
            else {
                // Define the global callback
                window.onYouTubeIframeAPIReady = () => {
                    initPlayer();
                };

                // Inject script only if it's not there
                if (!document.getElementById('yt-api-script')) {
                    const tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    tag.id = "yt-api-script"; // Prevent duplicate injection
                    const firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }
            }
        },


        // ------------------------------------------------------------------
        // STATE VARIABLES
        // ------------------------------------------------------------------

            // --- LANDING PAGE STATE ---
        showLanding: true,
        videoPlaying: false,
        videoMuted: false,
        player: null, 
        videoCurrentTime: 0,
        videoDuration: 0,
        videoVolume: 50, // Default volume
        volumeBeforeMute: 50, // Store volume before muting
        updateTimeInterval: null, // For updating the seek bar
        isFullscreen: false,
        fullscreenElement: null,




        // Activity Tracking
        userActivityCount: 0,
        pwaTimer: null,
       isPwaPromptActive: false,
       userLastActive: Date.now(),


        currentTab: 'dashboard',
        supabase: null,
        selectedIndustry: "",
        selectedTitle: "",
       percentileResult: null,
       benchmarkLoading: false,
        totalBenchmarks: 0,
        mobileMenuOpen: false,
        isMobile: false,
        showPwaPrompt: false, 
        deferredPrompt: null,
        
        isVipMode: false,
        showVipIntro: false,
        bootStep: 0,
        bootProgress: 0,
        vipJson: '{\n  "product_id": "DP-PAY-001",\n  "domain": "Payments_Processing",\n  "owner": "Sarah_Connor@meridian.com",\n  "slo": { "freshness": "200ms", "accuracy": "99.999%" }\n}',
        vipPrompt: 'Act as a CDO presenting to a skeptical Board. \nWe need $5M for Cloud Migration. Draft a 2-minute response using the "House Analogy". Focus on Risk, not just Speed.',

        
        searchQuery: '',
        glossarySearch: '',
        assessmentSubmitted: false,
        challengerData: null,
        copyBtnText: "Copy Challenge Link",
        activeRepair: null,

        translatorView: 'dict',

        
        matrixCoords: { x: 50, y: 50 },
        compassCoords: { x: 50, y: 50 },
        canvasData: { name: '', owner: '', jobs: '', slo1: '' },
talentSkills: [ 
    { label: "Tech Fluency", val: 3, icon: "fa-solid fa-code" }, 
    { label: "Business Acumen", val: 3, icon: "fa-solid fa-sack-dollar" }, // Renamed from Financial IQ
    { label: "Data Literacy", val: 2, icon: "fa-solid fa-table" }, // Renamed from Data Culture
    { label: "Empathy / EQ", val: 4, icon: "fa-solid fa-heart" }, // Renamed from Political EQ
    { label: "Change Tolerance", val: 3, icon: "fa-solid fa-wind" } // Renamed from Risk Appetite
],
        
        talentChartInstance: null,
        gapChartInstance: null,

// ------------------------------------------------------------------
        // CASE STUDY SIMULATOR (Updated with AI Prompt)
        // ------------------------------------------------------------------
        caseStudy: {
            active: false,
            step: 0,
            gameOver: false,
            finalMessage: "",
            metrics: { politicalCapital: 50, velocity: 10, risk: 50 },
            history: [],
            scenarios: [
                {
                    id: 0,
                    title: "The $30M Zombie",
                    context: "You are Sarah, the new CDO. 'Project Olympus' is 18 months late, $30M over budget, and has delivered zero value. The CFO wants to save it.",
                    question: "What is your first move?",
                    choices: [
                        {
                            text: "Try to fix it. Hire consultants to audit the code.",
                            outcome: "failure",
                            feedback: "Sunk Cost Fallacy. You wasted another $5M. The Board lost faith.",
                            impact: { politicalCapital: -20, velocity: -5, risk: +10 }
                        },
                        {
                            text: "Kill it immediately. Reallocate budget to a pilot.",
                            outcome: "success",
                            feedback: "Bilingual Move. You stopped the bleeding and freed up resources.",
                            impact: { politicalCapital: -10, velocity: +20, risk: -10 }
                        }
                    ]
                },
                {
                    id: 1,
                    title: "The Risk Wall",
                    context: "Your 'Instant Loan' pilot is ready. The CRO blocks it: 'I don't trust code. I need a human analyst to sign off every loan.'",
                    question: "How do you respond?",
                    choices: [
                        {
                            text: "Escalate to the CEO. Complaining about the CRO.",
                            outcome: "failure",
                            feedback: "Political Trap. You made an enemy of Risk. They will block everything.",
                            impact: { politicalCapital: -30, velocity: 0, risk: 0 }
                        },
                        {
                            text: "The 'Red Screen' Demo. Show automated policy checks.",
                            outcome: "success",
                            feedback: "Bilingual Move. You proved the code is stricter than a human.",
                            impact: { politicalCapital: +20, velocity: +30, risk: -20 }
                        }
                    ]
                },
                {
                    id: 2,
                    title: "The Demo Day",
                    context: "90 Days are up. The app works. The Board expects a status report explaining delays.",
                    question: "How do you present?",
                    choices: [
                        {
                            text: "A 20-slide Strategy Deck on the 'Roadmap'.",
                            outcome: "neutral",
                            feedback: "Innovation Theater. They don't believe you. Just another PowerPoint.",
                            impact: { politicalCapital: 0, velocity: 0, risk: 0 }
                        },
                        {
                            text: "Live Demo. Ask the Chairman to apply right now.",
                            outcome: "success",
                            feedback: "Moment of Truth. The loan approves in 3 minutes. Culture shifts.",
                            impact: { politicalCapital: +50, velocity: +20, risk: 0 }
                        }
                    ]
                }
            ],
            start() {
                this.active = true;
                this.step = 0;
                this.gameOver = false;
                this.metrics = { politicalCapital: 50, velocity: 20, risk: 50 };
                this.history = [];
            },
            makeChoice(choiceIndex) {
                const currentScenario = this.scenarios[this.step];
                const choice = currentScenario.choices[choiceIndex];
                
                this.metrics.politicalCapital += choice.impact.politicalCapital;
                this.metrics.velocity += choice.impact.velocity;
                this.metrics.risk += choice.impact.risk;
                
                this.history.push({
                    step: this.step + 1,
                    scenario: currentScenario.title,
                    decision: choice.text,
                    result: choice.outcome
                });

                if (this.metrics.politicalCapital <= 0) {
                    this.endGame("Fired. You lost the support of the Board.");
                    return;
                }
                if (this.step < this.scenarios.length - 1) {
                    this.step++;
                } else {
                    this.endGame("Victory! You have navigated the Clay Layer.");
                }
            },
            endGame(message) {
                this.gameOver = true;
                this.finalMessage = message;
            },

            // --- NEW: SIMULATOR AI PROMPT ---
            generateSimulatorPrompt() {
                const m = this.metrics;
                // Format the history for the AI
                const decisionLog = this.history.map(h => 
                    `turn ${h.step}: On "${h.scenario}", I chose to "${h.decision}". Result: ${h.result.toUpperCase()}.`
                ).join("\n");

                let profile = "";
                if(m.politicalCapital > 80) profile = "Master Politician (High Trust)";
                else if (m.politicalCapital < 20) profile = "Dead Man Walking (Zero Trust)";
                else profile = "Average Operator";

                return `ACT AS: The Chairman of the Board conducting a Performance Review.

## SIMULATION DATA (THE MERIDIAN PROTOCOL)
I have just completed a 90-day turnaround simulation as the new CDO.
- **FINAL OUTCOME:** ${this.finalMessage}
- **Political Capital:** ${m.politicalCapital}% (${profile})
- **Velocity Score:** ${m.velocity}
- **Risk Exposure:** ${m.risk}%

## MY DECISION LOG
${decisionLog}

## YOUR ASSESSMENT
1. **The Verdict:** Analyze my decision-making style based on the logs. Am I too reckless? Too cautious? Or truly Bilingual?
2. **The Blind Spot:** Identify one critical mistake I made (or a risk I ignored) based on the logs.
3. **The Coaching:** Give me one mental model to improve my executive decision-making.

TONE: Senior, direct, mentorship-focused.`;
            }
        },
        
        // ------------------------------------------------------------------
        // BILINGUAL FLASHCARD QUIZ
        // ------------------------------------------------------------------
        quiz: {
            active: false,
            finished: false,
            currentQuestion: 0,
            score: 0,
            feedback: null, // 'correct' or 'incorrect'
            
            // The Question Bank
            questions: [
                {
                    term: "Technical Debt",
                    type: "Tech -> Business",
                    options: [
                        { text: "Money we owe to technology vendors for cloud servers.", correct: false },
                        { text: "The implied cost of future rework caused by choosing an easy solution now.", correct: true }, // The Business Impact
                        { text: "A bug in the code that causes the app to crash.", correct: false }
                    ]
                },
                {
                    term: "API (Application Programming Interface)",
                    type: "Tech -> Business",
                    options: [
                        { text: "The 'Universal Adapter' that allows our systems to talk to partners like Fintechs.", correct: true },
                        { text: "A specific type of database used for high-speed trading.", correct: false },
                        { text: "A graphical user interface for the mobile app.", correct: false }
                    ]
                },
                {
                    term: "The Monolith",
                    type: "Tech -> Business",
                    options: [
                        { text: "A large, successful bank with a dominant market share.", correct: false },
                        { text: "The 'Anchor' system. A unified legacy codebase that is stable but very hard to change.", correct: true },
                        { text: "A physical server located in the basement.", correct: false }
                    ]
                },
                {
                    term: "Zero Trust",
                    type: "Security -> Business",
                    options: [
                        { text: "A culture where employees do not trust management.", correct: false },
                        { text: "A security model that assumes the breach has already occurred and verifies every request.", correct: true },
                        { text: "A policy that stops us from hiring external consultants.", correct: false }
                    ]
                },
                {
                    term: "Microservices",
                    type: "Architecture -> Business",
                    options: [
                        { text: "Small banking services offered to retail customers.", correct: false },
                        { text: "A department with fewer than 10 employees.", correct: false },
                        { text: "Lego Blocks. Breaking a system into small parts so we can update one without breaking the others.", correct: true }
                    ]
                }
            ],

            start() {
                this.active = true;
                this.finished = false;
                this.currentQuestion = 0;
                this.score = 0;
                this.feedback = null;
                this.shuffleQuestions();
            },

            shuffleQuestions() {
                // Simple shuffle to keep it fresh
                this.questions.sort(() => Math.random() - 0.5);
            },

            submitAnswer(isCorrect) {
                if (this.feedback) return; // Prevent double clicks

                if (isCorrect) {
                    this.score++;
                    this.feedback = 'correct';
                } else {
                    this.feedback = 'incorrect';
                }

                // Auto-advance after 1.5 seconds
                setTimeout(() => {
                    if (this.currentQuestion < this.questions.length - 1) {
                        this.currentQuestion++;
                        this.feedback = null;
                    } else {
                        this.finished = true;
                    }
                }, 1500);
            }
        },

// ------------------------------------------------------------------
        // ROLE-PLAY DOJO (Updated with Transcript Analysis)
        // ------------------------------------------------------------------
        rolePlay: {
            active: false,
            showDebrief: false, // NEW: Controls the Analysis screen
            scenario: null,
            messages: [],
            input: '',
            loading: false,
            
            scenarios: [
                {
                    id: 'cloud',
                    title: 'The Cloud Skeptic',
                    myRole: 'Chief Digital Officer',
                    opponent: 'CFO (The Bean Counter)',
                    topic: 'Cloud Migration Cost ($10M)',
                    intro: 'I see a $10M request for AWS. Our physical data centers are fully paid for. Why should I approve this massive OpEx spike just to rent computers?'
                },
                {
                    id: 'mvp',
                    title: 'The Scope Creeper',
                    myRole: 'Product Owner',
                    opponent: 'Head of Sales',
                    topic: 'MVP Definition',
                    intro: 'I saw the prototype. It looks basic. We cannot launch without the "Gold Tier" features. My clients expect perfection, not an experiment.'
                },
                {
                    id: 'risk',
                    title: 'The Gatekeeper',
                    myRole: 'Tech Lead',
                    opponent: 'Chief Risk Officer',
                    topic: 'Automated Compliance',
                    intro: 'You want to deploy code daily? Absolutely not. I need 2 weeks to review every release manually. How can a script be safer than my signature?'
                }
            ],

            start(index) {
                this.active = true;
                this.showDebrief = false;
                this.scenario = this.scenarios[index];
                this.messages = [
                    { role: 'opponent', text: this.scenario.intro }
                ];
                this.input = '';
                // Auto-scroll to bottom
                this.$nextTick(() => this.scrollToBottom());
            },

            // Stop the chat and show the analysis
            endSession() {
                this.active = false;
                this.showDebrief = true;
            },

            // Reset everything
            reset() {
                this.active = false;
                this.showDebrief = false;
                this.messages = [];
            },

            scrollToBottom() {
                const el = document.getElementById('rp-chat-box');
                if (el) el.scrollTop = el.scrollHeight;
            },

            async send() {
                if (!this.input.trim()) return;
                
                // 1. Add User Message
                this.messages.push({ role: 'user', text: this.input });
                this.input = '';
                this.loading = true;
                this.$nextTick(() => this.scrollToBottom());

                // 2. Check API Key
                const API_KEY = localStorage.getItem('bilingual_api_key');
                if (!API_KEY) {
                    this.messages.push({ role: 'system', text: 'Error: Please set API Key in settings.' });
                    this.loading = false;
                    return;
                }

                // 3. Construct Prompt
                const systemPrompt = `
                    ACT AS: ${this.scenario.opponent} at a traditional bank.
                    USER IS: ${this.scenario.myRole}.
                    TOPIC: ${this.scenario.topic}.
                    GOAL: You are skeptical. Push back hard on tech jargon. Only agree if the user explains BUSINESS VALUE (Money, Speed, Risk).
                    RESPONSE: Keep it under 40 words. Conversational.
                    HISTORY: ${JSON.stringify(this.messages)}
                `;

                // 4. Call Gemini
                try {
                    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
                    });
                    
                    if (!response.ok) throw new Error("API Error");
                    let json = await response.json();
                    let reply = json.candidates[0].content.parts[0].text;

                    this.messages.push({ role: 'opponent', text: reply });
                } catch (e) {
                    this.messages.push({ role: 'system', text: "Connection error. The simulation has ended." });
                } finally {
                    this.loading = false;
                    this.$nextTick(() => this.scrollToBottom());
                }
            },

            // --- NEW: COACHING PROMPT GENERATOR ---
            generateCoachPrompt() {
                // Convert the chat array into a readable script
                const transcript = this.messages.map(m => 
                    `${m.role === 'user' ? 'ME' : 'OPPONENT'}: "${m.text}"`
                ).join("\n\n");

                return `ACT AS: A Master Negotiation Coach (FBI Hostage Negotiator Style).

## THE SCENARIO
I just role-played a high-stakes conversation.
- **My Role:** ${this.scenario.myRole}
- **Opponent:** ${this.scenario.opponent}
- **Topic:** ${this.scenario.topic}

## THE TRANSCRIPT
${transcript}

## YOUR COACHING REPORT
1. **The Grading:** Rate my influence skills (1-10). Did I convince them?
2. **The "Labeling" Analysis:** Did I acknowledge their pain ("It sounds like you are worried about...") or did I just argue facts?
3. **The Missed Opportunity:** Quote one specific line where I used "Jargon" or "Logic" when I should have used "Empathy" or "Business Value".
4. **The Re-Write:** Rewrite my weakest response to be persuasive.

TONE: Direct, tactical, psychological.`;
            }
        },
        
        // ------------------------------------------------------------------
// USER ACTIVITY TRACKING FOR PWA PROMPT (Move to main scope)
// ------------------------------------------------------------------

// Method to increment activity count
trackUserActivity() {
    // Increment the activity counter
    this.userActivityCount++;
    
    // Update last active timestamp
    this.userLastActive = Date.now();
    
    console.log(`User activity count: ${this.userActivityCount}`);
    
    // If user has interacted at least 3 times, start the timer
    if (this.userActivityCount >= 3 && !this.pwaTimer && !this.isPwaPromptActive) {
        this.startPwaTimer();
    }
},

// Start the delayed timer
startPwaTimer() {
    // Clear any existing timer
    if (this.pwaTimer) {
        clearTimeout(this.pwaTimer);
    }
    
    // Set new timer for 5 seconds after 3rd interaction
    this.pwaTimer = setTimeout(() => {
        this.showDelayedPwaPrompt();
    }, 5000);
},

// Method to show the PWA prompt after conditions are met
showDelayedPwaPrompt() {
    // Check if already showing or dismissed
    if (this.isPwaPromptActive || this.showPwaPrompt) {
        return;
    }
    
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                 window.navigator.standalone || 
                 document.referrer.includes('android-app://');
    const dismissed = localStorage.getItem('pwaPromptDismissed');
    
    // Conditions for showing prompt
    if (this.isMobile && !isPWA && !dismissed) {
        this.showPwaPrompt = true;
        this.isPwaPromptActive = true;
        console.log("Showing delayed PWA prompt");
    }
    
    // Reset timer
    this.pwaTimer = null;
},

// Reset activity tracking (if needed)
resetActivityTracking() {
    this.userActivityCount = 0;
    this.userLastActive = Date.now();
    this.isPwaPromptActive = false;
    
    if (this.pwaTimer) {
        clearTimeout(this.pwaTimer);
        this.pwaTimer = null;
    }
},

// Update setupActivityTracking method to use the correct context
setupActivityTracking() {
    // Reset any previous tracking
    this.resetActivityTracking();
    
    // Store reference to this for use in event listeners
    const self = this;
    
    // Track clicks (anywhere on the page)
    document.addEventListener('click', () => {
        self.trackUserActivity();
    }, { passive: true });
    
    // Track scrolling
    document.addEventListener('scroll', () => {
        self.trackUserActivity();
    }, { passive: true });
    
    // Track keyboard input
    document.addEventListener('keydown', () => {
        self.trackUserActivity();
    }, { passive: true });
    
    // Track tool changes (when user selects different tools)
    const trackToolChange = () => {
        self.trackUserActivity();
    };
    
    // Watch for Alpine.js updates to currentTab
    this.$watch('currentTab', trackToolChange);
    this.$watch('currentGroup', trackToolChange);
},

        // ------------------------------------------------------------------
        // CULTURAL DEBT MONITOR (Updated with AI Prompt)
        // ------------------------------------------------------------------
        culturalMonitor: {
            history: [],
            isCheckinOpen: false,
            answers: { q1: null, q2: null, q3: null },
            chartInstance: null,

            init() {
                try {
                    const saved = localStorage.getItem('bilingual_culture_history');
                    if (saved) this.history = JSON.parse(saved);
                } catch (e) { console.error("Load Error", e); }
            },

            submitCheckin() {
                let debt = 0;
                // Q1: Bad News Shared? (If No, Fear exists = High Debt)
                if (this.answers.q1 === 'no') debt += 40; 
                // Q2: HiPPO Override? (If Yes, Ego exists = High Debt)
                if (this.answers.q2 === 'yes') debt += 30;
                // Q3: Shipped Value? (If No, Stagnation = High Debt)
                if (this.answers.q3 === 'no') debt += 30;

                const entry = {
                    date: new Date().toLocaleDateString(),
                    score: debt,
                    timestamp: Date.now()
                };

                this.history.push(entry);
                if (this.history.length > 10) this.history.shift();
                
                localStorage.setItem('bilingual_culture_history', JSON.stringify(this.history));
                
                this.isCheckinOpen = false;
                this.answers = { q1: null, q2: null, q3: null };
                this.renderChart();
            },

            get currentScore() {
                if (this.history.length === 0) return 0;
                return this.history[this.history.length - 1].score;
            },

            get status() {
                const s = this.currentScore;
                if (s < 30) return { label: "HEALTHY", color: "text-primary", desc: "High safety. Fast flow." };
                if (s < 70) return { label: "AT RISK", color: "text-warn", desc: "Friction is building. Intervene now." };
                return { label: "TOXIC", color: "text-risk", desc: "Culture of fear. Transformation stalled." };
            },

            get recommendation() {
                const s = this.currentScore;
                if (s < 30) return "Keep reinforcing the 'No Jargon' rule.";
                if (s < 70) return "Run a 'Bad News' Audit. Ask teams what they are hiding.";
                return "Emergency: Kill a 'Zombie Project' publicly to restore trust.";
            },

            // --- NEW: AI PROMPT GENERATOR ---
            generateCulturePrompt() {
                const s = this.currentScore;
                
                // 1. Analyze Trend
                let trend = "No historical data yet";
                if (this.history.length >= 2) {
                    const prev = this.history[this.history.length - 2].score;
                    if (s > prev) trend = "⚠️ WORSENING. Fear is increasing.";
                    else if (s < prev) trend = "✅ IMPROVING. Safety is returning.";
                    else trend = "STAGNANT. We are stuck.";
                }

                // 2. Select Context
                let context = "";
                if (s >= 70) context = "My team is paralyzed by fear (High Debt). They hide bad news and wait for orders.";
                else if (s >= 30) context = "My team is experiencing friction. We have pockets of agility, but 'HiPPO' (Highest Paid Person's Opinion) often overrides data.";
                else context = "My team is performing well (Low Debt), but I need to prevent complacency.";

                return `ACT AS: An Organizational Psychologist and Agile Transformation Coach.

## THE DATA (CULTURAL DEBT MONITOR)
I track my team's "Cultural Debt" (friction, fear, and lack of flow).
- **CURRENT DEBT SCORE:** ${s}% (0% is perfect, 100% is toxic)
- **TREND:** ${trend}

## THE DIAGNOSIS
${context}

## YOUR MISSION
Design a **"Psychological Safety Intervention"** for my next team meeting.
1. **The Root Cause:** Based on the score of ${s}%, explain *why* innovation is failing (reference "Westrum Organizational Culture").
2. **The Ritual:** Propose 1 specific, non-cringe ritual to lower this debt (e.g., "The Pre-Mortem", "Failure Cake", or "Red Carding").
3. **The Script:** Write the exact opening 3 sentences I should say to the team to authorize candor and vulnerability.

TONE: Empathetic, scientifically grounded, but actionable.`;
            },

            reset() {
                if(confirm("Clear all history?")) {
                    this.history = [];
                    localStorage.removeItem('bilingual_culture_history');
                    if(this.chartInstance) this.chartInstance.destroy();
                }
            },

            renderChart() {
                // (Chart rendering logic remains the same)
                if (typeof Chart === 'undefined') return;
                setTimeout(() => {
                    const ctx = document.getElementById('debtChart');
                    if (!ctx) return;
                    if (this.chartInstance) this.chartInstance.destroy();
                    const color = this.currentScore > 50 ? '#f87171' : '#4ade80';
                    this.chartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: this.history.map(h => h.date),
                            datasets: [{
                                label: 'Debt %',
                                data: this.history.map(h => h.score),
                                borderColor: color,
                                backgroundColor: color + '20',
                                tension: 0.4,
                                fill: true
                            }]
                        },
                        options: { scales: { y: { min: 0, max: 100 }, x: { display: false } }, plugins: { legend: { display: false } } }
                    });
                }, 100);
            }
        },
    
        // ------------------------------------------------------------------
// TEAM COLLABORATION MANAGER
// ------------------------------------------------------------------
teamManager: {
    activeTeam: null, // { id, name, code }
    memberResults: [], // Array of results from DB
    isLoading: false,
    view: 'intro', // intro, dashboard
    joinInput: '',
    createInput: '',
    
    // 1. Create a Team
    async createTeam() {
        if (!this.createInput) return alert("Please enter a team name.");
        this.isLoading = true;
        
        // Generate a simple 6-char code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { data, error } = await this.supabase
            .from('teams')
            .insert({ name: this.createInput, join_code: code })
            .select()
            .single();

        this.isLoading = false;

        if (error) {
            console.error(error);
            alert("Error creating team.");
        } else {
            this.activeTeam = data;
            this.view = 'dashboard';
            this.createInput = '';
            // Save to local storage so they stay logged in on refresh
            localStorage.setItem('bilingual_active_team', JSON.stringify(data));
        }
    },

    // 2. Join a Team
    async joinByLink(code) {
        this.joinInput = code;
        await this.joinTeam();
    },

    async joinTeam() {
        if (!this.joinInput) return alert("Enter a code.");
        this.isLoading = true;

        const { data, error } = await this.supabase
            .from('teams')
            .select('*')
            .eq('join_code', this.joinInput.toUpperCase())
            .single();

        this.isLoading = false;

        if (error || !data) {
            alert("Team not found. Check the code.");
        } else {
            this.activeTeam = data;
            this.view = 'dashboard';
            localStorage.setItem('bilingual_active_team', JSON.stringify(data));
            this.fetchResults(); // Get existing members
        }
    },

    // 3. Fetch Team Data
    async fetchResults() {
        if (!this.activeTeam) return;
        
        const { data, error } = await this.supabase
            .from('team_results')
            .select('*')
            .eq('team_id', this.activeTeam.id);

        if (data) {
            this.memberResults = data;
            this.updateTeamCharts();
        }
    },

    // 4. Submit My Score to the Team
    async submitScore(scores, role, total) {
        if (!this.activeTeam) return;

        await this.supabase.from('team_results').insert({
            team_id: this.activeTeam.id,
            role: role || 'Anonymous',
            scores: scores,
            total_score: total
        });
        
        // Refresh view
        this.fetchResults();
    },

    // 5. Generate Share Link
        copyInvite() {
        // 1. Get the clean Base URL (removes any existing ?params)
        // If you want to force your production domain, replace 'baseUrl' string below with:
        // const baseUrl = "https://bilingualexecutive.amrelharony.com/";
        const baseUrl = window.location.href.split('?')[0];
        
        // 2. Append the team code
        const url = `${baseUrl}?team_code=${this.activeTeam.join_code}`;
        
        // 3. Copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url)
                .then(() => alert("Team Invite Link copied! Sending this link will auto-open the Agile Audit tab."))
                .catch(() => prompt("Copy this link:", url));
        } else {
            prompt("Copy this link:", url);
        }
    },


    // 6. Metrics Calculation
    get alignmentScore() {
        if (this.memberResults.length < 2) return 100;
        // Calculate standard deviation of total scores
        const scores = this.memberResults.map(m => m.total_score);
        const mean = scores.reduce((a, b) => a + b) / scores.length;
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        
        // Heuristic: Low deviation = High alignment
        // 100 - (StdDev * 2) clamped to 0-100
        return Math.max(0, Math.round(100 - (stdDev * 2)));
    },

    logout() {
        this.activeTeam = null;
        this.memberResults = [];
        this.view = 'intro';
        localStorage.removeItem('bilingual_active_team');
    },

    // Helper for Chart.js
    updateTeamCharts() {
        // Find the radar chart and update datasets
        // (Implementation depends on where we render the team chart, addressed in HTML)
    }
},

        // ---------------------------------------------------------
        //  THE NEW TALENT MANAGER (Advanced Prompt Logic)
        // ---------------------------------------------------------
        talentManager: {
            // 1. Behaviors (Matrix of descriptions)
            getBehavior(index, val) {
                const descriptions = [
                    ["I fear developers.", "I rely on translators.", "I speak to developers.", "I challenge the architecture.", "I write code."], 
                    ["I ignore the money.", "I know the budget.", "I understand the P&L.", "I link Code to Cash.", "I model unit economics."], 
                    ["I trust gut feel.", "I read reports.", "I query data (SQL).", "I interpret patterns.", "I build data products."], 
                    ["I am a robot.", "I avoid friction.", "I navigate politics.", "I manage stakeholders.", "I rewire the org culture."], 
                    ["I panic in ambiguity.", "I prefer stability.", "I adapt to change.", "I drive the change.", "I thrive in chaos."] 
                ];
                return descriptions[index][val - 1];
            },

            // 2. Archetype Logic
            getArchetype(skills) {
                if(!skills) return { label: "Loading...", icon: "" };

                const tech = skills[0].val; 
                const biz = skills[1].val;  
                const eq = skills[3].val;
                
                const allScores = skills.map(s => s.val);
                const isFlat = allScores.every(val => val === 3); 
                
                if (isFlat) return { label: "MEDIOCRE GENERALIST", icon: "fa-solid fa-circle-pause", desc: "Warning: Jack of all trades, master of none." };

                if (tech >= 4 && biz >= 4) return { label: "THE BILINGUAL", icon: "fa-solid fa-crown", desc: "Unicorn. Can lead the entire unit." };
                if (tech >= 4 && eq <= 2) return { label: "TECHNICAL SPIKE", icon: "fa-solid fa-code", desc: "Great implementer. Needs a Product Owner partner." };
                if (biz >= 4 && tech <= 2) return { label: "BUSINESS SPIKE", icon: "fa-solid fa-briefcase", desc: "Great vision. Needs a strong Tech Lead." };
                if (eq >= 4 && biz >= 3) return { label: "CULTURAL GLUE", icon: "fa-solid fa-handshake", desc: "Essential for unblocking political friction." };
                
                return { label: "GROWTH PROFILE", icon: "fa-solid fa-seedling", desc: "Developing specific spikes." };
            },

            // 3. THE ADVANCED PROMPT GENERATOR
            generateSystemPrompt(skills) {
                if(!skills) return "";
                const arch = this.getArchetype(skills);
                
                // Identify Spikes (Strengths > 3) and Gaps (Weaknesses < 3)
                const spikes = skills.filter(s => s.val >= 4).map(s => s.label).join(", ");
                const gaps = skills.filter(s => s.val <= 2).map(s => s.label).join(", ");

                return `ACT AS: An Executive Career Coach for a Banking Leader.

## MY PROFILE (THE BILINGUAL RADAR)
I have assessed my skills on a scale of 1-5. Here is my reality:
- **ARCHETYPE:** ${arch.label} (${arch.desc})
- **MY SPIKES (Superpowers):** ${spikes || "None yet (I am a Generalist)"}
- **MY GAPS (Risks):** ${gaps || "None (I am balanced)"}

## FULL DATA
${skills.map(s => `- ${s.label}: ${s.val}/5`).join('\n')}

## YOUR INSTRUCTIONS
1. **Analyze my Gaps:** Based on my low scores, tell me exactly which meetings I should NOT attend alone, and who I need to hire (e.g., if I am low on Tech, do I need a strong CTO or a Solution Architect?).
2. **Leverage my Spikes:** How can I use my high scores to gain political capital immediately?
3. **The 30-Day Plan:** Give me 3 concrete actions to become "Bilingual" (fluent in both Tech and Business).
4. **Tone:** Be ruthless but helpful. No corporate fluff. Speak like a Silicon Valley V.C.`;
            },

            getVerdict(skills) {
                const isSpiky = skills.some(s => s.val >= 4) && skills.some(s => s.val <= 2);
                const isFlat = skills.every(s => s.val === 3);
                
                if (isFlat) return "🚫 REJECT: Mediocre Generalist. Needs decisive spikes.";
                if (isSpiky) return "✅ HIRE/PROMOTE: Strong Spikes detected. Build support around gaps.";
                return "⚠️ PROCEED WITH CAUTION: Lacks extreme spikes.";
            }
        },

        
// ------------------------------------------------------------------
        //  API SANDBOX (Updated with Architecture Blueprint Prompt)
        // ------------------------------------------------------------------
        apiSandbox: {
            pipeline: [], 
            isRunning: false,
            result: null,
            
            catalog: [
                { id: 'mainframe', label: 'Legacy Core (COBOL)', latency: 2000, risk: 'High', icon: 'fa-server', color: 'text-risk border-risk bg-risk/10' },
                { id: 'esb', label: 'Enterprise Bus (ESB)', latency: 800, risk: 'Med', icon: 'fa-network-wired', color: 'text-warn border-warn bg-warn/10' },
                { id: 'api', label: 'Modern REST API', latency: 100, risk: 'Low', icon: 'fa-cloud', color: 'text-blue-400 border-blue-400 bg-blue-400/10' },
                { id: 'cache', label: 'Redis Cache', latency: 10, risk: 'Low', icon: 'fa-bolt', color: 'text-yellow-400 border-yellow-400 bg-yellow-400/10' },
                { id: 'firewall', label: 'Legacy Firewall', latency: 500, risk: 'Low', icon: 'fa-shield-halved', color: 'text-slate-400 border-slate-400 bg-slate-400/10' }
            ],

            addComponent(item) {
                if (this.pipeline.length < 5) {
                    this.pipeline.push({ ...item, uid: Date.now() });
                    this.result = null;
                }
            },

            removeComponent(index) {
                this.pipeline.splice(index, 1);
                this.result = null;
            },

            reset() {
                this.pipeline = [];
                this.result = null;
                this.isRunning = false;
            },

            async runSimulation() {
                if (this.pipeline.length === 0) return;
                
                this.isRunning = true;
                this.result = null;

                const totalLatency = this.pipeline.reduce((sum, item) => sum + item.latency, 0);
                
                // Visual delay (capped at 3s for UX)
                const animationTime = Math.min(totalLatency, 2500); 
                await new Promise(r => setTimeout(r, animationTime));

                this.isRunning = false;
                
                let message = "";
                if (totalLatency < 300) message = "🚀 REAL-TIME READY. This stack can handle high-frequency trading or instant payments.";
                else if (totalLatency < 1500) message = "⚠️ HYBRID LAG. Functional, but the legacy hops are killing your customer experience.";
                else message = "🐢 TIMEOUT RISK. This architecture is too brittle for mobile banking.";

                this.result = {
                    time: totalLatency,
                    message: message
                };
            },

            // --- NEW: ARCHITECT PROMPT GENERATOR ---
            generateArchPrompt() {
                if (this.pipeline.length === 0) return "Please add components to the board first.";

                const stack = this.pipeline.map(p => p.label).join(" --> ");
                const totalLatency = this.pipeline.reduce((sum, item) => sum + item.latency, 0);
                const hasMainframe = this.pipeline.some(p => p.id === 'mainframe');
                const hasCache = this.pipeline.some(p => p.id === 'cache');

                let bottleneck = "";
                if (hasMainframe) bottleneck = "The Mainframe Core is the bottleneck. Direct dependency creates coupling.";
                else if (totalLatency > 1000) bottleneck = "Too many hops. The Enterprise Bus (ESB) is adding unnecessary drag.";
                else bottleneck = "Latency is acceptable, but check for Single Points of Failure.";

                return `ACT AS: A Chief Enterprise Architect.

## THE CURRENT ARCHITECTURE (DATA PATH)
I have mapped the "Happy Path" of a critical transaction:
**USER REQUEST** --> ${stack}

## PERFORMANCE METRICS
- **Total Round-Trip Latency:** ${totalLatency}ms
- **Bottleneck Identified:** ${bottleneck}
- **Modernization Status:** ${hasCache ? "Partial (Caching Layer Active)" : "Raw (Direct Hits)"}

## YOUR MISSION (MODERNIZATION ROADMAP)
Draft a **Technical Architecture Standard** document to fix this flow.
1. **The Pattern:** Recommend a specific pattern to decouple this (e.g., Strangler Fig, Anti-Corruption Layer, or CQRS).
2. **The Fix:** Explain how to drop the latency by 50% without rewriting the Core immediately.
3. **The Governance:** Write a "Thou Shalt Not" rule for developers regarding this specific stack (e.g., "No direct calls to Mainframe from Mobile").

TONE: Technical, authoritative, pragmatic.`;
            }
        },
        
        // ------------------------------------------------------------------
        // WHAT-IF WAR ROOM (Updated with Red Team Prompt)
        // ------------------------------------------------------------------
        whatIf: {
            input: '',
            loading: false,
            result: null,
            
            // Strategic Presets
            examples: [
                { title: "Outsourcing Core", text: "What if we outsource our Core Banking maintenance to a vendor to save 20% OpEx?" },
                { title: "The GenAI Bet", text: "What if we replace Tier-1 Customer Support with an autonomous AI Agent?" },
                { title: "The Freeze", text: "What if we implement a total hiring freeze for 12 months to hit EBITDA targets?" }
            ],

            setInput(text) {
                this.input = text;
            },

            // --- NEW: RED TEAM PROMPT GENERATOR ---
            generateWarGamePrompt() {
                const scenario = this.input || "[Insert Strategic Scenario Here]";
                
                return `ACT AS: A "Red Team" Strategist for a Global Bank.

## THE HYPOTHESIS
Management is considering the following strategic move:
"${scenario}"

## YOUR MISSION (WAR GAME SIMULATION)
Do not give me a balanced view. Your job is to find the breaking points. Conduct a "Pre-Mortem" analysis assuming we are 12 months in the future and this decision has failed catastrophically.

## REPORT STRUCTURE
1. **The "Black Swan" Event:** Describe the specific worst-case scenario that caused the failure.
2. **Second-Order Effects:** We know the immediate benefit (e.g., cost savings), but what is the hidden secondary cost? (e.g., loss of institutional knowledge, regulatory fine, talent exodus).
3. **The "Kill Switch":** What is the one leading indicator we must watch? If this metric turns red, we must abort immediately.

TONE: Paranoid, analytical, risk-obsessed.`;
            },

            async analyze() {
                if (!this.input.trim()) return;
                
                this.loading = true;
                this.result = null;

                const API_KEY = localStorage.getItem('bilingual_api_key');
                if (!API_KEY) {
                    this.result = "<p class='text-risk font-bold'>Error: API Key missing. Use the 'Copy Prompt' button below to run this in your own AI tool.</p>";
                    this.loading = false;
                    return;
                }

                try {
                    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: this.generateWarGamePrompt() }] }] })
                    });
                    
                    if (!response.ok) throw new Error("API Error");
                    let json = await response.json();
                    let rawText = json.candidates[0].content.parts[0].text;
                    
                    this.result = DOMPurify.sanitize(marked.parse(rawText));

                } catch (e) {
                    this.result = `<p class='text-risk'>Simulation Failed: ${e.message}. Use the Copy button below.</p>`;
                } finally {
                    this.loading = false;
                }
            }
        },
        
        // ------------------------------------------------------------------
        // NAVIGATION & TOOLS
        // ------------------------------------------------------------------
       // Inside Alpine.data('toolkit', ...)

currentGroup: 'radar', // Default view

// New Navigation Groups
navGroups: [
    { id: 'radar', label: 'Radar', icon: 'fa-solid fa-bullseye', desc: 'Diagnostics & Metrics' },
    { id: 'academy', label: 'Academy', icon: 'fa-solid fa-graduation-cap', desc: 'Learning & Audio' },
    { id: 'forge', label: 'Forge', icon: 'fa-solid fa-hammer', desc: 'Builders & Tools' },
    { id: 'sims', label: 'Sims', icon: 'fa-solid fa-gamepad', desc: 'Roleplay & Scenarios' }
],

// Group the tools
tools: {
    radar: [
        { id: 'assessment', label: 'Agile Audit', icon: 'fa-solid fa-clipboard-check', color: 'text-primary' },
        { id: 'culture', label: 'Debt Monitor', icon: 'fa-solid fa-heart-pulse', color: 'text-risk' },
        { id: 'talent', label: 'Talent Radar', icon: 'fa-solid fa-fingerprint', color: 'text-hotpink' },
        { id: 'compass', label: 'Strategy Compass', icon: 'fa-regular fa-compass', color: 'text-purple-400' },
        { id: 'matrix', label: 'Decision Matrix', icon: 'fa-solid fa-chess-board', color: 'text-blue-400' }
    ],
    academy: [
        { id: 'manual', label: 'Field Manual', icon: 'fa-solid fa-headphones', color: 'text-white' }, // NotebookLM Feature
        { id: 'translator', label: 'Translator', icon: 'fa-solid fa-language', color: 'text-blue-300' },
        { id: 'board', label: 'Board Guide', icon: 'fa-solid fa-chess-king', color: 'text-yellow-400' },
        { id: 'quiz', label: 'Flashcards', icon: 'fa-solid fa-layer-group', color: 'text-cyan-400' },
        { id: 'glossary', label: 'Glossary', icon: 'fa-solid fa-book', color: 'text-slate-400' }
    ],
    forge: [
        { id: 'kpi', label: 'Outcome Gen', icon: 'fa-solid fa-wand-magic-sparkles', color: 'text-green-400' },
        { id: 'lighthouse', label: 'Lighthouse Kit', icon: 'fa-solid fa-lightbulb', color: 'text-yellow-400' },
        { id: 'canvas', label: 'Data Product', icon: 'fa-solid fa-file-contract', color: 'text-blue-500' },
        { id: 'roi', label: 'ROI Calc', icon: 'fa-solid fa-calculator', color: 'text-green-500' },
        { id: 'repair', label: 'Repair Kit', icon: 'fa-solid fa-toolbox', color: 'text-red-400' }
    ],
    sims: [
        { id: 'simulator', label: 'Case Study', icon: 'fa-solid fa-chess-knight', color: 'text-white' },
        { id: 'roleplay', label: 'Negotiation Dojo', icon: 'fa-solid fa-user-tie', color: 'text-orange-400' },
        { id: 'whatif', label: 'War Games', icon: 'fa-solid fa-chess-rook', color: 'text-purple-500' },
        { id: 'sandbox', label: 'Arch Sandbox', icon: 'fa-solid fa-shapes', color: 'text-cyan-500' }
    ]
},
        
        dashboardTools: [ 
            { id: 'simulator', label: 'Case Simulator', desc: 'Practice bilingual decision making.', icon: 'fa-solid fa-chess-knight', color: 'text-primary' },
            { id: 'whatif', label: 'Scenario Planner', desc: 'AI-powered strategic simulation.', icon: 'fa-solid fa-chess-rook', color: 'text-purple-400' },
            { id: 'roleplay', label: 'Role-Play Dojo', desc: 'Simulate high-stakes conversations.', icon: 'fa-solid fa-user-tie', color: 'text-warn' },
            { id: 'sandbox', label: 'API Sandbox', desc: 'Visualize architecture & speed.', icon: 'fa-solid fa-shapes', color: 'text-cyan-400' },
            { id: 'quiz', label: 'Flashcards', desc: 'Test your fluency in tech jargon.', icon: 'fa-solid fa-graduation-cap', color: 'text-cyan-400' },
            { id: 'culture', label: 'Debt Monitor', desc: 'Track organizational health.', icon: 'fa-solid fa-heart-pulse', color: 'text-risk' },
            { id: 'assessment', label: 'Agile Audit', desc: 'Assess organizational maturity.', icon: 'fa-solid fa-stethoscope', color: 'text-primary' }, 
            { id: 'matrix', label: 'Strategy Matrix', desc: 'Build vs Buy decision framework.', icon: 'fa-solid fa-chess-board', color: 'text-purple-400' }, 
            { id: 'translator', label: 'Translator', desc: 'Decode jargon into business value.', icon: 'fa-solid fa-language', color: 'text-blue-400' }, 
            { id: 'talent', label: 'Talent Radar', desc: 'Identify skill gaps in squads.', icon: 'fa-solid fa-fingerprint', color: 'text-hotpink' }, 
            { id: 'lighthouse', label: 'Lighthouse', desc: 'Checklist for successful pilots.', icon: 'fa-solid fa-lightbulb', color: 'text-warn' }, 
            { id: 'repair', label: 'Repair Kit', desc: 'Fix stalled transformations.', icon: 'fa-solid fa-toolbox', color: 'text-risk' }, 
            { id: 'roi', label: 'Lighthouse ROI', desc: 'Quantify Hard & Soft value. Generate Board Defense script.', icon: 'fa-solid fa-chart-pie', color: 'text-green-400', vip: false },
            { id: 'kpi', label: 'Outcome Generator',  desc: 'Turn "Project Outputs" into "Business Outcomes". Build the perfect prompt.',  icon: 'fa-solid fa-wand-magic-sparkles', color: 'text-green-400'},
            { id: 'architect', label: 'Architect Console', desc: 'Access High-Level Scripts.', icon: 'fa-solid fa-microchip', color: 'text-hotpink', vip: true } 
        ],
        
        // ------------------------------------------------------------------
        // METHODS
        // ------------------------------------------------------------------
  

formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
},
        
// Seek to specific time
seekVideo(sliderValue) {
    const newTime = parseFloat(sliderValue);
    
    if (this.player && this.player.seekTo) {
        this.player.seekTo(newTime, true); // true = allowSeekAhead
        this.videoCurrentTime = newTime; // Update immediately
        
        // If video was paused, play it after seeking
        if (!this.videoPlaying && this.player.playVideo) {
            this.player.playVideo();
        }
    }
},

        // Set volume (0-100)
setPlayerVolume(newVolume) {
    const volume = parseInt(newVolume);
    this.videoVolume = volume;
    
    if (this.player && this.player.setVolume) {
        this.player.setVolume(volume);
        
        // Update mute state
        if (volume === 0) {
            this.videoMuted = true;
        } else {
            this.videoMuted = false;
            this.volumeBeforeMute = volume; // Remember volume when unmuting
        }
    }
},

// Updated toggleVideoPlay method (keep existing but add interval logic)
toggleVideoPlay() {
    if (this.player && this.player.getPlayerState) {
        if (this.videoPlaying) {
            this.player.pauseVideo();
            this.videoPlaying = false;
            
            // Clear interval when paused
            if (this.updateTimeInterval) {
                clearInterval(this.updateTimeInterval);
                this.updateTimeInterval = null;
            }
        } else {
            this.player.playVideo();
            this.videoPlaying = true;
        }
    }
},

// Toggle Fullscreen
toggleFullscreen() {
    const videoContainer = document.querySelector('.group'); // The video container div
    
    if (!this.isFullscreen) {
        // Enter fullscreen
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) { /* Safari */
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) { /* IE11 */
            videoContainer.msRequestFullscreen();
        }
        
        this.isFullscreen = true;
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
        
        this.isFullscreen = false;
    }
},

// Listen for fullscreen changes
initFullscreenListeners() {
    document.addEventListener('fullscreenchange', () => {
        this.isFullscreen = !!document.fullscreenElement;
    });
    
    document.addEventListener('webkitfullscreenchange', () => {
        this.isFullscreen = !!document.webkitFullscreenElement;
    });
    
    document.addEventListener('msfullscreenchange', () => {
        this.isFullscreen = !!document.msFullscreenElement;
    });
},

        
// Updated toggleVideoMute method
toggleVideoMute() {
    if (this.player) {
        if (this.videoMuted) {
            // Unmute and restore previous volume
            if (this.player.unMute) this.player.unMute();
            if (this.player.setVolume) this.player.setVolume(this.volumeBeforeMute || 50);
            
            this.videoMuted = false;
            this.videoVolume = this.volumeBeforeMute || 50;
        } else {
            // Mute and remember current volume
            this.volumeBeforeMute = this.videoVolume;
            
            if (this.player.mute) this.player.mute();
            
            this.videoMuted = true;
            this.videoVolume = 0;
        }
    }
},

   enterApp() {
    this.showLanding = false;
    // mark that they've entered
    localStorage.setItem('app_entered', 'true');
    
    // Stop the video completely to save battery/data
    if (this.player && this.player.stopVideo) {
        this.player.stopVideo();
    }
    if (navigator.vibrate) navigator.vibrate(50);
    
    // Start tracking user activity
    this.setupActivityTracking();
    
    // Also set a fallback timer (in case user is not active enough)
    // This ensures prompt shows after 60 seconds regardless of activity
    setTimeout(() => {
        if (!this.isPwaPromptActive && !this.showPwaPrompt) {
            this.showDelayedPwaPrompt();
        }
    }, 60000); // 60 second fallback
}, 

        
        // Set up event listeners for activity tracking
setupActivityTracking() {
    // Reset any previous tracking
    this.resetActivityTracking();
    
    // Track clicks (anywhere on the page)
    document.addEventListener('click', () => {
        this.trackUserActivity();
    }, { passive: true });
    
    // Track scrolling
    document.addEventListener('scroll', () => {
        this.trackUserActivity();
    }, { passive: true });
    
    // Track keyboard input
    document.addEventListener('keydown', () => {
        this.trackUserActivity();
    }, { passive: true });
    
    // Track tool changes (when user selects different tools)
    const trackToolChange = () => {
        this.trackUserActivity();
    };
    
    // Watch for Alpine.js updates to currentTab
    this.$watch('currentTab', trackToolChange);
    this.$watch('currentGroup', trackToolChange);
},

        


        // Add this method to your main Alpine data object (around other methods)
copyToClipboard(text, label = "Content") {
    if (!text || text.trim() === '') {
        alert(`Nothing to copy for ${label}`);
        return;
    }
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show a success message
                const originalText = this.copyBtnText;
                this.copyBtnText = `✓ Copied ${label}`;
                setTimeout(() => {
                    this.copyBtnText = originalText;
                }, 2000);
                
                // Optional: Haptic feedback on mobile
                if (navigator.vibrate) navigator.vibrate(50);
            })
            .catch((err) => {
                console.error('Clipboard write failed:', err);
                alert(`Failed to copy ${label}. Please copy manually:\n\n${text}`);
            });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            const originalText = this.copyBtnText;
            this.copyBtnText = `✓ Copied ${label}`;
            setTimeout(() => {
                this.copyBtnText = originalText;
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
            prompt(`Please copy this ${label}:`, text);
        }
        
        document.body.removeChild(textArea);
    }
},


        triggerVipSequence() {
            this.isVipMode = true;
            this.showVipIntro = true;
            setTimeout(() => { this.bootStep = 1; this.bootProgress = 30; }, 500);
            setTimeout(() => { this.bootStep = 2; this.bootProgress = 60; }, 1500);
            setTimeout(() => { this.bootStep = 3; this.bootProgress = 100; }, 2500);
            setTimeout(() => { this.showVipIntro = false; this.currentTab = 'architect'; }, 4000);
        },

        dismissPwa() { 
    this.showPwaPrompt = false; 
    this.isPwaPromptActive = false;
    try { 
        localStorage.setItem('pwaPromptDismissed', 'true'); 
    } catch(e){}
    
    // Reset activity tracking so it doesn't trigger again
    this.resetActivityTracking();
},


        async installPwa() {
    if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            this.deferredPrompt = null;
            this.showPwaPrompt = false;
            this.isPwaPromptActive = false;
        }
    } else {
        alert("To install on iPhone:\n1. Tap the 'Share' button (square with arrow)\n2. Scroll down and tap 'Add to Home Screen'");
        this.dismissPwa();
    }
},

        handleNavClick(tab) {
            this.currentTab = tab;
            this.mobileMenuOpen = false;
            this.$nextTick(() => {
                if (tab === 'talent') this.updateTalentChart();
                if (tab === 'assessment' && this.assessmentSubmitted) this.updateGapChart();
                if (tab === 'culture') this.culturalMonitor.renderChart();
            });
        },


        copyChallengeLink() {
            const scores = this.assessmentData.flatMap(s => s.questions.map(q => q.score));
            const payload = btoa(JSON.stringify({ scores, title: "Executive Peer" }));
            const url = `${window.location.origin}${window.location.pathname}?challenger=${payload}`;
            this.copyToClipboard(url, "Challenge Link");
        },

        // ------------------------------------------------------------------
        // STANDARD PDF REPORT GENERATOR
        // ------------------------------------------------------------------
        async generatePDF() {
            if (!window.jspdf) { alert("PDF library not loaded. Please refresh."); return; }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // 1. Get Scores
            const score = this.calculateScore.total;
            const result = this.getAssessmentResult();
            
            // 2. Define Colors
            const darkBg = [15, 23, 42]; 
            const offWhite = [241, 245, 249]; 
            const grey = [148, 163, 184];
            let accentColor;
            
            // Match color to score bucket
            if (score <= 40) accentColor = [248, 113, 113]; // Red
            else if (score <= 60) accentColor = [251, 191, 36]; // Yellow
            else accentColor = [74, 222, 128]; // Green

            // 3. Draw PDF
            // Background
            doc.setFillColor(...darkBg); 
            doc.rect(0, 0, 210, 297, "F");
            
            // Header
            doc.setTextColor(...accentColor); 
            doc.setFont("helvetica", "bold"); 
            doc.setFontSize(14); 
            doc.text("THE BILINGUAL EXECUTIVE TOOLKIT // AUDIT REPORT", 20, 20);
            
            doc.setTextColor(...grey); 
            doc.setFont("helvetica", "normal"); 
            doc.setFontSize(10); 
            doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, 20, 28);
            
            doc.setDrawColor(...grey); 
            doc.line(20, 35, 190, 35);
            
            // Score
            doc.setFontSize(60); 
            doc.setTextColor(...accentColor); 
            doc.text(`${score} / 75`, 20, 60);
            
            // Title & Description
            doc.setFontSize(22); 
            doc.setTextColor(...offWhite); 
            doc.text(result.title, 20, 75);
            
            doc.setFontSize(12); 
            doc.setTextColor(...grey); 
            doc.text(doc.splitTextToSize(result.desc, 170), 20, 85);
            
            // Veto Warnings
            if(this.calculateScore.isSafetyVeto) {
                doc.setTextColor(248, 113, 113);
                doc.text("!!! SAFETY VETO APPLIED: SCORE CAPPED AT 40", 20, 110);
                doc.setFontSize(10);
                doc.text("Reason: Low Psychological Safety detected.", 20, 116);
            }
            
            // 4. Save
            doc.save("Executive_Audit_Report.pdf");
        },

        // ------------------------------------------------------------------
        // ROADMAP GENERATOR
        // ------------------------------------------------------------------
        async generateRoadmap() {
            if (!window.jspdf) { alert("PDF library loading..."); return; }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // 1. GET SCORES
            const dataScore = this.assessmentData[0].questions.reduce((a,b)=>a+b.score,0);
            const deliveryScore = this.assessmentData[1].questions.reduce((a,b)=>a+b.score,0);
            const cultureScore = this.assessmentData[2].questions.reduce((a,b)=>a+b.score,0);
            const total = this.calculateScore.total;
            
            // 2. DIAGNOSE THE "BURNING PLATFORM" (Weakest Link)
            let focusArea = "General Optimization";
            let chapterRef = "Chapter 7: The Playbook";
            let specificTask = "Launch a Lighthouse Pilot";
            
            if (cultureScore <= 8) {
                focusArea = "Toxic Culture";
                chapterRef = "Chapter 3: Cultural Debt & Chapter 8: Leadership";
                specificTask = "Run a 'Bad News' Audit (kill the Green Light lies).";
            } else if (dataScore <= 8) {
                focusArea = "Data Swamp";
                chapterRef = "Chapter 2: Data Millstone & Chapter 5: Governance";
                specificTask = "Map the 'Horror Path' of a single report.";
            } else if (deliveryScore <= 8) {
                focusArea = "Waterfall Process";
                chapterRef = "Chapter 4: Agile Mindset & Chapter 6: Project to Product";
                specificTask = "Automate one compliance check in the CI/CD pipeline.";
            }

            // 3. GENERATE PDF DESIGN
            
            // Header / Navy Background
            doc.setFillColor(21, 34, 56); // #152238 (Navy)
            doc.rect(0, 0, 210, 40, "F");
            
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
        
            // Dynamic Title Logic
            const title = this.teamManager && this.teamManager.activeTeam 
                ? `TEAM PLAYBOOK: ${this.teamManager.activeTeam.name.toUpperCase()}` 
                : "TRANSFORMATION PLAYBOOK";
            
            doc.text(title, 105, 20, null, "center");
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Generated by The Bilingual Executive App", 105, 30, null, "center");

            // Score Summary
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text(`Total Maturity Score: ${total}/75`, 20, 55);

                        if (this.teamManager && this.teamManager.activeTeam) {
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`Team Alignment: ${this.teamManager.alignmentScore}%`, 20, 62);
            }

            
            // The Diagnosis
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text("PRIMARY BOTTLENECK DETECTED:", 20, 70);
            
            doc.setTextColor(239, 68, 68); // Red for risk
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text(focusArea.toUpperCase(), 20, 80);

            // 90-Day Plan Box
            doc.setDrawColor(46, 139, 131); // Teal
            doc.setLineWidth(1);
            doc.rect(15, 90, 180, 130);

            doc.setTextColor(46, 139, 131); // Teal
            doc.setFontSize(14);
            doc.text("YOUR 90-DAY ACTION PLAN", 105, 100, null, "center");

            // Days 1-30
            doc.setTextColor(0,0,0);
            doc.setFontSize(12);
            doc.text("DAYS 1-30: DIAGNOSE & PROTECT", 25, 115);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`- Read ${chapterRef}.`, 30, 122);
            doc.text(`- ACTION: ${specificTask}`, 30, 128);
            doc.text("- Identify your 'Lighthouse' pilot team.", 30, 134);

            // Days 31-60
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("DAYS 31-60: THE LIGHTHOUSE", 25, 150);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("- Establish the 'Regulatory Sandbox' (Waiver).", 30, 157);
            doc.text("- Deploy first MVP to internal users.", 30, 163);
            doc.text("- Kill one 'Zombie Project' to free up budget.", 30, 169);

            // Days 61-90
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("DAYS 61-90: SHOW & SCALE", 25, 185);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("- Conduct the 'Live Demo' in the Boardroom.", 30, 192);
            doc.text("- Measure 'Time to Value' vs old process.", 30, 198);
            doc.text("- Recruit first 'Bilingual' Product Owner.", 30, 204);

            // Footer
            doc.setFont("helvetica", "italic");
            doc.setTextColor(150, 150, 150);
            doc.text("This plan is automated. Execution is human. Good luck.", 105, 280, null, "center");

            doc.save("Bilingual_Transformation_Map.pdf");
        },

updateTalentChart() {
    // FIX: Stop if Chart.js isn't loaded yet
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js not loaded yet. Retrying...");
        setTimeout(() => this.updateTalentChart(), 500);
        return;
    }

    // Wait for DOM to be ready
    setTimeout(() => {
        const ctx = document.getElementById('talentChart');
        if (!ctx) {
            console.error("Talent chart canvas not found");
            return;
        }
        
        // Destroy old chart if exists
        if (this.talentChartInstance) {
            this.talentChartInstance.destroy();
        }
        
        // Get current skill values
        const labels = this.talentSkills.map(s => s.label);
        const values = this.talentSkills.map(s => s.val);
        const bilingualStandard = [4, 5, 5, 4, 4]; // Ideal shape
        
        // Create new chart
        this.talentChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'You',
                        data: values,
                        backgroundColor: 'rgba(244, 114, 182, 0.2)',
                        borderColor: '#f472b6',
                        borderWidth: 2,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#f472b6',
                        pointRadius: 4
                    },
                    {
                        label: 'Bilingual Standard',
                        data: bilingualStandard,
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                        borderColor: '#475569',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            display: false
                        },
                        grid: {
                            color: '#334155'
                        },
                        angleLines: {
                            color: '#334155'
                        },
                        pointLabels: {
                            color: '#f1f5f9',
                            font: {
                                size: 10,
                                family: '"JetBrains Mono", monospace'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }, 100);
},

    

        updateGapChart() {
            this.$nextTick(() => {
                const ctx = document.getElementById('gapChart');
                if (!ctx || !ctx.getContext) return;
                if (this.gapChartInstance) this.gapChartInstance.destroy();
                
                const my = [
                    this.assessmentData[0].questions.reduce((a,b)=>a+b.score,0), 
                    this.assessmentData[1].questions.reduce((a,b)=>a+b.score,0), 
                    this.assessmentData[2].questions.reduce((a,b)=>a+b.score,0)
                ];
                
                const cs = this.challengerData.scores;
                const ch = [
                    cs.slice(0,5).reduce((a,b)=>a+b,0), 
                    cs.slice(5,10).reduce((a,b)=>a+b,0), 
                    cs.slice(10,15).reduce((a,b)=>a+b,0)
                ];

                this.gapChartInstance = new Chart(ctx, { 
                    type: 'radar', 
                    data: { 
                        labels: ['Data', 'Delivery', 'Culture'], 
                        datasets: [
                            { label: 'You', data: my, borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.2)' }, 
                            { label: 'Challenger', data: ch, borderColor: '#f472b6', backgroundColor: 'rgba(244, 114, 182, 0.2)' }
                        ] 
                    }, 
                    options: { 
                        scales: { 
                            r: { min: 0, max: 25, grid: { color: '#334155' }, angleLines: { color: '#334155' } } 
                        } 
                    } 
                });
            });
        },

        // ------------------------------------------------------------------
        // STATIC DATA
        // ------------------------------------------------------------------
        assessmentData: [
            { title: "Data Velocity", questions: [{text:"Accessibility",score:3,desc:"Can devs get data without a ticket?"},{text:"Quality",score:3,desc:"Is data trusted?"},{text:"Ownership",score:3,desc:"Is ownership clear?"},{text:"Architecture",score:3,desc:"Mesh or Monolith?"},{text:"Trust",score:3,desc:"Single source of truth?"}] },
            { title: "Agile Delivery", questions: [{text:"Funding",score:3,desc:"Projects or Value Streams?"},{text:"Releases",score:3,desc:"Monthly or Daily?"},{text:"Architecture",score:3,desc:"Decoupled?"},{text:"Compliance",score:3,desc:"Manual (1) or Auto (5)?"},{text:"Vendors",score:3,desc:"Partners or Body Shop?"}] },
            { title: "Culture", questions: [{text:"Literacy",score:3,desc:"Does ExCo understand Tech?"},{text:"Safety",score:3,desc:"Is failure punished?"},{text:"Decisions",score:3,desc:"HiPPO or Data?"},{text:"Silos",score:3,desc:"Functional or Squads?"},{text:"Talent",score:3,desc:"Mercenaries or Missionaries?"}] }
        ],
        
        get calculateScore() {
            let total = 0;
            this.assessmentData.forEach(s => s.questions.forEach(q => total += q.score));
            let safety = this.assessmentData[2].questions[1].score;
            let compliance = this.assessmentData[1].questions[3].score;
            if(compliance <= 2) total = Math.floor(total * 0.8); 
            if(safety <= 2) total = Math.min(total, 40);
            return { total, isSafetyVeto: safety<=2, isManualDrag: compliance<=2 };
        },

        // --- NEW: GENERATE STRATEGIC AUDIT PROMPT ---
        generateAuditPrompt() {
            // 1. Get Section Scores
            const dataScore = this.assessmentData[0].questions.reduce((a,b)=>a+b.score,0);
            const deliveryScore = this.assessmentData[1].questions.reduce((a,b)=>a+b.score,0);
            const cultureScore = this.assessmentData[2].questions.reduce((a,b)=>a+b.score,0);
            const total = dataScore + deliveryScore + cultureScore;

            // 2. Identify the "Burning Platform" (Lowest Score)
            const scores = [
                { id: 'Data Velocity', val: dataScore, msg: "Data is a bottleneck. We cannot get insights fast enough." },
                { id: 'Agile Delivery', val: deliveryScore, msg: "Time-to-Market is too slow. Manual gates are killing velocity." },
                { id: 'Organizational Culture', val: cultureScore, msg: "Culture is fear-based. Information flow is blocked." }
            ];
            const weakness = scores.sort((a,b) => a.val - b.val)[0];

            // 3. Build the Generic Prompt
            return `ACT AS: A Chief Strategy Officer presenting to the Board.

## THE CONTEXT (AUDIT DATA)
I have assessed our maturity (Scale 0-75).
- **TOTAL SCORE:** ${total}/75
- **Data Score:** ${dataScore}/25
- **Delivery Score:** ${deliveryScore}/25
- **Culture Score:** ${cultureScore}/25

## THE CRITICAL BOTTLENECK
The assessment identifies **${weakness.id}** as our primary risk factor.
Context: ${weakness.msg}

## YOUR TASK
Generate a **Strategic Executive Brief** (Structured Report).
1. **The Executive Summary:** State the problem in financial terms (Cost of Delay, Risk Exposure), avoiding technical jargon.
2. **The Strategic Pivot:** Propose 1 radical structural change to fix ${weakness.id}.
3. **The 30-Day Roadmap:** Bullet points for immediate execution.

TONE: Professional, objective, high-agency.`;
        },
        
        
        getAssessmentResult() {
            const s = this.calculateScore.total;
            if (s <= 40) return { title: "DANGER ZONE", desc: "Data Swamp. Stop buying AI. Fix culture first." };
            if (s <= 60) return { title: "TRANSITIONING", desc: "Pockets of agility exist but are crushed by legacy governance." };
            return { title: "AGILE BANK", desc: "Market Leader capability. Data flows fast." };
        },

        
        getAssessmentColor() { 
            const s = this.calculateScore.total; 
            return s<=40?'text-risk':s<=60?'text-warn':'text-primary'; 
        },
        
        async finishAssessment() { 
            this.assessmentSubmitted = true; 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 

            // 1. NEW: Sync with Team Dashboard (if active)
            if (this.teamManager && this.teamManager.activeTeam) {
                const simpleScores = this.assessmentData.flatMap(s => s.questions.map(q => q.score));
                // We use await here to ensure data is sent before potentially navigating away
                await this.teamManager.submitScore(simpleScores, this.selectedTitle, this.calculateScore.total);
            }

            // 2. EXISTING: Update Gap Chart (if in Challenger Mode)
            if (this.challengerData) {
                this.$nextTick(() => this.updateGapChart()); 
            }
        },
        
        resetAssessment() { 
            this.assessmentSubmitted = false; 
            try { localStorage.removeItem('bilingual_scores'); } catch(e){} 
            this.assessmentData.forEach(s => s.questions.forEach(q => q.score = 3)); 
        },

async submitAndBenchmark() {
            // 1. Validation
            if (!this.selectedIndustry || !this.selectedTitle) {
                alert("Please select your Organization Type and Role at the top of the Assessment before benchmarking.");
                return;
            }

            this.benchmarkLoading = true;
            const myScore = this.calculateScore.total;
            let total = 0;
            let lower = 0;
            let source = "Live Satellite"; // Default source

            try {
                // 2. Try Supabase (Online Mode)
                if (this.supabase) {
                    // A. Upload your score
                    await this.supabase.from('benchmarks').insert({ 
                        score: myScore, 
                        industry: this.selectedIndustry 
                    });

                    // B. Get counts from DB
                    const { count: dbTotal } = await this.supabase
                        .from('benchmarks')
                        .select('*', { count: 'exact', head: true });
                    
                    const { count: dbLower } = await this.supabase
                        .from('benchmarks')
                        .select('*', { count: 'exact', head: true })
                        .lt('score', myScore);

                    if (dbTotal !== null) {
                        total = dbTotal;
                        lower = dbLower;
                    } else {
                        throw new Error("Database returned null");
                    }
                } else {
                    throw new Error("Supabase not initialized");
                }

            } catch (err) {
                // 3. Fallback to Offline Mode (If DB fails or is blocked)
                console.warn("Switching to Offline Benchmarks:", err);
                source = "Offline Database";

                // Use the variable we created at the bottom of the file
                if (typeof offlineBenchmarks !== 'undefined') {
                    total = offlineBenchmarks.length;
                    // Count how many people in the list have a lower score than you
                    lower = offlineBenchmarks.filter(b => b.score < myScore).length;
                } else {
                    alert("Could not connect to benchmark database.");
                    this.benchmarkLoading = false;
                    return;
                }
            }

            // 4. Calculate Percentile (Same math for both Online & Offline)
            this.totalBenchmarks = total;
            let percentile = 0;
            if (total > 0) {
                const betterThanPercentage = (lower / total) * 100;
                percentile = Math.max(1, Math.round(100 - betterThanPercentage));
            }

            // 5. Generate Message based on Percentile
            let msg = "";
            if (percentile <= 20) msg = "You are leading the market. Your architecture is an asset.";
            else if (percentile >= 50) msg = "You are lagging behind the Fintech Tsunami. Immediate intervention required.";
            else msg = "You are in the pack. Transformation is critical to survive.";

            // 6. Display Result
            this.percentileResult = { rank: `Top ${percentile}%`, msg: msg };
            
            // Optional: Small toast to show if we used offline data
            if (source === "Offline Database") {
                console.log("Benchmark calculated using offline dataset.");
            }
            
            this.benchmarkLoading = false;
        },
        
        getMatrixResult() {
            const { x, y } = this.matrixCoords;
            if (y > 60 && x < 40) return { strategy: "BUILD", desc: "Critical IP. High value, low complexity. Keep in-house." };
            if (y > 60 && x >= 40) return { strategy: "BUY", desc: "High value but hard to build. Buy speed (SaaS/Partner)." };
            if (y <= 60 && x >= 60) return { strategy: "OUTSOURCE", desc: "Non-core commodity. Use standard off-the-shelf tools." };
            return { strategy: "DEPRIORITIZE", desc: "Low value. Don't waste resources." };
        },

        // --- NEW: MATRIX AI PROMPT GENERATOR ---
        generateMatrixPrompt() {
            const x = this.matrixCoords.x; // Technical Complexity
            const y = this.matrixCoords.y; // Strategic Importance
            const result = this.getMatrixResult(); // Re-use existing logic

            // 1. Diagnose the specific strategic implication
            let rationale = "";
            let risk = "";

            if (y > 60 && x < 40) { 
                // BUILD (High Imp, Low Comp)
                rationale = "This is our 'Secret Sauce'. It differentiates us in the market and is feasible to build in-house.";
                risk = "Risk: Over-engineering. We must ensure we don't build a 'Gold Plated' solution.";
            } else if (y > 60 && x >= 40) {
                // PARTNER/BUY (High Imp, High Comp)
                rationale = "This is critical, but too complex to build from scratch. Speed is the priority.";
                risk = "Risk: Vendor Lock-in. We need a strong API abstraction layer to protect our core.";
            } else if (y <= 60 && x >= 60) {
                // OUTSOURCE (Low Imp, High Comp)
                rationale = "This is 'Plumbing'. It's hard to do but adds zero customer value. It's a commodity.";
                risk = "Risk: Distraction. Every hour our best engineers spend on this is an hour lost on innovation.";
            } else {
                // DEPRIORITIZE (Low Imp, Low Comp)
                rationale = "This is a 'Nice to Have'. Low value return.";
                risk = "Risk: Opportunity Cost. We should not be spending budget here.";
            }

            return `ACT AS: A Chief Technology Officer (CTO) and Investment Committee Advisor.

## THE DECISION CONTEXT (BUILD vs BUY)
We are evaluating a technology initiative. I have mapped it on the Strategy Matrix:
- **Strategic Importance:** ${y}% (Does it differentiate us?)
- **Technical Complexity:** ${x}% (How hard is it to build?)

## THE VERDICT: "${result.strategy}"
${result.desc}

## LOGIC
- **Rationale:** ${rationale}
- **Primary Risk:** ${risk}

## YOUR MISSION
Draft a **Decision Memo** for the CFO/Board to approve this path.
1. **The Executive Summary:** Clearly state why we are choosing to ${result.strategy}.
2. **The Financial Case:** Explain the ROI logic (e.g., if Building: "Why Capitalizing this IP creates asset value." | If Buying: "Why OpEx is better than slowing down market entry.").
3. **The Guardrails:** Define 3 constraints to ensure this project doesn't spiral out of control.

TONE: Decisive, fiscally responsible, and technically sound.`;
        },
        
        getCompassResult() {
            const { x, y } = this.compassCoords;
            if (y > 50 && x > 50) return { title: "INNOVATION LEADER (NE)", desc: "Fast growth, but check your safety brakes." };
            if (y <= 50 && x <= 50) return { title: "TRADITIONAL BANKER (SW)", desc: "Safe and cheap, but you are slowly dying." };
            if (y > 50 && x <= 50) return { title: "RISK TAKER (NW)", desc: "High value but high control. Hard to sustain." };
            return { title: "DIGITAL FACTORY (SE)", desc: "Fast execution, but are you building the right thing?" };
        },

        // --- NEW: COMPASS AI PROMPT GENERATOR ---
        generateCompassPrompt() {
            const x = this.compassCoords.x; // Risk vs Speed
            const y = this.compassCoords.y; // Value vs Cost
            const result = this.getCompassResult(); // Re-use existing logic

            // 1. Diagnose the specific quadrant problem
            let diagnosis = "";
            let strategy = "";

            if (y > 50 && x > 50) { 
                // NE: Innovation Leader
                diagnosis = "We are moving fast and building high-value products, BUT we risk 'Burnout' or 'reckless scaling'.";
                strategy = "Focus on 'Sustainable Pace' and 'Platform Stability' to ensure we don't crash.";
            } else if (y <= 50 && x <= 50) {
                // SW: Traditional Banker
                diagnosis = "We are stuck in 'Analysis Paralysis'. Low speed, cost-cutting focus. We are slowly becoming irrelevant.";
                strategy = "We need a 'Regulatory Sandbox' to test ideas faster without waiting for permission.";
            } else if (y > 50 && x <= 50) {
                // NW: The Perfectionist / Risk Taker
                diagnosis = "We build great things, but we build them too slowly. We are gold-plating features.";
                strategy = "Adopt 'MVP Mindset'. Ship imperfect code faster to get market feedback.";
            } else {
                // SE: Digital Factory
                diagnosis = "We are shipping features fast, but they don't move the P&L needle. We are a 'Feature Factory'.";
                strategy = "Stop measuring 'Velocity'. Start measuring 'Outcome'. Kill low-value projects.";
            }

            return `ACT AS: A Chief Digital Officer and Strategy Consultant.

## THE TELEMETRY (MY COMPASS POSITION)
I have plotted my organization's execution style on a matrix:
- **Vertical Axis (North/South):** ${y > 50 ? "High Business Value" : "Cost Center Focus"} (${y}%)
- **Horizontal Axis (West/East):** ${x > 50 ? "High Speed/Velocity" : "Risk Averse/Control"} (${x}%)

## THE DIAGNOSIS: "${result.title}"
${result.desc}
${diagnosis}

## YOUR MISSION
Draft a **Strategic Pivot Memo** for the Executive Committee.
1. **The Reality Check:** Explain why our current position of "${result.title}" is dangerous in the long run.
2. **The Pivot:** Detail the specific ${strategy}
3. **The Culture Hack:** Give me one specific phrase to ban in meetings (e.g., "We've always done it this way") and one phrase to start using.

TONE: Visionary, urgent, but grounded in banking reality.`;
        },

        
        getLighthouseStatus() { 
            const c = this.lighthouseData.filter(i=>i.checked).length; 
            if(c===10) return {title:"GREEN LIGHT", desc:"Launch.", text:"text-primary", border:"border-primary bg-primary/10"}; 
            if(c>=8) return {title:"AMBER LIGHT", desc:"Proceed with caution.", text:"text-warn", border:"border-warn bg-warn/10"}; 
            return {title:"RED LIGHT", desc:"STOP.", text:"text-risk", border:"border-risk bg-risk/10"}; 
        },

        dictionary: [ 
            { banker: "Technical Debt", tech: "Legacy Refactoring", translation: "Interest on past shortcuts. It's making your P&L brittle." }, 
            { banker: "Op-Ex Efficiency", tech: "CI/CD Pipeline", translation: "Automated work that replaces manual human error." }, 
            { banker: "Market Responsiveness", tech: "Microservices", translation: "Breaking the bank into Legos so we can change one part without breaking the rest." }, 
            { banker: "Data Governance", tech: "Data Mesh", translation: "Moving from a central bottleneck to decentralized ownership." }, 
            { banker: "Business Continuity", tech: "Chaos Engineering", translation: "Testing the bank by intentionally breaking things to ensure it survives real disasters." } 
        ],
        
        get filteredDictionary() { 
            const q = this.searchQuery.toLowerCase(); 
            return this.dictionary.filter(i => i.banker.toLowerCase().includes(q) || i.tech.toLowerCase().includes(q) || i.translation.toLowerCase().includes(q)); 
        },

  // ---  LIGHTHOUSE ---

        lighthouseData: [
            {category:"Value",text:"Customer Facing?"},
            {category:"Value",text:"Solving Pain?"},
            {category:"Value",text:"Unarguable Metric?"},
            {category:"Feasibility",text:"Decoupled?"},
            {category:"Feasibility",text:"Anti-Scope Defined?"},
            {category:"Feasibility",text:"MVP in 90 Days?"},
            {category:"Ecosystem",text:"Two-Pizza Team?"},
            {category:"Ecosystem",text:"Sandbox Waiver?"},
            {category:"Ecosystem",text:"Zero Dependencies?"},
            {category:"Ecosystem",text:"Air Cover?"}
        ].map(i=>({...i, checked:false})),
        
        lighthouseCount() { 
            return this.lighthouseData.filter(i=>i.checked).length; 
        },

        generateLighthousePrompt() {
            const score = this.lighthouseCount;
            const status = this.getLighthouseStatus();
            
            // 1. Identify specific gaps
            const missingItems = this.lighthouseData
                .filter(i => !i.checked)
                .map(i => `[MISSING] ${i.category}: ${i.text}`)
                .join("\n");

            // 2. Determine Strategy based on Score
            let strategy = "";
            let action = "";

            if (score === 10) {
                strategy = "GO FOR LAUNCH. The initiative is fully bilingual (Valuable + Feasible).";
                action = "Draft a 'Launch Announcement' focusing on speed to market and immediate value capture.";
            } else if (score >= 8) {
                strategy = "PROCEED WITH CAUTION. We are taking on specific technical or value risks.";
                action = "Draft a 'Risk Mitigation Plan' specifically addressing the missing items below. We need a waiver to proceed.";
            } else {
                strategy = "NO GO. STOP THE LINE. This project is a 'Zombie' in the making.";
                action = "Draft a 'Kill/Pivot Memo'. Explain why continuing now would waste resources, and propose a specific pivot to fix the gaps.";
            }

            return `ACT AS: A Product Innovation Lead and Venture Capitalist.

## THE PITCH EVALUATION (LIGHTHOUSE SCORE)
I have run our initiative through the Lighthouse Criteria.
- **SCORE:** ${score}/10
- **STATUS:** ${status.title}
- **VERDICT:** ${strategy}

## THE GAP ANALYSIS
The following criteria were NOT met:
${missingItems || "None. All systems go."}

## YOUR MISSION
${action}

1. **The Hard Truth:** Assess the impact of the missing criteria. Why does missing this make us fail?
2. **The Decision:** Authorize the next step (Launch, Delay, or Kill).
3. **The 30-Day Fix:** If we are delaying, what exactly must be built/proved in the next sprint to turn this Green?

TONE: Objective, high-standards, focused on resource efficiency.`;
        },
        //==============
        repairKitData: [
            {symptom:"The Feature Factory", diagnosis:"High velocity, no value. Measuring output not outcome.", prescription:["Stop celebrating feature counts.", "Audit value with PO."]}, 
            {symptom:"The Cloud Bill Shock", diagnosis:"Lift and Shift strategy. No FinOps.", prescription:["Implement FinOps ticker.", "Auto-shutdown non-prod servers."]}, 
            {symptom:"The Agile Silo", diagnosis:"Optimized coding but ignored governance.", prescription:["Expand Definition of Done.", "Embed Compliance in squad."]}, 
            {symptom:"Zombie Agile", diagnosis:"Process without purpose.", prescription:["Ban 'Agile' word.", "Refocus on enemy."]}
        ],
        
        boardRisks: [
            {title:"1. Strategic Risk", subtitle:"The Dumb Pipe", lie:"'Our app has 4.5 stars.'", truth:"Retaining customers but losing value. Used only for balance checks.", question:"Show me Share of Wallet for digital natives."}, 
            {title:"2. Regulatory Risk", subtitle:"The Data Swamp", lie:"'Data is centralized.'", truth:"We are drowning. We have petabytes with no governance.", question:"Can we generate a liquidity report in 10 minutes?"}, 
            {title:"3. Talent Risk", subtitle:"The Missing Bench", lie:"'Hiring top talent.'", truth:"Hiring mercenaries. Missionaries are leaving.", question:"% of Change budget spent on vendors?"}
        ],

                reportingData: [
            { metric: "Velocity", financial: "Time-to-Revenue", script: "We reduced 'Time-to-Revenue' from 6 months to 2 weeks. We start earning interest 170 days earlier." },
            { metric: "Cycle Time", financial: "Cost of Delay", script: "By cutting cycle time, we avoided the $2M 'Cost of Delay' associated with missing the Q4 window." },
            { metric: "Tech Debt", financial: "Risk Exposure", script: "We retired a legacy liability. We reduced the probability of a 24-hour outage (valued at $10M) to near zero." },
            { metric: "Stability", financial: "Brand Reputation", script: "We improved system uptime by 40%, directly correlating to a 15% drop in Support costs." },
            { metric: "Flow Efficiency", financial: "OpEx Ratio", script: "We identified that 80% of labor cost was wasted on 'Waiting'. We increased the ROI of every dev hour by 4x." }
        ],


        glossaryData: [
            {term:"Agentic AI",def:"AI that takes action (moves funds), not just generates text."}, 
            {term:"API",def:"Digital glue allowing systems to talk. Enables Open Banking."}, 
            {term:"Data Mesh",def:"Decentralized ownership; domains own their data products."}, 
            {term:"FinOps",def:"Bringing financial accountability to Cloud spend."}, 
            {term:"Tech Debt",def:"Implied cost of rework from choosing easy solutions."}
        ],
        
        get filteredGlossary() { 
            const q = this.glossarySearch.toLowerCase(); 
            return !q ? this.glossaryData : this.glossaryData.filter(i=>i.term.toLowerCase().includes(q)||i.def.toLowerCase().includes(q)); 
        },
        
// ------------------------------------------------------------------
        // KPI DESIGNER (The Prompt Architect Wizard)
        // ------------------------------------------------------------------
        kpiDesigner: {
            step: 1,
            loading: false,
            
            // The Wizard Data
            form: {
                project: '', // What are we building? (Output)
                who: '',     // Who is the customer?
                pain: '',    // What is their problem?
                value: ''    // What is the business value?
            },

            generatedPrompt: '',

            // Offline Cheat Sheet (Quick-fill Presets)
            presets: [
                { label: 'Mobile App', project: 'New Retail App', who: 'Gen-Z Customers', pain: 'Current app is too slow/clunky', value: 'Retention' },
                { label: 'Cloud Migration', project: 'Move Core to AWS', who: 'Internal Dev Team', pain: 'Server provisioning takes 6 weeks', value: 'OpEx Savings & Speed' },
                { label: 'Data Lake', project: 'Snowflake Implementation', who: 'Risk Analysts', pain: 'Reports take 3 days to run', value: 'Real-time Decisioning' },
                { label: 'AI Chatbot', project: 'GenAI Support Agent', who: 'Frustrated Callers', pain: 'Hold times are 45 minutes', value: 'Reduce Call Volume' }
            ],

            // Navigation Actions
            next() {
                if (this.step === 1 && !this.form.project) return alert("Please define the project first.");
                if (this.step === 2 && !this.form.who) return alert("Who is this for?");
                if (this.step === 3 && !this.form.pain) return alert("What is the pain point?");
                if (this.step < 4) this.step++;
            },

            back() {
                if (this.step > 1) this.step--;
            },

            quickFill(preset) {
                this.form.project = preset.project;
                this.form.who = preset.who;
                this.form.pain = preset.pain;
                this.form.value = preset.value;
                this.step = 4; // Jump to end confirmation
            },

            generate() {
                if (!this.form.value) return alert("Please define the business value.");
                
                this.loading = true;
                this.step = 5; // Go to Result Screen

                // --- THE ADVANCED MEGA-PROMPT CONSTRUCTION ---
                this.generatedPrompt = `ACT AS: A Ruthless Product Strategy Coach (Silicon Valley Style).

I need you to critique my initiative and help me define "Outcome-based KPIs" instead of "Output-based Deliverables".

HERE IS MY CONTEXT:
1. THE OUTPUT (What I am building): "${this.form.project}"
2. THE USER (Who is it for): "${this.form.who}"
3. THE PAIN (Why they struggle now): "${this.form.pain}"
4. THE GOAL (Business Value): "${this.form.value}"

YOUR TASK:
1. THE ROAST: Briefly explain why building "${this.form.project}" is a waste of money if it doesn't solve "${this.form.pain}". Be ruthless.
2. THE NORTH STAR: Rewrite my goal into a single, measurable Outcome Statement (e.g., "Reduce Time-to-Cash by 40%").
3. THE METRICS TREE:
   - Leading Indicator (Behavioral): What will "${this.form.who}" DO differently in week 1? (e.g. usage freq).
   - Lagging Indicator (Financial): What is the hard P&L impact in 6 months? (e.g. cost savings).
   - Counter-Metric: What might go wrong? (e.g. "We reduce call volume but Customer Satisfaction tanks").

TONE: High agency, executive, mathematically precise. No corporate fluff.`;

                // Simulate processing time for UX
                setTimeout(() => { this.loading = false; }, 800);
            },

            copyPrompt() {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(this.generatedPrompt);
                    alert("Advanced Prompt copied! Paste this into ChatGPT or Claude.");
                } else {
                    alert("Clipboard access not available. Please copy manually.");
                }
            },

            reset() {
                this.step = 1;
                this.form = { project: '', who: '', pain: '', value: '' };
                this.generatedPrompt = '';
            }
        },
        
    })); // <-- This closes the Alpine.data object

}); // <-- This closes the event listener

    // ------------------------------------------------------------------
// OFFLINE BENCHMARK DATA (Fallback if Database fails)
// ------------------------------------------------------------------
const offlineBenchmarks = [
    {"score":18,"industry":"Traditional Bank"}, 
    {"score":25,"industry":"Traditional Bank"}, 
    // ... PASTE THE REST OF YOUR 1000 ROWS HERE ...
    {"score":75,"industry":"Neobank"}
];

// End of JavaScript file

