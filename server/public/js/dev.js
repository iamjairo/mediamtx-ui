/**
 * this is the dev watch task client over websockets to reload css files on change
 * included in index.html
 * <script type="module" src="/js/dev.js"></script>
 *
 * @type {number}
 */

const wsPort = 35729;
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const wsHost = window.location.hostname;
const ws = new WebSocket(`${protocol}://${wsHost}:${wsPort}`);

const linkMap = new Map();

function sanitizeCssPath(filePath) {
    if (typeof filePath !== 'string') return null;

    const trimmed = filePath.trim();
    if (!trimmed) return null;

    // Only allow relative CSS paths (no scheme/protocol-relative URLs).
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith('//')) return null;
    // Disallow traversal, backslashes, query and hash fragments.
    if (trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes('?') || trimmed.includes('#')) return null;
    // Restrict to safe path characters and require .css extension.
    if (!/^[A-Za-z0-9/_\-.]+\.css$/.test(trimmed)) return null;

    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function reloadOrAddLink(filePath) {
    const fileName = filePath.split('/').pop();
    let link = linkMap.get(fileName);

    if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = filePath;
        document.head.appendChild(link);
        linkMap.set(fileName, link);
        console.log(`CSS added: ${filePath}`);
    } else {
        const href = link.href.split('?')[0];
        link.href = `${href}?t=${Date.now()}`;
        console.log(`CSS reloaded: ${filePath}`);
    }
}

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'reload-css') {
        const relativePath = msg.file.replace(/^.*public\//, '');
        const safePath = sanitizeCssPath(relativePath);
        if (!safePath) {
            console.warn('Rejected unsafe CSS path from dev websocket message.');
            return;
        }
        reloadOrAddLink(safePath);
    }
};