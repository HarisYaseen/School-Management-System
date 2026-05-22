using System;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.Sqlite;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.IO;

namespace SMS_CS_Desktop
{
    public class DatabaseHelper
    {
        private string _connectionString;

        public DatabaseHelper(string dbPath)
        {
            _connectionString = $"Data Source={dbPath}";
            // Ensure directory exists
            var dir = Path.GetDirectoryName(dbPath);
            if (dir != null && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
            
            Migrate();
        }

        public void Migrate()
        {
            using var conn = GetConnection();
            using var cmd = conn.CreateCommand();

            // NUCLEAR FIX: If sessions table exists but lacks AUTOINCREMENT on ID, rename it so it can be recreated.
            try {
                var check = QueryOne("SELECT sql FROM sqlite_master WHERE type='table' AND name='sessions'");
                if (check != null && !check["sql"].ToString().ToUpper().Contains("AUTOINCREMENT")) {
                    Execute("ALTER TABLE sessions RENAME TO sessions_broken_" + DateTime.Now.Ticks + ";");
                }
            } catch { }

            // NUCLEAR FIX FOR EXAMS: If exams table exists but lacks 'name' column (e.g. from legacy framework schema), drop it to recreate correctly.
            try {
                var checkExams = QueryOne("SELECT sql FROM sqlite_master WHERE type='table' AND name='exams'");
                if (checkExams != null && !checkExams["sql"].ToString().Contains("name")) {
                    Execute("DROP TABLE IF EXISTS exam_results;");
                    Execute("DROP TABLE IF EXISTS exams;");
                }
            } catch { }
            
            // Create all tables if they don't exist
            string[] tables = {
                "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);",
                "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), role TEXT DEFAULT 'staff', permissions TEXT DEFAULT '[]');",
                "CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT);",
                "CREATE TABLE IF NOT EXISTS class_infos (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, uuid TEXT UNIQUE NOT NULL, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, roll_no TEXT UNIQUE NOT NULL, class_id INTEGER, guardian_name TEXT, contact_number TEXT, monthly_fee REAL DEFAULT 0, admission_fee REAL DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')), picture TEXT, gender TEXT DEFAULT 'Male', concession REAL DEFAULT 0, family_no TEXT, session_id INTEGER, blood_group TEXT, dob TEXT, religion TEXT DEFAULT 'Islam', address TEXT, registration_no TEXT);",
                "CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, father_name TEXT, cnic TEXT, dob TEXT, gender TEXT DEFAULT 'Male', contact TEXT, email TEXT, address TEXT, department TEXT, designation TEXT, qualification TEXT, joining_date TEXT, salary REAL DEFAULT 0, status TEXT DEFAULT 'active', picture TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS fees (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, student_id INTEGER NOT NULL, amount REAL NOT NULL, debit REAL DEFAULT 0, credit REAL DEFAULT 0, status TEXT DEFAULT 'unpaid', description TEXT, type TEXT, month TEXT, sale_id INTEGER, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS banks (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, account_name TEXT NOT NULL, account_number TEXT, bank_name TEXT, balance REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS bank_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, bank_id INTEGER NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, description TEXT, date TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS attendances (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, attendance_date TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now', 'localtime')));",
                "CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, name TEXT NOT NULL, total_marks REAL DEFAULT 100, created_at TEXT DEFAULT (datetime('now', 'localtime')));",
                "CREATE TABLE IF NOT EXISTS exams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, date TEXT, created_at TEXT DEFAULT (datetime('now', 'localtime')));",
                "CREATE TABLE IF NOT EXISTS exam_results (id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id INTEGER NOT NULL, student_id INTEGER NOT NULL, subject_name TEXT NOT NULL, total_marks REAL, obtained_marks REAL, created_at TEXT DEFAULT (datetime('now', 'localtime')));",
                "CREATE TABLE IF NOT EXISTS inventories (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, item_name TEXT NOT NULL, type TEXT DEFAULT 'General', qty INTEGER DEFAULT 0, unit_price REAL DEFAULT 0, purchase_price REAL DEFAULT 0, sale_price REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now', 'localtime')));",
                "CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, inventory_id INTEGER NOT NULL, student_id INTEGER, qty INTEGER NOT NULL, total_amount REAL NOT NULL, status TEXT DEFAULT 'paid', description TEXT, invoice_no TEXT, purchase_price REAL DEFAULT 0, date TEXT DEFAULT (date('now', 'localtime')), created_at TEXT DEFAULT (datetime('now', 'localtime')));",
                "CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, category TEXT NOT NULL, amount REAL NOT NULL, description TEXT, date TEXT DEFAULT (date('now', 'localtime')), created_at TEXT DEFAULT (datetime('now', 'localtime')));",
                "CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, start_year INTEGER, end_year INTEGER, is_active INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS transport_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, fee REAL DEFAULT 0, description TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS student_transport (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER UNIQUE NOT NULL, route_id INTEGER NOT NULL, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS timetable (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, day TEXT NOT NULL, period_no INTEGER, subject TEXT, teacher TEXT, start_time TEXT, end_time TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS student_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, student_id INTEGER NOT NULL, title TEXT, file_name TEXT, file_type TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT, reminder_date TEXT, priority TEXT DEFAULT 'medium', is_done INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS diary (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, subject TEXT, content TEXT, entry_date TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS salary_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER NOT NULL, month TEXT NOT NULL, basic_salary REAL DEFAULT 0, allowance REAL DEFAULT 0, deduction REAL DEFAULT 0, net_paid REAL DEFAULT 0, payment_date TEXT, method TEXT, notes TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS staff_attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER NOT NULL, status TEXT NOT NULL, date TEXT NOT NULL, notes TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS staff_leaves (id INTEGER PRIMARY KEY AUTOINCREMENT, staff_id INTEGER NOT NULL, leave_type TEXT, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'pending', reason TEXT, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS holiday_calendar (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT, type TEXT DEFAULT 'holiday', description TEXT, created_at TEXT DEFAULT (datetime('now')));"
            };

            foreach (var sql in tables)
            {
                cmd.CommandText = sql;
                cmd.ExecuteNonQuery();
            }

            // Seed classes if empty
            var classCount = Convert.ToInt32(ExecuteScalar("SELECT COUNT(*) FROM class_infos"));
            if (classCount == 0)
            {
                string[] classes = { "Nursery", "Prep", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10" };
                foreach (var name in classes)
                {
                    Execute("INSERT INTO class_infos (uuid, name) VALUES (@uuid, @name)", 
                        new Dictionary<string, object> { { "@uuid", "cls_" + Guid.NewGuid().ToString("N").Substring(0, 8) }, { "@name", name } });
                }
            }

            // FORCE SALMAN TO STAFF (Safety Override)
            try { Execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'staff';"); } catch { }
            try { Execute("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]';"); } catch { }
            Execute("UPDATE users SET role='staff', permissions='[\"academic\"]' WHERE email='1001' OR name LIKE '%salman%'", null);

            // Ensure picture column exists in students (Migration)
            try { Execute("ALTER TABLE students ADD COLUMN picture TEXT;"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN gender TEXT DEFAULT 'Male';"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN concession REAL DEFAULT 0;"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN family_no TEXT;"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN session_id INTEGER;"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN blood_group TEXT;"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN dob TEXT;"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN religion TEXT DEFAULT 'Islam';"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN address TEXT;"); } catch { }
            try { Execute("ALTER TABLE students ADD COLUMN registration_no TEXT;"); } catch { }

            // Migration for staff
            try { Execute("ALTER TABLE staff ADD COLUMN father_name TEXT;"); } catch { }
            try { Execute("ALTER TABLE staff ADD COLUMN cnic TEXT", null); } catch { }
            try { Execute("ALTER TABLE staff ADD COLUMN address TEXT", null); } catch { }
            try { Execute("ALTER TABLE staff ADD COLUMN hire_date TEXT", null); } catch { }
            try { Execute("ALTER TABLE staff ADD COLUMN qualification TEXT", null); } catch { }

            // TIMETABLE SCHEMA UPDATE: Ensure teacher_id exists
            try { 
                var cols = QueryAll("PRAGMA table_info(timetable)", null);
                bool exists = false;
                foreach(var c in cols) if(c["name"]?.ToString() == "teacher_id") exists = true;
                if(!exists) Execute("ALTER TABLE timetable ADD COLUMN teacher_id INTEGER", null);
            } catch { }

            // Ensure session columns exist (Migration)
            try { Execute("ALTER TABLE sessions ADD COLUMN uuid TEXT;"); } catch { }
            try { Execute("ALTER TABLE sessions ADD COLUMN name TEXT;"); } catch { }
            try { Execute("ALTER TABLE sessions ADD COLUMN start_year INTEGER;"); } catch { }
            try { Execute("ALTER TABLE sessions ADD COLUMN is_active INTEGER DEFAULT 0;"); } catch { }
            try { Execute("ALTER TABLE sessions ADD COLUMN created_at TEXT DEFAULT (datetime('now'));"); } catch { }

            // NUCLEAR CLEANUP: Remove duplicate exam results, leaving only the latest record per student/exam/subject (case-insensitive & trimmed)
            try {
                Execute(@"DELETE FROM exam_results 
                          WHERE id NOT IN (
                              SELECT MAX(id) 
                              FROM exam_results 
                              GROUP BY exam_id, student_id, LOWER(TRIM(subject_name))
                          );");
            } catch { }
        }

        private SqliteConnection GetConnection()
        {
            var conn = new SqliteConnection(_connectionString);
            conn.Open();
            return conn;
        }

        public List<Dictionary<string, object>> QueryAll(string sql, Dictionary<string, object>? parameters = null)
        {
            using var conn = GetConnection();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            if (parameters != null)
            {
                foreach (var p in parameters) cmd.Parameters.AddWithValue(p.Key, p.Value ?? DBNull.Value);
            }

            using var reader = cmd.ExecuteReader();
            var results = new List<Dictionary<string, object>>();
            while (reader.Read())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    row[reader.GetName(i)] = reader.GetValue(i);
                }
                results.Add(row);
            }
            return results;
        }

        public Dictionary<string, object>? QueryOne(string sql, Dictionary<string, object>? parameters = null)
        {
            var results = QueryAll(sql, parameters);
            return results.Count > 0 ? results[0] : null;
        }

        public int Execute(string sql, Dictionary<string, object>? parameters = null)
        {
            using var conn = GetConnection();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            if (parameters != null)
            {
                foreach (var p in parameters) cmd.Parameters.AddWithValue(p.Key, p.Value ?? DBNull.Value);
            }
            return cmd.ExecuteNonQuery();
        }

        // --- DASHBOARD ---
        public object GetDashboardStats()
        {
            var studentCount = Convert.ToInt32(ExecuteScalar("SELECT COUNT(*) FROM students") ?? 0);
            var teacherCount = 0;
            try 
            { 
                teacherCount = Convert.ToInt32(ExecuteScalar("SELECT COUNT(*) FROM teachers") ?? 0); 
            }
            catch 
            { 
                teacherCount = Convert.ToInt32(ExecuteScalar("SELECT COUNT(*) FROM staff WHERE designation LIKE '%Teacher%'") ?? 0); 
            }

            var admission = Convert.ToDouble(ExecuteScalar("SELECT SUM(credit) FROM fees WHERE (type LIKE '%admission%' OR description LIKE '%Admission%')") ?? 0.0);
            var tuition = Convert.ToDouble(ExecuteScalar("SELECT SUM(credit) FROM fees WHERE sale_id IS NULL AND type NOT IN ('inventory', 'pos', 'POS') AND NOT (type LIKE '%admission%' OR description LIKE '%Admission%')") ?? 0.0);
            var posSales = Convert.ToDouble(ExecuteScalar("SELECT SUM(total_amount) FROM sales WHERE status = 'paid'") ?? 0.0);
            var costOfSoldItems = Convert.ToDouble(ExecuteScalar("SELECT SUM(qty * purchase_price) FROM sales WHERE status = 'paid'") ?? 0.0);
            var generalExpenses = Convert.ToDouble(ExecuteScalar("SELECT SUM(amount) FROM expenses") ?? 0.0);
            var salaryExpenses = Convert.ToDouble(ExecuteScalar("SELECT SUM(net_paid) FROM salary_payments") ?? 0.0);
            var expenses = Math.Round(generalExpenses + salaryExpenses, 2);

            var totalCollection = Math.Round(tuition + admission + posSales, 2);
            var netProfit = Math.Round(totalCollection - expenses - costOfSoldItems, 2);

            var outstanding = Convert.ToDouble(ExecuteScalar("SELECT SUM(balance) FROM (SELECT SUM(f.debit - f.credit) as balance FROM fees f JOIN students s ON f.student_id = s.id GROUP BY s.id) WHERE balance > 0") ?? 0.0);
            var parentCount = Convert.ToInt32(ExecuteScalar("SELECT COUNT(*) FROM students WHERE guardian_name IS NOT NULL AND guardian_name != ''") ?? 0);

            return new { 
                total_students = studentCount, 
                total_teachers = teacherCount,
                total_parents = parentCount,
                total_collection = totalCollection,
                net_profit = netProfit,
                pending_fees = outstanding
            };
        }

        public object? ExecuteScalar(string sql, Dictionary<string, object>? parameters = null)
        {
            using var conn = GetConnection();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            if (parameters != null)
            {
                foreach (var p in parameters) cmd.Parameters.AddWithValue(p.Key, p.Value ?? DBNull.Value);
            }
            var val = cmd.ExecuteScalar();
            return val == DBNull.Value ? 0 : val ?? 0;
        }

        public Dictionary<string, object>? QuerySingle(string sql, Dictionary<string, object>? parameters = null)
        {
            var results = QueryAll(sql, parameters);
            return results.Count > 0 ? results[0] : null;
        }

        // --- SETTINGS ---
        public Dictionary<string, object> GetSettings()
        {
            var rows = QueryAll("SELECT key, value FROM settings");
            var settings = new Dictionary<string, object>();
            foreach (var row in rows)
            {
                settings[row["key"].ToString()!] = row["value"];
            }
            return settings;
        }

        // --- STUDENTS ---
        public List<Dictionary<string, object>> GetStudents()
        {
            return QueryAll("SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.status = 'active' ORDER BY s.name", null);
        }

        public Dictionary<string, object>? GetStudent(int id)
        {
            return QueryOne("SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.id = @id", new Dictionary<string, object> { { "@id", id } });
        }

        public List<Dictionary<string, object>> GetWithdrawnStudents()
        {
            return QueryAll("SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.status IN ('withdrawn', 'struck-off') ORDER BY s.name", null);
        }

        // --- ATTENDANCE ---
        public List<Dictionary<string, object>> GetAttendance(string date)
        {
            return QueryAll("SELECT a.*, s.name as student_name FROM attendances a LEFT JOIN students s ON a.student_id = s.id WHERE a.attendance_date = @date", new Dictionary<string, object> { { "@date", date } });
        }

        // --- EXPENSES ---
        public List<Dictionary<string, object>> GetExpenses()
        {
            return QueryAll("SELECT * FROM expenses ORDER BY date DESC");
        }

        // --- POS & SALES ---
        public List<Dictionary<string, object>> GetInvoices()
        {
            return QueryAll(@"
                SELECT 
                    COALESCE(invoice_no, 'INV-OLD-' || id) as invoice_no, 
                    student_id, 
                    SUM(total_amount) as total, 
                    status, 
                    created_at, 
                    (SELECT name FROM students WHERE id = sales.student_id) as student_name 
                FROM sales 
                GROUP BY COALESCE(invoice_no, id) 
                ORDER BY id DESC");
        }

        // --- BANKS ---
        public List<Dictionary<string, object>> GetBanks()
        {
            return QueryAll("SELECT * FROM banks ORDER BY account_name ASC");
        }

        public object GetBankStats(string period = "all")
        {
            try {
                string where = "";
                string salesWhere = " WHERE status = 'paid'";
                string expWhere = "";
                string invWhere = "";

                if (period == "daily") {
                    where = " AND date(created_at) = date('now', 'localtime')";
                    salesWhere += " AND date = date('now', 'localtime')";
                    expWhere = " WHERE date = date('now', 'localtime')";
                    invWhere = " WHERE date(created_at) = date('now', 'localtime')";
                } else if (period == "weekly") {
                    where = " AND date(created_at) >= date('now', 'localtime', '-7 days')";
                    salesWhere += " AND date >= date('now', 'localtime', '-7 days')";
                    expWhere = " WHERE date >= date('now', 'localtime', '-7 days')";
                    invWhere = " WHERE date(created_at) >= date('now', 'localtime', '-7 days')";
                } else if (period == "monthly") {
                    where = " AND date(created_at) >= date('now', 'localtime', '-30 days')";
                    salesWhere += " AND date >= date('now', 'localtime', '-30 days')";
                    expWhere = " WHERE date >= date('now', 'localtime', '-30 days')";
                    invWhere = " WHERE date(created_at) >= date('now', 'localtime', '-30 days')";
                } else if (period == "annually") {
                    where = " AND strftime('%Y', created_at) = strftime('%Y', 'now', 'localtime')";
                    salesWhere += " AND strftime('%Y', date) = strftime('%Y', 'now', 'localtime')";
                    expWhere = " WHERE strftime('%Y', date) = strftime('%Y', 'now', 'localtime')";
                    invWhere = " WHERE strftime('%Y', created_at) = strftime('%Y', 'now', 'localtime')";
                }

                double admission = Convert.ToDouble(ExecuteScalar($"SELECT SUM(credit) FROM fees WHERE (type LIKE '%admission%' OR description LIKE '%Admission%') {where}") ?? 0.0);
                double tuition = Convert.ToDouble(ExecuteScalar($"SELECT SUM(credit) FROM fees WHERE sale_id IS NULL AND type NOT IN ('inventory', 'pos', 'POS') AND NOT (type LIKE '%admission%' OR description LIKE '%Admission%') {where}") ?? 0.0);
                double posSales = Convert.ToDouble(ExecuteScalar($"SELECT SUM(total_amount) FROM sales {salesWhere}") ?? 0.0);
                
                double costOfSoldItems = Convert.ToDouble(ExecuteScalar($"SELECT SUM(s.qty * i.purchase_price) FROM sales s LEFT JOIN inventories i ON s.inventory_id = i.id {salesWhere.Replace("WHERE", "WHERE s.")}") ?? 0.0);
                
                string salaryWhere = "";
                if (period == "daily") {
                    salaryWhere = " WHERE date(payment_date) = date('now', 'localtime')";
                } else if (period == "weekly") {
                    salaryWhere = " WHERE date(payment_date) >= date('now', 'localtime', '-7 days')";
                } else if (period == "monthly") {
                    salaryWhere = " WHERE date(payment_date) >= date('now', 'localtime', '-30 days')";
                } else if (period == "annually") {
                    salaryWhere = " WHERE strftime('%Y', payment_date) = strftime('%Y', 'now', 'localtime')";
                }

                double salaries = Convert.ToDouble(ExecuteScalar($"SELECT SUM(net_paid) FROM salary_payments {salaryWhere}") ?? 0.0);
                double totalPurchases = Convert.ToDouble(ExecuteScalar($"SELECT SUM(qty * purchase_price) FROM inventories {invWhere}") ?? 0.0);
                double expenses = Convert.ToDouble(ExecuteScalar($"SELECT SUM(amount) FROM expenses {expWhere}") ?? 0.0) + salaries;

                double posProfit = posSales - costOfSoldItems;
                int bankCount = Convert.ToInt32(ExecuteScalar("SELECT COUNT(*) FROM banks") ?? 0);
                double netBalance = bankCount > 0 
                    ? Convert.ToDouble(ExecuteScalar("SELECT SUM(balance) FROM banks") ?? 0.0)
                    : (tuition + admission + posSales) - expenses;

                return new {
                    tuition,
                    admission,
                    posSales,
                    posProfit,
                    totalPurchases,
                    expenses,
                    netBalance
                };
            }
            catch (Exception ex) {
                System.Diagnostics.Debug.WriteLine("Bank stats error: " + ex.Message);
                return new { tuition = 0.0, admission = 0.0, posSales = 0.0, posProfit = 0.0, totalPurchases = 0.0, expenses = 0.0, netBalance = 0.0 };
            }
        }

        public object CreateBank(Dictionary<string, object> d)
        {
            try {
                string uuid = "bank_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                string bankName = d.ContainsKey("bank_name") ? d["bank_name"]?.ToString() ?? "" : "";
                string accountTitle = d.ContainsKey("account_title") ? d["account_title"]?.ToString() ?? "" : "";
                string accountNumber = d.ContainsKey("account_number") ? d["account_number"]?.ToString() ?? "" : "";
                double balance = d.ContainsKey("balance") ? Convert.ToDouble(d["balance"] ?? 0) : 0;

                int rows = Execute("INSERT INTO banks (uuid, account_name, account_number, bank_name, balance) VALUES (@uuid, @title, @number, @name, @bal)", new Dictionary<string, object> {
                    { "@uuid", uuid },
                    { "@title", accountTitle },
                    { "@number", accountNumber },
                    { "@name", bankName },
                    { "@bal", balance }
                });
                return new { success = rows > 0 };
            }
            catch (Exception ex) {
                return new { success = false, error = ex.Message };
            }
        }

        public object UpdateBank(Dictionary<string, object> d)
        {
            try {
                int id = d.ContainsKey("id") ? Convert.ToInt32(d["id"]) : 0;
                string bankName = d.ContainsKey("bank_name") ? d["bank_name"]?.ToString() ?? "" : "";
                string accountTitle = d.ContainsKey("account_title") ? d["account_title"]?.ToString() ?? "" : "";
                string accountNumber = d.ContainsKey("account_number") ? d["account_number"]?.ToString() ?? "" : "";

                int rows = Execute("UPDATE banks SET account_name=@title, account_number=@number, bank_name=@name WHERE id=@id", new Dictionary<string, object> {
                    { "@title", accountTitle },
                    { "@number", accountNumber },
                    { "@name", bankName },
                    { "@id", id }
                });
                return new { success = rows > 0 };
            }
            catch (Exception ex) {
                return new { success = false, error = ex.Message };
            }
        }

        public object DeleteBank(int id)
        {
            try {
                int rows = Execute("DELETE FROM banks WHERE id=@id", new Dictionary<string, object> { { "@id", id } });
                return new { success = rows > 0 };
            }
            catch (Exception ex) {
                return new { success = false, error = ex.Message };
            }
        }

        public object CreateBankTransaction(Dictionary<string, object> d)
        {
            try {
                string uuid = "tx_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                int bankId = d.ContainsKey("bank_id") ? Convert.ToInt32(d["bank_id"] ?? 0) : 0;
                string type = d.ContainsKey("type") ? d["type"]?.ToString() ?? "deposit" : "deposit";
                double amount = d.ContainsKey("amount") ? Convert.ToDouble(d["amount"] ?? 0) : 0;
                string description = d.ContainsKey("description") ? d["description"]?.ToString() ?? "" : "";
                string date = d.ContainsKey("date") ? d["date"]?.ToString() ?? DateTime.Now.ToString("yyyy-MM-dd") : DateTime.Now.ToString("yyyy-MM-dd");

                string op = type == "deposit" ? "+" : "-";
                Execute($"UPDATE banks SET balance = balance {op} @amount WHERE id = @id", new Dictionary<string, object> {
                    { "@amount", amount },
                    { "@id", bankId }
                });

                int rows = Execute("INSERT INTO bank_transactions (uuid, bank_id, type, amount, description, date) VALUES (@uuid, @bid, @type, @amount, @desc, @date)", new Dictionary<string, object> {
                    { "@uuid", uuid },
                    { "@bid", bankId },
                    { "@type", type },
                    { "@amount", amount },
                    { "@desc", description },
                    { "@date", date }
                });
                return new { success = rows > 0 };
            }
            catch (Exception ex) {
                return new { success = false, error = ex.Message };
            }
        }

        // --- SESSIONS ---
        public object GetSessionOverview(int sessionId)
        {
            var students = ExecuteScalar("SELECT COUNT(*) FROM students WHERE session_id=@id", new Dictionary<string, object> { { "@id", sessionId } });
            var revenue = ExecuteScalar("SELECT SUM(credit) FROM fees WHERE student_id IN (SELECT id FROM students WHERE session_id=@id)", new Dictionary<string, object> { { "@id", sessionId } });
            var classes = ExecuteScalar("SELECT COUNT(DISTINCT class_id) FROM students WHERE session_id=@id", new Dictionary<string, object> { { "@id", sessionId } });

            return new { 
                totalStudents = students, 
                totalRevenue = revenue,
                classCount = classes
            };
        }

        public object CreateSession(Dictionary<string, object> d)
        {
            try {
                string uuid = "sess_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                string name = d.ContainsKey("name") ? d["name"]?.ToString() ?? "" : "";
                int start = d.ContainsKey("start_year") ? Convert.ToInt32(d["start_year"] ?? 0) : 0;
                int end = d.ContainsKey("end_year") ? Convert.ToInt32(d["end_year"] ?? 0) : 0;
                int active = d.ContainsKey("is_active") && Convert.ToBoolean(d["is_active"]) ? 1 : 0;

                Execute(@"INSERT INTO sessions (uuid, name, start_year, end_year, is_active) 
                          VALUES (@uuid, @name, @start, @end, @active)",
                    new Dictionary<string, object> {
                        { "@uuid", uuid },
                        { "@name", name },
                        { "@start", start },
                        { "@end", end },
                        { "@active", active }
                    });
                var row = QueryOne("SELECT id FROM sessions WHERE uuid=@u", new Dictionary<string, object> { { "@u", uuid } });
                return new { success = true, id = row?["id"] };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        public object SetActiveSession(int id)
        {
            try {
                Execute("UPDATE sessions SET is_active = 0", null);
                Execute("UPDATE sessions SET is_active = 1 WHERE id = @id", new Dictionary<string, object> { { "@id", id } });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        public object DeleteSession(int id)
        {
            try {
                Execute("DELETE FROM sessions WHERE id = @id", new Dictionary<string, object> { { "@id", id } });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        // --- EXAMS ---
        public List<Dictionary<string, object>> GetExams()
        {
            return QueryAll("SELECT * FROM exams ORDER BY created_at DESC");
        }

        // --- TRANSPORT ---
        public List<Dictionary<string, object>> GetTransportRoutes()
        {
            return QueryAll("SELECT * FROM transport_routes ORDER BY name");
        }

        // --- GLOBAL SEARCH ---
        public List<Dictionary<string, object>> GlobalSearch(string q)
        {
            return QueryAll(@"
                SELECT id, name, roll_no, picture, 'student' as type FROM students WHERE name LIKE @q OR roll_no LIKE @q
                UNION
                SELECT id, name, designation as roll_no, picture, 'staff' as type FROM staff WHERE name LIKE @q
                LIMIT 10", new Dictionary<string, object> { { "@q", "%" + q + "%" } });
        }
        // --- STRONG CALCULATIONS (C# PORT) ---

        public decimal GetStudentBalance(int studentId)
        {
            var result = QueryOne("SELECT SUM(debit - credit) as balance FROM fees WHERE student_id = @id", 
                new Dictionary<string, object> { { "@id", studentId } });
            return result?["balance"] == DBNull.Value ? 0 : Convert.ToDecimal(result?["balance"] ?? 0);
        }

        public List<Dictionary<string, object>> GetStudentLedger(int studentId)
        {
            return QueryAll("SELECT * FROM fees WHERE student_id = @id ORDER BY created_at DESC", 
                new Dictionary<string, object> { { "@id", studentId } });
        }

        public List<Dictionary<string, object>> GetFees()
        {
            return QueryAll(@"SELECT f.*, s.name as student_name, s.roll_no 
                              FROM fees f 
                              LEFT JOIN students s ON f.student_id = s.id 
                              ORDER BY f.created_at DESC", null);
        }

        public object CollectFee(Dictionary<string, object> d)
        {
            try
            {
                string uuid = "fee_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                string currentMonth = DateTime.Now.ToString("MMMM yyyy");
                
                Execute(@"INSERT INTO fees (uuid, student_id, amount, debit, credit, status, description, type, month, created_at) 
                          VALUES (@uuid, @sid, @amt, @deb, @cre, @status, @desc, @type, @month, datetime('now', 'localtime'))",
                    new Dictionary<string, object> {
                        { "@uuid", uuid },
                        { "@sid", Convert.ToInt32(d["student_id"]) },
                        { "@amt", Convert.ToDecimal(d["amount"]) },
                        { "@deb", Convert.ToDecimal(d["debit"]) },
                        { "@cre", Convert.ToDecimal(d["credit"]) },
                        { "@status", d["status"]?.ToString() ?? "unpaid" },
                        { "@desc", d["description"]?.ToString() ?? "Fee Transaction" },
                        { "@type", d["type"]?.ToString() ?? "tuition" },
                        { "@month", d["month"]?.ToString() ?? currentMonth }
                    });
                return new { success = true };
            }
            catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        public object GenerateMonthlyFees()
        {
            try
            {
                string currentMonth = DateTime.Now.ToString("MMMM yyyy");
                
                // Check if already generated
                var lastGen = QueryOne("SELECT value FROM settings WHERE key = 'last_fee_generation_month'");
                if (lastGen != null && lastGen["value"].ToString() == currentMonth) 
                    return new { success = true, message = "Already generated for this month" };

                var students = QueryAll("SELECT id, monthly_fee, concession FROM students WHERE status = 'active'");
                int count = 0;
                
                foreach (var s in students)
                {
                    decimal fee = Convert.ToDecimal(s["monthly_fee"] ?? 0);
                    decimal concession = Convert.ToDecimal(s["concession"] ?? 0);
                    decimal netFee = Math.Max(0, fee - concession);

                    if (netFee > 0)
                    {
                        // Check if already exists for this student/month
                        var exists = QueryOne("SELECT id FROM fees WHERE student_id = @sid AND month = @m AND type = 'tuition'", 
                            new Dictionary<string, object> { { "@sid", s["id"] }, { "@m", currentMonth } });

                        if (exists == null)
                        {
                            Execute(@"INSERT INTO fees (uuid, student_id, amount, debit, credit, status, description, type, month, created_at) 
                                      VALUES (@uuid, @sid, @amt, @amt, 0, 'unpaid', @desc, 'tuition', @m, datetime('now', 'localtime'))",
                                new Dictionary<string, object> {
                                    { "@uuid", "fee_" + Guid.NewGuid().ToString("N").Substring(0, 8) },
                                    { "@sid", s["id"] },
                                    { "@amt", netFee },
                                    { "@desc", $"Monthly Fee - {currentMonth}" },
                                    { "@m", currentMonth }
                                });
                            count++;
                        }
                    }
                }

                Execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_fee_generation_month', @m)", 
                    new Dictionary<string, object> { { "@m", currentMonth } });

                return new { success = true, count };
            }
            catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }
        public object GetMonthlyRevenue()
        {
            try
            {
                var year = DateTime.Now.Year.ToString();
                var months = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
                var revenue = new Dictionary<string, decimal>();

                for (int i = 0; i < 12; i++)
                {
                    string m = (i + 1).ToString("D2");
                    
                    // Monthly POS Sales
                    var pos = Convert.ToDecimal(ExecuteScalar("SELECT SUM(total_amount) FROM sales WHERE strftime('%Y', date) = @y AND strftime('%m', date) = @m AND status = 'paid'",
                        new Dictionary<string, object> { { "@y", year }, { "@m", m } }) ?? 0);
                        
                    // Monthly Fees
                    var fees = Convert.ToDecimal(ExecuteScalar("SELECT SUM(credit) FROM fees WHERE strftime('%Y', created_at) = @y AND strftime('%m', created_at) = @m",
                        new Dictionary<string, object> { { "@y", year }, { "@m", m } }) ?? 0);

                    revenue[months[i]] = pos + fees;
                }
                return revenue;
            }
            catch { return new Dictionary<string, decimal>(); }
        }

        public List<Dictionary<string, object>> GetDiaryEntries()
        {
            return QueryAll(@"
                SELECT d.*, c.name as class_name 
                FROM diary d 
                JOIN class_infos c ON d.class_id = c.id 
                ORDER BY d.entry_date DESC, d.id DESC");
        }

        public object CreateDiaryEntry(JToken? d)
        {
            if (d == null || d.Type == JTokenType.Null) return new { success = false };
            try {
                Execute("INSERT INTO diary (class_id, subject, content, entry_date) VALUES (@cid, @sub, @content, @date)",
                    new Dictionary<string, object> {
                        { "@cid", Convert.ToInt32(d["class_id"] ?? 0) },
                        { "@sub", d["subject"]?.ToString() ?? "" },
                        { "@content", d["content"]?.ToString() ?? "" },
                        { "@date", d["entry_date"]?.ToString() ?? DateTime.Now.ToString("yyyy-MM-dd") }
                    });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        public List<Dictionary<string, object>> GetDailyCollection(string date)
        {
            return QueryAll(@"
                SELECT f.*, s.name as student_name 
                FROM fees f 
                JOIN students s ON f.student_id = s.id 
                WHERE f.credit > 0 AND f.created_at LIKE @date 
                ORDER BY f.created_at ASC", new Dictionary<string, object> { { "@date", date + "%" } });
        }
    }
}
