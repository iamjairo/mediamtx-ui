// Identical to server/public/js/mock_data.js — duplicated here for the React client
// so it doesn't depend on the vanilla source tree. The vanilla version stays in
// server/public/js/mock_data.js for the old build during the migration.

const MOCK_PATHS = [
  {
    name: 'cam/front-door', confName: 'cam/front-door',
    source: { type: 'rtspSource', id: 'rtsp://192.168.1.50:554/h264' }, sourceType: 'rtspSource',
    ready: true, readyTime: new Date(Date.now() - 8 * 3600e3).toISOString(), available: true,
    tracks: ['H264 1920x1080', 'AAC 48kHz'],
    readers: [{ type: 'webrtcSession' }, { type: 'hlsSession' }],
    bytesReceived: 2_100_000_000, bytesSent: 850_000_000,
  },
  {
    name: 'cam/backyard', confName: 'cam/backyard',
    source: { type: 'rtspSource', id: 'rtsp://192.168.1.51:554/h264' }, sourceType: 'rtspSource',
    ready: true, readyTime: new Date(Date.now() - 4 * 3600e3).toISOString(), available: true,
    tracks: ['H264 1280x720'], readers: [{ type: 'hlsSession' }],
    bytesReceived: 1_500_000_000, bytesSent: 350_000_000,
  },
  {
    name: 'cam/garage', confName: 'cam/garage',
    source: { type: 'rtspSource', id: 'rtsp://192.168.1.52:554/h264' }, sourceType: 'rtspSource',
    ready: false, available: false, tracks: [], readers: [], bytesReceived: 0, bytesSent: 0,
  },
  {
    name: 'cam/driveway', confName: 'cam/driveway',
    source: { type: 'rtspSource', id: 'rtsp://192.168.1.53:554/h264' }, sourceType: 'rtspSource',
    ready: true, readyTime: new Date(Date.now() - 2 * 3600e3).toISOString(), available: true,
    tracks: ['H264 1920x1080'], readers: [], bytesReceived: 980_000_000, bytesSent: 0,
  },
  {
    name: 'ingest/rtmp-stage', confName: 'ingest/rtmp-stage',
    source: { type: 'rtmpSource', id: 'rtmp://192.168.1.10/live/stream' }, sourceType: 'rtmpSource',
    ready: true, readyTime: new Date(Date.now() - 30 * 60e3).toISOString(), available: true,
    tracks: ['H264 1920x1080', 'AAC 44.1kHz'], readers: [{ type: 'webrtcSession' }],
    bytesReceived: 540_000_000, bytesSent: 220_000_000,
  },
  {
    name: 'restream/hls-out', confName: 'restream/hls-out',
    source: { type: 'hlsSource', id: 'https://example.com/stream.m3u8' }, sourceType: 'hlsSource',
    ready: true, readyTime: new Date(Date.now() - 12 * 3600e3).toISOString(), available: true,
    tracks: ['H264 1920x1080'],
    readers: [{ type: 'hlsSession' }, { type: 'hlsSession' }, { type: 'hlsSession' }],
    bytesReceived: 0, bytesSent: 4_100_000_000,
  },
];

const MOCK_LOGS = [
  { time: new Date(Date.now() - 60e3).toISOString(), level: 'INFO',  message: '[RTSP] [conn 192.168.1.50:51234] opened' },
  { time: new Date(Date.now() - 55e3).toISOString(), level: 'INFO',  message: '[path cam/front-door] [RTSP source] ready: 2 tracks (H264, AAC)' },
  { time: new Date(Date.now() - 50e3).toISOString(), level: 'INFO',  message: '[HLS] [muxer cam/front-door] opened' },
  { time: new Date(Date.now() - 40e3).toISOString(), level: 'WARN',  message: '[path cam/garage] [RTSP source] connection refused, retrying in 5s' },
  { time: new Date(Date.now() - 30e3).toISOString(), level: 'INFO',  message: '[WebRTC] [session r1] new session, ICE: relay' },
  { time: new Date(Date.now() - 25e3).toISOString(), level: 'DEBUG', message: '[recordings] cam/backyard segment closed (3600s)' },
  { time: new Date(Date.now() - 15e3).toISOString(), level: 'ERROR', message: '[path cam/driveway] [RTSP source] EOF, will reconnect' },
  { time: new Date(Date.now() -  8e3).toISOString(), level: 'INFO',  message: '[path cam/driveway] [RTSP source] ready: 1 track (H264)' },
  { time: new Date(Date.now() -  3e3).toISOString(), level: 'INFO',  message: '[API] 200 GET /paths/list (12ms)' },
];

const MOCK_GO2RTC_STREAMS = {
  doorbell: { producers: [{ url: 'rtsp://192.168.1.50:554/h264' }], consumers: [{ type: 'webrtc' }] },
  backyard: { producers: [{ url: 'rtsp://192.168.1.51:554/h264' }], consumers: [] },
};

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200, statusText: 'OK (mock)',
    headers: { 'Content-Type': 'application/json', 'X-Mock-Fallback': '1' },
  });
}

