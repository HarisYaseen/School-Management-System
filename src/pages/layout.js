// Shared layout logic
function getUser() {
    try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; }
}

function requireAuth() {
    const user = getUser();
    if (!user) { 
        window.location.href = 'gateway.html'; 
        return;
    }

    // NORMALIZE USER DATA
    const role = (user.role || 'staff').toLowerCase().trim();
    let perms = [];
    try {
        const p = user.permissions;
        perms = typeof p === 'string' ? JSON.parse(p) : (p || []);
    } catch(e) { perms = []; }
    perms = perms.map(p => p.toLowerCase());

    const filename = window.location.pathname.split('/').pop().split('\\').pop().toLowerCase();
    
    // HARD BLOCK FOR STAFF
    if (role !== 'admin') {
        const restrictedKeywords = ['fees', 'bank', 'inventory', 'pos', 'expenses', 'staff', 'users', 'reports', 'settings'];
        const isRestricted = restrictedKeywords.some(kw => filename.includes(kw));
        
        // If they only have 'academic' permission, they can ONLY see dashboard, reminders, and academic pages.
        if (isRestricted && !perms.includes('hr') && !perms.includes('finance') && !perms.includes('pos')) {
            console.error('NUCLEAR BLOCK: Unauthorized Access Attempt to', filename);
            window.location.href = 'dashboard.html';
        }
    }
}

