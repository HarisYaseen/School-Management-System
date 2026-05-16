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

    const path = window.location.pathname.toLowerCase();
    
    // HARD BLOCK FOR STAFF
    if (role !== 'admin') {
        const restrictedKeywords = ['fees', 'bank', 'inventory', 'pos', 'expenses', 'staff', 'users', 'reports', 'settings'];
        const isRestricted = restrictedKeywords.some(kw => path.includes(kw));
        
        // If they only have 'academic' permission, they can ONLY see dashboard, reminders, and academic pages.
        if (isRestricted && !perms.includes('hr') && !perms.includes('finance') && !perms.includes('pos')) {
            console.error('NUCLEAR BLOCK: Unauthorized Access Attempt to', path);
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
    <aside class="w-24 hover:w-72 bg-prime text-white flex flex-col h-screen shadow-2xl relative z-20 transition-all duration-300 group/sidebar">
        <div class="p-6 flex items-center gap-4 flex-shrink-0">
             <div class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><i class="fa-solid fa-graduation-cap text-lg"></i></div>
             <span id="sidebar-logo-text" class="font-black text-lg opacity-0 invisible group-hover/sidebar:opacity-100 group-hover/sidebar:visible transition-all duration-300 whitespace-normal break-words max-w-[180px] uppercase tracking-tighter">SMS CONNECT</span>
        </div>
        <nav class="flex-1 px-4 space-y-6 overflow-y-auto pt-4 scrollbar-hide group-hover/sidebar:scrollbar-default">
            ${filtered.map(g => `
                <div class="space-y-1">
                    <p class="text-[9px] font-black text-white/20 uppercase px-4 opacity-0 group-hover/sidebar:opacity-100 mb-2 tracking-widest">${g.label}</p>
                    ${g.items.map(item => `
                        <a href="${item.href}" class="flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activePage === item.page ? 'bg-white text-prime shadow-lg' : 'text-white/60 hover:bg-white/5'}">
                            <i class="fa-solid ${item.icon} w-6 text-center text-sm"></i>
                            <span class="text-sm font-bold opacity-0 group-hover/sidebar:opacity-100 transition-opacity whitespace-nowrap">${item.label}</span>
                        </a>
                    `).join('')}
                </div>
            `).join('')}
        </nav>
        <style>
            .scrollbar-hide::-webkit-scrollbar { display: none; }
            .group-hover\\/sidebar\\:scrollbar-default:hover::-webkit-scrollbar { 
                display: block; 
                width: 4px;
            }
            .group-hover\\/sidebar\\:scrollbar-default:hover::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
            }
        </style>
        <div class="p-4 border-t border-white/5">
            <div onclick="logout()" class="flex items-center gap-4 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl cursor-pointer">
                <i class="fa-solid fa-power-off w-6 text-center"></i>
                <span class="text-sm font-bold opacity-0 group-hover/sidebar:opacity-100 transition-opacity">Logout</span>
            </div>
        </div>
    </aside>`;
}

function buildTopbar(title) {
    const user = getUser();
    const isAdmin = (user?.role || 'staff').toLowerCase().trim() === 'admin';
    return `
    <header class="h-20 bg-white border-b flex items-center justify-between px-10">
        <h2 class="text-xl font-black text-slate-800 uppercase tracking-tight">${title}</h2>
        <div class="flex items-center gap-4">
            <div class="text-right">
                <p class="text-sm font-black text-slate-800">${user?.name || 'User'}</p>
                <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
                    ${isAdmin ? 'Administrator' : 'Staff / Teacher'}
                </span>
            </div>
            <div class="w-10 h-10 rounded-xl bg-prime text-white flex items-center justify-center font-black">
                ${(user?.name || 'U').charAt(0)}
            </div>
        </div>
    </header>`;
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
        return `
            <div style="text-align:center;border-bottom:2px solid #1e293b;padding-bottom:15px;margin-bottom:20px;font-family:'Outfit',sans-serif;">
                <h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;color:#1e293b;">${settings.school_name || 'SMS CONNECT'}</h1>
                <p style="margin:5px 0;font-size:12px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;">
                    ${settings.school_address || 'Update School Address in Settings'}
                </p>
                <div style="display:flex;justify-content:center;gap:20px;margin-top:5px;font-size:11px;font-weight:800;color:#94a3b8;">
                    <span><i class="fa-solid fa-phone"></i> ${settings.school_contact || 'Update Contact'}</span>
                    <span><i class="fa-solid fa-envelope"></i> ${settings.school_email || 'Update Email'}</span>
                </div>
            </div>
        `;
    } catch (e) {
        return '<div style="text-align:center;padding:20px;border-bottom:2px solid #eee;"><h1>SCHOOL MANAGEMENT SYSTEM</h1></div>';
    }
};

// Auto-load school name into sidebar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const settings = await window.api.getSettings();
        if (settings && settings.school_name) {
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
    } catch (e) {
        console.error('Failed to load school name:', e);
    }
});
