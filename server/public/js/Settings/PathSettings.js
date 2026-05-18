import Setting from "./Setting.js";

export default class PathSettings extends Setting {
    constructor(settings) {
        super(settings);

        this.debug = false;
        this.storeKey = 'path';
        this.fields = [
            'name',
            'source',
            'sourceFingerprint',
            'sourceOnDemand',
            'sourceOnDemandStartTimeout',
            'sourceOnDemandCloseAfter',
            'maxReaders',
            'srtReadPassphrase',
            'useAbsoluteTimestamp',

            // Always Available
            'alwaysAvailable',
            'alwaysAvailableFile',
            'alwaysAvailableTracks',

            // Recording
            'record',
            'recordPath',
            'recordFormat',
            'recordPartDuration',
            'recordMaxPartSize',
            'recordSegmentDuration',
            'recordDeleteAfter',

            // Publisher source
            'overridePublisher',
            'srtPublishPassphrase',
            'rtspDemuxMpegts',

            // RTSP source
            'rtspTransport',
            'rtspAnyPort',
            'rtspRangeType',
            'rtspRangeStart',
            'rtspUDPSourcePortRange',

            // RTP source
            'rtpSDP',

            // Redirect source
            'sourceRedirect',

            // WebRTC / WHEP source
            'whepBearerToken',
            'whepSTUNGatherTimeout',
            'whepHandshakeTimeout',
            'whepTrackGatherTimeout',

            // Hooks
            'runOnInit',
            'runOnInitRestart',
            'runOnDemand',
            'runOnDemandRestart',
            'runOnDemandStartTimeout',
            'runOnDemandCloseAfter',
            'runOnUnDemand',
            'runOnReady',
            'runOnReadyRestart',
            'runOnNotReady',
            'runOnRead',
            'runOnReadRestart',
            'runOnUnread',
            'runOnRecordSegmentCreate',
            'runOnRecordSegmentComplete',
        ];

        this.options = {
            name: ['', 'all_others'],
            source: ['', 'publisher', 'redirect'],
            recordFormat: ['fmp4', 'mpegts'],
            rtspTransport: ['automatic', 'tcp', 'udp', 'multicast'],
        };

        this.inputType = {
            source: 'SelectTextInput',
            name: 'SelectTextInput',
        };

    }

    action(action, prop, value) {
        super.action(action, prop, value);

        if (this.settings.created)
            this.settings.service.savePathDefaults();
    }
}
