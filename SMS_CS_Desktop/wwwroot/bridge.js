// C# Bridge for WebView2
window.api = {
    _requests: {},
    _id: 0,

    call: function(action, payload = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this._id;
            this._requests[id] = { resolve, reject };
            
            const message = JSON.stringify({ id, action, payload });
            window.chrome.webview.postMessage(message);
        });
    },

    // Simplified wrappers to match existing window.api
    getDashboardStats: () => window.api.call('get-dashboard-stats'),
    getStudents: () => window.api.call('get-students'),
    login: (creds) => window.api.call('login', creds),
    // ... add more as needed
};

// Handle response from C#
window.onCSharpResponse = function(response) {
    const req = window.api._requests[response.id];
    if (req) {
        if (response.success) req.resolve(response.data);
        else req.reject(response.error);
        delete window.api._requests[response.id];
    }
};
