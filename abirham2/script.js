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

    themeToggle?.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    /* ════════════════════════════════════════
       NAVBAR — scroll shadow + active link
    ════════════════════════════════════════ */
    const navbar    = document.getElementById('navbar');
    const navLinks  = document.querySelectorAll('.nav-link');
    const sections  = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
        navbar?.classList.toggle('scrolled', window.scrollY > 20);
        updateActiveLink();
        updateScrollProgress();
        toggleScrollTop();
    }, { passive: true });

    function updateActiveLink() {
        let current = '';
        sections.forEach(sec => {
            if (window.scrollY >= sec.offsetTop - 100) current = sec.id;
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
        });
    }

    /* ════════════════════════════════════════
       MOBILE MENU
    ════════════════════════════════════════ */
    const menuBtn    = document.getElementById('mobileMenuToggle');
    const navList    = document.getElementById('navLinks');

    menuBtn?.addEventListener('click', () => {
        const open = navList.classList.toggle('open');
        menuBtn.classList.toggle('open', open);
        menuBtn.setAttribute('aria-expanded', open);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navList.classList.remove('open');
            menuBtn?.classList.remove('open');
        });
    });

    /* close on outside click */
    document.addEventListener('click', e => {
        if (!navbar?.contains(e.target)) {
            navList.classList.remove('open');
            menuBtn?.classList.remove('open');
        }
    });

    /* ════════════════════════════════════════
       SCROLL PROGRESS BAR
    ════════════════════════════════════════ */
    const progressBar = document.getElementById('scrollProgress');

    function updateScrollProgress() {
        if (!progressBar) return;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const pct        = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        progressBar.style.width = pct + '%';
    }

    /* ════════════════════════════════════════
       SCROLL-TO-TOP BUTTON
    ════════════════════════════════════════ */
    const scrollTopBtn = document.getElementById('scrollTop');

    function toggleScrollTop() {
        scrollTopBtn?.classList.toggle('visible', window.scrollY > 400);
    }

    scrollTopBtn?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ════════════════════════════════════════
       SMOOTH SCROLL for anchor links
    ════════════════════════════════════════ */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /* ════════════════════════════════════════
       TYPED ROLES in hero
    ════════════════════════════════════════ */
    const roles   = ['Full Stack Developer', 'MERN Stack Engineer', 'UI/UX Enthusiast', 'Problem Solver', 'Open Source Contributor'];
    const roleEl  = document.getElementById('roleText');
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeRole() {
        if (!roleEl) return;
        const current = roles[roleIndex];

        if (isDeleting) {
            roleEl.textContent = current.slice(0, --charIndex);
        } else {
            roleEl.textContent = current.slice(0, ++charIndex);
        }

        let delay = isDeleting ? 60 : 100;

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
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    /* ════════════════════════════════════════
       ANIMATED SKILL BARS
    ════════════════════════════════════════ */
    const skillObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
                    bar.style.width = bar.dataset.width + '%';
                });
                skillObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    const skillsSection = document.getElementById('skills');
    if (skillsSection) skillObserver.observe(skillsSection);

    /* ════════════════════════════════════════
       PROJECT FILTER TABS
    ════════════════════════════════════════ */
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.dataset.filter;
            document.querySelectorAll('.project-card').forEach(card => {
                const match = filter === 'all' || card.dataset.category === filter;
                card.classList.toggle('hidden', !match);
                if (match) {
                    card.style.animation = 'none';
                    requestAnimationFrame(() => {
                        card.style.animation = '';
                    });
                }
            });
        });
    });

    /* ════════════════════════════════════════
       CONTACT FORM — EmailJS + local storage
    ════════════════════════════════════════ */
    emailjs.init('n35q6FRexeFjbhj-7');

    const contactForm = document.getElementById('contactForm');
    const submitBtn   = document.getElementById('submitBtn');
    const formStatus  = document.getElementById('formStatus');

    function setStatus(msg, type) {
        if (!formStatus) return;
        formStatus.textContent = msg;
        formStatus.className   = `form-status ${type}`;
    }

    /* Save message to localStorage for admin panel */
    function saveMessage(data) {
        const msgs = JSON.parse(localStorage.getItem('pf_messages') || '[]');
        msgs.push({ ...data, id: Date.now(), read: false, ts: new Date().toISOString() });
        if (msgs.length > 200) msgs.splice(0, msgs.length - 200);
        localStorage.setItem('pf_messages', JSON.stringify(msgs));
    }

    contactForm?.addEventListener('submit', async e => {
        e.preventDefault();

        const name    = document.getElementById('name').value.trim();
        const email   = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject')?.value.trim() || '';
        const message = document.getElementById('message').value.trim();

        if (!name || !email || !message) {
            setStatus('Please fill in all required fields.', 'error');
            return;
        }

        submitBtn.disabled   = true;
        submitBtn.innerHTML  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg> Sending…';
        setStatus('', '');

        /* add spin keyframe inline if not present */
        if (!document.getElementById('spinStyle')) {
            const s = document.createElement('style');
            s.id = 'spinStyle';
            s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
            document.head.appendChild(s);
        }

        try {
            await emailjs.sendForm('service_vbuab2j', 'template_673ncz9', contactForm);
            saveMessage({ name, email, subject, message });
            window.PortfolioAnalytics?.trackContactSend();
            setStatus('Message sent! I\'ll get back to you soon.', 'success');
            contactForm.reset();
        } catch (err) {
            console.error('EmailJS error:', err);
            /* still save locally even if email fails */
            saveMessage({ name, email, subject, message, emailFailed: true });
            setStatus('Email service unavailable — message saved locally.', 'error');
        } finally {
            submitBtn.disabled  = false;
            submitBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message';
        }
    });

    /* ════════════════════════════════════════
       STAGGER project cards on load
    ════════════════════════════════════════ */
    document.querySelectorAll('.project-card').forEach((card, i) => {
        card.style.transitionDelay = `${i * 80}ms`;
    });

})(); /* end IIFE */
