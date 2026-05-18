import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import Screensaver from './Screensaver.jsx';

// Root shell — sidebar on the left, header at the top, routed tab content
// inside the .main-content container. Screensaver lives at the same level so
// it can cover the entire app, including sidebar and header, when idle.
export default function Layout() {
  return (
    <div className="page">
      <Sidebar />
      <Header />
      <div className="main-content">
        <Outlet />
      </div>
      <Screensaver />
    </div>
  );
}
