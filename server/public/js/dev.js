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

    const cleaned = filePath.split(/[?#]/)[0].trim();
    if (!cleaned) return null;

    if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(cleaned)) return null;
    if (/^(?:javascript|data):/i.test(cleaned)) return null;

    const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
    if (normalized.includes('..')) return null;
    if (!/^\/[a-zA-Z0-9/_\-.]+\.css$/.test(normalized)) return null;

    return normalized;
}

function reloadOrAddLink(filePath) {
    const safePath = sanitizeCssPath(filePath);
    if (!safePath) {
        console.warn(`Ignored unsafe CSS path: ${filePath}`);
        return;
    }

    const fileName = safePath.split('/').pop();
    let link = linkMap.get(fileName);

    if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = safePath;
        document.head.appendChild(link);
        linkMap.set(fileName, link);
        console.log(`CSS added: ${safePath}`);
    } else {
        const href = safePath.split('?')[0];
        link.href = `${href}?t=${Date.now()}`;
        console.log(`CSS reloaded: ${safePath}`);
    }
}

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'reload-css') {
        const relativePath = msg.file.replace(/^.*public\//, '');
        const safePath = sanitizeCssPath(relativePath);
        if (!safePath) {
            console.warn(`Ignored unsafe CSS path from websocket: ${relativePath}`);
            return;
        }
        reloadOrAddLink(safePath);
    }
};