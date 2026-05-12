import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function DashboardTileIcon() {
  return (
    <svg className="home-dashboard-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="homeDashGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ecbff" />
          <stop offset="100%" stopColor="#1e8bff" />
        </linearGradient>
      </defs>
      <rect x="4" y="6" width="56" height="52" rx="12" fill="rgba(22,57,107,0.85)" stroke="url(#homeDashGrad)" strokeWidth="2" />
      <rect x="12" y="16" width="14" height="10" rx="3" fill="url(#homeDashGrad)" />
      <rect x="30" y="16" width="22" height="4" rx="2" fill="#78d6ff" opacity="0.85" />
      <rect x="30" y="22" width="16" height="4" rx="2" fill="#78d6ff" opacity="0.55" />
      <path d="M14 43 L24 35 L33 39 L46 29 L52 33" fill="none" stroke="#31ff98" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="35" r="2.5" fill="#31ff98" />
      <circle cx="33" cy="39" r="2.5" fill="#31ff98" />
      <circle cx="46" cy="29" r="2.5" fill="#31ff98" />
    </svg>
  );
}

function Home() {
  const navigate = useNavigate();

  const modules = [
    { id: 0, name: 'Dashboard', iconType: 'dashboard', route: '/dashboard', description: 'See top-level KPIs and trends' },
    { id: 1, name: 'Accounting', icon: '📊', route: '/accounting', description: 'Monitor cash flow and entries' },
    { id: 2, name: 'Project', icon: '📋', route: '/project', description: 'Track contracts and progress' },
    { id: 3, name: 'Subcontractor', icon: '👷', route: '/subcontractor', description: 'Manage partner obligations' },
    { id: 4, name: 'Inventory', icon: '📦', route: '/inventory', description: 'Control stock and valuation' },
  ];

  const handleModuleClick = (module) => {
    if (module.route) {
      navigate(module.route);
    } else {
      alert(`${module.name} module coming soon!`);
    }
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>ERP System</h1>
        <p>Select a module to get started</p>
        <div className="home-chip-row">
          <span className="home-chip">5 Active Modules</span>
          <span className="home-chip">Realtime Data</span>
          <span className="home-chip">Auto Save Enabled</span>
        </div>
      </div>

      <div className="modules-grid">
        {modules.map((module) => (
          <div
            key={module.id}
            className={`module-card ${module.route ? 'active' : 'disabled'}`}
            onClick={() => handleModuleClick(module)}
          >
            <div className="module-icon">{module.iconType === 'dashboard' ? <DashboardTileIcon /> : module.icon}</div>
            <div className="module-name">{module.name}</div>
            <div className="module-description">{module.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
