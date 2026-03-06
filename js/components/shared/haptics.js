document.addEventListener('alpine:init', () => {
    Alpine.store('haptics', {
        enabled: true,
        intensity: 1.0,
        supported: false,
        _lastSlide: 0,

        _patterns: {
            tap:         [10],
            doubleTap:   [10, 40, 10],
            press:       [20],
            heavy:       [40],
            success:     [10, 30, 10, 30, 20],
            error:       [50, 50, 50],
            warning:     [30, 50, 30],
            xp:          [8, 20, 8, 20, 8],
            rankUp:      [15, 30, 15, 30, 15, 30, 40, 60, 80],
            achievement: [20, 40, 20, 40, 30, 50, 50],
            prestige:    [10, 20, 10, 20, 10, 20, 10, 20, 15, 25, 20, 30, 25, 35, 100],
            streak:      [10, 15, 10, 15, 10, 15, 10, 15, 10],
            slide:       [5],
            pageFlip:    [8, 25, 12],
            terminal:    [3, 15, 3, 15, 3, 15, 3],
            confirm:     [15, 40, 25],
            dismiss:     [6],
            nav:         [12],
        },

        init() {
            this.supported = !!(navigator.vibrate);
            try {
                const saved = JSON.parse(localStorage.getItem('haptics_prefs'));
                if (saved) {
                    if (typeof saved.enabled === 'boolean') this.enabled = saved.enabled;
                    if (typeof saved.intensity === 'number') {
                        this.intensity = Math.max(0.5, Math.min(1.5, saved.intensity));
                    }
                }
            } catch (_) {}
        },

        fire(pattern) {
            if (!this.supported || !this.enabled) return;

            if (pattern === 'slide') {
                const now = Date.now();
                if (now - this._lastSlide < 80) return;
                this._lastSlide = now;
            }

            const seq = this._patterns[pattern];
            if (!seq) return;

            navigator.vibrate(this._scale(seq));
        },

        toggle() {
            this.enabled = !this.enabled;
            this._persist();
            if (this.enabled) this.fire('tap');
        },

        setIntensity(val) {
            this.intensity = Math.max(0.5, Math.min(1.5, parseFloat(val) || 1.0));
            this._persist();
            this.fire('tap');
        },

        _scale(arr) {
            if (this.intensity === 1.0) return arr;
            return arr.map(v => Math.round(v * this.intensity));
        },

        _persist() {
            try {
                localStorage.setItem('haptics_prefs', JSON.stringify({
                    enabled: this.enabled,
                    intensity: this.intensity,
                }));
            } catch (_) {}
        },
    });
});
