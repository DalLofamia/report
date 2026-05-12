import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl, assetUrl } from './api';
import useRealtimeSync from './useRealtimeSync';
import './Invoices.css';

const API_URL = apiUrl('/api/invoices');
const SUPPORTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];

const isSupportedInvoiceFile = (file) => {
  if (!file) {
    return false;
  }

  const extensionMatches = /\.(pdf|jpe?g|png|webp|gif|bmp)$/i.test(file.name);
  return SUPPORTED_FILE_TYPES.includes(file.type) || extensionMatches;
};

const isPdfFile = (filePath = '') => filePath.toLowerCase().endsWith('.pdf');
const getStoredPreviewUrl = (filePath) => assetUrl(filePath);

const formatInvoiceDate = (rawDate) => {
  if (!rawDate) {
    return 'No date';
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'No date';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInvoiceSourceLabel = (invoice) => (invoice.filePath ? 'Imported file' : 'Manual entry');

function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      setInvoices(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const addInvoice = async () => {
    try {
      const form = new FormData();
      form.append('invoiceName', 'New Invoice');
      form.append('invoiceDate', '');
      form.append('amount', 0);
      form.append('status', 'Draft');

      const res = await fetch(API_URL, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Failed to create invoice');
      await fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteInvoice = async (id) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete invoice');
      await fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const uploadFile = async (id, file) => {
    if (!isSupportedInvoiceFile(file)) {
      setError('Only PDF or image files can be uploaded as invoices.');
      return;
    }

    try {
      const form = new FormData();
      form.append('invoiceName', invoices.find(i => i.id === id)?.invoiceName || 'Invoice');
      form.append('invoiceDate', invoices.find(i => i.id === id)?.invoiceDate || '');
      form.append('amount', invoices.find(i => i.id === id)?.amount || 0);
      form.append('status', invoices.find(i => i.id === id)?.status || 'Draft');
      form.append('file', file);

      const res = await fetch(`${API_URL}/${id}`, { method: 'PUT', body: form });
      if (!res.ok) throw new Error('Failed to upload file');
      await fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const importFileAsInvoice = async (file) => {
    if (!isSupportedInvoiceFile(file)) {
      setError('Only PDF or image files can be imported as invoices.');
      return;
    }

    try {
      const form = new FormData();
      const name = file.name.replace(/\.[^.]+$/, '');
      form.append('invoiceName', name);
      form.append('invoiceDate', '');
      form.append('amount', 0);
      form.append('status', 'Draft');
      form.append('file', file);
      const res = await fetch(API_URL, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Failed to import invoice');
      await fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) importFileAsInvoice(file);
  };

  const onFileInput = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importFileAsInvoice(file);
    e.target.value = '';
  };

  const totalInvoices = invoices.length;
  const importedInvoices = invoices.filter((invoice) => invoice.filePath).length;
  const manualInvoices = totalInvoices - importedInvoices;
  const validatedInvoices = invoices.filter((invoice) => (invoice.amount || 0) > 0).length;
  const chartData = [
    { label: 'Total', value: totalInvoices, color: '#2d6f6f' },
    { label: 'Imported', value: importedInvoices, color: '#8b5cf6' },
    { label: 'Manual', value: manualInvoices, color: '#0c7b93' },
    { label: 'With Amount', value: validatedInvoices, color: '#f59e0b' },
  ];
  const maxChartValue = Math.max(1, ...chartData.map((item) => item.value));

  useRealtimeSync(() => fetchInvoices(true), 5000);

  if (loading) return <div className="invoices-container"><p>Loading invoices...</p></div>;

  return (
    <div className="invoices-container">
      <div className="invoices-top-row">
        <div className="left-controls">
          <button className="btn btn--primary" onClick={() => navigate('/accounting')}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Accounting
          </button>
          <button className="btn btn--primary" onClick={addInvoice}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            New
          </button>
          <label className="btn-import">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Import
            <input ref={fileInputRef} type="file" accept="application/pdf,image/*" onChange={onFileInput} />
          </label>
        </div>

        <h1 className="invoices-title">Customer Invoices</h1>

        <div className="invoices-stats">
          <div className="stat"><span className="stat-count">{totalInvoices}</span> Total Invoices <span className="stat-amount">all records</span></div>
          <div className="stat"><span className="stat-count">{importedInvoices}</span> Imported In App <span className="stat-amount">pdf + images</span></div>
          <div className="stat"><span className="stat-count">{validatedInvoices}</span> With Amount <span className="stat-amount">active records</span></div>
        </div>
      </div>

      <p className="invoices-helper-text">Drag and drop PDF/screenshots into the chart area or use Import to add invoice documents.</p>

      <div className="invoices-chart" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
        <div className="chart-heading">
          <div>
            <h2>Invoice Activity</h2>
            <p>Bars update from the invoices stored in the database, including imported files.</p>
          </div>
          <div className="chart-summary">{importedInvoices} imported</div>
        </div>

        <div className="chart-placeholder">
          {chartData.map((item) => {
            const height = `${Math.max(10, Math.round((item.value / maxChartValue) * 100))}%`;

            return (
              <div className="chart-column" key={item.label}>
                <div className="chart-value">{item.value}</div>
                <div className="bar" style={{ height, backgroundColor: item.color }} />
                <div className="chart-label">{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="invoices-list">
        {invoices.map(inv => (
          <div className="invoice-card" key={inv.id}>
            <div className="invoice-left">
              <div className="invoice-name" role="button" onClick={() => navigate(`/invoices/${inv.id}`)}>{inv.invoiceName}</div>
              <div className="invoice-details">
                <span>{formatInvoiceDate(inv.invoiceDate)}</span>
                <span className="invoice-divider">|</span>
                <span>Status: {inv.status || 'Draft'}</span>
                <span className="invoice-divider">|</span>
                <span>{getInvoiceSourceLabel(inv)}</span>
                <span className="invoice-divider">|</span>
                <span>ID: {inv.id}</span>
              </div>
            </div>
            <div className="invoice-right">
              <div className="invoice-amount">₱{(inv.amount || 0).toLocaleString()}</div>
              <div className="invoice-actions">
                <label className="file-label">
                  Upload
                  <input type="file" accept="application/pdf,image/*" onChange={(e) => { if (e.target.files[0]) uploadFile(inv.id, e.target.files[0]); }} />
                </label>
                {inv.filePath && <button className="btn btn--primary" onClick={() => { setPreviewError(''); setSelectedInvoice({ ...inv, previewUrl: getStoredPreviewUrl(inv.filePath) }); }}>
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 3h4v4M10 14l5-5-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  View
                </button>}
                <button className="btn btn--danger" onClick={() => deleteInvoice(inv.id)}>
                  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6v12m8-12v12M10 6V4h4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedInvoice && (
        <div className="invoice-preview-modal" role="dialog" aria-modal="true" aria-label="Invoice preview">
          <div className="invoice-preview-panel">
            <div className="invoice-preview-header">
              <div>
                <h2>{selectedInvoice.invoiceName}</h2>
                <p>{selectedInvoice.filePath}</p>
              </div>
              <button className="btn-close" onClick={() => setSelectedInvoice(null)}>Close</button>
            </div>

            <div className="invoice-preview-body">
              {previewError ? (
                <div className="invoice-preview-error">
                  <p>{previewError}</p>
                  <a href={selectedInvoice.previewUrl} target="_blank" rel="noreferrer">Open file in new tab</a>
                </div>
              ) : isPdfFile(selectedInvoice.filePath) ? (
                <iframe
                  title={selectedInvoice.invoiceName}
                  src={selectedInvoice.previewUrl}
                  className="invoice-preview-frame"
                  onLoad={() => setPreviewError('')}
                  onError={() => setPreviewError('This file could not be previewed in the app. Use Open file instead.')}
                />
              ) : (
                <img
                  src={selectedInvoice.previewUrl}
                  alt={selectedInvoice.invoiceName}
                  className="invoice-preview-image"
                  onError={() => setPreviewError('This image could not be previewed in the app. Use Open file instead.')}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices;
