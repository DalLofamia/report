import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from './api';
import useRealtimeSync from './useRealtimeSync';
import './Accountingp.css';

const API_URL = apiUrl('/api/accounting');
const INVOICES_API_URL = apiUrl('/api/invoices');

function Accountingp() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState('');

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [filterYear, setFilterYear] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);

  const fetchEntries = useCallback(async (silent = false, year = filterYear, month = filterMonth) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const queryParams = new URLSearchParams();
      if (year !== null && year !== undefined && year !== '') {
        queryParams.append('year', year);
      }
      if (month !== null && month !== undefined && month !== '') {
        queryParams.append('month', month);
      }
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await fetch(API_URL + queryString);
      if (!response.ok) {
        throw new Error('Failed to fetch accounting entries');
      }
      const data = await response.json();
      setEntries(
        data.map((entry) => ({
          id: entry.id,
          category: entry.entryName || '',
          date: entry.entryDate || '',
          amount: entry.debit ?? 0,
          paymentMethod: entry.paymentMethod || '',
        }))
      );
      setError(null);
    } catch (err) {
      setError(`Error loading accounting entries: ${err.message}`);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [filterYear, filterMonth]);

  const getActiveEntryYear = () => filterYear ?? currentYear;
  const getActiveEntryMonth = () => filterMonth ?? currentMonth;

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch(INVOICES_API_URL);
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      setInvoices(data);
      if (data.length > 0 && !selectedInvoice) setSelectedInvoice(data[0].id);
    } catch (err) {
      // non-fatal
    }
  }, [selectedInvoice]);

  useEffect(() => {
    fetchEntries(false, filterYear, filterMonth);
    fetchInvoices();
  }, [filterYear, filterMonth, fetchEntries, fetchInvoices]);

  const addEntry = async () => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryName: 'New Entry',
          entryDate: '',
          particulars: '',
          debit: 0,
          credit: 0,
          payment: 0,
          paymentMethod: '',
          balance: 0,
          year: getActiveEntryYear(),
          month: getActiveEntryMonth(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create accounting entry');
      }

      await fetchEntries();
    } catch (err) {
      setError(`Error adding accounting entry: ${err.message}`);
    }
  };

  const importInvoiceToAccounting = async () => {
    if (!selectedInvoice) return alert('Select an invoice to import');
    try {
      const res = await fetch(`${INVOICES_API_URL}/${selectedInvoice}/post`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to post invoice to accounting');
      await fetchEntries();
      await fetchInvoices();
      setShowImport(false);
    } catch (err) {
      setError(`Error importing invoice: ${err.message}`);
    }
  };

  const removeEntry = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete accounting entry');
      }
      await fetchEntries();
    } catch (err) {
      setError(`Error removing accounting entry: ${err.message}`);
    }
  };

  const updateEntry = (id, field, value) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (entry.id !== id) {
          return entry;
        }

        return {
          ...entry,
          [field]: field === 'amount'
            ? value === ''
              ? ''
              : parseFloat(value) || 0
            : value,
        };
      })
    );
  };

  const saveEntry = async (entry) => {
    try {
      const response = await fetch(`${API_URL}/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryName: entry.category,
          entryDate: entry.date,
          particulars: '',
          debit: entry.amount === '' ? 0 : entry.amount,
          credit: 0,
          payment: 0,
          paymentMethod: entry.paymentMethod || '',
          balance: entry.amount === '' ? 0 : entry.amount,
          year: getActiveEntryYear(),
          month: getActiveEntryMonth(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save accounting entry');
      }
    } catch (err) {
      setError(`Error saving accounting entry: ${err.message}`);
    }
  };

  // Press Enter to save: blur triggers onBlur save handlers
  const handleEnterSave = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  useRealtimeSync(() => Promise.all([fetchEntries(true), fetchInvoices()]), 5000);

  if (loading) {
    return (
      <div className="accounting-container">
        <p>Loading accounting entries...</p>
      </div>
    );
  }

  return (
    <div className="accounting-container">
      {error && <p className="error-message">{error}</p>}

      <div className="accounting-header-row">
        <div className="page-title-block">
          <h1>Accounting Sheet</h1>
          <p className="page-subtitle">Organize categories, dates, and payment methods with ledger-ready totals.</p>
        </div>
        <div className="header-buttons">
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <button className="btn btn--primary" onClick={addEntry}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Add Entry
          </button>
          <button className="btn btn--primary" onClick={() => navigate('/invoices')}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 3h4v4M10 14l5-5-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Invoices
          </button>
        </div>
      </div>

      <div className="accounting-filters">
        <div className="filter-group">
          <label htmlFor="accountingFilterYear">Year:</label>
          <select
            id="accountingFilterYear"
            className="filter-select"
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value, 10) : null)}
          >
            <option value="">All Years</option>
            {Array.from({ length: 10 }, (_, i) => 2026 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="accountingFilterMonth">Month:</label>
          <select
            id="accountingFilterMonth"
            className="filter-select"
            value={filterMonth ?? ''}
            onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value, 10) : null)}
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {new Date(2026, month - 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="accounting-table">
          <thead>
            <tr>
              <th>CATEGORY</th>
              <th>DATE</th>
              <th>AMOUNT</th>
              <th>PAYMENT METHOD</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <input
                    type="text"
                    value={entry.category}
                    onChange={(e) => updateEntry(entry.id, 'category', e.target.value)}
                    onBlur={() => saveEntry(entry)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="date"
                    value={entry.date}
                    onChange={(e) => updateEntry(entry.id, 'date', e.target.value)}
                    onBlur={() => saveEntry(entry)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={entry.amount === 0 ? '' : entry.amount}
                    onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                    onBlur={() => saveEntry(entry)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                    placeholder="0"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    list="payment-method-options"
                    value={entry.paymentMethod}
                    onChange={(e) => updateEntry(entry.id, 'paymentMethod', e.target.value)}
                    onBlur={() => saveEntry(entry)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                    placeholder="Cash / GCash / Online Banking"
                  />
                </td>
                <td>
                  <button className="btn btn--danger btn--small" onClick={() => removeEntry(entry.id)}>
                    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6v12m8-12v12M10 6V4h4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showImport && (
        <div className="import-panel">
          <label>Select invoice:</label>
          <select value={selectedInvoice} onChange={(e) => setSelectedInvoice(e.target.value)} className="import-select">
            <option value="">-- Select --</option>
            {invoices.map(inv => (
              <option key={inv.id} value={inv.id}>{inv.invoiceName} - ₱{(inv.amount || 0).toLocaleString()}</option>
            ))}
          </select>
          <button className="btn btn--primary" onClick={importInvoiceToAccounting}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Import Selected
          </button>
          <button className="btn btn--danger" onClick={() => setShowImport(false)}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6v12m8-12v12M10 6V4h4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Cancel
          </button>
        </div>
      )}

      <datalist id="payment-method-options">
        <option value="Cash" />
        <option value="GCash" />
        <option value="Online Banking" />
      </datalist>
    </div>
  );
}

export default Accountingp;
