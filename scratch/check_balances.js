const Database = require('better-sqlite3');
const db = new Database('E:/School Management System/database/database.sqlite');

try {
    const rows = db.prepare(`
        SELECT s.name, SUM(f.debit) as total_debit, SUM(f.credit) as total_credit, SUM(f.debit - f.credit) as balance 
        FROM fees f 
        JOIN students s ON f.student_id = s.id 
        GROUP BY s.id 
        HAVING balance != 0;
    `).all();

    console.log('--- UNPAID BALANCES ---');
    rows.forEach(r => {
        console.log(`${r.name}: Debit=${r.total_debit}, Credit=${r.total_credit}, Balance=${r.balance}`);
    });
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
