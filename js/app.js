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
          this.initYouTubePlayer(); 


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
        // NEGOTIATION DOJO (Deterministic Logic + AI Debrief)
        // ------------------------------------------------------------------
        negotiationDojo: {
            active: false,
            gameOver: false,
            result: null, // 'win' or 'lose'
            
            // The State Machine
            currentScenario: null,
            currentNode: 'start',
            metrics: { trust: 50, leverage: 50, patience: 3 }, // The "Math"
            history: [], // Tracks user choices for the prompt

            // THE DATA (Branching Logic)
            scenarios: [
                {
                    id: 'cloud',
                    title: 'The Cloud Skeptic',
                    opponent: 'CFO Marcus Steel',
                    role: 'Chief Digital Officer',
                    intro: 'You need $10M for Cloud Migration. The CFO hates OpEx spikes.',
                    nodes: {
                        'start': {
                            text: "I see a $10M request for AWS. Our data centers are paid for. Why should I rent computers when I own them?",
                            options: [
                                { text: "It provides elasticity and microservices scalability.", impact: { trust: -10, leverage: 0, patience: -1 }, next: 'tech_trap', analysis: "Used Jargon. CFO tuned out." },
                                { text: "It shifts us from CapEx to OpEx, aligning cost with revenue.", impact: { trust: +20, leverage: +10, patience: 0 }, next: 'financial_hook', analysis: "Spoke CFO language (CapEx/OpEx)." }
                            ]
                        },
                        'tech_trap': {
                            text: "I don't care about 'elasticity'. I care about the P&L. You have 2 minutes before I reject this.",
                            options: [
                                { text: "If we don't migrate, we risk a security breach costing $50M.", impact: { trust: -10, leverage: +20, patience: -1 }, next: 'fear_tactic', analysis: "Fear mongering. Risky but high leverage." },
                                { text: "My apologies. Let me show you the ROI model. We break even in 18 months.", impact: { trust: +10, leverage: +5, patience: +1 }, next: 'financial_hook', analysis: "Pivot to logic. Good recovery." }
                            ]
                        },
                        'financial_hook': {
                            text: "18 months is too long. The Board wants efficiency now. Can you do it for $5M?",
                            options: [
                                { text: "Impossible. We need the full amount.", impact: { trust: 0, leverage: -10, patience: -1 }, next: 'standoff', analysis: "Stubbornness without data reduced leverage." },
                                { text: "We can do a $5M 'Lighthouse' pilot, but it delays full savings by a year.", impact: { trust: +20, leverage: +20, patience: 0 }, next: 'win', analysis: "The 'Anchor' Trade-off. Perfect Bilingual move." }
                            ]
                        },
                        'fear_tactic': {
                            text: "Are you threatening the bank? That sounds like a failure of your current leadership.",
                            options: [
                                { text: "It's not a threat, it's market reality.", impact: { trust: -20, leverage: 0, patience: -1 }, next: 'lose', analysis: "Argumentative. Lost the room." },
                                { text: "It's a quantified risk. I'm asking for insurance.", impact: { trust: +10, leverage: +10, patience: 0 }, next: 'financial_hook', analysis: "Re-framed risk as insurance." }
                            ]
                        },
                        'standoff': {
                            text: "Then we are at an impasse. I'm cutting the budget to $2M. Take it or leave it.",
                            options: [
                                { text: "I resign.", impact: { trust: 0, leverage: 0, patience: 0 }, next: 'lose', analysis: "Emotional quit." },
                                { text: "I'll take the $2M for the Mobile App only. But you own the legacy risk.", impact: { trust: +10, leverage: +10, patience: 0 }, next: 'win', analysis: "Calculated compromise." }
                            ]
                        }
                    }
                }
            ],

            start(index) {
                this.active = true;
                this.gameOver = false;
                this.currentScenario = this.scenarios[index];
                this.currentNode = 'start';
                this.metrics = { trust: 50, leverage: 50, patience: 3 };
                this.history = [];
            },

            choose(option) {
                // 1. Math Logic
                this.metrics.trust += option.impact.trust;
                this.metrics.leverage += option.impact.leverage;
                this.metrics.patience += option.impact.patience;

                // 2. Log History
                this.history.push({
                    stage: this.currentNode,
                    choice: option.text,
                    reasoning: option.analysis,
                    impact: option.impact
                });

                // 3. Win/Lose Condition Checks
                if (this.metrics.patience <= 0 || this.metrics.trust <= 0) {
                    this.finishGame('lose', "Negotiation Failed. You lost the room.");
                    return;
                }
                
                if (option.next === 'win') {
                    this.finishGame('win', "Deal Closed. You secured the budget.");
                    return;
                }
                
                if (option.next === 'lose') {
                    this.finishGame('lose', "Proposal Rejected.");
                    return;
                }

                // 4. Advance
                this.currentNode = option.next;
            },

            finishGame(result, msg) {
                this.gameOver = true;
                this.result = result;
                this.finalMessage = msg;
            },

            restart() {
                this.active = false;
                this.gameOver = false;
                this.history = [];
            },

            // --- NEW: ADVANCED PROMPT GENERATOR ---
            generateNegotiationPrompt() {
                const s = this.currentScenario;
                const path = this.history.map((h, i) => 
                    `Step ${i+1}: When asked about [${h.stage}], I chose: "${h.choice}". (Impact: Trust ${h.impact.trust > 0 ? '+' : ''}${h.impact.trust})`
                ).join("\n");

                return `ACT AS: A Hostage Negotiator and Executive Coach (Chris Voss Style).

## THE SIMULATION RECORD
I just completed a high-stakes negotiation with ${s.opponent} (${s.role}).
- **Outcome:** ${this.result.toUpperCase()}
- **Final Metrics:** Trust (${this.metrics.trust}/100), Leverage (${this.metrics.leverage}/100).

## MY DECISION PATH
${path}

## YOUR COACHING ANALYSIS
1. **The Psychology:** Analyze *why* my specific choices led to this outcome. Did I use "Tactical Empathy" or did I trigger "Amygdala Hijack"?
2. **The Pivot Point:** Identify the exact moment the negotiation turned in my favor (or fell apart).
3. **Advanced Technique:** Teach me one advanced technique (e.g., "The Ackerman Bargain" or "Labeling") that I could have used in Step 2 to get a better result.

TONE: Direct, psychological, actionable.`;
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
        // WAR GAMES (Deterministic Strategy Logic)
        // ------------------------------------------------------------------
        warGames: {
            active: false,
            gameOver: false,
            result: null, // 'victory', 'bankruptcy', 'regulatory_shutdown'
            
            // State
            currentScenario: null,
            currentNode: 'start',
            metrics: { capital: 100, innovation: 20, stability: 80 },
            history: [],

            // THE SCENARIOS (Branching Logic)
            scenarios: [
                {
                    id: 'core',
                    title: 'Operation: Open Heart',
                    brief: 'The Board demands we replace the 40-year-old Core Banking System. It is risky, expensive, and necessary.',
                    nodes: {
                        'start': {
                            text: "Our legacy vendor just raised prices by 40%. The Core is stable but inflexible. We cannot launch new products. What is the strategy?",
                            options: [
                                { text: "Big Bang Replacement. Buy a modern SaaS core and migrate everything in one weekend.", impact: { capital: -60, innovation: +50, stability: -40 }, next: 'big_bang', analysis: "High Risk / High Reward." },
                                { text: "Hollow out the Core. Build a side-car 'Neobank' stack and migrate slowly.", impact: { capital: -30, innovation: +20, stability: -10 }, next: 'strangler', analysis: "The Strangler Fig Pattern." }
                            ]
                        },
                        'big_bang': {
                            text: "Migration Weekend is approaching. Testing shows a 15% error rate in account balances. The Board is watching.",
                            options: [
                                { text: "Delay the launch by 3 months to fix bugs.", impact: { capital: -20, innovation: 0, stability: +20 }, next: 'delay_pain', analysis: "Prudent but expensive." },
                                { text: "Launch anyway. We'll fix errors in post-production support.", impact: { capital: 0, innovation: +10, stability: -50 }, next: 'crash', analysis: "Reckless gambling." }
                            ]
                        },
                        'strangler': {
                            text: "The new 'Side-Car' stack is live and customers love it. But maintaining two parallel banks is draining our OpEx budget.",
                            options: [
                                { text: "Cut funding to the Legacy maintenance team to save cash.", impact: { capital: +10, innovation: 0, stability: -30 }, next: 'outage', analysis: "Created technical debt." },
                                { text: "Accelerate migration. Offer customers $50 bonus to switch to the new stack manually.", impact: { capital: -20, innovation: +10, stability: +10 }, next: 'victory', analysis: "Customer-led migration." }
                            ]
                        },
                        'delay_pain': {
                            text: "The delay burned cash, but the system is stable. However, a competitor just launched the features we were building.",
                            options: [
                                { text: "Stay the course. Reliability is our brand.", impact: { capital: -10, innovation: -10, stability: +10 }, next: 'victory', analysis: "Slow and steady survival." },
                                { text: "Rush a feature update immediately after launch.", impact: { capital: -10, innovation: +20, stability: -20 }, next: 'crash', analysis: "Destabilized the platform." }
                            ]
                        },
                        'outage': {
                            text: "Disaster! The under-funded legacy core crashed on payday. 2 million customers cannot access funds.",
                            options: [
                                { text: "Blame the vendor publicly.", impact: { capital: 0, innovation: 0, stability: -20 }, next: 'shutdown', analysis: "Weak leadership." },
                                { text: "Roll back everything to the old state.", impact: { capital: -20, innovation: -40, stability: +30 }, next: 'stagnation', analysis: "Retreat to safety." }
                            ]
                        },
                        'crash': { text: "CRITICAL FAILURE. Data corruption detected. Regulators have entered the building.", options: [], next: 'shutdown' },
                        'shutdown': { text: "GAME OVER. The banking license has been suspended.", options: [], next: 'end' },
                        'victory': { text: "SUCCESS. Transformation complete. We are bruised but modern.", options: [], next: 'end' },
                        'stagnation': { text: "SURVIVAL. We survived, but we are now a zombie bank with no innovation.", options: [], next: 'end' }
                    }
                }
            ],

            start(index) {
                this.active = true;
                this.gameOver = false;
                this.currentScenario = this.scenarios[index];
                this.currentNode = 'start';
                this.metrics = { capital: 100, innovation: 20, stability: 80 };
                this.history = [];
            },

            choose(option) {
                // 1. Math Engine
                this.metrics.capital += option.impact.capital;
                this.metrics.innovation += option.impact.innovation;
                this.metrics.stability += option.impact.stability;

                // 2. Log Decision
                this.history.push({
                    situation: this.currentScenario.nodes[this.currentNode].text,
                    decision: option.text,
                    rationale: option.analysis,
                    impact: option.impact
                });

                // 3. Check for immediate failures
                if (this.metrics.capital <= 0) {
                    this.finishGame('bankruptcy', "INSOLVENCY. You ran out of money.");
                    return;
                }
                if (this.metrics.stability <= 20) {
                    this.finishGame('regulatory_shutdown', "INTERVENTION. Regulators seized the bank due to risk.");
                    return;
                }

                // 4. Handle End States
                if (['shutdown', 'end', 'crash', 'stagnation'].includes(option.next)) {
                    // Map node ID to result type
                    let res = 'victory';
                    if (option.next === 'crash' || option.next === 'shutdown') res = 'regulatory_shutdown';
                    if (option.next === 'stagnation') res = 'stagnation';
                    
                    // Update text for the final screen
                    this.currentNode = option.next; 
                    this.finishGame(res, this.currentScenario.nodes[option.next].text);
                } else {
                    // Advance
                    this.currentNode = option.next;
                }
            },

            finishGame(result, msg) {
                this.gameOver = true;
                this.result = result;
                this.finalMessage = msg;
            },

            restart() {
                this.active = false;
                this.gameOver = false;
                this.history = [];
            },

            // --- NEW: STRATEGIC POST-MORTEM PROMPT ---
            generateWarGamePrompt() {
                const decisionPath = this.history.map((h, i) => 
                    `Turn ${i+1}: ${h.decision} (Intent: ${h.rationale})`
                ).join("\n");

                return `ACT AS: A McKinsey Senior Partner conducting a Strategic Post-Mortem.

## WAR GAME RESULTS
I just simulated a Bank Transformation Strategy ("${this.currentScenario.title}").
- **FINAL OUTCOME:** ${this.result.toUpperCase()}
- **Ending Metrics:** Capital (${this.metrics.capital}), Innovation (${this.metrics.innovation}), Stability (${this.metrics.stability}).

## THE DECISION CHAIN
${decisionPath}

## YOUR ANALYSIS
1. **The Fatal Flaw (or Winning Move):** Identify the single decision that sealed my fate. Was it a math error or a cultural error?
2. **Alternative History:** If you were the CEO, which turn would you have played differently and why?
3. **The Executive Lesson:** Give me one "Law of Corporate Strategy" that applies to this specific run (e.g. "Conway's Law" or "The Sunk Cost Fallacy").

TONE: Brutally honest, high-level strategic insight.`;
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
        { id: 'matrix', label: 'Decision Matrix', icon: 'fa-solid fa-chess-board', color: 'text-blue-400' },
        { id: 'dumbpipe', label: 'Dumb Pipe Calc', icon: 'fa-solid fa-faucet-drip', color: 'text-red-400' },
        { id: 'datagov', label: 'Data Health', icon: 'fa-solid fa-traffic-light', color: 'text-blue-500' },
         { id: 'shadow', label: 'Shadow IT Audit', icon: 'fa-solid fa-ghost', color: 'text-purple-400' }


    ],
    academy: [
        { id: 'manual', label: 'Field Manual', icon: 'fa-solid fa-headphones', color: 'text-white' }, // NotebookLM Feature
        { id: 'translator', label: 'Translator', icon: 'fa-solid fa-language', color: 'text-blue-300' },
        { id: 'board', label: 'Board Guide', icon: 'fa-solid fa-chess-king', color: 'text-yellow-400' },
        { id: 'glossary', label: 'Glossary', icon: 'fa-solid fa-book', color: 'text-slate-400' }
    ],
    forge: [
        { id: 'kpi', label: 'Outcome Gen', icon: 'fa-solid fa-wand-magic-sparkles', color: 'text-green-400' },
        { id: 'lighthouse', label: 'Lighthouse Kit', icon: 'fa-solid fa-lightbulb', color: 'text-yellow-400' },
        { id: 'canvas', label: 'Data Product', icon: 'fa-solid fa-file-contract', color: 'text-blue-500' },
        { id: 'roi', label: 'Lighthouse ROI', icon: 'fa-solid fa-calculator', color: 'text-green-500' },
        { id: 'excel', label: 'Excel Auditor', icon: 'fa-solid fa-file-excel', color: 'text-green-400' },
         { id: 'squad', label: 'Squad Builder', icon: 'fa-solid fa-people-group', color: 'text-indigo-400' },
        { id: 'repair', label: 'Repair Kit', icon: 'fa-solid fa-toolbox', color: 'text-red-400' }
    ],
    sims: [
        { id: 'simulator', label: 'Case Study', icon: 'fa-solid fa-chess-knight', color: 'text-white' },
        { id: 'future', label: 'Future Bank', icon: 'fa-solid fa-forward', color: 'text-purple-400' }, 
        { id: 'roleplay', label: 'Negotiation Dojo', icon: 'fa-solid fa-user-tie', color: 'text-orange-400' },
        { id: 'conway', label: 'Conway Sim', icon: 'fa-solid fa-project-diagram', color: 'text-indigo-400' } 
        { id: 'whatif', label: 'War Games', icon: 'fa-solid fa-chess-rook', color: 'text-purple-500' },
        { id: 'sandbox', label: 'Arch Sandbox', icon: 'fa-solid fa-shapes', color: 'text-cyan-500' }
    ]
},
        
       dashboardTools: [ 
            // 1. Simulations & Games
            { id: 'simulator', label: 'Case Simulator', desc: '90-Day Turnaround Simulation.', icon: 'fa-solid fa-chess-knight', color: 'text-primary' },
           { id: 'future', label: 'Future Bank 2030', desc: 'Simulate your strategy to 2030.', icon: 'fa-solid fa-forward', color: 'text-purple-400', vip: false }, 
            { id: 'whatif', label: 'War Games', desc: 'Strategic Pre-Mortem & Risk Analysis.', icon: 'fa-solid fa-chess-rook', color: 'text-purple-500' },
            { id: 'roleplay', label: 'Negotiation Dojo', desc: 'Spar against skeptical stakeholders.', icon: 'fa-solid fa-user-tie', color: 'text-orange-400' },
           { id: 'conway', label: 'Org Mirror', desc: 'Simulate how Org Chart breaks Architecture.', icon: 'fa-solid fa-sitemap', color: 'text-indigo-400', vip: false },
            { id: 'escaperoom', label: 'Excel Escape', desc: 'Gamified technical debt simulation.', icon: 'fa-solid fa-dungeon', color: 'text-green-500' },

            // 2. Calculators & Builders (Forge)
            { id: 'squad', label: 'Squad Builder', desc: 'Design teams using Brooks Law.', icon: 'fa-solid fa-people-group', color: 'text-indigo-400' },
           
            { id: 'excel', label: 'Excel Auditor', desc: 'Calculate OpEx waste & risk liability.', icon: 'fa-solid fa-file-excel', color: 'text-green-400' },
            { id: 'roi', label: 'Lighthouse ROI', desc: 'Calculate NPV & Cost of Delay.', icon: 'fa-solid fa-chart-pie', color: 'text-green-400', vip: false },
            { id: 'kpi', label: 'Outcome Gen',  desc: 'Turn Project Outputs into Business Outcomes.',  icon: 'fa-solid fa-wand-magic-sparkles', color: 'text-green-400'},
            { id: 'sandbox', label: 'API Sandbox', desc: 'Visualize architecture latency.', icon: 'fa-solid fa-shapes', color: 'text-cyan-400' },

            // 3. Diagnostics (Radar)
            { id: 'culture', label: 'Debt Monitor', desc: 'Track organizational friction.', icon: 'fa-solid fa-heart-pulse', color: 'text-risk' },
            { id: 'assessment', label: 'Agile Audit', desc: 'Assess maturity across Data/Delivery.', icon: 'fa-solid fa-stethoscope', color: 'text-primary' }, 
            { id: 'talent', label: 'Talent Radar', desc: 'Identify skill gaps in leadership.', icon: 'fa-solid fa-fingerprint', color: 'text-hotpink' }, 
           { id: 'dumbpipe', label: 'Utility Risk', desc: 'Calculate the probability of losing the customer interface.', icon: 'fa-solid fa-link-slash', color: 'text-red-400', vip: false },
           { id: 'datagov', label: 'Live Data Governance', desc: 'Monitor SLOs, Lineage, and Quality in real-time.', icon: 'fa-solid fa-server', color: 'text-blue-500', vip: false },
           { id: 'shadow', label: 'Shadow IT Scanner', desc: 'Audit SaaS sprawl and calculate the "Integration Tax".', icon: 'fa-solid fa-ghost', color: 'text-purple-400', vip: false },



            
            // 4. Strategy Tools
            { id: 'matrix', label: 'Strategy Matrix', desc: 'Build vs Buy decision framework.', icon: 'fa-solid fa-chess-board', color: 'text-purple-400' }, 
            { id: 'lighthouse', label: 'Lighthouse', desc: 'Checklist for pilot success.', icon: 'fa-solid fa-lightbulb', color: 'text-warn' }, 
            { id: 'translator', label: 'Translator', desc: 'Decode jargon into business value.', icon: 'fa-solid fa-language', color: 'text-blue-400' }, 
            { id: 'repair', label: 'Repair Kit', desc: 'Fix stalled transformations.', icon: 'fa-solid fa-toolbox', color: 'text-risk' }, 
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
    localStorage.setItem('app_entered', 'true');
    
    // Properly pause/stop the video
    if (this.player && this.player.pauseVideo) {
        this.player.pauseVideo();
    }
    
    // Set videoPlaying to false
    this.videoPlaying = false;
    
    // Clear update interval
    if (this.updateTimeInterval) {
        clearInterval(this.updateTimeInterval);
        this.updateTimeInterval = null;
    }
    
    if (navigator.vibrate) navigator.vibrate(50);
    this.setupActivityTracking();
    
    setTimeout(() => {
        if (!this.isPwaPromptActive && !this.showPwaPrompt) {
            this.showDelayedPwaPrompt();
        }
    }, 60000);
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

        // ------------------------------------------------------------------
        // SQUAD BUILDER (Deterministic Math Engine)
        // ------------------------------------------------------------------
        squadBuilder: {
            roster: [],
            
            // The "Market" of Talent
            catalog: [
                { id: 'po', title: 'Product Owner', icon: 'fa-briefcase', type: 'biz', biz: 9, tech: 2, cost: 3, desc: 'Value definer. Essential for direction.' },
                { id: 'tech_lead', title: 'Tech Lead', icon: 'fa-microchip', type: 'tech', biz: 4, tech: 10, cost: 4, desc: 'Architect. Multiplies dev effectiveness.' },
                { id: 'senior_dev', title: 'Senior Dev', icon: 'fa-code', type: 'tech', biz: 2, tech: 9, cost: 3, desc: 'High output, low maintenance.' },
                { id: 'junior_dev', title: 'Junior Dev', icon: 'fa-laptop-code', type: 'tech', biz: 1, tech: 5, cost: 1, desc: 'Cheap execution. Needs supervision.' },
                { id: 'scrum', title: 'Scrum Master', icon: 'fa-stopwatch', type: 'ops', biz: 5, tech: 4, cost: 2, desc: 'Reduces friction/overhead.' },
                { id: 'qa', title: 'QA Engineer', icon: 'fa-bug', type: 'risk', biz: 2, tech: 6, cost: 2, desc: 'Increases stability.' },
                { id: 'designer', title: 'UX Designer', icon: 'fa-pen-nib', type: 'design', biz: 7, tech: 3, cost: 3, desc: 'Ensures customer fit.' }
            ],

            addRole(role) {
                if (this.roster.length >= 12) return alert("Squad limit reached. Split the team.");
                this.roster.push({ ...role, uid: Date.now() });
            },

            removeRole(uid) {
                this.roster = this.roster.filter(r => r.uid !== uid);
            },

            reset() {
                this.roster = [];
            },

            // --- THE ADVANCED MATH ENGINE ---
            get stats() {
                const r = this.roster;
                if (r.length === 0) return { velocity: 0, quality: 0, alignment: 0, friction: 0, message: "Empty Squad" };

                // 1. Base Attributes
                let rawTech = r.reduce((a, b) => a + b.tech, 0);
                let rawBiz = r.reduce((a, b) => a + b.biz, 0);
                
                // 2. Brooks' Law (Communication Overhead)
                // Formula: N * (N-1) / 2 interactions.
                // We dampen velocity as team size grows.
                const n = r.length;
                let overhead = (n * (n - 1)) / 2 * 0.5; 
                
                // Scrum Master Bonus: Reduces overhead by 40%
                if (r.find(x => x.id === 'scrum')) overhead *= 0.6;

                // 3. Velocity Calculation
                // Tech Lead Multiplier: A TL boosts all Juniors/Seniors by 20%
                let multiplier = r.find(x => x.id === 'tech_lead') ? 1.2 : 1.0;
                let velocity = (rawTech * multiplier) - overhead;
                
                // 4. Quality/Stability Calculation
                // QA adds base stability. Too many Juniors lowers it.
                let quality = 50; // Base
                r.forEach(x => {
                    if (x.id === 'qa') quality += 20;
                    if (x.id === 'tech_lead') quality += 10;
                    if (x.id === 'junior_dev') quality -= 5;
                });

                // 5. Alignment (The Bilingual Score)
                // Balance between Tech Power and Business Direction
                const hasPO = r.find(x => x.id === 'po');
                let alignment = hasPO ? 100 : 20; // Massive penalty for no PO
                
                // If Tech vastly overpowers Biz, Alignment drops (building cool stuff nobody needs)
                if (rawTech > (rawBiz * 3)) alignment -= 30;

                // 6. Diagnostics
                let status = "OPTIMIZED";
                let statusColor = "text-primary";

                if (!hasPO) { status = "HEADLESS CHICKEN"; statusColor = "text-risk"; }
                else if (n > 9) { status = "BLOATED"; statusColor = "text-warn"; }
                else if (quality < 30) { status = "FRAGILE"; statusColor = "text-red-400"; }
                else if (velocity < 10) { status = "STALLED"; statusColor = "text-slate-400"; }

                return {
                    velocity: Math.max(0, Math.round(velocity)),
                    quality: Math.max(0, Math.min(100, quality)),
                    alignment: alignment,
                    overhead: Math.round(overhead),
                    status,
                    statusColor
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateSquadPrompt() {
                const s = this.stats;
                const r = this.roster;
                
                // Summarize composition
                const composition = r.reduce((acc, curr) => {
                    acc[curr.title] = (acc[curr.title] || 0) + 1;
                    return acc;
                }, {});
                const compString = Object.entries(composition).map(([k, v]) => `${v}x ${k}`).join(', ');

                return `ACT AS: A CTO and Organizational Design Consultant.

## THE SQUAD SIMULATION
I have designed a cross-functional squad with the following parameters:
- **Composition:** ${compString}
- **Headcount:** ${r.length}
- **Computed Velocity:** ${s.velocity} (Capacity to ship code)
- **Computed Stability:** ${s.quality}/100 (Risk of bugs/outages)
- **Strategic Alignment:** ${s.alignment}/100 (Biz/Tech connection)

## THE MATH DIAGNOSIS
- **Brooks' Law Factor:** Communication overhead is consuming ${s.overhead} points of velocity.
- **Verdict:** The system flags this squad as "${s.status}".

## YOUR MISSION (PRE-MORTEM)
Run a simulation of this team over a 6-month period.
1. **The Breaking Point:** Given this specific mix (e.g., ratio of Juniors to Seniors, or lack of QA), predict exactly how this team fails in production.
2. **The "Bus Factor":** Identify the single person whose resignation would destroy the team's output.
3. **The Fix:** Rebalance the roster. Who should I fire, and who should I hire to double the ROI?

TONE: Ruthless, data-driven, experienced.`;
            }
        },

        // ------------------------------------------------------------------
        // EXCEL FACTORY EXPOSURE CALCULATOR (Deterministic FinOps)
        // ------------------------------------------------------------------
        excelCalc: {
            inputs: {
                process_name: '',
                steps: 50,      // Manual copy-pastes/edits per run
                frequency: 12,  // Runs per year
                salary: 75,     // Hourly cost of analyst ($)
                criticality: 2  // 1=Internal, 2=Regulatory, 3=Customer Facing
            },
            result: null,

            calculate() {
                const i = this.inputs;
                
                // 1. Calculate OpEx Waste (The "Hidden Tax")
                // Assumption: Each manual step takes ~2 mins (finding, copying, checking)
                const hoursPerRun = (i.steps * 2) / 60;
                const annualHours = hoursPerRun * i.frequency;
                const annualCost = Math.round(annualHours * i.salary);

                // 2. Calculate Error Probability (The "Swiss Cheese Model")
                // Industry standard: Human error rate is ~1% per manual action without validation
                // Probability of at least one error = 1 - (0.99 ^ steps)
                const errorProb = Math.round((1 - Math.pow(0.99, i.steps)) * 100);

                // 3. Calculate Risk Exposure (The "Liability Bomb")
                // Base impact cost * Criticality Multiplier
                let baseImpact = 10000; // Cost to fix internal error
                let criticalLabel = "Internal Admin";
                
                if (i.criticality == 2) { 
                    baseImpact = 150000; // Regulatory fine / Audit rework
                    criticalLabel = "Regulatory Reporting";
                }
                if (i.criticality == 3) { 
                    baseImpact = 2000000; // Reputational damage / Customer churn
                    criticalLabel = "Customer Facing";
                }
                
                // Weighted Risk = Probability * Impact
                const riskExposure = Math.round((errorProb / 100) * baseImpact);

                // 4. Recommendation Logic
                let verdict = "MONITOR";
                let action = "Standard Data Quality Checks";
                
                if (annualCost > 50000 || errorProb > 80) {
                    verdict = "AUTOMATE";
                    action = "Migrate to Python/SQL Pipeline immediately.";
                }
                if (i.criticality == 3 && errorProb > 20) {
                    verdict = "KILL SWITCH";
                    action = "Process is too risky for manual handling. Cease or Re-platform.";
                }

                this.result = {
                    annualCost: annualCost,
                    annualHours: Math.round(annualHours),
                    errorProb: errorProb,
                    riskExposure: riskExposure,
                    criticalLabel: criticalLabel,
                    verdict: verdict,
                    action: action
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateExcelPrompt() {
                if (!this.result) return "Please calculate first.";
                const r = this.result;
                const i = this.inputs;

                return `ACT AS: A Chief Financial Officer (CFO) and Risk Officer.

## THE AUDIT FINDINGS (SHADOW IT)
I have audited a manual process named "${i.process_name || 'Untitled Process'}" currently running in Excel.
- **Process Type:** ${r.criticalLabel}
- **Complexity:** ${i.steps} manual touchpoints per run.
- **Calculated Error Probability:** ${r.errorProb}% per run (based on standard human error rates).

## THE FINANCIAL EXPOSURE
1. **Guaranteed Cash Waste:** We are burning **$${r.annualCost.toLocaleString()}** per year in manual labor (${r.annualHours} hours) just to maintain this.
2. **Liability Risk:** Given the criticality, the probabilistic risk exposure is **$${r.riskExposure.toLocaleString()}** (Probability x Impact).

## YOUR MISSION
Write a **"Business Case for Automation"** to secure budget for IT to replace this spreadsheet with a proper Data Product.
1. **The Argument:** Explain why paying an engineer to automate this is cheaper than the risk of keeping it manual.
2. **The "Fat Finger" Scenario:** Describe a hypothetical scenario where a single copy-paste error in this specific process causes a disaster.
3. **The ROI:** If automation costs $25k, calculate the payback period based on the OpEx savings alone.

TONE: Fiscally responsible, risk-averse, urgent.`;
            }
        },

        // ------------------------------------------------------------------
        // LIGHTHOUSE ROI CALCULATOR (Deterministic Financial Engine)
        // ------------------------------------------------------------------
        lighthouseROI: {
            inputs: {
                name: '',
                duration_weeks: 12,
                squad_cost_per_week: 15000,
                software_cost: 25000, // One-time Lic/Setup
                revenue_generated: 0, // Annual
                cost_avoided: 150000, // Annual
                old_cycle_time: 20,   // Weeks
                new_cycle_time: 2     // Weeks
            },
            results: null,

            calculate() {
                if (!this.inputs.name) return alert("Please name the project.");
                
                const i = this.inputs;
                
                // 1. COSTS (Investment)
                const laborCost = i.duration_weeks * i.squad_cost_per_week;
                const totalInvestment = laborCost + parseInt(i.software_cost);
                
                // 2. RETURNS (Annualized Value)
                const annualValue = parseInt(i.revenue_generated) + parseInt(i.cost_avoided);
                const netProfit1Year = annualValue - totalInvestment;
                
                // 3. ROI %
                const roiPercent = Math.round(((annualValue - totalInvestment) / totalInvestment) * 100);

                // 4. Payback Period (Months)
                // (Investment / Monthly Value)
                const monthlyValue = annualValue / 12;
                let paybackMonths = (totalInvestment / monthlyValue).toFixed(1);
                if (monthlyValue <= 0) paybackMonths = "Never";

                // 5. Cost of Delay (CoD)
                // Value per week lost if we delay launch
                const weeklyValue = Math.round(annualValue / 52);

                // 6. Speed Multiplier
                const speedFactor = (i.old_cycle_time / i.new_cycle_time).toFixed(1);

                // 7. Verdict Logic
                let verdict = "MARGINAL";
                let color = "text-yellow-500";
                
                if (roiPercent > 300 && paybackMonths < 6) {
                    verdict = "NO BRAINER";
                    color = "text-green-400";
                } else if (roiPercent < 0) {
                    verdict = "MONEY PIT";
                    color = "text-red-500";
                }

                this.results = {
                    totalInvestment,
                    annualValue,
                    netProfit1Year,
                    roiPercent,
                    paybackMonths,
                    weeklyValue, // Cost of Delay
                    speedFactor,
                    verdict,
                    color
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateROIPrompt() {
                if (!this.results) return "Calculate metrics first.";
                const r = this.results;
                const i = this.inputs;

                return `ACT AS: A Chief Financial Officer (CFO) and Strategy Consultant.

## THE INVESTMENT CASE (DATA)
I am pitching a technology pilot ("${i.name}"). Here are the hard numbers:
- **Total Ask (CapEx/OpEx):** $${r.totalInvestment.toLocaleString()}
- **Projected 1-Year ROI:** ${r.roiPercent}%
- **Payback Period:** ${r.paybackMonths} Months
- **Agile Velocity Gain:** ${r.speedFactor}x faster than legacy process.

## THE HIDDEN METRIC: COST OF DELAY
We lose **$${r.weeklyValue.toLocaleString()} in value every single week** we wait to approve this.

## YOUR MISSION
Write a **"Board Defense Script"** to secure funding.
1. **The "No Brainer" Hook:** Summarize the ROI and Payback period in one aggressive sentence.
2. **The Speed Defense:** Explain why the ${r.speedFactor}x speed increase creates "Compound Strategic Value" beyond just the money.
3. **The "Cost of Inaction" closing:** Use the Cost of Delay ($${r.weeklyValue.toLocaleString()}/week) to make *doing nothing* sound more expensive than *doing something*.

TONE: Fiscally conservative but strategically aggressive. Use terms like "Free Cash Flow" and "Asset Velocity".`;
            }
        },

        // ------------------------------------------------------------------
        // FUTURE BANK SIMULATOR (Interactive + Math Engine)
        // ------------------------------------------------------------------
        futureBank: {
            activeScenario: null,
            year: 2026,
            isPlaying: false,
            timer: null,
            activeEvent: null, // Stores the current crisis
            decisionLog: [],   // Tracks user choices for the AI prompt
            
            // The 3 Core Paths
            scenarios: [
                {
                    id: 'ai_first',
                    title: 'The Bionic Bank',
                    icon: 'fa-robot',
                    color: 'text-purple-400',
                    desc: 'Aggressive automation. High initial cost (J-Curve), exponential payoff.',
                    baseGrowth: 1.15, 
                    efficiencyGain: 0.05, 
                    riskFactor: 0.2 
                },
                {
                    id: 'partnership',
                    title: 'The Invisible Bank',
                    icon: 'fa-handshake',
                    color: 'text-green-400',
                    desc: 'Embedded Finance. Low brand visibility, massive volume via Partners.',
                    baseGrowth: 1.25, 
                    efficiencyGain: 0.02, 
                    riskFactor: 0.1
                },
                {
                    id: 'fortress',
                    title: 'The Legacy Fortress',
                    icon: 'fa-shield-halved',
                    color: 'text-risk',
                    desc: 'Defensive posture. Cost cutting and compliance focus.',
                    baseGrowth: 1.03, 
                    efficiencyGain: -0.01, 
                    riskFactor: 0.05
                }
            ],

            // The Crisis Database (Triggered at specific years)
            events: {
                2027: {
                    title: "CRISIS: THE CLOUD OUTAGE",
                    desc: "A major vendor outage has taken down mobile banking for 4 hours. The regulator is on the phone.",
                    choices: [
                        { label: "Public Apology & Refund", effect: "churn_reduction", cost: 50, debt: 0, msg: "Expensive, but saved the brand." },
                        { label: "Blame the Vendor", effect: "churn_increase", cost: 0, debt: 0, msg: "Saved cash, but customers are angry." },
                        { label: "Accelerate Multi-Cloud", effect: "debt_reduction", cost: 200, debt: -15, msg: "Strategic pivot. High cost, long-term stability." }
                    ]
                },
                2029: {
                    title: "OPPORTUNITY: THE FINTECH CRASH",
                    desc: "Interest rates spiked. A major Neo-Bank competitor is insolvent. Assets are cheap.",
                    choices: [
                        { label: "Acquire for Tech Stack", effect: "tech_boost", cost: 500, debt: -20, msg: "Bought their code to replace ours." },
                        { label: "Acquire for Customers", effect: "growth_boost", cost: 300, debt: 10, msg: "Bought their users. Integration will be messy." },
                        { label: "Let them Die", effect: "efficiency", cost: 0, debt: 0, msg: "Preserved capital. Conservative play." }
                    ]
                }
            },

            selectScenario(id) {
                this.activeScenario = this.scenarios.find(s => s.id === id);
                this.year = 2026;
                this.decisionLog = [];
                // Reset Metrics
                this.metrics = { 
                    profit: 1000, // $1.0B
                    customers: 5, // 5M
                    efficiency: 60, // Cost/Income Ratio
                    techDebt: 20 // Index 0-100
                };
                this.playSimulation();
            },

            playSimulation() {
                this.isPlaying = true;
                this.activeEvent = null;
                
                this.timer = setInterval(() => {
                    // Check for Events BEFORE advancing year
                    if ((this.year === 2027 || this.year === 2029) && !this.isEventResolved(this.year)) {
                        this.triggerEvent(this.year);
                        return; // Pause loop
                    }

                    if (this.year < 2030) {
                        this.year++;
                        this.calculateYearlyMath();
                    } else {
                        clearInterval(this.timer);
                        this.isPlaying = false;
                    }
                }, 1500);
            },

            triggerEvent(year) {
                clearInterval(this.timer); // Pause Time
                this.activeEvent = { ...this.events[year], year: year };
            },

            resolveEvent(choice) {
                // 1. Apply Immediate Effects
                this.metrics.profit -= choice.cost;
                this.metrics.techDebt = Math.max(0, this.metrics.techDebt + choice.debt);
                
                // 2. Apply Special Effects
                if (choice.effect === 'churn_increase') this.metrics.customers *= 0.9;
                if (choice.effect === 'churn_reduction') this.metrics.customers *= 1.05; // Loyalty boost
                if (choice.effect === 'growth_boost') this.metrics.customers += 1.5; // +1.5M users
                if (choice.effect === 'tech_boost') this.metrics.efficiency -= 5; 

                // 3. Log for AI
                this.decisionLog.push({ year: this.activeEvent.year, event: this.activeEvent.title, decision: choice.label, outcome: choice.msg });

                // 4. Resume
                this.activeEvent = null;
                this.playSimulation();
            },

            isEventResolved(year) {
                return this.decisionLog.some(d => d.year === year);
            },

            calculateYearlyMath() {
                const s = this.activeScenario;
                
                // J-Curve Logic
                let growth = s.baseGrowth;
                if (s.id === 'ai_first' && this.year === 2027) growth = 0.9; // The dip
                if (s.id === 'ai_first' && this.year >= 2029) growth = 1.35; // The rocket

                this.metrics.profit = Math.round(this.metrics.profit * growth);
                
                // Efficiency Drifts
                this.metrics.efficiency = Math.max(30, this.metrics.efficiency - (s.efficiencyGain * 100));
                
                // Tech Debt Drifts (Fortress rots, others improve slightly)
                if (s.id === 'fortress') this.metrics.techDebt += 5;
                else this.metrics.techDebt = Math.max(5, this.metrics.techDebt - 2);
            },

            // --- PROMPT GENERATOR ---
            generateFuturePrompt() {
                const s = this.activeScenario;
                const m = this.metrics;
                
                const decisions = this.decisionLog.map(d => `In ${d.year}, faced with "${d.event}", I chose to "${d.decision}".`).join("\n");

                return `ACT AS: A Wall Street Analyst writing a "Sell-Side Report" on this Bank in 2030.

## STRATEGY & EXECUTION REVIEW (2026-2030)
The CEO chose the "${s.title}" strategy (${s.desc}).
Key Decisions made during the timeline:
${decisions}

## 2030 FINANCIAL RESULTS
- **Net Profit:** $${(m.profit/1000).toFixed(1)} Billion
- **Efficiency Ratio:** ${m.efficiency.toFixed(0)}%
- **Customer Base:** ${(m.customers).toFixed(1)} Million
- **Technical Debt:** ${m.techDebt}/100

## YOUR ANALYSIS
1. **The Verdict:** Is this bank a "Buy", "Hold", or "Sell"? Why?
2. **The "Crisis Management" Score:** Analyze how my decision in the 2027/2029 crises impacted the final P&L.
3. **The 2035 Outlook:** Given the high/low Tech Debt, will this bank survive the *next* wave of disruption (Quantum Computing)?

TONE: Professional, financial, ruthlessly objective.`;
            }
        },

        // ------------------------------------------------------------------
        // CONWAY'S LAW SIMULATOR (Deterministic Topology Engine)
        // ------------------------------------------------------------------
        conwaySim: {
            teams: [],
            dependencies: [], // Array of {from: id, to: id}
            
            // Mathematical Output
            metrics: {
                couplingScore: 0, // 0-100 (Higher is worse)
                velocity: 100,    // 0-100 (Higher is better)
                archType: "Greenfield"
            },

            // User Inputs
            newTeamName: '',
            newTeamType: 'silo', // silo, squad, platform, gatekeeper

            addTeam() {
                if (!this.newTeamName) return alert("Name required.");
                this.teams.push({
                    id: Date.now(),
                    name: this.newTeamName,
                    type: this.newTeamType
                });
                this.newTeamName = '';
                this.calculateTopology();
            },

            removeTeam(id) {
                this.teams = this.teams.filter(t => t.id !== id);
                this.dependencies = this.dependencies.filter(d => d.from !== id && d.to !== id);
                this.calculateTopology();
            },

            toggleDependency(fromId, toId) {
                if (fromId === toId) return;
                
                const existingIndex = this.dependencies.findIndex(d => d.from === fromId && d.to === toId);
                if (existingIndex > -1) {
                    this.dependencies.splice(existingIndex, 1);
                } else {
                    this.dependencies.push({ from: fromId, to: toId });
                }
                this.calculateTopology();
            },

            hasDependency(fromId, toId) {
                return this.dependencies.some(d => d.from === fromId && d.to === toId);
            },

            // --- THE DETERMINISTIC MATH ENGINE ---
            calculateTopology() {
                if (this.teams.length === 0) {
                    this.metrics = { couplingScore: 0, velocity: 100, archType: "Empty" };
                    return;
                }

                let friction = 0;
                let drag = 0;

                // 1. Node Analysis (Types)
                const silos = this.teams.filter(t => t.type === 'silo').length;
                const gatekeepers = this.teams.filter(t => t.type === 'gatekeeper').length;
                const squads = this.teams.filter(t => t.type === 'squad').length;

                // Silos add inherent friction (Communication overhead)
                friction += (silos * 15);
                
                // Gatekeepers destroy velocity
                drag += (gatekeepers * 25);

                // 2. Edge Analysis (Dependencies)
                this.dependencies.forEach(dep => {
                    const from = this.teams.find(t => t.id === dep.from);
                    const to = this.teams.find(t => t.id === dep.to);
                    
                    // Linking two Silos = TIGHT COUPLING (Integration Tax)
                    if (from.type === 'silo' && to.type === 'silo') friction += 20;
                    
                    // Linking Squad to Platform = GOOD (Loose Coupling)
                    else if (to.type === 'platform') friction += 5; // Minimal friction
                    
                    // Linking anything to Gatekeeper = STOP (High Drag)
                    else if (to.type === 'gatekeeper') drag += 30;
                    
                    // Squad to Squad = Coordination Cost
                    else friction += 10;
                });

                // 3. Normalize Metrics
                this.metrics.couplingScore = Math.min(100, friction);
                this.metrics.velocity = Math.max(0, 100 - drag - (friction * 0.5));

                // 4. Determine Architecture Archetype
                if (gatekeepers > 1) this.metrics.archType = "Bureaucratic Waterfall";
                else if (this.metrics.couplingScore > 70) this.metrics.archType = "Distributed Monolith (Spaghetti)";
                else if (silos > squads) this.metrics.archType = "Service-Oriented Architecture (SOA)";
                else this.metrics.archType = "Microservices Mesh (Agile)";
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateConwayPrompt() {
                const m = this.metrics;
                const teamList = this.teams.map(t => `- ${t.name} (${t.type.toUpperCase()})`).join("\n");
                const depList = this.dependencies.map(d => {
                    const f = this.teams.find(t => t.id === d.from).name;
                    const t = this.teams.find(t => t.id === d.to).name;
                    return `${f} depends on ${t}`;
                }).join(", ");

                return `ACT AS: A Chief Software Architect and Organizational Designer.

## THE CONWAY'S LAW SIMULATION
I have modeled my organization to predict the resulting software architecture.
- **Topology:** ${this.teams.length} Teams, ${this.dependencies.length} Hard Dependencies.
- **Calculated Coupling Score:** ${m.couplingScore}/100 (Higher = Spaghettification).
- **Predicted Velocity:** ${m.velocity.toFixed(0)}/100.
- **Resulting Architecture:** "${m.archType}".

## THE ORG CHART INPUT
${teamList}
**Hard Dependencies:** ${depList || "None (Silos are isolated)"}

## YOUR DIAGNOSIS (THE INVERSE CONWAY MANEUVER)
1. **The Architecture Mirror:** Explain exactly why this specific org structure will create a "${m.archType}" in the code (e.g. "Because Team A depends on Team B, their databases will be tightly coupled").
2. **The Breaking Point:** Identify the single biggest bottleneck in this graph.
3. **The Re-Org:** Propose one specific structural change (e.g. "Merge Team X and Y" or "Turn Team Z into a Self-Service Platform") to fix the architecture.

TONE: Technical, systemic, authoritative. Quote Melvin Conway.`;
            }
        },

        // ------------------------------------------------------------------
        // DUMB PIPE CALCULATOR (Deterministic Strategy Engine)
        // ------------------------------------------------------------------
        dumbPipeCalc: {
            inputs: {
                commodity_share: 60, // % of revenue from interchange/fees (bad) vs advisory (good)
                aggregator_share: 20, // % of traffic coming via 3rd parties (Apple Wallet, Mint, etc)
                daily_logins: 30, // % of customers logging into YOUR app daily
                nps: 20 // Net Promoter Score (-100 to 100)
            },
            result: null,

            analyze() {
                const i = this.inputs;
                
                // 1. THE MATH ENGINE
                // Base Risk: Dependency on commodity revenue (Interchange/Overdraft)
                let riskScore = i.commodity_share * 0.5;

                // Interface Risk: If traffic comes via Aggregators, you lost the front end
                riskScore += (i.aggregator_share * 0.4);

                // Mitigation: Daily engagement reduces churn risk
                // If 50% log in daily, we reduce risk by 20 points
                const stickiness = Math.min(50, i.daily_logins) * 0.4;
                riskScore -= stickiness;

                // Mitigation: Brand Love (NPS)
                // High NPS acts as a moat. Low NPS accelerates commoditization.
                if (i.nps < 0) riskScore += 10; // Penalty for hatred
                if (i.nps > 50) riskScore -= 10; // Bonus for love

                // Clamp 0-100
                riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

                // 2. DIAGNOSTIC PROFILING
                let archetype = "";
                let verdict = "";
                let color = "";

                if (riskScore > 80) {
                    archetype = "The Invisible Utility";
                    verdict = "TERMINAL DECLINE";
                    color = "text-risk";
                } else if (riskScore > 50) {
                    archetype = "The Interchange Junkie";
                    verdict = "HIGH RISK";
                    color = "text-orange-500";
                } else if (i.aggregator_share > 60) {
                    archetype = "The Embedded Balance Sheet"; // Profitable but invisible
                    verdict = "PIVOT REQUIRED";
                    color = "text-yellow-400";
                } else {
                    archetype = "The Primary Partner";
                    verdict = "SUSTAINABLE";
                    color = "text-primary";
                }

                this.result = {
                    score: riskScore,
                    archetype,
                    verdict,
                    color,
                    burnRate: (100 - riskScore) / 2 // Years left logic simulation
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateStrategyPrompt() {
                if (!this.result) return "Run calculation first.";
                
                const r = this.result;
                const i = this.inputs;

                return `ACT AS: An Activist Investor and Fintech Strategist.

## THE DISTRESS SIGNAL (DUMB PIPE ANALYSIS)
I have audited my bank's business model vulnerability.
- **Risk Score:** ${r.score}/100 (Probability of becoming a commodity utility).
- **Current Archetype:** "${r.archetype}".
- **Revenue Mix:** ${i.commodity_share}% Commodity (Interchange/Fees).
- **Interface Control:** ${i.aggregator_share}% of traffic comes via 3rd Parties (Apple/Plaid).
- **Customer Moat:** ${i.daily_logins}% DAU, NPS ${i.nps}.

## THE STRATEGIC PIVOT
The data suggests we are on a path to "${r.verdict}". 

## YOUR MISSION
Write a **"Save the Bank" Strategic Memo** to the Board.
1. **The Brutal Truth:** Explain why high Aggregator Traffic (${i.aggregator_share}%) + High Commodity Revenue (${i.commodity_share}%) guarantees margin compression.
2. **The Defensive Move:** Propose 1 feature to increase "Stickiness" (e.g. Subscription Banking, Embedded Identity).
3. **The Offensive Move:** Should we fight for the interface (Super App) or accept our fate and become a "Banking-as-a-Service" provider? Pick a lane.

TONE: Urgent, financial, high-stakes.`;
            }
        },

        // ------------------------------------------------------------------
        // AGILE DATA GOVERNANCE DASHBOARD (Deterministic SRE Simulator)
        // ------------------------------------------------------------------
        dataGovDash: {
            isLive: false,
            interval: null,
            selectedProduct: null,
            activeIncident: null, // Stores current failure data
            
            // The Data Asset Portfolio
            products: [
                { 
                    id: 'cust360', 
                    name: "Customer 360", 
                    owner: "Marketing Squad", 
                    criticality: "HIGH",
                    costPerMinute: 500, // $ lost per minute of downtime
                    slo: { freshness: 99.9, accuracy: 99.9 },
                    status: 'healthy'
                },
                { 
                    id: 'risk_engine', 
                    name: "Credit Risk Engine", 
                    owner: "Risk Squad", 
                    criticality: "CRITICAL",
                    costPerMinute: 2000, 
                    slo: { freshness: 99.9, accuracy: 99.9 },
                    status: 'healthy'
                },
                { 
                    id: 'payments', 
                    name: "Real-Time Payments", 
                    owner: "Payments Tribe", 
                    criticality: "CRITICAL",
                    costPerMinute: 5000, 
                    slo: { freshness: 99.9, accuracy: 99.9 },
                    status: 'healthy'
                }
            ],

            toggleSim() {
                if (this.isLive) {
                    clearInterval(this.interval);
                    this.isLive = false;
                } else {
                    this.isLive = true;
                    this.interval = setInterval(() => this.tick(), 1000);
                }
            },

            tick() {
                // 1. Healthy Fluctuation
                this.products.forEach(p => {
                    if (p.status === 'healthy') {
                        // Tiny variations to look alive
                        p.slo.freshness = Math.min(100, Math.max(98, p.slo.freshness + (Math.random() - 0.5)));
                        p.slo.accuracy = Math.min(100, Math.max(99, p.slo.accuracy + (Math.random() - 0.5)));
                    } else if (p.status === 'critical') {
                        // 2. Incident Logic: Metrics crash
                        if (this.activeIncident.type === 'schema') p.slo.accuracy = Math.max(0, p.slo.accuracy - 5);
                        if (this.activeIncident.type === 'latency') p.slo.freshness = Math.max(0, p.slo.freshness - 8);
                        
                        // 3. Financial Impact Accumulator
                        this.activeIncident.totalCost += p.costPerMinute / 60; // Add cost per second
                    }
                });
            },

            injectFailure(type) {
                if (!this.isLive) this.toggleSim();
                
                // Target a random product
                const target = this.products[Math.floor(Math.random() * this.products.length)];
                target.status = 'critical';
                this.selectedProduct = target;

                this.activeIncident = {
                    product: target.name,
                    owner: target.owner,
                    type: type, // 'schema' or 'latency'
                    startTime: new Date().toLocaleTimeString(),
                    totalCost: 0,
                    errorMsg: type === 'schema' ? "ERR_NULL_POINTER: 'Credit_Score' field missing in stream." : "ERR_TIMEOUT: Kafka Consumer Lag > 5000ms."
                };
            },

            repair() {
                if (this.selectedProduct) {
                    this.selectedProduct.status = 'healthy';
                    this.selectedProduct.slo.freshness = 99.9;
                    this.selectedProduct.slo.accuracy = 99.9;
                    // Keep the incident data for the report, but mark resolved in UI
                }
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateRCAPrompt() {
                if (!this.activeIncident) return "No incident to report.";
                
                const inc = this.activeIncident;
                const cost = Math.round(inc.totalCost).toLocaleString();

                return `ACT AS: A Site Reliability Engineer (SRE) and Data Product Owner.

## THE INCIDENT REPORT (ROOT CAUSE ANALYSIS)
A data failure occurred in the "${inc.product}" product.
- **Incident Type:** ${inc.type === 'schema' ? "Schema Drift (Breaking Change)" : "Latency Spike (Data Freshness Failure)"}
- **Error Log:** "${inc.errorMsg}"
- **Business Impact:** Service degraded. Estimated financial loss: $${cost} (based on downtime duration).
- **Owner:** ${inc.owner}

## YOUR MISSION
Draft a **"5 Whys" Post-Mortem Email** to the Executive Committee.
1. **The Executive Summary:** Explain what broke and the financial impact in plain English (no tech jargon).
2. **The Root Cause:** Explain that this wasn't just "bad luck", it was a lack of Governance (e.g., "We pushed code without checking the data contract").
3. **The Fix:** Propose a specific automated guardrail (e.g., "Implement Schema Registry checks in CI/CD") to ensure this never happens again.

TONE: Accountable, transparent, systems-thinking (blame the process, not the person).`;
            }
        },

    // ------------------------------------------------------------------
        // SHADOW IT AUDIT (Deterministic TCO & Risk Engine)
        // ------------------------------------------------------------------
        shadowAudit: {
            inventory: [],
            form: {
                name: '',
                users: 5,
                costPerUser: 20, // Monthly
                dataLevel: 'internal', // public, internal, confidential, restricted
                integration: 'silo' // silo (manual export), api (automated)
            },
            summary: { totalCost: 0, hiddenTax: 0, highRiskCount: 0 },

            init() {
                // Load from local storage if available
                const saved = localStorage.getItem('bilingual_shadow_inventory');
                if (saved) {
                    this.inventory = JSON.parse(saved);
                    this.calculateTotals();
                }
            },

            addTool() {
                if (!this.form.name) return alert("Enter tool name.");
                
                const f = this.form;
                
                // 1. Math: Annual License Cost
                const licenseCost = f.users * f.costPerUser * 12;

                // 2. Math: The "Shadow Tax" (Hidden Operational Costs)
                // - Silos cost 50% more due to manual data copy-pasting/CSV exports
                // - APIs cost 10% more due to maintenance
                const taxRate = f.integration === 'silo' ? 0.50 : 0.10;
                const hiddenTax = licenseCost * taxRate;

                // 3. Math: Risk Score (1-10)
                let risk = 1;
                if (f.dataLevel === 'internal') risk = 3;
                if (f.dataLevel === 'confidential') risk = 7;
                if (f.dataLevel === 'restricted') risk = 10; // PII/Financials
                
                // Penalty for silos handling restricted data
                if (risk >= 7 && f.integration === 'silo') risk += 2; // Data leakage risk is higher

                // 4. Verdict
                let verdict = "ALLOW";
                if (risk >= 8) verdict = "SHUTDOWN";
                else if (risk >= 5) verdict = "REGULATE";
                else if (licenseCost > 50000) verdict = "CONSOLIDATE";

                this.inventory.push({
                    id: Date.now(),
                    name: f.name,
                    licenseCost,
                    hiddenTax,
                    trueCost: licenseCost + hiddenTax,
                    risk,
                    verdict,
                    dataLevel: f.dataLevel,
                    integration: f.integration
                });

                this.save();
                this.form.name = ''; // Reset name only, keep settings for fast entry
            },

            removeTool(id) {
                this.inventory = this.inventory.filter(t => t.id !== id);
                this.save();
            },

            save() {
                this.calculateTotals();
                localStorage.setItem('bilingual_shadow_inventory', JSON.stringify(this.inventory));
            },

            calculateTotals() {
                this.summary.totalCost = this.inventory.reduce((acc, t) => acc + t.trueCost, 0);
                this.summary.hiddenTax = this.inventory.reduce((acc, t) => acc + t.hiddenTax, 0);
                this.summary.highRiskCount = this.inventory.filter(t => t.risk >= 8).length;
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateGovernancePrompt() {
                if (this.inventory.length === 0) return "Add tools to inventory first.";

                const highRiskTools = this.inventory.filter(t => t.risk >= 8);
                const siloTools = this.inventory.filter(t => t.integration === 'silo');
                const totalWaste = this.summary.hiddenTax;

                let focus = "";
                if (highRiskTools.length > 0) focus = `SECURITY ALERT. We have ${highRiskTools.length} tools handling Restricted Data without IT oversight.`;
                else if (siloTools.length > 3) focus = `DATA FRAGMENTATION. We have ${siloTools.length} data silos creating manual work.`;
                else focus = "COST OPTIMIZATION. We are paying a 'Shadow Tax' on unmanaged licenses.";

                const toolList = this.inventory.map(t => 
                    `- **${t.name}**: True Cost $${Math.round(t.trueCost).toLocaleString()} (Risk: ${t.risk}/10 | Verdict: ${t.verdict})`
                ).join("\n");

                return `ACT AS: A Chief Information Security Officer (CISO) and CFO.

## THE SHADOW IT AUDIT FINDINGS
I have scanned our environment for unauthorized SaaS usage.
- **Total Annual Liability:** $${Math.round(this.summary.totalCost).toLocaleString()}
- **The "Shadow Tax":** $${Math.round(this.summary.hiddenTax).toLocaleString()} (Wasted on manual data entry & lack of integration).
- **Primary Concern:** ${focus}

## INVENTORY LIST
${toolList}

## YOUR MISSION
Write a **Governance Memo** to the Department Heads.
1. **The Policy:** Define a clear "Red Line" based on the data above (e.g. "No tools handling PII without SSO").
2. **The Amnesty Offer:** Propose a "Bring your own tool" amnesty period where they can register tools without punishment, IF they integrate them via API.
3. **The Crackdown:** For the tools marked "SHUTDOWN", draft the email explaining why access is being revoked immediately (cite Data Sovereignty or GDPR).

TONE: Firm but fair. Focus on Risk and Waste, not bureaucracy.`;
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

