import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

// Root shell — sidebar on the left, header at the top, routed tab content
// inside the .main-content container. Mirrors the vanilla DOM structure exactly
// so the existing sidebar.css / header.css / tab.css cascade works unchanged.
export default function Layout() {
  return (
    <div className="page">
      <Sidebar />
      <Header />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
