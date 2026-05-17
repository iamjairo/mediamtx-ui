import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SECTIONS, TABS } from '../tabsConfig.js';
import { useIcon } from '../lib/useIcon.js';
import { fm } from '../lib/fetchManager.js';

function NavItem({ tab, active, onClick }) {
  const svg = useIcon(tab.icon);
  return (
    <button
      type="button"
      className={`nav-item${active ? ' active' : ''}`}
      onClick={onClick}
      data-tooltip={tab.name}
    >
      <span dangerouslySetInnerHTML={{ __html: svg }} />
      <span>{tab.name}</span>
    </button>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeSlug = pathname.replace(/^\//, '') || 'dashboard';

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar:collapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('sidebar:collapsed', String(collapsed));
  }, [collapsed]);

  async function handleLogout() {
    try { await fm.fetch('/logout', { method: 'POST' }); } catch {}
    window.location.href = '/';
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
            <rect x="2" y="6" width="14" height="12" rx="2" />
          </svg>
        </div>
        <span className="brand-name">MediaMTX</span>
        <span className="brand-version">v2.0</span>
      </div>

      <nav>
        {Object.entries(SECTIONS).map(([key, label]) => {
          const sectionTabs = TABS.filter((t) => t.section === key);
          return (
            <div className="nav-section" key={key}>
              <div className="nav-section-label">{label}</div>
              {sectionTabs.map((tab) => (
                <NavItem
                  key={tab.slug}
                  tab={tab}
                  active={activeSlug === tab.slug}
                  onClick={() => navigate(`/${tab.slug}`)}
                />
              ))}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        className="collapse-toggle"
        title="Toggle sidebar"
        onClick={() => setCollapsed((c) => !c)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="status-dot"></span>
          <span>MediaMTX Connected</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
