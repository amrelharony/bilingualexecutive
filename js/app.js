// js/app.js


document.addEventListener('alpine:init', () => {
    Alpine.data('toolkit', () => ({

        // ==========================================
        // ACADEMY CONFIG & STATE
        // ==========================================
         navVisible: true,
         navTimer: null,
        viewMode: 'academy', // Toggles between 'academy' and 'tools'
        activeChapterId: null,
   

        
        // HOSTING CONFIG
        // Cloudflare R2 (Audio) - Ensure your bucket has public access enabled
        cfBase: 'https://pub-fafafe2a62594937b094305a3b9ef698.r2.dev', 
        
        // GitHub Raw (Images/Slides/CSV)
        // Note: Using 'raw.githubusercontent.com' to allow direct file loading
        ghBase: 'https://raw.githubusercontent.com/amrelharony/bilingualexecutive/3e71ec0fae6e738cced7c893618982a3b626947e/assets',

        // FLASHCARD STATE
        showFlashcards: false,
        flashcardDeck: [],
        currentCardIndex: 0,
        isFlipped: false,
        flashcardLoading: false,

        // --- VIEWER STATE ---
        viewer: {
            active: false,
            type: 'pdf', // 'pdf' or 'image'
            url: '',
            title: ''
        },

// --- OFFLINE MANAGER (Caching Engine) ---
        offlineManager: {
            limit: 2, 
            cacheName: 'bilingual-content-v1', // Dynamic cache name
            loading: null, // Stores ID of chapter currently downloading
            
            // Helper: Read quota from localStorage
            getQuota() {
                const today = new Date().toDateString();
                const stored = JSON.parse(localStorage.getItem('bilingual_offline_quota') || '{}');
                
                // Reset if new day
                if (stored.date !== today) {
                    return { date: today, downloadedCount: 0, cachedIds: stored.cachedIds || [] };
                }
                return stored;
            },

            // Helper: Save quota state
            updateQuota(chapterId) {
                const q = this.getQuota();
                if (!q.cachedIds.includes(chapterId)) {
                    q.downloadedCount++;
                    q.cachedIds.push(chapterId);
                    localStorage.setItem('bilingual_offline_quota', JSON.stringify(q));
                }
                // Trigger Alpine reactivity hack
                this.offlineManager = { ...this.offlineManager }; 
            },

            isCached(chapterId) {
                const q = this.getQuota();
                return q.cachedIds && q.cachedIds.includes(chapterId);
            },

            getQuotaText() {
                const q = this.getQuota();
                const left = this.limit - q.downloadedCount;
                if (left <= 0) return "QUOTA FULL";
                return `${left} LEFT TODAY`;
            }
        },
        
        // ==========================================
        // 2. THE METRO MAP DATA (Full 10 Chapters)
        // ==========================================
        metroMap: [
            {
                id: 'part1',
                label: 'PART 1: THE BURNING PLATFORM',
                color: 'border-red-500', 
                chapters: [
                    { id: 1, title: 'The Fintech Tsunami', desc: "Why the 'Universal Bank' model is dead.", status: 'completed', youtubeId: 'chE__fmgnbE', folder: 'ch01' },
                    { id: 2, title: 'Data: Millstone or Engine?', desc: "Turning legacy data swamps into a fuel source.", status: 'active', youtubeId: 'Ht2s73CULak', folder: 'ch02' },
                    { id: 3, title: 'The Cultural Debt', desc: "Why 'Green Light' status reports are killing you.", status: 'locked', youtubeId: 'pRcu6nihR2k', folder: 'ch03' }
                ]
            },
            {
                id: 'part2',
                label: 'PART 2: THE FRAMEWORK',
                color: 'border-blue-400',
                chapters: [
                    { id: 4, title: 'Agile as Strategy', desc: "Moving from Project to Product.", status: 'locked', youtubeId: 'dcxHBnDhYUw', folder: 'ch04' },
                    { id: 5, title: 'Governing the Goldmine', desc: "Automated Governance.", status: 'locked', youtubeId: 'wWBIUlHv0W0', folder: 'ch05' },
                    { id: 6, title: 'The Bilingual Executive', desc: "Speaking Tech & Money.", status: 'locked', youtubeId: 'MZ-HaSQJDzA', folder: 'ch06' }
                ]
            },
            {
                id: 'part3',
                label: 'PART 3: EXECUTION',
                color: 'border-green-400',
                chapters: [
                    { id: 7, title: 'The Lighthouse Strategy', desc: "How to launch a pilot.", status: 'locked', youtubeId: 'Jhn1Dwcd864', folder: 'ch07' },
                    { id: 8, title: 'Killing Zombies', desc: "Stopping dead projects.", status: 'locked', youtubeId: 'ygsm8hBt_xA', folder: 'ch08' },
                    { id: 9, title: 'The Future Bank', desc: "AI Agents & Embedded Finance.", status: 'locked', youtubeId: 'OWwVtVDTNHs', folder: 'ch09' },
                    { id: 10, title: 'The Day 1 Playbook', desc: "Your first 90 days.", status: 'locked', youtubeId: 'fNLPI6nWCDk', folder: 'ch10' }
                ]
            }
        ],

        // ==========================================
        // 3. ACADEMY HELPER METHODS (CORRECTED)
        // ==========================================
        get activeChapter() {
            if (!this.activeChapterId) return null;
            for (const part of this.metroMap) {
                const found = part.chapters.find(c => c.id === this.activeChapterId);
                if (found) return found;
            }
            return null;
        },

        
// --- VIEWER ACTIONS ---
        viewPdf(chapter) {
            this.viewer.title = `${chapter.title} - Slides`;
            this.viewer.type = 'pdf';
            this.viewer.url = this.getSlideUrl(chapter); // Uses your existing URL generator
            this.viewer.active = true;
        },

        viewImage(chapter, type) {
            this.viewer.title = `${chapter.title} - ${type.toUpperCase()}`;
            this.viewer.type = 'image';
            this.viewer.url = this.getImageUrl(chapter, type);
            this.viewer.active = true;
        },

        // --- DOWNLOAD LOGIC ---
        async downloadChapterAssets(chapter) {
            const dm = this.downloadManager;
            const quota = dm.getQuota();

            // 1. Check if already unlocked
            if (!quota.chapters.includes(chapter.id)) {
                // 2. Check Limit
                if (quota.chapters.length >= dm.limit) {
                    alert(`Daily Download Limit Reached (${dm.limit}/day).\n\nCome back tomorrow to unlock more resources.`);
                    return;
                }
                
                // 3. Unlock
                if(confirm(`Unlock resources for "${chapter.title}"?\nThis counts towards your daily limit (${quota.chapters.length}/${dm.limit}).`)) {
                    quota.chapters.push(chapter.id);
                    dm.saveQuota(quota);
                    // Force refresh of Alpine reactivity if needed
                    this.downloadManager = { ...this.downloadManager }; 
                } else {
                    return; // User cancelled
                }
            }

            // 4. Trigger Downloads
            alert(`Downloading Asset Pack for Chapter ${chapter.id}...`);
            
            // Define assets to download
            const assets = [
                { url: this.getSlideUrl(chapter), name: `Ch${chapter.id}_Slides.pdf` },
                { url: this.getAudioUrl(chapter), name: `Ch${chapter.id}_Audio.m4a` },
                { url: this.getImageUrl(chapter, 'infographic'), name: `Ch${chapter.id}_Infographic.png` },
                { url: this.getImageUrl(chapter, 'mindmap'), name: `Ch${chapter.id}_Mindmap.png` }
            ];

            // Sequential download to prevent browser blocking
            for (const asset of assets) {
                try {
                    await this.forceDownload(asset.url, asset.name);
                    // Small delay between downloads
                    await new Promise(r => setTimeout(r, 500));
                } catch (e) {
                    console.error(`Failed to download ${asset.name}`, e);
                }
            }
        },

        // Helper to force download (bypassing "open in new tab")
        async forceDownload(url, filename) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network error');
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            } catch (e) {
                // Fallback for simple link if fetch fails (e.g. CORS issues)
                console.warn("Fetch download failed, trying direct link", e);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.target = '_blank';
                link.click();
            }
        },
        
        // URL Generators - SIMPLIFIED for 'assets/ch01' structure
        getAudioUrl(chapter) {
            if(!chapter) return '';
            // R2 Structure: root/ch01_deepdive.m4a
            return `${this.cfBase}/${chapter.folder}_deepdive.m4a`;
        },
        getSlideUrl(chapter) {
            if(!chapter) return '';
            // GitHub Structure: /assets/ch01/slides.pdf
            return `${this.ghBase}/${chapter.folder}/slides.pdf`;
        },
        getImageUrl(chapter, type) {
            if(!chapter) return '';
            // GitHub Structure: /assets/ch01/infographic.png
            return `${this.ghBase}/${chapter.folder}/${type}.png`;
        },

        
       // --- CACHING ACTIONS (FAULT TOLERANT) ---
        async toggleOfflineCache(chapter) {
            const om = this.offlineManager;
            
            if (om.isCached(chapter.id)) {
                alert("This chapter is already saved.");
                return;
            }

            const quota = om.getQuota();
            if (quota.downloadedCount >= om.limit) {
                alert(`Daily Limit Reached (${om.limit}/day).`);
                return;
            }

            if (!confirm(`Save Chapter ${chapter.id} offline?\n(Quota: ${om.limit - quota.downloadedCount} left)`)) return;

            om.loading = chapter.id;

            try {
                const cacheName = om.cacheName || 'bilingual-content-v1';
                const cache = await caches.open(cacheName);
                
                // List of potential files
                const urlsToCache = [
                    this.getAudioUrl(chapter),
                    this.getSlideUrl(chapter),
                    this.getImageUrl(chapter, 'infographic'),
                    this.getImageUrl(chapter, 'mindmap')
                ];

                let successCount = 0;

                // Download one by one (Fault Tolerant)
                // If one file is missing (404), we skip it instead of crashing.
                for (const url of urlsToCache) {
                    try {
                        const response = await fetch(url);
                        if (!response.ok) {
                            console.warn(`Skipping missing file: ${url}`);
                            continue; // Skip 404s
                        }
                        await cache.put(url, response);
                        successCount++;
                    } catch (e) {
                        console.warn(`Network error for: ${url}`, e);
                    }
                }

                if (successCount > 0) {
                    om.updateQuota(chapter.id);
                    alert(`Saved ${successCount} assets for offline use!`);
                } else {
                    throw new Error("No files could be downloaded.");
                }

            } catch (error) {
                console.error("Cache failed:", error);
                alert("Download failed. Check internet or file availability.");
            } finally {
                om.loading = null;
            }
        },
        
        // --- UPDATED VIEWER LOGIC ---
        async viewPdf(chapter) {
            // 1. RESET STATE IMMEDIATELY (Prevents 400 Error)
            this.viewer.title = "Loading...";
            this.viewer.url = ""; // Clear previous URL
            this.viewer.type = 'pdf';
            this.viewer.active = true; // Open modal with spinner first

            const originalUrl = this.getSlideUrl(chapter);

            // INTELLIGENT ROUTING:
            if (this.offlineManager.isCached(chapter.id) || !navigator.onLine) {
                try {
                    const cacheName = this.offlineManager.cacheName || 'bilingual-content-v1';
                    const cache = await caches.open(cacheName);
                    const response = await cache.match(originalUrl);
                    
                    if (response) {
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        this.viewer.isBlob = true; 
                        
                        // Slight delay to ensure DOM is ready
                        setTimeout(() => { 
                            this.viewer.url = blobUrl; 
                            this.viewer.title = `${chapter.title} - Slides`;
                        }, 50);
                    } else {
                        // Fallback
                        this.viewer.isBlob = true;
                        this.viewer.url = originalUrl;
                        this.viewer.title = `${chapter.title} - Slides`;
                    }
                } catch(e) {
                    this.viewer.isBlob = true;
                    this.viewer.url = originalUrl;
                    this.viewer.title = `${chapter.title} - Slides`;
                }
            } else {
                // Online Case
                this.viewer.isBlob = false;
                
                // Slight delay to ensure the iframe has unmounted the previous src
                setTimeout(() => {
                    this.viewer.url = originalUrl;
                    this.viewer.title = `${chapter.title} - Slides`;
                }, 100);
            }
        },

        // Helper for images (Mind Map / Infographic)
        async viewImage(chapter, type) {
            this.viewer.title = `${chapter.title} - ${type.toUpperCase()}`;
            this.viewer.type = 'image';
            const originalUrl = this.getImageUrl(chapter, type);

            // Check cache for images too
            if (this.offlineManager.isCached(chapter.id) || !navigator.onLine) {
                try {
                    const cacheName = this.offlineManager.cacheName || 'bilingual-content-v1';
                    const cache = await caches.open(cacheName);
                    const response = await cache.match(originalUrl);
                    if (response) {
                        const blob = await response.blob();
                        this.viewer.url = URL.createObjectURL(blob);
                    } else {
                        this.viewer.url = originalUrl;
                    }
                } catch(e) { this.viewer.url = originalUrl; }
            } else {
                this.viewer.url = originalUrl;
            }
            this.viewer.active = true;
        },

        // Navigation
        openChapter(id) {
            this.activeChapterId = id;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        closeChapter() {
            this.activeChapterId = null;
            const audio = document.querySelector('audio');
            if(audio) audio.pause();
        },


        // Flashcard Engine
        async launchFlashcards(chapter) {
            this.showFlashcards = true;
            this.flashcardLoading = true;
            this.flashcardDeck = [];
            this.currentCardIndex = 0;
            this.isFlipped = false;

            try {
                // FIXED: Use chapter.folder directly (e.g. 'ch01')
                const csvUrl = `${this.ghBase}/${chapter.folder}/flashcards.csv`;
                
                const response = await fetch(csvUrl);
                if (!response.ok) throw new Error("CSV not found");
                const text = await response.text();
                
                const rows = text.split('\n').filter(r => r.trim() !== '');
                this.flashcardDeck = rows.map(row => {
                    const firstComma = row.indexOf(',');
                    if (firstComma === -1) return null; 
                    return { 
                        q: row.substring(0, firstComma).trim(), 
                        a: row.substring(firstComma + 1).trim().replace(/^"|"$/g, '') 
                    };
                }).filter(c => c !== null);

            } catch (e) {
                console.error("Flashcard Error:", e);
                this.flashcardDeck = [{ q: "Error", a: "Could not load cards from GitHub." }];
            } finally {
                this.flashcardLoading = false;
            }
        },

        nextCard() {
            this.isFlipped = false;
            setTimeout(() => {
                if (this.currentCardIndex < this.flashcardDeck.length - 1) {
                    this.currentCardIndex++;
                } else {
                    this.showFlashcards = false; // End of deck
                }
            }, 300);
        },
        
        // ------------------------------------------------------------------
        // INITIALIZATION
        // ------------------------------------------------------------------
        init() {

            // 1. VIP ACCESS CHECK (URL DETECTOR)
    const params = new URLSearchParams(window.location.search);
    
    // Check if the URL contains the access key
    if (params.get('access') === 'vip_nfc_001') {
        this.isVipMode = true; // Unlocks the "Sims" tab
        console.log("VIP Mode Activated");
        
        // Optional: Trigger your existing VIP intro sequence
        if (!localStorage.getItem('vip_intro_shown')) {
             this.triggerVipSequence(); 
             localStorage.setItem('vip_intro_shown', 'true');
        }
    } else {
        this.isVipMode = false; // "Sims" tab remains hidden
    }

                      // 1. SET DEFAULT TO HIDDEN (Modified)
            this.navVisible = true; 

            // 2. SETUP INTERACTION LISTENERS
            // Triggers on: Mouse move, Scroll, Touch, Click, Keypress
            const resetNav = () => this.resetNavTimer();
            ['mousemove', 'scroll', 'touchstart', 'click', 'keydown'].forEach(evt => {
                // Use capture: true to ensure we catch events even if propagation stops
                window.addEventListener(evt, resetNav, { passive: true, capture: true });
            });

        

        
            // check if user previously entered
const hasEnteredBefore = localStorage.getItem('app_entered') === 'true';

// If they entered before, skip landing page
if (hasEnteredBefore) {
    this.showLanding = false;
    this.setupActivityTracking();
}

            this.isMobile = window.innerWidth < 768;
            window.addEventListener('resize', () => { this.isMobile = window.innerWidth < 768; });


            // Initialize Supabase Client
const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
    
if (window.supabase) {
    this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    this.teamManager.supabase = this.supabase; 
} else {
    console.error("Supabase library not loaded.");
}
            
            // PWA & Install Logic
            const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');

            // 1. Capture the event for Android/Chrome (so we can trigger it later)
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                this.deferredPrompt = e;
            });

                this.$nextTick(() => {
        this.updateTalentChart();
    });


            
            const teamCode = params.get('team_code');
            if (teamCode) {
                console.log("Team Invite Detected:", teamCode); // Debugging line
                this.currentTab = 'assessment';
                this.$nextTick(() => {
                    if(this.teamManager) {
                        this.teamManager.joinByLink(teamCode);
                    }
                });
            }

            const challenger = params.get('challenger');
            if (challenger) {
                try {
                    this.challengerData = JSON.parse(atob(challenger));
                    this.currentTab = 'assessment';
                } catch (e) { console.error("URL Parameter Error", e); }
            }

            // Restore Data
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
                
                const savedTeam = localStorage.getItem('bilingual_active_team');
                if (savedTeam) {
                    this.teamManager.activeTeam = JSON.parse(savedTeam);
                    this.teamManager.view = 'dashboard';
                    // We use $nextTick to ensure Supabase client is ready
                    this.$nextTick(() => {
                        this.teamManager.fetchResults();
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

            // NEW: Talent chart watchers
this.$watch('currentTab', (value) => {
    if (value === 'talent') {
        // Give DOM time to render
        setTimeout(() => {
            this.updateTalentChart();
        }, 200);
    }
});

// Also watch for skill changes
this.$watch('talentSkills', () => {
    if (this.currentTab === 'talent') {
        this.updateTalentChart();
    }
}, { deep: true });

            this.culturalMonitor.init(); 
          this.initYouTubePlayer(); 


        },

        
resetNavTimer() {
    this.navVisible = true;
    if (this.navTimer) clearTimeout(this.navTimer);
    // this.navTimer = setTimeout(() => {   <-- Comment out these 3 lines
    //    this.navVisible = false;          <-- to stop it from hiding
    // }, 3000);                            <-- automatically.
},


    
        // YouTube Player Initialization Method
initYouTubePlayer() {
    const initPlayer = () => {
        this.player = new YT.Player('youtube-player', {
            videoId: '8GvrODrkQ7M',
            playerVars: {
                'autoplay': 0,
                'controls': 0,           // Hide YouTube's native controls
                'rel': 0,
                'modestbranding': 1,
                'loop': 0,
                'playlist': '8GvrODrkQ7M',
                'playsinline': 1,
                'enablejsapi': 1         // CRITICAL: Enable JavaScript API
            },
            events: {
'onReady': (event) => {
    // Do not mute on start
    this.videoMuted = false;
    this.videoPlaying = false;
    
    // Get video duration
    this.videoDuration = event.target.getDuration();
    
    // Set initial volume
    this.videoVolume = 50;
    event.target.setVolume(50);

    // Initialize fullscreen listeners
    this.initFullscreenListeners();
},

                'onStateChange': (event) => {
                    // When video starts playing
                    if (event.data === YT.PlayerState.PLAYING) {
                        this.videoPlaying = true;
                        
                        // Start updating current time every second
    this.updateTimeInterval = setInterval(() => {
        if (this.player && this.player.getCurrentTime) {
            this.videoCurrentTime = this.player.getCurrentTime();
            
            // Also update duration if not set
            if (!this.videoDuration && this.player.getDuration) {
                this.videoDuration = this.player.getDuration();
            }
        }
    }, 200); // Update every 200ms for smoother animation
}
                    // When video is paused, buffering, or ended
                    else if (event.data === YT.PlayerState.PAUSED || 
                             event.data === YT.PlayerState.BUFFERING || 
                             event.data === YT.PlayerState.ENDED) {
                        this.videoPlaying = false;
                        
                        // Clear the interval
                        if (this.updateTimeInterval) {
                            clearInterval(this.updateTimeInterval);
                            this.updateTimeInterval = null;
                        }
                        
                        // Update time one last time
                        if (this.player && this.player.getCurrentTime) {
                            this.videoCurrentTime = this.player.getCurrentTime();
                        }
                    }
                }
            }
        });
    };


            // Scenario A: API is already ready (e.g. cached or reload)
            if (window.YT && window.YT.Player) {
                initPlayer();
            } 
            // Scenario B: API needs to be loaded
            else {
                // Define the global callback
                window.onYouTubeIframeAPIReady = () => {
                    initPlayer();
                };

                // Inject script only if it's not there
                if (!document.getElementById('yt-api-script')) {
                    const tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    tag.id = "yt-api-script"; // Prevent duplicate injection
                    const firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
                }
            }
        },


        // ------------------------------------------------------------------
        // STATE VARIABLES
        // ------------------------------------------------------------------

            // --- LANDING PAGE STATE ---
        showLanding: true,
        videoPlaying: false,
        videoMuted: false,
        player: null, 
        videoCurrentTime: 0,
        videoDuration: 0,
        videoVolume: 50, // Default volume
        volumeBeforeMute: 50, // Store volume before muting
        updateTimeInterval: null, // For updating the seek bar
        isFullscreen: false,
        fullscreenElement: null,




        // Activity Tracking
        userActivityCount: 0,
        pwaTimer: null,
       isPwaPromptActive: false,
       userLastActive: Date.now(),


        currentTab: 'dashboard',
        supabase: null,
        selectedIndustry: "",
        selectedTitle: "",
       percentileResult: null,
       benchmarkLoading: false,
        totalBenchmarks: 0,
        mobileMenuOpen: false,
        isMobile: false,
        showPwaPrompt: false, 
        deferredPrompt: null,
        
        isVipMode: false,
            vipAccess: false, 
        showVipIntro: false,
        bootStep: 0,
        bootProgress: 0,
        vipJson: '{\n  "product_id": "DP-PAY-001",\n  "domain": "Payments_Processing",\n  "owner": "Sarah_Connor@meridian.com",\n  "slo": { "freshness": "200ms", "accuracy": "99.999%" }\n}',
        vipPrompt: 'Act as a CDO presenting to a skeptical Board. \nWe need $5M for Cloud Migration. Draft a 2-minute response using the "House Analogy". Focus on Risk, not just Speed.',

        
        searchQuery: '',
        glossarySearch: '',
        assessmentSubmitted: false,
        challengerData: null,
        copyBtnText: "Copy Challenge Link",
        activeRepair: null,

        translatorView: 'dict',

        
        matrixCoords: { x: 50, y: 50 },
        compassCoords: { x: 50, y: 50 },
        canvasData: { name: '', owner: '', jobs: '', slo1: '' },
talentSkills: [ 
    { label: "Tech Fluency", val: 3, icon: "fa-solid fa-code" }, 
    { label: "Business Acumen", val: 3, icon: "fa-solid fa-sack-dollar" }, // Renamed from Financial IQ
    { label: "Data Literacy", val: 2, icon: "fa-solid fa-table" }, // Renamed from Data Culture
    { label: "Empathy / EQ", val: 4, icon: "fa-solid fa-heart" }, // Renamed from Political EQ
    { label: "Change Tolerance", val: 3, icon: "fa-solid fa-wind" } // Renamed from Risk Appetite
],
        
        talentChartInstance: null,
        gapChartInstance: null,

// ------------------------------------------------------------------
        // CASE STUDY SIMULATOR (Updated with AI Prompt)
        // ------------------------------------------------------------------
        caseStudy: {
            active: false,
            step: 0,
            gameOver: false,
            finalMessage: "",
            metrics: { politicalCapital: 50, velocity: 10, risk: 50 },
            history: [],
            scenarios: [
                {
                    id: 0,
                    title: "The $30M Zombie",
                    context: "You are Sarah, the new CDO. 'Project Olympus' is 18 months late, $30M over budget, and has delivered zero value. The CFO wants to save it.",
                    question: "What is your first move?",
                    choices: [
                        {
                            text: "Try to fix it. Hire consultants to audit the code.",
                            outcome: "failure",
                            feedback: "Sunk Cost Fallacy. You wasted another $5M. The Board lost faith.",
                            impact: { politicalCapital: -20, velocity: -5, risk: +10 }
                        },
                        {
                            text: "Kill it immediately. Reallocate budget to a pilot.",
                            outcome: "success",
                            feedback: "Bilingual Move. You stopped the bleeding and freed up resources.",
                            impact: { politicalCapital: -10, velocity: +20, risk: -10 }
                        }
                    ]
                },
                {
                    id: 1,
                    title: "The Risk Wall",
                    context: "Your 'Instant Loan' pilot is ready. The CRO blocks it: 'I don't trust code. I need a human analyst to sign off every loan.'",
                    question: "How do you respond?",
                    choices: [
                        {
                            text: "Escalate to the CEO. Complaining about the CRO.",
                            outcome: "failure",
                            feedback: "Political Trap. You made an enemy of Risk. They will block everything.",
                            impact: { politicalCapital: -30, velocity: 0, risk: 0 }
                        },
                        {
                            text: "The 'Red Screen' Demo. Show automated policy checks.",
                            outcome: "success",
                            feedback: "Bilingual Move. You proved the code is stricter than a human.",
                            impact: { politicalCapital: +20, velocity: +30, risk: -20 }
                        }
                    ]
                },
                {
                    id: 2,
                    title: "The Demo Day",
                    context: "90 Days are up. The app works. The Board expects a status report explaining delays.",
                    question: "How do you present?",
                    choices: [
                        {
                            text: "A 20-slide Strategy Deck on the 'Roadmap'.",
                            outcome: "neutral",
                            feedback: "Innovation Theater. They don't believe you. Just another PowerPoint.",
                            impact: { politicalCapital: 0, velocity: 0, risk: 0 }
                        },
                        {
                            text: "Live Demo. Ask the Chairman to apply right now.",
                            outcome: "success",
                            feedback: "Moment of Truth. The loan approves in 3 minutes. Culture shifts.",
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
                
                this.metrics.politicalCapital += choice.impact.politicalCapital;
                this.metrics.velocity += choice.impact.velocity;
                this.metrics.risk += choice.impact.risk;
                
                this.history.push({
                    step: this.step + 1,
                    scenario: currentScenario.title,
                    decision: choice.text,
                    result: choice.outcome
                });

                if (this.metrics.politicalCapital <= 0) {
                    this.endGame("Fired. You lost the support of the Board.");
                    return;
                }
                if (this.step < this.scenarios.length - 1) {
                    this.step++;
                } else {
                    this.endGame("Victory! You have navigated the Clay Layer.");
                }
            },
            endGame(message) {
                this.gameOver = true;
                this.finalMessage = message;
            },

            // --- NEW: SIMULATOR AI PROMPT ---
            generateSimulatorPrompt() {
                const m = this.metrics;
                // Format the history for the AI
                const decisionLog = this.history.map(h => 
                    `turn ${h.step}: On "${h.scenario}", I chose to "${h.decision}". Result: ${h.result.toUpperCase()}.`
                ).join("\n");

                let profile = "";
                if(m.politicalCapital > 80) profile = "Master Politician (High Trust)";
                else if (m.politicalCapital < 20) profile = "Dead Man Walking (Zero Trust)";
                else profile = "Average Operator";

                return `ACT AS: The Chairman of the Board conducting a Performance Review.

## SIMULATION DATA (THE MERIDIAN PROTOCOL)
I have just completed a 90-day turnaround simulation as the new CDO.
- **FINAL OUTCOME:** ${this.finalMessage}
- **Political Capital:** ${m.politicalCapital}% (${profile})
- **Velocity Score:** ${m.velocity}
- **Risk Exposure:** ${m.risk}%

## MY DECISION LOG
${decisionLog}

## YOUR ASSESSMENT
1. **The Verdict:** Analyze my decision-making style based on the logs. Am I too reckless? Too cautious? Or truly Bilingual?
2. **The Blind Spot:** Identify one critical mistake I made (or a risk I ignored) based on the logs.
3. **The Coaching:** Give me one mental model to improve my executive decision-making.

TONE: Senior, direct, mentorship-focused.`;
            }
        },
        
        // ------------------------------------------------------------------
        // NEGOTIATION DOJO (Deterministic Logic + AI Debrief)
        // ------------------------------------------------------------------
        negotiationDojo: {
            active: false,
            gameOver: false,
            result: null, // 'win' or 'lose'
            
            // The State Machine
            currentScenario: null,
            currentNode: 'start',
            metrics: { trust: 50, leverage: 50, patience: 3 }, // The "Math"
            history: [], // Tracks user choices for the prompt

            // THE DATA (Branching Logic)
            scenarios: [
                {
                    id: 'cloud',
                    title: 'The Cloud Skeptic',
                    opponent: 'CFO Marcus Steel',
                    role: 'Chief Digital Officer',
                    intro: 'You need $10M for Cloud Migration. The CFO hates OpEx spikes.',
                    nodes: {
                        'start': {
                            text: "I see a $10M request for AWS. Our data centers are paid for. Why should I rent computers when I own them?",
                            options: [
                                { text: "It provides elasticity and microservices scalability.", impact: { trust: -10, leverage: 0, patience: -1 }, next: 'tech_trap', analysis: "Used Jargon. CFO tuned out." },
                                { text: "It shifts us from CapEx to OpEx, aligning cost with revenue.", impact: { trust: +20, leverage: +10, patience: 0 }, next: 'financial_hook', analysis: "Spoke CFO language (CapEx/OpEx)." }
                            ]
                        },
                        'tech_trap': {
                            text: "I don't care about 'elasticity'. I care about the P&L. You have 2 minutes before I reject this.",
                            options: [
                                { text: "If we don't migrate, we risk a security breach costing $50M.", impact: { trust: -10, leverage: +20, patience: -1 }, next: 'fear_tactic', analysis: "Fear mongering. Risky but high leverage." },
                                { text: "My apologies. Let me show you the ROI model. We break even in 18 months.", impact: { trust: +10, leverage: +5, patience: +1 }, next: 'financial_hook', analysis: "Pivot to logic. Good recovery." }
                            ]
                        },
                        'financial_hook': {
                            text: "18 months is too long. The Board wants efficiency now. Can you do it for $5M?",
                            options: [
                                { text: "Impossible. We need the full amount.", impact: { trust: 0, leverage: -10, patience: -1 }, next: 'standoff', analysis: "Stubbornness without data reduced leverage." },
                                { text: "We can do a $5M 'Lighthouse' pilot, but it delays full savings by a year.", impact: { trust: +20, leverage: +20, patience: 0 }, next: 'win', analysis: "The 'Anchor' Trade-off. Perfect Bilingual move." }
                            ]
                        },
                        'fear_tactic': {
                            text: "Are you threatening the bank? That sounds like a failure of your current leadership.",
                            options: [
                                { text: "It's not a threat, it's market reality.", impact: { trust: -20, leverage: 0, patience: -1 }, next: 'lose', analysis: "Argumentative. Lost the room." },
                                { text: "It's a quantified risk. I'm asking for insurance.", impact: { trust: +10, leverage: +10, patience: 0 }, next: 'financial_hook', analysis: "Re-framed risk as insurance." }
                            ]
                        },
                        'standoff': {
                            text: "Then we are at an impasse. I'm cutting the budget to $2M. Take it or leave it.",
                            options: [
                                { text: "I resign.", impact: { trust: 0, leverage: 0, patience: 0 }, next: 'lose', analysis: "Emotional quit." },
                                { text: "I'll take the $2M for the Mobile App only. But you own the legacy risk.", impact: { trust: +10, leverage: +10, patience: 0 }, next: 'win', analysis: "Calculated compromise." }
                            ]
                        }
                    }
                }
            ],

            start(index) {
                this.active = true;
                this.gameOver = false;
                this.currentScenario = this.scenarios[index];
                this.currentNode = 'start';
                this.metrics = { trust: 50, leverage: 50, patience: 3 };
                this.history = [];
            },

            choose(option) {
                // 1. Math Logic
                this.metrics.trust += option.impact.trust;
                this.metrics.leverage += option.impact.leverage;
                this.metrics.patience += option.impact.patience;

                // 2. Log History
                this.history.push({
                    stage: this.currentNode,
                    choice: option.text,
                    reasoning: option.analysis,
                    impact: option.impact
                });

                // 3. Win/Lose Condition Checks
                if (this.metrics.patience <= 0 || this.metrics.trust <= 0) {
                    this.finishGame('lose', "Negotiation Failed. You lost the room.");
                    return;
                }
                
                if (option.next === 'win') {
                    this.finishGame('win', "Deal Closed. You secured the budget.");
                    return;
                }
                
                if (option.next === 'lose') {
                    this.finishGame('lose', "Proposal Rejected.");
                    return;
                }

                // 4. Advance
                this.currentNode = option.next;
            },

            finishGame(result, msg) {
                this.gameOver = true;
                this.result = result;
                this.finalMessage = msg;
            },

            restart() {
                this.active = false;
                this.gameOver = false;
                this.history = [];
            },

            // --- NEW: ADVANCED PROMPT GENERATOR ---
            generateNegotiationPrompt() {
                if (!this.currentScenario || !this.result) return "Complete the simulation to generate prompt.";
                const s = this.currentScenario;
                const path = this.history.map((h, i) => 
                    `Step ${i+1}: When asked about [${h.stage}], I chose: "${h.choice}". (Impact: Trust ${h.impact.trust > 0 ? '+' : ''}${h.impact.trust})`
                ).join("\n");

                return `ACT AS: A Hostage Negotiator and Executive Coach (Chris Voss Style).

## THE SIMULATION RECORD
I just completed a high-stakes negotiation with ${s.opponent} (${s.role}).
- **Outcome:** ${this.result.toUpperCase()}
- **Final Metrics:** Trust (${this.metrics.trust}/100), Leverage (${this.metrics.leverage}/100).

## MY DECISION PATH
${path}

## YOUR COACHING ANALYSIS
1. **The Psychology:** Analyze *why* my specific choices led to this outcome. Did I use "Tactical Empathy" or did I trigger "Amygdala Hijack"?
2. **The Pivot Point:** Identify the exact moment the negotiation turned in my favor (or fell apart).
3. **Advanced Technique:** Teach me one advanced technique (e.g., "The Ackerman Bargain" or "Labeling") that I could have used in Step 2 to get a better result.

TONE: Direct, psychological, actionable.`;
            }
        },
        
        // ------------------------------------------------------------------
// USER ACTIVITY TRACKING FOR PWA PROMPT (Move to main scope)
// ------------------------------------------------------------------

// Method to increment activity count
trackUserActivity() {
    // Increment the activity counter
    this.userActivityCount++;
    
    // Update last active timestamp
    this.userLastActive = Date.now();
    
    console.log(`User activity count: ${this.userActivityCount}`);
    
    // If user has interacted at least 3 times, start the timer
    if (this.userActivityCount >= 3 && !this.pwaTimer && !this.isPwaPromptActive) {
        this.startPwaTimer();
    }
},

// Start the delayed timer
startPwaTimer() {
    // Clear any existing timer
    if (this.pwaTimer) {
        clearTimeout(this.pwaTimer);
    }
    
    // Set new timer for 5 seconds after 3rd interaction
    this.pwaTimer = setTimeout(() => {
        this.showDelayedPwaPrompt();
    }, 5000);
},

// Method to show the PWA prompt after conditions are met
showDelayedPwaPrompt() {
    // Check if already showing or dismissed
    if (this.isPwaPromptActive || this.showPwaPrompt) {
        return;
    }
    
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                 window.navigator.standalone || 
                 document.referrer.includes('android-app://');
    const dismissed = localStorage.getItem('pwaPromptDismissed');
    
    // Conditions for showing prompt
    if (this.isMobile && !isPWA && !dismissed) {
        this.showPwaPrompt = true;
        this.isPwaPromptActive = true;
        console.log("Showing delayed PWA prompt");
    }
    
    // Reset timer
    this.pwaTimer = null;
},

// Reset activity tracking (if needed)
resetActivityTracking() {
    this.userActivityCount = 0;
    this.userLastActive = Date.now();
    this.isPwaPromptActive = false;
    
    if (this.pwaTimer) {
        clearTimeout(this.pwaTimer);
        this.pwaTimer = null;
    }
},

// Update setupActivityTracking method to use the correct context
setupActivityTracking() {
    // Reset any previous tracking
    this.resetActivityTracking();
    
    // Store reference to this for use in event listeners
    const self = this;
    
    // Track clicks (anywhere on the page)
    document.addEventListener('click', () => {
        self.trackUserActivity();
    }, { passive: true });
    
    // Track scrolling
    document.addEventListener('scroll', () => {
        self.trackUserActivity();
    }, { passive: true });
    
    // Track keyboard input
    document.addEventListener('keydown', () => {
        self.trackUserActivity();
    }, { passive: true });
    
    // Track tool changes (when user selects different tools)
    const trackToolChange = () => {
        self.trackUserActivity();
    };
    
    // Watch for Alpine.js updates to currentTab
    this.$watch('currentTab', trackToolChange);
    this.$watch('currentGroup', trackToolChange);
},

        // ------------------------------------------------------------------
        // CULTURAL DEBT MONITOR (Updated with AI Prompt)
        // ------------------------------------------------------------------
        culturalMonitor: {
            history: [],
            isCheckinOpen: false,
            answers: { q1: null, q2: null, q3: null },
            chartInstance: null,

            init() {
                try {
                    const saved = localStorage.getItem('bilingual_culture_history');
                    if (saved) this.history = JSON.parse(saved);
                } catch (e) { console.error("Load Error", e); }
            },

            submitCheckin() {
                let debt = 0;
                // Q1: Bad News Shared? (If No, Fear exists = High Debt)
                if (this.answers.q1 === 'no') debt += 40; 
                // Q2: HiPPO Override? (If Yes, Ego exists = High Debt)
                if (this.answers.q2 === 'yes') debt += 30;
                // Q3: Shipped Value? (If No, Stagnation = High Debt)
                if (this.answers.q3 === 'no') debt += 30;

                const entry = {
                    date: new Date().toLocaleDateString(),
                    score: debt,
                    timestamp: Date.now()
                };

                this.history.push(entry);
                if (this.history.length > 10) this.history.shift();
                
                localStorage.setItem('bilingual_culture_history', JSON.stringify(this.history));
                
                this.isCheckinOpen = false;
                this.answers = { q1: null, q2: null, q3: null };
                this.renderChart();
            },

            get currentScore() {
                if (this.history.length === 0) return 0;
                return this.history[this.history.length - 1].score;
            },

            get status() {
                const s = this.currentScore;
                if (s < 30) return { label: "HEALTHY", color: "text-primary", desc: "High safety. Fast flow." };
                if (s < 70) return { label: "AT RISK", color: "text-warn", desc: "Friction is building. Intervene now." };
                return { label: "TOXIC", color: "text-risk", desc: "Culture of fear. Transformation stalled." };
            },

            get recommendation() {
                const s = this.currentScore;
                if (s < 30) return "Keep reinforcing the 'No Jargon' rule.";
                if (s < 70) return "Run a 'Bad News' Audit. Ask teams what they are hiding.";
                return "Emergency: Kill a 'Zombie Project' publicly to restore trust.";
            },

            // --- NEW: AI PROMPT GENERATOR ---
            generateCulturePrompt() {
                const s = this.currentScore;
                
                // 1. Analyze Trend
                let trend = "No historical data yet";
                if (this.history.length >= 2) {
                    const prev = this.history[this.history.length - 2].score;
                    if (s > prev) trend = "⚠️ WORSENING. Fear is increasing.";
                    else if (s < prev) trend = "✅ IMPROVING. Safety is returning.";
                    else trend = "STAGNANT. We are stuck.";
                }

                // 2. Select Context
                let context = "";
                if (s >= 70) context = "My team is paralyzed by fear (High Debt). They hide bad news and wait for orders.";
                else if (s >= 30) context = "My team is experiencing friction. We have pockets of agility, but 'HiPPO' (Highest Paid Person's Opinion) often overrides data.";
                else context = "My team is performing well (Low Debt), but I need to prevent complacency.";

                return `ACT AS: An Organizational Psychologist and Agile Transformation Coach.

## THE DATA (CULTURAL DEBT MONITOR)
I track my team's "Cultural Debt" (friction, fear, and lack of flow).
- **CURRENT DEBT SCORE:** ${s}% (0% is perfect, 100% is toxic)
- **TREND:** ${trend}

## THE DIAGNOSIS
${context}

## YOUR MISSION
Design a **"Psychological Safety Intervention"** for my next team meeting.
1. **The Root Cause:** Based on the score of ${s}%, explain *why* innovation is failing (reference "Westrum Organizational Culture").
2. **The Ritual:** Propose 1 specific, non-cringe ritual to lower this debt (e.g., "The Pre-Mortem", "Failure Cake", or "Red Carding").
3. **The Script:** Write the exact opening 3 sentences I should say to the team to authorize candor and vulnerability.

TONE: Empathetic, scientifically grounded, but actionable.`;
            },

            reset() {
                if(confirm("Clear all history?")) {
                    this.history = [];
                    localStorage.removeItem('bilingual_culture_history');
                    if(this.chartInstance) this.chartInstance.destroy();
                }
            },

            renderChart() {
                // (Chart rendering logic remains the same)
                if (typeof Chart === 'undefined') return;
                setTimeout(() => {
                    const ctx = document.getElementById('debtChart');
                    if (!ctx) return;
                    if (this.chartInstance) this.chartInstance.destroy();
                    const color = this.currentScore > 50 ? '#f87171' : '#4ade80';
                    this.chartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: this.history.map(h => h.date),
                            datasets: [{
                                label: 'Debt %',
                                data: this.history.map(h => h.score),
                                borderColor: color,
                                backgroundColor: color + '20',
                                tension: 0.4,
                                fill: true
                            }]
                        },
                        options: { scales: { y: { min: 0, max: 100 }, x: { display: false } }, plugins: { legend: { display: false } } }
                    });
                }, 100);
            }
        },
    
        // ------------------------------------------------------------------
// TEAM COLLABORATION MANAGER
// ------------------------------------------------------------------
teamManager: {
    activeTeam: null, // { id, name, code }
    memberResults: [], // Array of results from DB
    isLoading: false,
    view: 'intro', // intro, dashboard
    joinInput: '',
    createInput: '',
    
    // 1. Create a Team
    async createTeam() {
        if (!this.createInput) return alert("Please enter a team name.");
        this.isLoading = true;
        
        // Generate a simple 6-char code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { data, error } = await this.supabase
            .from('teams')
            .insert({ name: this.createInput, join_code: code })
            .select()
            .single();

        this.isLoading = false;

        if (error) {
            console.error(error);
            alert("Error creating team.");
        } else {
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
        if (!this.joinInput) return alert("Enter a code.");
        this.isLoading = true;

        const { data, error } = await this.supabase
            .from('teams')
            .select('*')
            .eq('join_code', this.joinInput.toUpperCase())
            .single();

        this.isLoading = false;

        if (error || !data) {
            alert("Team not found. Check the code.");
        } else {
            this.activeTeam = data;
            this.view = 'dashboard';
            localStorage.setItem('bilingual_active_team', JSON.stringify(data));
            this.fetchResults(); // Get existing members
        }
    },

    // 3. Fetch Team Data
    async fetchResults() {
        if (!this.activeTeam) return;
        
        const { data, error } = await this.supabase
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

        await this.supabase.from('team_results').insert({
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
                .then(() => alert("Team Invite Link copied! Sending this link will auto-open the Agile Audit tab."))
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
},

        // ---------------------------------------------------------
        //  THE NEW TALENT MANAGER (Advanced Prompt Logic)
        // ---------------------------------------------------------
        talentManager: {
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
        },
        
        // ------------------------------------------------------------------
        // WAR GAMES (Deterministic Strategy Logic)
        // ------------------------------------------------------------------
        warGames: {
            active: false,
            gameOver: false,
            result: null, // 'victory', 'bankruptcy', 'regulatory_shutdown'
            
            // State
            currentScenario: null,
            currentNode: 'start',
            metrics: { capital: 100, innovation: 20, stability: 80 },
            history: [],

            // THE SCENARIOS (Branching Logic)
            scenarios: [
                {
                    id: 'core',
                    title: 'Operation: Open Heart',
                    brief: 'The Board demands we replace the 40-year-old Core Banking System. It is risky, expensive, and necessary.',
                    nodes: {
                        'start': {
                            text: "Our legacy vendor just raised prices by 40%. The Core is stable but inflexible. We cannot launch new products. What is the strategy?",
                            options: [
                                { text: "Big Bang Replacement. Buy a modern SaaS core and migrate everything in one weekend.", impact: { capital: -60, innovation: +50, stability: -40 }, next: 'big_bang', analysis: "High Risk / High Reward." },
                                { text: "Hollow out the Core. Build a side-car 'Neobank' stack and migrate slowly.", impact: { capital: -30, innovation: +20, stability: -10 }, next: 'strangler', analysis: "The Strangler Fig Pattern." }
                            ]
                        },
                        'big_bang': {
                            text: "Migration Weekend is approaching. Testing shows a 15% error rate in account balances. The Board is watching.",
                            options: [
                                { text: "Delay the launch by 3 months to fix bugs.", impact: { capital: -20, innovation: 0, stability: +20 }, next: 'delay_pain', analysis: "Prudent but expensive." },
                                { text: "Launch anyway. We'll fix errors in post-production support.", impact: { capital: 0, innovation: +10, stability: -50 }, next: 'crash', analysis: "Reckless gambling." }
                            ]
                        },
                        'strangler': {
                            text: "The new 'Side-Car' stack is live and customers love it. But maintaining two parallel banks is draining our OpEx budget.",
                            options: [
                                { text: "Cut funding to the Legacy maintenance team to save cash.", impact: { capital: +10, innovation: 0, stability: -30 }, next: 'outage', analysis: "Created technical debt." },
                                { text: "Accelerate migration. Offer customers $50 bonus to switch to the new stack manually.", impact: { capital: -20, innovation: +10, stability: +10 }, next: 'victory', analysis: "Customer-led migration." }
                            ]
                        },
                        'delay_pain': {
                            text: "The delay burned cash, but the system is stable. However, a competitor just launched the features we were building.",
                            options: [
                                { text: "Stay the course. Reliability is our brand.", impact: { capital: -10, innovation: -10, stability: +10 }, next: 'victory', analysis: "Slow and steady survival." },
                                { text: "Rush a feature update immediately after launch.", impact: { capital: -10, innovation: +20, stability: -20 }, next: 'crash', analysis: "Destabilized the platform." }
                            ]
                        },
                        'outage': {
                            text: "Disaster! The under-funded legacy core crashed on payday. 2 million customers cannot access funds.",
                            options: [
                                { text: "Blame the vendor publicly.", impact: { capital: 0, innovation: 0, stability: -20 }, next: 'shutdown', analysis: "Weak leadership." },
                                { text: "Roll back everything to the old state.", impact: { capital: -20, innovation: -40, stability: +30 }, next: 'stagnation', analysis: "Retreat to safety." }
                            ]
                        },
                        'crash': { text: "CRITICAL FAILURE. Data corruption detected. Regulators have entered the building.", options: [], next: 'shutdown' },
                        'shutdown': { text: "GAME OVER. The banking license has been suspended.", options: [], next: 'end' },
                        'victory': { text: "SUCCESS. Transformation complete. We are bruised but modern.", options: [], next: 'end' },
                        'stagnation': { text: "SURVIVAL. We survived, but we are now a zombie bank with no innovation.", options: [], next: 'end' }
                    }
                }
            ],

            start(index) {
                this.active = true;
                this.gameOver = false;
                this.currentScenario = this.scenarios[index];
                this.currentNode = 'start';
                this.metrics = { capital: 100, innovation: 20, stability: 80 };
                this.history = [];
            },

            choose(option) {
                // 1. Math Engine
                this.metrics.capital += option.impact.capital;
                this.metrics.innovation += option.impact.innovation;
                this.metrics.stability += option.impact.stability;

                // 2. Log Decision
                this.history.push({
                    situation: this.currentScenario.nodes[this.currentNode].text,
                    decision: option.text,
                    rationale: option.analysis,
                    impact: option.impact
                });

                // 3. Check for immediate failures
                if (this.metrics.capital <= 0) {
                    this.finishGame('bankruptcy', "INSOLVENCY. You ran out of money.");
                    return;
                }
                if (this.metrics.stability <= 20) {
                    this.finishGame('regulatory_shutdown', "INTERVENTION. Regulators seized the bank due to risk.");
                    return;
                }

                // 4. Handle End States
                if (['shutdown', 'end', 'crash', 'stagnation'].includes(option.next)) {
                    // Map node ID to result type
                    let res = 'victory';
                    if (option.next === 'crash' || option.next === 'shutdown') res = 'regulatory_shutdown';
                    if (option.next === 'stagnation') res = 'stagnation';
                    
                    // Update text for the final screen
                    this.currentNode = option.next; 
                    this.finishGame(res, this.currentScenario.nodes[option.next].text);
                } else {
                    // Advance
                    this.currentNode = option.next;
                }
            },

            finishGame(result, msg) {
                this.gameOver = true;
                this.result = result;
                this.finalMessage = msg;
            },

            restart() {
                this.active = false;
                this.gameOver = false;
                this.history = [];
            },

            // --- NEW: STRATEGIC POST-MORTEM PROMPT ---
            generateWarGamePrompt() {
                if (!this.currentScenario || !this.result) return "Complete the simulation first.";
                const decisionPath = this.history.map((h, i) => 
                    `Turn ${i+1}: ${h.decision} (Intent: ${h.rationale})`
                ).join("\n");

                return `ACT AS: A McKinsey Senior Partner conducting a Strategic Post-Mortem.

## WAR GAME RESULTS
I just simulated a Bank Transformation Strategy ("${this.currentScenario.title}").
- **FINAL OUTCOME:** ${this.result.toUpperCase()}
- **Ending Metrics:** Capital (${this.metrics.capital}), Innovation (${this.metrics.innovation}), Stability (${this.metrics.stability}).

## THE DECISION CHAIN
${decisionPath}

## YOUR ANALYSIS
1. **The Fatal Flaw (or Winning Move):** Identify the single decision that sealed my fate. Was it a math error or a cultural error?
2. **Alternative History:** If you were the CEO, which turn would you have played differently and why?
3. **The Executive Lesson:** Give me one "Law of Corporate Strategy" that applies to this specific run (e.g. "Conway's Law" or "The Sunk Cost Fallacy").

TONE: Brutally honest, high-level strategic insight.`;
            }
        },
        
        // ------------------------------------------------------------------
        // NAVIGATION & TOOLS
        // ------------------------------------------------------------------
       // Inside Alpine.data('toolkit', ...)

currentGroup: 'radar', // Default view

// New Navigation Groups
navGroups: [
    { id: 'radar', label: 'Radar', icon: 'fa-solid fa-bullseye', desc: 'Diagnostics & Metrics' },
    { id: 'forge', label: 'Forge', icon: 'fa-solid fa-hammer', desc: 'Builders & Tools' },
    { id: 'sims', label: 'Sims', icon: 'fa-solid fa-gamepad', desc: 'Roleplay & Scenarios' }
],


// Group the tools
tools: {
    radar: [
        { id: 'assessment', label: 'Agile Audit', icon: 'fa-solid fa-stethoscope', color: 'text-primary' },
        { id: 'culture', label: 'Debt Monitor', icon: 'fa-solid fa-heart-pulse', color: 'text-risk' },
        { id: 'talent', label: 'Talent Radar', icon: 'fa-solid fa-fingerprint', color: 'text-hotpink' },
        { id: 'dumbpipe', label: 'Utility Risk', icon: 'fa-solid fa-link-slash', color: 'text-red-400' },
        { id: 'datagov', label: 'Data Health', icon: 'fa-solid fa-traffic-light', color: 'text-blue-500' },
        { id: 'shadow', label: 'Shadow IT', icon: 'fa-solid fa-ghost', color: 'text-purple-400' },
        { id: 'detector', label: 'AI Risk Scan', icon: 'fa-solid fa-shield-cat', color: 'text-risk' },
        { id: 'cognitive', label: 'Brain Load', icon: 'fa-solid fa-brain', color: 'text-purple-400' },
        { id: 'sprintcheck', label: 'Sprint Check', icon: 'fa-solid fa-stopwatch', color: 'text-orange-400' },
        { id: 'adaptation', label: 'Adaptability', icon: 'fa-solid fa-dna', color: 'text-cyan-400' },
        { id: 'dt_tracker', label: 'ROI Tracker', icon: 'fa-solid fa-chart-line', color: 'text-green-400' }
    ],
    academy: [
        { id: 'translator', label: 'Translator', icon: 'fa-solid fa-language', color: 'text-blue-300' },
        { id: 'board', label: 'Board Guide', icon: 'fa-solid fa-chess-king', color: 'text-yellow-400' },
        { id: 'glossary', label: 'Glossary', icon: 'fa-solid fa-book', color: 'text-slate-400' },
        { id: 'feed', label: 'Daily Insight', icon: 'fa-solid fa-lightbulb', color: 'text-yellow-400' },
        { id: 'library', label: 'Exec Library', icon: 'fa-solid fa-book-open-reader', color: 'text-cyan-300' }
    ],
    forge: [
        { id: 'kpi', label: 'Outcome Gen', icon: 'fa-solid fa-wand-magic-sparkles', color: 'text-green-400' },
        { id: 'lighthouse', label: 'Lighthouse', icon: 'fa-solid fa-lightbulb', color: 'text-yellow-400' },
        { id: 'canvas', label: 'Data Product', icon: 'fa-solid fa-file-contract', color: 'text-blue-500' },
        { id: 'roi', label: 'Pilot ROI', icon: 'fa-solid fa-calculator', color: 'text-green-500' },
        { id: 'excel', label: 'Excel Auditor', icon: 'fa-solid fa-file-excel', color: 'text-green-400' },
        { id: 'squad', label: 'Squad Builder', icon: 'fa-solid fa-people-group', color: 'text-indigo-400' },
        { id: 'repair', label: 'Repair Kit', icon: 'fa-solid fa-toolbox', color: 'text-red-400' },
        { id: 'vendor', label: 'Vendor Coach', icon: 'fa-solid fa-handshake', color: 'text-yellow-400' },
        { id: 'capex', label: 'FinOps Audit', icon: 'fa-solid fa-file-invoice-dollar', color: 'text-green-400' },
        { id: 'legacy', label: 'Legacy Code', icon: 'fa-solid fa-microchip', color: 'text-slate-400' },
        { id: 'flow', label: 'Flow Efficiency', icon: 'fa-solid fa-water', color: 'text-blue-400' },
        { id: 'adr', label: 'Decision Log', icon: 'fa-solid fa-book-journal-whills', color: 'text-indigo-300' },
        { id: 'ticker', label: 'Meeting Tax', icon: 'fa-solid fa-money-bill-wave', color: 'text-green-500' }
    ],
    sims: [
        { id: 'simulator', label: 'Case Study', icon: 'fa-solid fa-chess-knight', color: 'text-white' },
        { id: 'future', label: 'Future Bank', icon: 'fa-solid fa-forward', color: 'text-purple-400' },
        { id: 'roleplay', label: 'Negotiation', icon: 'fa-solid fa-user-tie', color: 'text-orange-400' },
        { id: 'conway', label: 'Conway Sim', icon: 'fa-solid fa-project-diagram', color: 'text-indigo-400' },
        { id: 'whatif', label: 'War Games', icon: 'fa-solid fa-chess-rook', color: 'text-purple-500' },
        { id: 'risksim', label: 'Risk Dojo', icon: 'fa-solid fa-scale-balanced', color: 'text-risk' },
        { id: 'escaperoom', label: 'Excel Escape', icon: 'fa-solid fa-dungeon', color: 'text-green-500' },
        { id: 'bingo', label: 'Bingo', icon: 'fa-solid fa-table-cells', color: 'text-pink-500' },
        { id: 'regsim', label: 'Reg Impact', icon: 'fa-solid fa-gavel', color: 'text-yellow-500' }
    ]
},
        
        
        // ------------------------------------------------------------------
        // METHODS
        // ------------------------------------------------------------------
  

formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
},
        
// Seek to specific time
seekVideo(sliderValue) {
    const newTime = parseFloat(sliderValue);
    
    if (this.player && this.player.seekTo) {
        this.player.seekTo(newTime, true); // true = allowSeekAhead
        this.videoCurrentTime = newTime; // Update immediately
        
        // If video was paused, play it after seeking
        if (!this.videoPlaying && this.player.playVideo) {
            this.player.playVideo();
        }
    }
},

        // Set volume (0-100)
setPlayerVolume(newVolume) {
    const volume = parseInt(newVolume);
    this.videoVolume = volume;
    
    if (this.player && this.player.setVolume) {
        this.player.setVolume(volume);
        
        // Update mute state
        if (volume === 0) {
            this.videoMuted = true;
        } else {
            this.videoMuted = false;
            this.volumeBeforeMute = volume; // Remember volume when unmuting
        }
    }
},

// Updated toggleVideoPlay method (keep existing but add interval logic)
toggleVideoPlay() {
    if (this.player && this.player.getPlayerState) {
        if (this.videoPlaying) {
            this.player.pauseVideo();
            this.videoPlaying = false;
            
            // Clear interval when paused
            if (this.updateTimeInterval) {
                clearInterval(this.updateTimeInterval);
                this.updateTimeInterval = null;
            }
        } else {
            this.player.playVideo();
            this.videoPlaying = true;
        }
    }
},

// Toggle Fullscreen
toggleFullscreen() {
    const videoContainer = document.querySelector('.group'); // The video container div
    
    if (!this.isFullscreen) {
        // Enter fullscreen
        if (videoContainer.requestFullscreen) {
            videoContainer.requestFullscreen();
        } else if (videoContainer.webkitRequestFullscreen) { /* Safari */
            videoContainer.webkitRequestFullscreen();
        } else if (videoContainer.msRequestFullscreen) { /* IE11 */
            videoContainer.msRequestFullscreen();
        }
        
        this.isFullscreen = true;
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
        
        this.isFullscreen = false;
    }
},

// Listen for fullscreen changes
initFullscreenListeners() {
    document.addEventListener('fullscreenchange', () => {
        this.isFullscreen = !!document.fullscreenElement;
    });
    
    document.addEventListener('webkitfullscreenchange', () => {
        this.isFullscreen = !!document.webkitFullscreenElement;
    });
    
    document.addEventListener('msfullscreenchange', () => {
        this.isFullscreen = !!document.msFullscreenElement;
    });
},

        
// Updated toggleVideoMute method
toggleVideoMute() {
    if (this.player) {
        if (this.videoMuted) {
            // Unmute and restore previous volume
            if (this.player.unMute) this.player.unMute();
            if (this.player.setVolume) this.player.setVolume(this.volumeBeforeMute || 50);
            
            this.videoMuted = false;
            this.videoVolume = this.volumeBeforeMute || 50;
        } else {
            // Mute and remember current volume
            this.volumeBeforeMute = this.videoVolume;
            
            if (this.player.mute) this.player.mute();
            
            this.videoMuted = true;
            this.videoVolume = 0;
        }
    }
},

  enterApp() {
    this.showLanding = false;
    localStorage.setItem('app_entered', 'true');
    
    // Properly pause/stop the video
    if (this.player && this.player.pauseVideo) {
        this.player.pauseVideo();
    }
    
    // Set videoPlaying to false
    this.videoPlaying = false;
    
    // Clear update interval
    if (this.updateTimeInterval) {
        clearInterval(this.updateTimeInterval);
        this.updateTimeInterval = null;
    }
    
    if (navigator.vibrate) navigator.vibrate(50);
    this.setupActivityTracking();
    
    setTimeout(() => {
        if (!this.isPwaPromptActive && !this.showPwaPrompt) {
            this.showDelayedPwaPrompt();
        }
    }, 60000);
}, 

        
        // Set up event listeners for activity tracking
setupActivityTracking() {
    // Reset any previous tracking
    this.resetActivityTracking();
    
    // Track clicks (anywhere on the page)
    document.addEventListener('click', () => {
        this.trackUserActivity();
    }, { passive: true });
    
    // Track scrolling
    document.addEventListener('scroll', () => {
        this.trackUserActivity();
    }, { passive: true });
    
    // Track keyboard input
    document.addEventListener('keydown', () => {
        this.trackUserActivity();
    }, { passive: true });
    
    // Track tool changes (when user selects different tools)
    const trackToolChange = () => {
        this.trackUserActivity();
    };
    
    // Watch for Alpine.js updates to currentTab
    this.$watch('currentTab', trackToolChange);
    this.$watch('currentGroup', trackToolChange);
},

        


        // Add this method to your main Alpine data object (around other methods)
copyToClipboard(text, label = "Content") {
    if (!text || text.trim() === '') {
        alert(`Nothing to copy for ${label}`);
        return;
    }
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => {
                // Show a success message
                const originalText = this.copyBtnText;
                this.copyBtnText = `✓ Copied ${label}`;
                setTimeout(() => {
                    this.copyBtnText = originalText;
                }, 2000);
                
                // Optional: Haptic feedback on mobile
                if (navigator.vibrate) navigator.vibrate(50);
            })
            .catch((err) => {
                console.error('Clipboard write failed:', err);
                alert(`Failed to copy ${label}. Please copy manually:\n\n${text}`);
            });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            const originalText = this.copyBtnText;
            this.copyBtnText = `✓ Copied ${label}`;
            setTimeout(() => {
                this.copyBtnText = originalText;
            }, 2000);
        } catch (err) {
            console.error('Fallback copy failed:', err);
            prompt(`Please copy this ${label}:`, text);
        }
        
        document.body.removeChild(textArea);
    }
},


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
    this.isPwaPromptActive = false;
    try { 
        localStorage.setItem('pwaPromptDismissed', 'true'); 
    } catch(e){}
    
    // Reset activity tracking so it doesn't trigger again
    this.resetActivityTracking();
},


        async installPwa() {
    if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            this.deferredPrompt = null;
            this.showPwaPrompt = false;
            this.isPwaPromptActive = false;
        }
    } else {
        alert("To install on iPhone:\n1. Tap the 'Share' button (square with arrow)\n2. Scroll down and tap 'Add to Home Screen'");
        this.dismissPwa();
    }
},

        handleNavClick(tab) {
            this.currentTab = tab;
            this.mobileMenuOpen = false;
            this.$nextTick(() => {
                if (tab === 'talent') this.updateTalentChart();
                if (tab === 'assessment' && this.assessmentSubmitted) this.updateGapChart();
                if (tab === 'culture') this.culturalMonitor.renderChart();
            });
        },


        copyChallengeLink() {
            const scores = this.assessmentData.flatMap(s => s.questions.map(q => q.score));
            const payload = btoa(JSON.stringify({ scores, title: "Executive Peer" }));
            const url = `${window.location.origin}${window.location.pathname}?challenger=${payload}`;
            this.copyToClipboard(url, "Challenge Link");
        },

        // ------------------------------------------------------------------
        // STANDARD PDF REPORT GENERATOR
        // ------------------------------------------------------------------
        async generatePDF() {
            if (!window.jspdf) { alert("PDF library not loaded. Please refresh."); return; }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // 1. Get Scores
            const score = this.calculateScore.total;
            const result = this.getAssessmentResult();
            
            // 2. Define Colors
            const darkBg = [15, 23, 42]; 
            const offWhite = [241, 245, 249]; 
            const grey = [148, 163, 184];
            let accentColor;
            
            // Match color to score bucket
            if (score <= 40) accentColor = [248, 113, 113]; // Red
            else if (score <= 60) accentColor = [251, 191, 36]; // Yellow
            else accentColor = [74, 222, 128]; // Green

            // 3. Draw PDF
            // Background
            doc.setFillColor(...darkBg); 
            doc.rect(0, 0, 210, 297, "F");
            
            // Header
            doc.setTextColor(...accentColor); 
            doc.setFont("helvetica", "bold"); 
            doc.setFontSize(14); 
            doc.text("THE BILINGUAL EXECUTIVE TOOLKIT // AUDIT REPORT", 20, 20);
            
            doc.setTextColor(...grey); 
            doc.setFont("helvetica", "normal"); 
            doc.setFontSize(10); 
            doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, 20, 28);
            
            doc.setDrawColor(...grey); 
            doc.line(20, 35, 190, 35);
            
            // Score
            doc.setFontSize(60); 
            doc.setTextColor(...accentColor); 
            doc.text(`${score} / 75`, 20, 60);
            
            // Title & Description
            doc.setFontSize(22); 
            doc.setTextColor(...offWhite); 
            doc.text(result.title, 20, 75);
            
            doc.setFontSize(12); 
            doc.setTextColor(...grey); 
            doc.text(doc.splitTextToSize(result.desc, 170), 20, 85);
            
            // Veto Warnings
            if(this.calculateScore.isSafetyVeto) {
                doc.setTextColor(248, 113, 113);
                doc.text("!!! SAFETY VETO APPLIED: SCORE CAPPED AT 40", 20, 110);
                doc.setFontSize(10);
                doc.text("Reason: Low Psychological Safety detected.", 20, 116);
            }
            
            // 4. Save
            doc.save("Executive_Audit_Report.pdf");
        },

        // ------------------------------------------------------------------
        // ROADMAP GENERATOR
        // ------------------------------------------------------------------
        async generateRoadmap() {
            if (!window.jspdf) { alert("PDF library loading..."); return; }
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // 1. GET SCORES
            const dataScore = this.assessmentData[0].questions.reduce((a,b)=>a+b.score,0);
            const deliveryScore = this.assessmentData[1].questions.reduce((a,b)=>a+b.score,0);
            const cultureScore = this.assessmentData[2].questions.reduce((a,b)=>a+b.score,0);
            const total = this.calculateScore.total;
            
            // 2. DIAGNOSE THE "BURNING PLATFORM" (Weakest Link)
            let focusArea = "General Optimization";
            let chapterRef = "Chapter 7: The Playbook";
            let specificTask = "Launch a Lighthouse Pilot";
            
            if (cultureScore <= 8) {
                focusArea = "Toxic Culture";
                chapterRef = "Chapter 3: Cultural Debt & Chapter 8: Leadership";
                specificTask = "Run a 'Bad News' Audit (kill the Green Light lies).";
            } else if (dataScore <= 8) {
                focusArea = "Data Swamp";
                chapterRef = "Chapter 2: Data Millstone & Chapter 5: Governance";
                specificTask = "Map the 'Horror Path' of a single report.";
            } else if (deliveryScore <= 8) {
                focusArea = "Waterfall Process";
                chapterRef = "Chapter 4: Agile Mindset & Chapter 6: Project to Product";
                specificTask = "Automate one compliance check in the CI/CD pipeline.";
            }

            // 3. GENERATE PDF DESIGN
            
            // Header / Navy Background
            doc.setFillColor(21, 34, 56); // #152238 (Navy)
            doc.rect(0, 0, 210, 40, "F");
            
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
        
            // Dynamic Title Logic
            const title = this.teamManager && this.teamManager.activeTeam 
                ? `TEAM PLAYBOOK: ${this.teamManager.activeTeam.name.toUpperCase()}` 
                : "TRANSFORMATION PLAYBOOK";
            
            doc.text(title, 105, 20, null, "center");
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Generated by The Bilingual Executive App", 105, 30, null, "center");

            // Score Summary
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.text(`Total Maturity Score: ${total}/75`, 20, 55);

                        if (this.teamManager && this.teamManager.activeTeam) {
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(`Team Alignment: ${this.teamManager.alignmentScore}%`, 20, 62);
            }

            
            // The Diagnosis
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text("PRIMARY BOTTLENECK DETECTED:", 20, 70);
            
            doc.setTextColor(239, 68, 68); // Red for risk
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            doc.text(focusArea.toUpperCase(), 20, 80);

            // 90-Day Plan Box
            doc.setDrawColor(46, 139, 131); // Teal
            doc.setLineWidth(1);
            doc.rect(15, 90, 180, 130);

            doc.setTextColor(46, 139, 131); // Teal
            doc.setFontSize(14);
            doc.text("YOUR 90-DAY ACTION PLAN", 105, 100, null, "center");

            // Days 1-30
            doc.setTextColor(0,0,0);
            doc.setFontSize(12);
            doc.text("DAYS 1-30: DIAGNOSE & PROTECT", 25, 115);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`- Read ${chapterRef}.`, 30, 122);
            doc.text(`- ACTION: ${specificTask}`, 30, 128);
            doc.text("- Identify your 'Lighthouse' pilot team.", 30, 134);

            // Days 31-60
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("DAYS 31-60: THE LIGHTHOUSE", 25, 150);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("- Establish the 'Regulatory Sandbox' (Waiver).", 30, 157);
            doc.text("- Deploy first MVP to internal users.", 30, 163);
            doc.text("- Kill one 'Zombie Project' to free up budget.", 30, 169);

            // Days 61-90
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text("DAYS 61-90: SHOW & SCALE", 25, 185);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("- Conduct the 'Live Demo' in the Boardroom.", 30, 192);
            doc.text("- Measure 'Time to Value' vs old process.", 30, 198);
            doc.text("- Recruit first 'Bilingual' Product Owner.", 30, 204);

            // Footer
            doc.setFont("helvetica", "italic");
            doc.setTextColor(150, 150, 150);
            doc.text("This plan is automated. Execution is human. Good luck.", 105, 280, null, "center");

            doc.save("Bilingual_Transformation_Map.pdf");
        },

