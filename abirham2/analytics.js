/**
 * analytics.js — Portfolio Analytics Engine
 * Tracks: visitors, page views, project clicks, section dwell time, referrers
 * All data stored in localStorage — no external service needed.
 */
(function () {
    'use strict';

    const KEYS = {
        visitors:     'pf_visitors',
        pageViews:    'pf_pageviews',
        sessions:     'pf_sessions',
        projectClicks:'pf_project_clicks',
        sectionTime:  'pf_section_time',
        referrers:    'pf_referrers',
        lastVisit:    'pf_last_visit',
        dailyViews:   'pf_daily_views',
        contactSends: 'pf_contact_sends',
    };

    /* ── helpers ── */
    var IS_ADMIN_PAGE = /admin\.html/i.test(window.location.pathname.split('/').pop() || '');

    /* ts of the active session (used to record section paths) */
    var _sessionTs = 0;

    function load(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch { return fallback; }
    }
    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }
    function today() {
        return new Date().toISOString().slice(0, 10);
    }

    /* ── session detection (new session = >30 min gap) ── */
    function trackSession() {
        const last    = load(KEYS.lastVisit, 0);
        const now     = Date.now();
        const isNew   = (now - last) > 30 * 60 * 1000;

        save(KEYS.lastVisit, now);

        if (isNew) {
            const count = load(KEYS.visitors, 0) + 1;
            save(KEYS.visitors, count);

            const sessions = load(KEYS.sessions, []);
            sessions.push({ ts: now, ref: document.referrer || 'direct', path: [] });
            if (sessions.length > 500) sessions.splice(0, sessions.length - 500);
            save(KEYS.sessions, sessions);
            _sessionTs = now;
        } else {
            /* continue the most recent session so journey paths stay together */
            const sessions = load(KEYS.sessions, []);
            _sessionTs = sessions.length ? sessions[sessions.length - 1].ts : now;
        }

        /* page views */
        const views = load(KEYS.pageViews, 0) + 1;
        save(KEYS.pageViews, views);

        /* daily views */
        const daily = load(KEYS.dailyViews, {});
        const d     = today();
        daily[d]    = (daily[d] || 0) + 1;
        save(KEYS.dailyViews, daily);

        /* referrer tracking */
        if (document.referrer) {
            const refs = load(KEYS.referrers, {});
            try {
                const host = new URL(document.referrer).hostname;
                refs[host] = (refs[host] || 0) + 1;
                save(KEYS.referrers, refs);
            } catch {}
        }

        return { isNew, totalVisitors: load(KEYS.visitors, 0) };
    }

    /* ── project click tracking ── */
    function trackProjectClick(projectId) {
        const clicks = load(KEYS.projectClicks, {});
        clicks[projectId] = (clicks[projectId] || 0) + 1;
        save(KEYS.projectClicks, clicks);
    }

    /* ── contact form send tracking ── */
    function trackContactSend() {
        const n = load(KEYS.contactSends, 0) + 1;
        save(KEYS.contactSends, n);
    }

    /* ── section dwell time ── */
    let _sectionStart = null;
    let _sectionId    = null;

    function startSectionTimer(id) {
        _sectionId    = id;
        _sectionStart = Date.now();
    }

    function endSectionTimer() {
        if (!_sectionId || !_sectionStart) return;
        const elapsed = Math.round((Date.now() - _sectionStart) / 1000);
        const times   = load(KEYS.sectionTime, {});
        times[_sectionId] = (times[_sectionId] || 0) + elapsed;
        save(KEYS.sectionTime, times);
        _sectionStart = null;
        _sectionId    = null;
    }

    /* ── attach project click listeners ── */
    function attachProjectListeners() {
        document.querySelectorAll('[data-project-id]').forEach(card => {
            card.addEventListener('click', () => {
                trackProjectClick(card.dataset.projectId);
            });
        });
    }

    /* ── record section in the active session's journey path ── */
    function recordSection(id) {
        if (!_sessionTs) return;
        const sessions = load(KEYS.sessions, []);
        for (let i = sessions.length - 1; i >= 0; i--) {
            if (sessions[i].ts === _sessionTs) {
                const path = sessions[i].path || [];
                if (path[path.length - 1] !== id) {
                    path.push(id);
                    sessions[i].path = path;
                    save(KEYS.sessions, sessions);
                }
                break;
            }
        }
    }

    /* ── observe sections with IntersectionObserver ── */
    function observeSections() {
        if (!('IntersectionObserver' in window)) return;
        const obs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    endSectionTimer();
                    startSectionTimer(e.target.id);
                    recordSection(e.target.id);
                }
            });
        }, { threshold: 0.4 });

        document.querySelectorAll('section[id]').forEach(s => obs.observe(s));
        window.addEventListener('beforeunload', endSectionTimer);
    }

    /* ── expose public API ── */
    window.PortfolioAnalytics = {
        getVisitors:      () => load(KEYS.visitors, 0),
        getPageViews:     () => load(KEYS.pageViews, 0),
        getProjectClicks: () => load(KEYS.projectClicks, {}),
        getSectionTime:   () => load(KEYS.sectionTime, {}),
        getReferrers:     () => load(KEYS.referrers, {}),
        getDailyViews:    () => load(KEYS.dailyViews, {}),
        getContactSends:  () => load(KEYS.contactSends, 0),
        getSessions:      () => load(KEYS.sessions, []),

        /* how many visitors viewed each section */
        getSectionViews() {
            const counts = {};
            load(KEYS.sessions, []).forEach(s => {
                (s.path || []).forEach(sec => { counts[sec] = (counts[sec] || 0) + 1; });
            });
            return counts;
        },

        /* recent visitor journeys (newest first) */
        getJourneys(limit) {
            return load(KEYS.sessions, []).slice(-(limit || 20)).reverse().map(s => ({
                ts: s.ts, ref: s.ref || 'direct', path: s.path || []
            }));
        },

        trackContactSend,
        trackProjectClick,

        /* full summary for admin panel */
        getSummary() {
            const daily  = load(KEYS.dailyViews, {});
            const dates  = Object.keys(daily).sort();
            const last7  = dates.slice(-7);
            return {
                totalVisitors:  load(KEYS.visitors, 0),
                totalPageViews: load(KEYS.pageViews, 0),
                contactSends:   load(KEYS.contactSends, 0),
                projectClicks:  load(KEYS.projectClicks, {}),
                sectionTime:    load(KEYS.sectionTime, {}),
                referrers:      load(KEYS.referrers, {}),
                todayViews:     daily[today()] || 0,
                last7Days:      last7.map(d => ({ date: d, views: daily[d] })),
                sectionViews:   this.getSectionViews(),
                journeys:       this.getJourneys(12),
            };
        },

        /* reset all analytics (admin only) */
        reset() {
            Object.values(KEYS).forEach(k => localStorage.removeItem(k));
        },

        init() {
            let totalVisitors = load(KEYS.visitors, 0);

            /* Admin panel must read analytics without polluting the data. */
            if (!IS_ADMIN_PAGE) {
                totalVisitors = trackSession().totalVisitors;
                attachProjectListeners();
                observeSections();
            }

            /* update hero visitor counter */
            const el = document.getElementById('visitorCount');
            if (el) {
                let cur = 0;
                const target = totalVisitors;
                const step   = Math.max(1, Math.floor(target / 40));
                const timer  = setInterval(() => {
                    cur = Math.min(cur + step, target);
                    el.textContent = cur;
                    if (cur >= target) clearInterval(timer);
                }, 40);
            }
        }
    };

    /* auto-init on DOM ready */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.PortfolioAnalytics.init());
    } else {
        window.PortfolioAnalytics.init();
    }
})();
