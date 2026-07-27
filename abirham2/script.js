/**
 * script.js — Main portfolio interactions
 * Handles: dark mode, navbar, mobile menu, typed roles,
 *          scroll animations, skill bars, project filters,
 *          contact form, scroll-to-top, scroll progress
 */
(function () {
    'use strict';

    /* ════════════════════════════════════════
       DARK MODE
    ════════════════════════════════════════ */
    const html        = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const THEME_KEY   = 'pf_theme';

    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
    }

    (function initTheme() {
        const saved  = localStorage.getItem(THEME_KEY);
        const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        applyTheme(saved || system);
    })();

    themeToggle && themeToggle.addEventListener('click', function () {
        applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });

    /* ════════════════════════════════════════
       NAVBAR — scroll shadow + active link
    ════════════════════════════════════════ */
    var navbar   = document.getElementById('navbar');
    var navLinks = document.querySelectorAll('.nav-link');
    var sections = document.querySelectorAll('section[id]');

    function updateActiveLink() {
        var current = '';
        sections.forEach(function (sec) {
            if (window.scrollY >= sec.offsetTop - 100) current = sec.id;
        });
        navLinks.forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    }

    /* ════════════════════════════════════════
       SCROLL PROGRESS BAR
    ════════════════════════════════════════ */
    var progressBar = document.getElementById('scrollProgress');

    function updateScrollProgress() {
        if (!progressBar) return;
        var scrollable = document.documentElement.scrollHeight - window.innerHeight;
        var pct        = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        progressBar.style.width = pct + '%';
    }

    /* ════════════════════════════════════════
       SCROLL-TO-TOP BUTTON
    ════════════════════════════════════════ */
    var scrollTopBtn = document.getElementById('scrollTop');

    function toggleScrollTop() {
        if (scrollTopBtn) {
            scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
        }
    }

    scrollTopBtn && scrollTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ── scroll event (all scroll-dependent functions) ── */
    window.addEventListener('scroll', function () {
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
        updateActiveLink();
        updateScrollProgress();
        toggleScrollTop();
    }, { passive: true });

    /* ════════════════════════════════════════
       MOBILE MENU
    ════════════════════════════════════════ */
    var menuBtn  = document.getElementById('mobileMenuToggle');
    var navList  = document.getElementById('navLinks');
    var overlay  = document.getElementById('navOverlay');

    function openMenu() {
        navList.classList.add('open');
        menuBtn.classList.add('open');
        menuBtn.setAttribute('aria-expanded', 'true');
        if (overlay) { overlay.classList.add('visible'); }
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        navList.classList.remove('open');
        menuBtn.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        if (overlay) { overlay.classList.remove('visible'); }
        document.body.style.overflow = '';
    }

    menuBtn && menuBtn.addEventListener('click', function () {
        navList.classList.contains('open') ? closeMenu() : openMenu();
    });

    /* close when a nav link is clicked */
    document.querySelectorAll('.nav-link').forEach(function (link) {
        link.addEventListener('click', closeMenu);
    });

    /* close when overlay is clicked */
    overlay && overlay.addEventListener('click', closeMenu);

    /* close on outside click */
    document.addEventListener('click', function (e) {
        if (navbar && !navbar.contains(e.target) && navList.classList.contains('open')) {
            closeMenu();
        }
    });

    /* ════════════════════════════════════════
       SMOOTH SCROLL for anchor links
    ════════════════════════════════════════ */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var href   = this.getAttribute('href');
            var target = href && href.length > 1 ? document.querySelector(href) : null;
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ════════════════════════════════════════
       TYPED ROLES in hero
    ════════════════════════════════════════ */
    var roles      = ['Full Stack Developer', 'MERN Stack Engineer', 'UI/UX Enthusiast', 'Problem Solver', 'Open Source Contributor'];
    var roleEl     = document.getElementById('roleText');
    var roleIndex  = 0;
    var charIndex  = 0;
    var isDeleting = false;

    function typeRole() {
        if (!roleEl) return;
        var current = roles[roleIndex];

        if (isDeleting) {
            charIndex--;
            roleEl.textContent = current.slice(0, charIndex);
        } else {
            charIndex++;
            roleEl.textContent = current.slice(0, charIndex);
        }

        var delay = isDeleting ? 60 : 100;

        if (!isDeleting && charIndex === current.length) {
            delay      = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex  = (roleIndex + 1) % roles.length;
            delay      = 400;
        }

        setTimeout(typeRole, delay);
    }

    setTimeout(typeRole, 800);

    /* ════════════════════════════════════════
       REVEAL ANIMATIONS (IntersectionObserver)
    ════════════════════════════════════════ */
    if ('IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.reveal').forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        /* fallback for old browsers */
        document.querySelectorAll('.reveal').forEach(function (el) {
            el.classList.add('visible');
        });
    }

    /* ════════════════════════════════════════
       ANIMATED SKILL BARS
    ════════════════════════════════════════ */
    var skillsSection = document.getElementById('skills');

    if (skillsSection && 'IntersectionObserver' in window) {
        var skillObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('.skill-bar-fill').forEach(function (bar) {
                        bar.style.width = bar.dataset.width + '%';
                    });
                    skillObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        skillObserver.observe(skillsSection);
    }

    /* ════════════════════════════════════════
       PROJECT FILTER TABS
    ════════════════════════════════════════ */
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(function (b) {
                b.classList.remove('active');
            });
            this.classList.add('active');

            var filter = this.dataset.filter;
            document.querySelectorAll('.project-card').forEach(function (card) {
                var match = filter === 'all' || card.dataset.category === filter;
                card.classList.toggle('hidden', !match);
            });
        });
    });

    /* ════════════════════════════════════════
       STAGGER project cards on load
    ════════════════════════════════════════ */
    document.querySelectorAll('.project-card').forEach(function (card, i) {
        card.style.transitionDelay = (i * 80) + 'ms';
    });

    /* ════════════════════════════════════════
       3D MOUSE TILT — project cards
    ════════════════════════════════════════ */
    function add3DTilt(selector, strength) {
        strength = strength || 15;
        document.querySelectorAll(selector).forEach(function (el) {
            el.addEventListener('mousemove', function (e) {
                var rect   = el.getBoundingClientRect();
                var cx     = rect.left + rect.width  / 2;
                var cy     = rect.top  + rect.height / 2;
                var dx     = (e.clientX - cx) / (rect.width  / 2);
                var dy     = (e.clientY - cy) / (rect.height / 2);
                var rotY   =  dx * strength;
                var rotX   = -dy * strength;
                el.style.transform = 'perspective(800px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateZ(8px)';
            });
            el.addEventListener('mouseleave', function () {
                el.style.transform = '';
                el.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1)';
                setTimeout(function () { el.style.transition = ''; }, 500);
            });
        });
    }

    add3DTilt('.project-card',     10);
    add3DTilt('.testimonial-card', 8);
    add3DTilt('.blog-card',        8);
    add3DTilt('.skill-card',       12);

    /* ════════════════════════════════════════
       3D PROFILE IMAGE TILT — hero
    ════════════════════════════════════════ */
    var profileWrap = document.querySelector('.profile-image-container');
    if (profileWrap) {
        profileWrap.addEventListener('mousemove', function (e) {
            var rect = profileWrap.getBoundingClientRect();
            var cx   = rect.left + rect.width  / 2;
            var cy   = rect.top  + rect.height / 2;
            var dx   = (e.clientX - cx) / (rect.width  / 2);
            var dy   = (e.clientY - cy) / (rect.height / 2);
            profileWrap.style.transform = 'perspective(600px) rotateX(' + (-dy * 12) + 'deg) rotateY(' + (dx * 12) + 'deg) scale(1.04)';
        });
        profileWrap.addEventListener('mouseleave', function () {
            profileWrap.style.transform = '';
            profileWrap.style.transition = 'transform 0.6s cubic-bezier(0.23,1,0.32,1)';
            setTimeout(function () { profileWrap.style.transition = ''; }, 600);
        });
    }

    /* ════════════════════════════════════════
       3D STAT NUMBER ANIMATION on scroll
    ════════════════════════════════════════ */
    if ('IntersectionObserver' in window) {
        var statObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('.stat-num').forEach(function (el, i) {
                        el.style.animationDelay = (i * 150) + 'ms';
                        el.style.animationPlayState = 'running';
                    });
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        var heroStats = document.querySelector('.hero-stats');
        if (heroStats) {
            heroStats.querySelectorAll('.stat-num').forEach(function (el) {
                el.style.animationPlayState = 'paused';
            });
            statObserver.observe(heroStats);
        }
    }

    /* ════════════════════════════════════════
       CONTACT FORM — EmailJS + local storage
    ════════════════════════════════════════ */
    if (typeof emailjs !== 'undefined') {
        emailjs.init('n35q6FRexeFjbhj-7');
    }

    var contactForm = document.getElementById('contactForm');
    var submitBtn   = document.getElementById('submitBtn');
    var formStatus  = document.getElementById('formStatus');

    function setStatus(msg, type) {
        if (!formStatus) return;
        formStatus.textContent = msg;
        formStatus.className   = 'form-status ' + type;
    }

    function saveMessage(data) {
        try {
            var msgs = JSON.parse(localStorage.getItem('pf_messages') || '[]');
            msgs.push(Object.assign({}, data, { id: Date.now(), read: false, ts: new Date().toISOString() }));
            if (msgs.length > 200) msgs.splice(0, msgs.length - 200);
            localStorage.setItem('pf_messages', JSON.stringify(msgs));
        } catch (e) { /* storage unavailable */ }
    }

    /* add spin keyframe once */
    (function () {
        var s = document.createElement('style');
        s.id = 'spinStyle';
        s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    })();

    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            var name    = (document.getElementById('name') || {}).value || '';
            var email   = (document.getElementById('email') || {}).value || '';
            var subject = (document.getElementById('subject') || {}).value || '';
            var message = (document.getElementById('message') || {}).value || '';

            name    = name.trim();
            email   = email.trim();
            subject = subject.trim();
            message = message.trim();

            if (!name || !email || !message) {
                setStatus('Please fill in all required fields.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled  = true;
                submitBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Sending\u2026';
            }
            setStatus('', '');

            var doSend = (typeof emailjs !== 'undefined')
                ? emailjs.sendForm('service_vbuab2j', 'template_673ncz9', contactForm)
                : Promise.reject(new Error('EmailJS not loaded'));

            doSend.then(function () {
                saveMessage({ name: name, email: email, subject: subject, message: message });
                if (window.PortfolioAnalytics) window.PortfolioAnalytics.trackContactSend();
                setStatus("Message sent! I'll get back to you soon.", 'success');
                contactForm.reset();
            }).catch(function (err) {
                console.error('EmailJS error:', err);
                saveMessage({ name: name, email: email, subject: subject, message: message, emailFailed: true });
                setStatus('Email service unavailable \u2014 message saved locally.', 'error');
            }).finally(function () {
                if (submitBtn) {
                    submitBtn.disabled  = false;
                    submitBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message';
                }
            });
        });
    }

})(); /* end IIFE */
