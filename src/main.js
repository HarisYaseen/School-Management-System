const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

// ========================= STUDENT DOCUMENTS (TOP-LEVEL REGISTRATION) =========================
ipcMain.handle('get-student-documents', (e, studentId) => queryAll('SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC', [studentId]));
ipcMain.handle('upload-student-document', async (e, { studentId, title }) => {
    try {
        const { dialog } = require('electron');
        const win = require('electron').BrowserWindow.getFocusedWindow();
        const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Documents', extensions: ['jpg','png','jpeg','pdf','docx'] }] });
        if (result.canceled || result.filePaths.length === 0) return { success: false };
        const sourcePath = result.filePaths[0];
        const extension = require('path').extname(sourcePath);
        const fileName = `doc_${studentId}_${Date.now()}${extension}`;
        const targetDir = require('path').join(app.getPath('userData'), 'student_documents');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(sourcePath, require('path').join(targetDir, fileName));
        db.run('INSERT INTO student_documents (student_id, title, file_name, file_type) VALUES (?,?,?,?)', [studentId, title, fileName, extension]);
        saveDB();
        return { success: true };
    } catch(err) { return { success: false, error: err.message }; }
});
ipcMain.handle('get-document-url', (e, fileName) => {
    const filePath = require('path').join(app.getPath('userData'), 'student_documents', fileName);
    return fs.existsSync(filePath) ? `file://${filePath}` : null;
});
ipcMain.handle('delete-document', (e, id) => {
    const doc = queryOne('SELECT file_name FROM student_documents WHERE id=?', [id]);
    if (doc) {
        const filePath = require('path').join(app.getPath('userData'), 'student_documents', doc.file_name);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return run('DELETE FROM student_documents WHERE id=?', [id]);
});
// ========================= STUDENT BIODATA =========================

ipcMain.handle('open-doc-now', (e, fileName) => {
    const filePath = require('path').join(app.getPath('userData'), 'student_documents', fileName);
    if (fs.existsSync(filePath)) {
        shell.openPath(filePath);
        return { success: true };
    }
    return { success: false, error: 'File not found.' };
});

ipcMain.on('open-url', (e, url) => {
    shell.openExternal(url);
});

let db;

// Strict Mode: Professional Logging
function logInfo(msg) { console.log(`[INFO] ${new Date().toLocaleTimeString()}: ${msg}`); }
function logError(msg, err) {
    const errorMsg = `[ERROR] ${new Date().toLocaleString()}: ${msg} ${err ? (err.message || String(err)) : ''}`;
    console.error(errorMsg);
    try {
        const logPath = path.join(app.getPath('userData'), 'error_logs.txt');
        fs.appendFileSync(logPath, errorMsg + '\n');
    } catch (e) { }
}

// Strict Mode: Precision Financials
function roundMoney(val) {
    return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

async function connectDB() {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();

    // Move database to user's private AppData folder for privacy and persistence
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'database.sqlite');
    const oldDbPath = path.join(app.getAppPath(), 'database', 'database.sqlite');

    // Migration: If new DB doesn't exist (or has no users) but old one does, copy it over!
    let shouldMigrate = !fs.existsSync(dbPath);
    if (!shouldMigrate) {
        // Even if file exists, check if it's an empty "fresh" system
        try {
            const fileBuffer = fs.readFileSync(dbPath);
            const tempDb = new SQL.Database(fileBuffer);
            const userCount = tempDb.exec("SELECT COUNT(*) as count FROM users")[0].values[0][0];
            if (userCount === 0) shouldMigrate = true;
            tempDb.close();
        } catch (e) { shouldMigrate = true; }
    }

    if (shouldMigrate && fs.existsSync(oldDbPath)) {
        console.log('Migrating existing database to AppData...');
        fs.copyFileSync(oldDbPath, dbPath);
    }

    console.log('Connecting to database at:', dbPath);

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('Database loaded successfully from AppData.');
    } else {
        // Start fresh for new installations
        db = new SQL.Database();
        console.log('Fresh system initialized in AppData.');

        // Create an empty file to reserve the path
        fs.writeFileSync(dbPath, Buffer.from(db.export()));
    }
    ensureTables();
}

function ensureTables() {
    // 1. Initial Tables (Base)
    db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);`);
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT);`);
    db.run(`CREATE TABLE IF NOT EXISTS class_infos (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, uuid TEXT UNIQUE NOT NULL, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, roll_no TEXT UNIQUE NOT NULL, class_id INTEGER, guardian_name TEXT, contact_number TEXT, monthly_fee REAL DEFAULT 0, admission_fee REAL DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')), picture TEXT, gender TEXT DEFAULT 'Male', concession REAL DEFAULT 0);`);
    db.run(`CREATE TABLE IF NOT EXISTS teachers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, subject TEXT, contact TEXT, department TEXT DEFAULT 'General', created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS fees (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, student_id INTEGER NOT NULL, amount REAL NOT NULL, debit REAL DEFAULT 0, credit REAL DEFAULT 0, status TEXT DEFAULT 'unpaid', description TEXT, type TEXT, month TEXT, sale_id INTEGER, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS banks (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, account_name TEXT NOT NULL, account_number TEXT, bank_name TEXT, balance REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS bank_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, bank_id INTEGER NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, description TEXT, date TEXT, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS attendances (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, attendance_date TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now', 'localtime')));`);
    db.run(`CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, name TEXT NOT NULL, total_marks REAL DEFAULT 100, created_at TEXT DEFAULT (datetime('now', 'localtime')));`);
    db.run(`CREATE TABLE IF NOT EXISTS exams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, date TEXT, created_at TEXT DEFAULT (datetime('now', 'localtime')));`);
    db.run(`CREATE TABLE IF NOT EXISTS exam_results (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL, student_id INTEGER NOT NULL, subject_name TEXT NOT NULL, total_marks REAL, obtained_marks REAL, created_at TEXT DEFAULT (datetime('now', 'localtime')));`);
    db.run(`CREATE TABLE IF NOT EXISTS inventories (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, item_name TEXT NOT NULL, type TEXT DEFAULT 'General', qty INTEGER DEFAULT 0, unit_price REAL DEFAULT 0, purchase_price REAL DEFAULT 0, sale_price REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now', 'localtime')));`);
    db.run(`CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, inventory_id INTEGER NOT NULL, student_id INTEGER, qty INTEGER NOT NULL, total_amount REAL NOT NULL, status TEXT DEFAULT 'paid', description TEXT, invoice_no TEXT, purchase_price REAL DEFAULT 0, date TEXT DEFAULT (date('now', 'localtime')), created_at TEXT DEFAULT (datetime('now', 'localtime')));`);
    db.run(`CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL, description TEXT, date TEXT DEFAULT (date('now', 'localtime')), created_at TEXT DEFAULT (datetime('now', 'localtime')));`);

    // --- NEW TABLES FOR EXTENDED FEATURES ---
    db.run(`CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, start_year INTEGER, end_year INTEGER, is_active INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS transport_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, fee REAL DEFAULT 0, description TEXT, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS student_transport (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER UNIQUE NOT NULL, route_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, father_name TEXT, cnic TEXT, dob TEXT, gender TEXT DEFAULT 'Male', contact TEXT, email TEXT, address TEXT, department TEXT, designation TEXT, qualification TEXT, joining_date TEXT, salary REAL DEFAULT 0, status TEXT DEFAULT 'active', picture TEXT, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS timetable (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, day TEXT NOT NULL, period_no INTEGER, subject TEXT, teacher TEXT, start_time TEXT, end_time TEXT, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, reminder_date TEXT, priority TEXT DEFAULT 'medium', is_done INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS student_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, title TEXT NOT NULL, file_name TEXT NOT NULL, file_type TEXT, created_at TEXT DEFAULT (datetime('now')));`);
    db.run(`CREATE TABLE IF NOT EXISTS diary (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, subject TEXT, entry_date TEXT, content TEXT, created_at TEXT DEFAULT (datetime('now')));`);

    // 2. Run Migrations
    const currentVersion = queryOne("SELECT MAX(version) as v FROM schema_migrations")?.v || 0;
    logInfo(`Current DB Version: ${currentVersion}`);

    if (currentVersion < 1) {
        logInfo("Running Migration v1: Data Cleanup...");
        try {
            db.run("UPDATE fees SET credit = amount WHERE status = 'paid' AND (credit = 0 OR credit IS NULL);");
            db.run("UPDATE fees SET debit = amount WHERE status = 'unpaid' AND (debit = 0 OR debit IS NULL);");
            db.run("UPDATE sales SET purchase_price = (SELECT purchase_price FROM inventories WHERE inventories.id = sales.inventory_id) WHERE purchase_price = 0 OR purchase_price IS NULL;");
        } catch (e) { logError("Migration v1 failed", e); }
        db.run("INSERT INTO schema_migrations (version) VALUES (1);");
    }

    if (currentVersion < 3) {
        logInfo("Running Migration v3: Integrity Check...");
        try {
            // These are idempotent column additions for broken v2 states
            try { db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'staff';"); } catch(e){}
            try { db.run("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]';"); } catch(e){}
            try { db.run("ALTER TABLE students ADD COLUMN family_no TEXT;"); } catch(e){}
            try { db.run("ALTER TABLE students ADD COLUMN session_id INTEGER;"); } catch(e){}
            try { db.run("ALTER TABLE students ADD COLUMN blood_group TEXT;"); } catch(e){}
            try { db.run("ALTER TABLE students ADD COLUMN dob TEXT;"); } catch(e){}
            try { db.run("ALTER TABLE students ADD COLUMN religion TEXT DEFAULT 'Islam';"); } catch(e){}
            try { db.run("ALTER TABLE students ADD COLUMN address TEXT;"); } catch(e){}
            try { db.run("ALTER TABLE sessions ADD COLUMN uuid TEXT;"); } catch(e){}
            try { db.run("ALTER TABLE sessions ADD COLUMN start_year INTEGER;"); } catch(e){}
            try { db.run("ALTER TABLE sessions ADD COLUMN end_year INTEGER;"); } catch(e){}
            try { db.run("ALTER TABLE sessions ADD COLUMN is_active INTEGER DEFAULT 0;"); } catch(e){}
        } catch (e) { logError("Migration v3 failed", e); }
        db.run("INSERT INTO schema_migrations (version) VALUES (3);");
    }

    if (currentVersion < 4) {
        logInfo("Running Migration v4: Session Structural Repair...");
        try {
            // Recreate table properly
            db.run("DROP TABLE IF EXISTS sessions;");
            db.run(`CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, start_year INTEGER, end_year INTEGER, is_active INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);
            db.run("INSERT INTO sessions (uuid, name, start_year, end_year, is_active) VALUES (?,?,?,?,?)", 
                [require('crypto').randomUUID(), 'Session 2024-25', 2024, 2025, 1]);
            db.run("INSERT INTO schema_migrations (version) VALUES (4);");
        } catch (e) { logError("Migration v4 failed", e); }
    }

    if (currentVersion < 5) {
        logInfo("Running Migration v5: Session Auto-Increment Fix...");
        try {
            // Force recreation again to be absolutely sure
            db.run("DROP TABLE IF EXISTS sessions;");
            db.run(`CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, start_year INTEGER, end_year INTEGER, is_active INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);
            db.run("INSERT INTO sessions (id, uuid, name, start_year, end_year, is_active) VALUES (NULL, ?,?,?,?,?)", 
                [require('crypto').randomUUID(), 'Session 2024-25', 2024, 2025, 1]);
            db.run("INSERT INTO schema_migrations (version) VALUES (5);");
        } catch (e) { logError("Migration v5 failed", e); }
    }

    // 3. Post-Migration Logic
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    // Auto-seed classes
    if ((queryOne("SELECT COUNT(*) as count FROM class_infos")?.count || 0) === 0) {
        logInfo('Seeding standard classes...');
        ['Nursery', 'Prep', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10']
            .forEach(name => run('INSERT INTO class_infos (uuid, name) VALUES (?, ?)', ['cls_' + Math.random().toString(36).substr(2, 9), name]));
    }

    // Monthly Recurring Fee Generation (Refactored for Stability)
    const lastGen = queryOne('SELECT value FROM settings WHERE key = ?', ['last_fee_generation_month'])?.value;
    if (lastGen !== currentMonth) {
        logInfo(`Strict Check: Generating monthly fees for ${currentMonth}`);
        const activeStudents = queryAll('SELECT * FROM students WHERE status = "active"');
        activeStudents.forEach(s => {
            const monthlyFee = Number(s.monthly_fee) || 0;
            if (monthlyFee > 0) {
                const exists = queryOne('SELECT id FROM fees WHERE student_id = ? AND month = ? AND type = "tuition"', [s.id, currentMonth]);
                if (!exists) {
                    const concession = Number(s.concession) || 0;
                    const amount = roundMoney(Math.max(0, monthlyFee - concession));
                    const uid = 'fee_m_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                    run('INSERT INTO fees (uuid, student_id, amount, debit, credit, status, description, type, month, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"))',
                        [uid, s.id, amount, amount, 0, 'unpaid', `Monthly Fee - ${currentMonth}${concession > 0 ? ' (After Concession)' : ''}`, 'tuition', currentMonth]);
                }
            }
        });
        run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['last_fee_generation_month', currentMonth]);
    }
    saveDB();
}

