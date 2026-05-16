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
            
            // Create all tables if they don't exist
            string[] tables = {
                "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);",
                "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), role TEXT DEFAULT 'staff', permissions TEXT DEFAULT '[]');",
                "CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT);",
                "CREATE TABLE IF NOT EXISTS class_infos (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, uuid TEXT UNIQUE NOT NULL, created_at TEXT DEFAULT (datetime('now')));",
                "CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, roll_no TEXT UNIQUE NOT NULL, class_id INTEGER, guardian_name TEXT, contact_number TEXT, monthly_fee REAL DEFAULT 0, admission_fee REAL DEFAULT 0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')), picture TEXT, gender TEXT DEFAULT 'Male', concession REAL DEFAULT 0, family_no TEXT, session_id INTEGER, blood_group TEXT, dob TEXT, religion TEXT DEFAULT 'Islam', address TEXT);",
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
                "CREATE TABLE IF NOT EXISTS diary (id INTEGER PRIMARY KEY AUTOINCREMENT, class_id INTEGER NOT NULL, subject TEXT, content TEXT, entry_date TEXT, created_at TEXT DEFAULT (datetime('now')));"
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
            try { Execute("ALTER TABLE sessions ADD COLUMN end_year INTEGER;"); } catch { }
            try { Execute("ALTER TABLE sessions ADD COLUMN is_active INTEGER DEFAULT 0;"); } catch { }
            try { Execute("ALTER TABLE sessions ADD COLUMN created_at TEXT DEFAULT (datetime('now'));"); } catch { }
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
            var totalStudents = ExecuteScalar("SELECT COUNT(*) FROM students WHERE status = 'active'");
            var totalTeachers = ExecuteScalar("SELECT COUNT(*) FROM staff WHERE designation LIKE '%Teacher%'");
            var pendingFees = ExecuteScalar("SELECT SUM(debit - credit) FROM fees");

            return new { 
                total_students = totalStudents, 
                total_teachers = totalTeachers,
                pending_fees = pendingFees
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
            return QueryAll("SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.status != 'deleted' ORDER BY s.name");
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
            // Simplified for now, but following the same logic as main.js
            var tuition = ExecuteScalar("SELECT SUM(credit) FROM fees WHERE type NOT IN ('inventory', 'pos')");
            var admission = ExecuteScalar("SELECT SUM(credit) FROM fees WHERE type LIKE '%admission%'");
            var expenses = ExecuteScalar("SELECT SUM(amount) FROM expenses");
            
            return new { tuition, admission, expenses, netBalance = (Convert.ToDouble(tuition) + Convert.ToDouble(admission)) - Convert.ToDouble(expenses) };
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
