import { useEffect, useState } from 'react';

// Returns the current clock string in the same format as the vanilla version.
// "HH:MM May 17" — HTML-friendly piece returned separately so we can preserve
// the existing `<span class="clock-date">` wrapper for CSS targeting.
export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return { time, date };
}