// ========================= SEARCH =========================
ipcMain.handle('global-search', (e, q) => {
    const like = `%${q}%`;
    const students = queryAll('SELECT id, name, roll_no, "student" as type FROM students WHERE name LIKE ? OR roll_no LIKE ? LIMIT 5', [like, like]);
    let teachers = [];
    try {
        teachers = queryAll('SELECT id, name, subject as roll_no, "teacher" as type FROM teachers WHERE name LIKE ? LIMIT 5', [like]);
    } catch (e) {
        console.error('Teacher search failed:', e);
        // Try fallback if subject missing
        try {
            teachers = queryAll('SELECT id, name, "" as roll_no, "teacher" as type FROM teachers WHERE name LIKE ? LIMIT 5', [like]);
        } catch (e2) { }
    }
    return [...students, ...teachers];
});

function saveDB() {
    if (!db) return;
    const dbPath = path.join(app.getPath('userData'), 'database.sqlite');
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
}

function queryOne(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) { const row = stmt.getAsObject(); stmt.free(); return row; }
        stmt.free(); return null;
    } catch (e) { console.error('queryOne error:', e.message, sql); return null; }
}

function queryAll(sql, params = []) {
    try {
        const results = [];
        const stmt = db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) results.push(stmt.getAsObject());
        stmt.free(); return results;
    } catch (e) { console.error('queryAll error:', e.message, sql); return []; }
}

function run(sql, params = []) {
    try {
        db.run(sql, params);
        const res = db.exec("SELECT last_insert_rowid() as id");
        const lastId = res[0].values[0][0];
        saveDB();
        return { success: true, id: lastId };
    }
    catch (e) {
        const msg = e.message || String(e);
        console.error('SQL run error:', msg, 'SQL:', sql);
        return { success: false, error: msg };
    }
}

let waWin = null;
ipcMain.on('open-whatsapp', (e, url) => {
    if (waWin && !waWin.isDestroyed()) {
        waWin.loadURL(url);
        waWin.focus();
    } else {
        waWin = new BrowserWindow({
            width: 1000, height: 800,
            title: 'WhatsApp Sender',
            autoHideMenuBar: true
        });
        waWin.loadURL(url);
    }
});

function createWindow() {
    const win = new BrowserWindow({
        width: 1400, height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, nodeIntegration: false
        },
        titleBarStyle: 'default',
        title: 'SMS Connect'
    });
    win.loadFile(path.join(__dirname, 'pages', 'gateway.html'));
    // win.webContents.openDevTools();
}

app.whenReady().then(async () => {
    await connectDB();
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { saveDB(); if (process.platform !== 'darwin') app.quit(); });

// ========================= AUTH =========================
ipcMain.handle('check-setup', () => {
    const user = queryOne('SELECT id FROM users LIMIT 1');
    return { isSetup: !!user };
});

ipcMain.handle('register', (e, { schoolName, schoolId, masterKey }) => {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(masterKey).digest('hex');

    // Check if ID already exists
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [schoolId]);
    if (existing) return { success: false, error: 'School ID already in use.' };

    const r = run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', ['Admin', schoolId, hash]);
    if (r.success) {
        run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['school_name', schoolName]);
        return { success: true };
    }
    return { success: false, error: r.error || 'Failed to initialize system.' };
});

ipcMain.handle('login', (e, { schoolId, masterKey }) => {
    const bcrypt = require('crypto');
    const hash = bcrypt.createHash('sha256').update(masterKey).digest('hex');
    const user = queryOne('SELECT id, name, email, password FROM users WHERE email = ?', [schoolId]);
    if (user && user.password === hash) {
        delete user.password;
        return { success: true, user };
    }
    return { success: false, error: 'Invalid School ID or Security Key.' };
});

