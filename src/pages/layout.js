// Shared layout logic
function getUser() {
    try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; }
}

function requireAuth() {
    if (!getUser()) { window.location.href = 'gateway.html'; }
}

function logout() {
    sessionStorage.removeItem('user');
    window.location.href = 'gateway.html';
}

function setActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach(a => {
        a.classList.remove('bg-white', 'text-prime', 'shadow-lg');
        a.classList.add('text-white', 'hover:bg-white/10');
        a.querySelector('i')?.classList.remove('text-prime');
        a.querySelector('i')?.classList.add('text-white/60');
    });
    const active = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (active) {
        active.classList.add('bg-white', 'text-prime', 'shadow-lg');
        active.classList.remove('text-white', 'hover:bg-white/10');
        active.querySelector('i')?.classList.add('text-prime');
        active.querySelector('i')?.classList.remove('text-white/60');
    }
}

function showToast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = `toast ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`;
    t.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'} mr-2"></i>${msg}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function formatNum(n) { return new Intl.NumberFormat().format(Number(n) || 0); }
function formatCurrency(n) { return 'Rs. ' + formatNum(n); }
function formatDate(d) { if (!d) return '—'; return new Date(d.toString().replace(' ', 'T')).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatDateTime(d) { if (!d) return '—'; return new Date(d.toString().replace(' ', 'T')).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); }

function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

function buildSidebar(activePage) {
    const groups = [
        {
            label: 'General',
            items: [
                { page: 'dashboard', icon: 'fa-grip-vertical', label: 'Dashboard', href: 'dashboard.html' }
            ]
        },
        {
            label: 'Academic',
            items: [
                { page: 'students', icon: 'fa-user-graduate', label: 'Students', href: 'students.html' },
                { page: 'teachers', icon: 'fa-chalkboard-user', label: 'Teachers', href: 'teachers.html' },
                { page: 'attendance', icon: 'fa-calendar-check', label: 'Attendance', href: 'attendance.html' },
                { page: 'exams', icon: 'fa-graduation-cap', label: 'Exams & DMC', href: 'exams.html' },
                { page: 'diary', icon: 'fa-book-open', label: 'Daily Diary', href: 'diary.html' }
            ]
        },
        {
            label: 'Finance',
            items: [
                { page: 'fees', icon: 'fa-wallet', label: 'Fees', href: 'fees.html' },
                { page: 'fee-structure', icon: 'fa-file-invoice-dollar', label: 'Fee Structure', href: 'fee_structure.html' },
                { page: 'expenses', icon: 'fa-receipt', label: 'Expenses', href: 'expenses.html' },
                { page: 'bank', icon: 'fa-building-columns', label: 'Bank', href: 'bank.html' }
            ]
        },
        {
            label: 'Shop & Stock',
            items: [
                { page: 'inventory', icon: 'fa-boxes-stacked', label: 'Inventory', href: 'inventory.html' },
                { page: 'pos', icon: 'fa-cash-register', label: 'Point of Sale', href: 'pos.html' }
            ]
        },
        {
            label: 'System',
            items: [
                { page: 'settings', icon: 'fa-gear', label: 'Settings', href: 'settings.html' }
            ]
        }
    ];

    return `
    <aside class="w-24 hover:w-72 bg-prime text-white flex flex-col h-screen shadow-2xl relative z-20 transition-all duration-300 ease-in-out group/sidebar flex-shrink-0">
        <div class="min-h-[6rem] py-4 flex items-center px-7 overflow-hidden">
            <div class="flex items-center gap-4">
                <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <i class="fa-solid fa-graduation-cap text-white text-xl"></i>
                </div>
                <h1 id="sidebar-logo-text" class="text-lg font-black tracking-widest uppercase text-white/90 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 leading-tight py-2">
                    SMS <span style="color:#fb7185;text-decoration:underline">Connect</span>
                </h1>
            </div>
        </div>
        <nav class="flex-1 px-4 py-4 space-y-6 overflow-y-scroll sidebar-scroll overflow-x-hidden">
            ${groups.map(group => `
                <div class="space-y-2">
                    <p class="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-4 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">${group.label}</p>
                    ${group.items.map(item => `
                    <a href="${item.href}" class="nav-item ${activePage === item.page ? 'bg-white text-prime shadow-lg' : 'text-white hover:bg-white/10'} flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group" data-page="${item.page}">
                        <i class="fa-solid ${item.icon} flex-shrink-0 w-6 text-center text-lg ${activePage === item.page ? 'text-prime' : 'text-white/60 group-hover:text-white'}"></i>
                        <span class="font-extrabold text-[15px] opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">${item.label}</span>
                    </a>`).join('')}
                </div>
            `).join('')}
        </nav>
        <div class="px-4 py-4 border-t border-white/5">
            <div onclick="logout()" class="flex items-center gap-4 px-4 py-3 text-white hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-all duration-300 group cursor-pointer">
                <i class="fa-solid fa-arrow-right-from-bracket flex-shrink-0 w-6 text-center text-lg text-white/50 group-hover:text-rose-400"></i>
                <span class="font-extrabold text-[14px] opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">Logout</span>
            </div>
        </div>
    </aside>`;
}

function buildTopbar(title) {
    const user = getUser();

    // Create the floating search dropdown directly on body (must happen after innerHTML is set)
    setTimeout(() => {
        if (!document.getElementById('search-results')) {
            const box = document.createElement('div');
            box.id = 'search-results';
            box.style.cssText = 'position:fixed;background:white;border-radius:16px;box-shadow:0 25px 60px rgba(0,0,0,0.25);border:1px solid #f1f5f9;overflow:hidden;z-index:2147483647;display:none;min-width:320px;';
            document.body.appendChild(box);
        }
    }, 0);

    return `
    <header class="h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 w-full flex-shrink-0">
        <div class="flex items-center gap-8">
            <h2 class="text-2xl font-black text-slate-800">${title}</h2>
            <div class="relative w-80">
                <div class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <i class="fa-solid fa-search text-slate-300"></i>
                </div>
                <input type="text" id="global-search-input" onkeyup="handleGlobalSearch(this.value)" class="bg-slate-50 text-slate-600 text-sm rounded-xl block w-full pl-11 p-3.5 outline-none font-bold placeholder:font-medium border border-transparent focus:border-slate-200" placeholder="Search students, teachers...">
            </div>
        </div>
        <div class="flex items-center gap-6">
            <div class="flex items-center gap-3 cursor-pointer group">
                <div class="text-right hidden sm:block">
                    <p class="text-sm font-bold text-slate-700 leading-tight">${user?.name || 'Admin'}</p>
                    <p class="text-[11px] text-slate-400 font-medium">Administrator</p>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-prime overflow-hidden shadow-lg group-hover:scale-105 transition-transform flex items-center justify-center text-white font-black text-lg">
                    ${(user?.name || 'A').charAt(0).toUpperCase()}
                </div>
            </div>
        </div>
    </header>`;
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
                    <div style="width:36px;height:36px;border-radius:10px;background:rgba(30,41,59,0.08);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#1e293b;flex-shrink:0;">
                        ${r.name.charAt(0)}
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
