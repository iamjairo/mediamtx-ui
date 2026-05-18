// WHEP (WebRTC HTTP Egress Protocol) helper — verbatim port of
// server/public/js/webrtc.js. Used by Stream Viewer and Camera Wall to play
// MediaMTX streams over WebRTC.

export async function playWhep(videoEl, whepUrl, { onError } = {}) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  pc.ontrack = (event) => {
    if (!videoEl.srcObject) videoEl.srcObject = new MediaStream();
    videoEl.srcObject.addTrack(event.track);
  };

  pc.oniceconnectionstatechange = () => {
    if (['failed', 'disconnected'].includes(pc.iceConnectionState)) {
      onError?.(new Error(`ICE ${pc.iceConnectionState}`));
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering (non-trickle).
  await new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(resolve, 2000); // safety timeout
  });

  const res = await fetch(whepUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: pc.localDescription.sdp,
    credentials: 'include',
  });

  if (!res.ok) {
    pc.close();
    throw new Error(`WHEP error ${res.status}`);
  }

  const answerSdp = await res.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

  return pc;
}

export function destroyWhep(pc) {
  try {
    pc.getSenders().forEach((s) => s.track?.stop());
    pc.close();
  } catch {}
}

export function getWhepUrl(streamName, settings) {
  const url = new URL(window.location.href);
  const webrtcAddr = settings?.webrtc?.webrtcAddress || ':8889';
  return `${url.protocol}//${url.hostname}${webrtcAddr}/${streamName}/whep`;
}

export function getHlsUrl(streamName, settings) {
  const url = new URL(window.location.href);
  const hlsAddr = settings?.hls?.hlsAddress || ':8888';
  return `${url.protocol}//${url.hostname}${hlsAddr}/${streamName}/index.m3u8`;
}
