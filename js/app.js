document.addEventListener('alpine:init', () => {
    Alpine.data('toolkit', () => ({
        // ------------------------------------------------------------------
        // INITIALIZATION
        // ------------------------------------------------------------------
        init() {
            this.isMobile = window.innerWidth < 768;
            window.addEventListener('resize', () => { this.isMobile = window.innerWidth < 768; });

            // Initialize Supabase (Only for Teams/Leaderboards, NO AI)
            if (window.supabase) {
                const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
                this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
                if (this.teamManager) this.teamManager.supabase = this.supabase; 
            }

            // PWA Logic
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
            });
            if (this.isMobile && !isPWA) {
                const dismissed = localStorage.getItem('pwaPromptDismissed');
                if (!dismissed) {
                    setTimeout(() => { this.showPwaPrompt = true; }, 2000);
                }
            }

            // Initialize Modules
            if (this.culturalMonitor) this.culturalMonitor.init(); 
            if (this.hippoTracker) this.hippoTracker.init();
            if (this.dailyFeed) this.dailyFeed.init();
            if (this.shadowAudit) this.shadowAudit.init();
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
        aiCoachResponse: null, 
        isAnalyzingTalent: false,

        // ------------------------------------------------------------------
        // CULTURAL DEBT THERMOMETER (FIXED)
        // ------------------------------------------------------------------
        culturalMonitor: {
            history: [],
            isCheckinOpen: false,
            currentQuestions: [],
            answers: { q1: null, q2: null, sentiment: 50 }, 
            chartInstance: null,

            questionBank: [
                { id: 'safety_1', category: 'Psychological Safety', text: "Did you feel safe sharing 'bad news' or a delay this week?", type: 'boolean', badAnswer: 'no' },
                { id: 'safety_2', category: 'Psychological Safety', text: "Did leadership blame a person or the process for a failure?", type: 'boolean', badAnswer: 'person' },
                { id: 'silo_1', category: 'Silo Wars', text: "Did you have to negotiate with another department just to do your job?", type: 'boolean', badAnswer: 'yes' },
                { id: 'silo_2', category: 'Silo Wars', text: "Did data flow freely between squads, or was it hoarded?", type: 'boolean', badAnswer: 'hoarded' },
                { id: 'speed_1', category: 'Fear of Failure', text: "Did a 'Green Light' report hide a real 'Red' risk?", type: 'boolean', badAnswer: 'yes' },
                { id: 'speed_2', category: 'Fear of Failure', text: "Did we ship value to a customer, or just documentation?", type: 'boolean', badAnswer: 'documentation' }
            ],

            init() {
                try {
                    const saved = localStorage.getItem('bilingual_culture_history');
                    if (saved) this.history = JSON.parse(saved);
                } catch (e) { console.error("Load Error", e); }
            },
            
            startCheckin() {
                const shuffled = this.questionBank.sort(() => 0.5 - Math.random());
                this.currentQuestions = shuffled.slice(0, 2);
                this.answers = { q1: null, q2: null, sentiment: 50 }; 
                this.isCheckinOpen = true;
            },

            submitCheckin() {
                let debt = 0;
                let tags = [];

                this.currentQuestions.forEach((q, idx) => {
                    const ans = idx === 0 ? this.answers.q1 : this.answers.q2;
                    if (ans === q.badAnswer) {
                        debt += 30; 
                        tags.push(q.category);
                    }
                });

                // Invert sentiment (100 is good, we want Debt Score where 100 is bad)
                debt += (100 - parseInt(this.answers.sentiment)) * 0.4;

                const entry = {
                    date: new Date().toLocaleDateString(),
                    score: Math.min(100, Math.round(debt)),
                    tags: tags,
                    timestamp: Date.now()
                };

                this.history.push(entry);
                if (this.history.length > 12) this.history.shift(); 
                
                localStorage.setItem('bilingual_culture_history', JSON.stringify(this.history));
                
                this.isCheckinOpen = false;
                this.renderChart();
            },

            get currentScore() {
                if (this.history.length === 0) return 0;
                return this.history[this.history.length - 1].score;
            },

            get thermometerColor() {
                const s = this.currentScore;
                if (s < 30) return 'bg-primary shadow-glow'; 
                if (s < 60) return 'bg-warn shadow-glow';    
                return 'bg-risk shadow-glow animate-pulse'; 
            },

            reset() {
                if(confirm("Clear history?")) {
                    this.history = [];
                    localStorage.removeItem('bilingual_culture_history');
                    if(this.chartInstance) this.chartInstance.destroy();
                }
            },

            renderChart() {
                setTimeout(() => {
                    const ctx = document.getElementById('debtChart');
                    if (!ctx) return;
                    if (this.chartInstance) this.chartInstance.destroy();

                    const labels = this.history.map(h => h.date.substring(0,5)); 
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
                            layout: { padding: { bottom: 10, left: 5 } },
                            scales: { 
                                y: { 
                                    min: 0, max: 100, 
                                    grid: { color: '#334155', drawBorder: false },
                                    ticks: { color: '#94a3b8', padding: 8 }
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
        // OFFLINE CHATBOT (Dictionary Search)
        // ------------------------------------------------------------------
        async sendMessage() {
            if (!this.chatInput.trim()) return;
            
            // 1. Prepare UI
            const userText = this.chatInput;
            this.chatMessages.push({ role: 'user', text: userText });
            this.chatInput = '';
            this.isTyping = true;
            this.scrollToBottom();

            // 2. Simulate Delay
            await new Promise(r => setTimeout(r, 800));

            // 3. Simple Keyword Logic (Offline AI)
            const input = userText.toLowerCase();
            let reply = "I am operating in Offline Mode. I can define terms found in the Glossary.";

            // Search glossary
            const foundTerm = this.glossaryData.find(t => input.includes(t.term.toLowerCase()));
            const foundDict = this.dictionary.find(t => input.includes(t.banker.toLowerCase()) || input.includes(t.tech.toLowerCase()));

            if (foundTerm) {
                reply = `**${foundTerm.term}:** ${foundTerm.def}`;
            } else if (foundDict) {
                reply = `**${foundDict.tech}** roughly translates to **"${foundDict.banker}"** for a business audience.\n\n*Impact:* ${foundDict.translation}`;
            } else if (input.includes('hello') || input.includes('hi')) {
                reply = "Hello. I am the Bilingual Assistant. Ask me to translate a tech term.";
            } else {
                reply = "I couldn't find that specific term in my local database. Try searching for 'API', 'Technical Debt', or 'Data Mesh'.";
            }

            this.isTyping = false;
            this.chatMessages.push({ role: 'bot', text: reply });
            this.scrollToBottom();
        },

        scrollToBottom() { 
            this.$nextTick(() => { 
                const c = document.getElementById('chat-messages-container'); 
                if (c) c.scrollTop = c.scrollHeight; 
            }); 
        },

        // ------------------------------------------------------------------
        // WHAT-IF SCENARIO (Logic Based, No AI)
        // ------------------------------------------------------------------
        whatIf: {
            input: '',
            loading: false,
            result: null,
            examples: ["Outsource Core", "Delay App", "AI Automation"],

            setInput(text) { this.input = text; },

            async analyze() {
                if (!this.input.trim()) return;
                this.loading = true;
                this.result = null;

                await new Promise(r => setTimeout(r, 1500)); // Fake processing

                const lower = this.input.toLowerCase();
                let verdict = "YELLOW LIGHT";
                let analysis = "Proceed with caution. This change impacts multiple silos.";

                if (lower.includes("outsource") || lower.includes("vendor")) {
                    verdict = "RED LIGHT";
                    analysis = "Outsourcing the core creates a dependency risk. You lose control of the roadmap.";
                } else if (lower.includes("ai") || lower.includes("automation")) {
                    verdict = "GREEN LIGHT";
                    analysis = "High potential for OpEx reduction, provided you have clean data first.";
                } else if (lower.includes("cloud")) {
                    verdict = "GREEN LIGHT";
                    analysis = "Essential for scale. Ensure FinOps controls are in place to prevent bill shock.";
                }

                this.result = `
                    <h3>EXECUTIVE VERDICT: ${verdict}</h3>
                    <p><strong>Analysis:</strong> ${analysis}</p>
                    <p><strong>Financial Impact:</strong> Likely high upfront CapEx with long-term OpEx benefits.</p>
                    <p><strong>Recommendation:</strong> Launch a 90-day pilot in the Sandbox before full commitment.</p>
                `;
                this.loading = false;
            },
        },

        // ------------------------------------------------------------------
        // RISK SIM (Deterministic Logic)
        // ------------------------------------------------------------------
        riskSim: {
            active: false,
            loading: false,
            input: '',
            messages: [],
            scores: { safety: 50, speed: 50 }, 
            turn: 0,
            maxTurns: 5,

            start() {
                this.active = true;
                this.messages = [];
                this.scores = { safety: 50, speed: 50 };
                this.turn = 0;
                this.addMessage('bot', "I'm Marcus, the CRO. I hear you want to launch a new feature without a 6-month review. Why should I allow this risk?");
            },

            addMessage(role, text) {
                this.messages.push({ role, text, timestamp: new Date().toLocaleTimeString() });
            },

            async sendReply() {
                if (!this.input.trim()) return;
                this.addMessage('user', this.input);
                const userInput = this.input.toLowerCase();
                this.input = '';
                this.loading = true;
                this.turn++;

                await new Promise(r => setTimeout(r, 1000));

                let reply = "";
                // Simple keyword logic
                if (userInput.includes("sandbox") || userInput.includes("limit") || userInput.includes("pilot")) {
                    reply = "A sandbox with limits? That sounds reasonable. It contains the blast radius.";
                    this.scores.safety += 10;
                    this.scores.speed += 5;
                } else if (userInput.includes("fast") || userInput.includes("now") || userInput.includes("revenue")) {
                    reply = "You are moving too fast. We are a bank, not a startup. Denied.";
                    this.scores.safety -= 15;
                    this.scores.speed += 5;
                } else if (userInput.includes("data") || userInput.includes("automated")) {
                    reply = "Automated controls are good, provided they are audited.";
                    this.scores.safety += 5;
                    this.scores.speed += 10;
                } else {
                    reply = "I'm not convinced. Give me a concrete control mechanism.";
                    this.scores.safety -= 5;
                }

                this.addMessage('bot', reply);
                this.loading = false;

                if (this.turn >= this.maxTurns) {
                    this.addMessage('system', "MEETING ADJOURNED.");
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
        // OTHER CALCULATORS (Pure Math - No AI Needed)
        // ------------------------------------------------------------------
        
        // --- LIGHTHOUSE ROI ---
        lighthouseROI: {
            inputs: { name: '', duration_weeks: 12, squad_cost_per_week: 15000, software_cost: 25000, revenue_generated: 0, cost_avoided: 150000, old_cycle_time: 20, new_cycle_time: 2, cultural_score: 8 },
            results: null,
            aiNarrative: null,
            loading: false,

            calculate() {
                if (!this.inputs.name) return alert("Enter Project Name");
                const i = this.inputs;
                const investment = (i.duration_weeks * i.squad_cost_per_week) + parseInt(i.software_cost);
                const benefits = parseInt(i.revenue_generated) + parseInt(i.cost_avoided);
                const net = benefits - investment;
                const roi = Math.round((net / investment) * 100);
                const speed = (i.old_cycle_time / i.new_cycle_time).toFixed(1);

                this.results = { totalInvestment: investment, totalValue: benefits, netProfit: net, roiPercent: roi, speedFactor: speed };
                
                // Static Narrative Generation
                this.loading = true;
                setTimeout(() => {
                    this.aiNarrative = {
                        headline: `Project ${i.name} Generated ${roi}% ROI`,
                        strategic_verdict: `By moving ${speed}x faster, we reduce market risk significantly.`,
                        defense: "The cost of delay is higher than the cost of this pilot."
                    };
                    this.loading = false;
                }, 500);
            },
            generatePDF() { alert("Please install PDF library to use this feature."); }
        },

        // --- LEGACY EXPLAINER (Demo Mode) ---
        legacyExplainer: {
            input: "",
            loading: false,
            result: null,
            async explain() {
                if(!this.input) return alert("Paste code first.");
                this.loading = true;
                await new Promise(r => setTimeout(r, 1500));
                this.result = {
                    executive_summary: "This code checks if a customer has enough credit. If yes, it approves; if no, it rejects.",
                    business_rules: ["Check Credit Limit", "Deduct Order Amount", "Reject if insufficient funds"],
                    risk_assessment: "LOW",
                    risk_reason: "Standard logic, but ensure 'Credit Limit' variable is sourced correctly."
                };
                this.loading = false;
            }
        },

        // --- HALLUCINATION DETECTOR (Keyword Matcher) ---
        hallucinationDetector: {
            policy: '', aiOutput: '', loading: false, result: null,
            loadDemo() { this.policy = "No refunds allowed."; this.aiOutput = "You can get a full refund."; },
            async scan() {
                if(!this.policy || !this.aiOutput) return alert("Missing input.");
                this.loading = true;
                await new Promise(r => setTimeout(r, 1000));
                
                // Simple "Does it contradict?" logic (Simulated)
                const policyLower = this.policy.toLowerCase();
                const aiLower = this.aiOutput.toLowerCase();
                
                // Detect negation mismatch (very basic logic for demo)
                let score = 85;
                let issues = [];
                
                if (policyLower.includes("no refund") && aiLower.includes("refund")) {
                    score = 20;
                    issues.push("AI offered refund; Policy forbids it.");
                }

                this.result = {
                    score: score,
                    verdict: score > 50 ? "SAFE" : "FAIL",
                    reason: score > 50 ? "Output generally aligns with policy keywords." : "Direct contradiction detected.",
                    hallucinations: issues
                };
                this.loading = false;
            }
        },

        // --- SHADOW IT (Static Database) ---
        shadowAudit: {
            inputs: { name: '', cost: 50, users: 5, hasPII: false, isCritical: false },
            aiAnalysis: null, loading: false, inventory: [],
            init() {
                const saved = localStorage.getItem('bilingual_shadow_inventory');
                if (saved) this.inventory = JSON.parse(saved);
            },
            async scanTool() {
                if(!this.inputs.name) return alert("Enter name.");
                this.loading = true;
                await new Promise(r => setTimeout(r, 1000));
                
                // Static Categorization
                const name = this.inputs.name.toLowerCase();
                let cat = "SaaS Productivity";
                if(name.includes("chat") || name.includes("gpt")) cat = "Generative AI";
                if(name.includes("aws") || name.includes("azure")) cat = "Infrastructure";

                this.aiAnalysis = {
                    category: cat,
                    risks: ["Data Leakage", "Unmanaged Access"],
                    justification: "Improves velocity but needs governance."
                };
                this.loading = false;
            },
            get analysis() {
                const i = this.inputs;
                const annualLicense = i.cost * i.users * 12;
                let oneTimeTax = i.hasPII ? 7500 : 5000;
                let recurringTax = annualLicense * (i.hasPII ? 0.2 : 0.1);
                return { annualLicense, integrationTax: oneTimeTax, recurringOverhead: recurringTax, trueCost: annualLicense + oneTimeTax + recurringTax, riskScore: (i.hasPII?7:2)+(i.isCritical?3:0) };
            },
            addTool() { this.inventory.push({ id: Date.now(), ...this.inputs, ai: this.aiAnalysis, stats: this.analysis }); localStorage.setItem('bilingual_shadow_inventory', JSON.stringify(this.inventory)); this.inputs.name=''; this.aiAnalysis=null; },
            removeTool(id) { this.inventory = this.inventory.filter(t => t.id !== id); localStorage.setItem('bilingual_shadow_inventory', JSON.stringify(this.inventory)); },
            generateAgreement() { alert("Memo generation simulated (Check clipboard logic in source)."); }
        },

        // --- CONWAY SIM (Logic) ---
        conwaySim: {
            departments: [], architecture: [], loading: false, aiAnalysis: null,
            loadScenario(type) {
                if(type === 'silo') this.departments = [{name:"Card Dept", type:'silo', icon:'fa-credit-card', color:'border-red-500'}, {name:"Risk", type:'gatekeeper', icon:'fa-gavel', color:'border-slate-500'}];
                else this.departments = [{name:"Payment Squad", type:'squad', icon:'fa-rocket', color:'border-green-500'}, {name:"Platform", type:'enabler', icon:'fa-server', color:'border-blue-500'}];
                this.generateArchitecture();
            },
            generateArchitecture() {
                this.architecture = this.departments.map(d => ({
                    name: d.type === 'silo' ? d.name + " Monolith" : d.name + " API",
                    desc: d.type === 'silo' ? "No API Access" : "Decoupled Service",
                    style: d.type === 'silo' ? "border-dashed opacity-50" : "border-solid border-green-500",
                    icon: d.type === 'silo' ? "fa-database" : "fa-cubes"
                }));
            },
            addDept() { this.departments.push({name: "New Dept", type: 'silo', icon: 'fa-building', color: 'border-slate-500'}); this.generateArchitecture(); },
            removeDept(idx) { this.departments.splice(idx, 1); this.generateArchitecture(); },
            analyze() {
                this.loading = true;
                setTimeout(() => {
                    const hasSilos = this.departments.some(d => d.type === 'silo');
                    this.aiAnalysis = {
                        verdict: hasSilos ? "Distributed Monolith" : "Agile Mesh",
                        pain_point: hasSilos ? "High coordination cost." : "Low friction.",
                        technical_debt: hasSilos ? "High" : "Low",
                        fix: hasSilos ? "Adopt Team Topologies." : "Keep optimizing."
                    };
                    this.loading = false;
                }, 1000);
            }
        },

        // ------------------------------------------------------------------
        // STANDARD MODULES (No Changes Needed)
        // ------------------------------------------------------------------
        rolePlay: {
            active: false, loading: false, messages: [], activePersona: null, currentOptions: [], score: 50,
            personas: [
                { id: 'risk', name: "Marcus", role: "CRO", avatar: "fa-user-shield", color: "text-red-400", context: "Cloud Migration", opening_line: "Why trust the cloud?", options: [
                    { label: "Tech Arg", text: "AWS is 99% uptime.", score_impact: -20, reply: "I don't care about uptime, I care about leaks.", coach_tip: "Too geeky." },
                    { label: "Bilingual Arg", text: "It improves security patching speed.", score_impact: +25, reply: "Good point. Speed is security.", coach_tip: "Perfect." }
                ]}
            ],
            start(index) { this.activePersona = this.personas[0]; this.active = true; this.score = 50; this.messages = []; this.currentOptions = this.activePersona.options; this.addMessage('bot', this.activePersona.opening_line); },
            stop() { this.active = false; },
            addMessage(role, text, coaching) { this.messages.push({ role, text, coaching }); },
            makeChoice(opt) {
                this.addMessage('user', opt.text);
                this.score += opt.score_impact;
                setTimeout(() => { this.addMessage('bot', opt.reply, { tip: opt.coach_tip, impact: opt.score_impact }); }, 500);
            }
        },

        // ------------------------------------------------------------------
        // HELPER FUNCTIONS
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
                alert("To install on iPhone:\n1. Tap the 'Share' button\n2. Tap 'Add to Home Screen'");
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

        copyToClipboard(text, type) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => alert(`${type} copied!`));
            } else {
                alert("Copy manually: " + text);
            }
        },

        copyChallengeLink() {
            const scores = this.assessmentData.flatMap(s => s.questions.map(q => q.score));
            const payload = btoa(JSON.stringify({ scores, title: "Executive Peer" }));
            const url = `${window.location.origin}${window.location.pathname}?challenger=${payload}`;
            this.copyToClipboard(url, "Challenge Link");
        },

        openBook(book) { this.bookshelf.activeBook = book; },
        closeBook() { this.bookshelf.activeBook = null; },
        
        // Dummy function for book AI since we stripped it
        askAIAboutBook(title) { 
            this.bookshelf.activeBook = null;
            this.isChatOpen = true;
            this.chatInput = `Tell me about ${title}`;
            this.sendMessage();
        },

        // ------------------------------------------------------------------
        // ASSESSMENT LOGIC
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
        
        finishAssessment() { 
            this.assessmentSubmitted = true; 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        },
        
        resetAssessment() { 
            this.assessmentSubmitted = false; 
            this.assessmentData.forEach(s => s.questions.forEach(q => q.score = 3)); 
        },

        async submitAndBenchmark() {
            this.benchmarkLoading = true;
            await new Promise(r => setTimeout(r, 1000)); // Fake network delay
            this.benchmarkLoading = false;
            const score = this.calculateScore.total;
            // Simulated Percentile
            const percentile = score > 65 ? "Top 10%" : (score > 50 ? "Top 40%" : "Bottom 50%");
            this.percentileResult = { rank: percentile, msg: "Benchmarked against offline dataset." };
            this.totalBenchmarks = 1250;
        },

        // ------------------------------------------------------------------
        // SIMPLE GETTERS
        // ------------------------------------------------------------------
        getMatrixResult() {
            const { x, y } = this.matrixCoords;
            if (y > 60 && x < 40) return { strategy: "BUILD", desc: "Critical IP. High value, low complexity." };
            if (y > 60 && x >= 40) return { strategy: "BUY", desc: "High value but hard to build." };
            if (y <= 60 && x >= 60) return { strategy: "OUTSOURCE", desc: "Non-core commodity." };
            return { strategy: "DEPRIORITIZE", desc: "Low value." };
        },
        
        getCompassResult() {
            const { x, y } = this.compassCoords;
            if (y > 50 && x > 50) return { title: "INNOVATION LEADER (NE)", desc: "Fast growth, but check your safety brakes." };
            if (y <= 50 && x <= 50) return { title: "TRADITIONAL BANKER (SW)", desc: "Safe and cheap, but you are slowly dying." };
            if (y > 50 && x <= 50) return { title: "RISK TAKER (NW)", desc: "High value but high control." };
            return { title: "DIGITAL FACTORY (SE)", desc: "Fast execution, low value." };
        },
        
        getLighthouseStatus() { 
            const c = this.lighthouseData.filter(i=>i.checked).length; 
            if(c===10) return {title:"GREEN LIGHT", desc:"Launch.", text:"text-primary", border:"border-primary bg-primary/10"}; 
            if(c>=8) return {title:"AMBER LIGHT", desc:"Proceed with caution.", text:"text-warn", border:"border-warn bg-warn/10"}; 
            return {title:"RED LIGHT", desc:"STOP.", text:"text-risk", border:"border-risk bg-risk/10"}; 
        },

        // ------------------------------------------------------------------
        // DATA ARRAYS
        // ------------------------------------------------------------------
        dictionary: [ 
            { banker: "Technical Debt", tech: "Legacy Refactoring", translation: "Interest on past shortcuts." }, 
            { banker: "Op-Ex Efficiency", tech: "CI/CD Pipeline", translation: "Automated work that replaces human error." }, 
            { banker: "Market Responsiveness", tech: "Microservices", translation: "Breaking the bank into Legos." } 
        ],
        get filteredDictionary() { 
            const q = this.searchQuery.toLowerCase(); 
            return this.dictionary.filter(i => i.banker.toLowerCase().includes(q) || i.tech.toLowerCase().includes(q)); 
        },
        
        lighthouseData: [
            {category:"Value",text:"Customer Facing?"}, {category:"Value",text:"Solving Pain?"}, {category:"Value",text:"Unarguable Metric?"},
            {category:"Feasibility",text:"Decoupled?"}, {category:"Feasibility",text:"Anti-Scope Defined?"}, {category:"Feasibility",text:"MVP in 90 Days?"},
            {category:"Ecosystem",text:"Two-Pizza Team?"}, {category:"Ecosystem",text:"Sandbox Waiver?"}, {category:"Ecosystem",text:"Zero Dependencies?"}, {category:"Ecosystem",text:"Air Cover?"}
        ].map(i=>({...i, checked:false})),
        
        lighthouseCount() { return this.lighthouseData.filter(i=>i.checked).length; },

        repairKitData: [
            {symptom:"The Feature Factory", diagnosis:"High velocity, no value.", prescription:["Stop celebrating feature counts.", "Audit value."]}, 
            {symptom:"The Cloud Bill Shock", diagnosis:"Lift and Shift strategy.", prescription:["Implement FinOps.", "Auto-shutdown."]}, 
            {symptom:"The Agile Silo", diagnosis:"Optimized coding but ignored governance.", prescription:["Embed Compliance in squad."]}
        ],
        
        boardRisks: [
            {title:"1. Strategic Risk", subtitle:"The Dumb Pipe", lie:"'Our app has 4.5 stars.'", truth:"Retaining customers but losing value.", question:"Show me Share of Wallet."}, 
            {title:"2. Regulatory Risk", subtitle:"The Data Swamp", lie:"'Data is centralized.'", truth:"We are drowning.", question:"Generate a liquidity report in 10 minutes."}, 
            {title:"3. Talent Risk", subtitle:"The Missing Bench", lie:"'Hiring top talent.'", truth:"Hiring mercenaries.", question:"% of budget spent on vendors?"}
        ],

        reportingData: [
            { metric: "Velocity", financial: "Time-to-Revenue", script: "We reduced 'Time-to-Revenue' from 6 months to 2 weeks." },
            { metric: "Cycle Time", financial: "Cost of Delay", script: "We avoided $2M 'Cost of Delay'." }
        ],

        glossaryData: [
            {term:"Agentic AI",def:"AI that takes action (moves funds)."}, 
            {term:"API",def:"Digital glue allowing systems to talk."}, 
            {term:"Data Mesh",def:"Decentralized ownership."}, 
            {term:"FinOps",def:"Financial accountability for Cloud."} 
        ],
        get filteredGlossary() { 
            const q = this.glossarySearch.toLowerCase(); 
            return !q ? this.glossaryData : this.glossaryData.filter(i=>i.term.toLowerCase().includes(q)); 
        },

        // ------------------------------------------------------------------
        // LIGHTHOUSE BUILDER (Fixed Syntax)
        // ------------------------------------------------------------------
        lighthouseBuilder: {
            step: 1,
            form: { name: '', problem: '', solution: '', po: '', tech: '', risk_cap: '', anti_scope: '', success_metric: '' },
            nextStep() { if (this.validateStep()) this.step++; },
            prevStep() { this.step--; },
            validateStep() {
                const f = this.form;
                if (this.step === 1 && (!f.name || !f.problem)) { alert("Define the problem."); return false; }
                return true;
            },
            generateCharter() { alert("Charter PDF generated (simulated)."); }
        },

        // ------------------------------------------------------------------
        // TALENT CHARTS
        // ------------------------------------------------------------------
        get talentMaturityScore() {
            const total = this.talentSkills.reduce((acc, curr) => acc + curr.val, 0);
            return (total / this.talentSkills.length).toFixed(1); 
        },
        analyzeGap() {
            this.isAnalyzingTalent = true;
            setTimeout(() => {
                this.aiCoachResponse = "<strong>Coach's Tip:</strong> Your 'Tech Fluency' is lagging. Spend 1 hour with a Developer this week.";
                this.isAnalyzingTalent = false;
            }, 1000);
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
                            label: 'Capability',
                            data: this.talentSkills.map(s => s.val), 
                            backgroundColor: 'rgba(244, 114, 182, 0.2)', 
                            borderColor: '#f472b6', 
                            borderWidth: 2
                        }] 
                    },
                    options: { scales: { r: { min: 0, max: 5, ticks: { display: false } } } }
                });
            });
        },

        // ------------------------------------------------------------------
        // MODULE: CASE STUDY
        // ------------------------------------------------------------------
        caseStudy: {
            active: false, step: 0, gameOver: false, finalMessage: "", metrics: { politicalCapital: 50, velocity: 10, risk: 50 }, history: [],
            scenarios: [
                { title: "The $30M Zombie", context: "Project Olympus is late.", question: "Kill it or Fix it?", choices: [ {text:"Fix it", impact:{politicalCapital:-20}}, {text:"Kill it", impact:{politicalCapital:-10}} ] },
                { title: "The Risk Wall", context: "Risk blocks your pilot.", question: "Escalate or Demo?", choices: [ {text:"Escalate", impact:{politicalCapital:-30}}, {text:"Demo", impact:{politicalCapital:+20}} ] }
            ],
            start() { this.active = true; this.step = 0; this.gameOver = false; this.metrics = { politicalCapital: 50, velocity: 20, risk: 50 }; },
            makeChoice(idx) {
                const choice = this.scenarios[this.step].choices[idx];
                this.metrics.politicalCapital += choice.impact.politicalCapital;
                if (this.step < this.scenarios.length - 1) this.step++; else { this.gameOver = true; this.finalMessage = "Sim Complete."; }
            }
        },

        // ------------------------------------------------------------------
        // MODULE: QUIZ
        // ------------------------------------------------------------------
        quiz: {
            active: false, finished: false, currentQuestion: 0, score: 0, feedback: null,
            questions: [ { term: "Technical Debt", options: [ {text:"Money owed", correct:false}, {text:"Future rework cost", correct:true} ] }, { term: "API", options: [ {text:"Universal Adapter", correct:true}, {text:"Database", correct:false} ] } ],
            start() { this.active = true; this.finished = false; this.currentQuestion = 0; this.score = 0; },
            submitAnswer(isCorrect) {
                if(isCorrect) this.score++;
                if(this.currentQuestion < this.questions.length-1) this.currentQuestion++; else this.finished = true;
            }
        },

        // ------------------------------------------------------------------
        // MODULE: EXCEL CALC
        // ------------------------------------------------------------------
        excelCalc: {
            inputs: { steps: 50, frequency: 12, salary: 75, criticality: 2 }, result: null,
            calculate() {
                const cost = this.inputs.steps * this.inputs.frequency * 5; // Simplified math
                this.result = { annualCost: cost.toLocaleString(), errorProb: 80, riskExposure: "$1.5M", score: 90, message: "High Risk." };
            }
        },

        // ------------------------------------------------------------------
        // MODULE: STRANGLER SIM
        // ------------------------------------------------------------------
        stranglerSim: {
            step: 0, traffic: { legacy: 100, modern: 0 }, metrics: { cost: 0, risk: 10, velocity: 10 },
            phases: [ { title: "Monolith", desc: "Start", impact: {cost:0} }, { title: "Proxy", desc: "ACL", impact: {cost:50} } ],
            nextPhase() { if(this.step < 1) this.step++; },
            reset() { this.step = 0; },
            get currentPhaseData() { return this.phases[this.step] || { title: "Done", desc: "Complete" }; },
            get connectionColor() { return 'border-slate-600'; }
        },

        // ------------------------------------------------------------------
        // MODULE: HIPPO TRACKER
        // ------------------------------------------------------------------
        hippoTracker: {
            incidents: [], form: { topic: '', data_evidence: '', hippo_opinion: '' },
            init() { const saved = localStorage.getItem('bilingual_hippo'); if(saved) this.incidents = JSON.parse(saved); },
            logIncident() { this.incidents.push({ ...this.form, id: Date.now() }); localStorage.setItem('bilingual_hippo', JSON.stringify(this.incidents)); },
            get hippoScore() { return this.incidents.length * 10; },
            get status() { return { label: "Tracking", color: "text-primary" }; },
            get intervention() { return "Keep data handy."; }
        },

        // ------------------------------------------------------------------
        // MODULE: FUTURE BANK
        // ------------------------------------------------------------------
        futureBank: {
            activeScenario: null, year: 2026, isPlaying: false,
            scenarios: [{ id: 'ai', title: 'AI Bank', desc: 'Automation', evolution: { 2026: { profit: "$1B" }, 2030: { profit: "$5B" } } }],
            selectScenario(id) { this.activeScenario = this.scenarios[0]; this.playSimulation(); },
            playSimulation() { this.isPlaying = true; setTimeout(() => { this.year = 2030; this.isPlaying = false; }, 2000); },
            get currentState() { return this.activeScenario?.evolution[this.year] || {}; }
        },

        // ------------------------------------------------------------------
        // MODULE: KPI DESIGNER
        // ------------------------------------------------------------------
        kpiDesigner: {
            input: '', loading: false, result: null,
            generate() {
                if(!this.input) return;
                this.loading = true;
                setTimeout(() => {
                    this.result = { outcome: "Increase Customer Retention", leading: "Daily Logins", lagging: "Churn Rate", explanation: "Simulated Output" };
                    this.loading = false;
                }, 1000);
            }
        },

        // ------------------------------------------------------------------
        // MODULE: SQUAD BUILDER
        // ------------------------------------------------------------------
        squadBuilder: {
            catalog: [{id:'po', title:'Product Owner', icon:'fa-user'}, {id:'dev', title:'Dev', icon:'fa-code'}],
            roster: [],
            addRole(r) { this.roster.push({...r, uid: Date.now()}); },
            removeRole(uid) { this.roster = this.roster.filter(r => r.uid !== uid); },
            reset() { this.roster = []; },
            get metrics() { return { velocity: 50, translation: 50, safety: 50, status: "OK", color: "text-primary" }; },
            get gaps() { return this.roster.length < 2 ? ["Add more people"] : ["Ready"]; }
        },

        // ------------------------------------------------------------------
        // MODULE: API SANDBOX
        // ------------------------------------------------------------------
        apiSandbox: {
            pipeline: [], isRunning: false, result: null,
            catalog: [{id:'legacy', label:'Legacy', latency:2000}, {id:'api', label:'API', latency:100}],
            addComponent(i) { this.pipeline.push({...i, uid: Date.now()}); },
            removeComponent(idx) { this.pipeline.splice(idx, 1); },
            reset() { this.pipeline = []; },
            runSimulation() {
                this.isRunning = true;
                setTimeout(() => {
                    const total = this.pipeline.reduce((a,b)=>a+b.latency,0);
                    this.result = { time: total, message: total < 500 ? "Fast" : "Slow" };
                    this.isRunning = false;
                }, 1000);
            }
        },

        // ------------------------------------------------------------------
        // MODULE: EXCEL ESCAPE
        // ------------------------------------------------------------------
        excelEscape: {
            active: false, level: 0, hp: 100, score: 0, logs: [],
            start() { this.active = true; this.level = 1; this.logs.push("Game Started."); },
            makeMove(idx) { 
                this.logs.push(`Move ${idx} made.`);
                if(this.level < 5) this.level++; else { this.level = 6; }
            },
            reset() { this.active = false; },
            gamePath: [
                { enemy: "Spreadsheet", desc: "A wild xls appeared.", options: [{label:"Macro", type:"legacy"}, {label:"Python", type:"modern"}] },
                { enemy: "Email", desc: "Reply all storm.", options: [{label:"Ignore", type:"manual"}, {label:"Slack", type:"modern"}] },
                { enemy: "Meeting", desc: "Boring.", options: [{label:"Sleep", type:"manual"}, {label:"Standup", type:"modern"}] },
                { enemy: "Bug", desc: "Crash.", options: [{label:"Patch", type:"legacy"}, {label:"Fix", type:"modern"}] },
                { enemy: "Audit", desc: "The regulator.", options: [{label:"Hide", type:"manual"}, {label:"Logs", type:"modern"}] }
            ]
        },

        // ------------------------------------------------------------------
        // MODULE: DAILY FEED
        // ------------------------------------------------------------------
        dailyFeed: {
            currentLesson: null, streak: 0, completedToday: false,
            init() {
                this.currentLesson = { term: "Idempotency", def: "Safe to retry.", quiz: { q: "Retry safe?", options: ["Yes", "No"], correct: 0 } };
            },
            completeLesson() { this.completedToday = true; this.streak++; }
        },

        // ------------------------------------------------------------------
        // MODULE: CAPEX AUDITOR (Simple Keyword Match)
        // ------------------------------------------------------------------
        capexClassifier: {
            input: '', analysis: null, loading: false, stats: { ratio: 0 },
            analyze() {
                if(!this.input) return;
                this.loading = true;
                setTimeout(() => {
                    const lines = this.input.split('\n');
                    const items = lines.map(l => ({ ticket: l, type: l.toLowerCase().includes('feat') ? "CapEx" : "OpEx", justification: "Keyword match" }));
                    this.analysis = items;
                    this.stats.ratio = 50;
                    this.loading = false;
                }, 500);
            }
        },

        // ------------------------------------------------------------------
        // MODULE: VENDOR COACH (Templates)
        // ------------------------------------------------------------------
        vendorCoach: {
            step: 'input', vendorName: '', currentTerms: '', analysis: null, loading: false,
            fillDemo() { this.vendorName = "Infosys"; this.currentTerms = "T&M"; },
            analyze() {
                this.loading = true;
                setTimeout(() => {
                    this.analysis = { level: "Level 2 (T&M)", danger: "Incentivized to be slow.", upgrade_clause: "Shared Risk Reward.", objection: "We need guarantees.", rebuttal: "We pay for outcomes." };
                    this.step = 'analysis';
                    this.loading = false;
                }, 500);
            },
            startSim() { this.step = 'sim'; this.simMessages = [{role:'bot', text:"I want T&M."}]; },
            sendSim() { this.simMessages.push({role:'user', text:this.simInput}); this.simInput=''; this.simMessages.push({role:'bot', text:"Okay."}); }
        },

        // ------------------------------------------------------------------
        // MODULE: SILO BUSTER (Template)
        // ------------------------------------------------------------------
        siloBuster: {
            recipient: '', frictionPoint: '', result: null, loading: false,
            loadDemo() { this.recipient = "Compliance"; this.frictionPoint = "Cloud fear"; },
            generate() {
                this.loading = true;
                setTimeout(() => {
                    this.result = { subject: "Proposal: Safe Cloud Pilot", body: `Hi ${this.recipient},\n\nI understand your concern about ${this.frictionPoint}.\n\nLet's do a pilot.`, strategy_breakdown: "Empathy First." };
                    this.loading = false;
                }, 500);
            }
        },

        // ------------------------------------------------------------------
        // MODULE: LEGACY EXPLAINER (Static Demo)
        // ------------------------------------------------------------------
        legacyExplainer: {
            input: "", result: null, loading: false,
            explain() {
                this.loading = true;
                setTimeout(() => {
                    this.result = { executive_summary: "This code checks credit limits.", business_rules: ["Check Limit", "Reject if Low"], risk_assessment: "LOW", risk_reason: "Standard logic." };
                    this.loading = false;
                }, 1000);
            }
        },

        // ------------------------------------------------------------------
        // MODULE: WATERMELON DETECTOR (Static Logic)
        // ------------------------------------------------------------------
        watermelonDetector: {
            inputs: ["", "", ""], result: null, loading: false,
            analyze() {
                this.loading = true;
                setTimeout(() => {
                    this.result = { bs_score: 85, verdict: "WATERMELON", red_flags: ["Consistent 90% completion", "Vague updates"] };
                    this.loading = false;
                }, 1000);
            }
        },

        // ------------------------------------------------------------------
        // MODULE: DATA CANVAS (Template)
        // ------------------------------------------------------------------
        dataCanvasGen: {
            input: "", result: null, loading: false,
            generate() {
                this.loading = true;
                setTimeout(() => {
                    this.result = { product_name: "Customer 360", domain: "Marketing", jobs_to_be_done: "View single customer view", slo_freshness: "Daily", slo_accuracy: "99%", consumer_persona: "Analyst", output_ports: ["API"] };
                    this.loading = false;
                }, 1000);
            }
        },

        // ------------------------------------------------------------------
        // MODULE: THREAT MONITOR (Random Logic)
        // ------------------------------------------------------------------
        threatMonitor: {
            active: false, shareOfWallet: 100, competitors: [{name:"Revolut", share:0, color:"#3b82f6"}],
            toggleSim() {
                this.active = !this.active;
                if(this.active) {
                    this.interval = setInterval(() => {
                        if(this.shareOfWallet > 0) {
                            this.shareOfWallet -= 1;
                            this.competitors[0].share += 1;
                        }
                    }, 500);
                } else {
                    clearInterval(this.interval);
                }
            },
            reset() { this.active = false; clearInterval(this.interval); this.shareOfWallet = 100; this.competitors[0].share = 0; },
            get chartGradient() { return `conic-gradient(#1e293b ${this.shareOfWallet}%, #3b82f6 ${this.shareOfWallet}% 100%)`; },
            get healthColor() { return "text-primary"; }
        },

        // ------------------------------------------------------------------
        // MODULE: DATA GOV DASH (Simulated)
        // ------------------------------------------------------------------
        dataGovDash: {
            isLive: false, selectedProduct: null, products: [{id:1, name:"Customer API", owner:"Squad A", slo:{freshness:100}, status:'healthy', logs:[]}],
            toggleSim() { this.isLive = !this.isLive; },
            injectFailure() { alert("Failure injected (Simulated)"); }
        },

        // ------------------------------------------------------------------
        // NAVIGATION ITEMS
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
            { id: 'whatif', label: 'Scenario Planner', desc: 'Strategic simulation.', icon: 'fa-solid fa-chess-rook', color: 'text-purple-400' },
            { id: 'roleplay', label: 'Bilingual Bot', desc: 'Role-Play: Practice high-stakes conversations.', icon: 'fa-solid fa-masks-theater', color: 'text-yellow-400', vip: false },
            { id: 'sandbox', label: 'API Sandbox', desc: 'Visualize architecture & speed.', icon: 'fa-solid fa-shapes', color: 'text-cyan-400' },
            { id: 'culture', label: 'Debt Monitor', desc: 'Track organizational health.', icon: 'fa-solid fa-heart-pulse', color: 'text-risk' },
            { id: 'assessment', label: 'Agile Audit', desc: 'Assess organizational maturity.', icon: 'fa-solid fa-stethoscope', color: 'text-primary' },
            { id: 'excel', label: 'Excel Exposure', desc: 'Calculate the cost & risk of manual spreadsheets.', icon: 'fa-solid fa-file-excel', color: 'text-green-400' },
            { id: 'hippo', label: 'HIPPO Tracker', desc: 'Log decisions where Opinion overruled Data.', icon: 'fa-solid fa-crown', color: 'text-yellow-500' },
            { id: 'threat', label: 'Open Banking Radar', desc: 'Real-time monitor of competitor API drain.', icon: 'fa-solid fa-satellite-dish', color: 'text-red-500' },
            { id: 'strangler', label: 'Strangler Pattern', desc: 'Visualize legacy modernization strategy.', icon: 'fa-solid fa-network-wired', color: 'text-purple-400' },
            { id: 'squad', label: 'Bilingual Squad Builder', desc: 'Design the perfect cross-functional team.', icon: 'fa-solid fa-puzzle-piece', color: 'text-indigo-400' }
        ]

    })); // Close Alpine
}); // Close Event
