const PathGroups = [
    {
        name: 'Source',
        storeKey: 'source',
        columns: [
            {
                name: 'Source',
                props: [
                    'source',
                    'sourceRedirect',
                    'sourceFingerprint',
                    'sourceOnDemand',
                    'sourceOnDemandStartTimeout',
                    'sourceOnDemandCloseAfter'
                ]
            }, {
                name: 'Always Available',
                props: [
                    'alwaysAvailable',
                    'alwaysAvailableFile',
                    'alwaysAvailableTracks'
                ]
            }, {
                name: 'I/O',
                props: [
                    'maxReaders',
                    'srtReadPassphrase',
                    'useAbsoluteTimestamp',
                    'overridePublisher',
                    'srtPublishPassphrase',
                    'rtspDemuxMpegts'
                ]
            }
        ]
    }, {
        name: 'Recording',
        storeKey: 'recording',
        columns: [
            {
                name: 'Settings',
                props: ['record', 'recordPath',
                    'recordFormat',
                    'recordMaxPartSize']
            }, {
                name: 'Duration',
                props: [
                    'recordPartDuration',
                    'recordSegmentDuration',
                    'recordDeleteAfter',
                ]
            }
        ]
    }, {
        name: 'RTSP',
        storeKey: 'rtsp',
        columns: [
            {
                name: 'RTSP Source',
                props: [
                    'rtspTransport',
                    'rtspAnyPort',
                    'rtspRangeType',
                    'rtspRangeStart',
                    'rtspUDPSourcePortRange',
                ]
            }, {
                name: 'RTP Source',
                props: [
                    'rtpSDP'
                ]
            }
        ]
    }, {
        name: 'WebRTC / WHEP',
        storeKey: 'whep',
        columns: [
            {
                name: 'WHEP Source',
                props: [
                    'whepBearerToken',
                    'whepSTUNGatherTimeout',
                    'whepHandshakeTimeout',
                    'whepTrackGatherTimeout',
                ]
            }
        ]
    }, {
        name: 'Hooks',
        storeKey: 'hooks',
        columns: [
            {
                name: 'Lifecycle',
                props: [
                    'runOnInit',
                    'runOnInitRestart',
                    'runOnDemand',
                    'runOnDemandRestart',
                    'runOnDemandStartTimeout',
                    'runOnDemandCloseAfter',
                    'runOnUnDemand',
                ]
            }, {
                name: 'Stream Events',
                props: [
                    'runOnReady',
                    'runOnReadyRestart',
                    'runOnNotReady',
                    'runOnRead',
                    'runOnReadRestart',
                    'runOnUnread',
                ]
            }, {
                name: 'Recording Events',
                props: [
                    'runOnRecordSegmentCreate',
                    'runOnRecordSegmentComplete',
                ]
            }
        ]
    },
];

export default PathGroups;
