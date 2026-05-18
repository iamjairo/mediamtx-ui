import { useEffect, useState } from 'react';
import { loadIcon } from './icons.js';

// Returns the raw SVG markup for a named icon, or an empty string while loading.
// Designed to be drop-in compatible with the vanilla `icons.svg[name]` pattern.
export function useIcon(name) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let cancelled = false;
    loadIcon(name).then((markup) => {
      if (!cancelled) setSvg(markup);
    });
    return () => { cancelled = true; };
  }, [name]);
  return svg;
}
