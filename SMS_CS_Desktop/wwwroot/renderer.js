// Helper function to format numbers
const formatNum = (num) => new Intl.NumberFormat().format(num);

async function initDashboard() {
    try {
        const stats = await window.api.getDashboardStats();
        const revenue = await window.api.getMonthlyRevenue();
        const admissions = await window.api.getRecentAdmissions();

        renderStats(stats);
        renderRevenue(revenue);
        renderAdmissions(admissions);
        
        document.getElementById('pending-fees').innerText = `Rs. ${formatNum(stats.pending_fees)}`;

    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

function renderStats(stats) {
    const container = document.getElementById('stats-container');
    const cards = [
        { title: 'Students', val: stats.total_students, icon: 'fa-graduation-cap', color: 'blue' },
        { title: 'Teachers', val: stats.total_teachers, icon: 'fa-chalkboard-user', color: 'rose' },
        { title: 'Parents', val: stats.total_parents, icon: 'fa-people-roof', color: 'indigo' },
        { title: 'Earnings', val: `Rs. ${(stats.total_collection / 1000).toFixed(1)}k`, icon: 'fa-wallet', color: 'amber' }
    ];

    container.innerHTML = cards.map(card => `
        <div class="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-50 group flex items-center gap-6">
            <div class="w-16 h-16 rounded-2xl bg-${card.color}-50 flex items-center justify-center text-${card.color}-500 group-hover:bg-${card.color}-500 group-hover:text-white transition-all duration-500 shadow-inner">
                <i class="fa-solid ${card.icon} text-2xl"></i>
            </div>
            <div>
                <p class="text-slate-400 font-bold text-sm uppercase tracking-wider">${card.title}</p>
                <p class="text-3xl font-black text-slate-800">${card.val}</p>
            </div>
        </div>
    `).join('');
}

function renderRevenue(revenue) {
    const chart = document.getElementById('revenue-chart');
    const maxVal = Math.max(...Object.values(revenue), 1000);
    
    chart.innerHTML = Object.entries(revenue).map(([month, amount]) => `
        <div class="flex-1 flex flex-col items-center gap-4 group relative h-full justify-end">
            <div class="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] p-2 rounded-lg font-black whitespace-nowrap z-10 pointer-events-none">
                Rs. ${formatNum(amount)}
            </div>
            <div class="w-full flex items-end justify-center gap-1 h-full max-h-[256px]">
                <div class="w-3 bg-prime rounded-t-lg transition-all duration-500 group-hover:bg-indigo-600" style="height: ${(amount / maxVal) * 100}%"></div>
            </div>
            <span class="text-[11px] font-bold text-slate-300">${month}</span>
        </div>
    `).join('');
}

function renderAdmissions(admissions) {
    const container = document.getElementById('recent-admissions');
    
    if (admissions.length === 0) {
        container.innerHTML = `<p class="text-center text-slate-300 font-bold py-10">No recent admissions found.</p>`;
        return;
    }

    container.innerHTML = admissions.map(student => `
        <div class="flex items-center gap-4 group">
            <div class="w-12 h-12 rounded-2xl bg-prime/5 flex items-center justify-center text-prime font-black transition-all group-hover:bg-prime group-hover:text-white">
                ${student.name.charAt(0)}
            </div>
            <div class="flex-1">
                <p class="text-sm font-black text-slate-700 leading-none mb-1">${student.name}</p>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">${student.class_name || 'New Student'}</p>
            </div>
            <div class="text-right">
                <span class="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase">Active</span>
            </div>
        </div>
    `).join('');
}

// Start the app
document.addEventListener('DOMContentLoaded', initDashboard);
