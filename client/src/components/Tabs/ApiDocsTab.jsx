import { useState } from 'react';
import { fm } from '../../lib/fetchManager.js';

const ENDPOINTS = {
    mediamtx: {
        label: 'MediaMTX',
        baseUrl: '/mediamtx',
        groups: [
            {
                name: 'Paths',
                endpoints: [
                    { method: 'GET', path: '/paths/list', desc: 'List all active paths and their state', testable: true },
                    { method: 'GET', path: '/paths/get/{name}', desc: 'Get details for one path', testable: false },
                    { method: 'GET', path: '/config/paths/list', desc: 'List path configurations', testable: true },
                    { method: 'GET', path: '/config/paths/get/{name}', desc: 'Get one path configuration', testable: false },
                    { method: 'POST', path: '/config/paths/add/{name}', desc: 'Add a path config', testable: false, body: '{"source":"rtsp://..."}' },
                    { method: 'PATCH', path: '/config/paths/patch/{name}', desc: 'Update path config (partial)', testable: false },
                    { method: 'DELETE', path: '/config/paths/delete/{name}', desc: 'Delete a path config', testable: false },
                ],
            },
            {
                name: 'Config',
                endpoints: [
                    { method: 'GET', path: '/config/global/get', desc: 'Get global server config', testable: true },
                    { method: 'PATCH', path: '/config/global/patch', desc: 'Update global config', testable: false },
                    { method: 'GET', path: '/config/pathdefaults/get', desc: 'Get path defaults', testable: true },
                    { method: 'PATCH', path: '/config/pathdefaults/patch', desc: 'Update path defaults', testable: false },
                ],
            },
            {
                name: 'Recordings',
                endpoints: [
                    { method: 'GET', path: '/recordings/list', desc: 'List all recordings (segments grouped by path)', testable: true },
                    { method: 'GET', path: '/recordings/get?path={name}', desc: 'Get recordings for a specific path', testable: false },
                ],
            },
            {
                name: 'Sessions',
                endpoints: [
                    { method: 'GET', path: '/rtspsessions/list', desc: 'Active RTSP sessions', testable: true },
                    { method: 'GET', path: '/rtmpconns/list', desc: 'Active RTMP connections', testable: true },
                    { method: 'GET', path: '/hlsmuxers/list', desc: 'Active HLS muxers', testable: true },
                    { method: 'GET', path: '/webrtcsessions/list', desc: 'Active WebRTC sessions', testable: true },
                    { method: 'GET', path: '/srtconns/list', desc: 'Active SRT connections', testable: true },
                ],
            },
            {
                name: 'Diagnostics',
                endpoints: [
                    { method: 'GET', path: '/logs', desc: 'Recent server logs (proxy endpoint)', testable: true },
                ],
            },
        ],
    },
    go2rtc: {
        label: 'Go2RTC',
        baseUrl: '/go2rtc/api',
        groups: [
            {
                name: 'Streams',
                endpoints: [
                    { method: 'GET', path: '/streams', desc: 'List all streams', testable: true },
                    { method: 'PUT', path: '/streams?src={name}', desc: 'Add or update a stream', testable: false, body: 'rtsp://192.168.1.50:554/h264' },
                    { method: 'DELETE', path: '/streams?src={name}', desc: 'Delete a stream', testable: false },
                ],
            },
            {
                name: 'Playback',
                endpoints: [
                    { method: 'GET', path: '/stream.m3u8?src={name}', desc: 'HLS playlist for a stream', testable: false },
                    { method: 'POST', path: '/webrtc?src={name}', desc: 'WHEP offer/answer for WebRTC playback', testable: false, body: 'v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n... (SDP offer)' },
                ],
            },
            {
                name: 'Diagnostics',
                endpoints: [
                    { method: 'GET', path: '/streams.dot', desc: 'Graphviz diagram of stream topology', testable: true },
                    { method: 'GET', path: '/log', desc: 'Server logs', testable: true },
                ],
            },
        ],
    },
};