function buildSidebar(activePage) {
    const user = getUser();
    const role = (user?.role || 'staff').toLowerCase().trim();
    let perms = [];
    try {
        const p = user?.permissions;
        perms = typeof p === 'string' ? JSON.parse(p) : (p || []);
    } catch(e) { perms = []; }
    perms = perms.map(p => p.toLowerCase());

    const isAdmin = role === 'admin';

    const groups = [
        { label: 'General', items: [
            { page: 'dashboard', icon: 'fa-grip-vertical', label: 'Dashboard', href: 'dashboard.html' },
            { page: 'calendar', icon: 'fa-calendar-day', label: 'School Calendar', href: 'calendar.html' },
            { page: 'reminders', icon: 'fa-bell', label: 'Reminders', href: 'reminders.html' },
            { page: 'sms', icon: 'fa-comment-sms', label: 'SMS Portal', href: 'sms.html' }
        ]},
        { label: 'Academic', perm: 'academic', items: [
            { page: 'students', icon: 'fa-user-graduate', label: 'Students', href: 'students.html' },
            { page: 'teachers', icon: 'fa-chalkboard-user', label: 'Teachers', href: 'teachers.html' },
            { page: 'attendance', icon: 'fa-calendar-check', label: 'Attendance', href: 'attendance.html' },
            { page: 'exams', icon: 'fa-graduation-cap', label: 'Exams & DMC', href: 'exams.html' },
            { page: 'timetable', icon: 'fa-calendar-days', label: 'Timetable', href: 'timetable.html' },
            { page: 'diary', icon: 'fa-book-open', label: 'Daily Diary', href: 'diary.html' },
            { page: 'certificates', icon: 'fa-certificate', label: 'Certificates', href: 'certificates.html' },
            { page: 'id_cards', icon: 'fa-id-card', label: 'ID Cards', href: 'id_cards.html' },
            { page: 'biodata', icon: 'fa-address-card', label: 'Student Biodata', href: 'biodata.html' }
        ]},
        { label: 'Finance', perm: 'finance', items: [
            { page: 'fees', icon: 'fa-wallet', label: 'Fee Collection', href: 'fees.html' },
            { page: 'fee_structure', icon: 'fa-list-check', label: 'Fee Structure', href: 'fee_structure.html' },
            { page: 'bank', icon: 'fa-building-columns', label: 'Bank & Cash', href: 'bank.html' },
            { page: 'expenses', icon: 'fa-money-bill-transfer', label: 'Expenses', href: 'expenses.html' },
            { page: 'transport', icon: 'fa-bus', label: 'Transport', href: 'transport.html' },
            { page: 'withdrawals', icon: 'fa-hand-holding-dollar', label: 'Withdrawals', href: 'withdrawals.html' }
        ]},
        { label: 'Shop', perm: 'pos', items: [
            { page: 'inventory', icon: 'fa-boxes-stacked', label: 'Inventory', href: 'inventory.html' },
            { page: 'pos', icon: 'fa-cash-register', label: 'Point of Sale', href: 'pos.html' }
        ]},
        { label: 'Management', perm: 'hr', items: [
            { page: 'staff', icon: 'fa-user-tie', label: 'Staff HR', href: 'staff.html' },
            { page: 'payroll', icon: 'fa-file-invoice-dollar', label: 'Staff Payroll', href: 'payroll.html' },
            { page: 'staff_attendance', icon: 'fa-user-check', label: 'Staff Attendance', href: 'staff_attendance.html' },
            { page: 'users', icon: 'fa-user-gear', label: 'User Roles', href: 'users.html' },
            { page: 'sessions', icon: 'fa-clock-rotate-left', label: 'Sessions', href: 'sessions.html' }
        ]},
        { label: 'System', items: [
            { page: 'reports', icon: 'fa-chart-pie', label: 'Reports', href: 'reports.html' },
            { page: 'settings', icon: 'fa-gear', label: 'Settings', href: 'settings.html' }
        ]}
    ];

    const filtered = groups.map(g => {
        if (isAdmin) return g;
        if (g.perm && !perms.includes(g.perm)) return null;
        return g;
    }).filter(g => g !== null);

    return `
    <aside class="w-64 bg-prime text-white flex flex-col h-screen shadow-2xl relative z-20">
        <div class="p-6 flex items-center gap-4 flex-shrink-0">
             <div class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden" id="sidebar-logo-container">
                <i class="fa-solid fa-graduation-cap text-lg animate-pulse" id="sidebar-default-logo"></i>
             </div>
             <span id="sidebar-logo-text" class="font-black text-lg whitespace-normal break-words max-w-[180px] uppercase tracking-tighter leading-none">SMS<br><span class="text-[10px] opacity-60">Connect</span></span>
        </div>
        <nav id="sidebar-nav" class="flex-1 px-4 space-y-3 overflow-y-auto pt-4 sidebar-scroll">
            ${filtered.map(g => `
                <div class="space-y-0.5">
                    <p class="text-[8px] font-black text-white/20 uppercase px-4 mb-1 tracking-widest">${g.label}</p>
                    ${g.items.map(item => `
                        <a href="${item.href}" class="flex items-center gap-4 px-4 py-2 rounded-xl transition-all ${activePage === item.page ? 'bg-white text-prime shadow-xl scale-105 active-nav-item' : 'text-white/60 hover:bg-white/5 hover:text-white'}">
                            <i class="fa-solid ${item.icon} w-5 text-center text-sm"></i>
                            <span class="text-[13px] font-bold whitespace-nowrap">${item.label}</span>
                        </a>
                    `).join('')}
                </div>
            `).join('')}
        </nav>
        <div class="p-4 border-t border-white/5">
            <div onclick="logout()" class="flex items-center gap-4 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-all">
                <i class="fa-solid fa-power-off w-5 text-center"></i>
                <span class="text-sm font-bold">Logout</span>
            </div>
        </div>
    </aside>`;
}

function buildTopbar(title) {
    const user = getUser();
    const isAdmin = (user?.role || 'staff').toLowerCase().trim() === 'admin';
    return `
    <header class="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 w-full flex-shrink-0 relative z-10">
        <div class="flex items-center gap-4">
            <h2 class="text-xl font-black text-slate-800 tracking-tight">${title}</h2>
        </div>
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-prime/20">
                <div class="w-10 h-10 rounded-xl bg-prime overflow-hidden flex items-center justify-center text-white font-black text-sm shadow-md" id="topbar-avatar-container">
                    ${(user?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                    <p class="text-[11px] font-black text-slate-700 leading-none mb-0.5">${user?.name || 'Admin'}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wider">${user?.role || 'Staff'}</p>
                </div>
            </div>
        </div>
        </header>
    `;
}

