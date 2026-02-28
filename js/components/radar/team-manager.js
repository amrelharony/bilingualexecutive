document.addEventListener('alpine:init', () => {
    Alpine.data('teamManagerComponent', () => ({
        activeTeam: null, // { id, name, code }
        memberResults: [], // Array of results from DB
        isLoading: false,
        view: 'intro', // intro, dashboard
        joinInput: '',
        createInput: '',
        
        // 1. Create a Team
        async createTeam() {
            if (!this.createInput) return _toast("Please enter a team name.", 'warning');
            const supabase = Alpine.store('app')?.supabase;
            if (!supabase) return _toast("Database not available.", 'error');
            this.isLoading = true;
            
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            const { data, error } = await supabase
                .from('teams')
                .insert({ name: this.createInput, join_code: code })
                .select()
                .single();

            this.isLoading = false;

            if (error) {
                console.error(error);
                _toast("Error creating team.", 'error');
            } else {
                Alpine.store('gamification').trackTeamJoin();
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
            if (!this.joinInput) return _toast("Enter a code.", 'warning');
            const supabase = Alpine.store('app')?.supabase;
            if (!supabase) return _toast("Database not available.", 'error');
            this.isLoading = true;

            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .eq('join_code', this.joinInput.toUpperCase())
                .single();

            this.isLoading = false;

            if (error || !data) {
                _toast("Team not found. Check the code.", 'error');
            } else {
                Alpine.store('gamification').trackTeamJoin();
                this.activeTeam = data;
                this.view = 'dashboard';
                localStorage.setItem('bilingual_active_team', JSON.stringify(data));
                this.fetchResults(); // Get existing members
            }
        },

        // 3. Fetch Team Data
        async fetchResults() {
            if (!this.activeTeam) return;
            const supabase = Alpine.store('app')?.supabase;
            if (!supabase) return;

            const { data, error } = await supabase
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

            const supabase = Alpine.store('app')?.supabase;
            if (!supabase) return;
            await supabase.from('team_results').insert({
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
                    .then(() => _toast("Team Invite Link copied!", 'success'))
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
    }));
});
