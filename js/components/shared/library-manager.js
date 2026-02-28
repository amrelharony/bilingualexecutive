document.addEventListener('alpine:init', () => {
    Alpine.data('libraryManagerComponent', () => ({
        view: 'books', // 'books' or 'stack'
        literacyScore: 0,
        
        // User State
        readBooks: [],
        knownTools: [],

        // 1. THE BOOKSHELF
        books: [
            { id: 'p2p', title: 'Project to Product', author: 'Mik Kersten', domain: 'Strategy', impact: 'High', summary: "Stop funding 'projects' that end. Fund 'products' that live. Measures 'Flow' instead of hours." },
            { id: 'team', title: 'Team Topologies', author: 'Skelton & Pais', domain: 'Org Design', impact: 'High', summary: "Conway's Law applied. Don't let your org chart break your architecture. Define interaction modes." },
            { id: 'accelerate', title: 'Accelerate', author: 'Nicole Forsgren', domain: 'DevOps', impact: 'Critical', summary: "The science of DORA metrics. Speed leads to stability, not the other way around." },
            { id: 'phoenix', title: 'The Phoenix Project', author: 'Gene Kim', domain: 'Culture', impact: 'Medium', summary: "A novel about IT Ops. Helps you empathize with the people keeping the lights on." },
            { id: 'inspired', title: 'Inspired', author: 'Marty Cagan', domain: 'Product', impact: 'High', summary: "How to build products customers love. Moves from 'Feature Factory' to 'Problem Solving'." }
        ],

        // 2. THE TECH STACK
        techStack: [
            { id: 'kafka', name: 'Kafka', category: 'Data', analogy: "The Central Nervous System", desc: "Real-time event streaming. It lets systems 'react' instead of 'ask'." },
            { id: 'k8s', name: 'Kubernetes', category: 'Infra', analogy: "The Container Ship Captain", desc: "Automates the deployment and scaling of software containers. Prevents manual server management." },
            { id: 'api', name: 'REST/GraphQL API', category: 'Integration', analogy: "The Universal Adapter", desc: "The standardized plug that allows different software to talk without knowing how the other works." },
            { id: 'cicd', name: 'CI/CD Pipeline', category: 'Process', analogy: "The Assembly Line", desc: "Automated testing and delivery. The factory floor that turns code into value." },
            { id: 'snowflake', name: 'Snowflake/Databricks', category: 'Data', analogy: "The Brain", desc: "Separates storage from compute. Allows massive data analysis without slowing down the bank." }
        ],

        init() {
            const saved = JSON.parse(localStorage.getItem('bilingual_library') || '{}');
            this.readBooks = saved.readBooks || [];
            this.knownTools = saved.knownTools || [];
            this.calculateScore();
            Alpine.store('gamification').trackToolUse('library', 'academy');
        },

        toggleBook(id) {
            if (this.readBooks.includes(id)) {
                this.readBooks = this.readBooks.filter(b => b !== id);
            } else {
                this.readBooks.push(id);
                Alpine.store('gamification').trackBookRead();
            }
            this.save();
        },

        toggleTool(id) {
            if (this.knownTools.includes(id)) {
                this.knownTools = this.knownTools.filter(t => t !== id);
            } else {
                this.knownTools.push(id);
            }
            this.save();
        },

        save() {
            localStorage.setItem('bilingual_library', JSON.stringify({
                readBooks: this.readBooks,
                knownTools: this.knownTools
            }));
            this.calculateScore();
        },

        calculateScore() {
            const totalItems = this.books.length + this.techStack.length;
            const completed = this.readBooks.length + this.knownTools.length;
            this.literacyScore = Math.round((completed / totalItems) * 100);
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateCurriculumPrompt() {
            // Identify Gaps
            const unread = this.books.filter(b => !this.readBooks.includes(b.id));
            const unknown = this.techStack.filter(t => !this.knownTools.includes(t.id));
            
            let focusArea = "Generalist";
            if (unread.some(b => b.domain === 'DevOps') && unknown.some(t => t.category === 'Infra')) focusArea = "Engineering Maturity";
            if (unread.some(b => b.domain === 'Product')) focusArea = "Product Thinking";

            const gapList = unread.map(b => `- Book: "${b.title}" (${b.domain})`).join("\n") + "\n" + 
                            unknown.map(t => `- Tech: ${t.name} (${t.category})`).join("\n");

            return `ACT AS: A Chief of Staff and Executive Tutor.

## MY KNOWLEDGE AUDIT
I have assessed my "Bilingual Fluency".
- **Current Literacy Score:** ${this.literacyScore}%
- **Primary Knowledge Gap:** ${focusArea}

## MISSING CONCEPTS (I have NOT read/understood these yet)
${gapList || "No gaps! I have completed the core curriculum."}

## YOUR MISSION
Create a **"Cheat Sheet"** for me to bridge these specific gaps immediately.
1. **The 2-Minute Drill:** For the unread books, give me the single most important "Mental Model" from each (e.g. from Team Topologies -> "Conway's Law").
2. **The Tech Analogy:** For the unknown tools, explain them using non-technical banking metaphors (e.g. "Kubernetes is like...").
3. **The Boardroom Question:** Give me one smart question to ask my CTO to prove I understand these specific missing concepts.

TONE: Concise, executive-level, high-signal.`;
        }
    }));
});
