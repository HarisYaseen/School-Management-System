(function() {
    const origWarn = console.warn;
    console.warn = function() {
        if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].includes('cdn.tailwindcss.com')) return;
        origWarn.apply(console, arguments);
    };
})();
