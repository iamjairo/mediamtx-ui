// Single source of truth for the tab list. Mirrors the vanilla version's tab order
// and slugs so URL hashes stay backwards compatible after the migration.
export const SECTIONS = {
  main: 'Dashboard',
  streaming: 'Streaming',
  config: 'Configuration',
  infra: 'Infrastructure',
};

export const TABS = [
  { name: 'Dashboard', slug: 'dashboard', icon: 'home', section: 'main' },
  { name: 'Overview', slug: 'overview', icon: 'layout-dashboard', section: 'main' },
  { name: 'Stream Viewer', slug: 'streamviewer', icon: 'play', section: 'streaming' },
  { name: 'Streams', slug: 'streams', icon: 'expand', section: 'streaming' },
  { name: 'MediaMTX Sources', slug: 'mtxsources', icon: 'radio', section: 'streaming' },
  { name: 'Go2RTC Sources', slug: 'go2rtcsources', icon: 'eye', section: 'streaming' },
  { name: 'Camera Wall', slug: 'camerawall', icon: 'layout-grid', section: 'streaming' },
  { name: 'Camera Focus', slug: 'camerafocus', icon: 'eye', section: 'streaming' },
  { name: 'Snapshots', slug: 'snapshots', icon: 'package-check', section: 'streaming' },
  { name: 'Recordings', slug: 'recordings', icon: 'film', section: 'streaming' },
  { name: 'Server', slug: 'server', icon: 'settings', section: 'config' },
  { name: 'Path Defaults', slug: 'path', icon: 'layers-2', section: 'config' },
  { name: 'Hardware', slug: 'hardware', icon: 'cpu', section: 'config' },
  { name: 'HW Acceleration', slug: 'hwaccel', icon: 'chart-no-axes-combined', section: 'config' },
  { name: 'Users', slug: 'users', icon: 'user', section: 'config' },
  { name: 'Settings', slug: 'integrations', icon: 'settings', section: 'config' },
  { name: 'Logs', slug: 'logs', icon: 'scroll-text', section: 'infra' },
  { name: 'API Docs', slug: 'apidocs', icon: 'message-circle-question-mark', section: 'infra' },
  { name: 'Caddy', slug: 'caddy', icon: 'shield', section: 'infra' },
  { name: 'Scrypted', slug: 'scrypted', icon: 'layout-dashboard', section: 'infra' },
  { name: 'Matter Bridge', slug: 'matterbridge', icon: 'shield', section: 'infra' },
  { name: 'Home Assistant', slug: 'homeassistant', icon: 'home', section: 'infra' },
];

export const TAB_BY_SLUG = Object.fromEntries(TABS.map((t) => [t.slug, t]));
