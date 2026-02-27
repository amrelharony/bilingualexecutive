/* ═══════════════════════════════════════════════════════════════
   GSAP ANIMATION ENGINE — ULTRA EDITION
   Dramatic, high-impact animations for the entire app
   ═══════════════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

const APP_ANIM = (() => {

    const _timelines = {};
    let _landingExiting = false;
    let _scrollRevealInit = false;

    function _kill(key) {
        if (_timelines[key]) { _timelines[key].kill(); delete _timelines[key]; }
    }

    function _splitChars(el) {
        if (!el) return [];
        if (el.querySelector('.gsap-char')) return [...el.querySelectorAll('.gsap-char')];
        const text = el.textContent;
        if (!text || !text.trim()) return [];
        el.textContent = '';
        el.setAttribute('aria-label', text);
        return [...text].map(ch => {
            const span = document.createElement('span');
            span.className = 'gsap-char';
            span.textContent = ch === ' ' ? '\u00A0' : ch;
            span.setAttribute('aria-hidden', 'true');
            el.appendChild(span);
            return span;
        });
    }

    function _isLight() {
        return document.documentElement.getAttribute('data-theme') === 'light';
    }

    function _glowHi() {
        return _isLight()
            ? '0 0 18px rgba(21,128,61,0.5), 0 0 40px rgba(21,128,61,0.2)'
            : '0 0 18px rgba(74,222,128,0.6), 0 0 40px rgba(74,222,128,0.25)';
    }

    function _glowNone() { return '0 0 0px transparent'; }

    function _splitWords(el) {
        if (!el) return [];
        if (el.querySelector('.gsap-char')) return [...el.querySelectorAll('.gsap-char')];
        const text = el.textContent;
        if (!text || !text.trim()) return [];
        el.textContent = '';
        el.setAttribute('aria-label', text);
        return text.split(/(\s+)/).filter(w => w.trim()).map(word => {
            const span = document.createElement('span');
            span.className = 'gsap-char';
            span.textContent = word;
            span.setAttribute('aria-hidden', 'true');
            el.appendChild(span);
            return span;
        });
    }

    // ─── LANDING PAGE ────────────────────────────────────────────
    function animateLanding() {
        const page = document.getElementById('landing-page');
        if (!page || getComputedStyle(page).display === 'none') return;

        _kill('landing');
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        _timelines.landing = tl;

        const subtitle = page.querySelector('p.font-mono');
        const title = page.querySelector('h1');
        const divider = page.querySelector('.bg-red-600');
        const desc = page.querySelector('p.font-mono.max-w-md');
        const video = page.querySelector('[class*="max-h-"]');
        const enterBtn = page.querySelector('button[class*="tracking-widest"]');
        const footer = page.querySelector('div[class*="text-slate-500"][class*="tracking-widest"]');

        // Phase 1: Subtitle flickers in
        if (subtitle) {
            gsap.set(subtitle, { autoAlpha: 0, y: -15 });
            tl.to(subtitle, { autoAlpha: 1, y: 0, duration: 0.8 });
            tl.to(subtitle, { opacity: 0.4, duration: 0.08, yoyo: true, repeat: 3 }, '-=0.3');
        }

        // Phase 2: Title — dramatic 3D character split
        if (title) {
            gsap.set(title, { visibility: 'visible' });
            const lines = title.innerHTML.split('<br>');
            title.innerHTML = '';
            const spans = lines.map((html, i) => {
                const wrapper = document.createElement('span');
                wrapper.className = 'gsap-line';
                wrapper.innerHTML = html;
                title.appendChild(wrapper);
                if (i < lines.length - 1) title.appendChild(document.createElement('br'));
                return wrapper;
            });

            gsap.set(spans, {
                autoAlpha: 0, y: 80, rotateX: -90,
                filter: 'blur(12px)', transformPerspective: 600
            });
            tl.to(spans, {
                autoAlpha: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
                duration: 1.2, stagger: 0.2, ease: 'power4.out'
            }, '-=0.4');
        }

        // Phase 3: Red divider line shoots from center
        if (divider) {
            gsap.set(divider, { autoAlpha: 0, scaleX: 0, transformOrigin: 'center' });
            tl.to(divider, { autoAlpha: 1, scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, '-=0.6');
            tl.to(divider, {
                boxShadow: '0 0 20px rgba(220,38,38,0.6), 0 0 30px rgba(74,222,128,0.15)',
                duration: 0.4, ease: 'power2.out'
            }, '-=0.3');
        }

        // Phase 4: Description blurs in from below
        if (desc) {
            gsap.set(desc, { autoAlpha: 0, y: 30, filter: 'blur(6px)' });
            tl.to(desc, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.8 }, '-=0.5');
        }

        // Phase 5: Video container — dramatic scale + bounce with green glow
        if (video) {
            gsap.set(video, { autoAlpha: 0, scale: 0.7, y: 60, boxShadow: _glowNone() });
            tl.to(video, {
                autoAlpha: 1, scale: 1, y: 0,
                duration: 1.2, ease: 'elastic.out(1, 0.5)'
            }, '-=0.4');
            tl.to(video, { boxShadow: _glowHi(), duration: 0.3, ease: 'power2.out' });
            tl.to(video, { boxShadow: _glowNone(), duration: 0.5, ease: 'power2.inOut' });
        }

        // Phase 6: Enter button — pops in + green-tinted breathing glow
        if (enterBtn) {
            gsap.set(enterBtn, { autoAlpha: 0, scale: 0.6, y: 20 });
            tl.to(enterBtn, {
                autoAlpha: 1, scale: 1, y: 0,
                duration: 0.7, ease: 'back.out(3)'
            }, '-=0.8');
            tl.to(enterBtn, {
                boxShadow: '0 0 50px rgba(74,222,128,0.4), 0 0 100px rgba(74,222,128,0.15)',
                scale: 1.04,
                repeat: -1, yoyo: true, duration: 1.8, ease: 'sine.inOut'
            });
        }

        // Phase 7: Footer fades in
        if (footer) {
            gsap.set(footer, { autoAlpha: 0 });
            tl.to(footer, { autoAlpha: 1, duration: 0.5 }, '-=1.5');
        }
    }

    // ─── LANDING EXIT ────────────────────────────────────────────
    function animateLandingExit(onComplete) {
        const page = document.getElementById('landing-page');
        if (!page || _landingExiting) { if (!_landingExiting) onComplete?.(); return; }

        _landingExiting = true;
        _kill('landing');

        const tl = gsap.timeline({
            onComplete: () => { _landingExiting = false; onComplete?.(); }
        });

        tl.to(page, {
            scale: 1.08, filter: 'blur(10px)',
            duration: 0.4, ease: 'power2.in'
        });
        tl.to(page, {
            opacity: 0, duration: 0.3, ease: 'power2.in'
        }, '-=0.15');
    }

    // ─── TAB SWITCHING ───────────────────────────────────────────
    let _tabSwitching = false;
    function animateTabSwitch(newMode, oldMode, container) {
        if (_tabSwitching || !container) return;

        const leaving = container.querySelector(`[x-show="viewMode === '${oldMode}'"]`);
        const entering = container.querySelector(`[x-show="viewMode === '${newMode}'"]`);
        if (!entering) return;

        _tabSwitching = true;
        const tl = gsap.timeline({
            onComplete: () => { _tabSwitching = false; }
        });

        // Leaving page turns away
        if (leaving && leaving.offsetParent !== null) {
            tl.to(leaving, {
                opacity: 0, rotateY: 30,
                transformPerspective: 800, transformOrigin: 'left center',
                duration: 0.35, ease: 'power3.in',
                onComplete: () => { gsap.set(leaving, { clearProps: 'all' }); }
            });
        }

        // Entering page turns in from the other side
        tl.fromTo(entering,
            { opacity: 0, rotateY: -30, transformPerspective: 800, transformOrigin: 'right center' },
            { opacity: 1, rotateY: 0, duration: 0.5, ease: 'power3.out',
              onComplete: () => { gsap.set(entering, { clearProps: 'all' }); }
            }, leaving ? '-=0.15' : 0
        );
    }

    // ─── BOOK HERO ───────────────────────────────────────────────
    function animateBookHero() {
        const section = document.querySelector('[x-show="viewMode === \'ebook\'"]');
        if (!section) return;

        _kill('book');
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        _timelines.book = tl;

        const heroCard = section.querySelector('.relative.bg-white\\/\\[0\\.04\\]');
        const viewer = section.querySelector('model-viewer')?.parentElement;
        const badge = section.querySelector('span[class*="tracking-"]');
        const title = section.querySelector('h1');
        const subtitle = section.querySelector('p[class*="indigo-400"]');
        const buttons = section.querySelectorAll('a[class*="rounded-full"], button[class*="rounded-full"]');
        const sections = section.querySelectorAll(':scope > div');

        // Hero card materializes like the book (scale + bounce)
        if (heroCard) {
            gsap.set(heroCard, { opacity: 0, scale: 0.85, rotateX: -8, transformPerspective: 800 });
            tl.to(heroCard, { opacity: 1, scale: 1, rotateX: 0, duration: 0.7, ease: 'back.out(1.7)' });
        }

        // 3D viewer scales in with green glow pulse on completion
        if (viewer) {
            gsap.set(viewer, { opacity: 0, scale: 0.6, rotateY: -15, boxShadow: _glowNone() });
            tl.to(viewer, {
                opacity: 1, scale: 1, rotateY: 0,
                duration: 1, ease: 'power4.out', transformPerspective: 800
            }, '-=0.5');
            tl.to(viewer, { boxShadow: _glowHi(), duration: 0.25 }, '-=0.1');
            tl.to(viewer, { boxShadow: _glowNone(), duration: 0.5, ease: 'power2.inOut' });
        }

        // Badge bounces in (already harmonious)
        if (badge) {
            gsap.set(badge, { opacity: 0, scale: 0, y: -10 });
            tl.to(badge, {
                opacity: 1, scale: 1, y: 0,
                duration: 0.6, ease: 'elastic.out(1.2, 0.5)'
            }, '-=0.8');
        }

        // Title words stagger with 3D (already harmonious)
        if (title) {
            const words = _splitWords(title);
            if (words.length) {
                gsap.set(words, { opacity: 0, y: 30, rotateX: -30, transformPerspective: 400 });
                tl.to(words, {
                    opacity: 1, y: 0, rotateX: 0,
                    duration: 0.5, stagger: 0.06, ease: 'power3.out'
                }, '-=0.6');
            }
        }

        // Subtitle unfolds from center
        if (subtitle) {
            gsap.set(subtitle, { opacity: 0, scaleX: 0, transformOrigin: 'center' });
            tl.to(subtitle, { opacity: 1, scaleX: 1, duration: 0.45 }, '-=0.2');
        }

        // Action buttons perspective-flip in
        if (buttons.length) {
            gsap.set(buttons, {
                opacity: 0, rotateY: -40,
                transformPerspective: 600, transformOrigin: 'left center'
            });
            tl.to(buttons, {
                opacity: 1, rotateY: 0,
                duration: 0.4, stagger: 0.08, ease: 'back.out(1.5)'
            }, '-=0.2');
        }

        // Remaining sections page-stack in with perspective
        if (sections.length > 1) {
            const remaining = [...sections].slice(1);
            gsap.set(remaining, { opacity: 0, rotateX: -12, y: 20, transformPerspective: 600 });
            tl.to(remaining, {
                opacity: 1, rotateX: 0, y: 0,
                duration: 0.5, stagger: 0.12, ease: 'power3.out'
            }, '-=0.1');
        }
    }

    // ─── ACADEMY METRO MAP ───────────────────────────────────────
    function animateMetroMap() {
        const map = document.querySelector('[x-show="!activeChapterId"]');
        if (!map || map.offsetParent === null) return;

        _kill('metro');
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        _timelines.metro = tl;

        const header     = map.querySelector('h1');
        const headerDesc = map.querySelector('p[class*="text-slate-400"]');
        const headerBtns = map.querySelectorAll('button[class*="rounded-lg"]');
        const progressBar = map.querySelector('[class*="mb-8"][class*="backdrop-blur"]');
        const line       = map.querySelector('.absolute.left-4');
        const parts      = map.querySelectorAll('h3[class*="uppercase"]');
        const cards      = map.querySelectorAll('[role="button"]');

        // Phase 1 — Spine materializes from center with green glow pulse
        if (line) {
            gsap.set(line, { scaleY: 0, transformOrigin: 'center', boxShadow: _glowNone() });
            tl.to(line, { scaleY: 1, duration: 0.8, ease: 'back.out(1.5)' });
            tl.to(line, { boxShadow: _glowHi(), duration: 0.3, ease: 'power2.out' }, '-=0.3');
            tl.to(line, { boxShadow: _glowNone(), duration: 0.5, ease: 'power2.inOut' });
        }

        // Phase 2 — Header unfolds from center (like covers opening)
        if (header) {
            gsap.set(header, { opacity: 0, scaleX: 0, transformOrigin: 'center' });
            tl.to(header, { opacity: 1, scaleX: 1, duration: 0.6, ease: 'power3.out' }, line ? '-=0.7' : '0');
        }
        if (headerDesc) {
            gsap.set(headerDesc, { opacity: 0, scaleX: 0, transformOrigin: 'center' });
            tl.to(headerDesc, { opacity: 1, scaleX: 1, duration: 0.5 }, '-=0.3');
        }

        // Phase 3 — Toolbar buttons fan in with perspective flip
        if (headerBtns.length) {
            gsap.set(headerBtns, {
                opacity: 0, rotateY: -60,
                transformPerspective: 600, transformOrigin: 'left center'
            });
            tl.to(headerBtns, {
                opacity: 1, rotateY: 0,
                duration: 0.4, stagger: 0.08, ease: 'back.out(1.5)'
            }, '-=0.25');
        }

        // Phase 4 — Progress bar materializes with green shimmer
        if (progressBar) {
            gsap.set(progressBar, { opacity: 0, scale: 0.92, boxShadow: _glowNone() });
            tl.to(progressBar, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.15');
            tl.to(progressBar, { boxShadow: _glowHi(), duration: 0.25 }, '-=0.2');
            tl.to(progressBar, { boxShadow: _glowNone(), duration: 0.4, ease: 'power2.inOut' });
        }

        // Phase 5 — Part labels flip from the spine
        if (parts.length) {
            gsap.set(parts, {
                opacity: 0, rotateY: -30, x: -10,
                transformPerspective: 600, transformOrigin: 'left center'
            });
            tl.to(parts, {
                opacity: 1, rotateY: 0, x: 0,
                duration: 0.45, stagger: 0.12, ease: 'power3.out'
            }, '-=0.5');
        }

        // Phase 6 — Chapter cards page-turn in with green glow flash
        if (cards.length) {
            gsap.set(cards, {
                opacity: 0, rotateY: -90,
                transformPerspective: 800, transformOrigin: 'left center',
                boxShadow: _glowNone()
            });
            tl.to(cards, {
                opacity: 1, rotateY: 0,
                duration: 0.55, stagger: 0.1, ease: 'power3.out',
                onComplete: () => {
                    cards.forEach(card => {
                        gsap.to(card, { boxShadow: _glowHi(), duration: 0.2, ease: 'power2.out' });
                        gsap.to(card, { boxShadow: _glowNone(), duration: 0.4, delay: 0.2, ease: 'power2.inOut' });
                    });
                }
            }, '-=0.6');
        }
    }

    // ─── TOOL CARDS ──────────────────────────────────────────────
    function animateToolCards() {
        const toolsSection = document.querySelector('[x-show="viewMode === \'tools\'"]');
        if (!toolsSection || toolsSection.offsetParent === null) return;

        const grid = toolsSection.querySelector('[class*="grid-cols-2"][class*="gap-3"]');
        if (!grid || grid.offsetParent === null) return;

        _kill('tools');
        const cards = grid.querySelectorAll('button');
        if (!cards.length) return;

        const header = toolsSection.querySelector('h1');
        const headerDesc = toolsSection.querySelector('p[class*="text-slate-400"]');
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        _timelines.tools = tl;

        // Header unfolds from center
        if (header) {
            gsap.set(header, { opacity: 0, scaleX: 0, transformOrigin: 'center' });
            tl.to(header, { opacity: 1, scaleX: 1, duration: 0.6 });
        }
        if (headerDesc) {
            gsap.set(headerDesc, { opacity: 0, scaleX: 0, transformOrigin: 'center' });
            tl.to(headerDesc, { opacity: 1, scaleX: 1, duration: 0.45 }, '-=0.3');
        }

        // Tool cards page-flip in with perspective
        gsap.set(cards, {
            opacity: 0, rotateY: -70,
            transformPerspective: 800, transformOrigin: 'left center',
            boxShadow: _glowNone()
        });

        tl.to(cards, {
            opacity: 1, rotateY: 0,
            duration: 0.5,
            stagger: { each: 0.08, from: 'start' },
            ease: 'power3.out',
            onComplete: () => {
                cards.forEach(card => {
                    gsap.to(card, { boxShadow: _glowHi(), duration: 0.2, ease: 'power2.out' });
                    gsap.to(card, { boxShadow: _glowNone(), duration: 0.4, delay: 0.2, ease: 'power2.inOut' });
                });
            }
        }, '-=0.2');
    }

    // ─── VIP TERMINAL ────────────────────────────────────────────
    function animateVipGrant(el) {
        if (!el) return;
        const chars = _splitChars(el);
        if (!chars.length) return;
        gsap.set(chars, { opacity: 0, y: -15, scale: 1.5 });
        gsap.to(chars, {
            opacity: 1, y: 0, scale: 1,
            duration: 0.1, stagger: 0.04,
            ease: 'power2.out',
            onUpdate: function() {
                const progress = this.progress();
                const idx = Math.floor(progress * chars.length);
                chars.forEach((c, i) => {
                    c.style.textShadow = i <= idx
                        ? '0 0 16px rgba(0,255,65,0.9), 0 0 6px rgba(0,255,65,0.5), 0 0 40px rgba(0,255,65,0.3)'
                        : 'none';
                });
            }
        });
    }

    function animateVipBoot(lineEl) {
        if (!lineEl) return Promise.resolve();
        gsap.set(lineEl, { opacity: 0, x: -15 });
        return gsap.to(lineEl, {
            opacity: 1, x: 0, duration: 0.25, ease: 'power2.out'
        }).then();
    }

    function animateVipAscii(container) {
        if (!container) return;
        const pre = container.querySelector('pre');
        const subtitle = container.querySelector('p');
        const tl = gsap.timeline();

        if (pre) {
            gsap.set(pre, { opacity: 0, scale: 0.8, filter: 'blur(10px)', rotateX: -20 });
            tl.to(pre, {
                opacity: 1, scale: 1, filter: 'blur(0px)', rotateX: 0,
                duration: 0.8, ease: 'power4.out', transformPerspective: 600
            });
        }
        if (subtitle) {
            gsap.set(subtitle, { opacity: 0, y: 15 });
            tl.to(subtitle, { opacity: 1, y: 0, duration: 0.5 }, '-=0.3');
        }
    }

    // ─── NAVIGATION BAR ──────────────────────────────────────────
    function animateNavBar(navEl, show) {
        if (!navEl) return;
        if (show) {
            gsap.to(navEl, {
                y: 0, opacity: 1, duration: 0.5,
                ease: 'back.out(1.7)',
                overwrite: true
            });
        } else {
            gsap.to(navEl, {
                y: 100, opacity: 0, duration: 0.35,
                ease: 'power3.in',
                overwrite: true
            });
        }
    }

    // ─── FLOATING SIDEBAR ────────────────────────────────────────
    function animateSidebar(container, show) {
        if (!container) return;
        const items = container.querySelectorAll('.sidebar-item');
        if (show) {
            gsap.to(container, { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out', overwrite: true });
            if (items.length) {
                gsap.fromTo(items,
                    { opacity: 0, x: 25, scale: 0.9, rotateY: -20, transformPerspective: 600 },
                    { opacity: 1, x: 0, scale: 1, rotateY: 0, duration: 0.35, stagger: 0.06, ease: 'back.out(2)', overwrite: true }
                );
            }
        } else {
            gsap.to(container, { opacity: 0, x: 25, duration: 0.3, ease: 'power2.in', overwrite: true });
        }
    }

    // ─── SCROLL REVEAL ───────────────────────────────────────────
    function initScrollReveal() {
        if (_scrollRevealInit) return;
        _scrollRevealInit = true;
        const els = document.querySelectorAll('[data-gsap="reveal"]');
        els.forEach(el => {
            const from = el.dataset.gsapFrom || 'bottom';
            const delay = parseFloat(el.dataset.gsapDelay) || 0;

            const props = { opacity: 0, duration: 0.8, ease: 'power3.out', delay };
            if (from === 'bottom') { props.y = 40; }
            else if (from === 'left') { props.x = -40; }
            else if (from === 'right') { props.x = 40; }
            else if (from === 'scale') { props.scale = 0.85; props.y = 20; }
            else if (from === 'page') {
                props.rotateY = -30;
                props.transformPerspective = 800;
                props.transformOrigin = 'left center';
            }

            gsap.from(el, {
                ...props,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 92%',
                    once: true
                }
            });
        });
    }

    function refreshScrollTrigger() {
        ScrollTrigger.refresh();
    }

    // ─── BOOK-SPLIT LOADER ────────────────────────────────────────
    function animateBookLoader(onComplete) {
        const loader = document.getElementById('book-loader');
        const preloader = document.getElementById('app-preloader');
        if (!loader || !preloader) { onComplete?.(); return; }

        const leftCover  = loader.querySelector('.book-cover-left');
        const rightCover = loader.querySelector('.book-cover-right');
        const pages      = loader.querySelectorAll('.book-page');
        const glow       = loader.querySelector('.book-glow');
        const accent     = loader.querySelector('.book-title-accent');

        let _contentRevealed = false;

        const tl = gsap.timeline({
            onComplete: () => {
                preloader.classList.add('done');
                setTimeout(() => preloader.remove(), 500);
            }
        });

        // Phase 1: Book materializes
        tl.to(loader, {
            opacity: 1, duration: 0.5, ease: 'power2.out'
        });
        tl.from(loader, {
            scale: 0.7, y: 30, duration: 0.6, ease: 'back.out(1.7)'
        }, '<');

        // Phase 2: Glow pulses on
        tl.to(glow, {
            opacity: 1, duration: 0.4, ease: 'power2.out'
        }, '-=0.2');

        // Phase 3: Title accent shimmers
        if (accent) {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            const glowHi  = isLight ? '0 0 16px rgba(21,128,61,0.5)' : '0 0 16px rgba(74,222,128,0.7)';
            const glowLo  = isLight ? '0 0 8px rgba(21,128,61,0.3)'  : '0 0 8px rgba(74,222,128,0.4)';
            tl.to(accent, {
                width: 40,
                boxShadow: glowHi,
                duration: 0.4,
                ease: 'power2.out'
            }, '-=0.2');
            tl.to(accent, {
                width: 24,
                boxShadow: glowLo,
                duration: 0.3,
                ease: 'power2.inOut'
            });
        }

        // Phase 4: Pages fan out (flutter effect)
        pages.forEach((page, i) => {
            tl.to(page, {
                opacity: 0.9,
                rotateY: -8 - (i * 12),
                x: -(i * 2),
                duration: 0.3,
                ease: 'power2.out'
            }, '-=0.2');
        });

        // Phase 5: Brief hold — book is "open" with pages showing
        tl.to(loader, { duration: 0.25 });

        // Phase 6: Covers split apart dramatically
        tl.to(leftCover, {
            x: '-180%',
            rotateY: 60,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.in'
        });
        tl.to(rightCover, {
            x: '180%',
            rotateY: -60,
            opacity: 0,
            duration: 0.7,
            ease: 'power3.in'
        }, '<');

        // Pages scatter
        tl.to(pages, {
            opacity: 0,
            y: () => gsap.utils.random(-80, 80),
            x: () => gsap.utils.random(-120, 120),
            rotation: () => gsap.utils.random(-30, 30),
            scale: 0.5,
            duration: 0.5,
            stagger: 0.03,
            ease: 'power2.in'
        }, '<+=0.1');

        // Glow expands and fades
        tl.to(glow, {
            scale: 8,
            opacity: 0,
            duration: 0.6,
            ease: 'power2.in'
        }, '<');

        // Phase 7: Fire content animation while preloader is still opaque, then fade
        tl.to(preloader, {
            opacity: 0,
            duration: 0.35,
            ease: 'power2.inOut',
            onStart: () => {
                if (!_contentRevealed) {
                    _contentRevealed = true;
                    onComplete?.();
                }
            }
        }, '-=0.3');
    }

    function killLanding() {
        _kill('landing');
    }

    // ─── PUBLIC API ──────────────────────────────────────────────
    return {
        animateLanding,
        animateLandingExit,
        killLanding,
        animateTabSwitch,
        animateBookHero,
        animateMetroMap,
        animateToolCards,
        animateVipGrant,
        animateVipBoot,
        animateVipAscii,
        animateNavBar,
        animateSidebar,
        initScrollReveal,
        refreshScrollTrigger,
        animateBookLoader,
    };
})();
