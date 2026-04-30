const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Auth
    checkSetup: () => ipcRenderer.invoke('check-setup'),
    register: (data) => ipcRenderer.invoke('register', data),
    login: (data) => ipcRenderer.invoke('login', data),

    // Dashboard
    getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
    getMonthlyRevenue: () => ipcRenderer.invoke('get-monthly-revenue'),
    getRecentAdmissions: () => ipcRenderer.invoke('get-recent-admissions'),

    // Students
    getStudents: () => ipcRenderer.invoke('get-students'),
    getStudent: (id) => ipcRenderer.invoke('get-student', id),
    createStudent: (data) => ipcRenderer.invoke('create-student', data),
    updateStudent: (data) => ipcRenderer.invoke('update-student', data),
    deleteStudent: (id) => ipcRenderer.invoke('delete-student', id),
    promoteStudents: (data) => ipcRenderer.invoke('promote-students', data),
    uploadStudentPicture: () => ipcRenderer.invoke('upload-student-picture'),
    getStudentPictureUrl: (fileName) => ipcRenderer.invoke('get-student-picture-url', fileName),

    // Teachers
    getTeachers: () => ipcRenderer.invoke('get-teachers'),
    createTeacher: (data) => ipcRenderer.invoke('create-teacher', data),
    updateTeacher: (data) => ipcRenderer.invoke('update-teacher', data),
    deleteTeacher: (id) => ipcRenderer.invoke('delete-teacher', id),

    // Classes
    getClasses: () => ipcRenderer.invoke('get-classes'),
    createClass: (data) => ipcRenderer.invoke('create-class', data),
    updateClass: (data) => ipcRenderer.invoke('update-class', data),
    deleteClass: (id) => ipcRenderer.invoke('delete-class', id),

    // Fees
    getFees: () => ipcRenderer.invoke('get-fees'),
    getStudentLedger: (id) => ipcRenderer.invoke('get-student-ledger', id),
    collectFee: (data) => ipcRenderer.invoke('collect-fee', data),
    deleteFee: (id) => ipcRenderer.invoke('delete-fee', id),
    updateFee: (data) => ipcRenderer.invoke('update-fee', data),

    // Inventory
    getInventory: () => ipcRenderer.invoke('get-inventory'),
    getInventoryStats: () => ipcRenderer.invoke('get-inventory-stats'),
    createInventory: (data) => ipcRenderer.invoke('create-inventory', data),
    updateInventory: (data) => ipcRenderer.invoke('update-inventory', data),
    stockIn: (data) => ipcRenderer.invoke('stock-in', data),
    deleteInventory: (id) => ipcRenderer.invoke('delete-inventory', id),
    checkoutInventory: (data) => ipcRenderer.invoke('checkout-inventory', data),
    checkoutCart: (data) => ipcRenderer.invoke('checkout-cart', data),
    getSales: () => ipcRenderer.invoke('get-sales'),
    deleteSale: (id) => ipcRenderer.invoke('delete-sale', id),
    getInvoices: () => ipcRenderer.invoke('get-invoices'),
    getInvoiceDetails: (invNo) => ipcRenderer.invoke('get-invoice-details', invNo),

    // Attendance
    getAttendance: (date) => ipcRenderer.invoke('get-attendance', date),
    saveAttendance: (data) => ipcRenderer.invoke('save-attendance', data),
    getAttendanceHistory: (classId) => ipcRenderer.invoke('get-attendance-history', classId),
    getMonthlyAttendance: (data) => ipcRenderer.invoke('get-monthly-attendance', data),
    sendWhatsApp: (url) => ipcRenderer.send('open-whatsapp', url),

    // Settings
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
    createBackup: () => ipcRenderer.invoke('create-backup'),

    // Search
    globalSearch: (q) => ipcRenderer.invoke('global-search', q),

    // Expenses
    getExpenses: () => ipcRenderer.invoke('get-expenses'),
    createExpense: (data) => ipcRenderer.invoke('create-expense', data),
    updateExpense: (data) => ipcRenderer.invoke('update-expense', data),
    deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),

    // Banks
    getBankStats: (period) => ipcRenderer.invoke('get-bank-stats', period),
    getBanks: () => ipcRenderer.invoke('get-banks'),
    createBank: (d) => ipcRenderer.invoke('create-bank', d),
    updateBank: (d) => ipcRenderer.invoke('update-bank', d),
    deleteBank: (id) => ipcRenderer.invoke('delete-bank', id),
    getBankTransactions: (bankId) => ipcRenderer.invoke('get-bank-transactions', bankId),
    createBankTransaction: (d) => ipcRenderer.invoke('create-bank-transaction', d),
    
    // Exams
    getExams: () => ipcRenderer.invoke('get-exams'),
    createExam: (d) => ipcRenderer.invoke('create-exam', d),
    deleteExam: (id) => ipcRenderer.invoke('delete-exam', id),
    getExamResults: (d) => ipcRenderer.invoke('get-exam-results', d),
    saveExamResult: (d) => ipcRenderer.invoke('save-exam-result', d),
    getStudentDMC: (d) => ipcRenderer.invoke('get-student-dmc', d),
    getExamSubjects: (d) => ipcRenderer.invoke('get-exam-subjects', d),
    deleteExamSubject: (d) => ipcRenderer.invoke('delete-exam-subject', d),

    // Subjects (Global)
    getSubjects: (classId) => ipcRenderer.invoke('get-subjects', classId),
    saveSubject: (d) => ipcRenderer.invoke('save-subject', d),
    deleteSubject: (id) => ipcRenderer.invoke('delete-subject', id),

    resetDatabase: () => ipcRenderer.invoke('reset-database')
});