ipcMain.handle('create-backup', async () => {
    try {
        const { dialog } = require('electron');
        const win = BrowserWindow.getFocusedWindow();

        // Audit Fix: Use Desktop as default path for universal compatibility
        const defaultPath = path.join(app.getPath('desktop'), `SMS_Backup_${new Date().toISOString().split('T')[0]}.sqlite`);

        const result = await dialog.showSaveDialog(win, {
            title: 'Export Database Backup',
            defaultPath: defaultPath,
            filters: [{ name: 'SQLite Database', extensions: ['sqlite'] }]
        });

        if (result.canceled || !result.filePath) return { success: false, error: 'Backup canceled.' };

        saveDB(); // Ensure memory is synced to file first
        const sourcePath = path.join(app.getPath('userData'), 'database.sqlite');
        fs.copyFileSync(sourcePath, result.filePath);

        logInfo(`Backup created successfully at: ${result.filePath}`);
        return { success: true, path: result.filePath };
    } catch (err) {
        logError('Backup failed', err);
        return { success: false, error: err.message };
    }
});

// Auto-Updater Professional Handling
const { autoUpdater } = require('electron-updater');
/*
autoUpdater.on('update-available', () => {
    logInfo('Update available. Starting download...');
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', 'Downloading update...'));
});

autoUpdater.on('download-progress', (progress) => {
    const msg = `Downloading: ${Math.round(progress.percent)}%`;
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-status', msg));
});

autoUpdater.on('update-downloaded', () => {
    logInfo('Update downloaded. Ready to install.');
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('update-ready'));
});

ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});
*/

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('check-updates', async () => {
    return { success: true, message: 'Update check is currently disabled.' };
    /*
    try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.autoDownload = true;
        const result = await autoUpdater.checkForUpdatesAndNotify();

        if (result && result.updateInfo && result.updateInfo.version !== app.getVersion()) {
            return { success: true, message: `New version (${result.updateInfo.version}) found! Downloading in background...` };
        }
        return { success: true, message: 'You are already on the latest version.' };
    } catch (err) {
        logError('Update check failed', err);
        return { success: false, message: 'Could not check for updates. ' + (err.message || '') };
    }
    */
});

ipcMain.handle('upload-student-picture', async () => {
    try {
        const { dialog } = require('electron');
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
        });

        if (result.canceled || result.filePaths.length === 0) return null;

        const sourcePath = result.filePaths[0];
        const extension = path.extname(sourcePath);
        const fileName = `student_${Date.now()}${extension}`;
        const targetDir = path.join(app.getPath('userData'), 'student_pictures');

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const targetPath = path.join(targetDir, fileName);
        fs.copyFileSync(sourcePath, targetPath);

        console.log('Successfully uploaded student picture:', fileName);
        return fileName;
    } catch (err) {
        console.error('CRITICAL: upload-student-picture failed:', err);
        return { error: err.message };
    }
});

ipcMain.handle('get-student-picture-url', (e, fileName) => {
    try {
        if (!fileName) return null;
        const filePath = path.join(app.getPath('userData'), 'student_pictures', fileName);
        if (!fs.existsSync(filePath)) {
            console.warn('Picture file not found:', filePath);
            return null;
        }
        return `file://${filePath}`;
    } catch (err) {
        console.error('get-student-picture-url error:', err);
        return null;
    }
});

ipcMain.handle('get-dashboard-stats', () => {
    try {
        const studentCount = queryOne('SELECT COUNT(*) as c FROM students')?.c || 0;
        const teacherCount = queryOne('SELECT COUNT(*) as c FROM teachers')?.c || 0;

        // Accurate Financials (Synced with Bank)
        const admission = roundMoney(queryOne("SELECT SUM(credit) as s FROM fees WHERE (type LIKE '%admission%' OR description LIKE '%Admission%')")?.s || 0);
        const tuition = roundMoney(queryOne("SELECT SUM(credit) as s FROM fees WHERE sale_id IS NULL AND type NOT IN ('inventory', 'pos', 'POS') AND NOT (type LIKE '%admission%' OR description LIKE '%Admission%')")?.s || 0);
        const posSales = roundMoney(queryOne("SELECT SUM(total_amount) as s FROM sales WHERE status = 'paid'")?.s || 0);
        const costOfSoldItems = roundMoney(queryOne("SELECT SUM(qty * purchase_price) as s FROM sales WHERE status = 'paid'")?.s || 0);
        const expenses = roundMoney(queryOne("SELECT SUM(amount) as s FROM expenses")?.s || 0);

        // Gross Collection = Fees Collected + POS Sales
        const totalCollection = roundMoney(tuition + admission + posSales);

        // Net Profit = (Fees Collected + POS Sales) - Expenses - Cost of Goods Sold
        const netProfit = roundMoney(totalCollection - expenses - costOfSoldItems);

        const outstanding = roundMoney(queryOne("SELECT SUM(balance) as s FROM (SELECT SUM(f.debit - f.credit) as balance FROM fees f JOIN students s ON f.student_id = s.id GROUP BY s.id) WHERE balance > 0")?.s || 0);

        const parentCount = queryOne('SELECT COUNT(*) as c FROM students WHERE guardian_name IS NOT NULL AND guardian_name != ""')?.c || 0;

        return {
            total_students: studentCount,
            total_teachers: teacherCount,
            total_parents: parentCount,
            total_collection: totalCollection,
            net_profit: netProfit,
            pending_fees: outstanding
        };
    } catch (e) {
        logError('Dashboard stats failed', e);
        return { total_students: 0, total_teachers: 0, total_parents: 0, total_collection: 0, pending_fees: 0 };
    }
});

ipcMain.handle('get-monthly-revenue', () => {
    const year = new Date().getFullYear().toString();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenue = {};
    months.forEach((m, i) => {
        const mm = (i + 1).toString().padStart(2, '0');
        const pos = Number(queryOne("SELECT SUM(total_amount) as s FROM sales WHERE strftime('%Y',date)=? AND strftime('%m',date)=? AND status='paid'", [year, mm])?.s) || 0;
        const fee = Number(queryOne("SELECT SUM(amount) as s FROM fees WHERE strftime('%Y',created_at)=? AND strftime('%m',created_at)=? AND status='paid'", [year, mm])?.s) || 0;
        revenue[m] = pos + fee;
    });
    return revenue;
});

ipcMain.handle('get-recent-admissions', () => {
    return queryAll('SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id ORDER BY s.created_at DESC LIMIT 3');
});

