const fs = require('fs');
const https = require('https');
const path = require('path');

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode === 200) {
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
            }
        }).on('error', reject);
    });
}

async function run() {
    const pagesDir = 'src/pages';
    
    console.log('Downloading FontAwesome JS...');
    await downloadFile('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js', path.join(pagesDir, 'fa.js'));
    console.log('FontAwesome JS downloaded.');

    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
    for (const file of files) {
        const filePath = path.join(pagesDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace FontAwesome CSS with JS
        content = content.replace(/<link rel="stylesheet" href="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome\/6\.5\.1\/css\/all\.min\.css">/g, '<script src="fa.js"></script>');
        
        // Also ensure Tailwind is replaced if download-tailwind.js missed any
        content = content.replace(/<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>/g, '<script src="tailwind.js"></script>');
        
        fs.writeFileSync(filePath, content);
    }
    console.log('All HTML files updated to use local fa.js');
}

run().catch(console.error);
