using System;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Microsoft.Data.Sqlite;
using System.IO.Ports;
using System.Collections.Generic;
using System.Linq;

namespace SMS_CS_Desktop
{
    public partial class MainWindow : Window
    {
        private DatabaseHelper _db;

        public MainWindow()
        {
            InitializeComponent();
            // Point directly to the project's database folder
            string dbPath = @"E:\School Management System\database\database.sqlite";
            _db = new DatabaseHelper(dbPath);
            InitializeWebView();
            
            // Auto-generate fees for the current month on startup (Strong C# Logic)
            Task.Run(() => _db.GenerateMonthlyFees());
        }

        async void InitializeWebView()
        {
            await webView.EnsureCoreWebView2Async(null);
            
            // AUTOMATIC BRIDGE INJECTION
            await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(@"
                window.api = {
                    _requests: {},
                    _id: 0,
                    call: function(action, payload = {}) {
                        return new Promise((resolve, reject) => {
                            const id = ++this._id;
                            this._requests[id] = { resolve, reject };
                            window.chrome.webview.postMessage(JSON.stringify({ id, action, payload }));
                        });
                    },
                    // Mapped methods
                    getDashboardStats: () => window.api.call('get-dashboard-stats'),
                    getStudents: () => window.api.call('get-students'),
                    getAttendance: (date) => window.api.call('get-attendance', { date }),
                    getSettings: () => window.api.call('get-settings'),
                    getExpenses: () => window.api.call('get-expenses'),
                    getInvoices: () => window.api.call('get-invoices'),
                    getBanks: () => window.api.call('get-banks'),
                    getBankStats: (period) => window.api.call('get-bank-stats', { period }),
                    getExams: () => window.api.call('get-exams'),
                    getTransportRoutes: () => window.api.call('get-transport-routes'),
                    globalSearch: (q) => window.api.call('global-search', { q }),
                    register: (data) => window.api.call('register', data),
                    login: (creds) => window.api.call('login', creds),
                    getClasses: () => window.api.call('get-classes'),
                    createStudent: (data) => window.api.call('create-student', data),
                    getFees: () => window.api.call('get-fees'),
                    collectFee: (data) => window.api.call('collect-fee', data),
                    updateStudent: (data) => window.api.call('update-student', data),
                    updateStudent: (data) => window.api.call('update-student', data),
                    getUsers: () => window.api.call('get-users'),
                    createUser: (data) => window.api.call('create-user', data),
                    updateUser: (data) => window.api.call('update-user', data),
                    deleteUser: (id) => window.api.call('delete-user', { id }),
                    getStudentLedger: (id) => window.api.call('get-student-ledger', { id }),
                    getStudentBalance: (id) => window.api.call('get-student-balance', { id }),
                    generateMonthlyFees: () => window.api.call('generate-monthly-fees'),
                    getMonthlyRevenue: () => window.api.call('get-monthly-revenue'),
                    getStaff: () => window.api.call('get-staff'),
                    createStaff: (data) => window.api.call('create-staff', data),
                    updateStaff: (data) => window.api.call('update-staff', data),
                    deleteStaff: (id) => window.api.call('delete-staff', { id }),
                    getInventory: () => window.api.call('get-inventory'),
                    createInventory: (data) => window.api.call('create-inventory', data),
                    updateInventory: (data) => window.api.call('update-inventory', data),
                    deleteInventory: (id) => window.api.call('delete-inventory', { id }),
                    getReminders: () => window.api.call('get-reminders'),
                    createReminder: (data) => window.api.call('create-reminder', data),
                    deleteReminder: (id) => window.api.call('delete-reminder', { id }),
                    getSessions: () => window.api.call('get-sessions'),
                    getSessionOverview: (id) => window.api.call('get-session-overview', { id }),
                    createSession: (data) => window.api.call('create-session', data),
                    setActiveSession: (id) => window.api.call('set-active-session', { id }),
                    deleteSession: (id) => window.api.call('delete-session', { id }),
                    saveSettings: (data) => window.api.call('save-settings', data),
                    getStudentBiodata: (id) => window.api.call('get-student-biodata', { id }),
                    checkoutCart: (data) => window.api.call('checkout-cart', data),
                    getInvoices: () => window.api.call('get-invoices'),
                    getInvoiceDetails: (id) => window.api.call('get-invoice-details', { id }),
                    saveAttendance: (data) => window.api.call('save-attendance', data),
                    getMonthlyAttendance: (data) => window.api.call('get-monthly-attendance', data),
                    getExamResults: (data) => window.api.call('get-exam-results', data),
                    saveExamResult: (data) => window.api.call('save-exam-result', data),
                    getStudentDmc: (data) => window.api.call('get-student-dmc', data),
                    getBankTransactions: (id) => window.api.call('get-bank-transactions', { id }),
                    createBankTransaction: (data) => window.api.call('create-bank-transaction', data),
                    getTimetable: (classId) => window.api.call('get-timetable', { classId }),
                    createTimetableItem: (data) => window.api.call('create-timetable-item', data),
                    deleteTimetableItem: (id) => window.api.call('delete-timetable-item', { id }),
                    uploadStudentPicture: () => window.api.call('upload-student-picture', {}),
                    getStudentPictureUrl: (fileName) => window.api.call('get-student-picture-url', { fileName }),
                    getStudentBiodata: (id) => window.api.call('get-student-biodata', { id }),
                    getTeachers: () => window.api.call('get-teachers', {}),
                    deleteTeacher: (id) => window.api.call('delete-staff', { id }),
                    getStudentDocuments: (id) => window.api.call('get-student-documents', { id }),
                    uploadStudentDocument: (data) => window.api.call('upload-student-document', data),
                    deleteDocument: (id) => window.api.call('delete-document', { id }),
                    openDocument: (fileName) => window.api.call('open-document', { fileName }),
                    getDocumentUrl: (fileName) => window.api.call('get-document-url', { fileName }),
                    getDailyCollection: (date) => window.api.call('get-daily-collection', date),
                    openUrl: (url) => window.api.call('open-url', url),
                    getDiaryEntries: () => window.api.call('get-diary-entries'),
                    createDiaryEntry: (data) => window.api.call('create-diary-entry', data),
                    deleteDiaryEntry: (id) => window.api.call('delete-diary-entry', { id }),
                    getDbPath: () => window.api.call('get-db-path'),
                    createClass: (data) => window.api.call('create-class', data),
                    updateClass: (data) => window.api.call('update-class', data),
                    deleteClass: (id) => window.api.call('delete-class', { id }),
                    getSubjects: (classId) => window.api.call('get-subjects', { classId }),
                    saveSubject: (data) => window.api.call('save-subject', data),
                    deleteSubject: (id) => window.api.call('delete-subject', { id })
                };

                window.onCSharpResponse = function(response) {
                    const req = window.api._requests[response.id];
                    if (req) {
                        if (response.success) req.resolve(response.data);
                        else req.reject(response.error);
                        delete window.api._requests[response.id];
                    }
                };
            ");

            // Map the src folder directly to a virtual host for development
            // This ensures all changes in the project folder reflect immediately
            string projectRoot = @"e:\School Management System\src";
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.sms", projectRoot, CoreWebView2HostResourceAccessKind.Allow);

            webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            
            // The file is in the 'pages' subfolder
            webView.Source = new Uri("http://app.sms/pages/gateway.html");
        }

        private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            var message = e.TryGetWebMessageAsString();
            if (string.IsNullOrEmpty(message)) return;

            try
            {
                var request = JObject.Parse(message);
                string action = request["action"]?.ToString() ?? "";
                var payload = request["payload"];
                string requestId = request["id"]?.ToString() ?? "";

                await webView.CoreWebView2.ExecuteScriptAsync($"console.log('C# -> Received Request: {action}')");

                object result = await Task.Run(() => HandleAction(action, payload));

                var response = new { id = requestId, success = true, data = result };
                await webView.CoreWebView2.ExecuteScriptAsync($"console.log('C# -> Sending Response for: {action}')");
                await webView.CoreWebView2.ExecuteScriptAsync($"window.onCSharpResponse({JsonConvert.SerializeObject(response)})");
            }
            catch (Exception ex)
            {
                await webView.CoreWebView2.ExecuteScriptAsync($"console.error('C# Error: {ex.Message}')");
            }
        }

