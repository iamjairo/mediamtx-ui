import { createContext, useContext, useRef } from 'react';

// Cross-tab navigation state — replaces the vanilla `page.viewerHint` global.
// When MediaMTX Sources / Snapshots / Camera Wall wants to jump to the Stream
// Viewer with a specific stream pre-selected, it calls `setViewerHint({...})`
// before navigating. The Stream Viewer reads it on mount.

const ViewerHintContext = createContext({ get: () => null, set: () => {} });

export function ViewerHintProvider({ children }) {
  // Use a ref so setting the hint doesn't trigger a re-render of unrelated
  // subscribers — only the Stream Viewer reads it, and only on mount.
  const ref = useRef(null);

  const value = {
    get() {
      const v = ref.current;
      ref.current = null; // consume on read, matches vanilla behavior
      return v;
    },
    set(hint) {
      ref.current = hint;
    },
  };

  return <ViewerHintContext.Provider value={value}>{children}</ViewerHintContext.Provider>;
}

export function useViewerHint() {
  return useContext(ViewerHintContext);
}
