import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiUrl } from './api';
import useRealtimeSync from './useRealtimeSync';
import './Invoices.css';

const API = apiUrl('/api/invoices');

function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const res = await fetch(`${API}/${id}`);
        if (!res.ok) throw new Error('Failed to load invoice');
        const data = await res.json();
        setInvoice(data);
      } catch (err) {
        setError(err.message);
      }
    };

    loadInvoice();
  }, [id]);

  useRealtimeSync(async () => {
    try {
      const res = await fetch(`${API}/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setInvoice(data);
    } catch (err) {
      // keep silent during background sync
    }
  }, 5000);

  const postToAccounting = async () => {
    try {
      const res = await fetch(`${API}/${id}/post`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to post invoice');
      navigate('/accounting');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="invoices-container"><p className="error-message">{error}</p></div>;
  if (!invoice) return <div className="invoices-container"><p>Loading invoice...</p></div>;

  return (
    <div className="invoices-container">
      <div className="invoice-detail-header-actions">
        <button className="btn btn--primary" onClick={() => navigate('/invoices')}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Invoices
        </button>
        <button className="btn btn--primary" onClick={() => navigate('/accounting')}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 3h4v4M10 14l5-5-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to Accounting
        </button>
      </div>
      <div className="invoice-detail-card">
        <h2>{invoice.invoiceName}</h2>
        <p className="invoice-detail-subtitle">Invoice details synced from your records and imports.</p>
        <div>Invoice Date: {invoice.invoiceDate || '-'}</div>
        <div>Amount: ₱{(invoice.amount || 0).toFixed(2)}</div>
        <div>Status: {invoice.status}</div>
      </div>
      <div className="invoice-detail-actions">
        <button className="btn btn--primary" onClick={postToAccounting}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Post to Accounting
        </button>
      </div>
    </div>
  );
}

export default Invoice;
