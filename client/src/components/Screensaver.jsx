import { useEffect, useRef, useState } from 'react';

// Full-screen screensaver overlay with looping video bg + big clock.
// Activates after `idleMs` of no mouse/keyboard/touch activity. Dismisses on
// any input. Lives in Layout so it can cover the entire app, including the
// sidebar, header, and current tab.

const IDLE_MS = 2 * 60 * 1000; // 2 min
const POLL_MS = 5000;

export default function Screensaver() {
  const [active, setActive] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const lastInputRef = useRef(Date.now());
  const videoRef = useRef(null);

  // Track user activity. Throttle to avoid hot-path re-renders on every move.
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
    const onAct = () => { lastInputRef.current = Date.now(); };
    events.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onAct));
  }, []);

  // Poll idle time. Cheaper than wiring re-render on every event.
  useEffect(() => {
    const id = setInterval(() => {
      const idle = Date.now() - lastInputRef.current;
      setActive((cur) => (idle >= IDLE_MS ? true : cur && idle < 500 ? false : cur));
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Once active: dismiss on any input.
  useEffect(() => {
    if (!active) return;
    const dismiss = () => { lastInputRef.current = Date.now(); setActive(false); };
    const events = ['mousedown', 'keydown', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, dismiss, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, dismiss));
  }, [active]);

  // Tick the clock every second while active.
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  // Try to play the video when activated (autoplay needs muted to be allowed).
  useEffect(() => {
    if (!active || !videoRef.current) return;
    videoRef.current.play().catch(() => {});
  }, [active]);

  if (!active) return null;

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="screensaver">
      <video
        ref={videoRef}
        className="screensaver-bg"
        src="/screensaver.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="screensaver-overlay"></div>
      <div className="screensaver-clock">
        <div className="screensaver-time">
          <span>{hh}</span>
          <span className="screensaver-colon">:</span>
          <span>{mm}</span>
        </div>
        <div className="screensaver-date">{dateStr}</div>
        <div className="screensaver-hint">Touch or move to dismiss</div>
      </div>
    </div>
  );
}
