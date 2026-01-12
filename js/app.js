// js/app.js

document.addEventListener('alpine:init', () => {
    Alpine.data('toolkit', () => ({
        // ------------------------------------------------------------------
        // INITIALIZATION
        // ------------------------------------------------------------------
        init() {
            // Mobile Detection
            this.isMobile = window.innerWidth < 768;
            window.addEventListener('resize', () => { this.isMobile = window.innerWidth < 768; });
            
            // Listen for the Android "Add to Home Screen" event
            window.addEventListener('beforeinstallprompt', (e) => {
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                e.preventDefault();
                // Stash the event so it can be triggered later.
                this.deferredPrompt = e;
                // Show our custom banner
                if (this.isMobile) this.showPwaPrompt = true;
            });

            // PWA Installation Prompt Logic
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
            
            try {
                if (this.isMobile && !isPWA && !localStorage.getItem('pwaPromptDismissed')) {
                    setTimeout(() => { this.showPwaPrompt = true; }, 2000);
                }
            } catch (e) { console.warn("Storage access restricted"); }

            // URL Param: VIP Mode Trigger (?access=vip_nfc_001)
            const params = new URLSearchParams(window.location.search);
            if (params.get('access') === 'vip_nfc_001') this.triggerVipSequence();

            // URL Param: Challenger Mode (Loading peer scores)
            const challenger = params.get('challenger');
            if (challenger) {
                try {
                    this.challengerData = JSON.parse(atob(challenger));
                    this.currentTab = 'assessment';
                } catch (e) { console.error("URL Parameter Error", e); }
            }

            // Restore LocalStorage Data
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
        },

        // ------------------------------------------------------------------
        // STATE VARIABLES
        // ------------------------------------------------------------------
        currentTab: 'dashboard',
        mobileMenuOpen: false,
        isMobile: false,
        deferredPrompt: null, 
        showPwaPrompt: false, 
        
        
        // VIP Mode
        isVipMode: false,
        showVipIntro: false,
        bootStep: 0,
        bootProgress: 0,
        vipJson: '{\n  "product_id": "DP-PAY-001",\n  "domain": "Payments_Processing",\n  "owner": "Sarah_Connor@meridian.com",\n  "slo": { "freshness": "200ms", "accuracy": "99.999%" }\n}',
        vipPrompt: 'Act as a CDO presenting to a skeptical Board. \nWe need $5M for Cloud Migration. Draft a 2-minute response using the "House Analogy". Focus on Risk, not just Speed.',

        // Chat / AI
        isChatOpen: false,
        chatInput: '',
        chatMessages: [],
        isTyping: false,
        userApiKey: '',
        showKeyModal: false,

        // Assessment / Tools
        searchQuery: '',
        glossarySearch: '',
        assessmentSubmitted: false,
        challengerData: null,
        copyBtnText: "Copy Challenge Link",
        activeRepair: null,
        
        matrixCoords: { x: 50, y: 50 },
        compassCoords: { x: 50, y: 50 },
        canvasData: { name: '', owner: '', jobs: '', slo1: '' },
        talentSkills: [ { label: "Tech Fluency", val: 3 }, { label: "P&L Literacy", val: 3 }, { label: "Data Culture", val: 3 }, { label: "Squad Autonomy", val: 3 }, { label: "Change EQ", val: 3 } ],
        
        // Chart Instances
        talentChartInstance: null,
        gapChartInstance: null,

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
            // ANDROID / DESKTOP (Chrome/Edge)
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.deferredPrompt = null;
                    this.showPwaPrompt = false;
                }
            } 
            // IOS (iPhone/iPad) - Manual Instructions required
            else {
                alert("To install on iPhone:\n1. Tap the 'Share' button (square with arrow)\n2. Scroll down and tap 'Add to Home Screen'");
                this.dismissPwa(); // Hide banner after showing instructions
            }
        },

        handleNavClick(tab) {
            this.currentTab = tab;
            this.mobileMenuOpen = false;
            this.$nextTick(() => {
                if (tab === 'talent') this.updateTalentChart();
                if (tab === 'assessment' && this.assessmentSubmitted) this.updateGapChart();
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
            if (typeof DOMPurify === 'undefined') { this.chatMessages.push({ role: 'bot', text: "Error: Security module missing." }); return; }

            const API_KEY = this.userApiKey; 
            if (!API_KEY) { 
                this.chatMessages.push({ role: 'bot', text: "Please set your Gemini API key in settings (Key icon)." }); 
                this.showKeyModal = true; 
                return; 
            }

            const userText = DOMPurify.sanitize(this.chatInput);
            this.chatMessages.push({ role: 'user', text: userText });
            this.chatInput = '';
            this.isTyping = true;
            this.scrollToBottom();

            const systemPrompt = "You are 'The Translator', a Bilingual Executive Assistant. Translate technical jargon into business impact (P&L, Risk, Speed). Rules: Technical Debt->Financial leverage; Refactoring->Renovation; Microservices->Legos; API->Universal Adapter. Tone: Concise, executive.";
            
            const tryFetch = async (model, version) => {
                const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${API_KEY}`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + "\n\nInput: " + userText }] }] })
                });
                if (!response.ok) throw new Error(`${response.status}`);
                return response.json();
            };

            try {
                let data;
                // Failover logic: Try Flash first, then experimental
                try { data = await tryFetch("gemini-1.5-flash-latest", "v1beta"); } 
                catch (e) { data = await tryFetch("gemini-2.0-flash-exp", "v1beta"); }

                let botText = "I couldn't process that.";
                if (data.candidates && data.candidates[0].content) botText = data.candidates[0].content.parts[0].text;
                
                this.isTyping = false;
                
                let parsedText = botText;
                try {
                    if (typeof marked !== 'undefined') parsedText = marked.parse(botText);
                } catch (e) {
                    console.warn("Markdown Parse Error", e);
                    parsedText = botText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                }
                
                const cleanHtml = DOMPurify.sanitize(parsedText);
                this.chatMessages.push({ role: 'bot', text: cleanHtml });
                this.scrollToBottom();
            } catch (error) {
                this.isTyping = false;
                let msg = "Connection Error.";
                if (error.message.includes("403")) msg = "Invalid API Key. Please check settings.";
                if (error.message.includes("429")) msg = "Quota exceeded. Try again later.";
                this.chatMessages.push({ role: 'bot', text: msg });
            }
        },

        scrollToBottom() { this.$nextTick(() => { const c = document.getElementById('chat-messages-container'); if (c) c.scrollTop = c.scrollHeight; }); },

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

        async generatePDF() {
            if (!window.jspdf) { alert("PDF library not loaded."); return; }
            try {
                const { jsPDF } = window.jspdf; const doc = new jsPDF();
                const s = this.calculateScore.total;
                doc.setFillColor(15,23,42); doc.rect(0,0,210,297,"F");
                doc.setTextColor(s<=40?248:74, s<=40?113:222, s<=40?113:128);
                doc.setFontSize(14); doc.text("BILINGUAL EXECUTIVE AUDIT", 20,20);
                doc.setFontSize(60); doc.text(`${s}/75`, 20,50);
                doc.save("Audit.pdf");
            } catch (e) { alert("PDF Error"); }
        },

// ------------------------------------------------------------------
        // CHART RENDERING (REVERTED TO ORIGINAL)
        // ------------------------------------------------------------------
        
        updateTalentChart() {
            this.$nextTick(() => {
                const ctx = document.getElementById('talentChart');
                if (!ctx || !ctx.getContext) return;
                if (this.talentChartInstance) this.talentChartInstance.destroy();
                
                // Back to JetBrains Mono
                Chart.defaults.font.family = '"JetBrains Mono", monospace';
                
                this.talentChartInstance = new Chart(ctx, { 
                    type: 'radar', 
                    data: { 
                        labels: this.talentSkills.map(s => s.label), 
                        datasets: [{ 
                            data: this.talentSkills.map(s => s.val), 
                            // Pink Background
                            backgroundColor: 'rgba(244, 114, 182, 0.2)', 
                            // Pink Border
                            borderColor: '#f472b6', 
                            pointBackgroundColor: '#fff' 
                        }] 
                    }, 
                    options: { 
                        plugins: { legend: { display: false } }, 
                        scales: { 
                            r: { 
                                min: 0, max: 5, ticks: { display: false }, 
                                grid: { color: '#334155' }, 
                                angleLines: { color: '#334155' } 
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
                            // YOU: Green
                            { label: 'You', data: my, borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.2)' }, 
                            // CHALLENGER: Pink
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
        // STATIC DATA & COMPUTED LOGIC
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
        getAssessmentColor() { const s = this.calculateScore.total; return s<=40?'text-risk':s<=60?'text-warn':'text-primary'; },
        
        finishAssessment() { this.assessmentSubmitted = true; window.scrollTo({ top: 0, behavior: 'smooth' }); if (this.challengerData) this.$nextTick(() => this.updateGapChart()); },
        resetAssessment() { this.assessmentSubmitted = false; try { localStorage.removeItem('bilingual_scores'); }catch(e){} this.assessmentData.forEach(s => s.questions.forEach(q => q.score = 3)); },
        
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
        getLighthouseStatus() { const c = this.lighthouseData.filter(i=>i.checked).length; if(c===10) return {title:"GREEN LIGHT", desc:"Launch.", text:"text-primary", border:"border-primary bg-primary/10"}; if(c>=8) return {title:"AMBER LIGHT", desc:"Proceed with caution.", text:"text-warn", border:"border-warn bg-warn/10"}; return {title:"RED LIGHT", desc:"STOP.", text:"text-risk", border:"border-risk bg-risk/10"}; },

        dictionary: [ { banker: "Technical Debt", tech: "Legacy Refactoring", translation: "Interest on past shortcuts. It's making your P&L brittle." }, { banker: "Op-Ex Efficiency", tech: "CI/CD Pipeline", translation: "Automated work that replaces manual human error." }, { banker: "Market Responsiveness", tech: "Microservices", translation: "Breaking the bank into Legos so we can change one part without breaking the rest." }, { banker: "Data Governance", tech: "Data Mesh", translation: "Moving from a central bottleneck to decentralized ownership." }, { banker: "Business Continuity", tech: "Chaos Engineering", translation: "Testing the bank by intentionally breaking things to ensure it survives real disasters." } ],
        get filteredDictionary() { const q = this.searchQuery.toLowerCase(); return this.dictionary.filter(i => i.banker.toLowerCase().includes(q) || i.tech.toLowerCase().includes(q) || i.translation.toLowerCase().includes(q)); },
        
        lighthouseData: [{category:"Value",text:"Customer Facing?"},{category:"Value",text:"Solving Pain?"},{category:"Value",text:"Unarguable Metric?"},{category:"Feasibility",text:"Decoupled?"},{category:"Feasibility",text:"Anti-Scope Defined?"},{category:"Feasibility",text:"MVP in 90 Days?"},{category:"Ecosystem",text:"Two-Pizza Team?"},{category:"Ecosystem",text:"Sandbox Waiver?"},{category:"Ecosystem",text:"Zero Dependencies?"},{category:"Ecosystem",text:"Air Cover?"}].map(i=>({...i, checked:false})),
        lighthouseCount() { return this.lighthouseData.filter(i=>i.checked).length; },

        repairKitData: [{symptom:"The Feature Factory", diagnosis:"High velocity, no value. Measuring output not outcome.", prescription:["Stop celebrating feature counts.", "Audit value with PO."]}, {symptom:"The Cloud Bill Shock", diagnosis:"Lift and Shift strategy. No FinOps.", prescription:["Implement FinOps ticker.", "Auto-shutdown non-prod servers."]}, {symptom:"The Agile Silo", diagnosis:"Optimized coding but ignored governance.", prescription:["Expand Definition of Done.", "Embed Compliance in squad."]}, {symptom:"Zombie Agile", diagnosis:"Process without purpose.", prescription:["Ban 'Agile' word.", "Refocus on enemy."]} ],
        boardRisks: [{title:"1. Strategic Risk", subtitle:"The Dumb Pipe", lie:"'Our app has 4.5 stars.'", truth:"Retaining customers but losing value. Used only for balance checks.", question:"Show me Share of Wallet for digital natives."}, {title:"2. Regulatory Risk", subtitle:"The Data Swamp", lie:"'Data is centralized.'", truth:"We are drowning. We have petabytes with no governance.", question:"Can we generate a liquidity report in 10 minutes?"}, {title:"3. Talent Risk", subtitle:"The Missing Bench", lie:"'Hiring top talent.'", truth:"Hiring mercenaries. Missionaries are leaving.", question:"% of Change budget spent on vendors?"} ],
        glossaryData: [{term:"Agentic AI",def:"AI that takes action (moves funds), not just generates text."}, {term:"API",def:"Digital glue allowing systems to talk. Enables Open Banking."}, {term:"Data Mesh",def:"Decentralized ownership; domains own their data products."}, {term:"FinOps",def:"Bringing financial accountability to Cloud spend."}, {term:"Tech Debt",def:"Implied cost of rework from choosing easy solutions."}],
        get filteredGlossary() { const q = this.glossarySearch.toLowerCase(); return !q ? this.glossaryData : this.glossaryData.filter(i=>i.term.toLowerCase().includes(q)||i.def.toLowerCase().includes(q)); },

        navItems: [ { id: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-home' }, { id: 'assessment', label: 'Agile Audit', icon: 'fa-solid fa-clipboard-check' }, { id: 'translator', label: 'Translator', icon: 'fa-solid fa-language' }, { id: 'matrix', label: 'Strategy Matrix', icon: 'fa-solid fa-chess-board' }, { id: 'compass', label: 'Compass', icon: 'fa-regular fa-compass' }, { id: 'canvas', label: 'Data Canvas', icon: 'fa-solid fa-file-contract' }, { id: 'talent', label: 'Talent Radar', icon: 'fa-solid fa-fingerprint' }, { id: 'lighthouse', label: 'Lighthouse', icon: 'fa-solid fa-lightbulb' }, { id: 'board', label: 'Board Guide', icon: 'fa-solid fa-chess-king' }, { id: 'repair', label: 'Repair Kit', icon: 'fa-solid fa-toolbox' }, { id: 'glossary', label: 'Glossary', icon: 'fa-solid fa-book-open' }, { id: 'resources', label: 'Resources', icon: 'fa-solid fa-book-bookmark' }, { id: 'community', label: 'Community', icon: 'fa-solid fa-users' }, { id: 'architect', label: 'Architect Console', icon: 'fa-solid fa-microchip text-hotpink', vip: true } ],
        dashboardTools: [  { id: 'simulator', label: 'Case Simulator', desc: 'Practice bilingual decision making.', icon: 'fa-solid fa-chess-knight', color: 'text-primary' }, // NEW
    { id: 'assessment', label: 'Agile Audit', desc: 'Assess organizational maturity.', icon: 'fa-solid fa-stethoscope', color: 'text-primary' }, { id: 'assessment', label: 'Agile Audit', desc: 'Assess organizational maturity.', icon: 'fa-solid fa-stethoscope', color: 'text-primary' }, { id: 'matrix', label: 'Strategy Matrix', desc: 'Build vs Buy decision framework.', icon: 'fa-solid fa-chess-board', color: 'text-purple-400' }, { id: 'translator', label: 'Translator', desc: 'Decode jargon into business value.', icon: 'fa-solid fa-language', color: 'text-blue-400' }, { id: 'talent', label: 'Talent Radar', desc: 'Identify skill gaps in squads.', icon: 'fa-solid fa-fingerprint', color: 'text-hotpink' }, { id: 'lighthouse', label: 'Lighthouse', desc: 'Checklist for successful pilots.', icon: 'fa-solid fa-lightbulb', color: 'text-warn' }, { id: 'repair', label: 'Repair Kit', desc: 'Fix stalled transformations.', icon: 'fa-solid fa-toolbox', color: 'text-risk' }, { id: 'architect', label: 'Architect Console', desc: 'Access High-Level Scripts.', icon: 'fa-solid fa-microchip', color: 'text-hotpink', vip: true } ] 
    }));
});

        // ------------------------------------------------------------------
        // CASE STUDY SIMULATOR (Meridian Trust)
        // ------------------------------------------------------------------
        caseStudy: {
            active: false,
            step: 0,
            gameOver: false,
            // The 3 Key Metrics from the book
            metrics: {
                politicalCapital: 50, // Your ability to influence
                velocity: 10,         // Speed of delivery
                risk: 50              // Operational risk (Lower is better)
            },
            history: [], // Tracks decisions for the debrief
            
            // The Story Engine
            scenarios: [
                {
                    id: 0,
                    title: "The $30M Zombie",
                    context: "You are Sarah, the new CDO. You discover 'Project Olympus' is 18 months late, $30M over budget, and has delivered zero value. The CFO wants to save it to avoid a write-off.",
                    question: "What is your first move?",
                    choices: [
                        {
                            text: "Try to fix it. Hire McKinsey to audit the code and descale the scope.",
                            outcome: "failure",
                            feedback: "The Sunk Cost Fallacy. You spent another $5M and 6 months realizing the foundation was rotten. The Board has lost faith.",
                            impact: { politicalCapital: -20, velocity: -5, risk: +10 }
                        },
                        {
                            text: "Kill it immediately. Reallocate budget to a small 'Lighthouse' pilot.",
                            outcome: "success",
                            feedback: "Bilingual Move. You stopped the bleeding. The CFO is angry about the write-off, but you freed up resources for a 'Goldilocks' pilot.",
                            impact: { politicalCapital: -10, velocity: +20, risk: -10 }
                        }
                    ]
                },
                {
                    id: 1,
                    title: "The Risk Wall",
                    context: "Your 'Instant Loan' pilot is ready. David (CRO) blocks it. He says: 'I don't trust code. I need a human analyst to sign off every loan.'",
                    question: "How do you respond?",
                    choices: [
                        {
                            text: "Escalate to the CEO. Tell him David is blocking innovation.",
                            outcome: "failure",
                            feedback: "The Political Trap. You made an enemy of the CRO. He will now use 'Compliance' to strangle every future project. You lost the Clay Layer.",
                            impact: { politicalCapital: -30, velocity: 0, risk: 0 }
                        },
                        {
                            text: "The 'Red Screen' Demo. Show him the automated policy checks in the code.",
                            outcome: "success",
                            feedback: "Bilingual Move. You didn't argue philosophy; you showed evidence. You proved the code is stricter than a human. David signs the waiver.",
                            impact: { politicalCapital: +20, velocity: +30, risk: -20 }
                        }
                    ]
                },
                {
                    id: 2,
                    title: "The Demo Day",
                    context: "90 Days are up. The app works. The Board is gathered. They expect a status report explaining why it's late (because it's always late).",
                    question: "How do you present?",
                    choices: [
                        {
                            text: "A 20-slide Strategy Deck explaining the 'Agile Transformation Roadmap'.",
                            outcome: "neutral",
                            feedback: "Innovation Theater. The Board nods, but they don't believe you. You are just another exec with a PowerPoint. You bought time, but not trust.",
                            impact: { politicalCapital: 0, velocity: 0, risk: 0 }
                        },
                        {
                            text: "Live Demo. Ask the Chairman to apply for a loan on his phone right now.",
                            outcome: "success",
                            feedback: "The Moment of Truth. The loan approves in 3 minutes. The 'ping' of money hitting the account changes the culture instantly.",
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
                
                // Update Metrics
                this.metrics.politicalCapital += choice.impact.politicalCapital;
                this.metrics.velocity += choice.impact.velocity;
                this.metrics.risk += choice.impact.risk;
                
                // Log History
                this.history.push({
                    step: this.step + 1,
                    scenario: currentScenario.title,
                    decision: choice.text,
                    feedback: choice.feedback,
                    result: choice.outcome
                });

                // Check Game Over Conditions
                if (this.metrics.politicalCapital <= 0) {
                    this.endGame("Fired. You lost the support of the Board.");
                    return;
                }

                // Advance
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
