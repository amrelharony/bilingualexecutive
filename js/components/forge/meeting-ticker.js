document.addEventListener('alpine:init', () => {
    Alpine.data('meetingTickerComponent', () => ({
        // State
        active: false,
        paused: false,
        interval: null,
        
        // Inputs
        attendees: 6,
        avgRate: 125, // Blended hourly rate (Salary + Overhead)
        includeContextTax: true, // The "1.2x" multiplier for interruption cost
        
        // Live Metrics
        currentCost: 0,
        elapsedSeconds: 0,
        
        // Computed: How much money do we burn per minute?
        get burnRatePerMinute() {
            const base = (this.attendees * this.avgRate) / 60;
            return this.includeContextTax ? base * 1.2 : base;
        },

        // Computed: Dynamic Status Message based on Cost
        get statusMessage() {
            if (this.currentCost === 0) return "Ready to quantify the cost of gathering.";
            if (this.currentCost < 100) return "✅ Low Cost. Keep it efficient.";
            if (this.currentCost < 500) return "⚠️ Material Cost. Is a decision being made?";
            if (this.currentCost < 1000) return "💸 Expensive. Could this have been an email?";
            return "🔥 CASH INCINERATOR. This better be a Board Meeting.";
        },

        // Computed: Dynamic Color Class
        get statusColor() {
            if (this.currentCost < 100) return 'text-green-400';
            if (this.currentCost < 500) return 'text-yellow-400';
            if (this.currentCost < 1000) return 'text-orange-500';
            return 'text-red-500 animate-pulse';
        },

        // Actions
        toggle() {
            if (this.active) {
                this.pause();
            } else {
                this.start();
            }
        },

        start() {
            Alpine.store('gamification').trackToolUse('ticker', 'forge'); Alpine.store('gamification').trackCalculation('Meeting Tax');
            this.active = true;
            this.paused = false;
            
            // Update every second
            this.interval = setInterval(() => {
                this.elapsedSeconds++;
                // Calculate cost per second based on current settings
                const costPerSecond = this.burnRatePerMinute / 60;
                this.currentCost += costPerSecond;
            }, 1000);
        },

        pause() {
            this.active = false;
            this.paused = true;
            clearInterval(this.interval);
            this.interval = null;
        },

        reset() {
            this.pause();
            this.active = false;
            this.paused = false;
            this.currentCost = 0;
            this.elapsedSeconds = 0;
        },

        // Helper to format time (MM:SS)
        formatTime() {
            const mins = Math.floor(this.elapsedSeconds / 60);
            const secs = this.elapsedSeconds % 60;
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
    }));
});
