import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from './api';
import useRealtimeSync from './useRealtimeSync';
import './Dashboard.css';

const API_ENDPOINTS = {
  accounting: apiUrl('/api/accounting'),
  projects: apiUrl('/api/projects'),
  subcontractors: apiUrl('/api/subcontractors'),
  invoices: apiUrl('/api/invoices'),
};

function DashboardIcon() {
  return (
    <svg className="dashboard-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ecbff" />
          <stop offset="100%" stopColor="#1e8bff" />
        </linearGradient>
      </defs>
      <rect x="4" y="6" width="56" height="52" rx="12" fill="rgba(22,57,107,0.85)" stroke="url(#dashGrad)" strokeWidth="2" />
      <rect x="12" y="16" width="14" height="10" rx="3" fill="url(#dashGrad)" />
      <rect x="30" y="16" width="22" height="4" rx="2" fill="#78d6ff" opacity="0.85" />
      <rect x="30" y="22" width="16" height="4" rx="2" fill="#78d6ff" opacity="0.55" />
      <path d="M14 43 L24 35 L33 39 L46 29 L52 33" fill="none" stroke="#31ff98" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="35" r="2.5" fill="#31ff98" />
      <circle cx="33" cy="39" r="2.5" fill="#31ff98" />
      <circle cx="46" cy="29" r="2.5" fill="#31ff98" />
    </svg>
  );
}

function StatCard({ title, value, note }) {
  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <h3 className="stat-value">{value}</h3>
      <p className="stat-note">{note}</p>
    </div>
  );
}

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value || 0);

const sum = (items, mapper) => items.reduce((total, item) => total + mapper(item), 0);

