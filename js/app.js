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
            
            this.roleplay.askSecureAI = secureBind;
            this.whatIf.askSecureAI = secureBind;
            this.riskSim.askSecureAI = secureBind;
            this.shadowAudit.askSecureAI = secureBind;
            this.hallucinationDetector.askSecureAI = secureBind;
            this.kpiDesigner.askSecureAI = secureBind;
            this.vendorCoach.askSecureAI = secureBind;
            this.capexClassifier.askSecureAI = secureBind; 
            this.legacyExplainer.askSecureAI = secureBind;
            this.watermelonDetector.askSecureAI = secureBind;
            this.dataCanvasGen.askSecureAI = secureBind;
            this.siloBuster.askSecureAI = secureBind;
            this.culturalMonitor.askSecureAI = secureBind;
            this.lighthouseROI.askSecureAI = secureBind;
            this.futureBank.askSecureAI = secureBind;
            this.conwaySim.askSecureAI = secureBind;
            this.dumbPipeCalc.askSecureAI = secureBind;
            this.dataGovDash.askSecureAI = secureBind;
            this.excelEscape.askSecureAI = secureBind;


        },
async askSecureAI(systemPrompt, userInput, model = "gemini-3-flash-preview") {
            // Check if Supabase is initialized
            if (!this.supabase) {
                console.error("Supabase not initialized");
                return "System Error: Database connection missing.";
            }

            // CHECK FOR API KEY
            if (!this.userApiKey) {
                alert("⚠️ Missing API Key. Please click the 'Bolt' icon in the mobile menu or top right to enter your Google Gemini Key.");
                return "System Error: No API Key provided.";
            }

            try {
                const { data, error } = await this.supabase.functions.invoke('bilingual-ai', {
                    body: { 
                        system: systemPrompt, 
                        input: userInput,
                        // UPDATED MODEL HERE:
                        model: model, 
                        apiKey: this.userApiKey
                    }
                });

                if (error) throw error;
                
                // Fallback if the function returns an error structure instead of text
                if (data.error) throw new Error(data.error.message || data.error);

                return data.text;

            } catch (err) {
                console.error("AI Error:", err);
                return "System Error: " + (err.message || "Connection failed.");
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
talentSkills: [ 
            { label: "Tech Fluency", val: 3, desc: "Ability to understand API economy, Cloud, and 'The Monolith'." }, 
            { label: "Financial Literacy", val: 3, desc: "Understanding how Latency impacts Revenue & OpEx." }, 
            { label: "Data Culture", val: 3, desc: "Moving from 'Gut Feel' to 'Evidence-Based' decisions." }, 
            { label: "Squad Autonomy", val: 3, desc: "Letting teams decide 'How' while you define 'What'." }, 
            { label: "Psych Safety", val: 3, desc: "Does bad news travel up faster than good news?" } 
        ],
        aiCoachResponse: null, // New variable to store AI text
        isAnalyzingTalent: false, // Loading state
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
        // BILINGUAL BOT (AI Role-Playing Assistant)
        // ------------------------------------------------------------------
        rolePlay: {
            active: false,
            loading: false,
            input: '',
            messages: [],
            activePersona: null,
            score: 50, // Starts neutral (0 = Fired, 100 = Promoted)
            
            // The Stakeholders
            personas: [
                {
                    id: 'risk',
                    name: "Marcus (The Wall)",
                    role: "Chief Risk Officer",
                    avatar: "fa-user-shield",
                    color: "text-red-400",
                    mood: "Skeptical & Protective",
                    context: "You want to launch a cloud app. He thinks the cloud is insecure.",
                    hidden_fear: "He fears a data breach will end his career."
                },
                {
                    id: 'sales',
                    name: "Sarah (The Sprinter)",
                    role: "Head of Sales",
                    avatar: "fa-user-tie",
                    color: "text-green-400",
                    mood: "Impatient & Greedy",
                    context: "You need 2 sprints to refactor code. She wants new features now.",
                    hidden_fear: "She fears missing her quarterly bonus targets."
                },
                {
                    id: 'architect',
                    name: "Raj (The Purist)",
                    role: "Lead Architect",
                    avatar: "fa-network-wired",
                    color: "text-purple-400",
                    mood: "Pedantic & Intellectual",
                    context: "You want to buy a SaaS tool. He wants to build it in-house perfectly.",
                    hidden_fear: "He fears 'Spaghetti Architecture' will make the system unmaintainable."
                }
            ],

            start(index) {
                this.activePersona = this.personas[index];
                this.active = true;
                this.messages = [];
                this.score = 50;
                this.input = '';
                
                // Initial message from the Bot
                this.addMessage('bot', `(Arms crossed) So, I hear you have a proposal. Convince me.`, null);
            },

            stop() {
                this.active = false;
                this.activePersona = null;
            },

            addMessage(role, text, coaching) {
                this.messages.push({ 
                    role, 
                    text, 
                    coaching, // The "Bilingual Coach" whisper
                    timestamp: new Date().toLocaleTimeString() 
                });
                this.scrollToBottom();
            },

            async send() {
                if (!this.input.trim()) return;
                
                const userText = this.input;
                this.input = '';
                this.addMessage('user', userText, null);
                this.loading = true;

                const p = this.activePersona;

                // AI PROMPT: This instructs the AI to play two roles (Actor + Coach)
                const systemPrompt = `
                    ACT AS: A Role-Play Simulation Engine.
                    
                    ROLE 1 (THE ACTOR): You are ${p.name}, the ${p.role}.
                    YOUR MOOD: ${p.mood}.
                    YOUR SECRET FEAR: ${p.hidden_fear}.
                    CURRENT CONTEXT: ${p.context}.
                    
                    ROLE 2 (THE COACH): You are a "Bilingual Executive Coach" grading the user.
                    
                    TASK:
                    1. Respond to the user's input as THE ACTOR. If they use jargon, get confused or angry. If they speak value, get interested.
                    2. Provide a "Coach's Whisper" explaining why the user's answer was good or bad.
                    3. Adjust the "Trust Score" (-10 to +10) based on how well they translated tech to business.
                    
                    USER INPUT: "${userText}"
                    
                    OUTPUT JSON ONLY (No markdown):
                    {
                        "reply": "string (The Actor's response)",
                        "coach_tip": "string (Short feedback on communication style)",
                        "score_impact": number (Integer between -10 and 10),
                        "mood_shift": "string (e.g. 'More Relaxed' or 'Annoyed')"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(systemPrompt, "Roleplay");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    const data = JSON.parse(rawText);

                    // Update State
                    this.score = Math.max(0, Math.min(100, this.score + data.score_impact));
                    
                    // Add Bot Reply
                    this.addMessage('bot', data.reply, {
                        tip: data.coach_tip,
                        mood: data.mood_shift,
                        impact: data.score_impact
                    });

                    // Check Win/Loss
                    if (this.score <= 10) {
                        this.addMessage('system', "⛔ MEETING ENDED EARLY. You lost the room.", null);
                    } else if (this.score >= 90) {
                        this.addMessage('system', "✅ SUCCESS. You have total buy-in.", null);
                    }

                } catch (e) {
                    console.error(e);
                    this.addMessage('bot', "I didn't quite catch that. Can you rephrase?", null);
                } finally {
                    this.loading = false;
                }
            },

            scrollToBottom() {
                setTimeout(() => {
                    const el = document.getElementById('rp-scroll');
                    if(el) el.scrollTop = el.scrollHeight;
                }, 100);
            }
        },           
// ------------------------------------------------------------------
        // [REVAMPED] CULTURAL DEBT THERMOMETER (AI-POWERED)
        // ------------------------------------------------------------------
        culturalMonitor: {
            history: [],
            isCheckinOpen: false,
            currentQuestions: [],
            answers: {}, 
            chartInstance: null,
            aiReport: null,
            loadingAI: false,

            // The Question Bank (Categorized)
            questionBank: [
                { id: 'safety_1', category: 'Psychological Safety', text: "Did you feel safe sharing 'bad news' or a delay this week?", type: 'boolean', badAnswer: 'no' },
                { id: 'safety_2', category: 'Psychological Safety', text: "Did leadership blame a person or the process for a failure?", type: 'boolean', badAnswer: 'person' },
                { id: 'silo_1', category: 'Silo Wars', text: "Did you have to negotiate with another department just to do your job?", type: 'boolean', badAnswer: 'yes' },
                { id: 'silo_2', category: 'Silo Wars', text: "Did data flow freely between squads, or was it hoard?", type: 'boolean', badAnswer: 'hoarded' },
                { id: 'speed_1', category: 'Fear of Failure', text: "Did a 'Green Light' report hide a real 'Red' risk?", type: 'boolean', badAnswer: 'yes' },
                { id: 'speed_2', category: 'Fear of Failure', text: "Did we ship value to a customer, or just documentation?", type: 'boolean', badAnswer: 'documentation' }
            ],

            init() {
                try {
                    const saved = localStorage.getItem('bilingual_culture_history');
                    if (saved) this.history = JSON.parse(saved);
                    this.checkSchedule(); 

                } catch (e) { console.error("Load Error", e); }
            },


                        checkSchedule() {
                // If notification not supported, stop
                if (!("Notification" in window)) return;

                // Get last survey time
                const lastEntry = this.history.length > 0 
                    ? this.history[this.history.length - 1].timestamp 
                    : 0;
                
                const now = Date.now();
                const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
                // For testing, you can change oneWeek to 10000 (10 seconds)

                // If more than a week has passed, or no history exists
                if (now - lastEntry > oneWeek) {
                    if (Notification.permission === "granted") {
                        this.sendNotification();
                    } else if (Notification.permission !== "denied") {
                        // We can't request permission automatically on load (browsers block it),
                        // but we can flag UI to ask for it.
                        this.showNotificationPrompt = true; 
                    }
                }
            },

            requestPermission() {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        this.sendNotification();
                        this.showNotificationPrompt = false;
                    }
                });
            },

            sendNotification() {
                // The actual PWA notification
                if (document.hidden) { // Only notify if user isn't looking
                     new Notification("Cultural Pulse Check", {
                        body: "It's been a week. Time for your 2-minute culture check-in.",
                        icon: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png", // Generic thermometer icon
                        tag: "culture-check" // Prevents duplicate notifications
                    });
                }
            },


            
            startCheckin() {
                // Select 2 random questions + 1 fixed sentiment question
                const shuffled = this.questionBank.sort(() => 0.5 - Math.random());
                this.currentQuestions = shuffled.slice(0, 2);
                this.answers = { q1: null, q2: null, sentiment: 50 }; // Sentiment is a slider
                this.isCheckinOpen = true;
                this.aiReport = null;
            },

            async submitCheckin() {
                // Calculate Daily Debt Score (0-100, Higher is worse)
                let debt = 0;
                let tags = [];

                // Score the 2 random questions
                this.currentQuestions.forEach((q, idx) => {
                    const ans = idx === 0 ? this.answers.q1 : this.answers.q2;
                    if (ans === q.badAnswer) {
                        debt += 30; // High penalty for cultural friction
                        tags.push(q.category);
                    }
                });

                // Score Sentiment (Slider 0-100 where 100 is great. Invert for Debt)
                debt += (100 - this.answers.sentiment) * 0.4;

                const entry = {
                    date: new Date().toLocaleDateString(),
                    score: Math.min(100, Math.round(debt)),
                    tags: tags, // Track what specific issues arose
                    timestamp: Date.now()
                };

                this.history.push(entry);
                if (this.history.length > 12) this.history.shift(); // Keep last 12 weeks
                
                localStorage.setItem('bilingual_culture_history', JSON.stringify(this.history));
                
                // Trigger AI Analysis immediately
                await this.generateCultureReport(entry);
                
                this.isCheckinOpen = false;
                this.renderChart();
            },

            async generateCultureReport(latestEntry) {
                this.loadingAI = true;
                
                // Calculate Trend
                const prevScore = this.history.length > 1 ? this.history[this.history.length - 2].score : 0;
                const trend = latestEntry.score > prevScore ? "Worsening (Debt Increasing)" : "Improving";

                const prompt = `
                    ACT AS: An Organizational Psychologist and Agile Coach.
                    TASK: Analyze this week's "Cultural Debt" Pulse Check for a Bank.
                    
                    DATA:
                    - Current Debt Score: ${latestEntry.score}/100 (0 is perfect, 100 is toxic).
                    - Trend: ${trend}
                    - Pain Points Flagged: ${latestEntry.tags.join(', ') || "None specifically flagged, general malaise"}
                    
                    OUTPUT JSON ONLY:
                    {
                        "diagnosis": "1 punchy sentence summarizing the cultural state.",
                        "risk_level": "Low" | "Medium" | "Critical",
                        "industry_benchmark": "How this compares to Top Quartile Fintechs.",
                        "prescription": "1 specific, unconventional 'Bilingual Move' to fix this (e.g., 'Kill the SteerCo', 'Gemba Walk', 'Failure Party')."
                    }
                `;

                try {
                    const response = await this.askSecureAI(prompt, "Cultural Audit");
                    const cleanText = response.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.aiReport = JSON.parse(cleanText);
                } catch (e) {
                    console.error(e);
                    this.aiReport = { diagnosis: "AI Offline. Culture requires human empathy today.", prescription: "Talk to your team." };
                } finally {
                    this.loadingAI = false;
                }
            },

            get currentScore() {
                if (this.history.length === 0) return 0;
                return this.history[this.history.length - 1].score;
            },

            get thermometerColor() {
                const s = this.currentScore;
                if (s < 30) return 'bg-primary shadow-[0_0_20px_rgba(74,222,128,0.6)]'; // Cool/Good
                if (s < 60) return 'bg-warn shadow-[0_0_20px_rgba(251,191,36,0.6)]';    // Warm/Caution
                return 'bg-risk shadow-[0_0_20px_rgba(248,113,113,0.8)] animate-pulse'; // Hot/Toxic
            },

            reset() {
                if(confirm("Clear cultural history?")) {
                    this.history = [];
                    this.aiReport = null;
                    localStorage.removeItem('bilingual_culture_history');
                    if(this.chartInstance) this.chartInstance.destroy();
                }
            },

renderChart() {
                setTimeout(() => {
                    const ctx = document.getElementById('debtChart');
                    if (!ctx) return;
                    if (this.chartInstance) this.chartInstance.destroy();

                    const labels = this.history.map(h => h.date.substring(0,5)); // Short date
                    const data = this.history.map(h => h.score);

                    this.chartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Cultural Heat',
                                data: data,
                                borderColor: '#94a3b8',
                                borderWidth: 2,
                                pointBackgroundColor: data.map(v => v > 60 ? '#f87171' : (v > 30 ? '#fbbf24' : '#4ade80')),
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            // 1. ADD LAYOUT PADDING TO FIX CLIPPING
                            layout: {
                                padding: {
                                    bottom: 10, 
                                    left: 5
                                }
                            },
                            scales: { 
                                y: { 
                                    min: 0, 
                                    max: 100, 
                                    grid: { 
                                        color: '#334155',
                                        drawBorder: false // 2. Removes the bottom line so "0" floats freely
                                    },
                                    ticks: {
                                        color: '#94a3b8',
                                        padding: 8 // 3. Adds space between numbers and chart
                                    }
                                }, 
                                x: { 
                                    display: true,
                                    grid: { display: false },
                                    ticks: { color: '#94a3b8' }
                                } 
                            },
                            plugins: { legend: { display: false } }
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
            { id: 'bookshelf', label: 'Executive Library', icon: 'fa-solid fa-book-bookmark', vip: false },
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
            { id: 'capex', label: 'FinOps Auditor', icon: 'fa-solid fa-file-invoice-dollar' },
            { id: 'legacy', label: 'Legacy Translator', icon: 'fa-solid fa-code' },
            { id: 'watermelon', label: 'Lie Detector', icon: 'fa-solid fa-user-secret' },
            { id: 'datacanvas', label: 'Data Product Gen', icon: 'fa-solid fa-cube' },
            { id: 'silo', label: 'Silo Buster', icon: 'fa-solid fa-people-arrows' }, 
            { id: 'roi', label: 'ROI Calculator', icon: 'fa-solid fa-calculator', vip: false },
            { id: 'future', label: 'Future Bank 2030', icon: 'fa-solid fa-forward', vip: false },
            { id: 'conway', label: 'Conway Visualizer', icon: 'fa-solid fa-sitemap', vip: false },
            { id: 'dumbpipe', label: 'Dumb Pipe Calc', icon: 'fa-solid fa-faucet-drip', vip: false },
            { id: 'datagov', label: 'Data Health Dash', icon: 'fa-solid fa-server', vip: false },
            { id: 'community', label: 'Community', icon: 'fa-solid fa-users' }, 
            { id: 'escaperoom', label: 'Excel Escape Room', icon: 'fa-solid fa-dungeon', vip: false },
            { id: 'architect', label: 'Architect Console', icon: 'fa-solid fa-microchip text-hotpink', vip: true },
        ],
        
        dashboardTools: [ 
            { id: 'feed', label: 'Daily Insight', desc: 'Micro-lessons to build your streak.', icon: 'fa-solid fa-mug-hot', color: 'text-orange-400' },
            { id: 'simulator', label: 'Case Simulator', desc: 'Practice bilingual decision making.', icon: 'fa-solid fa-chess-knight', color: 'text-primary' },
            { id: 'whatif', label: 'Scenario Planner', desc: 'AI-powered strategic simulation.', icon: 'fa-solid fa-chess-rook', color: 'text-purple-400' },
            { id: 'roleplay', label: 'Bilingual Bot', desc: 'AI Role-Play: Practice high-stakes conversations.', icon: 'fa-solid fa-masks-theater', color: 'text-yellow-400', vip: false },
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
            { id: 'capex', label: 'FinOps Auditor', desc: 'Classify Agile tickets as CapEx (Assets) vs OpEx.', icon: 'fa-solid fa-file-invoice-dollar', color: 'text-green-400' },
            { id: 'legacy', label: 'Legacy Code Explainer', desc: 'Translate COBOL/SQL into Business Rules.', icon: 'fa-solid fa-code', color: 'text-slate-400' },
            { id: 'watermelon', label: 'Green Light Detector', desc: 'Detect the "Watermelon Effect" in status reports.', icon: 'fa-solid fa-user-secret', color: 'text-red-500' },
            { id: 'vendor', label: 'Vendor Partnership Pyramid', desc: 'AI Coach to renegotiate contracts from "Time & Materials" to "Shared Outcomes".', icon: 'fa-solid fa-file-contract', color: 'text-yellow-400' },
            { id: 'silo', label: 'The Silo Buster', desc: 'Draft diplomatic emails using Empathy Engineering to unblock the "Clay Layer".', icon: 'fa-solid fa-people-arrows', color: 'text-teal-400' }, 
            { id: 'datacanvas', label: 'Data Product Generator', desc: 'Auto-generate Data Contracts & SLOs from raw Schema.', icon: 'fa-solid fa-cube', color: 'text-blue-400' },
            { id: 'roi', label: 'Lighthouse ROI', desc: 'Quantify Hard & Soft value of your pilot.', icon: 'fa-solid fa-chart-pie', color: 'text-green-400', vip: false },
            { id: 'future', label: 'Scenario Builder', desc: 'Simulate your strategy to 2030.', icon: 'fa-solid fa-timeline', color: 'text-purple-400', vip: false },
            { id: 'conway', label: 'Org Chart Mirror', desc: 'See how your Org Chart creates your Tech Stack.', icon: 'fa-solid fa-project-diagram', color: 'text-indigo-400', vip: false },
            { id: 'dumbpipe', label: 'Utility Risk', desc: 'Are you becoming invisible?', icon: 'fa-solid fa-link-slash', color: 'text-red-400', vip: false },
            { id: 'bookshelf', label: 'Executive Library', desc: 'Tool B: Required Reading & Tech Stack.', icon: 'fa-solid fa-book', color: 'text-cyan-400', vip: false },
            { id: 'escaperoom', label: 'Escape the Factory', desc: 'Gamified technical debt reduction.', icon: 'fa-solid fa-gamepad', color: 'text-green-400', vip: false },
            { id: 'datagov', label: 'Live Data Governance', desc: 'Monitor SLOs, Lineage, and Quality in real-time.', icon: 'fa-solid fa-traffic-light', color: 'text-blue-500', vip: false },
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

                openBook(book) {
            this.bookshelf.activeBook = book;
        },

        closeBook() {
            this.bookshelf.activeBook = null;
        },

        askAIAboutBook(bookTitle) {
            // This function is bound to the root, so 'this' can access chatInput and sendMessage
            this.bookshelf.activeBook = null;
            this.isChatOpen = true;
            this.chatInput = `Act as an expert on the book '${bookTitle}'. How do I apply its main bilingual concept to a traditional bank?`;
            this.sendMessage();
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

// ============================================================
        // UPDATED: TALENT ANALYSIS & CHARTS
        // ============================================================
        get talentMaturityScore() {
            const total = this.talentSkills.reduce((acc, curr) => acc + curr.val, 0);
            return (total / this.talentSkills.length).toFixed(1); // Returns "3.4" etc.
        },

        async analyzeGap() {
            this.isAnalyzingTalent = true;
            this.aiCoachResponse = null;
            
            const scores = this.talentSkills.map(s => `${s.label}: ${s.val}/5`);
            const prompt = `
                ACT AS: An Executive Coach for a Bank CIO.
                DATA: My leadership profile is: ${scores.join(', ')}.
                
                TASK:
                1. Identify my biggest blind spot.
                2. Give me ONE specific, uncomfortable action to take tomorrow to improve the lowest score.
                
                OUTPUT: Markdown format. Keep it punchy. No corporate fluff.
            `;

            try {
                const response = await this.askSecureAI(prompt, "Analyze Talent Profile");
                this.aiCoachResponse = typeof marked !== 'undefined' ? marked.parse(response) : response;
            } catch (e) {
                this.aiCoachResponse = "Coach is currently offline. Please check your connection.";
            } finally {
                this.isAnalyzingTalent = false;
            }
        },

        updateTalentChart() {
            this.$nextTick(() => {
                const ctx = document.getElementById('talentChart');
                if (!ctx) return;

                if (window.myTalentChart) window.myTalentChart.destroy();

                Chart.defaults.font.family = '"JetBrains Mono", monospace';
                
                window.myTalentChart = new Chart(ctx, { 
                    type: 'radar', 
                    data: { 
                        labels: this.talentSkills.map(s => s.label), 
                        datasets: [{ 
                            label: 'Current Capability',
                            data: this.talentSkills.map(s => s.val), 
                            backgroundColor: 'rgba(244, 114, 182, 0.2)', // Pink opacity
                            borderColor: '#f472b6', // Hot Pink
                            pointBackgroundColor: '#fff',
                            pointBorderColor: '#f472b6',
                            pointHoverBackgroundColor: '#f472b6',
                            pointHoverBorderColor: '#fff',
                            borderWidth: 2
                        }] 
                    }, 
                    options: { 
                        animation: { duration: 200 }, // Fast animation
                        plugins: { legend: { display: false } }, 
                        scales: { 
                            r: { 
                                min: 0, max: 5, 
                                ticks: { display: false, stepSize: 1 }, 
                                grid: { color: '#334155', circular: true }, 
                                angleLines: { color: '#334155' },
                                pointLabels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' } }
                            } 
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
                
                const userText = this.input;
                this.addMessage('user', userText);
                this.input = '';
                this.loading = true;
                this.turn++;

                const systemPrompt = `
                    ACT AS: Marcus, a cynical Chief Risk Officer.
                    SCENARIO: User wants to launch a product.
                    TASK: Score safety/speed and reply.
                    OUTPUT JSON ONLY: { "safety_score": number, "speed_score": number, "reply": "string" }
                    HISTORY: ${this.context.history.join('\n')}
                `;

                try {
                    let rawText = await this.askSecureAI(systemPrompt, userText);
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    let content = JSON.parse(rawText);

                    this.scores.safety = content.safety_score;
                    this.scores.speed = content.speed_score;
                    this.addMessage('bot', content.reply);

                    if (this.turn >= this.maxTurns) {
                        this.addMessage('system', "SIMULATION ENDED. Check your final Bilingual Score above.");
                    }

                } catch (e) {
                    console.error(e);
                    this.addMessage('system', "Connection Error.");
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

                const prompt = `
                    ACT AS: Bank CISO.
                    TASK: Analyze this SaaS tool: "${this.inputs.name}".
                    
                    OUTPUT JSON ONLY (No markdown):
                    {
                        "category": "string (e.g. Project Mgmt, AI)",
                        "likely_has_pii": boolean,
                        "criticality": boolean,
                        "top_risks": ["string", "string"],
                        "velocity_justification": "string (1 sentence business case)"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, this.inputs.name);
                    // Clean up potential markdown code blocks from AI response
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    
                    const data = JSON.parse(rawText);
                    
                    // Auto-fill form
                    this.inputs.hasPII = data.likely_has_pii;
                    this.inputs.isCritical = data.criticality;
                    
                    this.aiAnalysis = {
                        category: data.category,
                        risks: data.top_risks,
                        justification: data.velocity_justification
                    };

                } catch (e) {
                    console.error(e);
                    alert("Analysis failed. Please fill manually.");
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
                if (!this.policy || !this.aiOutput) return alert("Please provide both Policy and AI Output.");
                
                this.loading = true;
                this.result = null;

                const prompt = `
                    ACT AS: Senior Compliance Officer.
                    TASK: Compare AI Output against Policy.
                    
                    SOURCE POLICY: """${this.policy}"""
                    AI OUTPUT: """${this.aiOutput}"""
                    
                    OUTPUT JSON ONLY (No markdown):
                    {
                        "score": number (0-100),
                        "verdict": "SAFE" | "CAUTION" | "FAIL",
                        "reason": "Short summary",
                        "hallucinations": ["List specific lies/errors"]
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Analyze conflict");
                    // Clean up potential markdown code blocks from AI response
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    
                    this.result = JSON.parse(rawText);

                } catch (e) {
                    alert("Scan failed. Try again.");
                    this.result = { score: 0, verdict: "ERROR", reason: "AI Service Unreachable", hallucinations: [] };
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

                // 1. Try Offline Match First (Fast)
                const match = this.presets.find(p => this.input.toLowerCase().includes(p.keyword));
                if (match) {
                    await new Promise(r => setTimeout(r, 500)); // Small UI delay
                    this.result = { output: this.input, ...match, explanation: "Standard pattern matched (Offline)." };
                    this.loading = false;
                    return;
                }

                // 2. AI Generation
                const prompt = `
                    ACT AS: Product Coach.
                    TASK: Convert this "Project Output" into a "Business Outcome".
                    INPUT: "${this.input}"
                    
                    OUTPUT JSON ONLY (No markdown):
                    {
                        "outcome": "string (Business Value)",
                        "leading": "string (Behavioral Metric)",
                        "lagging": "string (P&L Metric)",
                        "explanation": "1 sentence logic"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, this.input);
                    // Clean up potential markdown code blocks from AI response
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    
                    const aiContent = JSON.parse(rawText);

                    this.result = {
                        output: this.input,
                        ...aiContent
                    };

                } catch (e) {
                    console.error(e);
                    alert("Could not generate KPIs. Try a simpler input.");
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
                if (!this.currentTerms) return alert("Please describe your contract.");
                
                this.loading = true;

                const prompt = `
                    ACT AS: IT Procurement Strategist.
                    FRAMEWORK: Vendor Partnership Pyramid.
                    INPUT: Vendor: ${this.vendorName}, Type: ${this.contractType}, Terms: "${this.currentTerms}"
                    
                    OUTPUT JSON ONLY (No markdown):
                    {
                        "level": "string (e.g. Level 2)",
                        "danger": "string (Why it fails)",
                        "upgrade_clause": "string (New contract text)",
                        "objection": "string (Vendor response)",
                        "rebuttal": "string (Your comeback)"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Analyze Contract");
                    // Clean up potential markdown code blocks
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    
                    this.analysis = JSON.parse(rawText);
                    this.step = 'analysis';

                } catch (e) {
                    alert("Analysis Failed. Please try again.");
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

                const prompt = `
                    ACT AS: A stubborn Vendor Account Manager.
                    GOAL: Protect your T&M revenue. Resist "Risk Sharing".
                    CONTEXT: Bank wants to move to Outcome-based pricing.
                    LAST REPLY: "${userText}"
                    INSTRUCTION: Keep response short (under 50 words). If user is weak, push back. If strong, agree.
                `;

                try {
                    const reply = await this.askSecureAI(prompt, userText);
                    this.simMessages.push({ role: 'bot', text: reply });
                } catch(e) {
                    this.simMessages.push({ role: 'system', text: "Simulation Error." });
                } finally {
                    this.simLoading = false;
                }
            } 
        },

        // ------------------------------------------------------------------
        // CAPEX vs OPEX CLASSIFIER (FinOps Auditor)
        // ------------------------------------------------------------------
        capexClassifier: {
            // Demo data to help the user understand the format
            input: "FEAT-101: Implement Biometric Login\nBUG-402: Fix crash on payment screen\nCHORE: Update server dependencies\nFEAT-103: New 'Savings Pot' architecture\nSPIKE: Investigate blockchain latency",
            loading: false,
            analysis: null, // Stores the detailed JSON response
            stats: { capexVal: 0, opexVal: 0, ratio: 0 },

            async analyze() {
                if (!this.input.trim()) return alert("Please paste some ticket titles.");
                
                this.loading = true;
                this.analysis = null;

                // The "Bilingual" Prompt
                const prompt = `
                    ACT AS: A Technical Accounting Auditor (IAS 38 Specialist).
                    TASK: Classify the following software engineering tasks as "CapEx" (Capitalizable) or "OpEx" (Expense).
                    
                    RULES (IAS 38):
                    - CapEx: New features, substantial enhancement, extending useful life, creating future economic benefit.
                    - OpEx: Bug fixes, routine maintenance, research/spikes, refactoring (without new capability), training.
                    
                    INPUT LIST:
                    """${this.input}"""
                    
                    OUTPUT JSON ONLY:
                    {
                        "items": [
                            { 
                                "ticket": "string (original text)", 
                                "type": "CapEx" or "OpEx", 
                                "confidence": number (0-100),
                                "justification": "string (Accounting logic sentence)" 
                            }
                        ],
                        "summary": {
                            "capex_count": number,
                            "opex_count": number
                        }
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Audit Tickets");
                    // Clean up markdown if Gemini adds it
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    
                    const data = JSON.parse(rawText);
                    this.analysis = data.items;
                    
                    // Calculate Ratio for the Dashboard
                    const total = data.summary.capex_count + data.summary.opex_count;
                    this.stats.capexVal = data.summary.capex_count;
                    this.stats.opexVal = data.summary.opex_count;
                    this.stats.ratio = total === 0 ? 0 : Math.round((data.summary.capex_count / total) * 100);

                } catch (e) {
                    console.error(e);
                    alert("Audit Failed. Please try a smaller list.");
                } finally {
                    this.loading = false;
                }
            }
        },

        // ------------------------------------------------------------------
        // LIGHTHOUSE ROI CALCULATOR (Hard & Soft Value)
        // ------------------------------------------------------------------
        lighthouseROI: {
            // Default inputs based on a typical 90-day pilot
            inputs: {
                name: '',
                duration_weeks: 12,
                squad_cost_per_week: 15000, // Approx $15k/week for a team of 6
                software_cost: 25000, // Licenses, cloud
                revenue_generated: 0, // New income
                cost_avoided: 150000, // Legacy maintenance saved, fines avoided
                old_cycle_time: 20, // Weeks to ship before
                new_cycle_time: 2,  // Weeks to ship now
                cultural_score: 8   // 1-10 (Team morale/learning)
            },
            results: null,
            aiNarrative: null,
            loading: false,

          // Inside lighthouseROI object in js/app.js

calculate() {
    // --- VALIDATION CHECK ---
    if (!this.inputs.name || this.inputs.name.trim() === '') {
        alert("⚠️ Mandate Error: You cannot calculate ROI without a Project Name.");
        return; // Stops the function immediately
    }

    const i = this.inputs;
    
    // 1. Hard Costs
    const laborCost = i.duration_weeks * i.squad_cost_per_week;
    const totalInvestment = laborCost + parseInt(i.software_cost);
    
    // 2. Hard Benefits
    const totalValue = parseInt(i.revenue_generated) + parseInt(i.cost_avoided);
    const netProfit = totalValue - totalInvestment;
    const roiPercent = Math.round(((totalValue - totalInvestment) / totalInvestment) * 100);

    // 3. Speed Differential (The Multiplier)
    const speedFactor = (i.old_cycle_time / i.new_cycle_time).toFixed(1);

    this.results = {
        totalInvestment: totalInvestment,
        totalValue: totalValue,
        netProfit: netProfit,
        roiPercent: roiPercent,
        speedFactor: speedFactor
    };

    // Trigger AI to write the story
    this.generateNarrative();
},

            async generateNarrative() {
                this.loading = true;
                this.aiNarrative = null;
                const r = this.results;
                const i = this.inputs;

                const prompt = `
                    ACT AS: A CFO / Chief Strategy Officer.
                    TASK: Write a "Board-Ready Executive Summary" for a Pilot Project based on these ROI numbers.
                    
                    DATA:
                    - Project: ${i.name || "Pilot"}
                    - Investment: $${r.totalInvestment.toLocaleString()}
                    - Hard Return: $${r.netProfit.toLocaleString()} (${r.roiPercent}% ROI)
                    - Speed Gain: ${r.speedFactor}x faster than legacy process.
                    - Cultural Score: ${i.cultural_score}/10.

                    OUTPUT JSON ONLY:
                    {
                        "headline": "A punchy, 1-sentence title focusing on value.",
                        "financial_verdict": "2 sentences analyzing the hard money. Be objective.",
                        "strategic_verdict": "2 sentences explaining why the SPEED (Speed Factor) matters more than the money long term.",
                        "defense": "1 sentence to say to a skeptic who says 'This pilot was too expensive'."
                    }
                `;

                try {
                    // Note: We use the secureBind we set up in init()
                    let rawText = await this.askSecureAI(prompt, "ROI Analysis");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.aiNarrative = JSON.parse(rawText);
                } catch (e) {
                    console.error(e);
                    this.aiNarrative = {
                        headline: "Pilot Analysis Complete",
                        financial_verdict: "ROI has been calculated based on inputs.",
                        strategic_verdict: "Speed improvements indicate strong future value.",
                        defense: "The cost of inaction is higher than the cost of this pilot."
                    };
                } finally {
                    this.loading = false;
                }
            },

            // Generate Board One-Pager PDF
            generatePDF() {
                if (!window.jspdf) { alert("PDF Lib missing"); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // Colors
                const navy = [15, 23, 42];
                const green = [34, 197, 94];

                // Header
                doc.setFillColor(...navy);
                doc.rect(0, 0, 210, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text("LIGHTHOUSE ROI REPORT", 20, 20);
                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.text(`PROJECT: ${(this.inputs.name || 'PILOT').toUpperCase()}`, 20, 32);

                // The Big Numbers
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(14);
                doc.text("1. FINANCIAL PERFORMANCE (HARD ROI)", 20, 60);

                doc.setFontSize(10);
                doc.text(`Total Investment: $${this.results.totalInvestment.toLocaleString()}`, 20, 70);
                doc.text(`Total Value Created: $${this.results.totalValue.toLocaleString()}`, 80, 70);
                
                // ROI Box
                doc.setFillColor(this.results.netProfit > 0 ? 220 : 255, this.results.netProfit > 0 ? 255 : 220, 220);
                doc.rect(20, 75, 170, 20, 'F');
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0,0,0);
                doc.text(`NET PROFIT: $${this.results.netProfit.toLocaleString()}`, 30, 88);
                doc.text(`ROI: ${this.results.roiPercent}%`, 120, 88);

                // Velocity
                doc.setFontSize(14);
                doc.text("2. OPERATIONAL VELOCITY (SOFT ROI)", 20, 110);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
                doc.text(`Speed Multiplier: ${this.results.speedFactor}x Faster`, 20, 120);
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`(Reduced cycle time from ${this.inputs.old_cycle_time} weeks to ${this.inputs.new_cycle_time} weeks)`, 20, 126);

                // AI Narrative (PDF FIX STARTS HERE)
                if (this.aiNarrative) {
                    let currentY = 145; // Start position
                    
                    doc.setTextColor(0,0,0);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(14);
                    doc.text("3. EXECUTIVE SUMMARY", 20, currentY);
                    
                    currentY += 10;
                    
                    // 1. Headline (Wrap text to 170mm width)
                    doc.setFontSize(11);
                    doc.setTextColor(30, 58, 138); // Dark Blue
                    const headlineLines = doc.splitTextToSize(`"${this.aiNarrative.headline}"`, 170);
                    doc.text(headlineLines, 20, currentY);
                    currentY += (headlineLines.length * 6) + 4; // Dynamic spacing

                    // 2. Strategic Verdict (Wrap text)
                    doc.setTextColor(0,0,0);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    const strategyLines = doc.splitTextToSize(this.aiNarrative.strategic_verdict, 170);
                    doc.text(strategyLines, 20, currentY);
                    currentY += (strategyLines.length * 5) + 10; // Dynamic spacing

                    // 3. CFO Defense Script (Box + Text)
                    doc.setFont("helvetica", "italic");
                    // We calculate the lines for the box width (160mm to leave padding)
                    const defenseLines = doc.splitTextToSize(`"${this.aiNarrative.defense}"`, 160);
                    
                    // Calculate height: lines * line-height + padding top/bottom
                    const boxHeight = (defenseLines.length * 5) + 15; 

                    // Draw Box
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(20, currentY, 170, boxHeight);
                    
                    // Header inside box
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(9);
                    doc.setTextColor(0,0,0);
                    doc.text("CFO DEFENSE SCRIPT:", 25, currentY + 7);
                    
                    // Script inside box
                    doc.setFont("helvetica", "italic");
                    doc.text(defenseLines, 25, currentY + 15);
                }

                doc.save("Lighthouse_ROI.pdf");
            }
                
            
        },

        // ------------------------------------------------------------------
        // FUTURE BANK SCENARIO BUILDER (2030 SIMULATOR)
        // ------------------------------------------------------------------
        futureBank: {
            activeScenario: null,
            year: 2026,
            isPlaying: false,
            aiNarrative: null,
            loading: false,

            // The Strategic Paths
            scenarios: [
                {
                    id: 'ai_first',
                    title: 'The Bionic Bank',
                    icon: 'fa-robot',
                    color: 'text-purple-400',
                    desc: 'Aggressive automation. AI Agents handle 90% of service.',
                    evolution: {
                        2026: { org: "Hierarchical", tech: "Hybrid Cloud", profit: "$1.2B" },
                        2027: { org: "Flattening...", tech: "Data Mesh Live", profit: "$1.1B (J-Curve)" },
                        2028: { org: "Squad Based", tech: "GenAI Core", profit: "$1.5B" },
                        2029: { org: "Bionic Teams", tech: "Agentic Swarm", profit: "$2.8B" },
                        2030: { org: "30% Smaller / 10x Faster", tech: "Self-Driving Finance", profit: "$4.5B" }
                    }
                },
                {
                    id: 'partnership',
                    title: 'The Invisible Bank',
                    icon: 'fa-handshake',
                    color: 'text-green-400',
                    desc: 'Embedded Finance. We become the utility for Big Tech.',
                    evolution: {
                        2026: { org: "Siloed", tech: "API Gateway V1", profit: "$1.2B" },
                        2027: { org: "Partnership Div", tech: "Headless Core", profit: "$1.3B" },
                        2028: { org: "Brand Fading", tech: "Embedded in Tesla/Amazon", profit: "$1.8B" },
                        2029: { org: "Utility Model", tech: "Invisible Rails", profit: "$2.2B" },
                        2030: { org: "Infrastructure Only", tech: "Global Liquidity Engine", profit: "$3.0B" }
                    }
                },
                {
                    id: 'crisis',
                    title: 'The Fortress',
                    icon: 'fa-shield-halved',
                    color: 'text-risk',
                    desc: 'Defensive posture. Compliance first. Innovation second.',
                    evolution: {
                        2026: { org: "Bureaucratic", tech: "Mainframe", profit: "$1.2B" },
                        2027: { org: "Frozen Middle", tech: "Security Patches", profit: "$1.0B" },
                        2028: { org: "Talent Drain", tech: "Technical Debt", profit: "$0.8B" },
                        2029: { org: "Acquisition Target", tech: "Legacy Swamp", profit: "$0.5B" },
                        2030: { org: "Obsolete", tech: "Liquidated / Merged", profit: "-$0.2B" }
                    }
                }
            ],

            selectScenario(id) {
                this.activeScenario = this.scenarios.find(s => s.id === id);
                this.year = 2026;
                this.aiNarrative = null;
                this.playSimulation();
            },

            playSimulation() {
                this.isPlaying = true;
                let timer = setInterval(() => {
                    if (this.year < 2030) {
                        this.year++;
                    } else {
                        clearInterval(timer);
                        this.isPlaying = false;
                        this.generateReflection(); // Trigger AI at the end
                    }
                }, 1500); // 1.5 seconds per year
            },

            get currentState() {
                if (!this.activeScenario) return null;
                return this.activeScenario.evolution[this.year];
            },

            // AI ENHANCEMENT: The "Letter from the Future"
            async generateReflection() {
                this.loading = true;
                const s = this.activeScenario;

                const prompt = `
                    ACT AS: The CEO of this Bank in the year 2030.
                    SCENARIO CHOSEN IN 2026: "${s.title}" (${s.desc}).
                    OUTCOME IN 2030:
                    - Org Structure: ${s.evolution[2030].org}
                    - Tech Stack: ${s.evolution[2030].tech}
                    - Financials: ${s.evolution[2030].profit}
                    
                    TASK: Write a short, dramatic "Retrospective Letter" to your past self (in 2026).
                    - If "Bionic Bank": Celebrate the pain of the J-Curve and the ultimate victory of automation.
                    - If "Invisible Bank": Reflect on losing the brand but saving the balance sheet via APIs.
                    - If "The Fortress": A regretful warning about playing it safe while the market moved on.
                    
                    OUTPUT JSON ONLY:
                    {
                        "subject": "Email Subject Line",
                        "body": "The letter content (approx 100 words). Use <br> for line breaks."
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Future Simulation");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.aiNarrative = JSON.parse(rawText);
                } catch (e) {
                    console.error(e);
                    this.aiNarrative = {
                        subject: "Connection Lost",
                        body: "The time portal is unstable. But the data shows this strategy defined our destiny."
                    };
                } finally {
                    this.loading = false;
                }
            }
        },

        // ------------------------------------------------------------------
        // CONWAY'S LAW VISUALIZER (Org -> Arch)
        // ------------------------------------------------------------------
        conwaySim: {
            inputMode: 'silo', // 'silo' (Bad) or 'squad' (Good)
            departments: [],
            architecture: [], // The resulting software
            loading: false,
            aiAnalysis: null,

            // Presets for quick demos
            loadScenario(type) {
                this.departments = [];
                this.aiAnalysis = null;
                
                if (type === 'silo') {
                    this.departments = [
                        { id: 1, name: "Retail Banking Dept", type: "silo", icon: "fa-building-columns", color: "border-orange-500 text-orange-400" },
                        { id: 2, name: "Credit Card Dept", type: "silo", icon: "fa-credit-card", color: "border-red-500 text-red-400" },
                        { id: 3, name: "Mobile App Team", type: "silo", icon: "fa-mobile-screen", color: "border-blue-400 text-blue-300" },
                        { id: 4, name: "Risk Committee", type: "gatekeeper", icon: "fa-gavel", color: "border-slate-400 text-slate-300" }
                    ];
                } else {
                    this.departments = [
                        { id: 1, name: "Instant Loan Squad", type: "squad", icon: "fa-rocket", color: "border-green-400 text-green-300" },
                        { id: 2, name: "Daily Banking Squad", type: "squad", icon: "fa-wallet", color: "border-green-400 text-green-300" },
                        { id: 3, name: "Platform Ops", type: "enabler", icon: "fa-server", color: "border-purple-400 text-purple-300" }
                    ];
                }
                this.generateArchitecture();
            },

            addDept() {
                const name = prompt("Enter Department Name (e.g., 'Mortgage Ops'):");
                if (name) {
                    this.departments.push({ 
                        id: Date.now(), 
                        name: name, 
                        type: 'silo', 
                        icon: "fa-building", 
                        color: "border-slate-500 text-slate-400" 
                    });
                    this.generateArchitecture();
                }
            },

            removeDept(index) {
                this.departments.splice(index, 1);
                this.generateArchitecture();
            },

            // The "Conway Engine" - Simple Rules Logic
            generateArchitecture() {
                this.architecture = this.departments.map(dept => {
                    if (dept.type === 'silo') {
                        return { 
                            name: `${dept.name} Monolith`, 
                            desc: "Isolated Database. No API access.", 
                            icon: "fa-database", 
                            style: "opacity-50 border-dashed"
                        };
                    } else if (dept.type === 'gatekeeper') {
                        return { 
                            name: "Manual Review Queue", 
                            desc: "Bottleneck. 3-day delay.", 
                            icon: "fa-hand-paper", 
                            style: "border-red-500 bg-red-900/10"
                        };
                    } else {
                        return { 
                            name: `${dept.name} Microservice`, 
                            desc: "API-First. Real-time Data.", 
                            icon: "fa-cubes", 
                            style: "border-green-500 bg-green-900/10"
                        };
                    }
                });
            },

            async analyze() {
                if (this.departments.length === 0) return alert("Build an org chart first.");
                
                this.loading = true;
                
                const orgList = this.departments.map(d => d.name).join(", ");
                
                const prompt = `
                    ACT AS: Systems Architect & Anthropologist.
                    THEORY: Conway's Law (Software architecture reflects organizational structure).
                    INPUT ORG CHART: ${orgList}.
                    
                    TASK: Predict the specific technical failure modes caused by this structure.
                    
                    OUTPUT JSON ONLY:
                    {
                        "verdict": "string (e.g., 'Distributed Monolith' or 'Aligned Mesh')",
                        "pain_point": "string (Where the customer feels the org chart)",
                        "technical_debt": "string (The specific code consequence, e.g., 'Spaghetti integrations')",
                        "fix": "string (How to restructure for flow)"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Conway Analysis");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.aiAnalysis = JSON.parse(rawText);
                } catch (e) {
                    console.error(e);
                    this.aiAnalysis = {
                        verdict: "Siloed Architecture Detected",
                        pain_point: "Customer data is fragmented across these departments.",
                        technical_debt: "Massive ETL reconciliation costs.",
                        fix: "Move to Cross-Functional Squads."
                    };
                } finally {
                    this.loading = false;
                }
            }
        },

        // ------------------------------------------------------------------
        // DUMB PIPE RISK CALCULATOR (SMART VERSION v2)
        // ------------------------------------------------------------------
        dumbPipeCalc: {
            inputs: {
                commodity_share: 60, 
                engagement: 30,      
                brand_trust: 5,      
            },
            result: null,
            loading: false,
            aiStrategy: null,

            analyze() {
                this.loading = true;
                this.result = null;
                this.aiStrategy = null;

                const i = this.inputs;

                // 1. SMART SCORING LOGIC
                // Base Risk = Your dependency on commodity revenue
                let baseRisk = parseInt(i.commodity_share);

                // Mitigation Factors (Engagement & Brand can lower risk, but not eliminate it)
                // We weight Brand higher than Engagement (Engagement is vanity, Brand is moat)
                let engagementDiscount = (i.engagement / 100) * 15; // Max 15 points off
                let brandDiscount = (i.brand_trust / 10) * 20;      // Max 20 points off

                let finalRisk = baseRisk - engagementDiscount - brandDiscount;

                // CRITICAL OVERRIDE: If Commodity > 80%, you are a Utility regardless of how nice you are.
                // You cannot "Nice" your way out of bad unit economics.
                if (i.commodity_share > 80) {
                    finalRisk = Math.max(finalRisk, 65); // Floor at 65% (High Risk)
                }

                // Cap boundaries
                finalRisk = Math.max(0, Math.min(100, Math.round(finalRisk)));

                // 2. Determine Verdict Profile
                let verdict = "";
                let timeline = "";
                let color = "";
                let archetype = "";

                if (finalRisk > 75) {
                    verdict = "TERMINAL UTILITY";
                    timeline = "12 Months to Irrelevance";
                    color = "text-risk";
                    archetype = "The Dumb Pipe";
                } else if (finalRisk > 50) {
                    // Smart Logic: Check specific edge cases
                    if (i.engagement > 70) {
                        verdict = "THE BUSY FOOL"; // High Traffic, Low Margin
                        timeline = "Burning OpEx fast";
                        color = "text-orange-500";
                        archetype = "High-Traffic Utility";
                    } else {
                        verdict = "SLOW BLEED";
                        timeline = "2-3 Years";
                        color = "text-warn";
                        archetype = "The Legacy Bank";
                    }
                } else {
                    verdict = "TRUSTED ECOSYSTEM";
                    timeline = "Sustainable";
                    color = "text-primary";
                    archetype = "The Bilingual Bank";
                }

                this.result = { score: finalRisk, verdict, timeline, color, archetype };

                // 3. Trigger Smarter AI Analysis
                this.generateAIStrategy(finalRisk, archetype);
            },

            async generateAIStrategy(risk, archetype) {
                const i = this.inputs;
                
                const prompt = `
                    ACT AS: An Activist Investor analyzing a Bank's P&L.
                    
                    DIAGNOSIS DATA:
                    - Revenue Mix: ${i.commodity_share}% Commodity (Interchange/FX/Fees) vs Value-Add.
                    - Customer Activity: ${i.engagement}% Daily Active Users.
                    - Brand Sentiment: ${i.brand_trust}/10.
                    - Calculated Risk Score: ${risk}/100.
                    - Assigned Archetype: "${archetype}"
                    
                    ANALYSIS LOGIC:
                    - IF Commodity is High (>80%) AND Engagement is High (>80%): This is a "Busy Fool" scenario. The bank has high operating costs (server load) but low margins. They are subsidizing customers. Warning should be about "Negative Unit Economics".
                    - IF Commodity is High (>80%) AND Engagement is Low (<30%): This is a "Dumb Pipe". Customers use another interface and just park money here. Warning should be about "Losing the Interface".
                    - IF Commodity is Low (<40%): This is a healthy mix (Advisory/Lending focused).
                    
                    TASK:
                    1. WARNING: A brutal, 1-sentence reality check based on the specific logic above.
                    2. DEFENSIVE MOVE: A product suggestion to lower "Cost to Serve" or lock in deposits (e.g. "Subscription Bundles").
                    3. OFFENSIVE MOVE: A product suggestion to increase "Margin per User" (e.g. "Wealth Lending", "SME Advisory").
                    
                    OUTPUT JSON ONLY:
                    {
                        "warning": "string",
                        "defensive_move": "string",
                        "offensive_move": "string"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Strategic Diagnosis");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.aiStrategy = JSON.parse(rawText);
                } catch (e) {
                    // Smart Fallback based on logic
                    this.aiStrategy = {
                        warning: i.commodity_share > 80 
                            ? "You are running a charity. High engagement with low margin = faster bankruptcy." 
                            : "You are losing relevance. Customers treat you as a wallet, not an advisor.",
                        defensive_move: "Launch a 'Prime' Subscription (Monetize the engagement).",
                        offensive_move: "Automated Wealth Advisory (Cross-sell to the 100% active users)."
                    };
                } finally {
                    this.loading = false;
                }
            }
        },

        // ------------------------------------------------------------------
        // AGILE DATA GOVERNANCE DASHBOARD (Real-Time SLOs)
        // ------------------------------------------------------------------
        dataGovDash: {
            isLive: false,
            interval: null,
            selectedProduct: null,
            aiAnalysis: null,
            loading: false,

            // The Data Products (Assets)
            products: [
                { 
                    id: 'cust360', 
                    name: "Customer 360", 
                    owner: "Marketing Squad", 
                    lineage: "CRM -> Snowflake -> API",
                    slo: { freshness: 100, accuracy: 100, completeness: 100 }, // Targets: 99.9%
                    status: 'healthy',
                    logs: []
                },
                { 
                    id: 'risk_engine', 
                    name: "Credit Risk Engine", 
                    owner: "Risk Squad", 
                    lineage: "Mainframe -> Kafka -> Model",
                    slo: { freshness: 100, accuracy: 100, completeness: 100 },
                    status: 'healthy',
                    logs: []
                },
                { 
                    id: 'payments', 
                    name: "Real-Time Payments", 
                    owner: "Payments Tribe", 
                    lineage: "Gateway -> Ledger -> API",
                    slo: { freshness: 100, accuracy: 100, completeness: 100 },
                    status: 'healthy',
                    logs: []
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
                // Simulate minor fluctuations in healthy products
                this.products.forEach(p => {
                    if (p.status === 'healthy') {
                        // Randomly fluctuate between 98.0 and 100.0
                        p.slo.freshness = (98 + Math.random() * 2).toFixed(1);
                        p.slo.accuracy = (99 + Math.random() * 1).toFixed(1);
                    } else {
                        // Degrade unhealthy products
                        p.slo.freshness = Math.max(40, p.slo.freshness - 5).toFixed(1);
                        p.slo.accuracy = Math.max(50, p.slo.accuracy - 2).toFixed(1);
                    }
                });
            },

            injectFailure(type) {
                // Simulate a break
                const target = this.products[1]; // Break Risk Engine
                target.status = 'critical';
                target.slo.freshness = 75.0;
                
                const log = {
                    time: new Date().toLocaleTimeString(),
                    code: type === 'schema' ? "ERR_SCHEMA_MISMATCH" : "ERR_LATENCY_SPIKE",
                    msg: type === 'schema' ? "Null value detected in 'Credit_Score' field." : "Kafka consumer lag > 5000ms."
                };
                
                target.logs.unshift(log);
                this.selectedProduct = target;
                
                // Auto-trigger AI to explain the failure
                this.analyzeFailure(target, log);
            },

            async analyzeFailure(product, log) {
                this.loading = true;
                this.aiAnalysis = null;

                const prompt = `
                    ACT AS: A Data Reliability Engineer explaining a technical failure to a Business Executive.
                    
                    CONTEXT:
                    - Data Product: ${product.name} (Owned by ${product.owner})
                    - Error Code: ${log.code}
                    - Error Msg: ${log.msg}
                    - Current Health: Freshness ${product.slo.freshness}%, Accuracy ${product.slo.accuracy}%
                    
                    TASK:
                    1. Translate this error into Business Impact (Risk/Revenue).
                    2. Suggest the "Agile Governance" fix (e.g. "Schema Contract", "Circuit Breaker").
                    
                    OUTPUT JSON ONLY:
                    {
                        "impact": "1 sentence business translation.",
                        "fix": "1 sentence technical fix."
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Analyze Data Failure");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.aiAnalysis = JSON.parse(rawText);
                } catch (e) {
                    this.aiAnalysis = { impact: "Data is unreliable. Decisions may be flawed.", fix: "Check data pipeline." };
                } finally {
                    this.loading = false;
                }
            },

            repair(product) {
                product.status = 'healthy';
                product.slo = { freshness: 100, accuracy: 100, completeness: 100 };
                product.logs.unshift({ time: new Date().toLocaleTimeString(), code: "FIXED", msg: "Automated remediation complete." });
                this.aiAnalysis = null;
            }
        },
        
        // ------------------------------------------------------------------
        // LEGACY CODE EXPLAINER (The Rosetta Stone)
        // ------------------------------------------------------------------
        legacyExplainer: {
            // Default demo: A COBOL snippet checking credit limits
            input: "IF ORDER-AMT > CUST-CREDIT-LIMIT\n    MOVE 'Y' TO ORDER-REJECT-FLAG\n    PERFORM REJECT-ROUTINE\nELSE\n    SUBTRACT ORDER-AMT FROM CUST-CREDIT-LIMIT\n    ADD ORDER-AMT TO CUST-BALANCE\nEND-IF.",
            loading: false,
            result: null,

            async explain() {
                if (!this.input.trim()) return alert("Please paste some code.");
                
                this.loading = true;
                this.result = null;

                const prompt = `
                    ACT AS: A Senior Mainframe Architect translating for a CEO.
                    TASK: Explain this legacy code snippet in plain Business English.
                    
                    CONSTRAINTS: 
                    1. DO NOT use variable names (e.g., don't say "CUST-LIMIT", say "Customer Credit Limit").
                    2. DO NOT explain syntax (e.g., don't mention "Perform", "Move", "End-If").
                    3. FOCUS ON MONEY & RISK: What happens to the funds? What is the business rule?
                    
                    INPUT CODE:
                    """${this.input}"""
                    
                    OUTPUT JSON ONLY:
                    {
                        "executive_summary": "1 sentence explanation of what this block does.",
                        "business_rules": ["Rule 1", "Rule 2"],
                        "risk_assessment": "LOW" | "MEDIUM" | "HIGH",
                        "risk_reason": "Why is this logic risky? (e.g., hardcoded values, lack of validation)"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Explain Code");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.result = JSON.parse(rawText);
                } catch (e) {
                    console.error(e);
                    alert("Translation failed. Try a shorter snippet.");
                } finally {
                    this.loading = false;
                }
            }
        },
        
        // ------------------------------------------------------------------
        // THE GREEN LIGHT LIE DETECTOR (Watermelon Effect)
        // ------------------------------------------------------------------
        watermelonDetector: {
            // Demo Data: The classic "90% Done" trap
            inputs: [
                "Week 1: Development is on track. We are 90% complete. Morale is high.",
                "Week 2: Still targeting launch. Found a few minor integration nuances. 95% complete.",
                "Week 3: Almost there. Just waiting on a 3rd party vendor. Dashboard is Green."
            ],
            loading: false,
            result: null,

            async analyze() {
                if (this.inputs.some(i => !i.trim())) return alert("Please fill in all 3 weeks.");
                
                this.loading = true;
                this.result = null;

                const prompt = `
                    ACT AS: A Forensic Project Auditor.
                    TASK: Analyze these 3 sequential weekly status updates for "The Watermelon Effect" (Green on outside, Red on inside).
                    
                    LOOK FOR:
                    1. The "90% Done" Paradox (staying at 90% for weeks).
                    2. Passive Voice ("Mistakes were made" vs "We missed it").
                    3. Lack of Data (Vague optimism vs specific metrics).
                    4. Scope Creep hiding as "refinement".
                    
                    INPUTS:
                    Week 1: "${this.inputs[0]}"
                    Week 2: "${this.inputs[1]}"
                    Week 3: "${this.inputs[2]}"
                    
                    OUTPUT JSON ONLY:
                    {
                        "bs_score": number (0-100, where 100 is Total Lies),
                        "risk_level": "LOW" | "HIGH" | "CRITICAL",
                        "verdict": "string (Short punchy summary, e.g., 'Delusional Optimism')",
                        "red_flags": ["Specific quote or pattern detected"]
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Detect Lies");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.result = JSON.parse(rawText);
                } catch (e) {
                    console.error(e);
                    alert("Analysis failed.");
                } finally {
                    this.loading = false;
                }
            }
        },

        // ------------------------------------------------------------------
        // DATA PRODUCT CANVAS GENERATOR (Data Mesh)
        // ------------------------------------------------------------------
        dataCanvasGen: {
            // Demo Input: A raw, ugly database schema snippet
            input: "TABLE: CUST_TRX_HIST_V2\nCOLS: TRX_ID (PK), AMT_USD, MERCH_CAT_CODE, GEO_LAT, GEO_LONG, TS_UTC, RISK_FLG, SETTLE_STAT, CUST_REF_ID",
            loading: false,
            result: null,

            async generate() {
                if (!this.input.trim()) return alert("Please paste a schema or description.");
                
                this.loading = true;
                this.result = null;

                const prompt = `
                    ACT AS: A Data Product Manager (Data Mesh Expert).
                    TASK: Convert this raw technical schema/description into a "Data Product Canvas".
                    
                    GOAL: define the "Value" and the "Contract" (SLOs) so a business user understands why they should "buy" this data.
                    
                    INPUT SCHEMA:
                    """${this.input}"""
                    
                    OUTPUT JSON ONLY:
                    {
                        "product_name": "Catchy Business Name (e.g., 'Customer 360' or 'Fraud Radar')",
                        "domain": "e.g., Risk, Marketing, Payments",
                        "consumer_persona": "Who buys this? (e.g., 'Fraud Analyst')",
                        "jobs_to_be_done": "What business problem does this solve? (e.g., 'Detects money laundering in real-time')",
                        "slo_freshness": "e.g., < 200ms latency",
                        "slo_accuracy": "e.g., 99.9% completeness",
                        "output_ports": ["SQL", "API", "Events"],
                        "price": "Metaphorical cost (e.g., 'High Compute' or 'T-Shirt Size M')"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Generate Data Product");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.result = JSON.parse(rawText);
                } catch (e) {
                    console.error(e);
                    alert("Generation failed. Try a simpler schema.");
                } finally {
                    this.loading = false;
                }
            }
        },

        // ------------------------------------------------------------------
        // THE SILO BUSTER (Empathy Engineering Emailer)
        // ------------------------------------------------------------------
        siloBuster: {
            recipient: '',
            frictionPoint: '',
            loading: false,
            result: null,

            // Demo data
            loadDemo() {
                this.recipient = "Head of Compliance (David)";
                this.frictionPoint = "He is blocking our Cloud Sandbox because he thinks 'The Cloud is insecure' and wants a 6-month security audit first.";
            },

            async generate() {
                if (!this.recipient || !this.frictionPoint) return alert("Please fill in who is blocking you and why.");
                
                this.loading = true;
                this.result = null;

                const prompt = `
                    ACT AS: An Executive Communications Coach specializing in "Empathy Engineering".
                    
                    THE SITUATION:
                    The User is trying to drive change.
                    The Blocker (Recipient): "${this.recipient}"
                    The Friction/Fear: "${this.frictionPoint}"

                    TASK: Draft an email to the Blocker to unblock the situation.
                    
                    METHODOLOGY (Empathy Engineering):
                    1. VALIDATE THE FEAR (Paragraph 1): Do not argue. Explicitly acknowledge their mandate (e.g., Safety, Compliance, Stability). Make them feel heard.
                    2. REFRAME (Paragraph 2): Frame the innovation not as "New Tech" but as a better way to achieve *their* goal (e.g., Cloud allows better audit logs than on-prem).
                    3. THE GOLDEN BRIDGE (Paragraph 3): Propose a "reversible experiment" or "pilot" with strict boundaries. Not a full rollout. A safe step.
                    
                    TONE: Professional, Collaborative, Low Ego, High Agency.
                    
                    OUTPUT JSON ONLY:
                    {
                        "subject": "string (Compelling subject line)",
                        "body": "string (The email text, use <br> for line breaks)",
                        "strategy_breakdown": "string (Brief explanation of why this psychological approach works)"
                    }
                `;

                try {
                    let rawText = await this.askSecureAI(prompt, "Draft Email");
                    // Clean up markdown
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.result = JSON.parse(rawText);
                } catch (e) {
                    console.error(e);
                    alert("Drafting failed. Please try again.");
                } finally {
                    this.loading = false;
                }
            }
        },
        
        //-------------------------------------------
        //Bookshelf
        //-------------------------------------------
        bookshelf: {
            activeBook: null,
            currentView: 'books',
            
            // 1. THE BOOKS (Complete List)
            books: [
                {
                    id: 'projecttoproduct',
                    title: 'Project to Product',
                    author: 'Mik Kersten',
                    category: 'Strategy',
                    color: 'from-purple-600 to-pink-500',
                    icon: 'fa-timeline',
                    summary: "The definitive guide to the 'Flow Framework'. It explains the mechanics of shifting from tracking hours to tracking value.",
                    bilingualTakeaway: "Project funding kills agility because it disbands the team just as they learn. Product funding keeps the team together to maintain the asset.",
                    actions: ["Stop capitalizing 'Projects'; capitalize 'Features'.", "Measure Flow Efficiency (Active vs Wait time)."],
                    linkedTool: 'capex',
                    linkedToolLabel: 'Audit FinOps/CapEx'
                },
                {
                    id: 'teamtopologies',
                    title: 'Team Topologies',
                    author: 'Skelton & Pais',
                    category: 'Delivery',
                    color: 'from-green-600 to-emerald-500',
                    icon: 'fa-people-group',
                    summary: "A blueprint for organizing business and technology teams for fast flow, dealing with Conway's Law.",
                    bilingualTakeaway: "Your software architecture mirrors your org chart. If you want microservices, you need micro-teams (Squads).",
                    actions: ["Identify 'Stream-Aligned' teams vs 'Enabling' teams.", "Reduce cognitive load on developers."],
                    linkedTool: 'squad',
                    linkedToolLabel: 'Design a Bionic Squad'
                },
                {
                    id: 'soonersafer',
                    title: 'Sooner Safer Happier',
                    author: 'Jonathan Smart',
                    category: 'Strategy',
                    color: 'from-blue-500 to-indigo-600',
                    icon: 'fa-dove',
                    summary: "Written by the former lead of Ways of Working at Barclays. One of the few Agile books written specifically for highly regulated banking.",
                    bilingualTakeaway: "You don't need to 'scale Agile frameworks'; you need to scale 'Agile Principles'. Focus on outcomes, not ceremonies.",
                    actions: ["Audit your governance gates.", "Replace 'Milestones' with 'Learning Outcomes'."],
                    linkedTool: 'culture',
                    linkedToolLabel: 'Measure Cultural Debt'
                },
                {
                    id: 'datamesh',
                    title: 'Data Mesh',
                    author: 'Zhamak Dehghani',
                    category: 'Data',
                    color: 'from-cyan-500 to-blue-600',
                    icon: 'fa-network-wired',
                    summary: "The shift from centralized data lakes (swamps) to decentralized data ownership. Treat data as a product.",
                    bilingualTakeaway: "IT shouldn't own the data; the business domain must own it. They understand the context. IT just owns the pipes.",
                    actions: ["Assign a Product Owner to a critical dataset.", "Define SLOs (Freshness/Accuracy)."],
                    linkedTool: 'datacanvas',
                    linkedToolLabel: 'Build Data Product Canvas'
                },
                {
                    id: 'dambok',
                    title: 'DAMA-DMBOK',
                    author: 'DAMA Int.',
                    category: 'Data',
                    color: 'from-slate-600 to-slate-800',
                    icon: 'fa-book-atlas',
                    summary: "The Data Management Body of Knowledge. The encyclopedia of data standards.",
                    bilingualTakeaway: "You don't read this cover-to-cover. You use it as the reference manual when defining standards for quality, lineage, and security.",
                    actions: ["Define 'Golden Source' for Customer Data.", "Map data lineage for one regulatory report."],
                    linkedTool: 'glossary',
                    linkedToolLabel: 'Check Dictionary'
                },
                {
                    id: 'infonomics',
                    title: 'Infonomics',
                    author: 'Doug Laney',
                    category: 'Data',
                    color: 'from-emerald-500 to-teal-600',
                    icon: 'fa-money-bill-trend-up',
                    summary: "Treating data as an actual asset class on the balance sheet.",
                    bilingualTakeaway: "Excellent for explaining the value of data governance to a CFO. Data isn't exhaust; it's capital.",
                    actions: ["Calculate the 'Cost of Bad Data' (rework/fines).", "Audit 'Dark Data' storage costs."],
                    linkedTool: 'shadow',
                    linkedToolLabel: 'Audit Shadow IT Costs'
                },
                {
                    id: 'hitrefresh',
                    title: 'Hit Refresh',
                    author: 'Satya Nadella',
                    category: 'Culture',
                    color: 'from-blue-600 to-blue-400',
                    icon: 'fa-arrows-rotate',
                    summary: "The story of Microsoft's turnaround. Moving from a 'Know-it-all' culture to a 'Learn-it-all' culture.",
                    bilingualTakeaway: "Culture isn't soft; it's the engine of valuation. You must kill the 'HIPPO' effect to survive.",
                    actions: ["Ask a 'stupid question' in the next board meeting.", "Reward a team for sharing a failure."],
                    linkedTool: 'culture',
                    linkedToolLabel: 'Cultural Thermometer'
                },
                {
                    id: 'fearless',
                    title: 'The Fearless Organization',
                    author: 'Amy Edmondson',
                    category: 'Culture',
                    color: 'from-red-500 to-orange-500',
                    icon: 'fa-heart-pulse',
                    summary: "The academic foundation for Psychological Safety. Why speaking up is crucial for risk management.",
                    bilingualTakeaway: "If people are afraid to report a 'Red' status, your risk dashboards are a fiction. Safety is a control mechanism.",
                    actions: ["Run a 'Blameless Post-Mortem'.", "Conduct the 'Bad News' test."],
                    linkedTool: 'silo',
                    linkedToolLabel: 'Bust a Silo'
                },
                {
                    id: 'bankingonit',
                    title: 'Banking On It',
                    author: 'Anne Boden',
                    category: 'Leadership',
                    color: 'from-teal-400 to-cyan-500',
                    icon: 'fa-mobile-screen',
                    summary: "Memoir of the founder of Starling Bank. A career banker who learned tech to build a bank from scratch.",
                    bilingualTakeaway: "The perfect example of a Bilingual Executive. She didn't outsource the core; she owned the risk and the code.",
                    actions: ["Stop hiring 'Proxy' product owners.", "Sit with a developer for one hour."],
                    linkedTool: 'compass',
                    linkedToolLabel: 'Check Leadership Balance'
                }
            ],

            // 2. THE TECH STACK
            techStack: [
                {
                    category: "The Delivery Stack (The Engine)",
                    desc: "Tools for tracking work and automating code.",
                    tools: [
                        { name: "Jira / Azure DevOps", role: "Work Tracking", insight: "Don't use it for Gantt charts. Use it for backlogs." },
                        { name: "GitHub / GitLab", role: "Code Repository", insight: "Where the IP lives. If it's not here, it doesn't exist." },
                        { name: "Jenkins / CircleCI", role: "CI/CD Pipeline", insight: "The robot that deploys the code. The 'Definition of Done' lives here." }
                    ]
                },
                {
                    category: "The Data Stack (The Fuel)",
                    desc: "Tools for storing and moving data.",
                    tools: [
                        { name: "Snowflake / Databricks", role: "Cloud Data Platform", insight: "Separates storage from compute. Essential for escaping the 'Data Swamp'." },
                        { name: "Collibra / Alation", role: "Data Catalog", insight: "The map of your data. Essential for governance." },
                        { name: "Kafka", role: "Event Streaming", insight: "Real-time data movement. The nervous system of the bank." }
                    ]
                },
                {
                    category: "The Collaboration Stack (The Glue)",
                    desc: "Tools for breaking down silos.",
                    tools: [
                        { name: "Slack / Teams", role: "Async Comms", insight: "Moves communication out of email silos." },
                        { name: "Miro / Mural", role: "Digital Whiteboard", insight: "Where remote agile collaboration happens." }
                    ]
                }
            ]
        },

        // ------------------------------------------------------------------
        // EXCEL FACTORY ESCAPE ROOM v2 (Randomized + AI Analysis)
        // ------------------------------------------------------------------
        excelEscape: {
            active: false,
            level: 0,
            hp: 100,
            score: 0,
            logs: [],
            loading: false,
            
            // Multiplayer/State
            playerName: '',
            leaderboard: [],
            isSubmitting: false,

            // New: Playstyle Tracking
            playStyle: { manual: 0, legacy: 0, modern: 0 },
            gamePath: [], // The 5 selected levels for this run
            finalAnalysis: null, // The AI Coaching Report

            // THE EXPANDED QUESTION BANK (10 Scenarios)
            allLevels: [
                {
                    id: 1,
                    name: "The Basement of Reconciliation",
                    enemy: "The VLOOKUP Hydra",
                    desc: "A 50MB spreadsheet crashes every time Finance opens it. The Regulator needs the report in 1 hour.",
                    options: [
                        { label: "Split it into 4 smaller files", risk: 40, value: 5, type: "manual" },
                        { label: "Write a VBA Macro", risk: 20, value: 20, type: "legacy" },
                        { label: "Script a Python ETL pipeline", risk: 0, value: 100, type: "modern" }
                    ]
                },
                {
                    id: 2,
                    name: "The Email Chain of Doom",
                    enemy: "The Version Control Ghost",
                    desc: "Three departments are emailing 'Final_v3_REAL.xlsx'. No one knows which file is the truth.",
                    options: [
                        { label: "Call an emergency meeting", risk: 30, value: 0, type: "manual" },
                        { label: "Put it on a Shared Drive", risk: 25, value: 15, type: "legacy" },
                        { label: "Centralize in Snowflake/Data Mesh", risk: 0, value: 120, type: "modern" }
                    ]
                },
                {
                    id: 3,
                    name: "The Boardroom Firewall",
                    enemy: "The PDF Dragon",
                    desc: "The CEO wants a live dashboard, but the data is trapped in static PDFs generated by a mainframe.",
                    options: [
                        { label: "Hire interns to type it in", risk: 50, value: 10, type: "manual" },
                        { label: "Build a Screen Scraper", risk: 30, value: 40, type: "legacy" },
                        { label: "Build an API Wrapper", risk: 10, value: 150, type: "modern" }
                    ]
                },
                {
                    id: 4,
                    name: "The Deployment Weekend",
                    enemy: "The Big Bang Release",
                    desc: "It's Friday night. You have 3,000 lines of code to deploy. The manual test script takes 48 hours.",
                    options: [
                        { label: "Order pizza and pray", risk: 80, value: 0, type: "manual" },
                        { label: "Delay launch by a month", risk: 40, value: 20, type: "legacy" },
                        { label: "Automated CI/CD Pipeline", risk: 0, value: 150, type: "modern" }
                    ]
                },
                {
                    id: 5,
                    name: "The Customer Support Flood",
                    enemy: "The Call Center Tsunami",
                    desc: "The mobile app is down. 10,000 customers are calling. Wait times are 4 hours.",
                    options: [
                        { label: "Disable the phone lines", risk: 90, value: 0, type: "manual" },
                        { label: "Hire temp agency staff", risk: 50, value: 30, type: "legacy" },
                        { label: "Deploy GenAI Chatbot Agent", risk: 10, value: 200, type: "modern" }
                    ]
                },
                {
                    id: 6,
                    name: "The Compliance Gate",
                    enemy: "The Paperwork Golem",
                    desc: "You built a great feature, but Risk requires a 40-page checklist signed by 3 executives.",
                    options: [
                        { label: "Fill out the form", risk: 20, value: 10, type: "manual" },
                        { label: "Hide the feature as 'Maintenance'", risk: 70, value: 50, type: "legacy" },
                        { label: "Code Policy into the Pipeline", risk: 0, value: 130, type: "modern" }
                    ]
                },
                {
                    id: 7,
                    name: "The Vendor Lock-in",
                    enemy: "The Oracle Monolith",
                    desc: "Your core vendor just raised prices by 40% and said the upgrade will take 2 years.",
                    options: [
                        { label: "Pay the ransom", risk: 40, value: 0, type: "manual" },
                        { label: "Sue them", risk: 60, value: 0, type: "legacy" },
                        { label: "Strangler Pattern (Peel off features)", risk: 10, value: 180, type: "modern" }
                    ]
                },
                {
                    id: 8,
                    name: "The Talent Drain",
                    enemy: "The Recruiter Raid",
                    desc: "Your best engineer just quit to join a Fintech because 'this bank moves too slow'.",
                    options: [
                        { label: "Offer them more money", risk: 30, value: 20, type: "manual" },
                        { label: "Hire a consultant to replace them", risk: 50, value: 10, type: "legacy" },
                        { label: "Fix the Developer Experience (DX)", risk: 0, value: 150, type: "modern" }
                    ]
                },
                {
                    id: 9,
                    name: "The KYC Logjam",
                    enemy: "The False Positive Flood",
                    desc: "Your AML system flagged 5,000 legit customers as terrorists. Accounts are frozen.",
                    options: [
                        { label: "Review each manually", risk: 60, value: 5, type: "manual" },
                        { label: "Turn off the rule temporarily", risk: 100, value: 0, type: "legacy" },
                        { label: "Tune AI Thresholds w/ Data", risk: 10, value: 120, type: "modern" }
                    ]
                },
                {
                    id: 10,
                    name: "The Innovation Lab",
                    enemy: "The Theatre Trap",
                    desc: "The Lab built a cool VR app, but it can't connect to the core bank ledger.",
                    options: [
                        { label: "Launch it as a standalone toy", risk: 20, value: 10, type: "manual" },
                        { label: "Build a manual CSV export process", risk: 40, value: 20, type: "legacy" },
                        { label: "Build a Core API Gateway", risk: 10, value: 200, type: "modern" }
                    ]
                }
            ],

            start() {
                if (!this.playerName.trim()) {
                    const guestId = Math.floor(Math.random() * 1000);
                    this.playerName = `Agent_${guestId}`;
                }
                
                // 1. Reset Stats
                this.hp = 100;
                this.score = 0;
                this.playStyle = { manual: 0, legacy: 0, modern: 0 };
                this.finalAnalysis = null;
                this.isSubmitting = false;

                // 2. Randomize Levels (Pick 5)
                const shuffled = [...this.allLevels].sort(() => 0.5 - Math.random());
                this.gamePath = shuffled.slice(0, 5);
                
                this.active = true;
                this.level = 1;
                this.logs = [`SYSTEM: Welcome, ${this.playerName}. 5 Levels Generated. Good luck.`];
            },

            async makeMove(optionIndex) {
                if (this.loading) return;
                
                const currentLvl = this.gamePath[this.level - 1];
                const choice = currentLvl.options[optionIndex];
                
                // 1. Update Playstyle Tracking
                this.playStyle[choice.type]++;

                // 2. Calculate Outcome
                let damageTaken = 0;
                let pointsGained = choice.value;

                if (choice.type === 'manual') damageTaken = Math.floor(Math.random() * 30) + 20;
                if (choice.type === 'legacy') damageTaken = Math.floor(Math.random() * 15) + 5;
                if (choice.type === 'modern') damageTaken = 0;

                this.hp -= damageTaken;
                this.score += pointsGained;
                this.loading = true;

                // 3. AI Narrator (Context aware)
                const prompt = `
                    ACT AS: Corporate Dungeon Master.
                    SCENARIO: ${currentLvl.desc}
                    ACTION: Player used "${choice.label}" (${choice.type}).
                    RESULT: ${damageTaken > 0 ? 'Failure/Pain' : 'Success/Flow'}.
                    TASK: Write 1 funny sentence describing the outcome. Use banking/tech humor.
                `;

                try {
                    let resultText = await this.askSecureAI(prompt, "Game Turn");
                    resultText = resultText.replace(/"/g, ''); 
                    this.logs.unshift(`L${this.level}: ${resultText} (${choice.type === 'modern' ? '+' + pointsGained + ' PTS' : '-' + damageTaken + ' HP'})`);
                } catch(e) {
                    this.logs.unshift("System Lag. Move executed.");
                }

                this.loading = false;

                // 4. Progress Logic
                if (this.hp <= 0) {
                    this.level = 7; // Game Over (Code 7)
                } else if (this.level < 5) {
                    this.level++; 
                } else {
                    this.level = 6; // Victory (Code 6)
                    this.generateAnalysis(); // Generate the AI Report
                    this.saveScore(); 
                }
            },

            // --- AI ANALYSIS AT THE END ---
            async generateAnalysis() {
                this.loading = true;
                const style = this.playStyle;
                
                const prompt = `
                    ACT AS: An Executive Agile Coach.
                    TASK: Analyze this player's leadership style based on their game choices.
                    
                    DATA:
                    - Modern (Automation) Choices: ${style.modern}/5
                    - Legacy (Band-aid) Choices: ${style.legacy}/5
                    - Manual (Brute Force) Choices: ${style.manual}/5
                    - Final Score: ${this.score}
                    - HP Remaining: ${this.hp}
                    
                    OUTPUT JSON ONLY:
                    {
                        "archetype": "string (Creative Name, e.g. 'The Future Architect' or 'The Safe Pair of Hands')",
                        "analysis": "string (2 sentences on their mindset)",
                        "tip": "string (1 specific recommendation for their real job)"
                    }
                `;

                try {
                    let raw = await this.askSecureAI(prompt, "Game Analysis");
                    raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.finalAnalysis = JSON.parse(raw);
                } catch(e) {
                    this.finalAnalysis = { archetype: "The Survivor", analysis: "You survived the bank.", tip: "Try automating more." };
                } finally {
                    this.loading = false;
                }
            },

            // --- LEADERBOARD LOGIC (Same as before) ---
            async saveScore() {
                if (this.isSubmitting) return;
                this.isSubmitting = true;
                try {
                    const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
                    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
                    const client = window.supabase.createClient(supabaseUrl, supabaseKey);

                    await client.from('game_leaderboard').insert({
                        player_name: this.playerName,
                        score: this.score,
                        hp_remaining: this.hp
                    });
                    this.fetchLeaderboard(client);
                } catch (e) { console.error(e); }
            },

            async fetchLeaderboard(clientOverride) {
                const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
                const client = clientOverride || window.supabase.createClient(supabaseUrl, supabaseKey);

                const { data, error } = await client
                    .from('game_leaderboard')
                    .select('*')
                    .order('score', { ascending: false })
                    .limit(10);

                if (data) this.leaderboard = data;
            },

            reset() {
                this.active = false;
                this.level = 0;
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
