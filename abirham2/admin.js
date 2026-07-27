/**
 * admin.js — Admin Panel Logic
 * Auth, analytics display, message management,
 * project CRUD, settings, dark mode.
 *
 * Default credentials: admin / admin123
 * Password is stored hashed (simple SHA-like btoa) in localStorage.
 */
(function () {
    'use strict';

    /* ════════════════════════════════════════
       CONSTANTS & HELPERS
    ════════════════════════════════════════ */
    const KEYS = {
        authToken:    'adm_token',
        password:     'adm_password',
        projects:     'adm_projects',
        settings:     'adm_settings',
    };

    const DEFAULT_USER = 'admin';
    const DEFAULT_PASS = btoa('admin123'); // base64 as a simple hash stand-in

    function load(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch { return fallback; }
    }
    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }

    function getMessages() { return load('pf_messages', []); }
    function saveMessages(arr) { save('pf_messages', arr); }

    function $(id) { return document.getElementById(id); }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
               + ' ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    }

    function showToast(msg, type = 'ok') {
        const old = document.querySelector('.admin-toast');
        if (old) old.remove();
        const t = document.createElement('div');
        t.className = `admin-toast admin-toast-${type}`;
        t.textContent = msg;
        Object.assign(t.style, {
            position:'fixed', bottom:'1.5rem', right:'1.5rem',
            background: type === 'ok' ? 'var(--p)' : 'var(--red)',
            color:'white', padding:'0.7rem 1.25rem', borderRadius:'8px',
            fontWeight:'600', fontSize:'0.875rem', zIndex:'9999',
            boxShadow:'0 6px 20px rgba(0,0,0,0.2)',
            animation:'slideUp .3s ease'
        });
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    /* ════════════════════════════════════════
       DARK MODE
    ════════════════════════════════════════ */
    const html = document.documentElement;

    function applyTheme(t) {
        html.setAttribute('data-theme', t);
        localStorage.setItem('pf_theme', t);
    }

    (function initTheme() {
        const saved = localStorage.getItem('pf_theme')
            || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(saved);
    })();

    $('themeToggleAdmin')?.addEventListener('click', () => {
        applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });

    /* ════════════════════════════════════════
       AUTH
    ════════════════════════════════════════ */
    function isLoggedIn() {
        return load(KEYS.authToken, null) === 'valid_session';
    }

    function login(user, pass) {
        const storedPass = load(KEYS.password, DEFAULT_PASS);
        if (user.trim() === DEFAULT_USER && btoa(pass) === storedPass) {
            save(KEYS.authToken, 'valid_session');
            return true;
        }
        return false;
    }

    function logout() {
        localStorage.removeItem(KEYS.authToken);
        showLogin();
    }

    function showLogin() {
        $('loginScreen').style.display = 'flex';
        $('dashboard').style.display   = 'none';
    }

    function showDashboard() {
        $('loginScreen').style.display = 'none';
        $('dashboard').style.display   = 'flex';
        refreshAll();
    }

    /* ── Login form ── */
    $('togglePass')?.addEventListener('click', function () {
        const inp = $('adminPass');
        const isPass = inp.type === 'password';
        inp.type = isPass ? 'text' : 'password';
        this.querySelector('.eye-show').style.display = isPass ? 'none'  : 'block';
        this.querySelector('.eye-hide').style.display = isPass ? 'block' : 'none';
    });

    $('loginForm')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const user = $('adminUser').value;
        const pass = $('adminPass').value;
        const btn  = $('loginBtn');

        $('loginError').textContent = '';
        btn.textContent = 'Signing in…';
        btn.disabled = true;

        setTimeout(() => {
            if (login(user, pass)) {
                showDashboard();
            } else {
                $('loginError').textContent = 'Invalid username or password.';
                $('adminPass').value = '';
            }
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }, 600); // small artificial delay
    });

    $('logoutBtn')?.addEventListener('click', logout);

    /* init */
    if (isLoggedIn()) { showDashboard(); } else { showLogin(); }

    /* ════════════════════════════════════════
       SIDEBAR NAVIGATION
    ════════════════════════════════════════ */
    const sidebar       = document.getElementById('sidebar');
    const sidebarToggle = $('sidebarToggle');

    sidebarToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.addEventListener('click', e => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== sidebarToggle) {
            sidebar.classList.remove('open');
        }
    });

    document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            const panel = document.getElementById('panel-' + this.dataset.panel);
            if (panel) panel.classList.add('active');
            $('topbarTitle').textContent = this.textContent.trim().replace(/\d+/, '').trim();
            if (window.innerWidth <= 768) sidebar.classList.remove('open');

            if (this.dataset.panel === 'analytics') renderAnalytics();
            if (this.dataset.panel === 'messages')  renderMessages();
            if (this.dataset.panel === 'projects')  renderProjects();
        });
    });

    /* ════════════════════════════════════════
       ANALYTICS PANEL
    ════════════════════════════════════════ */
    function renderAnalytics() {
        const s = window.PortfolioAnalytics?.getSummary() || {};

        // stat cards
        const numEl = (id, val) => { const e = $(id); if (e) e.textContent = val ?? 0; };
        numEl('statVisitors',    s.totalVisitors);
        numEl('statPageViews',   s.totalPageViews);
        numEl('statTodayViews',  s.todayViews);
        numEl('statContactSends',s.contactSends);

        // 7-day bar chart
        renderBarChart(s.last7Days || []);

        // project clicks
        renderProjectClicks(s.projectClicks || {});

        // section time table
        renderTable('sectionTable', s.sectionTime || {}, 'Section', 's');

        // referrers table
        renderReferrers(s.referrers || {});
    }

    function renderBarChart(days) {
        const el = $('dailyChart');
        if (!el) return;
        if (!days.length) { el.innerHTML = '<p style="color:var(--text-3);font-size:0.85rem;padding:1rem">No data yet.</p>'; return; }
        const max = Math.max(...days.map(d => d.views), 1);
        el.innerHTML = days.map(d => {
            const pct  = Math.round((d.views / max) * 100);
            const label = d.date ? d.date.slice(5) : '';
            return `<div class="bar-col">
                <span class="bar-val">${d.views}</span>
                <div class="bar-fill" style="height:${Math.max(pct,3)}%"></div>
                <span class="bar-label">${label}</span>
            </div>`;
        }).join('');
    }

    function renderProjectClicks(clicks) {
        const el = $('projectClicksChart');
        if (!el) return;
        const entries = Object.entries(clicks).sort((a,b) => b[1]-a[1]);
        if (!entries.length) { el.innerHTML = '<p style="color:var(--text-3);font-size:0.85rem">No project clicks yet.</p>'; return; }
        const max = Math.max(...entries.map(e => e[1]), 1);
        el.innerHTML = entries.map(([id, count]) => `
            <div class="donut-row">
                <div class="donut-row-header">
                    <span class="donut-row-label">${id}</span>
                    <span class="donut-row-val">${count}</span>
                </div>
                <div class="donut-bar-track">
                    <div class="donut-bar-fill" style="width:${Math.round((count/max)*100)}%"></div>
                </div>
            </div>`).join('');
    }

    function renderTable(tableId, data, keyLabel, valSuffix = '') {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return;
        const entries = Object.entries(data).sort((a,b) => b[1]-a[1]);
        if (!entries.length) { tbody.innerHTML = `<tr><td colspan="2" style="color:var(--text-3)">No data yet.</td></tr>`; return; }
        tbody.innerHTML = entries.map(([k,v]) =>
            `<tr><td>${k}</td><td>${v}${valSuffix}</td></tr>`
        ).join('');
    }

    function renderReferrers(refs) {
        const tbody = document.querySelector('#referrerTable tbody');
        if (!tbody) return;
        const entries = Object.entries(refs).sort((a,b) => b[1]-a[1]);
        if (!entries.length) {
            const direct = window.PortfolioAnalytics?.getSessions()?.filter(s => s.ref === 'direct').length || 0;
            if (direct > 0) {
                tbody.innerHTML = `<tr><td>direct</td><td>${direct}</td></tr>`;
            } else {
                tbody.innerHTML = `<tr><td colspan="2" style="color:var(--text-3)">No referrer data yet.</td></tr>`;
            }
            return;
        }
        tbody.innerHTML = entries.map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    }

    $('resetAnalyticsBtn')?.addEventListener('click', () => {
        if (!confirm('Reset ALL analytics data? This cannot be undone.')) return;
        window.PortfolioAnalytics?.reset();
        renderAnalytics();
        showToast('Analytics data reset.');
    });

    $('dangerResetBtn')?.addEventListener('click', () => {
        if (!confirm('This will permanently delete all visitor analytics. Continue?')) return;
        window.PortfolioAnalytics?.reset();
        renderAnalytics();
        showToast('All analytics cleared.');
    });

    /* ════════════════════════════════════════
       MESSAGES PANEL
    ════════════════════════════════════════ */
    function renderMessages() {
        const wrap = $('messagesWrap');
        if (!wrap) return;
        const msgs = getMessages().sort((a,b) => (b.ts||0) > (a.ts||0) ? 1 : -1);
        const unread = msgs.filter(m => !m.read).length;

        // update badge
        const badge = $('unreadBadge');
        if (badge) {
            badge.textContent = unread;
            badge.style.display = unread > 0 ? 'inline-flex' : 'none';
        }

        if (!msgs.length) {
            wrap.innerHTML = '<p class="empty-state">No messages yet.</p>';
            return;
        }

        wrap.innerHTML = msgs.map(msg => `
            <div class="message-card ${msg.read ? '' : 'unread'}" data-id="${msg.id}">
                <div class="message-header">
                    <span class="message-sender">
                        ${msg.read ? '' : '<span class="unread-dot"></span>'}
                        ${escHtml(msg.name || 'Unknown')}
                    </span>
                    <div class="message-meta">
                        <span>${escHtml(msg.email || '')}</span>
                        <span>·</span>
                        <span>${formatDate(msg.ts)}</span>
                    </div>
                </div>
                ${msg.subject ? `<div class="message-subject">${escHtml(msg.subject)}</div>` : ''}
                <div class="message-body">${escHtml(msg.message || '')}</div>
                <div class="message-actions">
                    <button class="btn-sm btn-icon btn-read" data-action="read" data-id="${msg.id}" title="${msg.read ? 'Mark Unread' : 'Mark Read'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${msg.read
                                ? '<path d="M3 12l5 5L20 7"/>'
                                : '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>'}
                        </svg>
                    </button>
                    <button class="btn-sm btn-icon btn-delete" data-action="delete" data-id="${msg.id}" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                </div>
            </div>`
        ).join('');

        // event delegation
        wrap.addEventListener('click', handleMessageAction);
    }

    function handleMessageAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id  = parseInt(btn.dataset.id);
        const act = btn.dataset.action;
        let msgs  = getMessages();

        if (act === 'read') {
            msgs = msgs.map(m => m.id === id ? { ...m, read: !m.read } : m);
            saveMessages(msgs);
            renderMessages();
        } else if (act === 'delete') {
            if (!confirm('Delete this message?')) return;
            msgs = msgs.filter(m => m.id !== id);
            saveMessages(msgs);
            renderMessages();
            showToast('Message deleted.');
        }
    }

    $('markAllReadBtn')?.addEventListener('click', () => {
        const msgs = getMessages().map(m => ({ ...m, read: true }));
        saveMessages(msgs);
        renderMessages();
        showToast('All messages marked as read.');
    });

    $('clearMessagesBtn')?.addEventListener('click', () => {
        if (!confirm('Delete ALL messages? This cannot be undone.')) return;
        saveMessages([]);
        renderMessages();
        showToast('All messages cleared.');
    });

    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    /* ════════════════════════════════════════
       PROJECTS PANEL
    ════════════════════════════════════════ */
    const DEFAULT_PROJECTS = [
        { id: 1, name: 'Smart Hospital Queue Management', category: 'fullstack', desc: 'Real-time hospital queue system for Ethiopian healthcare.', live: 'https://shqms.vercel.app', github: 'https://github.com/Abirshdev/SHQMS', tags: 'MongoDB,Express.js,React,Node.js,Socket.IO' },
        { id: 2, name: 'Campus PC Entry & Exit Monitoring', category: 'fullstack', desc: 'MERN stack app for managing PC entry/exit at Bahir Dar University.', live: 'https://campuspcsystem.onrender.com', github: 'https://github.com/Abirshdev/CampusPCSystem', tags: 'MongoDB,Express.js,Node.js,JavaScript' },
        { id: 3, name: 'Portfolio Website', category: 'frontend', desc: 'Modern, responsive portfolio with dark mode and admin panel.', live: 'https://my-portfolio-5amg.onrender.com', github: '', tags: 'HTML5,CSS3,JavaScript' },
    ];

    function getProjects() { return load(KEYS.projects, DEFAULT_PROJECTS); }
    function saveProjects(arr) { save(KEYS.projects, arr); }

    function renderProjects() {
        const list = $('projectsAdminList');
        if (!list) return;
        const projects = getProjects();
        if (!projects.length) { list.innerHTML = '<p class="empty-state">No projects added yet.</p>'; return; }
        list.innerHTML = projects.map(p => `
            <div class="project-admin-card" data-id="${p.id}">
                <div class="project-admin-info">
                    <h4>${escHtml(p.name)}</h4>
                    <p>${escHtml(p.desc)}</p>
                </div>
                <span class="project-admin-cat">${p.category}</span>
                <div class="project-admin-actions">
                    <button class="btn-sm btn-icon btn-outline" data-action="edit" data-id="${p.id}" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-sm btn-icon btn-delete" data-action="delete" data-id="${p.id}" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                </div>
            </div>`
        ).join('');

        list.addEventListener('click', handleProjectAction);
    }

    function handleProjectAction(e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id  = parseInt(btn.dataset.id);
        const act = btn.dataset.action;

        if (act === 'edit') {
            const p = getProjects().find(p => p.id === id);
            if (!p) return;
            $('pName').value     = p.name;
            $('pCategory').value = p.category;
            $('pDesc').value     = p.desc;
            $('pLive').value     = p.live || '';
            $('pGithub').value   = p.github || '';
            $('pTags').value     = p.tags || '';
            $('pEditId').value   = p.id;
            $('projectFormTitle').textContent = 'Edit Project';
            $('saveProjectBtn').textContent   = 'Update Project';
            $('projectFormWrap').style.display = 'block';
            $('projectFormWrap').scrollIntoView({ behavior:'smooth', block:'nearest' });
        } else if (act === 'delete') {
            if (!confirm('Delete this project?')) return;
            saveProjects(getProjects().filter(p => p.id !== id));
            renderProjects();
            showToast('Project deleted.');
        }
    }

    $('addProjectBtn')?.addEventListener('click', () => {
        $('projectForm').reset();
        $('pEditId').value = '';
        $('projectFormTitle').textContent = 'Add New Project';
        $('saveProjectBtn').textContent   = 'Save Project';
        const wrap = $('projectFormWrap');
        wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    });

    $('cancelProjectBtn')?.addEventListener('click', () => {
        $('projectFormWrap').style.display = 'none';
        $('projectForm').reset();
    });

    $('projectForm')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const projects = getProjects();
        const editId   = parseInt($('pEditId').value);
        const entry = {
            name:     $('pName').value.trim(),
            category: $('pCategory').value,
            desc:     $('pDesc').value.trim(),
            live:     $('pLive').value.trim(),
            github:   $('pGithub').value.trim(),
            tags:     $('pTags').value.trim(),
        };

        if (editId) {
            const idx = projects.findIndex(p => p.id === editId);
            if (idx > -1) projects[idx] = { ...projects[idx], ...entry };
        } else {
            entry.id = Date.now();
            projects.push(entry);
        }

        saveProjects(projects);
        renderProjects();
        $('projectFormWrap').style.display = 'none';
        this.reset();
        showToast(editId ? 'Project updated.' : 'Project added.');
    });

    /* ════════════════════════════════════════
       SETTINGS PANEL
    ════════════════════════════════════════ */

    // Pre-fill settings form
    function loadSettingsForm() {
        const s = load(KEYS.settings, {});
        if ($('sName'))   $('sName').value   = s.name   || 'Abirham Demilew';
        if ($('sRole'))   $('sRole').value   = s.role   || 'Full Stack Developer';
        if ($('sEmail'))  $('sEmail').value  = s.email  || '';
        if ($('sGithub')) $('sGithub').value = s.github || 'https://github.com/Abirshdev';
    }

    $('infoForm')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const s = {
            name:   $('sName').value.trim(),
            role:   $('sRole').value.trim(),
            email:  $('sEmail').value.trim(),
            github: $('sGithub').value.trim(),
        };
        save(KEYS.settings, s);
        const msg = $('infoMsg');
        msg.textContent = 'Settings saved!';
        msg.className   = 'settings-msg ok';
        setTimeout(() => { msg.textContent = ''; }, 3000);
        showToast('Portfolio info saved.');
    });

    $('changePassForm')?.addEventListener('submit', function (e) {
        e.preventDefault();
        const current  = $('currentPass').value;
        const next     = $('newPass').value;
        const confirm  = $('confirmPass').value;
        const msg      = $('passMsg');

        const stored = load(KEYS.password, DEFAULT_PASS);

        if (btoa(current) !== stored) {
            msg.textContent = 'Current password is incorrect.';
            msg.className   = 'settings-msg err';
            return;
        }
        if (next !== confirm) {
            msg.textContent = 'New passwords do not match.';
            msg.className   = 'settings-msg err';
            return;
        }
        if (next.length < 6) {
            msg.textContent = 'Password must be at least 6 characters.';
            msg.className   = 'settings-msg err';
            return;
        }

        save(KEYS.password, btoa(next));
        this.reset();
        msg.textContent = 'Password updated successfully!';
        msg.className   = 'settings-msg ok';
        setTimeout(() => { msg.textContent = ''; }, 3000);
        showToast('Password changed.');
    });

    /* ════════════════════════════════════════
       UNREAD BADGE (global refresh)
    ════════════════════════════════════════ */
    function refreshUnreadBadge() {
        const unread = getMessages().filter(m => !m.read).length;
        const badge  = $('unreadBadge');
        if (badge) {
            badge.textContent    = unread;
            badge.style.display  = unread > 0 ? 'inline-flex' : 'none';
        }
    }

    /* ════════════════════════════════════════
       REFRESH ALL
    ════════════════════════════════════════ */
    function refreshAll() {
        renderAnalytics();
        refreshUnreadBadge();
        loadSettingsForm();
        // Only render messages/projects if panel is visible
        if (document.getElementById('panel-messages')?.classList.contains('active')) renderMessages();
        if (document.getElementById('panel-projects')?.classList.contains('active')) renderProjects();
    }

    /* ════════════════════════════════════════
       INLINE KEYFRAME for toast
    ════════════════════════════════════════ */
    const toastStyle = document.createElement('style');
    toastStyle.textContent = `@keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`;
    document.head.appendChild(toastStyle);

})(); /* end IIFE */