export function getMockResponse(url) {
  const u = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
  const path = u.pathname + (u.search || '');
  if (path === '/settings' || path === '/mediamtx/config/global/get')
    return jsonResponse({
      // Network addresses
      apiAddress: ':9997', metricsAddress: ':9998', pprofAddress: ':9999',
      rtspAddress: ':8554', rtspsAddress: ':8322',
      rtmpAddress: ':1935', rtmpsAddress: ':1936',
      hlsAddress: ':8888', webrtcAddress: ':8889', srtAddress: ':8890',
      // Logging
      logLevel: 'info', logDestinations: ['stdout'], logFile: 'mediamtx.log',
      // Authentication
      authMethod: 'internal', authInternalUsers: [],
      // Read/write
      readTimeout: '10s', writeTimeout: '10s', writeQueueSize: 512,
      udpMaxPayloadSize: 1472,
      // Playback
      playback: false, playbackAddress: ':9996',
      // RTSP
      rtsp: true, rtsps: true,
      rtspEncryption: 'no', rtspTransports: ['udp', 'multicast', 'tcp'],
      // RTMP
      rtmp: true, rtmpEncryption: 'no',
      // HLS
      hls: true, hlsEncryption: false, hlsServerKey: '', hlsServerCert: '',
      hlsAllowOrigin: '*', hlsAlwaysRemux: false, hlsVariant: 'lowLatency',
      hlsSegmentCount: 7, hlsSegmentDuration: '1s', hlsPartDuration: '200ms',
      hlsSegmentMaxSize: '50M',
      // WebRTC
      webrtc: true, webrtcEncryption: false,
      webrtcAllowOrigin: '*', webrtcICEServers2: [{ url: 'stun:stun.l.google.com:19302' }],
      // SRT
      srt: true,
    });
  if (path === '/mediamtx/config/pathdefaults/get')
    return jsonResponse({
      // Source
      source: 'publisher', sourceRedirect: '', sourceFingerprint: '',
      sourceOnDemand: false, sourceOnDemandStartTimeout: '10s', sourceOnDemandCloseAfter: '10s',
      // Always available
      alwaysAvailable: false, alwaysAvailableFile: '', alwaysAvailableTracks: [],
      // I/O
      maxReaders: 0, srtReadPassphrase: '', srtPublishPassphrase: '',
      useAbsoluteTimestamp: false, overridePublisher: true, rtspDemuxMpegts: true,
      // Recording
      record: false, recordPath: '~/Movies/mediamtx/%path/%Y-%m-%d_%H-%M-%S-%f',
      recordFormat: 'fmp4', recordMaxPartSize: '50M',
      recordPartDuration: '1s', recordSegmentDuration: '1h', recordDeleteAfter: '24h',
      // RTSP
      rtspTransport: 'automatic', rtspAnyPort: false, rtspRangeType: '',
      rtspRangeStart: '', rtspUDPSourcePortRange: '',
      // RTP
      rtpSDP: '',
      // WebRTC / WHEP
      whepBearerToken: '', whepSTUNGatherTimeout: '5s',
      whepHandshakeTimeout: '10s', whepTrackGatherTimeout: '3s',
      // Hooks — lifecycle
      runOnInit: '', runOnInitRestart: false,
      runOnDemand: '', runOnDemandRestart: false,
      runOnDemandStartTimeout: '10s', runOnDemandCloseAfter: '10s', runOnUnDemand: '',
      // Hooks — stream events
      runOnReady: '', runOnReadyRestart: false, runOnNotReady: '',
      runOnRead: '', runOnReadRestart: false, runOnUnread: '',
      // Hooks — recording events
      runOnRecordSegmentCreate: '', runOnRecordSegmentComplete: '',
    });
  if (path === '/mediamtx/config/paths/list')
    return jsonResponse({ pageCount: 1, itemCount: MOCK_PATHS.length, items: MOCK_PATHS });
  if (path === '/mediamtx/paths/list')
    return jsonResponse({ pageCount: 1, itemCount: MOCK_PATHS.length, items: MOCK_PATHS });
  if (path === '/mediamtx/recordings/list')
    return jsonResponse({ pageCount: 1, itemCount: 0, items: [] });
  if (path === '/mediamtx/logs')
    return jsonResponse({ items: MOCK_LOGS });
  if (path.startsWith('/mediamtx/') && path.endsWith('/list'))
    return jsonResponse({ pageCount: 0, itemCount: 0, items: [] });
  if (path === '/go2rtc/api/streams' || path.startsWith('/go2rtc/api/streams?'))
    return jsonResponse(MOCK_GO2RTC_STREAMS);
  return null;
}

export function isMockFallbackEnabled() {
  return localStorage.getItem('mockFallback') !== 'off';
}
