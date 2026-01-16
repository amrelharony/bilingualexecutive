// js/app.js

document.addEventListener('alpine:init', () => {
    Alpine.data('toolkit', () => ({
        // ------------------------------------------------------------------
        // INITIALIZATION
        // ------------------------------------------------------------------
        init() {
            this.isMobile = window.innerWidth < 768;
            window.addEventListener('resize', () => { this.isMobile = window.innerWidth < 768; });

                        // Initialize Supabase Client
            if (window.supabase) {
                const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
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

            // 2. Show the banner for EVERYONE on mobile (iOS & Android)
            // We moved this OUTSIDE the event listener so it works on iPhones too
            if (this.isMobile && !isPWA) {
                // Check if they dismissed it previously
                const dismissed = localStorage.getItem('pwaPromptDismissed');
                
                // If not dismissed, show it after 2 seconds
                if (!dismissed) {
                    setTimeout(() => { this.showPwaPrompt = true; }, 2000);
                }
            }

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

                                const savedShadow = localStorage.getItem('bilingual_shadow_inventory');
                if (savedShadow) {
                    this.shadowAudit.inventory = JSON.parse(savedShadow);
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
          
            this.culturalMonitor.init(); 

                        const secureBind = this.askSecureAI.bind(this);
            
            this.rolePlay.askSecureAI = secureBind;
            this.whatIf.askSecureAI = secureBind;
            this.riskSim.askSecureAI = secureBind;
            this.shadowAudit.askSecureAI = secureBind;
            this.hallucinationDetector.askSecureAI = secureBind;
            this.kpiDesigner.askSecureAI = secureBind;
            this.vendorCoach.askSecureAI = secureBind;
            


        },

                // ==================================================================
        // PASTE THE NEW HELPER FUNCTION HERE
        // ==================================================================
        async askSecureAI(systemPrompt, userInput, model = "gemini-3-flash-preview") {
            // Check if Supabase is initialized
            if (!this.supabase) {
                console.error("Supabase not initialized");
                return "System Error: Database connection missing.";
            }

            try {
                // Calls the Edge Function named 'bilingual-ai'
                const { data, error } = await this.supabase.functions.invoke('bilingual-ai', {
                    body: { 
                        system: systemPrompt, 
                        input: userInput,
                        model: model 
                    }
                });

                if (error) throw error;
                return data.text;

            } catch (err) {
                console.error("AI Error:", err);
                return "I apologize, but I cannot connect to the neural core right now.";
            }
        },


        // ------------------------------------------------------------------
        // STATE VARIABLES
        // ------------------------------------------------------------------
        
        
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

        isChatOpen: false,
        chatInput: '',
        chatMessages: [],
        isTyping: false,
        userApiKey: '',
        showKeyModal: false,

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
        talentSkills: [ { label: "Tech Fluency", val: 3 }, { label: "P&L Literacy", val: 3 }, { label: "Data Culture", val: 3 }, { label: "Squad Autonomy", val: 3 }, { label: "Change EQ", val: 3 } ],
        
        talentChartInstance: null,
        gapChartInstance: null,

        // ------------------------------------------------------------------
        // NEW FEATURE: CASE STUDY SIMULATOR
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
                    feedback: choice.feedback,
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
        // ROLE-PLAY SIMULATOR
        // ------------------------------------------------------------------
        rolePlay: {
            active: false,
            scenario: null,
            messages: [],
            input: '',
            loading: false,
            
            // The Scenarios
            scenarios: [
                {
                    id: 'cloud',
                    title: 'The Cloud Skeptic',
                    myRole: 'Chief Digital Officer',
                    opponent: 'CFO',
                    topic: 'Cloud Migration Cost',
                    intro: 'I see a $10M request for AWS. Our physical data centers are fully paid for. Why should I approve this massive OpEx spike just to rent computers?'
                },
                {
                    id: 'mvp',
                    title: 'The Scope Creeper',
                    myRole: 'Product Owner',
                    opponent: 'Head of Sales',
                    topic: 'Minimum Viable Product',
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
                this.scenario = this.scenarios[index];
                this.messages = [
                    { role: 'opponent', text: this.scenario.intro }
                ];
                this.input = '';
            },

            stop() {
                this.active = false;
                this.messages = [];
            },
async send() {
                if (!this.input.trim()) return;
                
                // 1. Add User Message locally
                this.messages.push({ role: 'user', text: this.input });
                const userText = this.input;
                this.input = '';
                this.loading = true;

                // 2. Construct the Persona Context
                // We access the current scenario's details using 'this.scenario'
                const systemPrompt = `
                    ACT AS: ${this.scenario.opponent} at a traditional bank.
                    USER IS: ${this.scenario.myRole}.
                    TOPIC: ${this.scenario.topic}.
                    GOAL: You are skeptical and resistant to change. The user must convince you using "Business Value".
                    HISTORY: ${JSON.stringify(this.messages)}
                    INSTRUCTION: Keep response under 50 words.
                `;

                // 3. Call Secure Backend
                // Note: We access the main toolkit function via 'this'
                const reply = await this.askSecureAI(systemPrompt, userText);

                // 4. Update UI
                this.messages.push({ role: 'opponent', text: reply });
                this.loading = false;
            }

        }, 
                    

        // ------------------------------------------------------------------
        // CULTURAL DEBT MONITOR
        // ------------------------------------------------------------------
        culturalMonitor: {
            history: [],
            isCheckinOpen: false,
            answers: { q1: null, q2: null, q3: null },
            chartInstance: null,

            // Initialize: Load history from LocalStorage
            init() {
                try {
                    const saved = localStorage.getItem('bilingual_culture_history');
                    if (saved) this.history = JSON.parse(saved);
                } catch (e) { console.error("Load Error", e); }
            },

            // The Check-In Logic
            submitCheckin() {
                // Calculate Debt Score (0-100, Higher is worse)
                let debt = 0;
                
                // Q1: Bad News Shared? (If Yes, Debt decreases. If No, Fear exists.)
                if (this.answers.q1 === 'no') debt += 40; 
                
                // Q2: HiPPO Override? (If Yes, Debt increases.)
                if (this.answers.q2 === 'yes') debt += 30;

                // Q3: Shipped Value? (If No, Stagnation adds debt.)
                if (this.answers.q3 === 'no') debt += 30;

                const entry = {
                    date: new Date().toLocaleDateString(),
                    score: debt,
                    timestamp: Date.now()
                };

                this.history.push(entry);
                // Keep last 10 entries
                if (this.history.length > 10) this.history.shift();
                
                localStorage.setItem('bilingual_culture_history', JSON.stringify(this.history));
                
                this.isCheckinOpen = false;
                this.answers = { q1: null, q2: null, q3: null };
                
                // Refresh Chart
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

            reset() {
                if(confirm("Clear all history?")) {
                    this.history = [];
                    localStorage.removeItem('bilingual_culture_history');
                    if(this.chartInstance) this.chartInstance.destroy();
                }
            },

            renderChart() {
                // Wait for DOM
                setTimeout(() => {
                    const ctx = document.getElementById('debtChart');
                    if (!ctx) return;
                    
                    if (this.chartInstance) this.chartInstance.destroy();

                    const labels = this.history.map(h => h.date);
                    const data = this.history.map(h => h.score);
                    const color = this.currentScore > 50 ? '#f87171' : '#4ade80';

                    this.chartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Cultural Debt %',
                                data: data,
                                borderColor: color,
                                backgroundColor: color + '20', // transparent
                                tension: 0.4,
                                fill: true
                            }]
                        },
                        options: {
                            scales: { y: { min: 0, max: 100, grid: { color: '#334155' } }, x: { display: false } },
                            plugins: { legend: { display: false } },
                            animation: false
                        }
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
        
        // ------------------------------------------------------------------
        //  API SANDBOX
        // ------------------------------------------------------------------
        apiSandbox: {
            pipeline: [], // Stores selected components
            isRunning: false,
            result: null, // Holds the simulation result
            
            // The Menu of Components
            catalog: [
                { id: 'mainframe', label: 'Legacy Core (COBOL)', latency: 2000, risk: 'High', icon: 'fa-server', color: 'text-risk border-risk' },
                { id: 'esb', label: 'Enterprise Bus', latency: 800, risk: 'Med', icon: 'fa-network-wired', color: 'text-warn border-warn' },
                { id: 'api', label: 'Modern REST API', latency: 100, risk: 'Low', icon: 'fa-cloud', color: 'text-blue-400 border-blue-400' },
                { id: 'cache', label: 'Redis Cache', latency: 10, risk: 'Low', icon: 'fa-bolt', color: 'text-yellow-400 border-yellow-400' },
                { id: 'firewall', label: 'Legacy Firewall', latency: 500, risk: 'Low', icon: 'fa-shield-halved', color: 'text-slate-400 border-slate-400' }
            ],

            addComponent(item) {
                if (this.pipeline.length < 5) {
                    // Create a copy of the item
                    this.pipeline.push({ ...item, uid: Date.now() });
                    this.result = null; // Reset results on change
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

                // Calculate total theoretical latency
                const totalLatency = this.pipeline.reduce((sum, item) => sum + item.latency, 0);
                
                // Visualize the "Flow" (Artificial delay for effect)
                // We cap the animation at 3 seconds max for UX, but show real numbers
                const animationTime = Math.min(totalLatency, 3000); 

                await new Promise(r => setTimeout(r, animationTime));

                this.isRunning = false;
                
                // Generate Insight
                let message = "";
                if (totalLatency < 300) message = "🚀 BILINGUAL SPEED! You built a modern, cached architecture.";
                else if (totalLatency < 1500) message = "⚠️ AVERAGE. Typical hybrid bank. Functional but sluggish.";
                else message = "🐢 LEGACY CRAWL. This request timed out. The customer went to a Fintech.";

                this.result = {
                    time: totalLatency,
                    message: message
                };
            }
        },

        // ------------------------------------------------------------------
        // WHAT-IF SCENARIO PLANNER
        // ------------------------------------------------------------------
        whatIf: {
            input: '',
            loading: false,
            result: null,
            
            // Quick-start prompts for the user
            examples: [
                "What if we outsource our Core Banking maintenance to a vendor?",
                "What if we delay the mobile app rewrite by 6 months to save cash?",
                "What if we use Generative AI to automate loan approvals?"
            ],

            setInput(text) {
                this.input = text;
            },

            async analyze() {
                if (!this.input.trim()) return;
                
                this.loading = true;
                this.result = null;

                // 1. Construct the Prompt
                const systemPrompt = `
                    ACT AS: A top-tier Strategy Consultant advising a Bank Board.
                    TASK: Analyze the following strategic hypothesis: "${this.input}"
                    
                    OUTPUT FORMAT: A structured 'Board Briefing Note' in Markdown.
                    SECTIONS REQUIRED:
                    1. **Executive Verdict**: "GREEN LIGHT", "YELLOW LIGHT", or "RED LIGHT".
                    2. **The Technical Reality**: Architecture impact & complexity.
                    3. **The Financial Lens**: CapEx vs OpEx & ROI.
                    4. **Risk & Governance**: Regulatory hurdles.
                    5. **The Bilingual Recommendation**: Decisive advice.
                    TONE: Professional, concise, brutal honesty.
                `;

                try {
                    // 2. Call Secure Backend
                    const aiResponse = await this.askSecureAI(systemPrompt, this.input);
                    
                    // 3. Render Result
                    // Use 'marked' if available to convert Markdown to HTML, otherwise plain text
                    let html = (typeof marked !== 'undefined') ? marked.parse(aiResponse) : aiResponse;
                    this.result = DOMPurify.sanitize(html);

                } catch (e) {
                    this.result = `<p class='text-risk'>Simulation Failed: ${e.message}</p>`;
                } finally {
                    this.loading = false;
                }
            },

        // ------------------------------------------------------------------
        // NAVIGATION & TOOLS
        // ------------------------------------------------------------------
        navItems: [ 
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-home' }, 
            { id: 'feed', label: 'Daily Feed', icon: 'fa-solid fa-mug-hot' },
            { id: 'simulator', label: 'Meridian Sim', icon: 'fa-solid fa-chess-knight' }, 
            { id: 'whatif', label: 'Scenario Planner', icon: 'fa-solid fa-chess-rook' },
            { id: 'risksim', label: 'Risk Simulator', icon: 'fa-solid fa-scale-balanced' },
            { id: 'roleplay', label: 'Role-Play Dojo', icon: 'fa-solid fa-user-tie' },
            { id: 'sandbox', label: 'Architecture Sim', icon: 'fa-solid fa-shapes' },
            { id: 'culture', label: 'Debt Monitor', icon: 'fa-solid fa-heart-pulse' },
            { id: 'quiz', label: 'Flashcards', icon: 'fa-solid fa-graduation-cap' },
            { id: 'assessment', label: 'Agile Audit', icon: 'fa-solid fa-clipboard-check' }, 
            { id: 'translator', label: 'Translator', icon: 'fa-solid fa-language' }, 
            { id: 'matrix', label: 'Strategy Matrix', icon: 'fa-solid fa-chess-board' }, 
            { id: 'compass', label: 'Compass', icon: 'fa-regular fa-compass' }, 
            { id: 'canvas', label: 'Data Canvas', icon: 'fa-solid fa-file-contract' }, 
            { id: 'talent', label: 'Talent Radar', icon: 'fa-solid fa-fingerprint' }, 
            { id: 'lighthouse', label: 'Lighthouse', icon: 'fa-solid fa-lightbulb' }, 
             { id: 'builder', label: 'Lighthouse Builder', icon: 'fa-solid fa-hammer' }, 
            { id: 'board', label: 'Board Guide', icon: 'fa-solid fa-chess-king' }, 
            { id: 'repair', label: 'Repair Kit', icon: 'fa-solid fa-toolbox' }, 
            { id: 'glossary', label: 'Glossary', icon: 'fa-solid fa-book-open' }, 
            { id: 'resources', label: 'Resources', icon: 'fa-solid fa-book-bookmark' }, 
            { id: 'excel', label: 'Excel Calculator', icon: 'fa-solid fa-file-excel' },
            { id: 'strangler', label: 'Strangler Visualizer', icon: 'fa-solid fa-network-wired' },
            { id: 'hippo', label: 'HIPPO Tracker', icon: 'fa-solid fa-crown' },
            { id: 'threat', label: 'Threat Monitor', icon: 'fa-solid fa-satellite-dish' },
            { id: 'shadow', label: 'Shadow IT Audit', icon: 'fa-solid fa-ghost' },
            { id: 'detector', label: 'Hallucination Check', icon: 'fa-solid fa-user-secret' },
            { id: 'squad', label: 'Squad Builder', icon: 'fa-solid fa-people-group' },
            { id: 'kpi', label: 'KPI Designer', icon: 'fa-solid fa-bullseye' },
            { id: 'proposal', label: 'Sandbox Gen', icon: 'fa-solid fa-file-signature' },
            { id: 'vendor', label: 'Vendor Coach', icon: 'fa-solid fa-handshake' },
            { id: 'community', label: 'Community', icon: 'fa-solid fa-users' }, 
            { id: 'architect', label: 'Architect Console', icon: 'fa-solid fa-microchip text-hotpink', vip: true },
        ],
        
        dashboardTools: [ 
            { id: 'feed', label: 'Daily Insight', desc: 'Micro-lessons to build your streak.', icon: 'fa-solid fa-mug-hot', color: 'text-orange-400' },
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
            { id: 'builder', label: 'Charter Builder', desc: 'Generate a 90-day pilot contract.', icon: 'fa-solid fa-hammer', color: 'text-primary' },
            { id: 'repair', label: 'Repair Kit', desc: 'Fix stalled transformations.', icon: 'fa-solid fa-toolbox', color: 'text-risk' }, 
            { id: 'architect', label: 'Architect Console', desc: 'Access High-Level Scripts.', icon: 'fa-solid fa-microchip', color: 'text-hotpink', vip: true },
            { id: 'excel', label: 'Excel Exposure', desc: 'Calculate the cost & risk of manual spreadsheets.', icon: 'fa-solid fa-file-excel', color: 'text-green-400' },
            { id: 'hippo', label: 'HIPPO Tracker', desc: 'Log decisions where Opinion overruled Data.', icon: 'fa-solid fa-crown', color: 'text-yellow-500' },
            { id: 'threat', label: 'Open Banking Radar', desc: 'Real-time monitor of competitor API drain.', icon: 'fa-solid fa-satellite-dish', color: 'text-red-500' },
            { id: 'strangler', label: 'Strangler Pattern', desc: 'Visualize legacy modernization strategy.', icon: 'fa-solid fa-network-wired', color: 'text-purple-400' },
            { id: 'detector', label: 'AI Hallucination Detector', desc: 'Verify GenAI outputs against your Credit & Risk policies.', icon: 'fa-solid fa-shield-cat', color: 'text-risk' },
            { id: 'squad', label: 'Bilingual Squad Builder', desc: 'Design the perfect cross-functional team and test its velocity.', icon: 'fa-solid fa-puzzle-piece', color: 'text-indigo-400' },
            { id: 'kpi', label: 'Outcome vs. Output', desc: 'Convert vague "Project" goals into measurable "Product" value.', icon: 'fa-solid fa-chart-line', color: 'text-green-400' },
            { id: 'shadow', label: 'Shadow IT Discovery', desc: 'Audit SaaS tools and calculate the Integration Tax.', icon: 'fa-solid fa-ghost', color: 'text-purple-400' },
            { id: 'proposal', label: 'Regulatory Sandbox Generator', desc: 'Create a compliant waiver request for your Risk Committee.', icon: 'fa-solid fa-scale-unbalanced', color: 'text-blue-400' },
            { id: 'vendor', label: 'Vendor Partnership Pyramid', desc: 'AI Coach to renegotiate contracts from "Time & Materials" to "Shared Outcomes".', icon: 'fa-solid fa-file-contract', color: 'text-yellow-400' },
            { id: 'risksim', label: 'Risk vs. Speed', desc: 'Simulate a high-stakes negotiation with a Risk Officer.', icon: 'fa-solid fa-scale-balanced', color: 'text-risk' },

        ],
        
        // ------------------------------------------------------------------
        // METHODS
        // ------------------------------------------------------------------
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
            try { localStorage.setItem('pwaPromptDismissed', 'true'); } catch(e){}
        },

        async installPwa() {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.deferredPrompt = null;
                    this.showPwaPrompt = false;
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

        saveApiKey() {
            try { 
                localStorage.setItem('bilingual_api_key', this.userApiKey); 
                this.showKeyModal = false; 
                alert("API Key saved securely to your device.");
            } 
            catch (e) { alert("Storage Error: Private Browsing may be enabled."); }
        },

        async sendMessage() {
            if (!this.chatInput.trim()) return;
            
            // Security check for DOMPurify
            if (typeof DOMPurify === 'undefined') { 
                this.chatMessages.push({ role: 'bot', text: "Error: Security module missing." }); 
                return; 
            }

            // 1. Prepare UI
            const userText = DOMPurify.sanitize(this.chatInput);
            this.chatMessages.push({ role: 'user', text: userText });
            const currentInput = this.chatInput; // Capture input
            this.chatInput = '';
            this.isTyping = true;
            this.scrollToBottom();

            // 2. Define Persona
            const systemPrompt = "You are 'The Translator', a Bilingual Executive Assistant. Translate technical jargon into business impact (P&L, Risk, Speed). Rules: Technical Debt->Financial leverage; Refactoring->Renovation; Microservices->Legos; API->Universal Adapter. Tone: Concise, executive.";

            // 3. Call Secure Backend (No local keys!)
            // Note: This uses the helper function we added in Step A
            const aiResponse = await this.askSecureAI(systemPrompt, currentInput);

            // 4. Render Response
            this.isTyping = false;
            let parsedText = aiResponse;
            
            // Simple Markdown parsing if marked.js isn't loaded
            if (typeof marked !== 'undefined') {
                parsedText = marked.parse(aiResponse);
            } else {
                parsedText = aiResponse.replace(/\n/g, "<br>");
            }

            const cleanHtml = DOMPurify.sanitize(parsedText);
            this.chatMessages.push({ role: 'bot', text: cleanHtml });
            this.scrollToBottom();
        },

        
        scrollToBottom() { 
            this.$nextTick(() => { 
                const c = document.getElementById('chat-messages-container'); 
                if (c) c.scrollTop = c.scrollHeight; 
            }); 
        },

        copyToClipboard(text, type) {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text)
                    .then(() => alert(`${type} copied!`))
                    .catch(() => this.fallbackCopy(text, type));
            } else {
                this.fallbackCopy(text, type);
            }
        },
        
        fallbackCopy(text, type) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed"; 
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert(`${type} copied!`);
            } catch (err) {
                alert("Copy failed. Please copy manually.");
            }
            document.body.removeChild(textArea);
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
            this.$nextTick(() => {
                const ctx = document.getElementById('talentChart');
                if (!ctx) return;
                
                // 1. Destroy existing global instance to prevent memory leaks
                if (window.myTalentChart) {
                    window.myTalentChart.destroy();
                }
                
                // 2. Configure Font
                Chart.defaults.font.family = '"JetBrains Mono", monospace';
                Chart.defaults.color = '#94a3b8';

                // 3. Create new instance attached to Window (bypassing Alpine Proxy)
                window.myTalentChart = new Chart(ctx, { 
                    type: 'radar', 
                    data: { 
                        labels: this.talentSkills.map(s => s.label), 
                        datasets: [{ 
                            label: 'Candidate Shape',
                            data: this.talentSkills.map(s => s.val), 
                            backgroundColor: 'rgba(244, 114, 182, 0.2)', 
                            borderColor: '#f472b6', 
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#f472b6'
                        }] 
                    }, 
                    options: { 
                        animation: false, // Disable animation for instant slider feedback
                        plugins: { legend: { display: false } }, 
                        scales: { 
                            r: { 
                                min: 0, 
                                max: 5, 
                                ticks: { display: false }, 
                                grid: { color: '#334155' }, 
                                angleLines: { color: '#334155' },
                                pointLabels: { color: '#f1f5f9', font: { size: 11 } }
                            } 
                        } 
                    } 
                });
            });
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
        
        getCompassResult() {
            const { x, y } = this.compassCoords;
            if (y > 50 && x > 50) return { title: "INNOVATION LEADER (NE)", desc: "Fast growth, but check your safety brakes." };
            if (y <= 50 && x <= 50) return { title: "TRADITIONAL BANKER (SW)", desc: "Safe and cheap, but you are slowly dying." };
            if (y > 50 && x <= 50) return { title: "RISK TAKER (NW)", desc: "High value but high control. Hard to sustain." };
            return { title: "DIGITAL FACTORY (SE)", desc: "Fast execution, but are you building the right thing?" };
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
        // ------------------------------------------------------------------
        // LIGHTHOUSE PROJECT BUILDER
        // ------------------------------------------------------------------
        lighthouseBuilder: {
            step: 1,
            // The Data Model
            form: {
                name: '',
                problem: '', 
                solution: '', 
                customer: '', 
                po: '', 
                tech: '', 
                risk_cap: '', 
                anti_scope: '', 
                success_metric: '' 
            },
            
            // Navigation logic
            nextStep() {
                if (this.validateStep()) this.step++;
            },
            prevStep() {
                this.step--;
            },
            
            validateStep() {
                const f = this.form;
                if (this.step === 1 && (!f.name || !f.problem)) { alert("Define the problem first."); return false; }
                if (this.step === 2 && (!f.po || !f.tech)) { alert("You need a Squad Leader."); return false; }
                if (this.step === 3 && (!f.risk_cap || !f.anti_scope)) { alert("Define the boundaries."); return false; }
                return true;
            },

            // PDF Generator
            generateCharter() {
                if (!window.jspdf) { alert("PDF Lib missing"); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const f = this.form;

                // 1. Branding / Header
                doc.setFillColor(15, 23, 42); // Dark Blue
                doc.rect(0, 0, 210, 40, "F");
                doc.setTextColor(74, 222, 128); // Neon Green
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text("LIGHTHOUSE CHARTER", 20, 20);
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text("90-DAY EXECUTION CONTRACT", 20, 30);

                // 2. Project Name & Core
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.text(`PROJECT: ${f.name.toUpperCase()}`, 20, 55);

                // 3. The Grid Layout
                let y = 70;
                
                // Helper function for sections
                const addSection = (title, content, yPos) => {
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100); 
                    doc.setFont("helvetica", "bold");
                    doc.text(title.toUpperCase(), 20, yPos);
                    
                    doc.setFontSize(11);
                    doc.setTextColor(0, 0, 0); 
                    doc.setFont("helvetica", "normal");
                    
                    const lines = doc.splitTextToSize(content, 170);
                    doc.text(lines, 20, yPos + 6);
                    
                    return yPos + 6 + (lines.length * 6) + 10; 
                };

                y = addSection("1. The Burning Problem", f.problem, y);
                y = addSection("2. The Hypothesis (Solution)", f.solution, y);
                
                // The Squad Box
                doc.setDrawColor(200, 200, 200);
                doc.rect(15, y, 180, 25);
                doc.setFontSize(10);
                doc.text(`PRODUCT OWNER (Mini-CEO): ${f.po}`, 20, y + 10);
                doc.text(`TECH LEAD (Architect): ${f.tech}`, 20, y + 20);
                y += 35;

                y = addSection("3. The 'Anti-Scope' (What we are NOT doing)", f.anti_scope, y);
                
                // The Governance Box
                doc.setFillColor(254, 242, 242); 
                doc.rect(15, y, 180, 30, "F");
                doc.setTextColor(185, 28, 28); 
                doc.setFont("helvetica", "bold");
                doc.text("4. THE REGULATORY SANDBOX (License to Operate)", 20, y + 8);
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "normal");
                doc.text(`Risk Cap / Volume Limit: ${f.risk_cap}`, 20, y + 18);
                doc.setFontSize(9);
                doc.text("NOTE: This project is exempt from standard architectural review for 90 days.", 20, y + 26);
                y += 40;

                y = addSection("5. Success Metric (Outcome)", f.success_metric, y);

                // Signatures
                doc.line(20, 260, 90, 260);
                doc.line(110, 260, 190, 260);
                doc.setFontSize(8);
                doc.text("PRODUCT OWNER SIGNATURE", 20, 265);
                doc.text("EXECUTIVE SPONSOR SIGNATURE", 110, 265);

                doc.save(`${f.name}_Lighthouse_Charter.pdf`);
            }
        }, // <--- THIS COMMA WAS LIKELY MISSING OR BROKEN

        // ------------------------------------------------------------------
        // DAILY FEED & HABIT TRACKER
        // ------------------------------------------------------------------
        dailyFeed: {
            currentLesson: null,
            streak: 0,
            completedToday: false,
            notificationPermission: 'default',

            init() {
                // 1. Load State
                const savedState = JSON.parse(localStorage.getItem('bilingual_feed_state') || '{}');
                this.streak = savedState.streak || 0;
                const lastCompleted = savedState.lastDate;

                // 2. Check Streak Logic
                const today = new Date().toDateString();
                if (lastCompleted === today) {
                    this.completedToday = true;
                } else if (lastCompleted) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (lastCompleted !== yesterday.toDateString()) {
                        this.streak = 0; 
                    }
                }

                // 3. Select Content
                const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
                this.currentLesson = this.content[dayOfYear % this.content.length];
                
                if ("Notification" in window) {
                    this.notificationPermission = Notification.permission;
                }
            },

            completeLesson() {
                if (this.completedToday) return;
                this.streak++;
                this.completedToday = true;
                localStorage.setItem('bilingual_feed_state', JSON.stringify({
                    streak: this.streak,
                    lastDate: new Date().toDateString()
                }));
                alert(`Lesson Complete! Streak: ${this.streak} Days 🔥`);
            },

            requestNotify() {
                if (!("Notification" in window)) {
                    alert("This browser does not support desktop notifications");
                } else {
                    Notification.requestPermission().then(permission => {
                        this.notificationPermission = permission;
                        if (permission === "granted") {
                            new Notification("Bilingual Exec", { body: "Daily notifications enabled!" });
                        }
                    });
                }
            },

            content: [
                {
                    term: "Idempotency",
                    pronounce: "eye-dem-po-ten-see",
                    def: "A property where an operation can be applied multiple times without changing the result beyond the initial application.",
                    impact: "Why the CEO cares: It prevents double-charging a customer if they click 'Pay' twice on a slow connection.",
                    quiz: { q: "If a user clicks 'Pay' 5 times, how many times are they charged?", options: ["5 times", "1 time", "0 times"], correct: 1 }
                },
                {
                    term: "Eventual Consistency",
                    pronounce: "e-ven-tual con-sis-ten-cy",
                    def: "A model where the system doesn't update everywhere instantly, but guarantees it will be correct 'eventually'.",
                    impact: "Why the CEO cares: It allows us to scale globally (Netflix/Uber model) but makes 'Real-Time Balance' checks tricky.",
                    quiz: { q: "Which system prioritizes Speed over Instant Accuracy?", options: ["Strong Consistency", "Eventual Consistency", "ACID Transaction"], correct: 1 }
                },
                {
                    term: "Circuit Breaker",
                    pronounce: "sir-kit bray-ker",
                    def: "A design pattern that detects failures and encapsulates the logic of preventing a failure from constantly recurring.",
                    impact: "Why the CEO cares: If the Credit Bureau API goes down, the app doesn't crash; it just stops asking for credit scores temporarily.",
                    quiz: { q: "What does a Circuit Breaker prevent?", options: ["Hackers", "Cascading Failure", "High Costs"], correct: 1 }
                },
                 {
                    term: "Containerization",
                    pronounce: "con-tain-er-i-za-shun",
                    def: "Bundling code with all its dependencies so it runs exactly the same on a laptop, a server, or the cloud.",
                    impact: "Why the CEO cares: It ends the excuse 'It worked on my machine.' It creates the portability needed to move to Cloud.",
                    quiz: { q: "What is the most popular container tool?", options: ["Kubernetes", "Docker", "Jenkins"], correct: 1 }
                }
            ]
        },

        // ------------------------------------------------------------------
        // RISK VS SPEED NEGOTIATION SIMULATOR
        // ------------------------------------------------------------------
        riskSim: {
            active: false,
            loading: false,
            input: '',
            messages: [],
            // The "Bilingual Balance" Scores (0-100)
            scores: { safety: 50, speed: 50 }, 
            turn: 0,
            maxTurns: 5,

            // The Scenario
            context: {
                role: "Risk Officer (Marcus)",
                mission: "You want to launch an AI Loan Assistant in 2 weeks. Marcus thinks it's reckless.",
                history: [] // Keeps track of conversation context
            },

            start() {
                this.active = true;
                this.messages = [];
                this.scores = { safety: 50, speed: 50 };
                this.turn = 0;
                this.history = [];
                
                // Initial Challenge from the AI
                this.addMessage('bot', "So, I hear you want to let a 'Black Box' algorithm approve loans without human review. Do you have any idea what the regulator will do to us if this hallucinates?");
            },

            addMessage(role, text) {
                this.messages.push({ role, text, timestamp: new Date().toLocaleTimeString() });
                this.context.history.push(`${role === 'user' ? 'Product Owner' : 'Risk Officer'}: ${text}`);
            },

            async sendReply() {
                if (!this.input.trim()) return;
                
                // 1. Add User Message
                const userText = this.input;
                this.addMessage('user', userText);
                this.input = '';
                this.loading = true;
                this.turn++;

                // 2. Check API Key
                const API_KEY = localStorage.getItem('bilingual_api_key');
                if (!API_KEY) {
                    this.addMessage('system', "Error: API Key missing. Please check settings.");
                    this.loading = false;
                    return;
                }

                // 3. The "Judge & Actor" Prompt
                const systemPrompt = `
                    ACT AS: Marcus, a cynical, veteran Chief Risk Officer at a bank.
                    SCENARIO: The user (Product Owner) wants to launch an AI Loan Tool in 2 weeks.
                    
                    YOUR TASK:
                    1. Analyze the user's latest response.
                    2. SCORE them on "Safety" (0-100): Did they address compliance/risk concerns?
                    3. SCORE them on "Speed" (0-100): Did they maintain business velocity/value?
                    4. REPLY as Marcus. Be tough. Challenge them.
                    
                    OUTPUT FORMAT (Strict JSON only):
                    {
                        "safety_score": number,
                        "speed_score": number,
                        "reply": "string"
                    }
                    
                    CONVERSATION HISTORY:
                    ${this.context.history.join('\n')}
                `;

                // 4. API Call
                try {
                    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            contents: [{ parts: [{ text: systemPrompt }] }],
                            generationConfig: { responseMimeType: "application/json" } // Force JSON
                        })
                    });

                    if (!response.ok) throw new Error("API Error");
                    let json = await response.json();
                    let content = JSON.parse(json.candidates[0].content.parts[0].text);

                    // 5. Update State
                    this.scores.safety = content.safety_score;
                    this.scores.speed = content.speed_score;
                    this.addMessage('bot', content.reply);

                    // Check Game Over conditions
                    if (this.turn >= this.maxTurns) {
                        this.addMessage('system', "SIMULATION ENDED. Check your final Bilingual Score above.");
                    }

                } catch (e) {
                    console.error(e);
                    this.addMessage('system', "Connection Error. Ensure you are using a valid Gemini API Key.");
                } finally {
                    this.loading = false;
                }
            },
            
            get statusColor() {
                const avg = (this.scores.safety + this.scores.speed) / 2;
                if (avg > 75) return 'text-primary';
                if (avg > 40) return 'text-warn';
                return 'text-risk';
            }
        },

                // ------------------------------------------------------------------
        // EXCEL FACTORY EXPOSURE CALCULATOR
        // ------------------------------------------------------------------
        excelCalc: {
            inputs: {
                sheets: 3,
                steps: 50,      // Manual copy-pastes per run
                frequency: 12,  // Times per year (monthly = 12)
                salary: 75,     // Hourly rate of analyst ($)
                criticality: 2  // 1=Internal, 2=Regulatory, 3=Customer Impact
            },
            result: null,

            calculate() {
                const i = this.inputs;
                
                // 1. Calculate OpEx Waste (The "Hidden Tax")
                // Assumption: Each manual step takes ~2 mins (finding, copying, checking)
                const hoursPerRun = (i.steps * 2) / 60;
                const annualCost = Math.round(hoursPerRun * i.frequency * i.salary);

                // 2. Calculate Error Probability (The "Swiss Cheese Model")
                // Industry standard: Human error rate is ~1% per manual action
                // Probability of at least one error = 1 - (0.99 ^ steps)
                const errorProb = Math.round((1 - Math.pow(0.99, i.steps)) * 100);

                // 3. Calculate Risk Exposure (The "Bomb")
                // Base impact * Criticality Multiplier
                let baseImpact = 10000; // Base cost of fixing a minor error
                if (i.criticality == 2) baseImpact = 150000; // Regulatory fine/rework
                if (i.criticality == 3) baseImpact = 2000000; // Reputational damage/Customer loss
                
                // Risk = Probability * Impact
                const riskExposure = Math.round((errorProb / 100) * baseImpact);

                // 4. Urgency Score (0-100)
                let score = (errorProb / 2) + (i.criticality * 15);
                if (score > 100) score = 100;

                this.result = {
                    annualCost: annualCost.toLocaleString(),
                    errorProb: errorProb,
                    riskExposure: this.formatMoney(riskExposure),
                    score: Math.round(score),
                    message: this.getMsg(score)
                };
            },

            formatMoney(num) {
                if (num > 1000000) return "$" + (num / 1000000).toFixed(1) + "M";
                return "$" + (num / 1000).toFixed(0) + "k";
            },

            getMsg(score) {
                if (score > 80) return "🔥 BURN IT NOW. This process is a ticking time bomb.";
                if (score > 50) return "⚠️ HIGH RISK. Migrate to a governed data pipeline immediately.";
                return "ℹ️ TOLERABLE. Monitor closely, but prioritize higher risks.";
            }
        },

           // ------------------------------------------------------------------
        // STRANGLER PATTERN VISUALIZER
        // ------------------------------------------------------------------
        stranglerSim: {
            step: 0,
            traffic: { legacy: 100, modern: 0 },
            metrics: { cost: 0, risk: 10, velocity: 10 },
            
            // The steps of the Strangler Pattern
            phases: [
                {
                    id: 0,
                    title: "The Monolith",
                    desc: "Current State. All functionality (Accounts, Payments, Users) lives in one fragile codebase.",
                    action: "Identify the Seam",
                    impact: { cost: 0, risk: 0, velocity: 0 }
                },
                {
                    id: 1,
                    title: "The Anti-Corruption Layer (ACL)",
                    desc: "We place an API Gateway (Proxy) in front. It intercepts traffic but still sends it to the Monolith.",
                    action: "Install Proxy",
                    impact: { cost: 50000, risk: 5, velocity: 0 } // Cost up, No value yet
                },
                {
                    id: 2,
                    title: "Build the Sidecar",
                    desc: "We build the 'Payments' microservice on the side. It is empty but modern.",
                    action: "Deploy Service",
                    impact: { cost: 150000, risk: 0, velocity: 5 }
                },
                {
                    id: 3,
                    title: "Data Sync (Backfill)",
                    desc: "We sync data from the Monolith to the new Service. Both systems now have the data.",
                    action: "Start Sync",
                    impact: { cost: 50000, risk: 10, velocity: 0 } // High risk moment
                },
                {
                    id: 4,
                    title: "The Strangler Switch (10%)",
                    desc: "We route 10% of traffic to the new service. We test with staff/low-risk users.",
                    action: "Route 10%",
                    trafficChange: { legacy: 90, modern: 10 },
                    impact: { cost: 0, risk: -5, velocity: 20 }
                },
                {
                    id: 5,
                    title: "Full Migration",
                    desc: "The new service works. We route 100% of Payments traffic to it.",
                    action: "Route 100%",
                    trafficChange: { legacy: 60, modern: 40 }, // Payments is 40% of the monolith
                    impact: { cost: -20000, risk: -20, velocity: 50 } // OpEx drops
                },
                {
                    id: 6,
                    title: "Kill the Zombie Code",
                    desc: "We delete the old Payments code from the Monolith. The system is lighter.",
                    action: "Decommission",
                    impact: { cost: -50000, risk: -40, velocity: 80 }
                }
            ],

            nextPhase() {
                if (this.step < this.phases.length - 1) {
                    this.step++;
                    const phase = this.phases[this.step];
                    
                    // Update Metrics
                    this.metrics.cost += phase.impact.cost;
                    this.metrics.risk = Math.max(0, Math.min(100, this.metrics.risk + phase.impact.risk));
                    this.metrics.velocity = Math.max(0, Math.min(100, this.metrics.velocity + phase.impact.velocity));

                    // Update Traffic Visualization
                    if (phase.trafficChange) {
                        this.traffic = phase.trafficChange;
                    }
                }
            },

            reset() {
                this.step = 0;
                this.traffic = { legacy: 100, modern: 0 };
                this.metrics = { cost: 0, risk: 10, velocity: 10 };
            },

            get currentPhaseData() {
                return this.phases[this.step];
            },

            // Helper for visual connection lines
            get connectionColor() {
                if (this.step >= 4) return 'border-green-500'; // Modern
                if (this.step >= 1) return 'border-yellow-500'; // Proxy
                return 'border-slate-600'; // Legacy
            }
        },
             // ------------------------------------------------------------------
        // HIPPO DECISION TRACKER
        // ------------------------------------------------------------------
        hippoTracker: {
            incidents: [],
            form: {
                topic: '',
                data_evidence: '',
                hippo_opinion: '',
                rank: 'SVP/Director',
                impact: 'Medium'
            },
            
            init() {
                const saved = localStorage.getItem('bilingual_hippo_log');
                if (saved) this.incidents = JSON.parse(saved);
            },

            logIncident() {
                if (!this.form.topic || !this.form.data_evidence) return alert("Please fill in the details.");
                
                this.incidents.unshift({
                    id: Date.now(),
                    date: new Date().toLocaleDateString(),
                    ...this.form
                });

                localStorage.setItem('bilingual_hippo_log', JSON.stringify(this.incidents));
                
                // Reset Form
                this.form = { topic: '', data_evidence: '', hippo_opinion: '', rank: 'SVP/Director', impact: 'Medium' };
            },

            deleteLog(id) {
                this.incidents = this.incidents.filter(i => i.id !== id);
                localStorage.setItem('bilingual_hippo_log', JSON.stringify(this.incidents));
            },

            get hippoScore() {
                // 0 = Pure Data, 100 = Pure Dictatorship
                // Base score + 10 points per incident
                if (this.incidents.length === 0) return 0;
                let score = this.incidents.length * 15; 
                return Math.min(100, score);
            },

            get status() {
                const s = this.hippoScore;
                if (s < 30) return { label: "Data-Informed", color: "text-primary", msg: "Healthy. Opinions are challenged." };
                if (s < 70) return { label: "Political Drift", color: "text-warn", msg: "Warning. Rank is starting to outweigh facts." };
                return { label: "Dictatorship", color: "text-risk", msg: "Critical. Data is being ignored. (See Chapter 3)." };
            },

            get intervention() {
                const s = this.hippoScore;
                if (s > 70) return "Tactics from Chapter 3: Use the 'Disagree and Commit' Ultimatum. Stop bringing slides; bring raw customer logs (Gemba). Force the 'Red Screen' moment.";
                if (s > 30) return "Tactics from Chapter 3: Implement the 'No Jargon' rule. Ask the HIPPO: 'What specific data point led to your conclusion?'";
                return "Keep reinforcing the 'Psychological Safety' audit. Celebrate the first person who challenges you.";
            }
        },

// ------------------------------------------------------------------
        // ADVANCED OPEN BANKING RADAR (Fixed Logic)
        // ------------------------------------------------------------------
        threatMonitor: {
            active: false,
            interval: null,
            
            // Simulation State
            totalOutflow: 0,
            shareOfWallet: 100,
            customerMood: 100,
            
            // The "Friction Levers" (User Controls)
            config: {
                latency: 800,
                fees: 2.5,
                blockMode: false
            },

            // Competitors
            competitors: [
                { id: 'rev', name: "Revolut", share: 0, color: '#3b82f6', vector: 'latency', msg: "Winning on Speed" },
                { id: 'wise', name: "Wise", share: 0, color: '#22c55e', vector: 'fees', msg: "Winning on Price" },
                { id: 'klarna', name: "Klarna", share: 0, color: '#ef4444', vector: 'convenience', msg: "Winning on Flow" }
            ],

            events: [],

            init() {},

            toggleSim() {
                if (this.active) {
                    clearInterval(this.interval);
                    this.active = false;
                    this.logEvent("⏸️ Simulation paused.", "neutral");
                } else {
                    this.active = true;
                    
                    // 1. Immediate feedback that the system is running
                    this.logEvent("⚡ RADAR ACTIVE. Scanning for threats...", "neutral");

                    // 2. The Nudge: Tell them to interact after a short delay
                    setTimeout(() => {
                         if(this.active) {
                             this.logEvent("👉 ACTION REQUIRED: Increase Latency or Fees to stress-test retention.", "risk");
                         }
                    }, 800);

                    this.interval = setInterval(() => this.tick(), 1000);
                }
            },

            
            tick() {
                // Base churn is 0
                let churnRisk = 0;
                
                // 1. LATENCY RISK (Linear Scale)
                // Every ms above 200 adds a tiny bit of risk. 
                // Example: 800ms = ~15% risk. 3000ms = ~80% risk.
                if (this.config.latency > 200) {
                    churnRisk += (this.config.latency - 200) / 4000;
                } else {
                    // Bonus: If super fast (<200ms), reduce overall risk
                    churnRisk -= 0.05; 
                }

                // 2. FEE RISK (Linear Scale)
                // Every 0.1% above 0.5% adds risk.
                // Example: 2.5% = ~20% risk. 5.0% = ~50% risk.
                if (this.config.fees > 0.5) {
                    churnRisk += (this.config.fees - 0.5) / 10;
                } else {
                    // Bonus: If cheap (<0.5%), reduce overall risk
                    churnRisk -= 0.05;
                }

                // 3. BLOCKING LOGIC (The Trap)
                if (this.config.blockMode) {
                    churnRisk = 0; // Money stops leaving immediately
                    
                    // But Trust drops fast
                    this.customerMood = Math.max(0, this.customerMood - 2); // -2 NPS per second
                    
                    // Regulator Penalty Risk
                    if (this.customerMood < 50 && Math.random() > 0.90) {
                        this.logEvent("⚠️ REGULATOR FINE: Anti-competitive behavior detected.", "risk");
                        
                        // Hard penalty on market share
                        const penalty = 3; 
                        if (this.shareOfWallet >= penalty) {
                            this.shareOfWallet -= penalty;
                            // Competitors eat the fine
                            const sharePerComp = penalty / this.competitors.length;
                            this.competitors.forEach(c => c.share += sharePerComp);
                        }
                    }
                } else {
                    // Trust recovers slowly if unblocked
                    if (this.customerMood < 100) this.customerMood += 0.5;
                }

                // 4. EXECUTE CHURN
                // Math.random() returns 0.0 to 1.0. If our Risk > Random, we lose a customer.
                if (!this.config.blockMode && Math.random() < churnRisk && this.shareOfWallet > 0.5) {
                    this.processLoss();
                }
                
                // Game Over Check
                if (this.shareOfWallet <= 0) {
                    this.active = false;
                    clearInterval(this.interval);
                    alert("GAME OVER: You became the 'Dumb Pipe'.");
                }
            },

            processLoss() {
                // Determine who wins based on which metric is worse
                // Calculate relative pain points
                const latencyPain = (this.config.latency - 200) / 3000;
                const feePain = (this.config.fees - 0.5) / 10;

                let winner = this.competitors[2]; // Default: Klarna (Convenience)

                if (latencyPain > feePain && latencyPain > 0.1) {
                    winner = this.competitors[0]; // Revolut wins on Speed
                } else if (feePain > latencyPain && feePain > 0.1) {
                    winner = this.competitors[1]; // Wise wins on Price
                }

                // Churn Amount
                const lossAmount = 0.2; // Lose 0.2% share per tick (smooth decline)
                
                if (this.shareOfWallet >= lossAmount) {
                    this.shareOfWallet = (parseFloat(this.shareOfWallet) - lossAmount).toFixed(1);
                    winner.share = (parseFloat(winner.share) + lossAmount);
                    
                    // Only log meaningful events to avoid spamming the list
                    if (Math.random() > 0.7) { 
                        const amount = Math.floor(Math.random() * 500) + 50;
                        this.totalOutflow += amount;
                        this.logEvent(`${winner.name} captured transaction ($${amount}). Reason: ${winner.vector}`, "neutral");
                    } else {
                        // Still add money even if we don't log text
                        this.totalOutflow += Math.floor(Math.random() * 100);
                    }
                }
            },
            

            logEvent(text, type) {
                this.events.unshift({ text, type, time: new Date().toLocaleTimeString() });
                if (this.events.length > 5) this.events.pop();
            },

            reset() {
                this.active = false;
                clearInterval(this.interval);
                this.shareOfWallet = 100;
                this.totalOutflow = 0;
                this.customerMood = 100;
                this.competitors.forEach(c => c.share = 0);
                this.events = [];
            },

            get healthColor() {
                if (this.shareOfWallet > 80) return 'text-primary';
                if (this.shareOfWallet > 50) return 'text-warn';
                return 'text-risk';
            },

            get chartGradient() {
                let stops = [];
                let currentPos = 0;
                
                // 1. Bank Share
                let bankShare = parseFloat(this.shareOfWallet);
                stops.push(`#1e293b 0% ${bankShare}%`);
                currentPos += bankShare;

                // 2. Competitors
                this.competitors.forEach(c => {
                    let share = parseFloat(c.share);
                    if (share > 0) {
                         let end = currentPos + share;
                         stops.push(`${c.color} ${currentPos}% ${end}%`);
                         currentPos = end;
                    }
                });

                // 3. Safety filler
                if (currentPos < 100) {
                    stops.push(`transparent ${currentPos}% 100%`);
                }

                return `conic-gradient(${stops.join(', ')})`;
            },
            
            get strategicAdvice() {
                const topThreat = this.competitors.reduce((prev, current) => (prev.share > current.share) ? prev : current);
                if (topThreat.share < 1) return { action: "MONITOR", msg: "Keep watching the API logs." };
                if (topThreat.name.includes("Revolut")) return { action: "BUILD", msg: "Fix App UX immediately." };
                if (topThreat.name.includes("Wise")) return { action: "PARTNER", msg: "Integrate their FX API." };
                return { action: "IGNORE", msg: "Niche threat." };
            }
        },


        // ------------------------------------------------------------------
        // SHADOW IT DISCOVERY TOOL (AI-ENHANCED)
        // ------------------------------------------------------------------
        shadowAudit: {
            inputs: {
                name: '',
                cost: 50,
                users: 5,
                hasPII: false,
                isCritical: false
            },
            aiAnalysis: null, // Stores the AI intelligence
            loading: false,
            inventory: [],
            
            init() {
                const saved = localStorage.getItem('bilingual_shadow_inventory');
                if (saved) this.inventory = JSON.parse(saved);
            },

            // 1. THE AI SCANNER
            async scanTool() {
                if(!this.inputs.name) return alert("Enter a tool name first.");
                
                this.loading = true;
                this.aiAnalysis = null;
                const API_KEY = localStorage.getItem('bilingual_api_key');

                // Offline Fallback (if no key)
                if (!API_KEY) {
                    await new Promise(r => setTimeout(r, 1000));
                    // Simple heuristic for demo
                    const name = this.inputs.name.toLowerCase();
                    const isRisky = name.includes('gpt') || name.includes('cloud') || name.includes('data');
                    
                    this.inputs.hasPII = isRisky;
                    this.aiAnalysis = {
                        category: "Productivity / SaaS",
                        risks: isRisky ? ["Unstructured Data Leakage", "Data Residency Unknown"] : ["Shadow Cost", "Access Control"],
                        justification: `This tool (${this.inputs.name}) provides unique features not available in the enterprise stack, reducing cycle time by ~20%.`
                    };
                    this.loading = false;
                    return;
                }

                // Real AI Analysis
                const prompt = `
                    ACT AS: Bank CISO & Architecture Review Board.
                    TASK: Analyze this SaaS tool: "${this.inputs.name}".
                    CONTEXT: A department wants to use this tool instead of the approved enterprise standard.
                    
                    OUTPUT JSON ONLY:
                    {
                        "category": "string (e.g. Project Mgmt, AI, Dev Tool)",
                        "likely_has_pii": boolean (Does this tool typically store names/emails/data?),
                        "criticality": boolean (Is this typically business critical?),
                        "top_risks": ["string", "string", "string"] (Max 3 specific banking risks e.g. 'Data Residency', 'Model Training on Data'),
                        "velocity_justification": "string" (1 sentence argument why a team would choose this over a legacy bank tool like SharePoint/Jira. Focus on UX/Speed.)
                    }
                `;

                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
                    });
                    
                    const json = await response.json();
                    const data = JSON.parse(json.candidates[0].content.parts[0].text);
                    
                    // Auto-fill the form based on AI findings
                    this.inputs.hasPII = data.likely_has_pii;
                    this.inputs.isCritical = data.criticality;
                    
                    this.aiAnalysis = {
                        category: data.category,
                        risks: data.top_risks,
                        justification: data.velocity_justification
                    };

                } catch (e) {
                    console.error(e);
                    alert("AI Analysis failed. Using manual mode.");
                } finally {
                    this.loading = false;
                }
            },

            // 2. FINANCIAL CALCULATIONS
            get analysis() {
                const i = this.inputs;
                const annualLicense = i.cost * i.users * 12;
                
                let oneTimeTax = 5000; 
                let recurringTax = annualLicense * 0.10; 
                
                if (i.hasPII) {
                    oneTimeTax += 2500; // Security audit cost
                    recurringTax += (annualLicense * 0.20); // Governance surcharge
                }

                return {
                    annualLicense: annualLicense,
                    integrationTax: oneTimeTax,
                    recurringOverhead: recurringTax,
                    trueCost: annualLicense + oneTimeTax + recurringTax,
                    riskScore: (i.hasPII ? 7 : 2) + (i.isCritical ? 3 : 0)
                };
            },

            addTool() {
                if(!this.inputs.name) return alert("Enter tool name");
                this.inventory.push({ id: Date.now(), ...this.inputs, ai: this.aiAnalysis, stats: this.analysis });
                localStorage.setItem('bilingual_shadow_inventory', JSON.stringify(this.inventory));
                this.inputs.name = ''; 
                this.aiAnalysis = null;
            },

            removeTool(id) {
                this.inventory = this.inventory.filter(t => t.id !== id);
                localStorage.setItem('bilingual_shadow_inventory', JSON.stringify(this.inventory));
            },

            // 3. GENERATE MEMO (AI-Powered)
            generateAgreement() {
                if(!this.inputs.name) return alert("Analyze a tool first.");
                const a = this.analysis;
                const i = this.inputs;
                const ai = this.aiAnalysis || { justification: "Improves team efficiency.", risks: ["Standard SaaS Risk"] };
                
                const text = `MEMORANDUM OF UNDERSTANDING: SHADOW IT REGULARIZATION

TO: IT Governance
SUBJECT: Integration of ${i.name.toUpperCase()} (${ai.category})

1. BUSINESS CASE (VELOCITY)
${ai.justification}

2. RISK MITIGATION
Identified Risks: ${ai.risks.join(", ")}.
Mitigation: We accept the "Integration Tax" to connect this tool to the Enterprise Data Mesh via API, ensuring no data silos are created.

3. FINANCIAL COMMITMENT
We will transfer the following budget to IT to fund the integration:
- License Cost: $${a.annualLicense.toLocaleString()}/yr
- Integration Tax (One-Time): $${a.integrationTax.toLocaleString()}
- Governance Surcharge: $${a.recurringOverhead.toLocaleString()}/yr

TOTAL YEAR 1 COST: $${a.trueCost.toLocaleString()}

Signed,
Product Owner`;
                
                navigator.clipboard.writeText(text).then(() => alert("Memo copied to clipboard!"));
            }
        },
        
        // ------------------------------------------------------------------
        // AI HALLUCINATION DETECTOR (The Trust Shield)
        // ------------------------------------------------------------------
        hallucinationDetector: {
            policy: '', // The Golden Source
            aiOutput: '', // The Unverified Text
            loading: false,
            result: null,

            // Pre-load the "Air Canada" Case Study from Chapter 2
            loadDemo() {
                this.policy = `POLICY 8.2: BEREAVEMENT FARES
1. Eligibility: Immediate family members only.
2. Timing: Application must be submitted PRIOR to travel.
3. Retroactive Claims: Absolutely no refunds are permitted for travel that has already occurred.
4. Documentation: Death certificate required within 30 days.`;

                this.aiOutput = `Hi! I'm sorry for your loss. regarding the bereavement fare: You can purchase a full-price ticket now to travel immediately. 
                
Don't worry about the paperwork yet; you can submit a refund claim within 90 days after you return, and we will refund the difference.`;
            },

            async scan() {
                if (!this.policy || !this.aiOutput) return alert("Please provide both the Policy (Ground Truth) and the AI Output.");
                
                this.loading = true;
                this.result = null;

                const API_KEY = localStorage.getItem('bilingual_api_key');
                
                // 1. If No API Key, run a simulated "Local Check" for the demo
                if (!API_KEY) {
                    await new Promise(r => setTimeout(r, 1500)); // Fake delay
                    
                    // Simple heuristic check for demo purposes
                    const policyLower = this.policy.toLowerCase();
                    const aiLower = this.aiOutput.toLowerCase();
                    
                    // Check for the specific "Retroactive" contradiction in the demo
                    if (policyLower.includes("prior") && aiLower.includes("after")) {
                        this.result = {
                            score: 15,
                            verdict: "CRITICAL FAIL",
                            reason: "Temporal Contradiction Detected. The Policy explicitly states 'PRIOR to travel', but the AI promised a refund 'AFTER you return'. This is a direct liability.",
                            hallucinations: ["Promise of retroactive refund", "90-day window (not in source)"]
                        };
                    } else {
                        this.result = {
                            score: 85,
                            verdict: "LIKELY SAFE",
                            reason: "No direct keyword contradictions found. (Note: Set API Key for deep semantic analysis).",
                            hallucinations: []
                        };
                    }
                    this.loading = false;
                    return;
                }

                // 2. Real GenAI Analysis (If API Key exists)
                const prompt = `
                    ACT AS: A Senior Banking Compliance Officer.
                    TASK: Perform a "Grounding Check" on the following AI Output based ONLY on the provided Policy Text.
                    
                    SOURCE POLICY (THE TRUTH):
                    """${this.policy}"""
                    
                    AI OUTPUT (TO CHECK):
                    """${this.aiOutput}"""
                    
                    INSTRUCTIONS:
                    1. Identify any facts in the AI Output that contradict the Policy.
                    2. Identify any "Hallucinations" (promises made by the AI that simply aren't in the Policy).
                    3. Assign a "Safety Score" (0-100). 100 = Perfectly Grounded. <50 = Dangerous Liability.
                    
                    OUTPUT JSON ONLY:
                    {
                        "score": number,
                        "verdict": "SAFE" | "CAUTION" | "CRITICAL FAIL",
                        "reason": "Short summary of the biggest risk.",
                        "hallucinations": ["List of specific ungrounded claims"]
                    }
                `;

                try {
                    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { responseMimeType: "application/json" }
                        })
                    });
                    
                    let json = await response.json();
                    this.result = JSON.parse(json.candidates[0].content.parts[0].text);

                } catch (e) {
                    alert("API Error. Running fallback logic.");
                    this.result = { score: 0, verdict: "ERROR", reason: "Could not connect to AI engine.", hallucinations: [] };
                } finally {
                    this.loading = false;
                }
            }
        },

        // ------------------------------------------------------------------
        // BILINGUAL SQUAD BUILDER
        // ------------------------------------------------------------------
        squadBuilder: {
            // The available roles to pick from
            catalog: [
                { id: 'po', title: 'Product Owner', icon: 'fa-briefcase', type: 'biz', biz: 10, tech: 3, risk: 2, desc: 'Mini-CEO. Owns Value.' },
                { id: 'tech_lead', title: 'Tech Lead', icon: 'fa-code-branch', type: 'tech', biz: 4, tech: 10, risk: 4, desc: 'Architect. Owns Feasibility.' },
                { id: 'scrum', title: 'Scrum Master', icon: 'fa-stopwatch', type: 'ops', biz: 5, tech: 5, risk: 3, desc: 'Flow Mechanic. Removes blockers.' },
                { id: 'data', title: 'Data Steward', icon: 'fa-database', type: 'tech', biz: 3, tech: 8, risk: 8, desc: 'Quality Gatekeeper.' },
                { id: 'risk', title: 'Risk Embed', icon: 'fa-shield-cat', type: 'risk', biz: 2, tech: 2, risk: 10, desc: 'The Guardrail Builder.' },
                { id: 'dev', title: 'Developer', icon: 'fa-laptop-code', type: 'tech', biz: 1, tech: 9, risk: 1, desc: 'The Engine.' },
                { id: 'ux', title: 'UX Designer', icon: 'fa-pen-nib', type: 'design', biz: 6, tech: 4, risk: 1, desc: 'Customer Advocate.' }
            ],
            
            // The current squad roster
            roster: [],
            
            // Actions
            addRole(role) {
                if (this.roster.length >= 10) return alert("Two-Pizza Rule Violation: Squad is getting too big (>10).");
                // Create a unique instance
                this.roster.push({ ...role, uid: Date.now() });
            },

            removeRole(uid) {
                this.roster = this.roster.filter(r => r.uid !== uid);
            },

            reset() {
                this.roster = [];
            },

            // Computed Metrics
            get metrics() {
                const r = this.roster;
                if (r.length === 0) return { velocity: 0, translation: 0, safety: 0, status: 'EMPTY' };

                // 1. Calculate Base Capabilities
                let totalBiz = r.reduce((a,b) => a + b.biz, 0);
                let totalTech = r.reduce((a,b) => a + b.tech, 0);
                let totalRisk = r.reduce((a,b) => a + b.risk, 0);

                // 2. Velocity Calculation (The Engine)
                // Base speed comes from Devs + Tech Lead
                let velocity = (totalTech * 1.5);
                
                // Friction: If Risk score is low relative to Tech, velocity is dangerous (potential rework/shutdown)
                // However, in the "Bilingual" model, Lack of Risk doesn't slow you down immediately, it creates "Fragility".
                // But Lack of Biz (PO) definitely slows you down (building wrong thing).
                
                if (totalBiz < 5) velocity *= 0.5; // No direction
                if (totalRisk < 5) velocity *= 1.2; // Reckless speed (Danger!)

                // 3. Translation Efficiency (The Bilingual Score)
                // How well balanced are Tech and Biz?
                // 100% means perfect 50/50 balance.
                const balance = Math.min(totalBiz, totalTech) / Math.max(totalBiz, totalTech);
                const translation = Math.round(balance * 100) || 0;

                // 4. Safety Score
                let safety = Math.min(100, totalRisk * 3);

                // 5. Diagnostics / Status
                let status = "OPTIMIZED";
                let color = "text-primary";
                
                const hasPO = r.find(x => x.id === 'po');
                const hasTL = r.find(x => x.id === 'tech_lead');
                const hasRisk = r.find(x => x.id === 'risk' || x.id === 'data');

                if (!hasPO) { status = "HEADLESS (No PO)"; color = "text-risk"; }
                else if (!hasTL) { status = "THEORETICAL (No Tech Lead)"; color = "text-warn"; }
                else if (translation < 30) { status = "SILOED (Imbalanced)"; color = "text-warn"; }
                else if (safety < 20) { status = "FRAGILE FINTECH (High Risk)"; color = "text-risk"; }
                else if (safety > 80 && velocity < 50) { status = "BUREAUCRATIC"; color = "text-warn"; }

                return {
                    velocity: Math.round(velocity),
                    translation: translation,
                    safety: safety,
                    status: status,
                    color: color,
                    hasPO: !!hasPO,
                    hasTL: !!hasTL,
                    hasRisk: !!hasRisk
                };
            },

            // Generate Recommendations based on composition
            get gaps() {
                const m = this.metrics;
                const g = [];
                
                if (!m.hasPO) g.push("CRITICAL: Recruit a 'Bilingual' Product Owner to define value.");
                if (!m.hasTL) g.push("CRITICAL: Assign a Tech Lead to own architecture.");
                if (!m.hasRisk && m.velocity > 50) g.push("DANGER: High speed with no brakes. Embed a Risk Officer or Data Steward.");
                if (m.translation < 40 && m.hasPO && m.hasTL) g.push("GAP: Business and Tech are disconnected. Schedule 'Translation' workshops or 'Gemba Walks'.");
                if (this.roster.length > 8) g.push("WARNING: Squad size approaching inefficiency. Consider splitting.");
                
                if (g.length === 0 && this.roster.length > 3) g.push("READY TO LAUNCH. This squad has high Bilingual potential.");
                
                return g;
            }
        },

