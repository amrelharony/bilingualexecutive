document.addEventListener('alpine:init', () => {
    Alpine.data('kpiDesignerComponent', () => ({
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
            Alpine.store('gamification').trackToolUse('kpi', 'forge'); Alpine.store('gamification').trackPromptGenerated('forge');
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
    }));
});