function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `fixed top-6 right-6 px-6 py-3 rounded-2xl font-black text-xs text-white shadow-2xl z-[9999] transition-all transform translate-x-20 opacity-0 ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`;
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.remove('translate-x-20', 'opacity-0'); }, 10);
    setTimeout(() => { t.classList.add('translate-x-20', 'opacity-0'); setTimeout(() => t.remove(), 500); }, 3000);
}

function formatNum(n) { return new Intl.NumberFormat().format(Number(n) || 0); }
function formatCurrency(n) { return 'Rs. ' + formatNum(n); }

function formatDate(d) { 
    if (!d) return '—'; 
    try {
        return new Date(d.replace(' ', 'T')).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); 
    } catch(e) { return d; }
}

function formatDateTime(d) { 
    if (!d) return '—'; 
    try {
        return new Date(d.replace(' ', 'T')).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); 
    } catch(e) { return d; }
}

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function logout() {
    sessionStorage.clear();
    window.location.href = 'gateway.html';
}

let searchTimeout;
async function handleGlobalSearch(q) {
    clearTimeout(searchTimeout);
    const box = document.getElementById('search-results');
    if (!box) return;

    if (!q.trim()) {
        box.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        // Position it under the input
        const input = document.getElementById('global-search-input');
        if (!input) return;
        const rect = input.getBoundingClientRect();
        box.style.top = (rect.bottom + 6) + 'px';
        box.style.left = rect.left + 'px';
        box.style.width = rect.width + 'px';

        const results = await window.api.globalSearch(q);
        if (!results.length) {
            box.innerHTML = '<div style="padding:16px;color:#94a3b8;font-size:13px;font-weight:700;">No results found.</div>';
        } else {
            box.innerHTML = results.map(r => `
                <div onclick="window.location.href='${r.type === 'student' ? 'students.html' : 'teachers.html'}'"
                     style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;transition:background 0.15s;"
                     onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <div style="width:36px;height:36px;border-radius:10px;background:rgba(30,41,59,0.08);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#1e293b;flex-shrink:0;overflow:hidden;">
                        ${r.picture ? `<img src="http://app.sms/pictures/${r.picture.replace('pictures/', '')}" style="width:100%;height:100%;object-fit:cover;">` : r.name.charAt(0)}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <p style="font-size:13px;font-weight:700;color:#334155;margin:0;">${r.name}</p>
                        <p style="font-size:11px;color:#94a3b8;margin:0;">${r.type === 'student' ? 'Roll #' + r.roll_no : (r.roll_no || 'Teacher')}</p>
                    </div>
                    <span style="font-size:9px;padding:3px 8px;border-radius:6px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;${r.type === 'student' ? 'background:#eff6ff;color:#2563eb;' : 'background:#fff1f2;color:#e11d48;'}">
                        ${r.type}
                    </span>
                </div>
            `).join('');
        }
        box.style.display = 'block';
    }, 300);
}

document.addEventListener('click', (e) => {
    const box = document.getElementById('search-results');
    if (box && !e.target.closest('#search-results') && !e.target.closest('#global-search-input')) {
        box.style.display = 'none';
    }
});