// ========================= STUDENTS =========================
ipcMain.handle('get-students', () => queryAll('SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id ORDER BY s.created_at DESC'));
ipcMain.handle('get-student', (e, id) => queryOne('SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.id = ?', [id]));
ipcMain.handle('create-student', (e, d) => {
    try {
        const uuid = Date.now().toString(36) + Math.random().toString(36).substr(2);
        const rollNo = String(d.roll_no).trim();

        // Check for existing roll number
        const existing = queryOne('SELECT id FROM students WHERE roll_no = ?', [rollNo]);
        if (existing) throw new Error(`Roll Number ${rollNo} already exists!`);

        // Use the 'run' helper for persistence
        const sRes = run('INSERT INTO students (uuid, name, roll_no, class_id, guardian_name, contact_number, monthly_fee, admission_fee, picture, gender, concession) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [uuid, d.name, rollNo, d.class_id, d.guardian_name, d.contact_number, roundMoney(d.monthly_fee || 0), roundMoney(d.admission_fee || 0), d.picture || null, d.gender || 'Male', roundMoney(d.concession || 0)]);

        if (!sRes.success) throw new Error(sRes.error);
        const studentId = sRes.id;

        const adm = roundMoney(d.admission_fee || 0);
        const tut = roundMoney(d.monthly_fee || 0);
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        if (adm > 0) {
            const uid = 'fee_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            run('INSERT INTO fees (uuid, student_id, amount, debit, credit, status, description, type, month, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"))', 
                [uid, studentId, adm, adm, 0, 'unpaid', 'Admission Fee', 'admission', currentMonth]);
        }
        if (tut > 0) {
            const concession = roundMoney(d.concession || 0);
            const netTut = roundMoney(Math.max(0, tut - concession));
            const uid = 'fee_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            run('INSERT INTO fees (uuid, student_id, amount, debit, credit, status, description, type, month, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now", "localtime"))', 
                [uid, studentId, netTut, netTut, 0, 'unpaid', `Monthly Tuition Fee${concession > 0 ? ' (After Concession)' : ''}`, 'tuition', currentMonth]);
        }

        saveDB();
        return { success: true };
    } catch (err) {
        logError('create-student failed', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('reset-database', () => {
    try {
        db.run('BEGIN TRANSACTION');
        db.run('DELETE FROM students');
        db.run('DELETE FROM teachers');
        db.run('DELETE FROM fees');
        db.run('DELETE FROM attendances');
        db.run('DELETE FROM sales');
        db.run('DELETE FROM expenses');
        db.run('DELETE FROM bank_transactions');
        db.run("UPDATE banks SET balance = 0");
        // Audit Fix: Clear fee generation state to allow re-generation after reset
        db.run("DELETE FROM settings WHERE key = 'last_fee_generation_month'");
        db.run('COMMIT');
        saveDB();
        return { success: true };
    } catch (err) {
        db.run('ROLLBACK');
        logError('Database reset failed', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('update-student', (e, d) => {
    try {
        db.run('BEGIN TRANSACTION');

        // Audit Fix: If monthly_fee changed, update the current month's unpaid fee record if it exists
        const oldStudent = queryOne('SELECT monthly_fee FROM students WHERE id=?', [d.id]);
        const newFee = roundMoney(d.monthly_fee || 0);

        if (oldStudent && roundMoney(oldStudent.monthly_fee) !== newFee) {
            const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            // Update only unpaid tuition fees for the current month
            db.run("UPDATE fees SET amount=?, debit=? WHERE student_id=? AND month=? AND status='unpaid' AND type='tuition'",
                [newFee, newFee, d.id, currentMonth]);
        }

        db.run('UPDATE students SET name=?, roll_no=?, class_id=?, guardian_name=?, contact_number=?, monthly_fee=?, admission_fee=?, status=?, picture=?, gender=?, concession=? WHERE id=?',
            [d.name, d.roll_no, d.class_id, d.guardian_name, d.contact_number, newFee, roundMoney(d.admission_fee || 0), d.status || 'active', d.picture || null, d.gender || 'Male', roundMoney(d.concession || 0), d.id]);

        db.run('COMMIT');
        saveDB();
        return { success: true };
    } catch (err) {
        db.run('ROLLBACK');
        logError('update-student failed', err);
        return { success: false, error: err.message };
    }
});
ipcMain.handle('delete-student', (e, id) => {
    logInfo(`Soft deleting student ID: ${id}`);
    return run("UPDATE students SET status='deleted' WHERE id=?", [id]);
});
ipcMain.handle('promote-students', (e, { studentIds, targetClassId, newFee }) => {
    try {
        db.run('BEGIN TRANSACTION');
        for (const id of studentIds) {
            if (newFee !== undefined && newFee !== null && newFee !== '') {
                db.run('UPDATE students SET class_id = ?, monthly_fee = ? WHERE id = ?', [targetClassId, newFee, id]);
            } else {
                db.run('UPDATE students SET class_id = ? WHERE id = ?', [targetClassId, id]);
            }
        }
        db.run('COMMIT');
        saveDB();
        return { success: true };
    } catch (err) {
        db.run('ROLLBACK');
        return { success: false, error: err.message };
    }
});

// ========================= TEACHERS =========================
ipcMain.handle('get-teachers', () => queryAll('SELECT * FROM teachers ORDER BY created_at DESC'));
ipcMain.handle('create-teacher', (e, d) => {
    // Check if department column exists by trying a simple insert, fallback to providing it
    return run('INSERT INTO teachers (name, subject, contact, department) VALUES (?,?,?,?)', [d.name, d.subject, d.contact, 'General']);
});
ipcMain.handle('update-teacher', (e, d) => run('UPDATE teachers SET name=?, subject=?, contact=?, department=? WHERE id=?', [d.name, d.subject, d.contact, d.department || 'General', d.id]));
ipcMain.handle('delete-teacher', (e, id) => run('DELETE FROM teachers WHERE id=?', [id]));

// ========================= CLASSES =========================
ipcMain.handle('get-classes', () => queryAll('SELECT * FROM class_infos ORDER BY name'));
ipcMain.handle('create-class', (e, d) => { const uuid = Date.now().toString(36); return run('INSERT INTO class_infos (name, uuid) VALUES (?,?)', [d.name, uuid]); });
ipcMain.handle('update-class', (e, d) => run('UPDATE class_infos SET name=? WHERE id=?', [d.name, d.id]));
ipcMain.handle('delete-class', (e, id) => {
    // Also delete associated subjects to maintain referential integrity
    run('DELETE FROM subjects WHERE class_id = ?', [id]);
    return run('DELETE FROM class_infos WHERE id=?', [id]);
});

// ========================= FEES =========================
ipcMain.handle('get-fees', () => {
    try {
        return queryAll('SELECT f.*, s.name as student_name, s.roll_no FROM fees f LEFT JOIN students s ON f.student_id = s.id ORDER BY f.created_at DESC');
    } catch (e) {
        console.error('get-fees error:', e.message);
        return [];
    }
});
ipcMain.handle('get-student-ledger', (e, studentId) => queryAll('SELECT * FROM fees WHERE student_id = ? ORDER BY created_at DESC', [studentId]));
ipcMain.handle('collect-fee', (e, d) => {
    const uid = 'fee_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    return run('INSERT INTO fees (uuid, student_id, amount, debit, credit, status, description, type, month, created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime("now", "localtime"))', [uid, d.student_id, d.amount, Number(d.debit) || 0, Number(d.credit) || 0, d.status || 'paid', d.description || 'Fee Payment', d.type || 'tuition', currentMonth]);
});
ipcMain.handle('delete-fee', (e, id) => {
    const fee = queryOne('SELECT * FROM fees WHERE id = ?', [id]);
    if (fee && fee.sale_id) {
        console.log('Synchronizing inventory deletion for fee:', id);
        const sale = queryOne('SELECT * FROM sales WHERE id = ?', [fee.sale_id]);
        if (sale) {
            // Restore stock
            run('UPDATE inventories SET qty = qty + ? WHERE id = ?', [sale.qty, sale.inventory_id]);
            // Delete sale record
            run('DELETE FROM sales WHERE id = ?', [fee.sale_id]);
        }
    }
    return run('DELETE FROM fees WHERE id=?', [id]);
});
ipcMain.handle('update-fee', (e, d) => {
    return run('UPDATE fees SET student_id=?, amount=?, debit=?, credit=?, status=?, description=?, type=?, month=? WHERE id=?',
        [d.student_id, roundMoney(d.amount), roundMoney(d.debit || 0), roundMoney(d.credit || 0), d.status, d.description, d.type, d.month, d.id]);
});

// ========================= INVENTORY =========================
ipcMain.handle('get-inventory-stats', () => {
    try {
        const investment = queryOne('SELECT SUM(qty * purchase_price) as s FROM inventories')?.s || 0;
        const sales = queryOne('SELECT SUM(total_amount) as s FROM sales')?.s || 0;

        // Profit calculation: sum of (sale_total - (sale_qty * historical_purchase_price))
        const profit = queryOne('SELECT SUM(total_amount - (qty * purchase_price)) as p FROM sales')?.p || 0;

        return { investment, sales, profit };
    } catch (e) {
        console.error('get-inventory-stats error:', e.message);
        return { investment: 0, sales: 0, profit: 0 };
    }
});
ipcMain.handle('get-inventory', () => queryAll('SELECT * FROM inventories ORDER BY created_at DESC'));
ipcMain.handle('create-inventory', (e, d) => {
    const itemName = d.item_name || d.name;
    console.log('Attempting to create inventory item:', itemName, d);
    if (!itemName) return { success: false, error: 'Item name is required.' };
    const uid = 'inv_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const purchasePrice = Number(d.purchase_price) || 0;
    return run('INSERT INTO inventories (uuid, item_name, type, qty, unit_price, purchase_price, sale_price) VALUES (?,?,?,?,?,?,?)', [uid, itemName, d.type || 'General', Number(d.qty) || 0, purchasePrice, purchasePrice, Number(d.sale_price) || 0]);
});
ipcMain.handle('update-inventory', (e, d) => {
    const itemName = d.item_name || d.name;
    console.log('Attempting to update inventory item:', itemName, d);
    if (!itemName) return { success: false, error: 'Item name is required.' };
    return run('UPDATE inventories SET item_name=?, qty=?, purchase_price=?, sale_price=? WHERE id=?', [itemName, Number(d.qty) || 0, Number(d.purchase_price) || 0, Number(d.sale_price) || 0, d.id]);
});
ipcMain.handle('stock-in', (e, { id, addQty }) => run('UPDATE inventories SET qty = qty + ? WHERE id = ?', [Number(addQty), id]));
ipcMain.handle('delete-inventory', (e, id) => run('DELETE FROM inventories WHERE id=?', [id]));
ipcMain.handle('checkout-inventory', (e, { inventory_id, qty: rawQty, description, student_id, status }) => {
    const qty = Math.max(0, Number(rawQty) || 0);
    if (qty <= 0) return { success: false, error: 'Invalid quantity.' };

    try {
        db.run('BEGIN TRANSACTION');
        const item = queryOne('SELECT * FROM inventories WHERE id=?', [inventory_id]);
        if (!item || item.qty < qty) {
            throw new Error('Insufficient stock.');
        }

        // Deduct Stock
        db.run('UPDATE inventories SET qty = qty - ? WHERE id=?', [qty, inventory_id]);

        const salePrice = roundMoney(item.sale_price);
        const total = roundMoney(qty * salePrice);
        const saleStatus = status || 'paid';

        // Record Sale
        const saleUuid = 'sale_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const currentDate = new Date().toISOString().split('T')[0];
        const now = new Date().toLocaleString('sv-SE').replace('T', ' ');

        db.run('INSERT INTO sales (uuid, inventory_id, student_id, qty, total_amount, status, description, date, created_at, purchase_price) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [saleUuid, inventory_id, student_id || null, qty, total, saleStatus, description || item.item_name, currentDate, now, roundMoney(item.purchase_price)]);

        // Audit Fix: Use last_insert_rowid() safely
        const saleIdRes = db.exec("SELECT last_insert_rowid() as id");
        const saleId = saleIdRes[0].values[0][0];

        // Add to Student Ledger if student is selected
        if (student_id) {
            const uid = 'sale_fee_' + Date.now().toString(36);
            const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            db.run('INSERT INTO fees (uuid, student_id, sale_id, amount, debit, credit, status, description, type, month, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime("now", "localtime"))',
                [uid, student_id, saleId, total, total, (saleStatus === 'paid' ? total : 0), saleStatus, `POS Purchase: ${description || item.item_name}`, 'inventory', currentMonth]);
        }

        db.run('COMMIT');
        saveDB();
        return { success: true };
    } catch (err) {
        db.run('ROLLBACK');
        logError('checkout-inventory failed', err);
        return { success: false, error: err.message };
    }
});
ipcMain.handle('checkout-cart', (e, { items: cartItems, student_id, status, paid_amount: rawPaid }) => {
    try {
        db.run('BEGIN TRANSACTION');

        let totalCartAmount = 0;
        const saleDate = new Date().toISOString().split('T')[0];
        const saleTimestamp = new Date().toLocaleString('sv-SE').replace('T', ' ');

        // 1. Validation & Total Calculation (Pre-check)
        for (const item of cartItems) {
            const qty = Math.max(0, Number(item.qty) || 0);
            if (qty <= 0) throw new Error('Invalid quantity in cart.');

            const dbItem = queryOne('SELECT * FROM inventories WHERE id=?', [item.inventory_id]);
            if (!dbItem || dbItem.qty < qty) {
                throw new Error(`Insufficient stock for ${dbItem?.item_name || 'item'}.`);
            }
            totalCartAmount = roundMoney(totalCartAmount + (qty * roundMoney(dbItem.sale_price)));
        }

        // 2. Sequential Invoice Number (Atomic)
        let lastInv = queryOne("SELECT value FROM settings WHERE key = 'last_invoice_no'")?.value;
        let nextInvNum = lastInv ? parseInt(lastInv) + 1 : 1;
        db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_invoice_no', ?)", [nextInvNum.toString()]);
        const invoiceNo = 'INV-' + nextInvNum.toString().padStart(6, '0');

        // 3. Process each item (Actual Update)
        for (const item of cartItems) {
            const qty = Number(item.qty);
            const dbItem = queryOne('SELECT * FROM inventories WHERE id=?', [item.inventory_id]);

            db.run('UPDATE inventories SET qty = qty - ? WHERE id=?', [qty, item.inventory_id]);

            const lineTotal = roundMoney(qty * roundMoney(dbItem.sale_price));
            const itemSaleUuid = 'sale_' + Math.random().toString(36).substr(2, 9);
            db.run('INSERT INTO sales (uuid, inventory_id, student_id, qty, total_amount, status, description, date, created_at, purchase_price, invoice_no) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                [itemSaleUuid, item.inventory_id, student_id || null, qty, lineTotal, status || 'paid', item.description || dbItem.item_name, saleDate, saleTimestamp, roundMoney(dbItem.purchase_price), invoiceNo]);
        }

        // 4. Handle Student Ledger
        if (student_id) {
            let paid = roundMoney(rawPaid || 0);
            if (status === 'paid' && paid === 0) paid = totalCartAmount;

            const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
            const uid = 'pos_inv_' + Date.now().toString(36);

            db.run('INSERT INTO fees (uuid, student_id, amount, debit, credit, status, description, type, month, created_at) VALUES (?,?,?,?,?,?,?,?,?,datetime("now", "localtime"))',
                [uid, student_id, totalCartAmount, totalCartAmount, paid, status || 'paid', `Shop Purchase (${invoiceNo})`, 'inventory', month]);
        }

        db.run('COMMIT');
        saveDB();
        return { success: true, invoice_no: invoiceNo };
    } catch (e) {
        db.run('ROLLBACK');
        logError('checkout-cart failed', e);
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-invoices', () => {
    try {
        return queryAll(`
            SELECT 
                COALESCE(invoice_no, 'INV-OLD-' || id) as invoice_no, 
                student_id, 
                SUM(total_amount) as total, 
                status, 
                created_at, 
                (SELECT name FROM students WHERE id = sales.student_id) as student_name 
            FROM sales 
            GROUP BY COALESCE(invoice_no, id) 
            ORDER BY id DESC
        `);
    } catch (e) {
        console.error('get-invoices error:', e);
        return [];
    }
});

ipcMain.handle('get-invoice-details', (e, invNo) => {
    return queryAll(`
        SELECT s.*, i.item_name, st.name as student_name, st.roll_no 
        FROM sales s 
        LEFT JOIN inventories i ON s.inventory_id = i.id 
        LEFT JOIN students st ON s.student_id = st.id 
        WHERE s.invoice_no = ?
    `, [invNo]);
});

ipcMain.handle('delete-sale', (e, id) => {
    const sale = queryOne('SELECT * FROM sales WHERE id = ?', [id]);
    if (!sale) return { success: false, error: 'Sale not found.' };

    console.log('Deleting sale and restoring stock:', id);

    // 1. Restore Inventory Stock
    run('UPDATE inventories SET qty = qty + ? WHERE id = ?', [sale.qty, sale.inventory_id]);

    // 2. Delete linked Fee/Ledger entry if it exists
    run('DELETE FROM fees WHERE sale_id = ?', [id]);

    // 3. Delete the sale itself
    return run('DELETE FROM sales WHERE id = ?', [id]);
});

ipcMain.handle('get-sales', () => queryAll('SELECT s.*, i.item_name, st.name as student_name FROM sales s LEFT JOIN inventories i ON s.inventory_id = i.id LEFT JOIN students st ON s.student_id = st.id ORDER BY s.created_at DESC'));

// ========================= ATTENDANCE =========================
ipcMain.handle('get-attendance', (e, date) => {
    const rows = queryAll('SELECT a.*, s.name as student_name FROM attendances a LEFT JOIN students s ON a.student_id = s.id WHERE a.attendance_date = ?', [date]);
    return rows.map(r => ({
        ...r,
        status: r.status === 'P' ? 'present' : (r.status === 'A' ? 'absent' : (r.status === 'L' ? 'late' : r.status))
    }));
});

ipcMain.handle('save-attendance', (e, { date, records }) => {
    let allOk = true;
    records.forEach(r => {
        const existing = queryOne('SELECT id FROM attendances WHERE student_id=? AND attendance_date=?', [r.student_id, date]);
        // Map 'present' -> 'P', 'absent' -> 'A', 'late' -> 'L'
        const statusMap = { 'present': 'P', 'absent': 'A', 'late': 'L' };
        const dbStatus = statusMap[r.status] || 'P';

        let res;
        if (existing) {
            res = run('UPDATE attendances SET status=? WHERE id=?', [dbStatus, existing.id]);
        } else {
            res = run('INSERT INTO attendances (student_id, attendance_date, status) VALUES (?,?,?)', [r.student_id, date, dbStatus]);
        }
        if (res && !res.success) allOk = false;
    });
    return { success: allOk };
});

// Get attendance history (all dates) for a specific class
ipcMain.handle('get-attendance-history', (e, classId) => {
    return queryAll(`
        SELECT 
            a.attendance_date as date,
            COUNT(a.id) as total,
            SUM(CASE WHEN a.status IN ('present', 'P') THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN a.status IN ('absent', 'A') THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN a.status IN ('late', 'L') THEN 1 ELSE 0 END) as late
        FROM attendances a
        JOIN students s ON a.student_id = s.id
        WHERE s.class_id = ?
        GROUP BY a.attendance_date
        ORDER BY a.attendance_date DESC
        LIMIT 30
    `, [classId]);
});

// Get full monthly report for a class
ipcMain.handle('get-monthly-attendance', (e, { classId, month }) => {
    // month format expected: "YYYY-MM"
    return queryAll(`
        SELECT 
            s.id as student_id,
            s.name as student_name,
            s.roll_no,
            a.attendance_date,
            a.status
        FROM students s
        LEFT JOIN attendances a ON s.id = a.student_id AND a.attendance_date LIKE ?
        WHERE s.class_id = ?
        ORDER BY s.name, a.attendance_date
    `, [month + '%', classId]);
});
ipcMain.handle('get-settings', () => {
    const rows = queryAll('SELECT key, value FROM settings');
    const obj = {};
    rows.forEach(r => obj[r.key] = r.value);
    return obj;
});

ipcMain.handle('save-settings', (e, data) => {
    Object.entries(data).forEach(([key, value]) => run('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)', [key, value]));
    return { success: true };
});

// ========================= EXPENSES =========================
ipcMain.handle('get-expenses', () => queryAll('SELECT * FROM expenses ORDER BY date DESC'));
ipcMain.handle('create-expense', (e, d) => {
    const uuid = 'exp_' + Date.now().toString(36);
    return run('INSERT INTO expenses (uuid, category, amount, description, date) VALUES (?,?,?,?,?)', [uuid, d.category, Number(d.amount), d.description, d.date]);
});
ipcMain.handle('update-expense', (e, d) => run('UPDATE expenses SET category=?, amount=?, description=?, date=? WHERE id=?', [d.category, Number(d.amount), d.description, d.date, d.id]));
ipcMain.handle('delete-expense', (e, id) => run('DELETE FROM expenses WHERE id=?', [id]));

// ========================= BANKS =========================
ipcMain.handle('get-bank-stats', (e, period = 'all') => {
    try {
        let where = "";
        let salesWhere = "";
        let expWhere = "";

        let dateFilter = "";
        if (period === 'daily') {
            where = " AND date(created_at) = date('now', 'localtime')";
            dateFilter = "date = date('now', 'localtime')";
        } else if (period === 'weekly') {
            where = " AND date(created_at) >= date('now', 'localtime', '-7 days')";
            dateFilter = "date >= date('now', 'localtime', '-7 days')";
        } else if (period === 'monthly') {
            where = " AND date(created_at) >= date('now', 'localtime', '-30 days')";
            dateFilter = "date >= date('now', 'localtime', '-30 days')";
        } else if (period === 'annually') {
            where = " AND strftime('%Y', created_at) = strftime('%Y', 'now', 'localtime')";
            dateFilter = "strftime('%Y', date) = strftime('%Y', 'now', 'localtime')";
        }

        salesWhere = " WHERE status = 'paid'" + (dateFilter ? " AND " + dateFilter : "");
        expWhere = dateFilter ? " WHERE " + dateFilter : "";
        const invWhere = dateFilter ? " WHERE " + dateFilter.replace('date', 'date(created_at)') : "";

        const admission = queryOne(`SELECT SUM(credit) as s FROM fees WHERE (type LIKE '%admission%' OR description LIKE '%Admission%') ${where}`)?.s || 0;
        const tuition = queryOne(`SELECT SUM(credit) as s FROM fees WHERE sale_id IS NULL AND type NOT IN ('inventory', 'pos', 'POS') AND NOT (type LIKE '%admission%' OR description LIKE '%Admission%') ${where}`)?.s || 0;
        const posSales = queryOne(`SELECT SUM(total_amount) as s FROM sales ${salesWhere}`)?.s || 0;
        const costOfSoldItems = queryOne(`SELECT SUM(s.qty * i.purchase_price) as s FROM sales s LEFT JOIN inventories i ON s.inventory_id = i.id ${salesWhere.replace('WHERE', 'WHERE s.')}`)?.s || 0;

        const totalPurchases = queryOne(`SELECT SUM(qty * purchase_price) as s FROM inventories ${invWhere}`)?.s || 0;

        const posProfit = posSales - costOfSoldItems;
        const expenses = queryOne(`SELECT SUM(amount) as s FROM expenses ${expWhere}`)?.s || 0;

        // Net Balance/Profit = (Total Income) - Expenses - Cost of Sold Items
        const netBalance = (tuition + admission + posSales) - expenses - costOfSoldItems;

        return { tuition, admission, posSales, posProfit, totalPurchases, expenses, netBalance };
    } catch (e) { console.error('Bank stats error:', e.message); return { tuition: 0, admission: 0, posSales: 0, posProfit: 0, totalPurchases: 0, expenses: 0, netBalance: 0 }; }
});
ipcMain.handle('get-banks', () => queryAll('SELECT * FROM banks ORDER BY account_name ASC'));
ipcMain.handle('create-bank', (e, d) => {
    const uuid = 'bnk_' + Date.now().toString(36);
    return run('INSERT INTO banks (uuid, account_name, account_number, bank_name, balance) VALUES (?,?,?,?,?)', [uuid, d.account_name, d.account_number, d.bank_name, Number(d.balance) || 0]);
});
ipcMain.handle('update-bank', (e, d) => run('UPDATE banks SET account_name=?, account_number=?, bank_name=?, balance=? WHERE id=?', [d.account_name, d.account_number, d.bank_name, Number(d.balance) || 0, d.id]));
ipcMain.handle('delete-bank', (e, id) => run('DELETE FROM banks WHERE id=?', [id]));

ipcMain.handle('get-bank-transactions', (e, bankId) => queryAll('SELECT * FROM bank_transactions WHERE bank_id = ? ORDER BY created_at DESC', [bankId]));
ipcMain.handle('create-bank-transaction', (e, d) => {
    const uuid = 'btx_' + Date.now().toString(36);
    const op = d.type === 'deposit' ? '+' : '-';
    run(`UPDATE banks SET balance = balance ${op} ? WHERE id = ?`, [Number(d.amount), d.bank_id]);
    return run('INSERT INTO bank_transactions (uuid, bank_id, type, amount, description, date) VALUES (?,?,?,?,?,?)', [uuid, d.bank_id, d.type, Number(d.amount), d.description, d.date]);
});

// ========================= EXAMS =========================
ipcMain.handle('get-exams', () => queryAll('SELECT * FROM exams ORDER BY created_at DESC'));
ipcMain.handle('create-exam', (e, d) => run('INSERT INTO exams (name, date) VALUES (?,?)', [d.name, d.date]));
ipcMain.handle('delete-exam', (e, id) => {
    run('DELETE FROM exam_results WHERE exam_id = ?', [id]);
    return run('DELETE FROM exams WHERE id = ?', [id]);
});

ipcMain.handle('get-exam-results', (e, { examId, classId }) => {
    return queryAll(`
        SELECT 
            s.id as student_id, s.name as student_name, s.roll_no,
            er.id as result_id, er.subject_name, er.total_marks, er.obtained_marks
        FROM students s
        LEFT JOIN exam_results er ON s.id = er.student_id AND er.exam_id = ?
        WHERE s.class_id = ?
        ORDER BY s.name
    `, [examId, classId]);
});

ipcMain.handle('save-exam-result', (e, d) => {
    const existing = queryOne('SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ? AND subject_name = ?', [d.exam_id, d.student_id, d.subject_name]);
    if (existing) {
        return run('UPDATE exam_results SET total_marks = ?, obtained_marks = ? WHERE id = ?', [d.total_marks, d.obtained_marks, existing.id]);
    } else {
        return run('INSERT INTO exam_results (exam_id, student_id, subject_name, total_marks, obtained_marks) VALUES (?,?,?,?,?)', [d.exam_id, d.student_id, d.subject_name, d.total_marks, d.obtained_marks]);
    }
});

ipcMain.handle('get-student-dmc', (e, { studentId, examId }) => {
    const results = queryAll('SELECT * FROM exam_results WHERE student_id = ? AND exam_id = ?', [studentId, examId]);
    const student = queryOne('SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.id = ?', [studentId]);
    const exam = queryOne('SELECT * FROM exams WHERE id = ?', [examId]);
    return { student, exam, results };
});

ipcMain.handle('get-exam-subjects', (e, { examId, classId }) => {
    return queryAll('SELECT DISTINCT subject_name, total_marks FROM exam_results WHERE exam_id = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?)', [examId, classId]);
});

ipcMain.handle('delete-exam-subject', (e, { examId, classId, subjectName }) => {
    return run('DELETE FROM exam_results WHERE exam_id = ? AND subject_name = ? AND student_id IN (SELECT id FROM students WHERE class_id = ?)', [examId, subjectName, classId]);
});

// ========================= SUBJECTS =========================
ipcMain.handle('get-subjects', (e, classId) => {
    if (classId) return queryAll('SELECT * FROM subjects WHERE class_id = ? ORDER BY name', [classId]);
    return queryAll('SELECT s.*, c.name as class_name FROM subjects s LEFT JOIN class_infos c ON s.class_id = c.id ORDER BY c.name, s.name');
});
ipcMain.handle('save-subject', (e, d) => {
    if (d.id) return run('UPDATE subjects SET name=?, total_marks=?, class_id=? WHERE id=?', [d.name, d.total_marks, d.class_id, d.id]);
    return run('INSERT INTO subjects (name, total_marks, class_id) VALUES (?,?,?)', [d.name, d.total_marks, d.class_id]);
});
ipcMain.handle('delete-subject', (e, id) => run('DELETE FROM subjects WHERE id=?', [id]));

// ========================= STUDENT BIODATA =========================
ipcMain.handle('get-student-biodata', (e, studentId) => {
    try {
        const student = queryOne('SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.id = ?', [studentId]);
        if (!student) return null;

        // Attendance summary
        const attTotal = queryOne('SELECT COUNT(*) as c FROM attendances WHERE student_id = ?', [studentId])?.c || 0;
        const attPresent = queryOne("SELECT COUNT(*) as c FROM attendances WHERE student_id = ? AND status IN ('P','present')", [studentId])?.c || 0;
        const attAbsent = queryOne("SELECT COUNT(*) as c FROM attendances WHERE student_id = ? AND status IN ('A','absent')", [studentId])?.c || 0;
        const attLate = queryOne("SELECT COUNT(*) as c FROM attendances WHERE student_id = ? AND status IN ('L','late')", [studentId])?.c || 0;
        const attPct = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100;

        // Fee summary
        const totalDebit = queryOne('SELECT SUM(debit) as s FROM fees WHERE student_id = ?', [studentId])?.s || 0;
        const totalCredit = queryOne('SELECT SUM(credit) as s FROM fees WHERE student_id = ?', [studentId])?.s || 0;
        const balance = roundMoney(totalDebit - totalCredit);

        // Fee ledger (last 10)
        const ledger = queryAll('SELECT * FROM fees WHERE student_id = ? ORDER BY created_at DESC LIMIT 10', [studentId]);

        // Exam results
        const examResults = queryAll(`
            SELECT e.name as exam_name, e.date as exam_date, er.subject_name, er.total_marks, er.obtained_marks,
            ROUND((er.obtained_marks * 100.0 / er.total_marks), 1) as percentage
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            WHERE er.student_id = ?
            ORDER BY e.created_at DESC
        `, [studentId]);

        // Siblings (same guardian name or family_no)
        const siblings = queryAll(`
            SELECT s2.id, s2.name, s2.roll_no, c.name as class_name
            FROM students s2
            LEFT JOIN class_infos c ON s2.class_id = c.id
            WHERE (s2.guardian_name = ? OR (s2.family_no = ? AND s2.family_no IS NOT NULL)) AND s2.id != ? AND s2.status = 'active'
        `, [student.guardian_name, student.family_no, studentId]);

        return {
            student, attTotal, attPresent, attAbsent, attLate, attPct,
            totalDebit: roundMoney(totalDebit), totalCredit: roundMoney(totalCredit), balance,
            ledger, examResults, siblings
        };
    } catch(e) { logError('get-student-biodata failed', e); return null; }
});

// ========================= WITHDRAWAL & STRUCK-OFF =========================
ipcMain.handle('withdraw-student', (e, { id, reason, date }) => {
    try {
        db.run('BEGIN TRANSACTION');
        db.run("UPDATE students SET status='withdrawn' WHERE id=?", [id]);
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [`withdrawal_${id}`, JSON.stringify({ reason, date, action: 'withdrawn' })]);
        db.run('COMMIT');
        saveDB();
        return { success: true };
    } catch(err) { db.run('ROLLBACK'); return { success: false, error: err.message }; }
});

ipcMain.handle('struck-off-student', (e, { id, reason, date }) => {
    try {
        db.run('BEGIN TRANSACTION');
        db.run("UPDATE students SET status='struck-off' WHERE id=?", [id]);
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [`withdrawal_${id}`, JSON.stringify({ reason, date, action: 'struck-off' })]);
        db.run('COMMIT');
        saveDB();
        return { success: true };
    } catch(err) { db.run('ROLLBACK'); return { success: false, error: err.message }; }
});

ipcMain.handle('get-withdrawn-students', () => {
    return queryAll("SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.status IN ('withdrawn','struck-off') ORDER BY s.name");
});

ipcMain.handle('restore-student', (e, id) => {
    return run("UPDATE students SET status='active' WHERE id=?", [id]);
});

// ========================= SESSION MANAGEMENT =========================
ipcMain.handle('get-sessions', () => {
    return queryAll('SELECT * FROM sessions ORDER BY start_year DESC');
});
ipcMain.handle('create-session', (e, d) => {
    const uid = 'sess_' + Date.now().toString(36);
    return run('INSERT INTO sessions (uuid, name, start_year, end_year, is_active) VALUES (?,?,?,?,?)',
        [uid, d.name, d.start_year, d.end_year, d.is_active ? 1 : 0]);
});
ipcMain.handle('set-active-session', (e, id) => {
    try {
        db.run('BEGIN TRANSACTION');
        db.run('UPDATE sessions SET is_active = 0');
        db.run('UPDATE sessions SET is_active = 1 WHERE id = ?', [id]);
        db.run('COMMIT');
        saveDB();
        return { success: true };
    } catch(err) { db.run('ROLLBACK'); return { success: false, error: err.message }; }
});
ipcMain.handle('delete-session', (e, id) => run('DELETE FROM sessions WHERE id=?', [id]));
ipcMain.handle('get-active-session', () => {
    return queryOne('SELECT * FROM sessions WHERE is_active = 1 LIMIT 1');
});
ipcMain.handle('get-session-overview', (e, sessionId) => {
    try {
        const stats = {
            totalStudents: queryOne('SELECT COUNT(*) as c FROM students WHERE session_id = ?', [sessionId])?.c || 0,
            totalRevenue: queryOne('SELECT SUM(credit) as s FROM fees WHERE student_id IN (SELECT id FROM students WHERE session_id = ?)', [sessionId])?.s || 0,
            classCount: queryOne('SELECT COUNT(DISTINCT class_id) as c FROM students WHERE session_id = ?', [sessionId])?.c || 0,
        };
        return stats;
    } catch(err) { return { totalStudents: 0, totalRevenue: 0, classCount: 0 }; }
});

// ========================= USER MANAGEMENT =========================
ipcMain.handle('get-users', () => {
    return queryAll('SELECT id, name, email, role, permissions, created_at FROM users ORDER BY created_at ASC');
});
ipcMain.handle('create-user', (e, d) => {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(d.password).digest('hex');
    const existing = queryOne('SELECT id FROM users WHERE email = ?', [d.email]);
    if (existing) return { success: false, error: 'User ID already exists.' };
    return run('INSERT INTO users (name, email, password, role, permissions) VALUES (?,?,?,?,?)',
        [d.name, d.email, hash, d.role || 'staff', JSON.stringify(d.permissions || [])]);
});
ipcMain.handle('update-user', (e, d) => {
    if (d.password) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(d.password).digest('hex');
        return run('UPDATE users SET name=?, email=?, password=?, role=?, permissions=? WHERE id=?',
            [d.name, d.email, hash, d.role, JSON.stringify(d.permissions || []), d.id]);
    }
    return run('UPDATE users SET name=?, email=?, role=?, permissions=? WHERE id=?',
        [d.name, d.email, d.role, JSON.stringify(d.permissions || []), d.id]);
});
ipcMain.handle('delete-user', (e, id) => {
    const adminCount = queryOne('SELECT COUNT(*) as c FROM users WHERE role = ?', ['admin'])?.c || 0;
    const user = queryOne('SELECT role FROM users WHERE id = ?', [id]);
    if (user?.role === 'admin' && adminCount <= 1) return { success: false, error: 'Cannot delete the last admin!' };
    return run('DELETE FROM users WHERE id=?', [id]);
});

// ========================= TRANSPORT FEES =========================
ipcMain.handle('get-transport-routes', () => queryAll('SELECT * FROM transport_routes ORDER BY name'));
ipcMain.handle('create-transport-route', (e, d) => {
    const uid = 'tr_' + Date.now().toString(36);
    return run('INSERT INTO transport_routes (uuid, name, fee, description) VALUES (?,?,?,?)', [uid, d.name, Number(d.fee)||0, d.description||'']);
});
ipcMain.handle('update-transport-route', (e, d) => run('UPDATE transport_routes SET name=?, fee=?, description=? WHERE id=?', [d.name, Number(d.fee)||0, d.description||'', d.id]));
ipcMain.handle('delete-transport-route', (e, id) => run('DELETE FROM transport_routes WHERE id=?', [id]));

ipcMain.handle('get-student-transport', (e, studentId) => queryOne('SELECT st.*, tr.name as route_name, tr.fee FROM student_transport st LEFT JOIN transport_routes tr ON st.route_id = tr.id WHERE st.student_id = ?', [studentId]));
ipcMain.handle('assign-transport', (e, d) => {
    const existing = queryOne('SELECT id FROM student_transport WHERE student_id = ?', [d.student_id]);
    if (existing) return run('UPDATE student_transport SET route_id=? WHERE student_id=?', [d.route_id, d.student_id]);
    return run('INSERT INTO student_transport (student_id, route_id) VALUES (?,?)', [d.student_id, d.route_id]);
});
ipcMain.handle('remove-transport', (e, studentId) => run('DELETE FROM student_transport WHERE student_id=?', [studentId]));
ipcMain.handle('get-transport-students', () => {
    return queryAll(`
        SELECT s.id, s.name, s.roll_no, c.name as class_name, tr.name as route_name, tr.fee
        FROM students s
        JOIN student_transport st ON s.id = st.student_id
        JOIN transport_routes tr ON st.route_id = tr.id
        LEFT JOIN class_infos c ON s.class_id = c.id
        WHERE s.status = 'active'
        ORDER BY tr.name, s.name
    `);
});

// ========================= HR MODULE =========================
ipcMain.handle('get-staff', () => queryAll('SELECT * FROM staff ORDER BY created_at DESC'));
ipcMain.handle('get-staff-member', (e, id) => queryOne('SELECT * FROM staff WHERE id=?', [id]));
ipcMain.handle('create-staff', (e, d) => {
    const uid = 'stf_' + Date.now().toString(36);
    return run(`INSERT INTO staff (uuid, name, father_name, cnic, dob, gender, contact, email, address, department, designation, qualification, joining_date, salary, status, picture)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uid, d.name, d.father_name||'', d.cnic||'', d.dob||'', d.gender||'Male', d.contact||'', d.email||'', d.address||'', d.department||'General', d.designation||'', d.qualification||'', d.joining_date||'', Number(d.salary)||0, 'active', d.picture||null]);
});
ipcMain.handle('update-staff', (e, d) => {
    return run(`UPDATE staff SET name=?, father_name=?, cnic=?, dob=?, gender=?, contact=?, email=?, address=?, department=?, designation=?, qualification=?, joining_date=?, salary=?, status=?, picture=? WHERE id=?`,
        [d.name, d.father_name||'', d.cnic||'', d.dob||'', d.gender||'Male', d.contact||'', d.email||'', d.address||'', d.department||'General', d.designation||'', d.qualification||'', d.joining_date||'', Number(d.salary)||0, d.status||'active', d.picture||null, d.id]);
});
ipcMain.handle('delete-staff', (e, id) => run('DELETE FROM staff WHERE id=?', [id]));
ipcMain.handle('upload-staff-picture', async () => {
    try {
        const { dialog } = require('electron');
        const win = require('electron').BrowserWindow.getFocusedWindow();
        const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['jpg','png','jpeg','webp'] }] });
        if (result.canceled || result.filePaths.length === 0) return null;
        const sourcePath = result.filePaths[0];
        const extension = require('path').extname(sourcePath);
        const fileName = `staff_${Date.now()}${extension}`;
        const targetDir = require('path').join(app.getPath('userData'), 'staff_pictures');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(sourcePath, require('path').join(targetDir, fileName));
        return fileName;
    } catch(err) { return { error: err.message }; }
});
ipcMain.handle('get-staff-picture-url', (e, fileName) => {
    if (!fileName) return null;
    const filePath = require('path').join(app.getPath('userData'), 'staff_pictures', fileName);
    return fs.existsSync(filePath) ? `file://${filePath}` : null;
});

// ========================= TIMETABLE =========================
ipcMain.handle('get-timetable', (e, { classId, day }) => {
    let sql = 'SELECT t.*, c.name as class_name FROM timetable t LEFT JOIN class_infos c ON t.class_id = c.id WHERE 1=1';
    const params = [];
    if (classId) { sql += ' AND t.class_id = ?'; params.push(classId); }
    if (day) { sql += ' AND t.day = ?'; params.push(day); }
    return queryAll(sql + ' ORDER BY t.day, t.start_time', params);
});
ipcMain.handle('save-timetable-entry', (e, d) => {
    if (d.id) return run('UPDATE timetable SET class_id=?, day=?, period_no=?, subject=?, teacher=?, start_time=?, end_time=? WHERE id=?',
        [d.class_id, d.day, d.period_no, d.subject, d.teacher||'', d.start_time, d.end_time, d.id]);
    return run('INSERT INTO timetable (class_id, day, period_no, subject, teacher, start_time, end_time) VALUES (?,?,?,?,?,?,?)',
        [d.class_id, d.day, d.period_no, d.subject, d.teacher||'', d.start_time, d.end_time]);
});
ipcMain.handle('delete-timetable-entry', (e, id) => run('DELETE FROM timetable WHERE id=?', [id]));

// ========================= REMINDERS =========================
ipcMain.handle('get-reminders', () => queryAll('SELECT * FROM reminders ORDER BY reminder_date ASC, created_at DESC'));
ipcMain.handle('create-reminder', (e, d) => {
    const uid = 'rem_' + Date.now().toString(36);
    return run('INSERT INTO reminders (uuid, title, description, reminder_date, priority, is_done) VALUES (?,?,?,?,?,0)',
        [uid, d.title, d.description||'', d.reminder_date, d.priority||'medium']);
});
ipcMain.handle('toggle-reminder', (e, id) => run('UPDATE reminders SET is_done = CASE WHEN is_done=1 THEN 0 ELSE 1 END WHERE id=?', [id]));
ipcMain.handle('delete-reminder', (e, id) => run('DELETE FROM reminders WHERE id=?', [id]));
ipcMain.handle('update-reminder', (e, d) => run('UPDATE reminders SET title=?, description=?, reminder_date=?, priority=? WHERE id=?', [d.title, d.description||'', d.reminder_date, d.priority||'medium', d.id]));

// ========================= REPORTS =========================
ipcMain.handle('get-report', (e, { type, filters }) => {
    try {
        const { classId, gender, status, sessionId, bloodGroup } = filters || {};
        let sql = 'SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE 1=1';
        const params = [];
        if (classId) { sql += ' AND s.class_id = ?'; params.push(classId); }
        if (gender) { sql += ' AND s.gender = ?'; params.push(gender); }
        if (status) { sql += ' AND s.status = ?'; params.push(status); } else { sql += " AND s.status != 'deleted'"; }
        if (bloodGroup) { sql += ' AND s.blood_group = ?'; params.push(bloodGroup); }
        sql += ' ORDER BY c.name, s.name';
        return queryAll(sql, params);
    } catch(e) { logError('get-report failed', e); return []; }
});

ipcMain.handle('get-fee-report', (e, { type, classId, month, year }) => {
    try {
        let sql = `SELECT s.name as student_name, s.roll_no, c.name as class_name,
            SUM(f.debit) as total_debit, SUM(f.credit) as total_credit,
            SUM(f.debit - f.credit) as balance
            FROM students s
            LEFT JOIN class_infos c ON s.class_id = c.id
            LEFT JOIN fees f ON s.id = f.student_id
            WHERE s.status = 'active'`;
        const params = [];
        if (classId) { sql += ' AND s.class_id = ?'; params.push(classId); }
        if (month) { sql += ' AND f.month = ?'; params.push(month); }
        sql += ' GROUP BY s.id ORDER BY c.name, s.name';
        return queryAll(sql, params);
    } catch(e) { return []; }
});

ipcMain.handle('get-defaulters-report', (e, { classId, minBalance }) => {
    try {
        const min = Number(minBalance) || 1;
        let sql = `SELECT s.name as student_name, s.roll_no, s.contact_number, c.name as class_name,
            SUM(f.debit - f.credit) as balance
            FROM students s
            LEFT JOIN class_infos c ON s.class_id = c.id
            LEFT JOIN fees f ON s.id = f.student_id
            WHERE s.status = 'active'`;
        const params = [];
        if (classId) { sql += ' AND s.class_id = ?'; params.push(classId); }
        sql += ` GROUP BY s.id HAVING balance >= ? ORDER BY balance DESC`;
        params.push(min);
        return queryAll(sql, params);
    } catch(e) { return []; }
});

ipcMain.handle('get-diary', () => {
    return queryAll('SELECT d.*, c.name as class_name FROM diary d LEFT JOIN class_infos c ON d.class_id = c.id ORDER BY d.entry_date DESC, d.created_at DESC');
});
ipcMain.handle('create-diary', (e, d) => run('INSERT INTO diary (class_id, subject, entry_date, content) VALUES (?,?,?,?)', [d.class_id, d.subject||'Daily Diary', d.entry_date, d.content]));
ipcMain.handle('delete-diary', (e, id) => run('DELETE FROM diary WHERE id=?', [id]));

ipcMain.handle('get-daily-collection', (e, date) => {
    try {
        return queryAll(`
            SELECT f.*, s.name as student_name 
            FROM fees f 
            LEFT JOIN students s ON f.student_id = s.id 
            WHERE date(f.created_at, 'localtime') = ? AND f.credit > 0
        `, [date]);
    } catch(e) { return []; }
});
