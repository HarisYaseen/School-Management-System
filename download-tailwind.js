const fs = require('fs');
const https = require('https');

https.get('https://cdn.tailwindcss.com', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        // Suppress the warning
        data = data.replace('console.warn("cdn.tailwindcss.com should not be used in production. To use Tailwind CSS in production, install it as a PostCSS plugin or use the Tailwind CLI: https://tailwindcss.com/docs/installation")', '');
        fs.writeFileSync('src/pages/tailwind.js', data);
        console.log('Tailwind JS downloaded and patched');
        
        // Now update all HTML files
        const pagesDir = 'src/pages';
        const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
        for (const file of files) {
            const filePath = `${pagesDir}/${file}`;
            let content = fs.readFileSync(filePath, 'utf8');
            content = content.replace('<script src="https://cdn.tailwindcss.com"></script>', '<script src="tailwind.js"></script>');
            fs.writeFileSync(filePath, content);
        }
        console.log('All HTML files updated to use local tailwind.js');
    });
});
