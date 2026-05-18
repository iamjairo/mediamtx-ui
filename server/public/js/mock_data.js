// Centralized mock data registry. Used by FetchManager when a request to a
// MediaMTX or Go2RTC endpoint fails (server unreachable). Tabs do not need to
// know about it — they receive a normal Response object with the mock JSON.
//
// Enable / disable via `localStorage.setItem('mockFallback', 'on' | 'off')`.

const MOCK_PATHS = [
    {
        name: 'cam/front-door',
        confName: 'cam/front-door',
        source: { type: 'rtspSource', id: 'rtsp://192.168.1.50:554/h264' },
        sourceType: 'rtspSource',
        ready: true,
        readyTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        available: true,
        tracks: ['H264 1920x1080', 'AAC 48kHz'],
        readers: [{ type: 'webrtcSession', id: 'r1' }, { type: 'hlsSession', id: 'r2' }],
        bytesReceived: 2_100_000_000,
        bytesSent: 850_000_000,
    },
    {
        name: 'cam/backyard',
        confName: 'cam/backyard',
        source: { type: 'rtspSource', id: 'rtsp://192.168.1.51:554/h264' },
        sourceType: 'rtspSource',
        ready: true,
        readyTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        available: true,
        tracks: ['H264 1280x720'],
        readers: [{ type: 'hlsSession', id: 'r3' }],
        bytesReceived: 1_500_000_000,
        bytesSent: 350_000_000,
    },
    {
        name: 'cam/garage',
        confName: 'cam/garage',
        source: { type: 'rtspSource', id: 'rtsp://192.168.1.52:554/h264' },
        sourceType: 'rtspSource',
        ready: false,
        available: false,
        tracks: [],
        readers: [],
        bytesReceived: 0,
        bytesSent: 0,
    },
    {
        name: 'cam/driveway',
        confName: 'cam/driveway',
        source: { type: 'rtspSource', id: 'rtsp://192.168.1.53:554/h264' },
        sourceType: 'rtspSource',
        ready: true,
        readyTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        available: true,
        tracks: ['H264 1920x1080'],
        readers: [],
        bytesReceived: 980_000_000,
        bytesSent: 0,
    },
    {
        name: 'ingest/rtmp-stage',
        confName: 'ingest/rtmp-stage',
        source: { type: 'rtmpSource', id: 'rtmp://192.168.1.10/live/stream' },
        sourceType: 'rtmpSource',
        ready: true,
        readyTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        available: true,
        tracks: ['H264 1920x1080', 'AAC 44.1kHz'],
        readers: [{ type: 'webrtcSession', id: 'r4' }],
        bytesReceived: 540_000_000,
        bytesSent: 220_000_000,
    },
    {
        name: 'restream/hls-out',
        confName: 'restream/hls-out',
        source: { type: 'hlsSource', id: 'https://example.com/stream.m3u8' },
        sourceType: 'hlsSource',
        ready: true,
        readyTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        available: true,
        tracks: ['H264 1920x1080'],
        readers: [{ type: 'hlsSession', id: 'r5' }, { type: 'hlsSession', id: 'r6' }, { type: 'hlsSession', id: 'r7' }],
        bytesReceived: 0,
        bytesSent: 4_100_000_000,
    },
];

const MOCK_RECORDINGS = [
    {
        name: 'cam/front-door',
        segments: [
            { start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), duration: 3600 },
            { start: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), duration: 3600 },
            { start: new Date(Date.now() - 60 * 60 * 1000).toISOString(), duration: 1800 },
        ],
    },
    {
        name: 'cam/backyard',
        segments: [
            { start: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), duration: 7200 },
        ],
    },
    {
        name: 'cam/driveway',
        segments: [
            { start: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), duration: 3600 },
            { start: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(), duration: 3600 },
        ],
    },
];

