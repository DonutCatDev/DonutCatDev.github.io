import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPages } from './build-pages.js';

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
};

function resolveRequest(root, pathname) {
    const decoded = decodeURIComponent(pathname);
    const candidate = normalize(join(root, decoded));
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
        return null;
    }
    if (existsSync(candidate) && statSync(candidate).isFile()) {
        return candidate;
    }
    const index = join(candidate, 'index.html');
    if (existsSync(index) && statSync(index).isFile()) {
        return index;
    }
    return null;
}

export function createPreviewServer(root) {
    return createServer((request, response) => {
        let file;
        let url;
        try {
            url = new URL(request.url, 'http://localhost');
            file = resolveRequest(root, url.pathname);
        } catch {
            response.writeHead(400, { 'Content-Type': 'text/plain' });
            response.end('Invalid request path.');
            return;
        }
        if (file && !url.pathname.endsWith('/') && file.endsWith(`${sep}index.html`) && !url.pathname.endsWith('/index.html')) {
            response.writeHead(301, { Location: `${url.pathname}/${url.search}` });
            response.end();
            return;
        }
        const servedFile = file || join(root, '404.html');
        response.writeHead(file ? 200 : 404, {
            'Content-Type': contentTypes[extname(servedFile)] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        const stream = createReadStream(servedFile);
        stream.on('error', () => response.destroy());
        stream.pipe(response);
    });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    const root = await buildPages();
    const server = createPreviewServer(root);
    server.listen(Number(process.env.PORT || 8000), '127.0.0.1', () => {
        console.log(`Local preview: http://127.0.0.1:${server.address().port}`);
    });
}