updateTalentChart() {
    // FIX: Stop if Chart.js isn't loaded yet
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js not loaded yet. Retrying...");
        setTimeout(() => this.updateTalentChart(), 500);
        return;
    }

    // Wait for DOM to be ready
    setTimeout(() => {
        const ctx = document.getElementById('talentChart');
        if (!ctx) {
            console.error("Talent chart canvas not found");
            return;
        }
        
        // Destroy old chart if exists
        if (this.talentChartInstance) {
            this.talentChartInstance.destroy();
        }
        
        // Get current skill values
        const labels = this.talentSkills.map(s => s.label);
        const values = this.talentSkills.map(s => s.val);
        const bilingualStandard = [4, 5, 5, 4, 4]; // Ideal shape
        
        // Create new chart
        this.talentChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'You',
                        data: values,
                        backgroundColor: 'rgba(244, 114, 182, 0.2)',
                        borderColor: '#f472b6',
                        borderWidth: 2,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#f472b6',
                        pointRadius: 4
                    },
                    {
                        label: 'Bilingual Standard',
                        data: bilingualStandard,
                        backgroundColor: 'rgba(148, 163, 184, 0.1)',
                        borderColor: '#475569',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            display: false
                        },
                        grid: {
                            color: '#334155'
                        },
                        angleLines: {
                            color: '#334155'
                        },
                        pointLabels: {
                            color: '#f1f5f9',
                            font: {
                                size: 10,
                                family: '"JetBrains Mono", monospace'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }, 100);
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
                            { label: 'You', data: my, borderColor: '#4ade80', backgroundColor: 'rgba(74, 222, 128, 0.2)' }, 
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
        // STATIC DATA
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

        // --- NEW: GENERATE STRATEGIC AUDIT PROMPT ---
        generateAuditPrompt() {
            // 1. Get Section Scores
            const dataScore = this.assessmentData[0].questions.reduce((a,b)=>a+b.score,0);
            const deliveryScore = this.assessmentData[1].questions.reduce((a,b)=>a+b.score,0);
            const cultureScore = this.assessmentData[2].questions.reduce((a,b)=>a+b.score,0);
            const total = dataScore + deliveryScore + cultureScore;

            // 2. Identify the "Burning Platform" (Lowest Score)
            const scores = [
                { id: 'Data Velocity', val: dataScore, msg: "Data is a bottleneck. We cannot get insights fast enough." },
                { id: 'Agile Delivery', val: deliveryScore, msg: "Time-to-Market is too slow. Manual gates are killing velocity." },
                { id: 'Organizational Culture', val: cultureScore, msg: "Culture is fear-based. Information flow is blocked." }
            ];
            const weakness = scores.sort((a,b) => a.val - b.val)[0];

            // 3. Build the Generic Prompt
            return `ACT AS: A Chief Strategy Officer presenting to the Board.

## THE CONTEXT (AUDIT DATA)
I have assessed our maturity (Scale 0-75).
- **TOTAL SCORE:** ${total}/75
- **Data Score:** ${dataScore}/25
- **Delivery Score:** ${deliveryScore}/25
- **Culture Score:** ${cultureScore}/25

## THE CRITICAL BOTTLENECK
The assessment identifies **${weakness.id}** as our primary risk factor.
Context: ${weakness.msg}

## YOUR TASK
Generate a **Strategic Executive Brief** (Structured Report).
1. **The Executive Summary:** State the problem in financial terms (Cost of Delay, Risk Exposure), avoiding technical jargon.
2. **The Strategic Pivot:** Propose 1 radical structural change to fix ${weakness.id}.
3. **The 30-Day Roadmap:** Bullet points for immediate execution.

TONE: Professional, objective, high-agency.`;
        },
        
        
        getAssessmentResult() {
            const s = this.calculateScore.total;
            if (s <= 40) return { title: "DANGER ZONE", desc: "Data Swamp. Stop buying AI. Fix culture first." };
            if (s <= 60) return { title: "TRANSITIONING", desc: "Pockets of agility exist but are crushed by legacy governance." };
            return { title: "AGILE BANK", desc: "Market Leader capability. Data flows fast." };
        },

        
        getAssessmentColor() { 
            const s = this.calculateScore.total; 
            return s<=40?'text-risk':s<=60?'text-warn':'text-primary'; 
        },
        
        async finishAssessment() { 
            this.assessmentSubmitted = true; 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 

            // 1. NEW: Sync with Team Dashboard (if active)
            if (this.teamManager && this.teamManager.activeTeam) {
                const simpleScores = this.assessmentData.flatMap(s => s.questions.map(q => q.score));
                // We use await here to ensure data is sent before potentially navigating away
                await this.teamManager.submitScore(simpleScores, this.selectedTitle, this.calculateScore.total);
            }

            // 2. EXISTING: Update Gap Chart (if in Challenger Mode)
            if (this.challengerData) {
                this.$nextTick(() => this.updateGapChart()); 
            }
        },
        
        resetAssessment() { 
            this.assessmentSubmitted = false; 
            try { localStorage.removeItem('bilingual_scores'); } catch(e){} 
            this.assessmentData.forEach(s => s.questions.forEach(q => q.score = 3)); 
        },

async submitAndBenchmark() {
            // 1. Validation
            if (!this.selectedIndustry || !this.selectedTitle) {
                alert("Please select your Organization Type and Role at the top of the Assessment before benchmarking.");
                return;
            }

            this.benchmarkLoading = true;
            const myScore = this.calculateScore.total;
            let total = 0;
            let lower = 0;
            let source = "Live Satellite"; // Default source

            try {
                // 2. Try Supabase (Online Mode)
                if (this.supabase) {
                    // A. Upload your score
                    await this.supabase.from('benchmarks').insert({ 
                        score: myScore, 
                        industry: this.selectedIndustry 
                    });

                    // B. Get counts from DB
                    const { count: dbTotal } = await this.supabase
                        .from('benchmarks')
                        .select('*', { count: 'exact', head: true });
                    
                    const { count: dbLower } = await this.supabase
                        .from('benchmarks')
                        .select('*', { count: 'exact', head: true })
                        .lt('score', myScore);

                    if (dbTotal !== null) {
                        total = dbTotal;
                        lower = dbLower;
                    } else {
                        throw new Error("Database returned null");
                    }
                } else {
                    throw new Error("Supabase not initialized");
                }

            } catch (err) {
                // 3. Fallback to Offline Mode (If DB fails or is blocked)
                console.warn("Switching to Offline Benchmarks:", err);
                source = "Offline Database";

                // Use the variable we created at the bottom of the file
                if (typeof offlineBenchmarks !== 'undefined') {
                    total = offlineBenchmarks.length;
                    // Count how many people in the list have a lower score than you
                    lower = offlineBenchmarks.filter(b => b.score < myScore).length;
                } else {
                    alert("Could not connect to benchmark database.");
                    this.benchmarkLoading = false;
                    return;
                }
            }

            // 4. Calculate Percentile (Same math for both Online & Offline)
            this.totalBenchmarks = total;
            let percentile = 0;
            if (total > 0) {
                const betterThanPercentage = (lower / total) * 100;
                percentile = Math.max(1, Math.round(100 - betterThanPercentage));
            }

            // 5. Generate Message based on Percentile
            let msg = "";
            if (percentile <= 20) msg = "You are leading the market. Your architecture is an asset.";
            else if (percentile >= 50) msg = "You are lagging behind the Fintech Tsunami. Immediate intervention required.";
            else msg = "You are in the pack. Transformation is critical to survive.";

            // 6. Display Result
            this.percentileResult = { rank: `Top ${percentile}%`, msg: msg };
            
            // Optional: Small toast to show if we used offline data
            if (source === "Offline Database") {
                console.log("Benchmark calculated using offline dataset.");
            }
            
            this.benchmarkLoading = false;
        },
        
        getMatrixResult() {
            const { x, y } = this.matrixCoords;
            if (y > 60 && x < 40) return { strategy: "BUILD", desc: "Critical IP. High value, low complexity. Keep in-house." };
            if (y > 60 && x >= 40) return { strategy: "BUY", desc: "High value but hard to build. Buy speed (SaaS/Partner)." };
            if (y <= 60 && x >= 60) return { strategy: "OUTSOURCE", desc: "Non-core commodity. Use standard off-the-shelf tools." };
            return { strategy: "DEPRIORITIZE", desc: "Low value. Don't waste resources." };
        },

        // --- NEW: MATRIX AI PROMPT GENERATOR ---
        generateMatrixPrompt() {
            const x = this.matrixCoords.x; // Technical Complexity
            const y = this.matrixCoords.y; // Strategic Importance
            const result = this.getMatrixResult(); // Re-use existing logic

            // 1. Diagnose the specific strategic implication
            let rationale = "";
            let risk = "";

            if (y > 60 && x < 40) { 
                // BUILD (High Imp, Low Comp)
                rationale = "This is our 'Secret Sauce'. It differentiates us in the market and is feasible to build in-house.";
                risk = "Risk: Over-engineering. We must ensure we don't build a 'Gold Plated' solution.";
            } else if (y > 60 && x >= 40) {
                // PARTNER/BUY (High Imp, High Comp)
                rationale = "This is critical, but too complex to build from scratch. Speed is the priority.";
                risk = "Risk: Vendor Lock-in. We need a strong API abstraction layer to protect our core.";
            } else if (y <= 60 && x >= 60) {
                // OUTSOURCE (Low Imp, High Comp)
                rationale = "This is 'Plumbing'. It's hard to do but adds zero customer value. It's a commodity.";
                risk = "Risk: Distraction. Every hour our best engineers spend on this is an hour lost on innovation.";
            } else {
                // DEPRIORITIZE (Low Imp, Low Comp)
                rationale = "This is a 'Nice to Have'. Low value return.";
                risk = "Risk: Opportunity Cost. We should not be spending budget here.";
            }

            return `ACT AS: A Chief Technology Officer (CTO) and Investment Committee Advisor.

## THE DECISION CONTEXT (BUILD vs BUY)
We are evaluating a technology initiative. I have mapped it on the Strategy Matrix:
- **Strategic Importance:** ${y}% (Does it differentiate us?)
- **Technical Complexity:** ${x}% (How hard is it to build?)

## THE VERDICT: "${result.strategy}"
${result.desc}

## LOGIC
- **Rationale:** ${rationale}
- **Primary Risk:** ${risk}

## YOUR MISSION
Draft a **Decision Memo** for the CFO/Board to approve this path.
1. **The Executive Summary:** Clearly state why we are choosing to ${result.strategy}.
2. **The Financial Case:** Explain the ROI logic (e.g., if Building: "Why Capitalizing this IP creates asset value." | If Buying: "Why OpEx is better than slowing down market entry.").
3. **The Guardrails:** Define 3 constraints to ensure this project doesn't spiral out of control.

TONE: Decisive, fiscally responsible, and technically sound.`;
        },
        
        getCompassResult() {
            const { x, y } = this.compassCoords;
            if (y > 50 && x > 50) return { title: "INNOVATION LEADER (NE)", desc: "Fast growth, but check your safety brakes." };
            if (y <= 50 && x <= 50) return { title: "TRADITIONAL BANKER (SW)", desc: "Safe and cheap, but you are slowly dying." };
            if (y > 50 && x <= 50) return { title: "RISK TAKER (NW)", desc: "High value but high control. Hard to sustain." };
            return { title: "DIGITAL FACTORY (SE)", desc: "Fast execution, but are you building the right thing?" };
        },

        // --- NEW: COMPASS AI PROMPT GENERATOR ---
        generateCompassPrompt() {
            const x = this.compassCoords.x; // Risk vs Speed
            const y = this.compassCoords.y; // Value vs Cost
            const result = this.getCompassResult(); // Re-use existing logic

            // 1. Diagnose the specific quadrant problem
            let diagnosis = "";
            let strategy = "";

            if (y > 50 && x > 50) { 
                // NE: Innovation Leader
                diagnosis = "We are moving fast and building high-value products, BUT we risk 'Burnout' or 'reckless scaling'.";
                strategy = "Focus on 'Sustainable Pace' and 'Platform Stability' to ensure we don't crash.";
            } else if (y <= 50 && x <= 50) {
                // SW: Traditional Banker
                diagnosis = "We are stuck in 'Analysis Paralysis'. Low speed, cost-cutting focus. We are slowly becoming irrelevant.";
                strategy = "We need a 'Regulatory Sandbox' to test ideas faster without waiting for permission.";
            } else if (y > 50 && x <= 50) {
                // NW: The Perfectionist / Risk Taker
                diagnosis = "We build great things, but we build them too slowly. We are gold-plating features.";
                strategy = "Adopt 'MVP Mindset'. Ship imperfect code faster to get market feedback.";
            } else {
                // SE: Digital Factory
                diagnosis = "We are shipping features fast, but they don't move the P&L needle. We are a 'Feature Factory'.";
                strategy = "Stop measuring 'Velocity'. Start measuring 'Outcome'. Kill low-value projects.";
            }

            return `ACT AS: A Chief Digital Officer and Strategy Consultant.

## THE TELEMETRY (MY COMPASS POSITION)
I have plotted my organization's execution style on a matrix:
- **Vertical Axis (North/South):** ${y > 50 ? "High Business Value" : "Cost Center Focus"} (${y}%)
- **Horizontal Axis (West/East):** ${x > 50 ? "High Speed/Velocity" : "Risk Averse/Control"} (${x}%)

## THE DIAGNOSIS: "${result.title}"
${result.desc}
${diagnosis}

## YOUR MISSION
Draft a **Strategic Pivot Memo** for the Executive Committee.
1. **The Reality Check:** Explain why our current position of "${result.title}" is dangerous in the long run.
2. **The Pivot:** Detail the specific ${strategy}
3. **The Culture Hack:** Give me one specific phrase to ban in meetings (e.g., "We've always done it this way") and one phrase to start using.

TONE: Visionary, urgent, but grounded in banking reality.`;
        },

        
        getLighthouseStatus() { 
            const c = this.lighthouseData.filter(i=>i.checked).length; 
            if(c===10) return {title:"GREEN LIGHT", desc:"Launch.", text:"text-primary", border:"border-primary bg-primary/10"}; 
            if(c>=8) return {title:"AMBER LIGHT", desc:"Proceed with caution.", text:"text-warn", border:"border-warn bg-warn/10"}; 
            return {title:"RED LIGHT", desc:"STOP.", text:"text-risk", border:"border-risk bg-risk/10"}; 
        },

        dictionary: [ 
            { banker: "Technical Debt", tech: "Legacy Refactoring", translation: "Interest on past shortcuts. It's making your P&L brittle." }, 
            { banker: "Op-Ex Efficiency", tech: "CI/CD Pipeline", translation: "Automated work that replaces manual human error." }, 
            { banker: "Market Responsiveness", tech: "Microservices", translation: "Breaking the bank into Legos so we can change one part without breaking the rest." }, 
            { banker: "Data Governance", tech: "Data Mesh", translation: "Moving from a central bottleneck to decentralized ownership." }, 
            { banker: "Business Continuity", tech: "Chaos Engineering", translation: "Testing the bank by intentionally breaking things to ensure it survives real disasters." } 
        ],
        
        get filteredDictionary() { 
            const q = this.searchQuery.toLowerCase(); 
            return this.dictionary.filter(i => i.banker.toLowerCase().includes(q) || i.tech.toLowerCase().includes(q) || i.translation.toLowerCase().includes(q)); 
        },

  // ---  LIGHTHOUSE ---

        lighthouseData: [
            {category:"Value",text:"Customer Facing?"},
            {category:"Value",text:"Solving Pain?"},
            {category:"Value",text:"Unarguable Metric?"},
            {category:"Feasibility",text:"Decoupled?"},
            {category:"Feasibility",text:"Anti-Scope Defined?"},
            {category:"Feasibility",text:"MVP in 90 Days?"},
            {category:"Ecosystem",text:"Two-Pizza Team?"},
            {category:"Ecosystem",text:"Sandbox Waiver?"},
            {category:"Ecosystem",text:"Zero Dependencies?"},
            {category:"Ecosystem",text:"Air Cover?"}
        ].map(i=>({...i, checked:false})),
        
        lighthouseCount() { 
            return this.lighthouseData.filter(i=>i.checked).length; 
        },

        generateLighthousePrompt() {
            const score = this.lighthouseCount;
            const status = this.getLighthouseStatus();
            
            // 1. Identify specific gaps
            const missingItems = this.lighthouseData
                .filter(i => !i.checked)
                .map(i => `[MISSING] ${i.category}: ${i.text}`)
                .join("\n");

            // 2. Determine Strategy based on Score
            let strategy = "";
            let action = "";

            if (score === 10) {
                strategy = "GO FOR LAUNCH. The initiative is fully bilingual (Valuable + Feasible).";
                action = "Draft a 'Launch Announcement' focusing on speed to market and immediate value capture.";
            } else if (score >= 8) {
                strategy = "PROCEED WITH CAUTION. We are taking on specific technical or value risks.";
                action = "Draft a 'Risk Mitigation Plan' specifically addressing the missing items below. We need a waiver to proceed.";
            } else {
                strategy = "NO GO. STOP THE LINE. This project is a 'Zombie' in the making.";
                action = "Draft a 'Kill/Pivot Memo'. Explain why continuing now would waste resources, and propose a specific pivot to fix the gaps.";
            }

            return `ACT AS: A Product Innovation Lead and Venture Capitalist.

## THE PITCH EVALUATION (LIGHTHOUSE SCORE)
I have run our initiative through the Lighthouse Criteria.
- **SCORE:** ${score}/10
- **STATUS:** ${status.title}
- **VERDICT:** ${strategy}

## THE GAP ANALYSIS
The following criteria were NOT met:
${missingItems || "None. All systems go."}

## YOUR MISSION
${action}

1. **The Hard Truth:** Assess the impact of the missing criteria. Why does missing this make us fail?
2. **The Decision:** Authorize the next step (Launch, Delay, or Kill).
3. **The 30-Day Fix:** If we are delaying, what exactly must be built/proved in the next sprint to turn this Green?

TONE: Objective, high-standards, focused on resource efficiency.`;
        },
        //==============
        repairKitData: [
            {symptom:"The Feature Factory", diagnosis:"High velocity, no value. Measuring output not outcome.", prescription:["Stop celebrating feature counts.", "Audit value with PO."]}, 
            {symptom:"The Cloud Bill Shock", diagnosis:"Lift and Shift strategy. No FinOps.", prescription:["Implement FinOps ticker.", "Auto-shutdown non-prod servers."]}, 
            {symptom:"The Agile Silo", diagnosis:"Optimized coding but ignored governance.", prescription:["Expand Definition of Done.", "Embed Compliance in squad."]}, 
            {symptom:"Zombie Agile", diagnosis:"Process without purpose.", prescription:["Ban 'Agile' word.", "Refocus on enemy."]}
        ],
        
        boardRisks: [
            {title:"1. Strategic Risk", subtitle:"The Dumb Pipe", lie:"'Our app has 4.5 stars.'", truth:"Retaining customers but losing value. Used only for balance checks.", question:"Show me Share of Wallet for digital natives."}, 
            {title:"2. Regulatory Risk", subtitle:"The Data Swamp", lie:"'Data is centralized.'", truth:"We are drowning. We have petabytes with no governance.", question:"Can we generate a liquidity report in 10 minutes?"}, 
            {title:"3. Talent Risk", subtitle:"The Missing Bench", lie:"'Hiring top talent.'", truth:"Hiring mercenaries. Missionaries are leaving.", question:"% of Change budget spent on vendors?"}
        ],

                reportingData: [
            { metric: "Velocity", financial: "Time-to-Revenue", script: "We reduced 'Time-to-Revenue' from 6 months to 2 weeks. We start earning interest 170 days earlier." },
            { metric: "Cycle Time", financial: "Cost of Delay", script: "By cutting cycle time, we avoided the $2M 'Cost of Delay' associated with missing the Q4 window." },
            { metric: "Tech Debt", financial: "Risk Exposure", script: "We retired a legacy liability. We reduced the probability of a 24-hour outage (valued at $10M) to near zero." },
            { metric: "Stability", financial: "Brand Reputation", script: "We improved system uptime by 40%, directly correlating to a 15% drop in Support costs." },
            { metric: "Flow Efficiency", financial: "OpEx Ratio", script: "We identified that 80% of labor cost was wasted on 'Waiting'. We increased the ROI of every dev hour by 4x." }
        ],


        glossaryData: [
            {term:"Agentic AI",def:"AI that takes action (moves funds), not just generates text."}, 
            {term:"API",def:"Digital glue allowing systems to talk. Enables Open Banking."}, 
            {term:"Data Mesh",def:"Decentralized ownership; domains own their data products."}, 
            {term:"FinOps",def:"Bringing financial accountability to Cloud spend."}, 
            {term:"Tech Debt",def:"Implied cost of rework from choosing easy solutions."}
        ],
        
        get filteredGlossary() { 
            const q = this.glossarySearch.toLowerCase(); 
            return !q ? this.glossaryData : this.glossaryData.filter(i=>i.term.toLowerCase().includes(q)||i.def.toLowerCase().includes(q)); 
        },
        
// ------------------------------------------------------------------
        // KPI DESIGNER (The Prompt Architect Wizard)
        // ------------------------------------------------------------------
        kpiDesigner: {
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
        },

        // ------------------------------------------------------------------
        // SQUAD BUILDER (Deterministic Math Engine)
        // ------------------------------------------------------------------
        squadBuilder: {
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
        },

        // ------------------------------------------------------------------
        // EXCEL FACTORY EXPOSURE CALCULATOR (Deterministic FinOps)
        // ------------------------------------------------------------------
        excelCalc: {
            inputs: {
                process_name: '',
                steps: 50,      // Manual copy-pastes/edits per run
                frequency: 12,  // Runs per year
                salary: 75,     // Hourly cost of analyst ($)
                criticality: 2  // 1=Internal, 2=Regulatory, 3=Customer Facing
            },
            result: null,

            calculate() {
                const i = this.inputs;
                
                // 1. Calculate OpEx Waste (The "Hidden Tax")
                // Assumption: Each manual step takes ~2 mins (finding, copying, checking)
                const hoursPerRun = (i.steps * 2) / 60;
                const annualHours = hoursPerRun * i.frequency;
                const annualCost = Math.round(annualHours * i.salary);

                // 2. Calculate Error Probability (The "Swiss Cheese Model")
                // Industry standard: Human error rate is ~1% per manual action without validation
                // Probability of at least one error = 1 - (0.99 ^ steps)
                const errorProb = Math.round((1 - Math.pow(0.99, i.steps)) * 100);

                // 3. Calculate Risk Exposure (The "Liability Bomb")
                // Base impact cost * Criticality Multiplier
                let baseImpact = 10000; // Cost to fix internal error
                let criticalLabel = "Internal Admin";
                
                if (i.criticality == 2) { 
                    baseImpact = 150000; // Regulatory fine / Audit rework
                    criticalLabel = "Regulatory Reporting";
                }
                if (i.criticality == 3) { 
                    baseImpact = 2000000; // Reputational damage / Customer churn
                    criticalLabel = "Customer Facing";
                }
                
                // Weighted Risk = Probability * Impact
                const riskExposure = Math.round((errorProb / 100) * baseImpact);

                // 4. Recommendation Logic
                let verdict = "MONITOR";
                let action = "Standard Data Quality Checks";
                
                if (annualCost > 50000 || errorProb > 80) {
                    verdict = "AUTOMATE";
                    action = "Migrate to Python/SQL Pipeline immediately.";
                }
                if (i.criticality == 3 && errorProb > 20) {
                    verdict = "KILL SWITCH";
                    action = "Process is too risky for manual handling. Cease or Re-platform.";
                }

                this.result = {
                    annualCost: annualCost,
                    annualHours: Math.round(annualHours),
                    errorProb: errorProb,
                    riskExposure: riskExposure,
                    criticalLabel: criticalLabel,
                    verdict: verdict,
                    action: action
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateExcelPrompt() {
                if (!this.result) return "Please calculate first.";
                const r = this.result;
                const i = this.inputs;

                return `ACT AS: A Chief Financial Officer (CFO) and Risk Officer.

## THE AUDIT FINDINGS (SHADOW IT)
I have audited a manual process named "${i.process_name || 'Untitled Process'}" currently running in Excel.
- **Process Type:** ${r.criticalLabel}
- **Complexity:** ${i.steps} manual touchpoints per run.
- **Calculated Error Probability:** ${r.errorProb}% per run (based on standard human error rates).

## THE FINANCIAL EXPOSURE
1. **Guaranteed Cash Waste:** We are burning **$${r.annualCost.toLocaleString()}** per year in manual labor (${r.annualHours} hours) just to maintain this.
2. **Liability Risk:** Given the criticality, the probabilistic risk exposure is **$${r.riskExposure.toLocaleString()}** (Probability x Impact).

## YOUR MISSION
Write a **"Business Case for Automation"** to secure budget for IT to replace this spreadsheet with a proper Data Product.
1. **The Argument:** Explain why paying an engineer to automate this is cheaper than the risk of keeping it manual.
2. **The "Fat Finger" Scenario:** Describe a hypothetical scenario where a single copy-paste error in this specific process causes a disaster.
3. **The ROI:** If automation costs $25k, calculate the payback period based on the OpEx savings alone.

TONE: Fiscally responsible, risk-averse, urgent.`;
            }
        },

        // ------------------------------------------------------------------
        // LIGHTHOUSE ROI CALCULATOR (Deterministic Financial Engine)
        // ------------------------------------------------------------------
        lighthouseROI: {
            inputs: {
                name: '',
                duration_weeks: 12,
                squad_cost_per_week: 15000,
                software_cost: 25000, // One-time Lic/Setup
                revenue_generated: 0, // Annual
                cost_avoided: 150000, // Annual
                old_cycle_time: 20,   // Weeks
                new_cycle_time: 2     // Weeks
            },
            results: null,

            calculate() {
                if (!this.inputs.name) return alert("Please name the project.");
                
                const i = this.inputs;
                
                // 1. COSTS (Investment)
                const laborCost = i.duration_weeks * i.squad_cost_per_week;
                const totalInvestment = laborCost + parseInt(i.software_cost);
                
                // 2. RETURNS (Annualized Value)
                const annualValue = parseInt(i.revenue_generated) + parseInt(i.cost_avoided);
                const netProfit1Year = annualValue - totalInvestment;
                
                // 3. ROI %
                const roiPercent = Math.round(((annualValue - totalInvestment) / totalInvestment) * 100);

                // 4. Payback Period (Months)
                // (Investment / Monthly Value)
                const monthlyValue = annualValue / 12;
                let paybackMonths = (totalInvestment / monthlyValue).toFixed(1);
                if (monthlyValue <= 0) paybackMonths = "Never";

                // 5. Cost of Delay (CoD)
                // Value per week lost if we delay launch
                const weeklyValue = Math.round(annualValue / 52);

                // 6. Speed Multiplier
                const speedFactor = (i.old_cycle_time / i.new_cycle_time).toFixed(1);

                // 7. Verdict Logic
                let verdict = "MARGINAL";
                let color = "text-yellow-500";
                
                if (roiPercent > 300 && paybackMonths < 6) {
                    verdict = "NO BRAINER";
                    color = "text-green-400";
                } else if (roiPercent < 0) {
                    verdict = "MONEY PIT";
                    color = "text-red-500";
                }

                this.results = {
                    totalInvestment,
                    annualValue,
                    netProfit1Year,
                    roiPercent,
                    paybackMonths,
                    weeklyValue, // Cost of Delay
                    speedFactor,
                    verdict,
                    color
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateROIPrompt() {
                if (!this.results) return "Calculate metrics first.";
                const r = this.results;
                const i = this.inputs;

                return `ACT AS: A Chief Financial Officer (CFO) and Strategy Consultant.

## THE INVESTMENT CASE (DATA)
I am pitching a technology pilot ("${i.name}"). Here are the hard numbers:
- **Total Ask (CapEx/OpEx):** $${r.totalInvestment.toLocaleString()}
- **Projected 1-Year ROI:** ${r.roiPercent}%
- **Payback Period:** ${r.paybackMonths} Months
- **Agile Velocity Gain:** ${r.speedFactor}x faster than legacy process.

## THE HIDDEN METRIC: COST OF DELAY
We lose **$${r.weeklyValue.toLocaleString()} in value every single week** we wait to approve this.

## YOUR MISSION
Write a **"Board Defense Script"** to secure funding.
1. **The "No Brainer" Hook:** Summarize the ROI and Payback period in one aggressive sentence.
2. **The Speed Defense:** Explain why the ${r.speedFactor}x speed increase creates "Compound Strategic Value" beyond just the money.
3. **The "Cost of Inaction" closing:** Use the Cost of Delay ($${r.weeklyValue.toLocaleString()}/week) to make *doing nothing* sound more expensive than *doing something*.

TONE: Fiscally conservative but strategically aggressive. Use terms like "Free Cash Flow" and "Asset Velocity".`;
            }
        },

        // ------------------------------------------------------------------
        // FUTURE BANK SIMULATOR (Interactive + Math Engine)
        // ------------------------------------------------------------------
        futureBank: {
            activeScenario: null,
            year: 2026,
            metrics: { profit: 0, customers: 0, efficiency: 0, techDebt: 0 },
            isPlaying: false,
            timer: null,
            activeEvent: null, // Stores the current crisis
            decisionLog: [],   // Tracks user choices for the AI prompt
            
            // The 3 Core Paths
            scenarios: [
                {
                    id: 'ai_first',
                    title: 'The Bionic Bank',
                    icon: 'fa-robot',
                    color: 'text-purple-400',
                    desc: 'Aggressive automation. High initial cost (J-Curve), exponential payoff.',
                    baseGrowth: 1.15, 
                    efficiencyGain: 0.05, 
                    riskFactor: 0.2 
                },
                {
                    id: 'partnership',
                    title: 'The Invisible Bank',
                    icon: 'fa-handshake',
                    color: 'text-green-400',
                    desc: 'Embedded Finance. Low brand visibility, massive volume via Partners.',
                    baseGrowth: 1.25, 
                    efficiencyGain: 0.02, 
                    riskFactor: 0.1
                },
                {
                    id: 'fortress',
                    title: 'The Legacy Fortress',
                    icon: 'fa-shield-halved',
                    color: 'text-risk',
                    desc: 'Defensive posture. Cost cutting and compliance focus.',
                    baseGrowth: 1.03, 
                    efficiencyGain: -0.01, 
                    riskFactor: 0.05
                }
            ],

            // The Crisis Database (Triggered at specific years)
            events: {
                2027: {
                    title: "CRISIS: THE CLOUD OUTAGE",
                    desc: "A major vendor outage has taken down mobile banking for 4 hours. The regulator is on the phone.",
                    choices: [
                        { label: "Public Apology & Refund", effect: "churn_reduction", cost: 50, debt: 0, msg: "Expensive, but saved the brand." },
                        { label: "Blame the Vendor", effect: "churn_increase", cost: 0, debt: 0, msg: "Saved cash, but customers are angry." },
                        { label: "Accelerate Multi-Cloud", effect: "debt_reduction", cost: 200, debt: -15, msg: "Strategic pivot. High cost, long-term stability." }
                    ]
                },
                2029: {
                    title: "OPPORTUNITY: THE FINTECH CRASH",
                    desc: "Interest rates spiked. A major Neo-Bank competitor is insolvent. Assets are cheap.",
                    choices: [
                        { label: "Acquire for Tech Stack", effect: "tech_boost", cost: 500, debt: -20, msg: "Bought their code to replace ours." },
                        { label: "Acquire for Customers", effect: "growth_boost", cost: 300, debt: 10, msg: "Bought their users. Integration will be messy." },
                        { label: "Let them Die", effect: "efficiency", cost: 0, debt: 0, msg: "Preserved capital. Conservative play." }
                    ]
                }
            },

            selectScenario(id) {
                this.activeScenario = this.scenarios.find(s => s.id === id);
                this.year = 2026;
                this.decisionLog = [];
                // Reset Metrics
                this.metrics = { 
                    profit: 1000, // $1.0B
                    customers: 5, // 5M
                    efficiency: 60, // Cost/Income Ratio
                    techDebt: 20 // Index 0-100
                };
                this.playSimulation();
            },

            playSimulation() {
                this.isPlaying = true;
                this.activeEvent = null;
                
                this.timer = setInterval(() => {
                    // Check for Events BEFORE advancing year
                    if ((this.year === 2027 || this.year === 2029) && !this.isEventResolved(this.year)) {
                        this.triggerEvent(this.year);
                        return; // Pause loop
                    }

                    if (this.year < 2030) {
                        this.year++;
                        this.calculateYearlyMath();
                    } else {
                        clearInterval(this.timer);
                        this.isPlaying = false;
                    }
                }, 1500);
            },

            triggerEvent(year) {
                clearInterval(this.timer); // Pause Time
                this.activeEvent = { ...this.events[year], year: year };
            },

            resolveEvent(choice) {
                // 1. Apply Immediate Effects
                this.metrics.profit -= choice.cost;
                this.metrics.techDebt = Math.max(0, this.metrics.techDebt + choice.debt);
                
                // 2. Apply Special Effects
                if (choice.effect === 'churn_increase') this.metrics.customers *= 0.9;
                if (choice.effect === 'churn_reduction') this.metrics.customers *= 1.05; // Loyalty boost
                if (choice.effect === 'growth_boost') this.metrics.customers += 1.5; // +1.5M users
                if (choice.effect === 'tech_boost') this.metrics.efficiency -= 5; 

                // 3. Log for AI
                this.decisionLog.push({ year: this.activeEvent.year, event: this.activeEvent.title, decision: choice.label, outcome: choice.msg });

                // 4. Resume
                this.activeEvent = null;
                this.playSimulation();
            },

            isEventResolved(year) {
                return this.decisionLog.some(d => d.year === year);
            },

            calculateYearlyMath() {
                const s = this.activeScenario;
                
                // J-Curve Logic
                let growth = s.baseGrowth;
                if (s.id === 'ai_first' && this.year === 2027) growth = 0.9; // The dip
                if (s.id === 'ai_first' && this.year >= 2029) growth = 1.35; // The rocket

                this.metrics.profit = Math.round(this.metrics.profit * growth);
                
                // Efficiency Drifts
                this.metrics.efficiency = Math.max(30, this.metrics.efficiency - (s.efficiencyGain * 100));
                
                // Tech Debt Drifts (Fortress rots, others improve slightly)
                if (s.id === 'fortress') this.metrics.techDebt += 5;
                else this.metrics.techDebt = Math.max(5, this.metrics.techDebt - 2);
            },

            // --- PROMPT GENERATOR ---
            generateFuturePrompt() {
                if (!this.activeScenario) return "Start simulation first.";
                const s = this.activeScenario;
                const m = this.metrics;
                
                const decisions = this.decisionLog.map(d => `In ${d.year}, faced with "${d.event}", I chose to "${d.decision}".`).join("\n");

                return `ACT AS: A Wall Street Analyst writing a "Sell-Side Report" on this Bank in 2030.

## STRATEGY & EXECUTION REVIEW (2026-2030)
The CEO chose the "${s.title}" strategy (${s.desc}).
Key Decisions made during the timeline:
${decisions}

## 2030 FINANCIAL RESULTS
- **Net Profit:** $${(m.profit/1000).toFixed(1)} Billion
- **Efficiency Ratio:** ${m.efficiency.toFixed(0)}%
- **Customer Base:** ${(m.customers).toFixed(1)} Million
- **Technical Debt:** ${m.techDebt}/100

## YOUR ANALYSIS
1. **The Verdict:** Is this bank a "Buy", "Hold", or "Sell"? Why?
2. **The "Crisis Management" Score:** Analyze how my decision in the 2027/2029 crises impacted the final P&L.
3. **The 2035 Outlook:** Given the high/low Tech Debt, will this bank survive the *next* wave of disruption (Quantum Computing)?

TONE: Professional, financial, ruthlessly objective.`;
            }
        },

        // ------------------------------------------------------------------
        // CONWAY'S LAW SIMULATOR (Deterministic Topology Engine)
        // ------------------------------------------------------------------
        conwaySim: {
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
                    
                    // Linking two Silos = TIGHT COUPLING (Integration Tax)
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
                    const f = this.teams.find(t => t.id === d.from).name;
                    const t = this.teams.find(t => t.id === d.to).name;
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
        },

        // ------------------------------------------------------------------
        // DUMB PIPE CALCULATOR (Deterministic Strategy Engine)
        // ------------------------------------------------------------------
        dumbPipeCalc: {
            inputs: {
                commodity_share: 60, // % of revenue from interchange/fees (bad) vs advisory (good)
                aggregator_share: 20, // % of traffic coming via 3rd parties (Apple Wallet, Mint, etc)
                daily_logins: 30, // % of customers logging into YOUR app daily
                nps: 20 // Net Promoter Score (-100 to 100)
            },
            result: null,

            analyze() {
                const i = this.inputs;
                
                // 1. THE MATH ENGINE
                // Base Risk: Dependency on commodity revenue (Interchange/Overdraft)
                let riskScore = i.commodity_share * 0.5;

                // Interface Risk: If traffic comes via Aggregators, you lost the front end
                riskScore += (i.aggregator_share * 0.4);

                // Mitigation: Daily engagement reduces churn risk
                // If 50% log in daily, we reduce risk by 20 points
                const stickiness = Math.min(50, i.daily_logins) * 0.4;
                riskScore -= stickiness;

                // Mitigation: Brand Love (NPS)
                // High NPS acts as a moat. Low NPS accelerates commoditization.
                if (i.nps < 0) riskScore += 10; // Penalty for hatred
                if (i.nps > 50) riskScore -= 10; // Bonus for love

                // Clamp 0-100
                riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

                // 2. DIAGNOSTIC PROFILING
                let archetype = "";
                let verdict = "";
                let color = "";

                if (riskScore > 80) {
                    archetype = "The Invisible Utility";
                    verdict = "TERMINAL DECLINE";
                    color = "text-risk";
                } else if (riskScore > 50) {
                    archetype = "The Interchange Junkie";
                    verdict = "HIGH RISK";
                    color = "text-orange-500";
                } else if (i.aggregator_share > 60) {
                    archetype = "The Embedded Balance Sheet"; // Profitable but invisible
                    verdict = "PIVOT REQUIRED";
                    color = "text-yellow-400";
                } else {
                    archetype = "The Primary Partner";
                    verdict = "SUSTAINABLE";
                    color = "text-primary";
                }

                this.result = {
                    score: riskScore,
                    archetype,
                    verdict,
                    color,
                    burnRate: (100 - riskScore) / 2 // Years left logic simulation
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateStrategyPrompt() {
                if (!this.result) return "Run calculation first.";
                
                const r = this.result;
                const i = this.inputs;

                return `ACT AS: An Activist Investor and Fintech Strategist.

## THE DISTRESS SIGNAL (DUMB PIPE ANALYSIS)
I have audited my bank's business model vulnerability.
- **Risk Score:** ${r.score}/100 (Probability of becoming a commodity utility).
- **Current Archetype:** "${r.archetype}".
- **Revenue Mix:** ${i.commodity_share}% Commodity (Interchange/Fees).
- **Interface Control:** ${i.aggregator_share}% of traffic comes via 3rd Parties (Apple/Plaid).
- **Customer Moat:** ${i.daily_logins}% DAU, NPS ${i.nps}.

## THE STRATEGIC PIVOT
The data suggests we are on a path to "${r.verdict}". 

## YOUR MISSION
Write a **"Save the Bank" Strategic Memo** to the Board.
1. **The Brutal Truth:** Explain why high Aggregator Traffic (${i.aggregator_share}%) + High Commodity Revenue (${i.commodity_share}%) guarantees margin compression.
2. **The Defensive Move:** Propose 1 feature to increase "Stickiness" (e.g. Subscription Banking, Embedded Identity).
3. **The Offensive Move:** Should we fight for the interface (Super App) or accept our fate and become a "Banking-as-a-Service" provider? Pick a lane.

TONE: Urgent, financial, high-stakes.`;
            }
        },

        // ------------------------------------------------------------------
        // AGILE DATA GOVERNANCE DASHBOARD (Deterministic SRE Simulator)
        // ------------------------------------------------------------------
        dataGovDash: {
            isLive: false,
            interval: null,
            selectedProduct: null,
            activeIncident: null, // Stores current failure data
            
            // The Data Asset Portfolio
            products: [
                { 
                    id: 'cust360', 
                    name: "Customer 360", 
                    owner: "Marketing Squad", 
                    criticality: "HIGH",
                    costPerMinute: 500, // $ lost per minute of downtime
                    slo: { freshness: 99.9, accuracy: 99.9 },
                    status: 'healthy'
                },
                { 
                    id: 'risk_engine', 
                    name: "Credit Risk Engine", 
                    owner: "Risk Squad", 
                    criticality: "CRITICAL",
                    costPerMinute: 2000, 
                    slo: { freshness: 99.9, accuracy: 99.9 },
                    status: 'healthy'
                },
                { 
                    id: 'payments', 
                    name: "Real-Time Payments", 
                    owner: "Payments Tribe", 
                    criticality: "CRITICAL",
                    costPerMinute: 5000, 
                    slo: { freshness: 99.9, accuracy: 99.9 },
                    status: 'healthy'
                }
            ],

            toggleSim() {
                if (this.isLive) {
                    clearInterval(this.interval);
                    this.isLive = false;
                } else {
                    this.isLive = true;
                    this.interval = setInterval(() => this.tick(), 1000);
                }
            },

            tick() {
                // 1. Healthy Fluctuation
                this.products.forEach(p => {
                    if (p.status === 'healthy') {
                        // Tiny variations to look alive
                        p.slo.freshness = Math.min(100, Math.max(98, p.slo.freshness + (Math.random() - 0.5)));
                        p.slo.accuracy = Math.min(100, Math.max(99, p.slo.accuracy + (Math.random() - 0.5)));
                    } else if (p.status === 'critical') {
                        // 2. Incident Logic: Metrics crash
                        if (this.activeIncident.type === 'schema') p.slo.accuracy = Math.max(0, p.slo.accuracy - 5);
                        if (this.activeIncident.type === 'latency') p.slo.freshness = Math.max(0, p.slo.freshness - 8);
                        
                        // 3. Financial Impact Accumulator
                        this.activeIncident.totalCost += p.costPerMinute / 60; // Add cost per second
                    }
                });
            },

            injectFailure(type) {
                if (!this.isLive) this.toggleSim();
                
                // Target a random product
                const target = this.products[Math.floor(Math.random() * this.products.length)];
                target.status = 'critical';
                this.selectedProduct = target;

                this.activeIncident = {
                    product: target.name,
                    owner: target.owner,
                    type: type, // 'schema' or 'latency'
                    startTime: new Date().toLocaleTimeString(),
                    totalCost: 0,
                    errorMsg: type === 'schema' ? "ERR_NULL_POINTER: 'Credit_Score' field missing in stream." : "ERR_TIMEOUT: Kafka Consumer Lag > 5000ms."
                };
            },

            repair() {
                if (this.selectedProduct) {
                    this.selectedProduct.status = 'healthy';
                    this.selectedProduct.slo.freshness = 99.9;
                    this.selectedProduct.slo.accuracy = 99.9;
                    // Keep the incident data for the report, but mark resolved in UI
                }
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateRCAPrompt() {
                if (!this.activeIncident) return "No incident to report.";
                
                const inc = this.activeIncident;
                const cost = Math.round(inc.totalCost).toLocaleString();

                return `ACT AS: A Site Reliability Engineer (SRE) and Data Product Owner.

## THE INCIDENT REPORT (ROOT CAUSE ANALYSIS)
A data failure occurred in the "${inc.product}" product.
- **Incident Type:** ${inc.type === 'schema' ? "Schema Drift (Breaking Change)" : "Latency Spike (Data Freshness Failure)"}
- **Error Log:** "${inc.errorMsg}"
- **Business Impact:** Service degraded. Estimated financial loss: $${cost} (based on downtime duration).
- **Owner:** ${inc.owner}

## YOUR MISSION
Draft a **"5 Whys" Post-Mortem Email** to the Executive Committee.
1. **The Executive Summary:** Explain what broke and the financial impact in plain English (no tech jargon).
2. **The Root Cause:** Explain that this wasn't just "bad luck", it was a lack of Governance (e.g., "We pushed code without checking the data contract").
3. **The Fix:** Propose a specific automated guardrail (e.g., "Implement Schema Registry checks in CI/CD") to ensure this never happens again.

TONE: Accountable, transparent, systems-thinking (blame the process, not the person).`;
            }
        },

    // ------------------------------------------------------------------
        // SHADOW IT AUDIT (Deterministic TCO & Risk Engine)
        // ------------------------------------------------------------------
        shadowAudit: {
            inventory: [],
            form: {
                name: '',
                users: 5,
                costPerUser: 20, // Monthly
                dataLevel: 'internal', // public, internal, confidential, restricted
                integration: 'silo' // silo (manual export), api (automated)
            },
            summary: { totalCost: 0, hiddenTax: 0, highRiskCount: 0 },

            init() {
                // Load from local storage if available
                const saved = localStorage.getItem('bilingual_shadow_inventory');
                if (saved) {
                    this.inventory = JSON.parse(saved);
                    this.calculateTotals();
                }
            },

            addTool() {
                if (!this.form.name) return alert("Enter tool name.");
                
                const f = this.form;
                
                // 1. Math: Annual License Cost
                const licenseCost = f.users * f.costPerUser * 12;

                // 2. Math: The "Shadow Tax" (Hidden Operational Costs)
                // - Silos cost 50% more due to manual data copy-pasting/CSV exports
                // - APIs cost 10% more due to maintenance
                const taxRate = f.integration === 'silo' ? 0.50 : 0.10;
                const hiddenTax = licenseCost * taxRate;

                // 3. Math: Risk Score (1-10)
                let risk = 1;
                if (f.dataLevel === 'internal') risk = 3;
                if (f.dataLevel === 'confidential') risk = 7;
                if (f.dataLevel === 'restricted') risk = 10; // PII/Financials
                
                // Penalty for silos handling restricted data
                if (risk >= 7 && f.integration === 'silo') risk += 2; // Data leakage risk is higher

                // 4. Verdict
                let verdict = "ALLOW";
                if (risk >= 8) verdict = "SHUTDOWN";
                else if (risk >= 5) verdict = "REGULATE";
                else if (licenseCost > 50000) verdict = "CONSOLIDATE";

                this.inventory.push({
                    id: Date.now(),
                    name: f.name,
                    licenseCost,
                    hiddenTax,
                    trueCost: licenseCost + hiddenTax,
                    risk,
                    verdict,
                    dataLevel: f.dataLevel,
                    integration: f.integration
                });

                this.save();
                this.form.name = ''; // Reset name only, keep settings for fast entry
            },

            removeTool(id) {
                this.inventory = this.inventory.filter(t => t.id !== id);
                this.save();
            },

            save() {
                this.calculateTotals();
                localStorage.setItem('bilingual_shadow_inventory', JSON.stringify(this.inventory));
            },

            calculateTotals() {
                this.summary.totalCost = this.inventory.reduce((acc, t) => acc + t.trueCost, 0);
                this.summary.hiddenTax = this.inventory.reduce((acc, t) => acc + t.hiddenTax, 0);
                this.summary.highRiskCount = this.inventory.filter(t => t.risk >= 8).length;
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateGovernancePrompt() {
                if (this.inventory.length === 0) return "Add tools to inventory first.";

                const highRiskTools = this.inventory.filter(t => t.risk >= 8);
                const siloTools = this.inventory.filter(t => t.integration === 'silo');
                const totalWaste = this.summary.hiddenTax;

                let focus = "";
                if (highRiskTools.length > 0) focus = `SECURITY ALERT. We have ${highRiskTools.length} tools handling Restricted Data without IT oversight.`;
                else if (siloTools.length > 3) focus = `DATA FRAGMENTATION. We have ${siloTools.length} data silos creating manual work.`;
                else focus = "COST OPTIMIZATION. We are paying a 'Shadow Tax' on unmanaged licenses.";

                const toolList = this.inventory.map(t => 
                    `- **${t.name}**: True Cost $${Math.round(t.trueCost).toLocaleString()} (Risk: ${t.risk}/10 | Verdict: ${t.verdict})`
                ).join("\n");

                return `ACT AS: A Chief Information Security Officer (CISO) and CFO.

## THE SHADOW IT AUDIT FINDINGS
I have scanned our environment for unauthorized SaaS usage.
- **Total Annual Liability:** $${Math.round(this.summary.totalCost).toLocaleString()}
- **The "Shadow Tax":** $${Math.round(this.summary.hiddenTax).toLocaleString()} (Wasted on manual data entry & lack of integration).
- **Primary Concern:** ${focus}

## INVENTORY LIST
${toolList}

## YOUR MISSION
Write a **Governance Memo** to the Department Heads.
1. **The Policy:** Define a clear "Red Line" based on the data above (e.g. "No tools handling PII without SSO").
2. **The Amnesty Offer:** Propose a "Bring your own tool" amnesty period where they can register tools without punishment, IF they integrate them via API.
3. **The Crackdown:** For the tools marked "SHUTDOWN", draft the email explaining why access is being revoked immediately (cite Data Sovereignty or GDPR).

TONE: Firm but fair. Focus on Risk and Waste, not bureaucracy.`;
            }
        },

        // ------------------------------------------------------------------
        // HALLUCINATION DETECTOR (Deterministic NLP & Math Engine)
        // ------------------------------------------------------------------
        hallucinationDetector: {
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
                if (!this.policy || !this.aiOutput) return alert("Please provide both Policy and AI Output.");
                
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
                const extractNums = (text) => text.match(/\d+(\.\d+)?/g) || [];
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
        },

        // ------------------------------------------------------------------
        // VENDOR PARTNERSHIP COACH (Deterministic Game Theory)
        // ------------------------------------------------------------------
        vendorCoach: {
            step: 'input', // input, analysis, sim
            inputs: {
                vendorName: '',
                spend: 1000000, // Annual spend
                model: 'tm', // tm (Time & Material), fixed, outcome
                dependency: 8, // 1-10 (How hard to replace?)
                quality: 5 // 1-10 (Current satisfaction)
            },
            analysis: {},
            
            // Simulation State
            sim: {
                active: false,
                round: 0,
                trust: 50,
                savings: 0,
                history: [],
                vendorMood: "Neutral"
            },

            // Deterministic Logic Engine
            analyze() {
                if (!this.inputs.vendorName) return alert("Enter vendor name.");
                
                const i = this.inputs;
                
                // 1. Calculate Leverage Score (Who has the power?)
                // High Spend + Low Dependency = High Leverage (You win)
                // Low Spend + High Dependency = Low Leverage (Vendor wins)
                let leverage = (i.spend / 100000) - (i.dependency * 5) + 50;
                leverage = Math.max(0, Math.min(100, leverage));

                // 2. Identify the Trap
                let trap = "";
                let strategy = "";
                
                if (i.model === 'tm') {
                    trap = "The Efficiency Paradox. The longer they take, the more you pay.";
                    strategy = "Move to Capacity-Based Funding with SLOs.";
                } else if (i.model === 'fixed') {
                    trap = "The Change Request Trap. Low initial price, high cost for every change.";
                    strategy = "Shift to 'Money for Nothing, Change for Free' Agile contracts.";
                } else {
                    trap = "Measurement Risk. Are you measuring the right outcome?";
                    strategy = "Tighten the definition of 'Done'.";
                }

                // 3. Financial Exposure
                const wasteFactor = (10 - i.quality) * 0.10; // 10% waste for every point of bad quality
                const wasteAmount = Math.round(i.spend * wasteFactor);

                this.analysis = {
                    leverage: Math.round(leverage),
                    waste: wasteAmount,
                    trap: trap,
                    strategy: strategy,
                    readiness: leverage > 60 ? "READY TO RENEGOTIATE" : "WEAK POSITION"
                };

                this.step = 'analysis';
            },

            // --- SIMULATION ENGINE ---
            startSim() {
                this.step = 'sim';
                this.sim = { active: true, round: 1, trust: 50, savings: 0, history: [], vendorMood: "Skeptical" };
                this.addSimMessage('bot', `(Account Manager): We appreciate your business, but our margins are tight. We actually need to discuss a 5% rate hike for inflation.`);
            },

            makeMove(moveType) {
                let reply = "";
                let trustChange = 0;
                let savingsChange = 0;

                // Game Theory Logic
                if (moveType === 'hardball') {
                    // Aggressive: High risk, high reward
                    if (this.analysis.leverage > 60) {
                        reply = "Okay, okay. We can waive the hike. But we can't lower rates.";
                        trustChange = -10;
                        savingsChange = 5; // Saved the 5% hike
                    } else {
                        reply = "I'm afraid that's not possible. If you can't pay, we may need to offboard.";
                        trustChange = -30;
                        savingsChange = 0;
                    }
                } else if (moveType === 'partnership') {
                    // Collaborative: Builds trust, unlocks value
                    reply = "That's interesting. If you can commit to a 3-year term, we could look at an Outcome-based rebate model.";
                    trustChange = +20;
                    savingsChange = 10;
                } else if (moveType === 'threaten') {
                    // Threaten to leave
                    if (this.inputs.dependency > 7) {
                        reply = "We know your stack is built on our proprietary code. Moving would cost you double.";
                        trustChange = -50;
                        savingsChange = 0;
                    } else {
                        reply = "Let's not be hasty. What if we offered a volume discount?";
                        trustChange = -10;
                        savingsChange = 15;
                    }
                }

                this.sim.trust = Math.max(0, Math.min(100, this.sim.trust + trustChange));
                this.sim.savings += savingsChange;
                this.sim.round++;
                
                // Add to chat
                let userText = "";
                if (moveType === 'hardball') userText = "I reject the hike. Efficiency has been poor.";
                if (moveType === 'partnership') userText = "Let's shift the model. I'll pay more for 'Results', less for 'Hours'.";
                if (moveType === 'threaten') userText = "I'm issuing an RFP to your competitors tomorrow.";

                this.addSimMessage('user', userText);
                setTimeout(() => this.addSimMessage('bot', reply), 600);
            },

            addSimMessage(role, text) {
                this.sim.history.push({ role, text });
                // Auto-scroll logic would go here
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateNegotiationPrompt() {
                const a = this.analysis;
                const i = this.inputs;

                return `ACT AS: A Chief Procurement Officer and Agile Coach.

## THE CONTRACT AUDIT
I am renegotiating a contract with "${i.vendorName}".
- **Current Model:** ${i.model === 'tm' ? "Time & Materials (Body Shop)" : "Fixed Price (Waterfall)"}
- **Annual Spend:** $${i.spend.toLocaleString()}
- **Performance:** ${i.quality}/10 Quality Score.
- **My Leverage:** ${a.leverage}/100.

## THE PROBLEM
We are trapped in "${a.trap}". 
We estimate we are wasting $${a.waste.toLocaleString()} annually on friction and rework.

## YOUR MISSION
Draft a **Negotiation Script** for the upcoming renewal meeting.
1. **The Opener:** A script to shut down their request for a rate hike by using our Quality data.
2. **The Pivot:** Specific language to propose shifting from "Headcount" to "${a.strategy}".
3. **The Clause:** Draft a specific "Service Level Objective (SLO)" clause that penalizes them if they ship bugs, instead of paying them to fix the bugs they wrote.

TONE: Professional, firm, collaborative but demanding.`;
            }
        },

    // ------------------------------------------------------------------
        // FINOPS AUDITOR (Deterministic Accounting Engine)
        // ------------------------------------------------------------------
        capexClassifier: {
            input: "FEAT-101: Build new Mobile Login module\nBUG-202: Fix crash on payment screen\nCHORE: Update server dependencies\nSPIKE: Research Blockchain feasibility\nFEAT-105: Refactor database for 10x scale",
            sensitivity: 50, // 0 = Conservative, 100 = Aggressive
            analysis: null,
            stats: { ratio: 0, totalValue: 0, capexValue: 0 },

            // The Keyword Dictionary (IAS 38 Logic)
            rules: {
                capex: ['new', 'build', 'create', 'launch', 'feature', 'scale', 'module', 'architecture', 'implement'],
                opex: ['fix', 'bug', 'repair', 'maintain', 'support', 'patch', 'update', 'training', 'research', 'spike', 'meeting']
            },

            analyze() {
                if (!this.input.trim()) return alert("Please paste ticket list.");
                
                const lines = this.input.split('\n').filter(l => l.trim().length > 0);
                let processed = [];
                let totalVal = 0;
                let capexVal = 0;
                
                // Assume average cost per ticket for simulation (e.g., 1 Story Point = $1,000)
                const costPerTicket = 1000; 

                lines.forEach(line => {
                    const lower = line.toLowerCase();
                    
                    // 1. Scoring Logic
                    let capScore = 0;
                    let opScore = 0;
                    
                    this.rules.capex.forEach(w => { if(lower.includes(w)) capScore++; });
                    this.rules.opex.forEach(w => { if(lower.includes(w)) opScore++; });

                    // 2. Apply Sensitivity (The "CFO Mood" Slider)
                    // High sensitivity makes it easier to claim CapEx (Aggressive)
                    // Low sensitivity defaults to OpEx (Conservative)
                    let threshold = 0;
                    if (this.sensitivity > 50) capScore += 0.5; // Bias towards Asset
                    if (this.sensitivity < 50) opScore += 0.5; // Bias towards Expense

                    // 3. Verdict
                    let type = "OpEx";
                    let reason = "Routine Maintenance (Expense)";
                    let confidence = "High";

                    if (capScore > opScore) {
                        type = "CapEx";
                        reason = "Creates Future Economic Benefit (Asset)";
                    } else if (capScore === opScore) {
                        type = "Review";
                        reason = "Ambiguous. Requires manual check.";
                        confidence = "Low";
                    }

                    // 4. Financials
                    totalVal += costPerTicket;
                    if (type === "CapEx") capexVal += costPerTicket;

                    processed.push({ ticket: line, type, reason, confidence });
                });

                this.stats.totalValue = totalVal;
                this.stats.capexValue = capexVal;
                this.stats.ratio = totalVal === 0 ? 0 : Math.round((capexVal / totalVal) * 100);
                this.analysis = processed;
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateAuditorPrompt() {
                if (!this.analysis) return "Run analysis first.";
                
                const s = this.stats;
                const riskLevel = this.sensitivity > 70 ? "HIGH (Aggressive Accounting)" : "LOW (Conservative)";
                
                // Sample 5 tickets for the prompt
                const sample = this.analysis.slice(0, 5).map(i => `- ${i.ticket} -> ${i.type}`).join("\n");

                return `ACT AS: A Big 4 External Auditor (KPMG/Deloitte style).

## THE INTERNAL AUDIT REPORT (IAS 38 CHECK)
I have classified our software engineering labor for Capitalization.
- **Total Labor Spend:** $${s.totalValue.toLocaleString()} (Simulated)
- **Capitalization Rate:** ${s.ratio}% (Industry Benchmark: 30-50%)
- **Accounting Stance:** ${riskLevel}

## SAMPLE DATA
${sample}
... (and ${this.analysis.length - 5} more items)

## YOUR MISSION
Write an **Audit Defense Memo** for the CTO to sign.
1. **The Justification:** Explain why our Capitalization Rate of ${s.ratio}% is justified given we are building "New Assets" vs "Maintenance".
2. **The Red Flags:** If the rate is >60%, warn us about the specific risk of "improperly capitalizing maintenance" which inflates profit artificially.
3. **The Policy:** Write a 1-sentence "Golden Rule" for developers to use when naming Jira tickets so they pass audit (e.g., "Don't use the word 'Fix' if you are actually rebuilding").

TONE: Compliance-focused, protective, financially literate.`;
            }
        },

        // ------------------------------------------------------------------
        // LEGACY CODE EXPLAINER (Deterministic Static Analysis)
        // ------------------------------------------------------------------
        legacyExplainer: {
            input: "IF ORDER-AMT > CUST-CREDIT-LIMIT\n    MOVE 'Y' TO REJECT-FLAG\n    PERFORM REJECT-ROUTINE\n    GO TO EXIT-PARA\nELSE\n    COMPUTE NEW-BAL = OLD-BAL + ORDER-AMT\nEND-IF.",
            loading: false,
            analysis: null,
            
            // Configuration
            targetAudience: 'ceo', // ceo (Simple), cto (Technical), compliance (Risk)
            language: 'detect',    // detect, cobol, sql

            // The Pattern Matcher
            patterns: {
                cobol: {
                    keywords: ['PERFORM', 'MOVE', 'PIC', 'IDENTIFICATION DIVISION', 'COMP-3'],
                    risks: [
                        { pattern: /GO\s*TO/i, score: 20, label: "Spaghetti Code (GOTO)" },
                        { pattern: /HARD-CODED/i, score: 15, label: "Hardcoded Values" },
                        { pattern: /DATE/i, score: 5, label: "Date Arithmetic Risk" }
                    ]
                },
                sql: {
                    keywords: ['SELECT', 'FROM', 'WHERE', 'JOIN', 'UNION'],
                    risks: [
                        { pattern: /CURSOR/i, score: 25, label: "Performance Killer (Cursor)" },
                        { pattern: /DROP\s+TABLE/i, score: 50, label: "Destructive Command" },
                        { pattern: /SELECT\s+\*/i, score: 10, label: "Inefficient Query (Select *)" }
                    ]
                },
                business: {
                    // Words that imply money or rules
                    keywords: ['AMT', 'BAL', 'INT', 'RATE', 'TAX', 'LIMIT', 'CREDIT', 'DEBIT', 'FEE']
                }
            },

            analyze() {
                if (!this.input.trim()) return alert("Paste some code first.");
                
                this.loading = true;
                this.analysis = null;

                // Simulate processing delay
                setTimeout(() => {
                    this.runHeuristics();
                    this.loading = false;
                }, 800);
            },

            runHeuristics() {
                const code = this.input.toUpperCase();
                let detectedLang = "Generic";
                let riskScore = 0;
                let businessValue = 0;
                let flaws = [];

                // 1. Detect Language
                const cobolMatches = this.patterns.cobol.keywords.filter(k => code.includes(k)).length;
                const sqlMatches = this.patterns.sql.keywords.filter(k => code.includes(k)).length;
                
                if (cobolMatches > sqlMatches) detectedLang = "COBOL (Mainframe)";
                else if (sqlMatches > cobolMatches) detectedLang = "SQL (Database)";

                // 2. Risk Scanning
                const activeRules = detectedLang.includes("COBOL") ? this.patterns.cobol.risks : this.patterns.sql.risks;
                
                activeRules.forEach(rule => {
                    if (rule.pattern.test(code)) {
                        riskScore += rule.score;
                        flaws.push(rule.label);
                    }
                });

                // 3. Business Value Scanning (Density of financial terms)
                this.patterns.business.keywords.forEach(word => {
                    // Count occurrences
                    const count = (code.match(new RegExp(word, "g")) || []).length;
                    businessValue += (count * 10);
                });

                // 4. Determine Archetype
                let archetype = "Utility Script"; // Low Risk, Low Value
                if (riskScore > 50 && businessValue > 50) archetype = "THE BLACK BOX (Critical & Dangerous)";
                else if (riskScore > 50) archetype = "TECHNICAL DEBT (Refactor Now)";
                else if (businessValue > 50) archetype = "CORE LOGIC (Golden Rule)";

                this.analysis = {
                    language: detectedLang,
                    riskScore: Math.min(100, riskScore),
                    bizScore: Math.min(100, businessValue),
                    flaws: flaws,
                    archetype: archetype
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateTranslatorPrompt() {
                if (!this.analysis) return "Run analysis first.";
                
                const a = this.analysis;
                const audience = this.targetAudience === 'ceo' ? "Non-Technical CEO" : (this.targetAudience === 'compliance' ? "Risk Auditor" : "Modern Java Developer");
                const goal = this.targetAudience === 'ceo' ? "Explain the financial impact." : (this.targetAudience === 'compliance' ? "Find the regulatory gaps." : "Rewrite this in Python.");

                return `ACT AS: A Senior Mainframe Modernization Architect.

## THE SOURCE CODE ANALYSIS
I have scanned a block of legacy code.
- **Language:** ${a.language}
- **Complexity Archetype:** "${a.archetype}"
- **Detected Technical Risks:** ${a.flaws.join(", ") || "None detected (Clean code)"}

## INPUT CODE
"""
${this.input}
"""

## YOUR MISSION
Translate this code for a **${audience}**.
1. **The Plain English Translation:** ${goal}
2. **The Business Rule:** Extract the exact logic (e.g., "If credit < 500, reject"). Ignore syntax.
3. **The Modernization Path:** If we rewrote this today, would it be a Microservice, a Database Trigger, or a Config Rule?

TONE: Authoritative, cynical about legacy, clear about value.`;
            }
        },

        // ------------------------------------------------------------------
        // WATERMELON DETECTOR (Deterministic Linguistics Engine)
        // ------------------------------------------------------------------
        watermelonDetector: {
            inputs: [
                "Week 1: Development is progressing well. We are 90% complete with the backend.",
                "Week 2: Still targeting launch. Just a few minor integration nuances to iron out. 95% complete.",
                "Week 3: Almost there. Just waiting on a 3rd party vendor API key. Dashboard is Green."
            ],
            loading: false,
            result: null,

            // The Pattern Library
            patterns: {
                vagueness: ["progressing", "hoping", "aiming", "believe", "anticipate", "trying", "should be"],
                stagnancy: ["90%", "95%", "99%", "almost done", "finalizing", "polishing", "tweaking"],
                deflection: ["waiting on", "dependency", "vendor", "client", "3rd party", "external"],
                passive: ["mistakes were made", "challenges were encountered", "it was decided"]
            },

            analyze() {
                this.loading = true;
                this.result = null;

                // Simulate processing "Forensic Scan"
                setTimeout(() => {
                    this.runForensics();
                    this.loading = false;
                }, 1000);
            },

            runForensics() {
                let bsScore = 0;
                let flags = [];
                const fullText = this.inputs.join(" ").toLowerCase();

                // 1. THE "90% PARADOX" (Stagnancy Check)
                // If "90%" or "95%" appears in multiple weeks, it's a lie.
                let stagCount = 0;
                this.inputs.forEach((week, idx) => {
                    if (this.patterns.stagnancy.some(p => week.toLowerCase().includes(p))) stagCount++;
                });

                if (stagCount >= 2) {
                    bsScore += 40;
                    flags.push("The Zeno's Paradox: Stuck at 'Almost Done' for multiple weeks.");
                }

                // 2. HAPPY TALK FILTER (Vagueness)
                let vagueCount = 0;
                this.patterns.vagueness.forEach(word => {
                    if (fullText.includes(word)) vagueCount++;
                });
                
                if (vagueCount > 0) {
                    bsScore += (vagueCount * 10);
                    flags.push(`Vague Assurance: Used low-confidence words ${vagueCount} times (e.g. 'hoping', 'trying').`);
                }

                // 3. THE BLAME GAME (Deflection)
                const hasDeflection = this.patterns.deflection.some(w => fullText.includes(w));
                if (hasDeflection) {
                    bsScore += 20;
                    flags.push("External Blaming: Shifting responsibility to vendors/dependencies.");
                }

                // 4. LENGTH MISMATCH
                // If reports get shorter over time, they are hiding something.
                if (this.inputs[2].length < this.inputs[0].length * 0.5) {
                    bsScore += 15;
                    flags.push("Silence Protocol: Updates are shrinking. Information is being withheld.");
                }

                // Calculate Verdict
                bsScore = Math.min(100, bsScore);
                let verdict = "TRUE GREEN";
                let color = "text-primary";

                if (bsScore > 75) { verdict = "WATERMELON (CRITICAL)"; color = "text-risk"; }
                else if (bsScore > 40) { verdict = "AMBER (WARNING)"; color = "text-yellow-500"; }

                this.result = {
                    bsScore,
                    verdict,
                    color,
                    red_flags: flags.length > 0 ? flags : ["No linguistic deception detected."]
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateInterrogationPrompt() {
                if (!this.result) return "Run scan first.";
                
                const r = this.result;
                const flags = r.red_flags.join("\n- ");
                const context = this.inputs.map((t, i) => `Week ${i+1}: "${t}"`).join("\n");

                return `ACT AS: A Forensic Project Auditor (The "Wolf" of Project Management).

## THE EVIDENCE (STATUS REPORTS)
I have flagged a project for "Watermelon Reporting" (Green on the outside, Red on the inside).
- **Deception Score:** ${r.bsScore}/100
- **Verdict:** ${r.verdict}

## DETECTED PATTERNS
- ${flags}

## REPORT TRANSCRIPT
${context}

## YOUR MISSION
Write a **"Gemba Walk" Interrogation Script** for my meeting with this Project Manager.
1. **The Trap:** Don't ask "Is it on track?". Ask a question that forces them to reveal the blocker (e.g., "Show me the specific test case that failed yesterday").
2. **The Translation:** Translate their vague update into what is likely *actually* happening (e.g., "99% done" usually means "The integration is broken").
3. **The Ultimatum:** Give me the exact wording to demand a "Red Status" report by EOD.

TONE: Skeptical, experienced, piercing.`;
            }
        },

        // ------------------------------------------------------------------
        // RISK SIMULATOR (Deterministic Card Game Engine)
        // ------------------------------------------------------------------
        riskSim: {
            active: false,
            round: 0,
            
            // The Math State
            metrics: {
                trust: 50,    // Marcus's confidence in you (0-100)
                velocity: 50, // Time-to-Market speed (0-100)
                patience: 3   // Lives remaining
            },
            
            history: [],
            currentObjection: null,
            outcome: false,

            // The Opponent (Marcus) Logic
            scenarios: [
                {
                    round: 1,
                    topic: "The Cloud Waiver",
                    objection: "You want to put PII in the public cloud? I can't sign this off. The regulator will eat us alive.",
                    mood: "Skeptical"
                },
                {
                    round: 2,
                    topic: "The AI Hallucination",
                    objection: "This Chatbot feature... what if it promises a refund we can't honor? I need a human in the loop for every transaction.",
                    mood: "Defensive"
                },
                {
                    round: 3,
                    topic: "The Deployment Speed",
                    objection: "You want to release daily? Our governance process requires a 2-week CAB (Change Advisory Board) review.",
                    mood: "Bureaucratic"
                }
            ],

            // Your Deck (The Options)
            cards: [
                { 
                    id: 'data', 
                    label: 'The Data Shield', 
                    desc: 'Show logs/evidence.', 
                    icon: 'fa-database',
                    math: { trust: +20, velocity: -10 }, 
                    response: "Fine. The data looks solid. But gathering this took time." 
                },
                { 
                    id: 'policy', 
                    label: 'The Policy Loophole', 
                    desc: 'Cite specific regulation.', 
                    icon: 'fa-book-open',
                    math: { trust: +10, velocity: 0 }, 
                    response: "Technically you are correct, though I don't like it." 
                },
                { 
                    id: 'speed', 
                    label: 'The Competitor Threat', 
                    desc: 'Fear of missing out.', 
                    icon: 'fa-bolt',
                    math: { trust: -10, velocity: +20 }, 
                    response: "I don't care what Revolut is doing! We are a bank, not a startup." 
                },
                { 
                    id: 'pilot', 
                    label: 'The Ring-Fence', 
                    desc: 'Limit exposure (Sandbox).', 
                    icon: 'fa-box',
                    math: { trust: +15, velocity: +5 }, 
                    response: "A contained blast radius? Smart. That I can work with." 
                }
            ],

            start() {
                this.active = true;
                this.round = 0;
                this.metrics = { trust: 40, velocity: 60, patience: 3 }; // Starting stats
                this.history = [];
                this.outcome = null;
                this.loadRound();
            },

            loadRound() {
                if (this.round >= this.scenarios.length) {
                    this.endGame();
                    return;
                }
                this.currentObjection = this.scenarios[this.round];
            },

            playCard(cardId) {
                const card = this.cards.find(c => c.id === cardId);
                const scenario = this.currentObjection;

                // 1. Apply Math
                this.metrics.trust += card.math.trust;
                this.metrics.velocity += card.math.velocity;
                
                // 2. Determine Success of Turn
                let turnResult = "Neutral";
                // Specific logic: 'speed' card always hurts trust on round 1 (Cloud)
                if (this.round === 0 && cardId === 'speed') {
                    this.metrics.trust -= 10; 
                    card.response = "Reckless! I'm flagging this to the CEO.";
                }
                // Specific logic: 'pilot' card is super effective on round 2 (AI)
                if (this.round === 1 && cardId === 'pilot') {
                    this.metrics.trust += 10;
                    card.response = "Exactly. A sandbox is the only way I'd approve AI.";
                }

                // 3. Log History
                this.history.push({
                    round: this.round + 1,
                    topic: scenario.topic,
                    objection: scenario.objection,
                    tactic: card.label,
                    outcome: card.response,
                    stats: { ...this.metrics }
                });

                // 4. Check Fail State
                if (this.metrics.trust <= 0) {
                    this.outcome = { status: "FIRED", msg: "Marcus shut down the project. You lost all credibility." };
                    return;
                }

                // 5. Advance
                this.round++;
                this.loadRound();
            },

            endGame() {
                const m = this.metrics;
                let status = "APPROVED";
                let msg = "Project Green-lit.";
                let archetype = "The Bilingual Executive";

                if (m.trust < 50) {
                    status = "CONDITIONAL APPROVAL";
                    msg = "Approved, but with heavy audit shackles. You moved too fast.";
                    archetype = "The Cowboy";
                } else if (m.velocity < 40) {
                    status = "DELAYED";
                    msg = "Safe, but you missed the market window. Too cautious.";
                    archetype = "The Bureaucrat";
                } else {
                    msg = "Perfect balance of Risk and Speed. The Golden Path.";
                }

                this.outcome = { status, msg, archetype };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateCoachingPrompt() {
                if (!this.outcome) return "Complete simulation first.";
                
                const path = this.history.map(h => `Round ${h.round} (${h.topic}): I used "${h.tactic}". Result: Trust ${h.stats.trust}, Velocity ${h.stats.velocity}.`).join("\n");

                return `ACT AS: An Executive Coach for Product Leaders.

## THE SIMULATION REPORT
I just engaged in a simulated negotiation with a Chief Risk Officer (Marcus).
- **Final Result:** ${this.outcome.status}
- **My Archetype:** "${this.outcome.archetype}"
- **Ending Metrics:** Trust (${this.metrics.trust}/100) vs Speed (${this.metrics.velocity}/100).

## MY DECISION PATH
${path}

## YOUR COACHING
1. **Psychological Analysis:** Based on my card choices, do I lean too much on "Asking for Permission" (Data/Policy) or "Asking for Forgiveness" (Speed)?
2. **The "Marcus" Perspective:** Explain *why* the Risk Officer reacted the way he did to my specific choices.
3. **Real World Application:** Give me a specific script to use in my next real Steering Committee meeting to gain Trust without sacrificing Speed.

TONE: Constructive, psychological, tactical.`;
            }
        },

// ------------------------------------------------------------------
        // EXCEL ESCAPE ROOM (Game + Leaderboard + AI Prompt)
        // ------------------------------------------------------------------
        excelEscape: {
            active: false,
            level: 0,
            hp: 100, // Political Capital
            score: 0, // Efficiency Score
            logs: [],
            loading: false,
            
            // State Tracking
            playerName: '',
            playStyle: { manual: 0, legacy: 0, modern: 0 }, 
            gamePath: [], 
            outcome: null,
            leaderboard: [],
            isSubmitting: false,

            // THE LEVEL DATABASE
            allLevels: [
                {
                    id: 1, name: "The Basement of Reconciliation", enemy: "The VLOOKUP Hydra",
                    desc: "A 50MB spreadsheet crashes every time Finance opens it. The Regulator needs the report in 1 hour.",
                    options: [
                        { label: "Split into 4 files", type: "manual", cost: 20, score: 10, risk: 0, msg: "Safe, but you burned out 2 analysts." },
                        { label: "Write VBA Macro", type: "legacy", cost: 10, score: 30, risk: 20, msg: "It works, but now you own legacy code." },
                        { label: "Python ETL Script", type: "modern", cost: 0, score: 100, risk: 40, msg: "High risk deploy... SUCCESS! Automated forever." }
                    ]
                },
                {
                    id: 2, name: "The Email Chain of Doom", enemy: "The Version Control Ghost",
                    desc: "Three departments are emailing 'Final_v3_REAL.xlsx'. No one knows which file is the truth.",
                    options: [
                        { label: "Call Emergency Meeting", type: "manual", cost: 15, score: 5, risk: 0, msg: "You wasted 2 hours, but found the file." },
                        { label: "Move to SharePoint", type: "legacy", cost: 5, score: 20, risk: 10, msg: "Better, but sync issues remain." },
                        { label: "Centralize in Data Mesh", type: "modern", cost: 0, score: 150, risk: 50, msg: "Single Source of Truth established." }
                    ]
                },
                {
                    id: 3, name: "The Boardroom Firewall", enemy: "The PDF Dragon",
                    desc: "The CEO wants a live dashboard, but the data is trapped in static PDFs generated by a mainframe.",
                    options: [
                        { label: "Hire interns to type it", type: "manual", cost: 30, score: 10, risk: 0, msg: "Costly and slow. CEO is unimpressed." },
                        { label: "Screen Scraper", type: "legacy", cost: 15, score: 40, risk: 30, msg: "Fragile. It breaks if the PDF layout changes." },
                        { label: "Build API Wrapper", type: "modern", cost: 0, score: 200, risk: 60, msg: "Real-time feed achieved. Executive delight." }
                    ]
                },
                {
                    id: 4, name: "The Deployment Weekend", enemy: "The Big Bang Release",
                    desc: "It's Friday night. You have 3,000 lines of code to deploy. The manual test script takes 48 hours.",
                    options: [
                        { label: "Order Pizza & Pray", type: "manual", cost: 40, score: 0, risk: 10, msg: "Team is exhausted. Errors likely." },
                        { label: "Delay Launch", type: "legacy", cost: 20, score: 10, risk: 0, msg: "Safe, but opportunity cost is high." },
                        { label: "CI/CD Pipeline", type: "modern", cost: 0, score: 150, risk: 40, msg: "Deploy in 10 minutes. The weekend is saved." }
                    ]
                },
                {
                    id: 5, name: "The Regulatory Audit", enemy: "The Paperwork Golem",
                    desc: "Auditors want to see who approved every change in the last 6 months. Evidence is in emails.",
                    options: [
                        { label: "Search Outlook manually", type: "manual", cost: 50, score: 5, risk: 0, msg: "Soul-crushing work. You missed a few." },
                        { label: "Export Jira Logs", type: "legacy", cost: 10, score: 50, risk: 20, msg: "Messy, but compliant." },
                        { label: "Automated Governance Chain", type: "modern", cost: 0, score: 200, risk: 30, msg: "Instant audit trail. Auditors are amazed." }
                    ]
                }
            ],

            start() {
                if (!this.playerName) this.playerName = "Agent " + Math.floor(Math.random()*1000);
                
                // 1. Reset Stats
                this.hp = 100;
                this.score = 0;
                this.playStyle = { manual: 0, legacy: 0, modern: 0 };
                this.outcome = null;
                this.logs = ["SYSTEM: Connected to Corporate Network...", "SYSTEM: Threat Scanning..."];
                
                // 2. Shuffle and pick 3 levels
                this.gamePath = [...this.allLevels].sort(() => 0.5 - Math.random()).slice(0, 3);
                
                this.active = true;
                this.level = 1;
            },

            makeMove(optionIndex) {
                this.loading = true;
                const currentLevel = this.gamePath[this.level - 1];
                const choice = currentLevel.options[optionIndex];

                // Simulate "Processing"
                setTimeout(() => {
                    this.resolveMove(choice);
                    this.loading = false;
                }, 800);
            },

            resolveMove(choice) {
                // 1. Apply Logic
                this.playStyle[choice.type]++;
                
                // Risk Calculation: Does the move fail?
                const roll = Math.random() * 100;
                let damage = choice.cost; 
                let points = choice.score;
                let logMsg = choice.msg;

                if (roll < choice.risk) {
                    // Critical Failure
                    damage += 30;
                    points = 0;
                    logMsg = `CRITICAL FAILURE! The ${choice.type} solution crashed. You took heavy political damage.`;
                }

                this.hp -= damage;
                this.score += points;
                this.logs.unshift(`L${this.level}: ${logMsg} (${points} PTS, -${damage} HP)`);

                // 2. Check Game Over
                if (this.hp <= 0) {
                    this.endGame("FIRED", "You ran out of Political Capital.");
                    return;
                }

                // 3. Advance or Win
                if (this.level < 3) {
                    this.level++;
                } else {
                    this.endGame("PROMOTED", "You escaped the factory.");
                }
            },

            endGame(status, msg) {
                // Determine Archetype
                let archetype = "The Pragmatist";
                if (this.playStyle.manual >= 2) archetype = "The Martyr (Manual Worker)";
                if (this.playStyle.modern >= 2) archetype = "The Futurist (Automation First)";
                
                this.outcome = {
                    status: status,
                    msg: msg,
                    finalScore: this.score,
                    archetype: archetype,
                    hpRemaining: Math.max(0, this.hp)
                };

                // Trigger Leaderboard Save if Won
                if (status === "PROMOTED") {
                    this.saveScore();
                }
            },

            // --- SUPABASE LEADERBOARD ---
            async saveScore() {
                if (this.isSubmitting) return;
                this.isSubmitting = true;
                
                // Ensure Supabase Client exists
                if (!this.supabase && window.supabase) {
                     const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
                     const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
                     this.supabase = window.supabase.createClient(https://qbgfduhsgrdfonxpqywu.supabase.co/functions/v1/bilingual-ai, GOOGLE_API_KEY);
                }

                if (this.supabase) {
                    try {
                        await this.supabase.from('game_leaderboard').insert({
                            player_name: this.playerName,
                            score: this.score,
                            hp_remaining: this.hp
                        });
                        // Allow time for insert, then fetch
                        setTimeout(() => { this.fetchLeaderboard(); }, 500);
                    } catch (e) { console.error("Leaderboard Error", e); }
                }
                this.isSubmitting = false;
            },

            async fetchLeaderboard() {
                if (!this.supabase && window.supabase) {
                     const supabaseUrl = 'https://qbgfduhsgrdfonxpqywu.supabase.co';
                     const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiZ2ZkdWhzZ3JkZm9ueHBxeXd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNjQ0MzcsImV4cCI6MjA4Mjk0MDQzN30.0FGzq_Vg2oYwl8JZXBrAqNmqTBWUnzJTEAdgPap7up4';
                     this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
                }

                if (this.supabase) {
                    const { data, error } = await this.supabase
                        .from('game_leaderboard')
                        .select('*')
                        .order('score', { ascending: false })
                        .limit(5);

                    if (data) this.leaderboard = data;
                }
            },

            // --- PROMPT GENERATOR ---
            generatePerformancePrompt() {
                if (!this.outcome) return "Finish game first.";
                const o = this.outcome;
                const p = this.playStyle;

                return `ACT AS: A Chief Technology Officer (CTO) conducting a performance review.

## THE GAMIFIED ASSESSMENT
The candidate played the "Excel Escape Room" simulation.
- **Outcome:** ${o.status}
- **Leadership Archetype:** "${o.archetype}"
- **Final Score:** ${o.finalScore} (Efficiency)
- **Political Capital Remaining:** ${o.hpRemaining}/100

## DECISION STYLE
- **Manual Work (Grind):** Chosen ${p.manual} times.
- **Legacy Patches (Band-aids):** Chosen ${p.legacy} times.
- **Modern Automation (Risk/Reward):** Chosen ${p.modern} times.

## YOUR MISSION
Write a **Performance Feedback Email** to this employee.
1. **The Profiling:** Analyze what their playstyle says about their real-world management style (e.g., "You rely too much on heroism" vs "You take smart technical risks").
2. **The Career Path:** Based on this, should they be promoted to Architecture (Strategic) or Operations (Tactical)?
3. **The Book Recommendation:** Recommend 1 real book (e.g. Phoenix Project) based on their specific failure/success pattern.

TONE: Mentorship, tough love, growth-oriented.`;
            },

            reset() {
                this.active = false;
                this.level = 0;
                this.outcome = null;
            }
        },
        
        // ------------------------------------------------------------------
        // COGNITIVE LOAD CALCULATOR (Deterministic Psych-Math Engine)
        // ------------------------------------------------------------------
        cognitiveCalc: {
            inputs: {
                teamSize: 6,
                interruptions: 15, // Context switches per day per person
                meetings: 12, // Hours per week in meetings
                tools: 8, // Number of tools required to ship one feature
                ambiguity: 5 // 1-10 (1=Clear Specs, 10="Figure it out")
            },
            result: null,
            loading: false,

            calculate() {
                this.loading = true;
                
                // Simulate "Neural Processing" visual delay
                setTimeout(() => {
                    this.runMath();
                    this.loading = false;
                }, 800);
            },

            runMath() {
                const i = this.inputs;

                // 1. COMPUTE LOAD VECTORS
                
                // A. Context Switch Tax (The "Sawtooth Effect")
                // Research: It takes ~23 mins to refocus. 
                // Formula: Interruptions * 0.2 hrs * Impact Factor
                const switchLoad = (i.interruptions * 3) / 100; // Normalized 0-1.0

                // B. Meeting Tax (Fragmented Time)
                // 40 hour work week. >20 hours is critical.
                const meetingLoad = (i.meetings / 30); // Normalized

                // C. Tooling Friction (The "Toggle Tax")
                // >5 tools creates heavy friction
                const toolLoad = (i.tools / 15); // Normalized

                // D. Ambiguity (Decision Fatigue)
                const ambiguityLoad = (i.ambiguity / 10);

                // 2. TOTAL COGNITIVE LOAD INDEX (0-100)
                // Weighted: Interruptions (35%), Ambiguity (30%), Meetings (20%), Tools (15%)
                let rawScore = (switchLoad * 35) + (ambiguityLoad * 30) + (meetingLoad * 20) + (toolLoad * 15);
                rawScore = rawScore * 2.5; // Scale to 100
                const loadScore = Math.min(100, Math.round(rawScore));

                // 3. FINANCIAL IMPACT (THE "COGNITIVE TAX")
                // Assumption: Avg blended rate $80/hr. 
                // Wasted time = Re-focus time + Useless meetings + Tool toggling
                // Refocus time = Interruptions * 15mins
                const dailyWastedHours = (i.interruptions * 0.25) + (i.meetings / 5 * 0.2) + (i.tools * 0.05); 
                const weeklyWaste = dailyWastedHours * 5;
                const annualCost = Math.round(weeklyWaste * 50 * 80 * i.teamSize); // 50 weeks, $80/hr

                // 4. DIAGNOSIS
                let zone = "FLOW STATE";
                let color = "text-green-400";
                let diagnosis = "The team has space for Deep Work.";
                
                if (loadScore > 80) {
                    zone = "BURNOUT ZONE";
                    color = "text-risk";
                    diagnosis = "Cognitive capacity is exceeded. Innovation is impossible.";
                } else if (loadScore > 50) {
                    zone = "FRAGMENTED";
                    color = "text-yellow-400";
                    diagnosis = "Efficiency is bleeding out via context switching.";
                }

                this.result = {
                    score: loadScore,
                    zone,
                    color,
                    diagnosis,
                    annualTax: annualCost
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generatePsychPrompt() {
                if (!this.result) return "Run analysis first.";
                const r = this.result;
                const i = this.inputs;

                return `ACT AS: An Organizational Psychologist and Team Topologies Expert.

## THE COGNITIVE LOAD AUDIT
I have measured the mental overhead of my software team (${i.teamSize} people).
- **Cognitive Load Index:** ${r.score}/100 (${r.zone})
- **Financial "Cognitive Tax":** $${r.annualTax.toLocaleString()}/year (Cost of lost focus).

## THE STRESSORS
1. **Context Switching:** ${i.interruptions} interruptions/day (The "Sawtooth" Effect).
2. **Ambiguity:** ${i.ambiguity}/10 (Decision Fatigue).
3. **Tool Chain:** ${i.tools} disjointed tools to ship one feature.
4. **Meeting Load:** ${i.meetings} hours/week.

## YOUR MISSION
Write a **"Deep Work" Preservation Strategy** for this team.
1. **The Architecture Fix:** Explain how "Conway's Law" might be causing the high ambiguity/interruptions (e.g. Dependencies on other teams).
2. **The Ritual:** Propose a specific team ritual (e.g. "No-Meeting Wednesdays" or "Async-First Mornings") to lower the score by 20 points.
3. **The Tool Rationalization:** Give a ruthless heuristic for killing one of the ${i.tools} tools.

TONE: Scientific, empathetic, efficiency-focused. Use terms like "Extraneous Load" and "Flow Efficiency".`;
            }
        },

        // ------------------------------------------------------------------
        // BILINGUAL BINGO (Gamified Cultural Observation)
        // ------------------------------------------------------------------
        bingoGame: {
            active: false,
            board: [], // The 5x5 grid
            history: [], // Log of clicked items
            metrics: { score: 0, toxicity: 0, status: "LISTENING" },
            
            // The Tile Database
            library: {
                positive: [
                    "Data Overruled Opinion", "Customer Pain Cited", "Tech Explained Simply", "Financial Impact Calculated", 
                    "Silo Bridge Built", "Psych Safety Moment", "'I Don't Know' Admitted", "Experiment Proposed",
                    "Latency Linked to Revenue", "Manual Work Automating", "No Acronyms Used", "Blocker Removed"
                ],
                negative: [
                    "HiPPO Dominated", "Blamed the Vendor", "Analysis Paralysis", "It Worked on My Machine", 
                    "We've Always Done It This Way", "Passive Aggression", "Meeting Could Have Been Email", 
                    "Tech Jargon Overload", "Scope Creep", "Shadow IT Revealed", "Excel Spreadsheet Opened", "Budget Freeze Cited"
                ]
            },

            startNewGame() {
                // 1. Shuffle and Pick
                const pos = [...this.library.positive].sort(() => 0.5 - Math.random());
                const neg = [...this.library.negative].sort(() => 0.5 - Math.random());
                
                // 2. Build 5x5 Grid (Mix of Good and Bad)
                // We want a mix to test the meeting's soul.
                let deck = [
                    ...pos.slice(0, 13), 
                    ...neg.slice(0, 12)
                ].sort(() => 0.5 - Math.random());

                // 3. Create Board Objects
                this.board = deck.map((text, i) => ({
                    id: i,
                    text: text,
                    type: this.library.positive.includes(text) ? 'good' : 'bad',
                    selected: false
                }));

                // 4. Set Free Space (Center)
                this.board[12] = { id: 12, text: "BILINGUAL MINDSET", type: 'neutral', selected: true };

                this.metrics = { score: 0, toxicity: 0, status: "IN SESSION" };
                this.history = [];
                this.active = true;
            },

            toggleTile(index) {
                if (index === 12) return; // Free space locked
                
                const tile = this.board[index];
                tile.selected = !tile.selected;

                this.calculateMetrics();
            },

            calculateMetrics() {
                const selected = this.board.filter(t => t.selected && t.id !== 12);
                
                // 1. Culture Score (Math)
                // Good tiles = +10, Bad tiles = -10
                let rawScore = 0;
                let badCount = 0;
                
                selected.forEach(t => {
                    if (t.type === 'good') rawScore += 10;
                    else { rawScore -= 10; badCount++; }
                });

                this.metrics.score = rawScore;

                // 2. Toxicity Index (Percentage of bad tiles vs total clicked)
                this.metrics.toxicity = selected.length === 0 ? 0 : Math.round((badCount / selected.length) * 100);

                // 3. Win Condition (Standard Bingo Rules)
                if (this.checkWin()) {
                    this.metrics.status = "BINGO!";
                } else {
                    this.metrics.status = "IN SESSION";
                }
            },

            checkWin() {
                // Indices for Rows, Cols, Diagonals
                const wins = [
                    [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // Rows
                    [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // Cols
                    [0,6,12,18,24], [4,8,12,16,20] // Diagonals
                ];

                return wins.some(pattern => pattern.every(i => this.board[i].selected));
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateCulturePrompt() {
                const selected = this.board.filter(t => t.selected);
                if (selected.length === 0) return "Play the game first.";

                const goodEvents = selected.filter(t => t.type === 'good').map(t => t.text).join(", ");
                const badEvents = selected.filter(t => t.type === 'bad').map(t => t.text).join(", ");
                const score = this.metrics.score;
                const toxicity = this.metrics.toxicity;

                let archetype = "Balanced";
                if (score > 50) archetype = "High-Performance Squad";
                if (toxicity > 60) archetype = "Toxic Bureaucracy";
                if (score < 0 && toxicity < 40) archetype = "Passive / Low Energy";

                return `ACT AS: A Corporate Anthropologist and Agile Coach.

## THE MEETING OBSERVATION REPORT (BINGO DATA)
I observed a team meeting and tracked behavioral signals.
- **Culture Score:** ${score} (Net Positive Behaviors)
- **Toxicity Index:** ${toxicity}% (Percentage of negative behaviors)
- **Meeting Archetype:** "${archetype}"

## OBSERVED BEHAVIORS
- **Positive Signals (Assets):** ${goodEvents || "None observed."}
- **Negative Signals (Liabilities):** ${badEvents || "None observed."}

## YOUR MISSION
Write a **Cultural Retro** for the team leader.
1. **The Mirror:** Describe the "vibe" of the meeting based on the data. Was it a fight? A funeral? A workshop?
2. **The Intervention:** Pick the specific Negative Signal "${badEvents.split(',')[0] || 'Generic Silence'}" and prescribe a "Ritual" to fix it (e.g. "To fix HiPPO dominance, introduce 'Silent Brainstorming'").
3. **The Reinforcement:** How can we double down on the Positive Signals observed?

TONE: Observational, witty, constructive. Reference "Tribal Leadership" concepts.`;
            }
        },

        // ------------------------------------------------------------------
        // SPRINT HEALTH CHECK (Deterministic Forecasting Engine)
        // ------------------------------------------------------------------
        sprintHealth: {
            inputs: {
                day: 5,           // Current day (1-10)
                plannedPts: 40,   // Committed points
                completedPts: 10, // Done so far
                addedPts: 0,      // Scope creep
                blockers: 1,      // 0=None, 1=Minor, 2=Major
                mood: 7           // 1-10 Team Morale
            },
            analysis: null,
            loading: false,

            calculate() {
                this.loading = true;
                
                // Simulate "Vital Signs Scan"
                setTimeout(() => {
                    this.runDiagnostics();
                    this.loading = false;
                }, 600);
            },

            runDiagnostics() {
                const i = this.inputs;
                const totalScope = parseInt(i.plannedPts) + parseInt(i.addedPts);
                
                // 1. TIME PACING (The Ideal Trend)
                // Assuming 10 day sprint
                const timeElapsedPct = (i.day / 10);
                const idealCompletion = totalScope * timeElapsedPct;
                
                // 2. DRIFT CALCULATION (Are we behind?)
                // Positive = Ahead, Negative = Behind
                const delta = parseInt(i.completedPts) - idealCompletion;
                const driftPct = (delta / totalScope) * 100;

                // 3. CREEP FACTOR (The Silent Killer)
                const creepPct = (parseInt(i.addedPts) / parseInt(i.plannedPts)) * 100;

                // 4. PROBABILITY ENGINE (Weighted Score 0-100)
                // Weights: Velocity (40%), Mood (30%), Creep (20%), Blockers (10%)
                
                let velocityScore = 100;
                if (driftPct < 0) velocityScore = Math.max(0, 100 - (Math.abs(driftPct) * 2)); // Penalty for being behind
                
                let moodScore = i.mood * 10;
                
                let creepScore = Math.max(0, 100 - (creepPct * 2)); // Penalty for adding scope
                
                let blockerScore = i.blockers === 0 ? 100 : (i.blockers === 1 ? 50 : 0);

                // Weighted Average
                const probability = (velocityScore * 0.4) + (moodScore * 0.3) + (creepScore * 0.2) + (blockerScore * 0.1);

                // 5. DIAGNOSIS
                let weather = "Sunny";
                let color = "text-green-400";
                let prescription = "Stay the course. Protect the team from interference.";

                if (probability < 40) {
                    weather = "Hurricane";
                    color = "text-red-500";
                    prescription = "EMERGENCY: Descope immediately. Cut 30% of the backlog today.";
                } else if (probability < 70) {
                    weather = "Turbulence";
                    color = "text-orange-400";
                    prescription = "Risk of carry-over. Focus on finishing 'In Progress' before starting new.";
                } else if (creepPct > 10) {
                    weather = "Foggy";
                    color = "text-yellow-400";
                    prescription = "Scope Creep detected. Reject any new requests.";
                }

                this.analysis = {
                    score: Math.round(probability),
                    weather,
                    color,
                    prescription,
                    drift: Math.round(driftPct),
                    creep: Math.round(creepPct),
                    completionRate: Math.round((i.completedPts / totalScope) * 100)
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateStandupPrompt() {
                if (!this.analysis) return "Run diagnostics first.";
                const a = this.analysis;
                const i = this.inputs;

                return `ACT AS: An Agile Coach and Crisis Manager.

## THE SPRINT DIAGNOSTIC REPORT
I have run a health check on the current sprint (Day ${i.day}/10).
- **Success Probability:** ${a.score}% (${a.weather})
- **Velocity Drift:** ${a.drift > 0 ? "+" : ""}${a.drift}% vs Ideal Trend.
- **Scope Creep:** ${a.creep}% added work.
- **Team Morale:** ${i.mood}/10.
- **Blocker Status:** ${i.blockers === 2 ? "CRITICAL STOP" : (i.blockers === 1 ? "Drag" : "Clear")}.

## THE PRESCRIPTION
"${a.prescription}"

## YOUR MISSION
Write a **"Standup Intervention Script"** for tomorrow morning.
1. **The Reality Check:** A script to show the team the data without blaming them (e.g., "Math says we are 20% behind").
2. **The Hard Choice:** A specific question to ask the Product Owner about what to cut *today* to save the sprint goal.
3. **The Morale Boost:** A 1-sentence rally cry acknowledging the hard work despite the ${a.weather} conditions.

TONE: Urgent, supportive, data-driven.`;
            }
        },

        
// ------------------------------------------------------------------
        // CONTINUOUS ADAPTATION MONITOR (Deterministic Radar Engine)
        // ------------------------------------------------------------------
        adaptMonitor: {
            // The 5 Dimensions of Plasticity
            dimensions: [
                { id: 'learning', label: 'Learning Velocity', val: 5, desc: "Speed from 'Idea' to 'Validated Data'", weight: 1.2 },
                { id: 'decisions', label: 'Decision Latency', val: 5, desc: "Time to make a reversible decision", weight: 1.0 },
                { id: 'safety', label: 'Psychological Safety', val: 5, desc: "Tolerance for failure/bad news", weight: 1.5 }, // Critical Multiplier
                { id: 'funding', label: 'Funding Fluidity', val: 5, desc: "Ability to move budget mid-year", weight: 1.1 },
                { id: 'customer', label: 'Customer Closeness', val: 5, desc: "Layers between Devs and Users", weight: 1.0 }
            ],
            
            result: null,
            chart: null,
            loading: false,

            calculate() {
                this.loading = true;
                
                // Simulate "Telemetry Scan"
                setTimeout(() => {
                    this.runMath();
                    this.loading = false;
                    this.$nextTick(() => this.renderRadar());
                }, 800);
            },

            runMath() {
                // 1. CALCULATE WEIGHTED AQ (Adaptability Quotient)
                let totalScore = 0;
                let totalWeight = 0;
                let lowestDim = this.dimensions[0];

                this.dimensions.forEach(d => {
                    totalScore += (d.val * d.weight);
                    totalWeight += d.weight;
                    if (d.val < lowestDim.val) lowestDim = d;
                });

                let aq = (totalScore / totalWeight) * 10; // Scale to 100

                // 2. THE SAFETY VETO (Math Constraint)
                // You cannot be adaptable if people are terrified.
                // If Safety < 4, AQ is capped at 50, regardless of other scores.
                const safetyScore = this.dimensions.find(d => d.id === 'safety').val;
                let penalty = "";
                
                if (safetyScore < 4) {
                    aq = Math.min(aq, 45);
                    penalty = "SAFETY VETO APPLIED: Fear is freezing the organization.";
                }

                // 3. ARCHETYPE PROFILING
                let archetype = "The Fossil"; // Default
                let color = "text-risk";
                let advice = "Survival is unlikely without radical change.";

                if (aq > 80) {
                    archetype = "The Chameleon";
                    color = "text-primary";
                    advice = "Market Leader. Focus on maintaining edge.";
                } else if (aq > 60) {
                    archetype = "The Tanker";
                    color = "text-yellow-400";
                    advice = "Strong but slow to turn. Vulnerable to agile disruptors.";
                } else if (safetyScore > 7 && aq < 60) {
                    archetype = "The Country Club"; // High safety, low output
                    color = "text-orange-400";
                    advice = "Too comfortable. Needs urgency/performance pressure.";
                }

                this.result = {
                    aq: Math.round(aq),
                    archetype,
                    color,
                    penalty,
                    weakness: lowestDim.label,
                    advice
                };
            },

            renderRadar() {
                const ctx = document.getElementById('adaptChart');
                if (!ctx) return;
                
                // Destroy old instance if exists (requires tracking the instance)
                if (window.adaptChartInstance) window.adaptChartInstance.destroy();

                window.adaptChartInstance = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: this.dimensions.map(d => d.label),
                        datasets: [{
                            label: 'Current Plasticity',
                            data: this.dimensions.map(d => d.val),
                            backgroundColor: 'rgba(34, 211, 238, 0.2)', // Cyan opacity
                            borderColor: '#22d3ee', // Cyan
                            pointBackgroundColor: '#fff',
                            borderWidth: 2
                        },
                        {
                            label: 'Neo-Bank Benchmark',
                            data: [8, 9, 8, 9, 9], // The target
                            backgroundColor: 'transparent',
                            borderColor: '#94a3b8', // Slate
                            borderDash: [5, 5],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            r: {
                                min: 0, max: 10,
                                ticks: { display: false },
                                grid: { color: '#334155' },
                                angleLines: { color: '#334155' },
                                pointLabels: { color: '#e2e8f0', font: { size: 10, family: 'monospace' } }
                            }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateChangePrompt() {
                if (!this.result) return "Run analysis first.";
                const r = this.result;
                const scores = this.dimensions.map(d => `- ${d.label}: ${d.val}/10`).join("\n");

                return `ACT AS: An Organizational Design Consultant and Change Management Expert.

## THE ADAPTABILITY AUDIT
I have measured my organization's "Adaptability Quotient" (AQ).
- **AQ Score:** ${r.aq}/100
- **Archetype:** "${r.archetype}"
- **Critical Constraint:** ${r.weakness}
- **Structural Block:** ${r.penalty || "None."}

## DIMENSIONAL DATA
${scores}

## YOUR MISSION
Design a **30-Day Intervention Plan** to break the rigidity.
1. **The Diagnosis:** Explain *why* an organization with this profile fails in the current market (use a biological metaphor).
2. **The "Shock" Therapy:** Propose 1 radical action to fix the "${r.weakness}" (e.g., if Funding is low, propose "VC-style Pitch Days" instead of annual budgets).
3. **The Culture Hack:** Give me a specific meeting ritual to introduce next Monday to signal that "things have changed."

TONE: Urgent, biological (evolutionary), prescriptive.`;
            }
        },

        // ------------------------------------------------------------------
        // REGULATORY IMPACT SIMULATOR (Deterministic Impact Matrix)
        // ------------------------------------------------------------------
        regSimulator: {
            selectedReg: null,
            inputs: {
                legacyScore: 50, // 0-100 (How old is your tech?)
                cloudAdoption: 30, // 0-100 (How much is on cloud?)
                dataGovernance: 40 // 0-100 (How organized is data?)
            },
            analysis: null,
            loading: false,

            // The Regulation Database
            regulations: [
                {
                    id: 'psd3',
                    name: "PSD3 / PSR",
                    focus: "Payments & Fraud",
                    desc: "Stricter Strong Customer Authentication (SCA) and API performance parity.",
                    impactVector: { api: 0.9, security: 0.8, data: 0.3, infra: 0.2 }, // Weights
                    baseCost: 2000000 // $2M base implementation
                },
                {
                    id: 'aiact',
                    name: "EU AI Act",
                    focus: "Model Governance",
                    desc: "Categorization of 'High Risk' AI. Mandatory human oversight and data lineage.",
                    impactVector: { api: 0.2, security: 0.4, data: 0.9, infra: 0.5 },
                    baseCost: 1500000
                },
                {
                    id: 'dora',
                    name: "DORA",
                    focus: "Operational Resilience",
                    desc: "Digital Operational Resilience Act. ICT risk management and 3rd party auditing.",
                    impactVector: { api: 0.4, security: 0.7, data: 0.5, infra: 0.9 },
                    baseCost: 3000000
                },
                {
                    id: 'basel4',
                    name: "Basel IV",
                    focus: "Capital & Risk",
                    desc: "Standardized approach for credit risk. Heavy data aggregation requirements.",
                    impactVector: { api: 0.3, security: 0.2, data: 1.0, infra: 0.4 },
                    baseCost: 5000000
                }
            ],

            simulate() {
                if (!this.selectedReg) return alert("Select a regulation.");
                
                this.loading = true;
                this.analysis = null;

                // Simulate "Impact Analysis"
                setTimeout(() => {
                    this.runImpactMath();
                    this.loading = false;
                }, 1000);
            },

            runImpactMath() {
                const reg = this.selectedReg;
                const i = this.inputs;

                // 1. Calculate Multipliers based on Organization Health
                // High Legacy = Higher Cost (Harder to change)
                const legacyMult = 1 + (i.legacyScore / 100); 
                
                // Low Governance = Higher Risk (Harder to report)
                const govMult = 1 + ((100 - i.dataGovernance) / 100);

                // 2. Calculate Total Cost
                const estCost = reg.baseCost * legacyMult * govMult;

                // 3. Calculate "Blast Radius" (Systems Affected)
                // We generate a heat score (0-100) for each domain based on Reg Vector vs Org State
                const systems = [
                    { name: "API Gateway", heat: reg.impactVector.api * 100 },
                    { name: "Core Banking (Legacy)", heat: reg.impactVector.infra * i.legacyScore },
                    { name: "Data Lake", heat: reg.impactVector.data * (150 - i.dataGovernance) }, // Poor gov makes this hotter
                    { name: "IAM / Security", heat: reg.impactVector.security * 100 }
                ];

                // 4. Calculate Fine Exposure (The "Stick")
                // Arbitrary revenue base of $1B for simulation
                const maxFine = 1000000000 * 0.04; // 4% of turnover (GDPR/AI Act standard)
                const exposure = maxFine * (1 - (i.dataGovernance / 200)); // Better gov reduces prob

                this.analysis = {
                    cost: Math.round(estCost),
                    exposure: Math.round(exposure),
                    timeline: Math.round(12 * legacyMult), // Months
                    systems: systems.sort((a,b) => b.heat - a.heat),
                    complexity: legacyMult > 1.5 ? "EXTREME" : "MANAGEABLE"
                };
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateCompliancePrompt() {
                if (!this.analysis) return "Run simulation first.";
                const a = this.analysis;
                const r = this.selectedReg;
                const sysList = a.systems.map(s => `- **${s.name}:** Impact Level ${Math.round(s.heat)}/100`).join("\n");

                return `ACT AS: A Chief Compliance Officer (CCO) and CTO.

## THE REGULATORY IMPACT ASSESSMENT
We are preparing for **${r.name}** (${r.focus}).
- **Estimated Implementation Cost:** $${a.cost.toLocaleString()}
- **Timeline:** ${a.timeline} Months
- **Technical Complexity:** ${a.complexity} (Due to ${this.inputs.legacyScore}% Legacy Debt).

## THE "BLAST RADIUS" (IMPACTED SYSTEMS)
${sysList}

## YOUR MISSION
Draft a **Compliance Roadmap** for the Board.
1. **The Gap Analysis:** Explain why our current setup (Low Data Governance, High Legacy) makes compliance with ${r.name} specifically difficult.
2. **The "Must-Do" Projects:** Define the top 3 technical initiatives we must fund immediately to avoid the fine exposure of ~$${(a.exposure/1000000).toFixed(1)}M.
3. **The Opportunity:** How can we use this mandatory spend to actually modernize the bank (e.g. "Use DORA to finally move to Cloud")?

TONE: Urgent, strategic, turning "Red Tape" into "Transformation".`;
            }
        },

        // ------------------------------------------------------------------
        // VALUE STREAM FLOW CALCULATOR (Deterministic Lean Engine)
        // ------------------------------------------------------------------
        flowCalc: {
            processName: 'Commercial Loan Approval',
            unit: 'hours', // minutes, hours, days
            steps: [
                { id: 1, name: 'Customer Application', work: 1, wait: 0, type: 'Input' },
                { id: 2, name: 'Credit Risk Review', work: 2, wait: 48, type: 'Bottleneck' }, // 2 days waiting
                { id: 3, name: 'Legal Sanctions Check', work: 0.5, wait: 4, type: 'Process' },
                { id: 4, name: 'Final Sign-off', work: 0.2, wait: 24, type: 'Approval' }
            ],
            metrics: null,
            loading: false,

            addStep() {
                this.steps.push({ 
                    id: Date.now(), 
                    name: 'New Step', 
                    work: 1, 
                    wait: 0, 
                    type: 'Process' 
                });
                this.calculate();
            },

            removeStep(id) {
                this.steps = this.steps.filter(s => s.id !== id);
                this.calculate();
            },

            calculate() {
                this.loading = true;
                this.metrics = null;

                // Simulate "Process Mapping"
                setTimeout(() => {
                    this.runMath();
                    this.loading = false;
                }, 600);
            },

            runMath() {
                const totalWork = this.steps.reduce((acc, s) => acc + parseFloat(s.work), 0);
                const totalWait = this.steps.reduce((acc, s) => acc + parseFloat(s.wait), 0);
                const totalLeadTime = totalWork + totalWait;

                // 1. Flow Efficiency Ratio
                // Formula: (Value Add Time / Total Lead Time) * 100
                const efficiency = totalLeadTime === 0 ? 0 : Math.round((totalWork / totalLeadTime) * 100);

                // 2. Bottleneck Identification
                // Find the step with the highest Wait Time
                const bottleneckStep = this.steps.reduce((prev, current) => (prev.wait > current.wait) ? prev : current);

                // 3. Diagnosis
                let verdict = "";
                let color = "";
                let analysis = "";

                if (efficiency < 15) {
                    verdict = "RESOURCE EFFICIENCY TRAP";
                    color = "text-red-500";
                    analysis = "Your process is 85%+ waste. You are optimizing for 'keeping people busy' instead of 'moving work'.";
                } else if (efficiency < 40) {
                    verdict = "TYPICAL CORPORATE";
                    color = "text-yellow-400";
                    analysis = "Standard friction. Handoffs and approvals are eating your speed.";
                } else {
                    verdict = "LEAN MACHINE";
                    color = "text-green-400";
                    analysis = "Excellent flow. You have removed most wait states.";
                }

                this.metrics = {
                    totalWork,
                    totalWait,
                    totalLeadTime,
                    efficiency,
                    bottleneck: bottleneckStep,
                    verdict,
                    color,
                    analysis
                }
            
            },

            generateLeanPrompt() {
                if (!this.metrics) return "Calculate flow first.";
                const m = this.metrics;
                return `ACT AS: Lean Six Sigma Master.
## PROCESS AUDIT: "${this.processName}"
- **Flow Efficiency:** ${m.efficiency}% (Industry Goal: >25%)
- **Total Lead Time:** ${m.totalLeadTime} ${this.unit}
- **Value Added Time:** ${m.totalWork} ${this.unit}
- **Waste (Wait Time):** ${m.totalWait} ${this.unit}

## BOTTLENECK
Step: "${m.bottleneck.name}" (Wait Time: ${m.bottleneck.wait} ${this.unit})

## MISSION
1. Identify the root cause of the wait time at the bottleneck.
2. Propose a way to run steps in parallel instead of sequence.
3. Calculate the cost savings if efficiency improves to 50%.`;
            }
        },

        // ------------------------------------------------------------------
        // ADR BUILDER (Weighted Decision Matrix Engine)
        // ------------------------------------------------------------------
        adrBuilder: {
            title: '',
            status: 'PROPOSED', // PROPOSED, ACCEPTED, REJECTED
            
            // The Criteria (Rows) - Weight is 1-5
            criteria: [
                { id: 1, label: 'Development Speed', weight: 5 },
                { id: 2, label: 'Scalability', weight: 4 },
                { id: 3, label: 'Cost to Maintain', weight: 3 }
            ],

            // The Options (Columns) - Scores are 1-5
            options: [
                { 
                    id: 1, 
                    name: 'Option A: Monolith', 
                    scores: { 1: 5, 2: 2, 3: 5 }, // criteriaID: score
                    total: 0 
                },
                { 
                    id: 2, 
                    name: 'Option B: Microservices', 
                    scores: { 1: 2, 2: 5, 3: 2 }, 
                    total: 0 
                }
            ],

            winner: null,

            // Demo Data
            loadDemo() {
                this.title = "Database Selection for New Payments Service";
                this.criteria = [
                    { id: 1, label: 'ACID Compliance', weight: 5 },
                    { id: 2, label: 'Write Throughput', weight: 4 },
                    { id: 3, label: 'Team Familiarity', weight: 3 }
                ];
                this.options = [
                    { id: 1, name: 'PostgreSQL', scores: { 1: 5, 2: 3, 3: 5 }, total: 0 },
                    { id: 2, name: 'DynamoDB', scores: { 1: 3, 2: 5, 3: 2 }, total: 0 },
                    { id: 3, name: 'Mongo (NoSQL)', scores: { 1: 2, 2: 4, 3: 4 }, total: 0 }
                ];
                this.calculate();
            },

            addCriteria() {
                const id = Date.now();
                this.criteria.push({ id, label: 'New Criteria', weight: 3 });
                // Init scores for existing options
                this.options.forEach(o => o.scores[id] = 3);
                this.calculate();
            },

            addOption() {
                const id = Date.now();
                let newScores = {};
                this.criteria.forEach(c => newScores[c.id] = 3);
                this.options.push({ id, name: 'New Option', scores: newScores, total: 0 });
                this.calculate();
            },

            calculate() {
                let maxScore = -1;
                let winningOption = null;

                this.options.forEach(opt => {
                    let sum = 0;
                    this.criteria.forEach(crit => {
                        const s = parseInt(opt.scores[crit.id] || 0);
                        const w = parseInt(crit.weight || 0);
                        sum += (s * w);
                    });
                    opt.total = sum;

                    if (sum > maxScore) {
                        maxScore = sum;
                        winningOption = opt;
                    }
                });

                this.winner = winningOption;
            },

            // --- ADVANCED PROMPT GENERATOR ---
            generateADRPrompt() {
                if (!this.winner) return "Complete the matrix first.";

                const critList = this.criteria.map(c => `- ${c.label} (Weight: ${c.weight})`).join("\n");
                
                const optList = this.options.map(o => {
                    const isWinner = o.id === this.winner.id ? "(SELECTED)" : "";
                    return `### Option: ${o.name} ${isWinner}\n- Weighted Score: ${o.total}\n- Strengths/Weaknesses based on criteria scores.`;
                }).join("\n\n");

                return `ACT AS: A Principal Software Architect.

## THE ARCHITECTURE DECISION (ADR)
I need to document a formal decision record for: "${this.title}".

## THE DECISION MATRIX (MATH)
We evaluated options based on weighted criteria:
${critList}

## THE EVALUATION
${optList}

## YOUR MISSION
Write a standard **Architecture Decision Record (ADR)** in Markdown.
1. **Context:** Briefly explain why we need to make this decision.
2. **The Decision:** State clearly that we are choosing **${this.winner.name}**.
3. **The Justification:** Use the math above to explain *why* it won (e.g., "While Option B had better scalability, Option A won due to higher Team Familiarity scores").
4. **Consequences:** List the trade-offs (Negatives) of the winning choice that we must mitigate.

TONE: Technical, objective, permanent record.`;
            }
        },
        
        // ------------------------------------------------------------------
        // DAILY FEED (AI + Math + Notifications)
        // ------------------------------------------------------------------
        dailyFeed: {
            // Content State
            currentLesson: null,
            weekCache: [],
            lastFetchDate: null,
            loading: false,
            
            // User Progress & Math
            streak: 0,
            lastCompletedDate: null,
            isCompletedToday: false,
            quizState: 'pending',
            
            // Advanced Telemetry
            history: [], // Stores { date, result, term }
            fluencyScore: 0, // 0-1000 (ELO style)
            fluencyLevel: "Novice", // Novice, Apprentice, Fluent, Native
            notificationPermission: 'default',

            // Fallback Data
            fallbackData: [
                {
                    term: "Idempotency",
                    pronounce: "eye-dem-po-ten-see",
                    definition: "Making the same API call multiple times produces the same result.",
                    analogy: "Like pressing a 'Call Elevator' button. Pressing it 10 times doesn't send 10 elevators.",
                    impact: "Prevents double-charging customers on slow networks.",
                    quiz: { q: "If a user clicks 'Pay' 5 times, how many charges occur?", options: ["5 Charges", "1 Charge", "System Crash"], correct: 1 }
                }
            ],

            init() {
                // 1. Load Deep State
                const saved = JSON.parse(localStorage.getItem('bilingual_feed_v3') || '{}');
                this.streak = saved.streak || 0;
                this.lastCompletedDate = saved.lastCompletedDate;
                this.weekCache = saved.weekCache || [];
                this.lastFetchDate = saved.lastFetchDate;
                this.history = saved.history || [];
                this.fluencyScore = saved.fluencyScore || 0;
                this.updateLevel();

                // 2. Check Streak & Decay
                const today = new Date().toDateString();
                if (this.lastCompletedDate === today) {
                    this.isCompletedToday = true;
                } else if (this.lastCompletedDate) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    if (this.lastCompletedDate !== yesterday.toDateString()) {
                        this.streak = 0; 
                        this.applyDecay(); // Penalty for breaking streak
                    }
                }

                // 3. Check Notifications
                if ("Notification" in window) {
                    this.notificationPermission = Notification.permission;
                    this.checkSchedule();
                }

                this.loadContent();
            },

            // --- NOTIFICATION LOGIC ---
            requestNotify() {
                if (!("Notification" in window)) {
                    alert("This browser does not support desktop notifications");
                } else {
                    Notification.requestPermission().then(permission => {
                        this.notificationPermission = permission;
                        if (permission === "granted") {
                            new Notification("Bilingual Exec", { body: "Daily notifications enabled for 9:00 AM!" });
                        }
                    });
                }
            },

            checkSchedule() {
                // Logic: If it's after 9am, user hasn't played, and we haven't notified today
                const now = new Date();
                const isAfterNine = now.getHours() >= 9;
                const lastNotify = localStorage.getItem('last_notify_date');
                const today = now.toDateString();

                if (this.notificationPermission === 'granted' && isAfterNine && !this.isCompletedToday && lastNotify !== today) {
                    this.sendNotification();
                    localStorage.setItem('last_notify_date', today);
                }
            },

            sendNotification() {
                // Note: On mobile, this only works if the app is "open" or backgrounded in a specific way.
                // True background push requires a server (Firebase/Supabase Edge Functions).
                // This is a "Local Notification" simulation.
                new Notification("Daily Wisdom Ready", {
                    body: "Your executive briefing is ready. Keep your streak alive!",
                    icon: "https://cdn-icons-png.flaticon.com/512/3208/3208726.png",
                    tag: "daily-insight"
                });
            },

            // --- CONTENT LOGIC ---
            async loadContent() {
                const now = Date.now();
                const oneWeek = 7 * 24 * 60 * 60 * 1000;

                if (this.weekCache.length === 0 || !this.lastFetchDate || (now - this.lastFetchDate > oneWeek)) {
                    await this.fetchWeeklyBatch();
                }

                const dayIndex = new Date().getDay(); 
                this.currentLesson = this.weekCache[dayIndex] || this.weekCache[0] || this.fallbackData[0];
            },

            async fetchWeeklyBatch() {
                this.loading = true;
                const prompt = `
                    ACT AS: A Tech Coach.
                    TASK: Generate 7 "Micro-Lessons" on Tech/Banking terms.
                    OUTPUT JSON ONLY (Array of 7 objects):
                    [ { "term": "...", "pronounce": "...", "definition": "...", "analogy": "...", "impact": "...", "quiz": { "q": "...", "options": ["..."], "correct": 0 } } ]
                `;
                try {
                    let rawText = await this.askSecureAI(prompt, "Generate Weekly Feed");
                    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                    this.weekCache = JSON.parse(rawText);
                    this.lastFetchDate = Date.now();
                    this.saveState();
                } catch (e) {
                    this.weekCache = this.fallbackData;
                } finally {
                    this.loading = false;
                }
            },

                async askSecureAI(prompt, context) {
        console.log("Mock AI Call:", prompt);
        return JSON.stringify(this.fallbackData); // Return fallback data so app doesn't crash
    },

            // --- ADVANCED MATH ENGINE ---
            submitAnswer(index) {
                if (this.quizState !== 'pending') return;

                const isCorrect = index === this.currentLesson.quiz.correct;
                this.quizState = isCorrect ? 'correct' : 'wrong';
                
                // Calculate Score Impact
                this.calculateFluency(isCorrect);
                
                // Save History
                this.history.push({
                    date: new Date().toISOString(),
                    term: this.currentLesson.term,
                    result: isCorrect ? 'win' : 'loss'
                });

                if (isCorrect && !this.isCompletedToday) {
                    this.streak++;
                    this.isCompletedToday = true;
                    this.lastCompletedDate = new Date().toDateString();
                }
                
                this.saveState();
            },

            calculateFluency(isCorrect) {
                // Base points
                let delta = 0;
                
                if (isCorrect) {
                    // Reward Formula: Base (10) + Streak Bonus (logarithmic)
                    // We use Math.log to prevent runaway scores on long streaks
                    const streakBonus = Math.round(Math.log(this.streak + 1) * 5);
                    delta = 10 + streakBonus;
                } else {
                    // Penalty: Flat -15 (Pain of failure)
                    delta = -15;
                }

                this.fluencyScore = Math.max(0, this.fluencyScore + delta);
                this.updateLevel();
            },

            applyDecay() {
                // Ebbinghaus Forgetting Curve Simulation
                // Lose 5% of knowledge every day you miss
                this.fluencyScore = Math.floor(this.fluencyScore * 0.95);
                this.updateLevel();
            },

            updateLevel() {
                const s = this.fluencyScore;
                if (s < 100) this.fluencyLevel = "Novice";
                else if (s < 300) this.fluencyLevel = "Apprentice";
                else if (s < 600) this.fluencyLevel = "Fluent";
                else this.fluencyLevel = "Native Speaker";
            },

            saveState() {
                localStorage.setItem('bilingual_feed_v3', JSON.stringify({
                    streak: this.streak,
                    lastCompletedDate: this.lastCompletedDate,
                    weekCache: this.weekCache,
                    lastFetchDate: this.lastFetchDate,
                    history: this.history,
                    fluencyScore: this.fluencyScore
                }));
            },

            generateDeepDivePrompt() {
                if (!this.currentLesson) return "";
                return `ACT AS: A CTO. TEACH ME: "${this.currentLesson.term}". 1. How do I spot a fake expert? 2. What is the ROI?`;
            }
        },

// ------------------------------------------------------------------
        // EXECUTIVE LIBRARY (Interactive Curriculum Engine)
        // ------------------------------------------------------------------
        library: {
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
            },

            toggleBook(id) {
                if (this.readBooks.includes(id)) {
                    this.readBooks = this.readBooks.filter(b => b !== id);
                } else {
                    this.readBooks.push(id);
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

        }, 
        // ------------------------------------------------------------------
        // DT ROI TRACKER (Financial J-Curve Engine)
        // ------------------------------------------------------------------
        dtTracker: {
            inputs: {
                projectName: 'Cloud Migration Phase 1',
                initialCost: 500000, 
                monthlyCost: 20000,  
                monthlyHardSavings: 45000, 
                teamSize: 10,
                efficiencyGain: 15, 
                avgSalary: 120000, 
                confidence: 80 
            },
            results: null,
            loading: false, // Ensure this defaults to false

            calculate() {
                // UI Feedback
                this.loading = true;
                
                // Simulate calculation delay
                setTimeout(() => {
                    this.runFinancialModel();
                    this.loading = false;
                }, 800);
            },

            runFinancialModel() {
                const i = this.inputs;
                
                // 1. Calculate Soft Benefits Value
                const monthlySalaryLoad = (i.teamSize * i.avgSalary) / 12;
                const rawSoftSavings = monthlySalaryLoad * (i.efficiencyGain / 100);
                const adjustedSoftSavings = rawSoftSavings * (i.confidence / 100);

                // 2. Build the Timeline (24 Months)
                let balance = -i.initialCost;
                let month = 0;
                let paybackMonth = null;
                let dataPoints = [];
                let minPoint = -i.initialCost;

                for (month = 1; month <= 24; month++) {
                    const monthlyNet = (i.monthlyHardSavings + adjustedSoftSavings) - i.monthlyCost;
                    balance += monthlyNet;
                    dataPoints.push(Math.round(balance));
                    
                    if (balance >= 0 && paybackMonth === null) {
                        paybackMonth = month;
                    }
                    if (balance < minPoint) minPoint = balance;
                }

                // 3. Final Metrics
                const totalValue = balance;
                const roi = ((balance + i.initialCost) / i.initialCost) * 100;
                const hardOnlyMonthly = i.monthlyHardSavings - i.monthlyCost;
                const isHardPositive = hardOnlyMonthly > 0;

                // 4. Strategic Verdict
                let verdict = "";
                let color = "";
                
                if (paybackMonth === null) {
                    verdict = "MONEY PIT";
                    color = "text-red-500";
                } else if (paybackMonth <= 12) {
                    verdict = "SLAM DUNK";
                    color = "text-green-400";
                } else if (!isHardPositive) {
                    verdict = "STRATEGIC BET";
                    color = "text-yellow-400";
                } else {
                    verdict = "SOLID INVESTMENT";
                    color = "text-blue-400";
                }

                this.results = {
                    payback: paybackMonth ? `${paybackMonth} Months` : "> 2 Years",
                    roi24: Math.round(roi),
                    endingBalance: Math.round(balance),
                    softContribution: Math.round((adjustedSoftSavings * 24)),
                    hardContribution: Math.round(((i.monthlyHardSavings - i.monthlyCost) * 24) - i.initialCost),
                    verdict,
                    color,
                    chartData: dataPoints,
                    minPoint 
                };
            },

            // Advanced Prompt
            generateCFOReport() {
                if (!this.results) return "Run calculation first.";
                const r = this.results;
                const i = this.inputs;

                const hardStatus = i.monthlyHardSavings > i.monthlyCost 
                    ? "positive cash flow on Hard Savings alone" 
                    : "dependent on Soft Benefits (Efficiency) to break even";

                return `ACT AS: A Chief Financial Officer (CFO).

## THE INVESTMENT CASE: "${i.projectName}"
I have modeled the P&L for this initiative over a 24-month horizon.
- **Initial Outlay:** $${i.initialCost.toLocaleString()}
- **Break-Even Point:** ${r.payback}
- **2-Year ROI:** ${r.roi24}% (Net Value: $${r.endingBalance.toLocaleString()})
- **Financial Profile:** The project is ${hardStatus}.

## VALUE COMPOSITION
- **Hard P&L Impact:** $${r.hardContribution.toLocaleString()} (Cost Reductions - Running Costs)
- **Strategic Value:** $${r.softContribution.toLocaleString()} (Efficiency Gains @ ${i.confidence}% Confidence)

## YOUR MISSION
Write a **Board Investment Memo** defending this spend.
1. **The J-Curve Defense:** Explain why the initial dip in cash flow (down to $${r.minPoint.toLocaleString()}) is a necessary "Construction Cost".
2. **The "Soft" Defense:** The model attributes $${r.softContribution.toLocaleString()} to "Efficiency". Translate this into concrete business value (e.g., "Developer hours freed up").
3. **The Risk Mitigation:** Propose a "Stage-Gate" funding model.

TONE: Fiscally responsible, forward-looking, rigorous.`;
            }
        },

        // ------------------------------------------------------------------
// MEETING TAX TICKER (Real-Time FinOps Engine)
// ------------------------------------------------------------------
meetingTicker: {
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
},
        
    })); // <--- Closes Alpine.data
}); // <--- Closes Event Listener

// ------------------------------------------------------------------
// OFFLINE BENCHMARK DATA (Fallback if Database fails)
// ------------------------------------------------------------------
const offlineBenchmarks = [
    {"score":18,"industry":"Traditional Bank"}, 
    {"score":25,"industry":"Traditional Bank"}, 
    {"score":75,"industry":"Neobank"}
];