function Dashboard() {
  const navigate = useNavigate();
  const mountedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSlice, setActiveSlice] = useState('');
  const [data, setData] = useState({
    accounting: [],
    projects: [],
    subcontractors: [],
    invoices: [],
  });

  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const responses = await Promise.all([
        fetch(API_ENDPOINTS.accounting),
        fetch(API_ENDPOINTS.projects),
        fetch(API_ENDPOINTS.subcontractors),
        fetch(API_ENDPOINTS.invoices),
      ]);

      responses.forEach((response) => {
        if (!response.ok) {
          throw new Error('Failed to load dashboard data');
        }
      });

      const [accounting, projects, subcontractors, invoices] = await Promise.all(
        responses.map((response) => response.json())
      );

      if (!mountedRef.current) {
        return;
      }

      setData({
        accounting: Array.isArray(accounting) ? accounting : [],
        projects: Array.isArray(projects) ? projects : [],
        subcontractors: Array.isArray(subcontractors) ? subcontractors : [],
        invoices: Array.isArray(invoices) ? invoices : [],
      });
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Unable to load dashboard totals');
      }
    } finally {
      if (mountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchDashboardData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchDashboardData]);

  useRealtimeSync(() => fetchDashboardData(true), 5000);

  const totals = useMemo(() => {
    const accountingTotal = sum(data.accounting, (entry) => toNumber(entry.debit ?? entry.amount));
    const projectTotal = sum(data.projects, (project) => toNumber(project.totalContractPrice));
    const subcontractorTotal = sum(data.subcontractors, (sub) => toNumber(sub.totalContractPrice));
    const invoicesTotal = sum(data.invoices, (invoice) => toNumber(invoice.amount));

    return {
      accountingTotal,
      projectTotal,
      subcontractorTotal,
      invoicesTotal,
      grandTotal:
        accountingTotal +
        projectTotal +
        subcontractorTotal +
        invoicesTotal,
    };
  }, [data]);

  const chartSeries = useMemo(
    () => [
      {
        key: 'accounting',
        label: 'Accounting',
        value: totals.accountingTotal,
        color: '#ffbf3f',
      },
      {
        key: 'project',
        label: 'Projects',
        value: totals.projectTotal,
        color: '#8c7bff',
      },
      {
        key: 'subcontractor',
        label: 'Subcontractor',
        value: totals.subcontractorTotal,
        color: '#2ad9a6',
      },
      {
        key: 'invoices',
        label: 'Invoices',
        value: totals.invoicesTotal,
        color: '#ff5d9f',
      },
    ],
    [totals]
  );

  const pieTotal = Math.max(1, chartSeries.reduce((acc, item) => acc + item.value, 0));

  const withAlpha = (hexColor, alpha) => {
    if (!hexColor) return `rgba(100,100,100,${alpha})`;
    // if already rgb/rgba return with replaced alpha
    if (hexColor.startsWith('rgb')) {
      return hexColor.replace(/rgba?\(([^)]+)\)/, (m, inside) => {
        const parts = inside.split(',').map((p) => p.trim());
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
      });
    }

    const cleaned = hexColor.replace('#', '').trim();
    const normalized = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      // fallback color
      return `rgba(120,120,160,${alpha})`;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const activeItem = chartSeries.find((item) => item.key === activeSlice) || null;
  const activePercent = activeItem ? Math.round((activeItem.value / pieTotal) * 1000) / 10 : 100;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-title-wrap">
          <div className="dashboard-icon-wrap">
            <DashboardIcon />
          </div>
          <div>
            <h1>Dashboard</h1>
            <p>Overview of core business signals</p>
          </div>
        </div>

        <button className="btn btn--primary" onClick={() => navigate('/')}>
          Back Home
        </button>
      </div>

      {error && <p className="dashboard-error">{error}</p>}

      <section className="stats-grid">
        <StatCard
          title="Dashboard Total"
          value={loading ? 'Loading...' : formatCurrency(totals.grandTotal)}
          note="Combined value from all modules"
        />
        <StatCard
          title="Project Contracts"
          value={loading ? 'Loading...' : formatCurrency(totals.projectTotal)}
          note={`${data.projects.length} project records`}
        />
        <StatCard
          title="Subcontractor Contracts"
          value={loading ? 'Loading...' : formatCurrency(totals.subcontractorTotal)}
          note={`${data.subcontractors.length} subcontractor records`}
        />
        <StatCard
          title="Invoices Amount"
          value={loading ? 'Loading...' : formatCurrency(totals.invoicesTotal)}
          note={`${data.invoices.length} invoice records`}
        />
      </section>

      <section className="dashboard-chart-card" aria-label="Module totals chart">
        <div className="dashboard-chart-header">
          <h2>Module Totals</h2>
          <p>Live totals from Accounting, Projects, Subcontractor, and Invoices.</p>
        </div>

        <div className="dashboard-chart-pie-layout">
          <div className="dashboard-pie-wrap">
            <svg className={`dashboard-pie ${activeSlice ? 'is-focused' : ''}`} viewBox="0 0 200 200" aria-label="Module totals pie chart">
              <defs>
                <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="18" floodColor="#071730" floodOpacity="0.45" />
                </filter>
              </defs>
              <g transform="translate(100,100)">
                {/* draw slices */}
                {(() => {
                  const cx = 0;
                  const cy = 0;
                  const outerR = 90;
                  const innerR = 52;
                  let angleStart = -90; // start at top
                  return chartSeries.map((item) => {
                    const percent = pieTotal <= 0 ? 0 : item.value / pieTotal;
                    const angle = percent * 360;
                    const angleEnd = angleStart + angle;
                    if (percent <= 0) {
                      angleStart = angleEnd;
                      return null;
                    }

                    const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
                      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
                      return {
                        x: centerX + radius * Math.cos(angleInRadians),
                        y: centerY + radius * Math.sin(angleInRadians),
                      };
                    };

                    const describeArc = (x, y, outerR, innerR, startAngle, endAngle) => {
                      const startOuter = polarToCartesian(x, y, outerR, endAngle);
                      const endOuter = polarToCartesian(x, y, outerR, startAngle);
                      const startInner = polarToCartesian(x, y, innerR, endAngle);
                      const endInner = polarToCartesian(x, y, innerR, startAngle);

                      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

                      return [
                        `M ${startOuter.x} ${startOuter.y}`,
                        `A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
                        `L ${endInner.x} ${endInner.y}`,
                        `A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
                        'Z',
                      ].join(' ');
                    };

                    const fill = (!activeSlice || activeSlice === item.key) ? withAlpha(item.color, 1) : withAlpha(item.color, 0.22);

                    const pathD = describeArc(cx, cy, outerR, innerR, angleStart, angleEnd);
                    angleStart = angleEnd;

                    return (
                      <path
                        key={item.key}
                        d={pathD}
                        fill={fill}
                        stroke="rgba(0,0,0,0.06)"
                        strokeWidth="0.6"
                        filter="url(#pieShadow)"
                        onMouseEnter={() => setActiveSlice(item.key)}
                        onMouseLeave={() => setActiveSlice('')}
                      />
                    );
                  });
                })()}
              </g>
            </svg>

            <div className="dashboard-pie-center">
              <span>{activeItem ? activeItem.label : 'Total'}</span>
              <strong>{loading ? '...' : formatCurrency(activeItem ? activeItem.value : totals.grandTotal)}</strong>
              <em>{loading ? '...' : `${activePercent}% share`}</em>
            </div>
          </div>

          <div className="dashboard-pie-legend">
          {chartSeries.map((item) => {
            const percent = Math.round((item.value / pieTotal) * 1000) / 10;

            return (
              <div
                className={`dashboard-legend-item ${activeSlice === item.key ? 'is-active' : ''}`}
                key={item.key}
                onMouseEnter={() => setActiveSlice(item.key)}
                onMouseLeave={() => setActiveSlice('')}
              >
                <div className="dashboard-legend-head">
                  <span className="dashboard-legend-dot" style={{ backgroundColor: item.color }} />
                  <span className="dashboard-legend-label">{item.label}</span>
                  <span className="dashboard-legend-percent">{loading ? '...' : `${percent}%`}</span>
                </div>
                <span className="dashboard-legend-value">{loading ? '...' : formatCurrency(item.value)}</span>
              </div>
            );
          })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
