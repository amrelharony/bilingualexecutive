document.addEventListener('alpine:init', () => {
    Alpine.data('talentManagerComponent', () => ({
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
            Alpine.store('gamification').trackToolUse('talent', 'radar');
            Alpine.store('gamification').trackPromptGenerated('radar');
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
    }));
});
