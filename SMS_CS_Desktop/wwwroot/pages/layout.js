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

function buildSidebar(activePage) {
    const groups = [
        {
            label: 'General',
            items: [
                { page: 'dashboard', icon: 'fa-grip-vertical', label: 'Dashboard', href: 'dashboard.html' },
                { page: 'reminders', icon: 'fa-bell', label: 'Reminders', href: 'reminders.html' }
            ]
        },
        {
            label: 'Academic',
            items: [
                { page: 'students', icon: 'fa-user-graduate', label: 'Students', href: 'students.html' },
                { page: 'teachers', icon: 'fa-chalkboard-user', label: 'Teachers', href: 'teachers.html' },
                { page: 'attendance', icon: 'fa-calendar-check', label: 'Attendance', href: 'attendance.html' },
                { page: 'exams', icon: 'fa-graduation-cap', label: 'Exams & DMC', href: 'exams.html' },
                { page: 'timetable', icon: 'fa-calendar-days', label: 'Timetable', href: 'timetable.html' },
                { page: 'diary', icon: 'fa-book-open', label: 'Daily Diary', href: 'diary.html' },
                { page: 'certificates', icon: 'fa-certificate', label: 'Certificates', href: 'certificates.html' },
                { page: 'id-cards', icon: 'fa-id-card', label: 'ID Cards', href: 'id_cards.html' }
            ]
        },
        {
            label: 'Finance & Shop',
            items: [
                { page: 'fees', icon: 'fa-wallet', label: 'Fees', href: 'fees.html' },
                { page: 'fee-structure', icon: 'fa-file-invoice-dollar', label: 'Fee Structure', href: 'fee_structure.html' },
                { page: 'transport', icon: 'fa-bus', label: 'Transport', href: 'transport.html' },
                { page: 'expenses', icon: 'fa-receipt', label: 'Expenses', href: 'expenses.html' },
                { page: 'bank', icon: 'fa-building-columns', label: 'Bank', href: 'bank.html' },
                { page: 'inventory', icon: 'fa-boxes-stacked', label: 'Inventory', href: 'inventory.html' },
                { page: 'pos', icon: 'fa-cash-register', label: 'Point of Sale', href: 'pos.html' }
            ]
        },
        {
            label: 'HR & Management',
            items: [
                { page: 'staff', icon: 'fa-user-tie', label: 'Staff HR', href: 'staff.html' },
                { page: 'users', icon: 'fa-user-gear', label: 'User Roles', href: 'users.html' },
                { page: 'sessions', icon: 'fa-calendar-check', label: 'Academic Years', href: 'sessions.html' }
            ]
        },
        {
            label: 'System',
            items: [
                { page: 'reports', icon: 'fa-chart-line', label: 'Reports', href: 'reports.html' },
                { page: 'settings', icon: 'fa-gear', label: 'Settings', href: 'settings.html' }
            ]
        }
    ];

    return `
    <aside class="w-20 hover:w-64 bg-prime text-white flex flex-col h-screen shadow-2xl relative z-20 transition-all duration-300 ease-in-out group flex-shrink-0">
        <div class="min-h-[6rem] py-4 flex items-center px-7 relative">
            <div class="flex items-center gap-4 w-full">
                <div class="flex-shrink-0 w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shadow-lg overflow-hidden" id="sidebar-logo-container">
                    <i class="fa-solid fa-graduation-cap text-white text-xl animate-pulse" id="sidebar-default-logo"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h1 id="sidebar-logo-text" class="text-xs font-black tracking-tighter uppercase text-white/90 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 leading-tight py-2 whitespace-normal break-words overflow-visible" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        SMS <span style="color:#fb7185;text-decoration:underline">Connect</span>
                    </h1>
                </div>
            </div>
        </div>
        <nav class="flex-1 px-4 py-4 space-y-6 overflow-y-scroll sidebar-scroll overflow-x-hidden">
            ${groups.map(group => `
                <div class="space-y-2">
                    <p class="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">${group.label}</p>
                    ${group.items.map(item => `
                    <a href="${item.href}" class="nav-item ${activePage.toLowerCase().trim() === item.page.toLowerCase().trim() ? 'bg-white text-prime shadow-lg active-nav-item' : 'text-white hover:bg-white/10'} flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group" data-page="${item.page}">
                        <i class="fa-solid ${item.icon} flex-shrink-0 w-6 text-center text-lg ${activePage.toLowerCase().trim() === item.page.toLowerCase().trim() ? 'text-prime' : 'text-white/60 group-hover:text-white'}"></i>
                        <span class="font-extrabold text-[15px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">${item.label}</span>
                    </a>`).join('')}
                </div>
            `).join('')}
        </nav>
        <div class="px-4 py-4 border-t border-white/5">
            <div onclick="logout()" class="flex items-center gap-4 px-4 py-3 text-white hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-all duration-300 group cursor-pointer">
                <i class="fa-solid fa-arrow-right-from-bracket flex-shrink-0 w-6 text-center text-lg text-white/50 group-hover:text-rose-400"></i>
                <span class="font-extrabold text-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Logout</span>
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
                    <div class="flex items-center justify-end gap-2">
                        <p class="text-sm font-black text-slate-700 leading-tight">${user?.name || 'Admin'}</p>
                        <span class="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm shadow-orange-500/20">PRO</span>
                    </div>
                    <p class="text-[11px] text-slate-400 font-medium leading-tight">Administrator</p>
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

// Auto-load school name and logo
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
