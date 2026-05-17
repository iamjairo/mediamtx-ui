import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import LogsTab from './components/Tabs/LogsTab.jsx';
import HwAccelTab from './components/Tabs/HwAccelTab.jsx';
import ApiDocsTab from './components/Tabs/ApiDocsTab.jsx';
import ScryptedTab from './components/Tabs/ScryptedTab.jsx';
import MatterBridgeTab from './components/Tabs/MatterBridgeTab.jsx';
import HomeAssistantTab from './components/Tabs/HomeAssistantTab.jsx';
import HardwareTab from './components/Tabs/HardwareTab.jsx';
import CaddyTab from './components/Tabs/CaddyTab.jsx';
import DockerTab from './components/Tabs/DockerTab.jsx';
import DashboardTab from './components/Tabs/DashboardTab.jsx';
import MediaMTXSourcesTab from './components/Tabs/MediaMTXSourcesTab.jsx';
import Go2RTCSourcesTab from './components/Tabs/Go2RTCSourcesTab.jsx';
import RecordingsTab from './components/Tabs/RecordingsTab.jsx';
import ServerTab from './components/Tabs/ServerTab.jsx';
import PathTab from './components/Tabs/PathTab.jsx';
import StreamsTab from './components/Tabs/StreamsTab.jsx';
import UsersTab from './components/Tabs/UsersTab.jsx';
import StreamViewerTab from './components/Tabs/StreamViewerTab.jsx';
import CameraWallTab from './components/Tabs/CameraWallTab.jsx';
import CameraFocusTab from './components/Tabs/CameraFocusTab.jsx';
import SnapshotsTab from './components/Tabs/SnapshotsTab.jsx';
import OverviewTab from './components/Tabs/OverviewTab.jsx';
import Placeholder from './components/Tabs/Placeholder.jsx';
import { TABS } from './tabsConfig.js';

// Ported tabs — add to this map as each one migrates. Everything else gets the
// Placeholder component so navigation always works end-to-end.
const PORTED = {
  logs: LogsTab,
  hwaccel: HwAccelTab,
  apidocs: ApiDocsTab,
  scrypted: ScryptedTab,
  matterbridge: MatterBridgeTab,
  homeassistant: HomeAssistantTab,
  hardware: HardwareTab,
  caddy: CaddyTab,
  docker: DockerTab,
  dashboard: DashboardTab,
  mtxsources: MediaMTXSourcesTab,
  go2rtcsources: Go2RTCSourcesTab,
  recordings: RecordingsTab,
  server: ServerTab,
  path: PathTab,
  streams: StreamsTab,
  users: UsersTab,
  streamviewer: StreamViewerTab,
  camerawall: CameraWallTab,
  camerafocus: CameraFocusTab,
  snapshots: SnapshotsTab,
  overview: OverviewTab,
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        {TABS.map((tab) => {
          const Component = PORTED[tab.slug];
          return (
            <Route
              key={tab.slug}
              path={tab.slug}
              element={Component ? <Component /> : <Placeholder name={tab.name} />}
            />
          );
        })}
      </Route>
    </Routes>
  );
}
