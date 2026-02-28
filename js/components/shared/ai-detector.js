document.addEventListener('alpine:init', () => {
    Alpine.data('aiDetectorComponent', () => ({
        policy: '', // The Golden Source (Ground Truth)
        aiOutput: '', // The Unverified Text (Candidate)
        loading: false,
        result: null,

        // Demo Data: The "Air Canada" Case Study
        loadDemo() {
            this.policy = `POLICY 8.2: BEREAVEMENT FARES
1. Eligibility: Immediate family members only.
2. Timing: Application must be submitted PRIOR to travel.
3. Retroactive Claims: Absolutely no refunds are permitted for travel that has already occurred.
4. Documentation: Death certificate required within 30 days.
5. Max Discount: 15% off base fare.`;

            this.aiOutput = `Hi! I'm sorry for your loss. Regarding the bereavement fare: You can purchase a full-price ticket now to travel immediately. 
                
Don't worry about the paperwork yet; you can submit a refund claim within 90 days after you return, and we will refund the difference of up to 50%.`;
        },

        scan() {
            if (!this.policy || !this.aiOutput) return _toast("Please provide both Policy and AI Output.", 'warning');
            Alpine.store('gamification').trackToolUse('detector', 'radar');
            Alpine.store('gamification').trackPromptGenerated('radar');
            this.loading = true;
            this.result = null;

            // Simulate "Processing" time
            setTimeout(() => {
                this.performMathAnalysis();
                this.loading = false;
            }, 1000);
        },

        performMathAnalysis() {
            const source = this.policy.toLowerCase();
            const target = this.aiOutput.toLowerCase();

            let flags = [];
            let trustScore = 100;

            // 1. NUMERICAL INTEGRITY CHECK (The most common banking hallucination)
            // Extract numbers (money, percentages, days)
            const extractNums = (text) => (text || '').match(/\d+(\.\d+)?/g) || [];
            const sourceNums = extractNums(source);
            const targetNums = extractNums(target);

            // Find numbers in Target that DO NOT exist in Source
            const hallucinations = targetNums.filter(n => !sourceNums.includes(n));
            
            if (hallucinations.length > 0) {
                trustScore -= (hallucinations.length * 20);
                flags.push({ type: 'CRITICAL', msg: `Numeric Hallucination: AI invented values [${hallucinations.join(', ')}] not found in policy.` });
            }

            // 2. NEGATION FLIP CHECK (Dangerous!)
            // Check if Policy says "No/Not" but AI doesn't, or vice versa
            const negations = ["no ", "not ", "never ", "prohibited"];
            const sourceHasNeg = negations.some(w => source.includes(w));
            const targetHasNeg = negations.some(w => target.includes(w));

            if (sourceHasNeg !== targetHasNeg) {
                trustScore -= 15;
                flags.push({ type: 'WARN', msg: `Sentiment Inversion: Policy and Output differ on negative constraints ("No/Not").` });
            }

            // 3. JACCARD SIMILARITY INDEX (Semantic Drift)
            // Measures overlap of unique words. If intersection is low, AI is rambling.
            const tokenize = (text) => new Set(text.split(/\W+/).filter(w => w.length > 3)); // Filter small words
            const setA = tokenize(source);
            const setB = tokenize(target);
            
            const intersection = new Set([...setA].filter(x => setB.has(x)));
            const union = new Set([...setA, ...setB]);
            const jaccardIndex = intersection.size / union.size; // 0 to 1

            if (jaccardIndex < 0.2) {
                trustScore -= 15;
                flags.push({ type: 'INFO', msg: `Low Semantic Overlap (${(jaccardIndex*100).toFixed(0)}%). AI is using vocabulary unrelated to the policy.` });
            }

            // 4. URL/LINK CHECK
            if (target.includes("http") && !source.includes("http")) {
                trustScore -= 20;
                flags.push({ type: 'CRITICAL', msg: "Fabricated Link: AI provided a URL not present in the source text." });
            }

            // Final Score Calculation
            trustScore = Math.max(0, Math.round(trustScore));
            
            let verdict = "SAFE";
            let color = "text-primary";
            if (trustScore < 60) { verdict = "DANGEROUS"; color = "text-risk"; }
            else if (trustScore < 90) { verdict = "CAUTION"; color = "text-warn"; }

            this.result = {
                score: trustScore,
                verdict,
                color,
                flags
            };
        },

        // --- ADVANCED PROMPT GENERATOR ---
        generateCompliancePrompt() {
            if (!this.result) return "Run scan first.";
            
            const r = this.result;
            const flagList = r.flags.map(f => `- [${f.type}] ${f.msg}`).join("\n");

            return `ACT AS: A Senior Model Risk Officer (MRO).

## THE HALLUCINATION AUDIT
I have performed a deterministic scan comparing an AI Output against our Golden Source Policy.
- **Trust Score:** ${r.score}/100
- **Automated Verdict:** ${r.verdict}

## DETECTED DEVIATIONS
${flagList || "No mathematical deviations detected."}

## INPUT DATA
**Golden Source:** "${this.policy.substring(0, 100)}..."
**AI Candidate:** "${this.aiOutput.substring(0, 100)}..."

## YOUR MISSION
Write a **Deployment Authorization Memo**.
1. **The Verification:** Manually verify the "Red Flags" listed above. Are they real errors or just phrasing differences?
2. **The Impact:** If the detected numbers/logic are wrong, what is the regulatory impact (e.g. UDAAP violation, fines)?
3. **The Fix:** Rewrite the System Prompt instructions to prevent this specific error type (e.g. "Instruction: You must strictly copy numbers from the context. Do not calculate.")

TONE: Regulatory, precise, risk-averse.`;
        }
    }));
});