const MOCK_LOGS = [
    { time: new Date(Date.now() - 60_000).toISOString(), level: 'INFO',  message: '[RTSP] [conn 192.168.1.50:51234] opened' },
    { time: new Date(Date.now() - 55_000).toISOString(), level: 'INFO',  message: '[path cam/front-door] [RTSP source] ready: 2 tracks (H264, AAC)' },
    { time: new Date(Date.now() - 50_000).toISOString(), level: 'INFO',  message: '[HLS] [muxer cam/front-door] opened' },
    { time: new Date(Date.now() - 40_000).toISOString(), level: 'WARN',  message: '[path cam/garage] [RTSP source] connection refused, retrying in 5s' },
    { time: new Date(Date.now() - 30_000).toISOString(), level: 'INFO',  message: '[WebRTC] [session r1] new session, ICE: relay' },
    { time: new Date(Date.now() - 25_000).toISOString(), level: 'DEBUG', message: '[recordings] cam/backyard segment closed (3600s)' },
    { time: new Date(Date.now() - 15_000).toISOString(), level: 'ERROR', message: '[path cam/driveway] [RTSP source] EOF, will reconnect' },
    { time: new Date(Date.now() - 8_000).toISOString(),  level: 'INFO',  message: '[path cam/driveway] [RTSP source] ready: 1 track (H264)' },
    { time: new Date(Date.now() - 3_000).toISOString(),  level: 'INFO',  message: '[API] 200 GET /paths/list (12ms)' },
];

const MOCK_GO2RTC_STREAMS = {
    'doorbell': { producers: [{ url: 'rtsp://192.168.1.50:554/h264' }], consumers: [{ type: 'webrtc' }] },
    'backyard': { producers: [{ url: 'rtsp://192.168.1.51:554/h264' }], consumers: [] },
    'garage': { producers: [{ url: 'rtsp://192.168.1.52:554/h264' }], consumers: [] },
};

// Match a URL to a mock payload. Return null if no mock applies.
export function getMockResponse(url) {
    const u = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
    const path = u.pathname + (u.search || '');

    // MediaMTX paths list
    if (path === '/mediamtx/paths/list') {
        return jsonResponse({ pageCount: 1, itemCount: MOCK_PATHS.length, items: MOCK_PATHS });
    }

    // MediaMTX recordings list
    if (path === '/mediamtx/recordings/list') {
        return jsonResponse({ pageCount: 1, itemCount: MOCK_RECORDINGS.length, items: MOCK_RECORDINGS });
    }

    // MediaMTX logs
    if (path === '/mediamtx/logs') {
        return jsonResponse({ items: MOCK_LOGS });
    }

    // MediaMTX sessions (all empty in mock — these need a server)
    if (path.startsWith('/mediamtx/') && path.endsWith('/list')) {
        return jsonResponse({ pageCount: 0, itemCount: 0, items: [] });
    }

    // MediaMTX config global
    if (path === '/mediamtx/config/global/get') {
        return jsonResponse({
            logLevel: 'info',
            api: true,
            apiAddress: ':9997',
            hls: true,
            hlsAddress: ':8888',
            webrtc: true,
            webrtcAddress: ':8889',
            rtsp: true,
            rtspAddress: ':8554',
        });
    }

    // Go2RTC streams
    if (path === '/go2rtc/api/streams' || path.startsWith('/go2rtc/api/streams?')) {
        return jsonResponse(MOCK_GO2RTC_STREAMS);
    }

    return null;
}

function jsonResponse(payload) {
    const body = JSON.stringify(payload);
    return new Response(body, {
        status: 200,
        statusText: 'OK (mock)',
        headers: { 'Content-Type': 'application/json', 'X-Mock-Fallback': '1' },
    });
}

export function isMockFallbackEnabled() {
    // Default ON so the dashboard is useful out of the box for demos.
    // Disable with localStorage.setItem('mockFallback', 'off')
    return localStorage.getItem('mockFallback') !== 'off';
}