// ------------------------------------------------------------------
        // KPI DESIGNER (Outcome vs Output) - AI ENHANCED
        // ------------------------------------------------------------------
        kpiDesigner: {
            input: '',
            loading: false,
            result: null,

            // "Cheat Sheet" for common banking projects (Offline Mode / Fallback)
            presets: [
                { keyword: 'mobile app', output: 'Launch Mobile App v2', outcome: 'Reduce Call Center Volume by 15%', leading: '% of Logins using Biometrics', lagging: 'Cost to Serve per Customer' },
                { keyword: 'cloud', output: 'Migrate to AWS', outcome: 'Reduce Infrastructure Spend by 20%', leading: '% of Non-Prod Servers Auto-Shutdown', lagging: 'Monthly Hosting Bill (FinOps)' },
                { keyword: 'data lake', output: 'Build Data Lake', outcome: 'Reduce "Time-to-Insight" for Risk Reports', leading: 'Data Freshness (SLO Adherence)', lagging: 'Regulatory Fines / Audit Issues' },
                { keyword: 'salesforce', output: 'Implement CRM', outcome: 'Increase Cross-Sell Ratio', leading: 'Sales Activity / Logins', lagging: 'Products per Customer' },
                { keyword: 'lending', output: 'Automate Lending', outcome: 'Decrease "Time-to-Cash"', leading: '% of Loans Auto-Decisioned', lagging: 'Conversion Rate' }
            ],

            async generate() {
                if (!this.input.trim()) return alert("Please enter a project goal first.");
                
                this.loading = true;
                this.result = null;

                // 1. Try Offline Match First (Instant Speed)
                // We check if the user input matches a known keyword
                const match = this.presets.find(p => this.input.toLowerCase().includes(p.keyword));
                
                // 2. Setup AI Context
                const API_KEY = localStorage.getItem('bilingual_api_key');

                // If we have a match OR no API key, use the preset (or generic fallback if no match)
                if (match && !API_KEY) {
                    await new Promise(r => setTimeout(r, 600)); // UI polish delay
                    this.result = {
                        output: this.input,
                        outcome: match.outcome,
                        leading: match.leading,
                        lagging: match.lagging,
                        explanation: "Standard banking pattern matched (Offline Mode)."
                    };
                    this.loading = false;
                    return;
                }

                // 3. AI Execution (Gemini 3.0 Flash)
                if (!API_KEY) {
                    alert("To analyze custom inputs, please click the Key icon (top right) and save your Gemini API Key.");
                    this.loading = false;
                    return;
                }

                const prompt = `
                    ACT AS: A Product Management Executive Coach (Specializing in FinTech).
                    CONTEXT: A bank executive has defined a project by its "Output" (what they want to build). You must reframe it as an "Outcome" (the business value).
                    
                    USER INPUT: "${this.input}"
                    
                    TASK: Generate a KPI Metric Tree.
                    1. Outcome: What is the hard business value? (Revenue, Cost, Risk, or Efficiency).
                    2. Leading Indicator: An early behavioral metric (e.g. Adoption, Latency, Usage) that predicts success.
                    3. Lagging Indicator: The final P&L metric.
                    4. Explanation: 1 short sentence on why this mindset shift saves money.
                    
                    OUTPUT JSON FORMAT ONLY:
                    {
                        "outcome": "string",
                        "leading": "string",
                        "lagging": "string",
                        "explanation": "string"
                    }
                `;

                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }],
                            generationConfig: { responseMimeType: "application/json" }
                        })
                    });

                    if (!response.ok) throw new Error("AI Service Error");

                    const json = await response.json();
                    const aiContent = JSON.parse(json.candidates[0].content.parts[0].text);

                    this.result = {
                        output: this.input,
                        ...aiContent
                    };

                } catch (e) {
                    console.error(e);
                    // Smart Fallback if AI fails
                    this.result = {
                        output: this.input,
                        outcome: "Increase Customer Value / Reduce Risk",
                        leading: "Adoption Rate %",
                        lagging: "Return on Investment (ROI)",
                        explanation: "AI Connection failed, but the principle remains: Measure behavior, not delivery."
                    };
                } finally {
                    this.loading = false;
                }
            }
        },
        // ------------------------------------------------------------------
        // REGULATORY SANDBOX PROPOSAL GENERATOR (The Legal Shield)
        // ------------------------------------------------------------------
        sandboxGenerator: {
            step: 1,
            form: {
                project: '',
                owner: '',
                hypothesis: '',
                consumer_benefit: '',
                vol_cap_users: '100',
                vol_cap_money: '10,000',
                duration: '90',
                fallback: '',
                kpi_success: '',
                kpi_risk: ''
            },

            nextStep() { if(this.validate()) this.step++; },
            prevStep() { this.step--; },

            validate() {
                const f = this.form;
                if (this.step === 1 && (!f.project || !f.hypothesis)) return alert("Define the innovation first.");
                if (this.step === 2 && (!f.vol_cap_users || !f.fallback)) return alert("Define the safety net.");
                return true;
            },

            generatePDF() {
                if (!window.jspdf) { alert("PDF Lib missing"); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const f = this.form;
                const pageWidth = doc.internal.pageSize.width;
                const margin = 20;
                const contentWidth = pageWidth - (margin * 2);

                // --- DESIGN CONFIG ---
                const colors = {
                    primary: '#0f172a', // Navy (Slate-900)
                    accent: '#3b82f6',  // Blue
                    risk: '#ef4444',    // Red
                    light: '#f8fafc',   // Light Gray
                    text: '#334155'     // Slate-700
                };

                // --- 1. HEADER BRANDING ---
                // Navy Header Bar
                doc.setFillColor(colors.primary);
                doc.rect(0, 0, pageWidth, 50, 'F');

                // Title
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text("REGULATORY SANDBOX", margin, 25);
                
                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(148, 163, 184); // Slate-400
                doc.text("INTERNAL INNOVATION WAIVER // FORM 10-A", margin, 32);

                // Confidential Stamp
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.text("CONFIDENTIAL", pageWidth - margin - 25, 25);

                // --- 2. METADATA GRID ---
                let y = 65;
                
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                
                // Left Column
                doc.text("REQUESTOR:", margin, y);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(f.owner || "[Name]", margin, y + 6);

                // Middle Column
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 100, 100);
                doc.text("PROJECT:", margin + 60, y);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(f.project.toUpperCase() || "UNTITLED", margin + 60, y + 6);

                // Right Column
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100, 100, 100);
                doc.text("DATE:", margin + 120, y);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 0, 0);
                doc.text(new Date().toLocaleDateString(), margin + 120, y + 6);

                // Divider Line
                y += 15;
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, y, pageWidth - margin, y);
                y += 10;

                // --- HELPER FOR SECTIONS ---
                const addSection = (title, icon) => {
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(12);
                    doc.setTextColor(colors.accent);
                    doc.text(title.toUpperCase(), margin, y);
                    y += 8;
                };

                const addBodyText = (text) => {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.setTextColor(colors.text);
                    const lines = doc.splitTextToSize(text, contentWidth);
                    doc.text(lines, margin, y);
                    y += (lines.length * 5) + 8;
                };

                // --- 3. THE INNOVATION ---
                addSection("1. Innovation & Hypothesis");
                addBodyText(`We request a "License to Operate" for the following capability: ${f.hypothesis}. \n\nExpected Consumer Benefit: ${f.consumer_benefit}`);

                // --- 4. THE CONTAINMENT BOX (Highlighted) ---
                y += 5;
                // Gray Background Box
                doc.setFillColor(colors.light);
                doc.setDrawColor(200, 200, 200);
                doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'FD');
                
                const boxStart = y + 10;
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.text("2. THE CONTAINMENT PARAMETERS (THE BOX)", margin + 10, boxStart);
                
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`• USER CAP:  ${f.vol_cap_users} Customers (Invitation Only)`, margin + 10, boxStart + 10);
                doc.text(`• RISK CAP:  $${f.vol_cap_money} Total Aggregate Exposure`, margin + 10, boxStart + 18);
                doc.text(`• DURATION:  ${f.duration} Days (Auto-Termination)`, margin + 10, boxStart + 26);
                
                y += 55; // Move past the box

                // --- 5. SAFETY NET ---
                addSection("3. The Manual Safety Net");
                addBodyText(`To mitigate risk during this sprint, we have established the following manual fallback:\n"${f.fallback}"\nIf the automated system fails, this human intervention ensures compliance.`);

                // --- 6. EXIT CRITERIA (Red for Risk) ---
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.setTextColor(colors.risk);
                doc.text("4. KILL SWITCH & SUCCESS METRICS", margin, y);
                y += 8;
                
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(0,0,0);
                const kpiText = doc.splitTextToSize(`SUCCESS: ${f.kpi_success}`, contentWidth);
                doc.text(kpiText, margin, y);
                y += (kpiText.length * 5) + 5;

                doc.setTextColor(colors.risk); // Red text for kill switch
                doc.setFont("helvetica", "bold");
                const killText = doc.splitTextToSize(`MANDATORY KILL SWITCH: ${f.kpi_risk}`, contentWidth);
                doc.text(killText, margin, y);
                y += (killText.length * 5) + 20;

                // --- 7. SIGNATURES ---
                // Ensure we are at the bottom of the page
                if (y < 240) y = 240;

                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.5);
                
                doc.line(margin, y, margin + 80, y);
                doc.line(margin + 90, y, pageWidth - margin, y);
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.setFont("helvetica", "bold");
                doc.text("PRODUCT OWNER SIGNATURE", margin, y + 5);
                doc.text("CHIEF RISK OFFICER APPROVAL", margin + 90, y + 5);

                doc.save(`Waiver_${f.project.replace(/\s/g, '_')}.pdf`);
            }

        },

        // ------------------------------------------------------------------
        // VENDOR PARTNERSHIP COACH (Chapter 6)
        // ------------------------------------------------------------------
        vendorCoach: {
            step: 'input', // input, analysis, sim
            vendorName: '',
            contractType: 'tm', // tm (Time & Materials), fixed (Fixed Price)
            currentTerms: '',
            loading: false,
            analysis: null,
            
            // Simulation State
            simMessages: [],
            simInput: '',
            simLoading: false,

            fillDemo() {
                this.vendorName = "Infosys / Accenture";
                this.contractType = "tm";
                this.currentTerms = "We pay $85/hour per developer. The scope is defined in SOWs every 3 months. If they miss a deadline, we just pay for more hours to fix it.";
            },

            async analyze() {
                if (!this.currentTerms) return alert("Please describe your current contract.");
                
                this.loading = true;
                const API_KEY = localStorage.getItem('bilingual_api_key');
                
                if (!API_KEY) {
                    // Offline Fallback
                    await new Promise(r => setTimeout(r, 1000));
                    this.analysis = {
                        level: "Level 2: Capacity (Body Shop)",
                        danger: "You are incentivizing them to be slow. They make more profit if the project is delayed.",
                        upgrade_clause: "THE UPSIDE BONUS: Vendor base rate reduced to $75/hr. 20% Bonus Pool unlocked if 'Code Defect Ratio' < 1% and 'Time-to-Market' < 2 weeks.",
                        objection: "We can't accept risk. We don't control your legacy environment.",
                        rebuttal: "We are moving to Cloud. You claim to be experts. If you don't trust your own code quality, why should we pay a premium?"
                    };
                    this.step = 'analysis';
                    this.loading = false;
                    return;
                }

                const prompt = `
                    ACT AS: Expert IT Procurement Strategist & Agile Coach.
                    FRAMEWORK: The Vendor Partnership Pyramid (Level 1: Commodity, Level 2: Capacity/T&M, Level 3: Co-Creator/Outcome).
                    
                    USER INPUT:
                    Vendor: ${this.vendorName}
                    Type: ${this.contractType}
                    Current Terms: "${this.currentTerms}"
                    
                    TASK: Analyze this contract.
                    1. Identify the current Level (1 or 2).
                    2. Draft a specific "Level 3" Clause to replace the current bad incentive.
                    3. Predict the Vendor's Account Manager's objection.
                    4. Draft a "Bilingual" rebuttal (Business + Tech logic).
                    
                    OUTPUT JSON ONLY:
                    {
                        "level": "String (e.g. Level 2: Capacity)",
                        "danger": "One sentence on why the current model fails.",
                        "upgrade_clause": "Legal-sounding text for the new outcome-based clause.",
                        "objection": "What the vendor will say to block this.",
                        "rebuttal": "What I should say back."
                    }
                `;

                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } })
                    });
                    
                    const json = await response.json();
                    this.analysis = JSON.parse(json.candidates[0].content.parts[0].text);
                    this.step = 'analysis';

                } catch (e) {
                    alert("AI Error. Please check API Key.");
                } finally {
                    this.loading = false;
                }
            },

            startSim() {
                this.step = 'sim';
                this.simMessages = [
                    { role: 'bot', text: `(Playing as ${this.vendorName} Account Manager): \n\nLook, I appreciate the "Partnership" idea, but we can't sign a Risk-Reward deal. We need guaranteed revenue to allocate staff. T&M is standard industry practice.` }
                ];
            },

            async sendSim() {
                if (!this.simInput) return;
                
                this.simMessages.push({ role: 'user', text: this.simInput });
                const userText = this.simInput;
                this.simInput = '';
                this.simLoading = true;

                const API_KEY = localStorage.getItem('bilingual_api_key');
                // Use fallback if no key (simple rigid response)
                if(!API_KEY) {
                    setTimeout(() => {
                        this.simMessages.push({ role: 'bot', text: "Without an API key, I can't improvise. But in real life, hold the line on 'Outcome over Output'." });
                        this.simLoading = false;
                    }, 1000);
                    return;
                }

                const prompt = `
                    ACT AS: A stubborn Vendor Account Manager negotiating with a Bank CIO.
                    GOAL: Protect your "Time & Materials" revenue. Avoid "Risk Sharing".
                    CONTEXT: The bank wants to move to Level 3 (Shared Outcome).
                    LAST USER REPLY: "${userText}"
                    
                    INSTRUCTIONS:
                    1. If the user is weak, push back hard ("We can't do that").
                    2. If the user uses strong leverage (threatens to cut budget, offers huge upside), grudgingly agree to a pilot.
                    3. Keep response short (under 50 words).
                `;

                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });
                    
                    const json = await response.json();
                    const reply = json.candidates[0].content.parts[0].text;
                    this.simMessages.push({ role: 'bot', text: reply });
                } catch(e) {
                    this.simMessages.push({ role: 'system', text: "Simulation Error." });
                } finally {
                    this.simLoading = false;
                }
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
    {"score":75,"industry":"Neobank"}
];