// Global function to get a professional print header
window.getPrintHeader = async () => {
    try {
        const settings = await window.api.getSettings();
        
        // CENTRALIZED DYNAMIC PRINT HEADER THEMING
        const brandThemes = {
            'default': { primary: '#1e293b', secondary: '#64748b', border: '#1e293b' },
            'beacon_hall': { primary: '#0c5a85', secondary: '#55667a', border: '#c5a059' }
        };
        const activePattern = settings.dmc_pattern || 'default';
        const theme = brandThemes[activePattern] || brandThemes['default'];

        const logoHtml = settings.school_logo 
            ? `
            <div style="position:absolute;left:0;top:50%;transform:translateY(-50%);width:75px;height:75px;border-radius:12px;border:2px solid ${theme.border};background:white;padding:4px;box-shadow:0 4px 10px rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;overflow:hidden;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">
                <img src="http://app.sms/pictures/${settings.school_logo}" style="max-height:100%;max-width:100%;object-fit:contain;">
            </div>
            ` 
            : '';

        // DYNAMIC TWO-LINE SPLITTING ALGORITHM
        let schoolNameHtml = settings.school_name || 'SMS CONNECT';
        const nameParts = schoolNameHtml.split(' ');
        if (nameParts.length > 2) {
            const mid = Math.ceil(nameParts.length / 2);
            const line1 = nameParts.slice(0, mid).join(' ');
            const line2 = nameParts.slice(mid).join(' ');
            schoolNameHtml = `${line1}<br>${line2}`;
        }
            
        return `
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;border-bottom:3px solid ${theme.border};padding-bottom:15px;margin-bottom:20px;font-family:'Outfit',sans-serif;width:100%;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;min-height:85px;text-align:center;">
                ${logoHtml}
                <div style="text-align:center;width:100%;max-width:550px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    <h1 style="margin:0;font-size:22px;font-weight:900;text-transform:uppercase;color:${theme.primary};letter-spacing:0.5px;line-height:1.2;text-align:center;">${schoolNameHtml}</h1>
                    <p style="margin:4px 0 0 0;font-size:10px;font-weight:700;color:${theme.secondary};letter-spacing:0.5px;text-transform:uppercase;text-align:center;">
                        <i class="fa-solid fa-location-dot" style="margin-right:5px;color:${theme.border};-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;"></i>${settings.school_address || 'Update School Address in Settings'}
                    </p>
                    <div style="display:flex;justify-content:center;gap:20px;margin-top:6px;font-size:9px;font-weight:800;color:${theme.secondary}b0;text-align:center;width:100%;">
                        <span><i class="fa-solid fa-phone" style="margin-right:5px;color:${theme.border};-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;"></i>${settings.school_contact || 'Update Contact'}</span>
                        <span><i class="fa-solid fa-envelope" style="margin-right:5px;color:${theme.border};-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;"></i>${settings.school_email || 'Update Email'}</span>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        return '<div style="text-align:center;padding:20px;border-bottom:2px solid #eee;"><h1>SCHOOL MANAGEMENT SYSTEM</h1></div>';
    }
};

// Auto-load school name into sidebar
document.addEventListener('DOMContentLoaded', async () => {
    // Robust Sidebar Scroll Persistence & Active centering
    const nav = document.getElementById('sidebar-nav');
    if (nav) {
        let attempts = 0;
        const forceScroll = () => {
            const saved = localStorage.getItem('sidebar_scroll');
            const active = nav.querySelector('.active-nav-item');
            if (saved && parseInt(saved, 10) > 0) {
                nav.scrollTop = parseInt(saved, 10);
            } else if (active) {
                nav.scrollTop = active.offsetTop - nav.offsetTop - 100;
            }
            attempts++;
            if (attempts < 10) setTimeout(forceScroll, 50);
        };
        forceScroll();

        nav.addEventListener('scroll', () => {
            if (nav.scrollTop >= 0) {
                localStorage.setItem('sidebar_scroll', nav.scrollTop);
            }
        });
    }

    try {
        const settings = await window.api.getSettings();
        if (settings) {
            // Update Logo in Sidebar
            if (settings.school_logo) {
                const container = document.getElementById('sidebar-logo-container');
                if (container) {
                    container.innerHTML = `<img src="http://app.sms/pictures/${settings.school_logo}" style="width:100%;height:100%;object-fit:cover;">`;
                }
            }

            // Update Avatar in Topbar
            if (settings.school_logo) {
                const avatar = document.getElementById('topbar-avatar-container');
                if (avatar) {
                    avatar.innerHTML = `<img src="http://app.sms/pictures/${settings.school_logo}" style="width:100%;height:100%;object-fit:cover;">`;
                }
            }

            if (settings.school_name) {
                const logoText = document.getElementById('sidebar-logo-text');
                if (logoText) {
                    const words = settings.school_name.split(' ');
                    if (words.length > 1) {
                        const firstPart = words.slice(0, -1).join(' ');
                        const lastPart = words[words.length - 1];
                        logoText.innerHTML = `${firstPart} <span style="color:#fb7185;text-decoration:underline">${lastPart}</span>`;
                    } else {
                        logoText.textContent = settings.school_name;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Failed to load school name:', e);
    }
});
