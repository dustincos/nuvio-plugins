const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const EXTERNAL_MODULES = [
    'cheerio-without-node-native',
    'react-native-cheerio',
    'cheerio',
    'crypto-js',
    'axios'
];

async function build() {
    const providersDir = path.join(__dirname, 'providers');
    if (!fs.existsSync(providersDir)) {
        fs.mkdirSync(providersDir);
    }

    const srcPath = path.join(__dirname, 'src');
    const srcDirs = fs.readdirSync(srcPath).filter(f => fs.statSync(path.join(srcPath, f)).isDirectory());

    console.log(`🚀 Found ${srcDirs.length} providers to build: ${srcDirs.join(', ')}`);

    for (const providerName of srcDirs) {
        const srcDir = path.join(srcPath, providerName);
        const providerFile = path.join(providersDir, `${providerName}.js`);
        
        const entryFile = path.join(srcDir, 'index.js');
        if (!fs.existsSync(entryFile)) {
            console.warn(`⚠️ Skipped ${providerName}: No index.js found.`);
            continue;
        }

        try {
            await esbuild.build({
                entryPoints: [entryFile],
                bundle: true,
                outfile: providerFile,
                platform: 'neutral',
                format: 'cjs',
                target: 'es2016',
                minify: false,
                sourcemap: false,
                external: EXTERNAL_MODULES,
                banner: {
                    js: `/**\n * ${providerName} - Built from src/${providerName}/\n * Generated: ${new Date().toISOString()}\n */`
                },
                logLevel: 'warning'
            });

            const stats = fs.statSync(providerFile);
            console.log(`✅ ${providerName}.js (${(stats.size / 1024).toFixed(1)} KB)`);
        } catch (err) {
            console.error(`❌ Failed building ${providerName}:`, err);
        }
    }
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});