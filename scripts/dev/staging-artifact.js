import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const STAGING_FRONTEND = 'https://baku-stage.donutcat.org';
export const STAGING_API = 'https://baku-api-stage.donutcat.org';
export const PRODUCTION_API = 'https://baku-api.donutcat.org';
export function checkProductionConfig(config) {
    if (config?.schemaVersion !== 1 || ![null, PRODUCTION_API].includes(config.apiOrigin)) throw new Error('Production configuration must be disabled or use the approved production API; never a staging origin.');
}
async function files(directory) {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) result.push(...await files(path));
        else if (entry.isFile()) result.push(path);
        else throw new Error('Unexpected non-file in staging output.');
    }
    return result;
}
export async function prepareStagingArtifact(output) {
    // Only the generated staging copy is edited. Production vendor files,
    // checksum manifests, and the GitHub Pages artifact stay unchanged.
    const configPath = join(output, 'baku', 'collection', 'data', 'service-config.json');
    await writeFile(configPath, JSON.stringify({ schemaVersion: 1, apiOrigin: STAGING_API }, null, 2) + '\n');
    await writeFile(join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    await writeFile(join(output, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n/baku/collection/data/service-config.json\n  Cache-Control: no-store\n');
    await writeFile(join(output, 'styles', 'staging.css'), '.staging-banner{box-sizing:border-box;margin:0;padding:.5rem 1rem;background:#203451;color:#fff;font:700 .9rem/1.4 system-ui,sans-serif;text-align:center;overflow-wrap:anywhere}\n');
    for (const path of (await files(output)).filter(path => path.endsWith('.html'))) {
        const html = await readFile(path, 'utf8');
        if (!/<body\b[^>]*>/i.test(html) || !/<\/head>/i.test(html)) throw new Error('Invalid static HTML in staging artifact.');
        const banner = '<aside class="staging-banner" aria-label="Staging environment">Bakugan staging — use test data only. Not the production collection.</aside>';
        await writeFile(path, html.replace(/<\/head>/i, '<link rel="stylesheet" href="/styles/staging.css">\n</head>').replace(/<body\b[^>]*>/i, tag => `${tag}\n${banner}`));
    }
    const assets = await files(output);
    if (assets.length > 20000) throw new Error('Staging artifact exceeds the Pages Free file limit.');
    for (const path of assets) if ((await stat(path)).size > 25 * 1024 * 1024) throw new Error('Staging asset exceeds the Pages file-size limit.');
    console.log(`Staging artifact: ${assets.length} files within Cloudflare Pages Free asset limits. No remote resources created.`);
}
