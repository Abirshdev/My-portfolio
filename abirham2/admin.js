/**
 * admin.js — Admin Panel Logic
 * Auth, analytics display, message management,
 * project CRUD, settings, dark mode.
 *
 * Default credentials: admin / admin123
 */
(function () {
    'use strict';

    /* ════════════════════════════════════════
       HELPERS
    ════════════════════════════════════════ */
    var KEYS = {
        authToken  : 'adm_token',
        password   : 'adm_password',
        projects   : 'adm_projects',
        settings   : 'adm_settings',
        photo      : 'pf_profile_photo',
        favicon    : 'pf_favicon',
        users      : 'adm_users',
        currentUser: 'adm_current_user'
    };

    var DEFAULT_USER = 'admin';
    var DEFAULT_PASS = btoa('admin123');
    var DEFAULT_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%2316a34a'/%3E%3Ctext x='32' y='44' font-family='Arial,Helvetica,sans-serif' font-size='30' font-weight='bold' fill='%23fff' text-anchor='middle'%3EAD%3C/text%3E%3C/svg%3E";

    /* role → which panels the user may open */
    var ROLES = {
        superadmin: { label: 'Super Admin', panels: ['analytics', 'messages', 'projects', 'settings', 'users'] },
        admin:      { label: 'Admin',       panels: ['analytics', 'messages', 'projects', 'settings'] },
        viewer:     { label: 'Viewer',      panels: ['analytics', 'messages'] }
    };

    function getUsers() {
        var users = load(KEYS.users, null);
        if (!users || !users.length) {
            /* migrate legacy single-password setup into a superadmin user */
            users = [{ user: DEFAULT_USER, pass: load(KEYS.password, DEFAULT_PASS), role: 'superadmin', created: Date.now() }];
            save(KEYS.users, users);
        }
        return users;
    }
    function saveUsers(arr) { save(KEYS.users, arr); }

    function getCurrentUser() {
        var name  = load(KEYS.currentUser, DEFAULT_USER);
        var users = getUsers();
        return users.filter(function (u) { return u.user === name; })[0] || users[0];
    }
    function getRole() {
        var u = getCurrentUser();
        return (u && ROLES[u.role]) ? u.role : 'superadmin';
    }
    function canManage() {
        return getRole() !== 'viewer';
    }

    function load(key, fallback) {
        try {
            var v = localStorage.getItem(key);
            return v !== null ? JSON.parse(v) : fallback;
        } catch (e) { return fallback; }
    }

    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }

    function getMessages()       { return load('pf_messages', []); }
    function saveMessages(arr)   { save('pf_messages', arr); }

    function $(id) { return document.getElementById(id); }

    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatDate(iso) {
        if (!iso) return '';
        var d = new Date(iso);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
             + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    /* ── toast ── */
    var toastStyle = document.createElement('style');
    toastStyle.textContent = '@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(toastStyle);

    function showToast(msg, type) {
        type = type || 'ok';
        var old = document.querySelector('.admin-toast');
        if (old) old.remove();
        var t = document.createElement('div');
        t.className   = 'admin-toast';
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;'
            + 'background:' + (type === 'ok' ? 'var(--p)' : 'var(--red)') + ';'
            + 'color:white;padding:.7rem 1.25rem;border-radius:8px;'
            + 'font-weight:600;font-size:.875rem;z-index:9999;'
            + 'box-shadow:0 6px 20px rgba(0,0,0,.2);animation:slideUp .3s ease;';
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 3000);
    }

    /* ════════════════════════════════════════
       DARK MODE
    ════════════════════════════════════════ */
    var html = document.documentElement;

    function applyTheme(t) {
        html.setAttribute('data-theme', t);
        localStorage.setItem('pf_theme', t);
    }

    (function initTheme() {
        var saved = localStorage.getItem('pf_theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(saved);
    })();

    var themeBtn = $('themeToggleAdmin');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
        });
    }

    /* ════════════════════════════════════════
       AUTH
    ════════════════════════════════════════ */
    function isLoggedIn() {
        return load(KEYS.authToken, null) === 'valid_session';
    }

    function login(user, pass) {
        var match = getUsers().filter(function (u) { return u.user === user.trim(); })[0];
        if (match && btoa(pass) === match.pass) {
            save(KEYS.authToken, 'valid_session');
            save(KEYS.currentUser, match.user);
            return true;
        }
        return false;
    }

    function logout() {
        localStorage.removeItem(KEYS.authToken);
        localStorage.removeItem(KEYS.currentUser);
        showLoginScreen();
    }

    function showLoginScreen() {
        $('loginScreen').style.display = 'flex';
        $('dashboard').style.display   = 'none';
    }

    function showDashboard() {
        $('loginScreen').style.display = 'none';
        $('dashboard').style.display   = 'flex';
        applyPermissions();
        refreshAll();
    }

    /* show only the nav items the current role is allowed to see */
    function applyPermissions() {
        var u      = getCurrentUser();
        var panels = (u && ROLES[u.role]) ? ROLES[u.role].panels : ROLES.viewer.panels;

        document.querySelectorAll('.nav-item[data-panel]').forEach(function (btn) {
            var allowed = panels.indexOf(btn.dataset.panel) > -1;
            btn.style.display = allowed ? '' : 'none';
        });

        var active  = document.querySelector('.nav-item[data-panel].active');
        var allowed = active && panels.indexOf(active.dataset.panel) > -1;
        if (!allowed) {
            var first = null;
            document.querySelectorAll('.nav-item[data-panel]').forEach(function (btn) {
                if (!first && btn.style.display !== 'none') first = btn;
            });
            if (first) first.click();
        }

        if ($('topbarUserName')) $('topbarUserName').textContent = u ? u.user : DEFAULT_USER;
        if ($('topbarRole'))     $('topbarRole').textContent     = (u && ROLES[u.role]) ? ROLES[u.role].label : 'Super Admin';

        var manage = canManage();
        if ($('markAllReadBtn'))  $('markAllReadBtn').style.display  = manage ? '' : 'none';
        if ($('clearMessagesBtn'))$('clearMessagesBtn').style.display = manage ? '' : 'none';
    }

    /* toggle password visibility */
    var togglePassBtn = $('togglePass');
    if (togglePassBtn) {
        togglePassBtn.addEventListener('click', function () {
            var inp    = $('adminPass');
            var isPass = inp.type === 'password';
            inp.type   = isPass ? 'text' : 'password';
            var show   = this.querySelector('.eye-show');
            var hide   = this.querySelector('.eye-hide');
            if (show) show.style.display = isPass ? 'none'  : 'block';
            if (hide) hide.style.display = isPass ? 'block' : 'none';
        });
    }

    var loginForm = $('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var user = $('adminUser').value;
            var pass = $('adminPass').value;
            var btn  = $('loginBtn');
            var err  = $('loginError');

            err.textContent  = '';
            btn.textContent  = 'Signing in\u2026';
            btn.disabled     = true;

            setTimeout(function () {
                if (login(user, pass)) {
                    showDashboard();
                } else {
                    err.textContent   = 'Invalid username or password.';
                    $('adminPass').value = '';
                }
                btn.textContent = 'Sign In';
                btn.disabled    = false;
            }, 600);
        });
    }

    var logoutBtn = $('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    /* ════════════════════════════════════════
       SIDEBAR NAVIGATION
    ════════════════════════════════════════ */
    var sidebar       = $('sidebar');
    var sidebarToggle = $('sidebarToggle');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('open');
        });
    }

    document.addEventListener('click', function (e) {
        if (sidebar && sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== sidebarToggle) {
            sidebar.classList.remove('open');
        }
    });

    document.querySelectorAll('.nav-item[data-panel]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.nav-item').forEach(function (b) { b.classList.remove('active'); });
            document.querySelectorAll('.panel').forEach(function (p)   { p.classList.remove('active'); });
            btn.classList.add('active');

            var panel = $('panel-' + btn.dataset.panel);
            if (panel) panel.classList.add('active');

            var titleEl = $('topbarTitle');
            if (titleEl) titleEl.textContent = btn.textContent.trim().replace(/\d+/, '').trim();

            if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove('open');

            if (btn.dataset.panel === 'analytics') renderAnalytics();
            if (btn.dataset.panel === 'messages')  renderMessages();
            if (btn.dataset.panel === 'projects')  renderProjects();
            if (btn.dataset.panel === 'users')     renderUsers();
        });
    });

    /* ════════════════════════════════════════
       ANALYTICS PANEL
    ════════════════════════════════════════ */
    function renderAnalytics() {
        var s = (window.PortfolioAnalytics && window.PortfolioAnalytics.getSummary) ?
            window.PortfolioAnalytics.getSummary() : {};

        function numEl(id, val) {
            var e = $(id);
            if (e) e.textContent = (val !== undefined && val !== null) ? val : 0;
        }

        numEl('statVisitors',     s.totalVisitors);
        numEl('statPageViews',    s.totalPageViews);
        numEl('statTodayViews',   s.todayViews);
        numEl('statContactSends', s.contactSends);

        renderBarChart(s.last7Days || []);
        renderProjectClicks(s.projectClicks || {});
        renderTable('sectionTable', s.sectionTime || {}, 's');
        renderTable('sectionViewsTable', s.sectionViews || {});
        renderReferrers(s.referrers || {});
        renderJourneys(s.journeys || []);
    }

    function renderBarChart(days) {
        var el = $('dailyChart');
        if (!el) return;
        if (!days.length) {
            el.innerHTML = '<p style="color:var(--text-3);font-size:.85rem;padding:1rem">No data yet.</p>';
            return;
        }
        var max = Math.max.apply(null, days.map(function (d) { return d.views; }).concat([1]));
        el.innerHTML = days.map(function (d) {
            var pct   = Math.round((d.views / max) * 100);
            var label = d.date ? d.date.slice(5) : '';
            return '<div class="bar-col">'
                + '<span class="bar-val">' + d.views + '</span>'
                + '<div class="bar-fill" style="height:' + Math.max(pct, 3) + '%"></div>'
                + '<span class="bar-label">' + label + '</span>'
                + '</div>';
        }).join('');
    }

    function renderProjectClicks(clicks) {
        var el = $('projectClicksChart');
        if (!el) return;
        var entries = Object.keys(clicks).map(function (k) { return [k, clicks[k]]; })
                            .sort(function (a, b) { return b[1] - a[1]; });
        if (!entries.length) {
            el.innerHTML = '<p style="color:var(--text-3);font-size:.85rem">No project clicks yet.</p>';
            return;
        }
        var max = Math.max.apply(null, entries.map(function (e) { return e[1]; }).concat([1]));
        el.innerHTML = entries.map(function (e) {
            var w = Math.round((e[1] / max) * 100);
            return '<div class="donut-row">'
                + '<div class="donut-row-header">'
                + '<span class="donut-row-label">' + escHtml(e[0]) + '</span>'
                + '<span class="donut-row-val">' + e[1] + '</span>'
                + '</div>'
                + '<div class="donut-bar-track"><div class="donut-bar-fill" style="width:' + w + '%"></div></div>'
                + '</div>';
        }).join('');
    }

    function renderTable(tableId, data, valSuffix) {
        valSuffix = valSuffix || '';
        var tbody = document.querySelector('#' + tableId + ' tbody');
        if (!tbody) return;
        var entries = Object.keys(data).map(function (k) { return [k, data[k]]; })
                            .sort(function (a, b) { return b[1] - a[1]; });
        if (!entries.length) {
            tbody.innerHTML = '<tr><td colspan="2" style="color:var(--text-3)">No data yet.</td></tr>';
            return;
        }
        tbody.innerHTML = entries.map(function (e) {
            return '<tr><td>' + escHtml(e[0]) + '</td><td>' + e[1] + valSuffix + '</td></tr>';
        }).join('');
    }

    function renderReferrers(refs) {
        var tbody = document.querySelector('#referrerTable tbody');
        if (!tbody) return;
        var entries = Object.keys(refs).map(function (k) { return [k, refs[k]]; })
                            .sort(function (a, b) { return b[1] - a[1]; });
        if (!entries.length) {
            var direct = 0;
            if (window.PortfolioAnalytics && window.PortfolioAnalytics.getSessions) {
                direct = window.PortfolioAnalytics.getSessions()
                    .filter(function (s) { return s.ref === 'direct'; }).length;
            }
            tbody.innerHTML = direct > 0
                ? '<tr><td>direct</td><td>' + direct + '</td></tr>'
                : '<tr><td colspan="2" style="color:var(--text-3)">No referrer data yet.</td></tr>';
            return;
        }
        tbody.innerHTML = entries.map(function (e) {
            return '<tr><td>' + escHtml(e[0]) + '</td><td>' + e[1] + '</td></tr>';
        }).join('');
    }

    function renderJourneys(journeys) {
        var el = $('journeysList');
        if (!el) return;
        if (!journeys.length) {
            el.innerHTML = '<p style="color:var(--text-3);font-size:.85rem">No visitor journeys yet.</p>';
            return;
        }
        el.innerHTML = journeys.map(function (j) {
            var path = j.path.length
                ? j.path.map(function (s) {
                    return '<span class="journey-stop">' + escHtml(s) + '</span>';
                }).join('<span class="journey-arrow">→</span>')
                : '<span style="color:var(--text-3)">Home only</span>';
            return '<div class="journey-card">'
                + '<div class="journey-meta">'
                + '<span class="journey-time">' + formatDate(j.ts) + '</span>'
                + '<span class="journey-ref">' + escHtml(j.ref) + '</span>'
                + '</div>'
                + '<div class="journey-path">' + path + '</div>'
                + '</div>';
        }).join('');
    }

    var resetAnalyticsBtn = $('resetAnalyticsBtn');
    if (resetAnalyticsBtn) {
        resetAnalyticsBtn.addEventListener('click', function () {
            if (!confirm('Reset ALL analytics data? This cannot be undone.')) return;
            if (window.PortfolioAnalytics) window.PortfolioAnalytics.reset();
            renderAnalytics();
            showToast('Analytics data reset.');
        });
    }

    var dangerResetBtn = $('dangerResetBtn');
    if (dangerResetBtn) {
        dangerResetBtn.addEventListener('click', function () {
            if (!confirm('This will permanently delete all visitor analytics. Continue?')) return;
            if (window.PortfolioAnalytics) window.PortfolioAnalytics.reset();
            renderAnalytics();
            showToast('All analytics cleared.');
        });
    }

    /* ════════════════════════════════════════
       MESSAGES PANEL
    ════════════════════════════════════════ */
    function renderMessages() {
        var wrap = $('messagesWrap');
        if (!wrap) return;

        var msgs   = getMessages().sort(function (a, b) { return (b.ts || 0) > (a.ts || 0) ? 1 : -1; });
        var unread = msgs.filter(function (m) { return !m.read; }).length;

        var badge = $('unreadBadge');
        if (badge) {
            badge.textContent    = unread;
            badge.style.display  = unread > 0 ? 'inline-flex' : 'none';
        }

        if (!msgs.length) {
            wrap.innerHTML = '<p class="empty-state">No messages yet.</p>';
            return;
        }

        wrap.innerHTML = msgs.map(function (msg) {
            return '<div class="message-card ' + (msg.read ? '' : 'unread') + '" data-id="' + msg.id + '">'
                + '<div class="message-header">'
                + '<span class="message-sender">'
                + (msg.read ? '' : '<span class="unread-dot"></span>')
                + escHtml(msg.name || 'Unknown') + '</span>'
                + '<div class="message-meta">'
                + '<span>' + escHtml(msg.email || '') + '</span>'
                + '<span>&middot;</span>'
                + '<span>' + formatDate(msg.ts) + '</span>'
                + '</div></div>'
                + (msg.subject ? '<div class="message-subject">' + escHtml(msg.subject) + '</div>' : '')
                + '<div class="message-body">' + escHtml(msg.message || '') + '</div>'
                + (canManage()
                    ? '<div class="message-actions">'
                    + '<button class="btn-sm btn-icon btn-read" data-action="read" data-id="' + msg.id + '" title="' + (msg.read ? 'Mark Unread' : 'Mark Read') + '">'
                    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
                    + (msg.read ? '<path d="M3 12l5 5L20 7"/>' : '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>')
                    + '</svg></button>'
                    + '<button class="btn-sm btn-icon btn-delete" data-action="delete" data-id="' + msg.id + '" title="Delete">'
                    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>'
                    + '</button></div>'
                    : '')
                + '</div>';
        }).join('');

        /* use one-time delegation to avoid duplicate listeners */
        wrap.onclick = function (e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var id  = parseInt(btn.dataset.id, 10);
            var act = btn.dataset.action;
            var all = getMessages();

            if (act === 'read') {
                all = all.map(function (m) { return m.id === id ? Object.assign({}, m, { read: !m.read }) : m; });
                saveMessages(all);
                renderMessages();
            } else if (act === 'delete') {
                if (!confirm('Delete this message?')) return;
                saveMessages(all.filter(function (m) { return m.id !== id; }));
                renderMessages();
                showToast('Message deleted.');
            }
        };
    }

    var markAllReadBtn = $('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function () {
            saveMessages(getMessages().map(function (m) { return Object.assign({}, m, { read: true }); }));
            renderMessages();
            showToast('All messages marked as read.');
        });
    }

    var clearMessagesBtn = $('clearMessagesBtn');
    if (clearMessagesBtn) {
        clearMessagesBtn.addEventListener('click', function () {
            if (!confirm('Delete ALL messages? This cannot be undone.')) return;
            saveMessages([]);
            renderMessages();
            showToast('All messages cleared.');
        });
    }

    /* ════════════════════════════════════════
       PROJECTS PANEL
    ════════════════════════════════════════ */
    var DEFAULT_PROJECTS = [
        { id: 1, name: 'Smart Hospital Queue Management',   category: 'fullstack', desc: 'Real-time hospital queue system for Ethiopian healthcare.', live: 'https://shqms.vercel.app',              github: 'https://github.com/Abirshdev/SHQMS',           tags: 'MongoDB,Express.js,React,Node.js,Socket.IO' },
        { id: 2, name: 'Campus PC Entry & Exit Monitoring', category: 'fullstack', desc: 'MERN app for PC entry/exit management at Bahir Dar University.', live: 'https://campuspcsystem.onrender.com', github: 'https://github.com/Abirshdev/CampusPCSystem', tags: 'MongoDB,Express.js,Node.js,JavaScript' },
        { id: 3, name: 'Portfolio Website',                 category: 'frontend',  desc: 'Modern responsive portfolio with dark mode and admin panel.',  live: 'https://my-portfolio-5amg.onrender.com', github: '',                                            tags: 'HTML5,CSS3,JavaScript' }
    ];

    function getProjects()     { return load(KEYS.projects, DEFAULT_PROJECTS); }
    function saveProjects(arr) { save(KEYS.projects, arr); }

    function renderProjects() {
        var list = $('projectsAdminList');
        if (!list) return;
        var projects = getProjects();
        if (!projects.length) { list.innerHTML = '<p class="empty-state">No projects added yet.</p>'; return; }

        list.innerHTML = projects.map(function (p) {
            return '<div class="project-admin-card" data-id="' + p.id + '">'
                + '<div class="project-admin-info">'
                + '<h4>' + escHtml(p.name) + '</h4>'
                + '<p>' + escHtml(p.desc) + '</p>'
                + '</div>'
                + '<span class="project-admin-cat">' + escHtml(p.category) + '</span>'
                + '<div class="project-admin-actions">'
                + '<button class="btn-sm btn-icon btn-outline" data-action="edit" data-id="' + p.id + '" title="Edit">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
                + '</button>'
                + '<button class="btn-sm btn-icon btn-delete" data-action="delete" data-id="' + p.id + '" title="Delete">'
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>'
                + '</button>'
                + '</div></div>';
        }).join('');

        list.onclick = function (e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var id  = parseInt(btn.dataset.id, 10);
            var act = btn.dataset.action;

            if (act === 'edit') {
                var p = getProjects().filter(function (x) { return x.id === id; })[0];
                if (!p) return;
                $('pName').value     = p.name;
                $('pCategory').value = p.category;
                $('pDesc').value     = p.desc;
                $('pLive').value     = p.live    || '';
                $('pGithub').value   = p.github  || '';
                $('pTags').value     = p.tags    || '';
                $('pEditId').value   = p.id;
                $('projectFormTitle').textContent = 'Edit Project';
                $('saveProjectBtn').textContent   = 'Update Project';
                $('projectFormWrap').style.display = 'block';
                $('projectFormWrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (act === 'delete') {
                if (!confirm('Delete this project?')) return;
                saveProjects(getProjects().filter(function (x) { return x.id !== id; }));
                renderProjects();
                showToast('Project deleted.');
            }
        };
    }

    var addProjectBtn = $('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', function () {
            var wrap = $('projectFormWrap');
            $('projectForm').reset();
            $('pEditId').value = '';
            $('projectFormTitle').textContent = 'Add New Project';
            $('saveProjectBtn').textContent   = 'Save Project';
            wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
        });
    }

    var cancelProjectBtn = $('cancelProjectBtn');
    if (cancelProjectBtn) {
        cancelProjectBtn.addEventListener('click', function () {
            $('projectFormWrap').style.display = 'none';
            $('projectForm').reset();
        });
    }

    var projectForm = $('projectForm');
    if (projectForm) {
        projectForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var projects = getProjects();
            var editId   = parseInt($('pEditId').value, 10);
            var entry    = {
                name    : $('pName').value.trim(),
                category: $('pCategory').value,
                desc    : $('pDesc').value.trim(),
                live    : $('pLive').value.trim(),
                github  : $('pGithub').value.trim(),
                tags    : $('pTags').value.trim()
            };

            if (editId) {
                var idx = -1;
                projects.forEach(function (p, i) { if (p.id === editId) idx = i; });
                if (idx > -1) projects[idx] = Object.assign({}, projects[idx], entry);
            } else {
                entry.id = Date.now();
                projects.push(entry);
            }

            saveProjects(projects);
            renderProjects();
            $('projectFormWrap').style.display = 'none';
            projectForm.reset();
            showToast(editId ? 'Project updated.' : 'Project added.');
        });
    }

    /* ════════════════════════════════════════
       USERS PANEL — manage admin accounts & roles
    ════════════════════════════════════════ */
    function renderUsers() {
        var list = $('usersAdminList');
        if (!list) return;
        var users = getUsers();
        var me    = getCurrentUser();
        var isSuper = me.role === 'superadmin';

        if (!users.length) { list.innerHTML = '<p class="empty-state">No users yet.</p>'; return; }

        list.innerHTML = users.map(function (u) {
            var role = ROLES[u.role] ? ROLES[u.role] : ROLES.viewer;
            var isMe = u.user === me.user;
            var actions = '';
            if (isSuper && !isMe) {
                actions = '<button class="btn-sm btn-icon btn-outline" data-action="edit" data-name="' + escHtml(u.user) + '" title="Edit">'
                    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
                    + '</button>'
                    + '<button class="btn-sm btn-icon btn-delete" data-action="delete" data-name="' + escHtml(u.user) + '" title="Delete">'
                    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4h6v2"/></svg>'
                    + '</button>';
            }
            return '<div class="project-admin-card user-card" data-name="' + escHtml(u.user) + '">'
                + '<div class="project-admin-info">'
                + '<h4>' + escHtml(u.user) + (isMe ? ' <span class="you-badge">you</span>' : '') + '</h4>'
                + '<p>' + formatDate(u.created) + '</p>'
                + '</div>'
                + '<span class="project-admin-cat role-' + u.role + '">' + role.label + '</span>'
                + (actions ? '<div class="project-admin-actions">' + actions + '</div>' : '')
                + '</div>';
        }).join('');

        list.onclick = function (e) {
            var btn = e.target.closest('[data-action]');
            if (!btn) return;
            var name = btn.dataset.name;
            var act  = btn.dataset.action;
            var users = getUsers();
            var target = users.filter(function (u) { return u.user === name; })[0];
            if (!target) return;

            if (act === 'edit') {
                $('uName').value        = target.user;
                $('uName').disabled     = true;
                $('uPass').value        = '';
                $('uPass').placeholder  = 'Leave blank to keep current password';
                $('uRole').value        = target.role;
                $('uEditName').value    = target.user;
                $('userFormTitle').textContent = 'Edit User';
                $('saveUserBtn').textContent   = 'Update User';
                $('userFormWrap').style.display = 'block';
                $('userFormWrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (act === 'delete') {
                if (!confirm('Delete user "' + name + '"? This cannot be undone.')) return;
                if (target.role === 'superadmin' && users.filter(function (u) { return u.role === 'superadmin'; }).length <= 1) {
                    showToast('Cannot delete the last super admin.', 'err');
                    return;
                }
                saveUsers(users.filter(function (u) { return u.user !== name; }));
                renderUsers();
                showToast('User deleted.');
            }
        };
    }

    var addUserBtn = $('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function () {
            $('userForm').reset();
            $('uName').disabled    = false;
            $('uPass').placeholder = '';
            $('uEditName').value   = '';
            $('userFormTitle').textContent = 'Add New User';
            $('saveUserBtn').textContent   = 'Save User';
            $('userFormWrap').style.display = $('userFormWrap').style.display === 'none' ? 'block' : 'none';
        });
    }

    var cancelUserBtn = $('cancelUserBtn');
    if (cancelUserBtn) {
        cancelUserBtn.addEventListener('click', function () {
            $('userFormWrap').style.display = 'none';
            $('userForm').reset();
            $('uName').disabled = false;
        });
    }

    var userForm = $('userForm');
    if (userForm) {
        userForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var users = getUsers();
            var editName = $('uEditName').value.trim();
            var name = $('uName').value.trim();
            var pass = $('uPass').value;
            var role = $('uRole').value;

            if (users.filter(function (u) { return u.user === name; }).length && !editName) {
                showToast('A user with that username already exists.', 'err');
                return;
            }

            if (editName) {
                var idx = -1;
                users.forEach(function (u, i) { if (u.user === editName) idx = i; });
                if (idx > -1) {
                    users[idx].role = role;
                    if (pass) users[idx].pass = btoa(pass);
                }
            } else {
                if (!pass) { showToast('Password is required.', 'err'); return; }
                users.push({ user: name, pass: btoa(pass), role: role, created: Date.now() });
            }

            saveUsers(users);
            renderUsers();
            $('userFormWrap').style.display = 'none';
            userForm.reset();
            $('uName').disabled = false;
            showToast(editName ? 'User updated.' : 'User added.');
        });
    }

    /* ════════════════════════════════════════
       SETTINGS PANEL
    ════════════════════════════════════════ */
    function loadSettingsForm() {
        var s = load(KEYS.settings, {});
        if ($('sName'))   $('sName').value   = s.name   || 'Abirham Demilew';
        if ($('sRole'))   $('sRole').value   = s.role   || 'Full Stack Developer';
        if ($('sEmail'))  $('sEmail').value  = s.email  || '';
        if ($('sGithub')) $('sGithub').value = s.github || 'https://github.com/Abirshdev';
        loadBranding();
    }

    var infoForm = $('infoForm');
    if (infoForm) {
        infoForm.addEventListener('submit', function (e) {
            e.preventDefault();
            save(KEYS.settings, {
                name  : $('sName').value.trim(),
                role  : $('sRole').value.trim(),
                email : $('sEmail').value.trim(),
                github: $('sGithub').value.trim()
            });
            var msg = $('infoMsg');
            msg.textContent = 'Settings saved!';
            msg.className   = 'settings-msg ok';
            setTimeout(function () { msg.textContent = ''; }, 3000);
            showToast('Portfolio info saved.');
        });
    }

    var changePassForm = $('changePassForm');
    if (changePassForm) {
        changePassForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var current = $('currentPass').value;
            var next    = $('newPass').value;
            var confirm = $('confirmPass').value;
            var msg     = $('passMsg');
            var users   = getUsers();
            var me      = getCurrentUser();

            if (btoa(current) !== me.pass) {
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
            users.forEach(function (u, i) { if (u.user === me.user) users[i].pass = btoa(next); });
            saveUsers(users);
            changePassForm.reset();
            msg.textContent = 'Password updated successfully!';
            msg.className   = 'settings-msg ok';
            setTimeout(function () { msg.textContent = ''; }, 3000);
            showToast('Password changed.');
        });
    }

    /* ════════════════════════════════════════
       BRANDING — profile photo & favicon
    ════════════════════════════════════════ */
    function readImage(file, maxSize, mime, quality, key, previewEl) {
        if (!file) return;
        if (!/^image\//.test(file.type)) {
            showToast('Please choose an image file.', 'err');
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                var scale  = Math.min(1, maxSize / Math.max(img.width, img.height));
                canvas.width  = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                var dataUrl = canvas.toDataURL(mime, quality);
                try {
                    localStorage.setItem(key, dataUrl);
                } catch (err2) {
                    showToast('Image too large to save. Try a smaller file.', 'err');
                    return;
                }
                if (previewEl) previewEl.src = dataUrl;
                var msg = $('brandMsg');
                if (msg) {
                    msg.textContent = 'Saved. The site will use this image.';
                    msg.className   = 'settings-msg ok';
                }
                showToast('Image saved.');
            };
            img.onerror = function () { showToast('Could not read this image.', 'err'); };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    var photoUpload = $('photoUpload');
    if (photoUpload) {
        photoUpload.addEventListener('change', function () {
            readImage(this.files[0], 600, 'image/jpeg', 0.85, KEYS.photo, $('photoPreview'));
            this.value = '';
        });
    }

    var faviconUpload = $('faviconUpload');
    if (faviconUpload) {
        faviconUpload.addEventListener('change', function () {
            readImage(this.files[0], 128, 'image/png', 1, KEYS.favicon, $('faviconPreview'));
            this.value = '';
        });
    }

    var resetPhotoBtn = $('resetPhotoBtn');
    if (resetPhotoBtn) {
        resetPhotoBtn.addEventListener('click', function () {
            localStorage.removeItem(KEYS.photo);
            if ($('photoPreview')) $('photoPreview').src = 'profile.jpg';
            var msg = $('brandMsg');
            if (msg) {
                msg.textContent = 'Profile photo reset to default.';
                msg.className   = 'settings-msg ok';
            }
            showToast('Profile photo reset.');
        });
    }

    var resetFaviconBtn = $('resetFaviconBtn');
    if (resetFaviconBtn) {
        resetFaviconBtn.addEventListener('click', function () {
            localStorage.removeItem(KEYS.favicon);
            if ($('faviconPreview')) $('faviconPreview').src = DEFAULT_FAVICON;
            var msg = $('brandMsg');
            if (msg) {
                msg.textContent = 'Favicon reset to default.';
                msg.className   = 'settings-msg ok';
            }
            showToast('Favicon reset.');
        });
    }

    function loadBranding() {
        var photo = localStorage.getItem(KEYS.photo);
        if ($('photoPreview'))    $('photoPreview').src    = photo || 'profile.jpg';
        if ($('faviconPreview'))  $('faviconPreview').src  = localStorage.getItem(KEYS.favicon) || DEFAULT_FAVICON;
        if ($('adminAvatar')) {
            $('adminAvatar').style.backgroundImage = photo ? 'url(' + photo + ')' : '';
            $('adminAvatar').style.backgroundSize  = photo ? 'cover' : '';
            $('adminAvatar').style.backgroundPosition = photo ? 'center' : '';
        }
    }

    /* ════════════════════════════════════════
       REFRESH ALL
    ════════════════════════════════════════ */
    function refreshUnreadBadge() {
        var unread = getMessages().filter(function (m) { return !m.read; }).length;
        var badge  = $('unreadBadge');
        if (badge) {
            badge.textContent   = unread;
            badge.style.display = unread > 0 ? 'inline-flex' : 'none';
        }
    }

    function refreshAll() {
        renderAnalytics();
        refreshUnreadBadge();
        loadSettingsForm();
        var mp = $('panel-messages');
        var pp = $('panel-projects');
        var up = $('panel-users');
        if (mp && mp.classList.contains('active')) renderMessages();
        if (pp && pp.classList.contains('active')) renderProjects();
        if (up && up.classList.contains('active')) renderUsers();
    }

    /* ════════════════════════════════════════
       INIT
    ════════════════════════════════════════ */
    if (isLoggedIn()) {
        showDashboard();
    } else {
        showLoginScreen();
    }

})(); /* end IIFE */
