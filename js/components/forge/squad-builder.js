document.addEventListener('alpine:init', () => {
    Alpine.data('squadBuilderComponent', () => ({
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
            Alpine.store('gamification').trackToolUse('squad', 'forge'); Alpine.store('gamification').trackPromptGenerated('forge');
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
    }));
});
