document.addEventListener('alpine:init', () => {
    Alpine.data('conwaySimComponent', () => ({
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
            Alpine.store('gamification').trackToolUse('conway', 'sims');
            Alpine.store('gamification').trackCalculation('Conway Topology');
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
                if (!from || !to) return;
                
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
                const f = this.teams.find(t => t.id === d.from)?.name || 'Unknown';
                const t = this.teams.find(t => t.id === d.to)?.name || 'Unknown';
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
    }));
});
