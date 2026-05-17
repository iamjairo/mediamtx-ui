import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import LogsTab from './components/Tabs/LogsTab.jsx';
import Placeholder from './components/Tabs/Placeholder.jsx';
import { TABS } from './tabsConfig.js';

// Ported tabs — add to this map as each one migrates. Everything else gets the
// Placeholder component so navigation always works end-to-end.
const PORTED = {
  logs: LogsTab,
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
