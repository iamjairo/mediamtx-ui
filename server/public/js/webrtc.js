/**
 * WHEP (WebRTC-HTTP Egress Protocol) client for MediaMTX and Go2RTC.
 *
 * Usage:
 *   import { playWhep, destroyWhep } from './webrtc.js';
 *   const pc = await playWhep(videoElement, '/whep/mystream');
 *   // later:
 *   destroyWhep(pc);
 */

const DEFAULT_ICE = [
    { urls: "stun:stun.l.google.com:19302" },
];

export async function playWhep(videoEl, whepUrl, opts = {}) {
    if (typeof RTCPeerConnection === "undefined") {
        throw new Error("WebRTC not supported in this browser");
    }

    const pc = new RTCPeerConnection({
        iceServers: opts.iceServers || DEFAULT_ICE,
    });

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream && videoEl.srcObject !== stream) {
            videoEl.srcObject = stream;
        }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            opts.onError?.(new Error(`WebRTC ${pc.connectionState}`));
        }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceComplete(pc);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 8000);

    let response;
    try {
        response = await fetch(whepUrl, {
            method: "POST",
            headers: { "Content-Type": "application/sdp" },
            body: pc.localDescription?.sdp || "",
            signal: controller.signal,
        });
    } catch (e) {
        pc.close();
        throw new Error(`WHEP request failed: ${e.message || "unknown"}`);
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        pc.close();
        throw new Error(`WHEP returned HTTP ${response.status}`);
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    return pc;
}

export function destroyWhep(pc) {
    if (pc && pc.connectionState !== "closed") {
        pc.close();
    }
}

function waitForIceComplete(pc) {
    return new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
            resolve();
            return;
        }
        const onChange = () => {
            if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", onChange);
                resolve();
            }
        };
        pc.addEventListener("icegatheringstatechange", onChange);
        setTimeout(() => {
            pc.removeEventListener("icegatheringstatechange", onChange);
            resolve();
        }, 3000);
    });
}

/**
 * URL helpers — derive WHEP/HLS URLs from window.location and settings.
 */
export function getWhepUrl(streamName, settings) {
    const url = new URL(window.location.href);
    const webrtcAddr = settings?.webrtc?.webrtcAddress || ':8889';
    return `${url.protocol}//${url.hostname}${webrtcAddr}/${streamName}`;
}

export function getHlsUrl(streamName, settings) {
    const url = new URL(window.location.href);
    const hlsAddr = settings?.hls?.hlsAddress || ':8888';
    return `${url.protocol}//${url.hostname}${hlsAddr}/${streamName}/index.m3u8`;
}
