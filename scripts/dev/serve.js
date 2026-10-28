import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const port = Number(process.env.PORT || 8000);
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8'
};

function resolveRequest(pathname) {
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

const server = createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const file = resolveRequest(url.pathname);
    const servedFile = file || join(root, '404.html');
    response.writeHead(file ? 200 : 404, {
        'Content-Type': contentTypes[extname(servedFile)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
    });
    createReadStream(servedFile).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Local preview: http://127.0.0.1:${port}`);
});