function EndpointCard({ ep, baseUrl }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState(null);
    const [urlCopied, setUrlCopied] = useState(false);

    const fullUrl = `${baseUrl}${ep.path}`;

    function handleToggle() {
        setOpen((v) => !v);
    }

    function handleCopyUrl(e) {
        e.stopPropagation();
        navigator.clipboard.writeText(window.location.origin + fullUrl).then(() => {
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 1500);
        });
    }

    async function handleTry(e) {
        e.stopPropagation();
        setLoading(true);
        setResponse('Loading...');
        try {
            const res = await fm.fetch(fullUrl);
            if (!res) {
                setResponse('Error: request failed (server unreachable)');
                return;
            }
            const text = await res.text();
            try {
                setResponse(JSON.stringify(JSON.parse(text), null, 2));
            } catch {
                setResponse(text);
            }
        } catch (err) {
            setResponse(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <article className={`apidocs-endpoint${open ? ' open' : ''}`}>
            <header className="apidocs-endpoint-header" onClick={handleToggle}>
                <span className={`apidocs-method method-${ep.method.toLowerCase()}`}>{ep.method}</span>{' '}
                <code className="apidocs-path">{ep.path}</code>{' '}
                <span className="apidocs-desc">{ep.desc}</span>{' '}
                <button
                    className="apidocs-toggle"
                    aria-label="Expand"
                    onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            </header>

            <div className="apidocs-endpoint-body">
                <div className="apidocs-row">
                    <span className="apidocs-row-label">Full URL</span>
                    <code className="apidocs-row-value">{fullUrl}</code>
                </div>

                {ep.body && (
                    <div className="apidocs-row">
                        <span className="apidocs-row-label">Request Body</span>
                        <pre className="apidocs-pre">{ep.body}</pre>
                    </div>
                )}

                <div className="apidocs-actions">
                    {ep.testable && ep.method === 'GET' && (
                        <button
                            className="phase2-btn sm apidocs-try-btn"
                            disabled={loading}
                            onClick={handleTry}
                        >
                            Try it
                        </button>
                    )}
                    <button className="phase2-btn sm secondary apidocs-copy-btn" onClick={handleCopyUrl}>
                        {urlCopied ? 'Copied!' : 'Copy URL'}
                    </button>
                </div>

                {response !== null && (
                    <div className="apidocs-response">
                        <span className="apidocs-row-label">Response</span>
                        <pre className="apidocs-pre apidocs-response-pre">{response}</pre>
                    </div>
                )}
            </div>
        </article>
    );
}

export default function ApiDocsTab() {
    const [activeServer, setActiveServer] = useState(
        () => localStorage.getItem('apidocs:server') || 'mediamtx'
    );

    function handleSelectServer(key) {
        setActiveServer(key);
        localStorage.setItem('apidocs:server', key);
    }

    const config = ENDPOINTS[activeServer];

    return (
        <div className="tab api-docs-tab">
            <div className="apidocs-header">
                <div className="apidocs-header-left">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <div>
                        <h2>API Reference</h2>
                        <p>Interactive endpoint explorer for MediaMTX and Go2RTC</p>
                    </div>
                </div>
            </div>

            <div className="apidocs-tabs">
                {Object.entries(ENDPOINTS).map(([key, val]) => (
                    <button
                        key={key}
                        className={`apidocs-tab-btn${key === activeServer ? ' active' : ''}`}
                        onClick={() => handleSelectServer(key)}
                    >
                        <span className={`apidocs-tab-dot ${key}`}></span>
                        {val.label}
                    </button>
                ))}
            </div>

            <div className="apidocs-content">
                <div className="apidocs-base-url">
                    <span>Base URL</span>
                    <code>{window.location.origin + config.baseUrl}</code>
                </div>

                {config.groups.map((group) => (
                    <section key={group.name} className="apidocs-group">
                        <h3 className="apidocs-group-heading">
                            <span className="apidocs-group-name">{group.name}</span>
                            <span className="apidocs-group-count">
                                {group.endpoints.length} endpoint{group.endpoints.length !== 1 ? 's' : ''}
                            </span>
                        </h3>
                        {group.endpoints.map((ep) => (
                            <EndpointCard
                                key={`${ep.method}:${ep.path}`}
                                ep={ep}
                                baseUrl={config.baseUrl}
                            />
                        ))}
                    </section>
                ))}
            </div>
        </div>
    );
}