        private object HandleAction(string action, JToken? payload)
        {
            return action switch
            {
                "get-dashboard-stats" => _db.GetDashboardStats(),
                "get-students" => _db.GetStudents(),
                "get-attendance" => _db.GetAttendance(payload?["date"]?.ToString() ?? ""),
                "get-settings" => _db.GetSettings(),
                "get-expenses" => _db.GetExpenses(),
                "get-invoices" => _db.GetInvoices(),
                "get-banks" => _db.GetBanks(),
                "get-bank-stats" => _db.GetBankStats(payload?["period"]?.ToString() ?? "all"),
                "get-exams" => _db.GetExams(),
                "get-transport-routes" => _db.GetTransportRoutes(),
                "global-search" => _db.GlobalSearch(payload?["q"]?.ToString() ?? ""),
                "register" => Register(payload),
                "login" => Login(payload?["schoolId"]?.ToString(), payload?["masterKey"]?.ToString()),
                "get-classes" => _db.QueryAll("SELECT * FROM class_infos ORDER BY id"),
                "create-student" => CreateStudent(payload),
                "get-fees" => _db.GetFees(),
                "collect-fee" => _db.CollectFee(payload?.ToObject<Dictionary<string, object>>() ?? new Dictionary<string, object>()),
                "update-student" => UpdateStudent(payload),
                "get-users" => _db.QueryAll("SELECT id, name, email, role, permissions, created_at FROM users ORDER BY created_at ASC"),
                "create-user" => CreateUser(payload),
                "update-user" => UpdateUser(payload),
                "delete-user" => DeleteUser(Convert.ToInt32(payload?["id"] ?? 0)),
                "get-student-balance" => _db.GetStudentBalance(Convert.ToInt32(payload?["id"] ?? 0)),
                "generate-monthly-fees" => _db.GenerateMonthlyFees(),
                "get-monthly-revenue" => _db.GetMonthlyRevenue(),
                "get-staff" => _db.QueryAll("SELECT * FROM staff ORDER BY name"),
                "get-teachers" => _db.QueryAll("SELECT * FROM staff ORDER BY name"),
                "send-sms" => SendGSMMessage(payload?["to"]?.ToString() ?? "", payload?["message"]?.ToString() ?? ""),
                "create-staff" => CreateStaff(payload),
                "update-staff" => UpdateStaff(payload),
                "delete-staff" => DeleteStaff(Convert.ToInt32(payload?["id"] ?? 0)),
                "get-inventory" => _db.QueryAll("SELECT * FROM inventories ORDER BY item_name"),
                "create-inventory" => CreateInventory(payload),
                "update-inventory" => UpdateInventory(payload),
                "delete-inventory" => _db.Execute("DELETE FROM inventories WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }),
                "get-reminders" => _db.QueryAll("SELECT * FROM reminders ORDER BY reminder_date ASC, id DESC"),
                "create-reminder" => CreateReminder(payload),
                "update-reminder-status" => _db.Execute("UPDATE reminders SET is_done=@status WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) }, { "@status", Convert.ToInt32(payload?["is_done"] ?? 0) } }),
                "delete-reminder" => _db.Execute("DELETE FROM reminders WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }),
                "get-sessions" => _db.QueryAll("SELECT * FROM sessions ORDER BY start_year DESC"),
                "get-session-overview" => _db.GetSessionOverview(Convert.ToInt32(payload?["id"] ?? 0)),
                "create-session" => _db.CreateSession(payload?.ToObject<Dictionary<string, object>>() ?? new Dictionary<string, object>()),
                "set-active-session" => _db.SetActiveSession(Convert.ToInt32(payload?["id"] ?? payload?.Value<int>() ?? 0)),
                "delete-session" => _db.DeleteSession(Convert.ToInt32(payload?["id"] ?? payload?.Value<int>() ?? 0)),
                "save-settings" => SaveSettings(payload),
                "save-attendance" => SaveAttendance(payload),
                "get-monthly-attendance" => GetMonthlyAttendance(payload),
                "get-db-path" => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SMS Connect", "database.sqlite"),
                "get-exam-results" => GetExamResults(payload),
                "save-exam-result" => SaveExamResult(payload),
                "get-student-dmc" => GetStudentDmc(payload),
                "get-bank-transactions" => _db.QueryAll("SELECT * FROM bank_transactions WHERE bank_id = @id ORDER BY created_at DESC", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }),
                "get-timetable" => GetTimetable(Convert.ToInt32(payload?["classId"] ?? 0)),
                "create-timetable-item" => CreateTimetableItem(payload),
                "delete-timetable-item" => _db.Execute("DELETE FROM timetable WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }),
                "upload-student-picture" => UploadStudentPicture(),
                "get-student-picture-url" => new { success = true, url = "http://app.sms/pictures/" + payload?["fileName"]?.ToString().Replace("pictures/", "") },
                "get-student-biodata" => GetStudentBiodata(Convert.ToInt32(payload?["id"] ?? 0)),
                "get-student-documents" => _db.QueryAll("SELECT * FROM student_documents WHERE student_id=@id ORDER BY created_at DESC", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }),
                "upload-student-document" => UploadStudentDocument(payload),
                "delete-document" => _db.Execute("DELETE FROM student_documents WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }),
                "open-document" => OpenDocument(payload?["fileName"]?.ToString()),
                "get-document-url" => new { success = true, url = "http://app.sms/pictures/" + payload?["fileName"]?.ToString() },
                "open-url" => OpenUrl(payload?.ToString()),
                "get-daily-collection" => _db.GetDailyCollection(payload?.ToString() ?? ""),
                "get-diary-entries" => _db.GetDiaryEntries(),
                "create-diary-entry" => _db.CreateDiaryEntry(payload),
                "delete-diary-entry" => _db.Execute("DELETE FROM diary WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }),
                "create-class" => _db.Execute("INSERT INTO class_infos (name, uuid) VALUES (@name, @uuid)", new Dictionary<string, object> { { "@name", payload?["name"]?.ToString() ?? "" }, { "@uuid", Guid.NewGuid().ToString("N").Substring(0, 8) } }) > 0 ? new { success = true } : new { success = false },
                "update-class" => _db.Execute("UPDATE class_infos SET name=@name WHERE id=@id", new Dictionary<string, object> { { "@name", payload?["name"]?.ToString() ?? "" }, { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }) > 0 ? new { success = true } : new { success = false },
                "delete-class" => _db.Execute("DELETE FROM subjects WHERE class_id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }) >= 0 && _db.Execute("DELETE FROM class_infos WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }) > 0 ? new { success = true } : new { success = false },
                "get-subjects" => _db.QueryAll(payload?["classId"] != null ? "SELECT * FROM subjects WHERE class_id=@id ORDER BY name" : "SELECT * FROM subjects ORDER BY name", payload?["classId"] != null ? new Dictionary<string, object> { { "@id", Convert.ToInt32(payload["classId"]) } } : null),
                "save-subject" => _db.Execute("INSERT INTO subjects (class_id, name, total_marks) VALUES (@cid, @name, @marks)", new Dictionary<string, object> { { "@cid", Convert.ToInt32(payload?["class_id"] ?? 0) }, { "@name", payload?["name"]?.ToString() ?? "" }, { "@marks", Convert.ToDouble(payload?["total_marks"] ?? 100) } }) > 0 ? new { success = true } : new { success = false },
                "delete-subject" => _db.Execute("DELETE FROM subjects WHERE id=@id", new Dictionary<string, object> { { "@id", Convert.ToInt32(payload?["id"] ?? 0) } }) > 0 ? new { success = true } : new { success = false },
                _ => new { error = "Action not yet implemented in C#: " + action }
            };
        }

        private object UploadStudentDocument(JToken? d)
        {
            if (d == null) return new { success = false };
            try {
                var dialog = new Microsoft.Win32.OpenFileDialog { Title = "Select Document" };
                if (dialog.ShowDialog() == true) {
                    string fileName = Guid.NewGuid().ToString("N") + Path.GetExtension(dialog.FileName);
                    string targetDir = @"e:\School Management System\src\pictures";
                    if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);
                    File.Copy(dialog.FileName, Path.Combine(targetDir, fileName));
                    
                    _db.Execute("INSERT INTO student_documents (student_id, title, file_name, file_type) VALUES (@sid, @title, @file, @type)",
                        new Dictionary<string, object> {
                            { "@sid", Convert.ToInt32(d["studentId"] ?? 0) },
                            { "@title", d["title"]?.ToString() ?? "" },
                            { "@file", fileName },
                            { "@type", Path.GetExtension(dialog.FileName).ToLower() }
                        });
                    return new { success = true };
                }
                return new { success = false };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object OpenDocument(string? fileName)
        {
            if (string.IsNullOrEmpty(fileName)) return new { success = false };
            try {
                string path = Path.Combine(@"e:\School Management System\src\pictures", fileName);
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(path) { UseShellExecute = true });
                return new { success = true };
            } catch { return new { success = false }; }
        }

        private object GetStudentBiodata(int id)
        {
            try {
                var student = _db.QuerySingle("SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.id=@id", new Dictionary<string, object> { { "@id", id } });
                if (student == null) return new { error = "Student not found." };

                var siblings = new List<Dictionary<string, object>>();
                try {
                    var familyNo = student["family_no"]?.ToString();
                    if (!string.IsNullOrEmpty(familyNo)) {
                        siblings = _db.QueryAll("SELECT s.id, s.name, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.family_no=@fn AND s.id != @id", 
                            new Dictionary<string, object> { { "@fn", familyNo }, { "@id", id } });
                    }
                } catch { }

                // Attendance
                int attTotal = 0, attPresent = 0, attPct = 0;
                try {
                    attTotal = Convert.ToInt32(_db.ExecuteScalar("SELECT COUNT(*) FROM attendances WHERE student_id=@id", new Dictionary<string, object> { { "@id", id } }) ?? 0);
                    attPresent = Convert.ToInt32(_db.ExecuteScalar("SELECT COUNT(*) FROM attendances WHERE student_id=@id AND status='present'", new Dictionary<string, object> { { "@id", id } }) ?? 0);
                    attPct = attTotal > 0 ? (attPresent * 100 / attTotal) : 0;
                } catch { }

                // Finance
                var ledger = new List<Dictionary<string, object>>();
                double totalDebit = 0, totalCredit = 0, balance = 0;
                try {
                    ledger = _db.QueryAll("SELECT * FROM fees WHERE student_id=@id ORDER BY created_at DESC LIMIT 10", new Dictionary<string, object> { { "@id", id } });
                    totalDebit = Convert.ToDouble(_db.ExecuteScalar("SELECT SUM(debit) FROM fees WHERE student_id=@id", new Dictionary<string, object> { { "@id", id } }) ?? 0);
                    totalCredit = Convert.ToDouble(_db.ExecuteScalar("SELECT SUM(credit) FROM fees WHERE student_id=@id", new Dictionary<string, object> { { "@id", id } }) ?? 0);
                    balance = totalDebit - totalCredit;
                } catch { }

                // Academic
                var examResults = new List<Dictionary<string, object>>();
                try {
                    examResults = _db.QueryAll(@"SELECT r.*, e.name as exam_name FROM exam_results r 
                                                    JOIN exams e ON r.exam_id = e.id 
                                                    WHERE r.student_id=@id ORDER BY e.created_at DESC", 
                                                    new Dictionary<string, object> { { "@id", id } });
                    foreach(var r in examResults) {
                        double t = Convert.ToDouble(r["total_marks"] ?? 0);
                        double o = Convert.ToDouble(r["obtained_marks"] ?? 0);
                        r["percentage"] = t > 0 ? Math.Round(o * 100 / t) : 0;
                    }
                } catch { }

                return new {
                    student,
                    siblings,
                    attTotal, attPresent, attPct,
                    ledger, totalDebit, totalCredit, balance,
                    examResults
                };
            } catch (Exception ex) { return new { error = ex.Message }; }
        }

        private object UploadStudentPicture()
        {
            try
            {
                var dialog = new Microsoft.Win32.OpenFileDialog
                {
                    Filter = "Image Files|*.jpg;*.jpeg;*.png;*.webp",
                    Title = "Select Student Picture"
                };

                if (dialog.ShowDialog() == true)
                {
                    string source = dialog.FileName;
                    string ext = Path.GetExtension(source);
                    string fileName = Guid.NewGuid().ToString("N") + ext;
                    
                    // Save to e:\School Management System\src\pictures folder
                    string targetDir = @"e:\School Management System\src\pictures";
                    if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);
                    
                    string targetPath = Path.Combine(targetDir, fileName);
                    File.Copy(source, targetPath);
                    
                    return new { success = true, fileName = fileName };
                }
                return new { success = false };
            }
            catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object GetTimetable(int classId)
        {
            try {
                return _db.QueryAll(@"SELECT t.*, s.name as teacher_name FROM timetable t 
                                     LEFT JOIN staff s ON t.teacher_id = s.id 
                                     WHERE t.class_id = @cid ORDER BY t.start_time ASC", 
                                     new Dictionary<string, object> { { "@cid", classId } });
            } catch {
                // Fallback if migration hasn't completed yet
                return _db.QueryAll("SELECT *, teacher as teacher_name FROM timetable WHERE class_id = @cid", new Dictionary<string, object> { { "@cid", classId } });
            }
        }

        private object CreateTimetableItem(JToken? d)
        {
            if (d == null) return new { success = false };
            try {
                _db.Execute(@"INSERT INTO timetable (class_id, day, subject, teacher_id, start_time, end_time) 
                              VALUES (@cid, @day, @sub, @tid, @start, @end)",
                    new Dictionary<string, object> {
                        { "@cid", Convert.ToInt32(d["class_id"] ?? 0) },
                        { "@day", d["day_of_week"]?.ToString() ?? "" },
                        { "@sub", d["subject_name"]?.ToString() ?? "" },
                        { "@tid", Convert.ToInt32(d["teacher_id"] ?? 0) },
                        { "@start", d["start_time"]?.ToString() ?? "" },
                        { "@end", d["end_time"]?.ToString() ?? "" }
                    });
            } catch {
                // Fallback to legacy column if teacher_id is missing
                _db.Execute(@"INSERT INTO timetable (class_id, day, subject, teacher, start_time, end_time) 
                              VALUES (@cid, @day, @sub, @teacher, @start, @end)",
                    new Dictionary<string, object> {
                        { "@cid", Convert.ToInt32(d["class_id"] ?? 0) },
                        { "@day", d["day_of_week"]?.ToString() ?? "" },
                        { "@sub", d["subject_name"]?.ToString() ?? "" },
                        { "@teacher", d["teacher_id"]?.ToString() ?? "" },
                        { "@start", d["start_time"]?.ToString() ?? "" },
                        { "@end", d["end_time"]?.ToString() ?? "" }
                    });
            }
            return new { success = true };
        }

        private object DeleteUser(int id)
        {
            if (id == 1) return new { success = false, error = "Cannot delete the main administrator account." };
            return _db.Execute("DELETE FROM users WHERE id=@id", new Dictionary<string, object> { { "@id", id } });
        }

        private object DeleteStaff(int id)
        {
            return _db.Execute("DELETE FROM staff WHERE id=@id", new Dictionary<string, object> { { "@id", id } });
        }

        private object CreateStaff(JToken? d)
        {
            if (d == null) return new { success = false };
            try {
                string uuid = "staff_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                _db.Execute(@"INSERT INTO staff (uuid, name, father_name, designation, salary, contact, cnic, address, joining_date, qualification) 
                              VALUES (@uuid, @name, @father, @designation, @salary, @contact, @cnic, @address, @hire, @edu)",
                    new Dictionary<string, object> {
                        { "@uuid", uuid },
                        { "@name", d["name"]?.ToString() ?? "" },
                        { "@father", d["father_name"]?.ToString() ?? "" },
                        { "@designation", d["designation"]?.ToString() ?? "" },
                        { "@salary", Convert.ToDouble(d["basic_salary"] ?? 0) },
                        { "@contact", d["contact"]?.ToString() ?? "" },
                        { "@cnic", d["cnic"]?.ToString() ?? "" },
                        { "@address", d["address"]?.ToString() ?? "" },
                        { "@hire", d["hire_date"]?.ToString() ?? "" },
                        { "@edu", d["qualification"]?.ToString() ?? "" }
                    });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object UpdateStaff(JToken? d)
        {
            if (d == null) return new { success = false };
            try {
                _db.Execute(@"UPDATE staff SET name=@name, father_name=@father, designation=@designation, salary=@salary, contact=@contact, cnic=@cnic, address=@address, joining_date=@hire, qualification=@edu WHERE id=@id",
                    new Dictionary<string, object> {
                        { "@id", Convert.ToInt32(d["id"] ?? 0) },
                        { "@name", d["name"]?.ToString() ?? "" },
                        { "@father", d["father_name"]?.ToString() ?? "" },
                        { "@designation", d["designation"]?.ToString() ?? "" },
                        { "@salary", Convert.ToDouble(d["basic_salary"] ?? 0) },
                        { "@contact", d["contact"]?.ToString() ?? "" },
                        { "@cnic", d["cnic"]?.ToString() ?? "" },
                        { "@address", d["address"]?.ToString() ?? "" },
                        { "@hire", d["hire_date"]?.ToString() ?? "" },
                        { "@edu", d["qualification"]?.ToString() ?? "" }
                    });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object CreateUser(JToken? d)
        {
            if (d == null) return new { success = false };
            try {
                string email = (d["email"]?.ToString() ?? "").Trim();
                string pass = (d["password"]?.ToString() ?? "").Trim();
                string hash = HashPassword(pass);
                
                _db.Execute("INSERT INTO users (name, email, password, role, permissions) VALUES (@name, @email, @pass, @role, @perms)",
                    new Dictionary<string, object> {
                        { "@name", (d["name"]?.ToString() ?? "").Trim() },
                        { "@email", email },
                        { "@pass", hash },
                        { "@role", (d["role"]?.ToString() ?? "staff").Trim() },
                        { "@perms", d["permissions"]?.ToString() ?? "[]" }
                    });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object UpdateUser(JToken? d)
        {
            if (d == null) return new { success = false };
            try {
                int id = Convert.ToInt32(d["id"] ?? 0);
                string email = (d["email"]?.ToString() ?? "").Trim();
                string role = (d["role"]?.ToString() ?? "staff").Trim();
                string name = (d["name"]?.ToString() ?? "").Trim();
                string perms = d["permissions"]?.ToString() ?? "[]";

                var parameters = new Dictionary<string, object> {
                    { "@id", id },
                    { "@name", name },
                    { "@email", email },
                    { "@role", role },
                    { "@perms", perms }
                };

                string pass = (d["password"]?.ToString() ?? "").Trim();
                if (!string.IsNullOrEmpty(pass)) {
                    parameters["@pass"] = HashPassword(pass);
                    _db.Execute("UPDATE users SET name=@name, email=@email, password=@pass, role=@role, permissions=@perms WHERE id=@id", parameters);
                } else {
                    _db.Execute("UPDATE users SET name=@name, email=@email, role=@role, permissions=@perms WHERE id=@id", parameters);
                }
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object CreateStudent(JToken? d)
        {
            if (d == null || d.Type == JTokenType.Null) return new { success = false };
            try {
                string uuid = Guid.NewGuid().ToString("N");
                _db.Execute(@"INSERT INTO students (uuid, name, roll_no, class_id, session_id, guardian_name, contact_number, monthly_fee, admission_fee, gender, concession, family_no, dob, blood_group, religion, address, picture) 
                              VALUES (@uuid, @name, @roll, @class, @session, @guardian, @contact, @fee, @adm, @gender, @concession, @family, @dob, @blood, @religion, @address, @pic)",
                    new Dictionary<string, object> {
                        { "@uuid", uuid },
                        { "@name", d?["name"]?.ToString() ?? "" },
                        { "@roll", d?["roll_no"]?.ToString() ?? "" },
                        { "@class", Convert.ToInt32(d?["class_id"] ?? 0) },
                        { "@session", Convert.ToInt32(d?["session_id"] ?? 0) },
                        { "@guardian", d?["guardian_name"]?.ToString() ?? "" },
                        { "@contact", d?["contact_number"]?.ToString() ?? "" },
                        { "@fee", Convert.ToDouble(d?["monthly_fee"] ?? 0) },
                        { "@adm", Convert.ToDouble(d?["admission_fee"] ?? 0) },
                        { "@gender", d?["gender"]?.ToString() ?? "Male" },
                        { "@concession", Convert.ToDouble(d?["concession"] ?? 0) },
                        { "@family", d?["family_no"]?.ToString() ?? "" },
                        { "@dob", d?["dob"]?.ToString() ?? "" },
                        { "@blood", d?["blood_group"]?.ToString() ?? "" },
                        { "@religion", d?["religion"]?.ToString() ?? "Islam" },
                        { "@address", d?["address"]?.ToString() ?? "" },
                        { "@pic", d?["picture"]?.ToString() ?? "" }
                    });

                // AUTO-GENERATE INITIAL FEES (Mirroring original logic)
                var student = _db.QueryOne("SELECT id FROM students WHERE uuid=@u", new Dictionary<string, object> { { "@u", uuid } });
                if (student != null)
                {
                    int studentId = Convert.ToInt32(student["id"]);
                    double admFee = Convert.ToDouble(d["admission_fee"] ?? 0);
                    double monthlyFee = Convert.ToDouble(d["monthly_fee"] ?? 0);
                    double concession = Convert.ToDouble(d["concession"] ?? 0);
                    string currentMonth = DateTime.Now.ToString("MMMM yyyy");

                    if (admFee > 0)
                    {
                        _db.CollectFee(new Dictionary<string, object> {
                            { "student_id", studentId },
                            { "amount", admFee },
                            { "debit", admFee },
                            { "credit", 0 },
                            { "status", "unpaid" },
                            { "description", "Initial Admission Fee" },
                            { "type", "admission" },
                            { "month", currentMonth }
                        });
                    }

                    if (monthlyFee > 0)
                    {
                        double netFee = Math.Max(0, monthlyFee - concession);
                        _db.CollectFee(new Dictionary<string, object> {
                            { "student_id", studentId },
                            { "amount", netFee },
                            { "debit", netFee },
                            { "credit", 0 },
                            { "status", "unpaid" },
                            { "description", "Monthly Tuition Fee" + (concession > 0 ? " (After Concession)" : "") },
                            { "type", "tuition" },
                            { "month", currentMonth }
                        });
                    }
                }

                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object UpdateStudent(JToken? d)
        {
            if (d == null || d.Type == JTokenType.Null) return new { success = false };
            try {
                _db.Execute(@"UPDATE students SET name=@name, roll_no=@roll, class_id=@class, session_id=@session, guardian_name=@guardian, contact_number=@contact, monthly_fee=@fee, admission_fee=@adm, gender=@gender, concession=@concession, family_no=@family, dob=@dob, blood_group=@blood, religion=@religion, address=@address, status=@status, picture=@pic WHERE id=@id",
                    new Dictionary<string, object> {
                        { "@id", Convert.ToInt32(d?["id"] ?? 0) },
                        { "@name", d?["name"]?.ToString() ?? "" },
                        { "@roll", d?["roll_no"]?.ToString() ?? "" },
                        { "@class", Convert.ToInt32(d?["class_id"] ?? 0) },
                        { "@session", Convert.ToInt32(d?["session_id"] ?? 0) },
                        { "@guardian", d?["guardian_name"]?.ToString() ?? "" },
                        { "@contact", d?["contact_number"]?.ToString() ?? "" },
                        { "@fee", Convert.ToDouble(d?["monthly_fee"] ?? 0) },
                        { "@adm", Convert.ToDouble(d?["admission_fee"] ?? 0) },
                        { "@gender", d?["gender"]?.ToString() ?? "Male" },
                        { "@concession", Convert.ToDouble(d?["concession"] ?? 0) },
                        { "@family", d?["family_no"]?.ToString() ?? "" },
                        { "@dob", d?["dob"]?.ToString() ?? "" },
                        { "@blood", d?["blood_group"]?.ToString() ?? "" },
                        { "@religion", d?["religion"]?.ToString() ?? "Islam" },
                        { "@address", d?["address"]?.ToString() ?? "" },
                        { "@status", d?["status"]?.ToString() ?? "active" },
                        { "@pic", d?["picture"]?.ToString() ?? "" }
                    });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object Register(JToken? payload)
        {
            try
            {
                string name = payload?["schoolName"]?.ToString() ?? "";
                string id = payload?["schoolId"]?.ToString() ?? "";
                string key = payload?["masterKey"]?.ToString() ?? "";
                
                string hash = HashPassword(key);
                
                _db.Execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_name', @name)", new Dictionary<string, object> { { "@name", name } });
                _db.Execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_id', @id)", new Dictionary<string, object> { { "@id", id } });
                
                // Create admin user
                _db.Execute("INSERT OR REPLACE INTO users (name, email, password, role, permissions) VALUES ('Admin', @email, @pass, 'admin', '[]')", 
                    new Dictionary<string, object> { { "@email", id }, { "@pass", hash } });

                return new { success = true };
            }
            catch (Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }

        private object Login(string? schoolId, string? masterKey)
        {
            if (string.IsNullOrEmpty(schoolId) || string.IsNullOrEmpty(masterKey))
                return new { success = false, error = "ID and Key are required." };

            // CLEAN INPUTS
            schoolId = schoolId.Trim();
            masterKey = masterKey.Trim();

            // 1. FIRST PRIORITY: Try individual Staff Login
            string hash = HashPassword(masterKey);
            var user = _db.QueryOne("SELECT * FROM users WHERE email=@id AND password=@pass", 
                new Dictionary<string, object> { { "@id", schoolId }, { "@pass", hash } });

            if (user != null)
            {
                string name = user["name"]?.ToString() ?? "User";
                string role = user["role"]?.ToString() ?? "staff";
                string perms = user["permissions"]?.ToString() ?? "[]";

                // ULTIMATE SECURITY OVERRIDE: 
                // If it's Salman or ID 1001, FORCE them to be restricted staff.
                if (name.ToLower().Contains("salman") || schoolId == "1001")
                {
                    role = "staff";
                    perms = "[\"academic\"]";
                }

                return new { 
                    success = true, 
                    user = new { 
                        name = name, 
                        role = role, 
                        permissions = perms 
                    } 
                };
            }

            // 2. SECOND PRIORITY: Try Master School Login
            var storedId = _db.ExecuteScalar("SELECT value FROM settings WHERE key='school_id'")?.ToString()?.Trim();
            var storedKey = _db.ExecuteScalar("SELECT value FROM settings WHERE key='master_key'")?.ToString()?.Trim();

            // Check database OR use the emergency bypass (1234/admin)
            if ((schoolId == storedId && masterKey == storedKey) || (schoolId == "1234" && masterKey == "admin"))
            {
                return new { 
                    success = true, 
                    user = new { 
                        name = "Master Administrator", 
                        role = "admin", 
                        permissions = "[\"academic\",\"finance\",\"hr\",\"pos\",\"reports\",\"settings\"]" 
                    } 
                };
            }

            // 3. FINAL PRIORITY: Diagnostic Errors
            var exists = _db.ExecuteScalar("SELECT COUNT(*) FROM users WHERE email=@id", new Dictionary<string, object> { { "@id", schoolId } });
            if (Convert.ToInt32(exists) > 0) {
                return new { success = false, error = "Staff Account found, but Security Key is incorrect." };
            }

            return new { success = false, error = "Invalid Credentials. Check your School ID or Staff ID (" + schoolId + ")." };
        }

        private string HashPassword(string password)
        {
            using var sha = System.Security.Cryptography.SHA256.Create();
            byte[] bytes = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
            return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        }
        private object CreateInventory(JToken? d)
        {
            if (d == null) return new { success = false };
            _db.Execute("INSERT INTO inventories (uuid, item_name, purchase_price, sale_price, qty) VALUES (@uuid, @name, @p, @s, @q)",
                new Dictionary<string, object> {
                    { "@uuid", "inv_" + Guid.NewGuid().ToString("N").Substring(0, 8) },
                    { "@name", d["item_name"]?.ToString() ?? "" },
                    { "@p", Convert.ToDouble(d["purchase_price"] ?? 0) },
                    { "@s", Convert.ToDouble(d["sale_price"] ?? 0) },
                    { "@q", Convert.ToInt32(d["qty"] ?? 0) }
                });
            return new { success = true };
        }

        private object UpdateInventory(JToken? d)
        {
            if (d == null) return new { success = false };
            _db.Execute("UPDATE inventories SET item_name=@name, purchase_price=@p, sale_price=@s, qty=@q WHERE id=@id",
                new Dictionary<string, object> {
                    { "@id", Convert.ToInt32(d["id"] ?? 0) },
                    { "@name", d["item_name"]?.ToString() ?? "" },
                    { "@p", Convert.ToDouble(d["purchase_price"] ?? 0) },
                    { "@s", Convert.ToDouble(d["sale_price"] ?? 0) },
                    { "@q", Convert.ToInt32(d["qty"] ?? 0) }
                });
            return new { success = true };
        }

        private object CreateReminder(JToken? d)
        {
            if (d == null) return new { success = false };
            try {
                string uuid = "rem_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                _db.Execute(@"INSERT INTO reminders (uuid, title, description, reminder_date, priority, is_done) 
                              VALUES (@uuid, @t, @desc, @date, @p, 0)",
                    new Dictionary<string, object> {
                        { "@uuid", uuid },
                        { "@t", d["title"]?.ToString() ?? "" },
                        { "@desc", d["description"]?.ToString() ?? "" },
                        { "@date", d["reminder_date"]?.ToString() ?? DateTime.Now.ToString("yyyy-MM-dd") },
                        { "@p", d["priority"]?.ToString() ?? "medium" }
                    });
                return new { success = true };
            } catch (Exception ex) { return new { success = false, error = ex.Message }; }
        }

        private object SaveSettings(JToken? d)
        {
            if (d == null) return new { success = false };
            foreach (var prop in ((JObject)d).Properties())
            {
                _db.Execute("INSERT OR REPLACE INTO settings (key, value) VALUES (@k, @v)",
                    new Dictionary<string, object> { { "@k", prop.Name }, { "@v", prop.Value.ToString() } });
            }
            return new { success = true };
        }


        private object SaveAttendance(JToken? d)
        {
            if (d == null) return new { success = false };
            string date = d["date"]?.ToString() ?? DateTime.Now.ToString("yyyy-MM-dd");
            var records = d["records"] as JArray;
            if (records != null)
            {
                foreach (var r in records)
                {
                    int sid = Convert.ToInt32(r["student_id"]);
                    string status = r["status"]?.ToString() == "present" ? "P" : (r["status"]?.ToString() == "absent" ? "A" : "L");
                    _db.Execute("INSERT OR REPLACE INTO attendances (student_id, attendance_date, status) VALUES (@sid, @date, @s)",
                        new Dictionary<string, object> { { "@sid", sid }, { "@date", date }, { "@s", status } });
                }
            }
            return new { success = true };
        }

        private object GetMonthlyAttendance(JToken? d)
        {
            string month = d?["month"]?.ToString() ?? DateTime.Now.ToString("yyyy-MM");
            int classId = Convert.ToInt32(d?["classId"] ?? 0);
            return _db.QueryAll("SELECT s.id, s.name, a.attendance_date, a.status FROM students s LEFT JOIN attendances a ON s.id = a.student_id AND a.attendance_date LIKE @m WHERE s.class_id = @cid",
                new Dictionary<string, object> { { "@m", month + "%" }, { "@cid", classId } });
        }

        private object GetExamResults(JToken? d)
        {
            int examId = Convert.ToInt32(d?["examId"] ?? 0);
            int classId = Convert.ToInt32(d?["classId"] ?? 0);
            return _db.QueryAll("SELECT s.id as student_id, s.name as student_name, er.subject_name, er.total_marks, er.obtained_marks FROM students s LEFT JOIN exam_results er ON s.id = er.student_id AND er.exam_id = @eid WHERE s.class_id = @cid",
                new Dictionary<string, object> { { "@eid", examId }, { "@cid", classId } });
        }

        private object SaveExamResult(JToken? d)
        {
            if (d == null) return new { success = false };
            _db.Execute("INSERT OR REPLACE INTO exam_results (exam_id, student_id, subject_name, total_marks, obtained_marks) VALUES (@eid, @sid, @sub, @t, @o)",
                new Dictionary<string, object> {
                    { "@eid", Convert.ToInt32(d["exam_id"]) },
                    { "@sid", Convert.ToInt32(d["student_id"]) },
                    { "@sub", d["subject_name"]?.ToString() ?? "" },
                    { "@t", Convert.ToDouble(d["total_marks"] ?? 0) },
                    { "@o", Convert.ToDouble(d["obtained_marks"] ?? 0) }
                });
            return new { success = true };
        }

        private object GetStudentDmc(JToken? d)
        {
            int sid = Convert.ToInt32(d?["studentId"] ?? 0);
            int eid = Convert.ToInt32(d?["examId"] ?? 0);
            var student = _db.QueryOne("SELECT s.*, c.name as class_name FROM students s LEFT JOIN class_infos c ON s.class_id = c.id WHERE s.id = @sid", new Dictionary<string, object> { { "@sid", sid } });
            var results = _db.QueryAll("SELECT * FROM exam_results WHERE student_id = @sid AND exam_id = @eid", new Dictionary<string, object> { { "@sid", sid }, { "@eid", eid } });
            return new { student, results };
        }
        private object SendGSMMessage(string to, string message)
        {
            if (string.IsNullOrEmpty(to) || string.IsNullOrEmpty(message)) return new { success = false, error = "Number and message are required." };
            
            // CLEAN PHONE NUMBER
            to = new string(to.Where(char.IsDigit).ToArray());
            if (to.Length == 10) to = "92" + to; // Default to Pakistan country code if 10 digits
            else if (to.StartsWith("0")) to = "92" + to.Substring(1);

            string[] ports = SerialPort.GetPortNames();
            foreach (string portName in ports)
            {
                SerialPort? port = null;
                try
                {
                    port = new SerialPort(portName, 9600, Parity.None, 8, StopBits.One);
                    port.ReadTimeout = 3000;
                    port.WriteTimeout = 3000;
                    port.Open();

                    // TEST IF IT'S A MODEM
                    port.WriteLine("AT\r");
                    string response = port.ReadExisting();
                    
                    // IF IT RESPONDED, SEND THE SMS
                    port.WriteLine("AT+CMGF=1\r"); // Set to Text Mode
                    System.Threading.Thread.Sleep(200);
                    port.WriteLine($"AT+CMGS=\"{to}\"\r");
                    System.Threading.Thread.Sleep(200);
                    port.WriteLine(message + (char)26); // Message + CTRL+Z
                    System.Threading.Thread.Sleep(1000);
                    
                    string finalResult = port.ReadExisting();
                    port.Close();
                    
                    if (finalResult.Contains("OK") || finalResult.Contains("+CMGS"))
                        return new { success = true, port = portName };
                }
                catch { if (port != null && port.IsOpen) port.Close(); }
            }
            
            return new { success = false, error = "No GSM Modem detected on any COM port. Please plug in your USB Modem." };
        }
        private object OpenUrl(string? url)
        {
            if (string.IsNullOrEmpty(url)) return new { success = false };
            try {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo {
                    FileName = url,
                    UseShellExecute = true
                });
                return new { success = true };
            } catch { return new { success = false }; }
        }
    }
}
