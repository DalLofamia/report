import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from './api';
import useRealtimeSync from './useRealtimeSync';
import './Subcontractor.css';

const API_URL = apiUrl('/api/subcontractors');

function Subcontractor() {
  const navigate = useNavigate();
  const [subcontractors, setSubcontractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [filterYear, setFilterYear] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);

  // Fetch subcontractors from database
  useEffect(() => {
    fetchSubcontractors(false, filterYear, filterMonth);
  }, [filterYear, filterMonth]);

  const fetchSubcontractors = async (silent = false, year = filterYear, month = filterMonth) => {
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
      if (!response.ok) throw new Error('Failed to fetch subcontractors');
      const data = await response.json();
      const formattedData = data.map(sub => ({
        id: sub.id,
        subcontractor: sub.subcontractor,
        contactPerson: sub.contactPerson,
        contactNumber: sub.contactNumber,
        totalContractPrice: sub.totalContractPrice,
        downPayment: sub.downPayment,
        progress: [sub.progress1, sub.progress2, sub.progress3, sub.progress4, sub.progress5],
      }));
      setSubcontractors(formattedData);
      setError(null);
    } catch (err) {
      setError('Error loading subcontractors: ' + err.message);
      console.error(err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const getActiveSubcontractorYear = () => filterYear ?? currentYear;
  const getActiveSubcontractorMonth = () => filterMonth ?? currentMonth;

  // Add new subcontractor
  const addSubcontractor = async () => {
    const newSub = {
      subcontractor: 'New Subcontractor',
      contactPerson: '',
      contactNumber: '',
      totalContractPrice: 0,
      downPayment: 0,
      progress1: 0,
      progress2: 0,
      progress3: 0,
      progress4: 0,
      progress5: 0,
      year: getActiveSubcontractorYear(),
      month: getActiveSubcontractorMonth(),
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub),
      });
      if (!response.ok) throw new Error('Failed to create subcontractor');
      await fetchSubcontractors();
    } catch (err) {
      setError('Error adding subcontractor: ' + err.message);
      console.error(err);
    }
  };

  // Remove subcontractor
  const removeSubcontractor = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete subcontractor');
      await fetchSubcontractors();
    } catch (err) {
      setError('Error removing subcontractor: ' + err.message);
      console.error(err);
    }
  };

  // Update field
  const updateSubcontractor = (id, field, value) => {
    setSubcontractors(subcontractors.map(s =>
      s.id === id ? { 
        ...s, 
        [field]: ['totalContractPrice', 'downPayment'].includes(field) ? parseFloat(value) || 0 : value 
      } : s
    ));
  };

  // Save to database
  const saveSubcontractor = async (sub) => {
    try {
      const response = await fetch(`${API_URL}/${sub.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcontractor: sub.subcontractor,
          contactPerson: sub.contactPerson,
          contactNumber: sub.contactNumber,
          totalContractPrice: sub.totalContractPrice,
          downPayment: sub.downPayment,
          progress1: sub.progress[0],
          progress2: sub.progress[1],
          progress3: sub.progress[2],
          progress4: sub.progress[3],
          progress5: sub.progress[4],
          year: getActiveSubcontractorYear(),
          month: getActiveSubcontractorMonth(),
        }),
      });
      if (!response.ok) throw new Error('Failed to save subcontractor');
    } catch (err) {
      setError('Error saving subcontractor: ' + err.message);
      console.error(err);
    }
  };

  // Update progress payment
  const updateProgress = (id, index, value) => {
    setSubcontractors(subcontractors.map(s => {
      if (s.id === id) {
        const newProgress = [...s.progress];
        newProgress[index] = parseFloat(value) || 0;
        return { ...s, progress: newProgress };
      }
      return s;
    }));
  };

  // Press Enter to save: blur triggers onBlur save handlers
  const handleEnterSave = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // Calculate remaining balance
  const calculateRemainingBalance = (totalPrice, downPayment, progressPayments) => {
    const totalProgress = progressPayments.reduce((sum, payment) => sum + payment, 0);
    return totalPrice - downPayment - totalProgress;
  };

  useRealtimeSync(() => fetchSubcontractors(true), 5000);

  if (loading) {
    return <div className="subcontractor-container"><p>Loading subcontractors...</p></div>;
  }

  return (
    <div className="subcontractor-container">
      {error && <p className="error-message">{error}</p>}

      <div className="subcontractor-header-row">
        <div className="page-title-block">
          <h1>Subcontractor Tracker</h1>
          <p className="page-subtitle">Track subcontract budgets, progress payouts, and remaining obligations.</p>
        </div>
        <div className="subcontractor-header-buttons">
          <button className="btn-add" onClick={() => navigate('/')}>← Back</button>
          <button onClick={addSubcontractor} className="btn-add">+ Add Subcontractor</button>
        </div>
      </div>

      <div className="subcontractor-filters">
        <div className="filter-group">
          <label htmlFor="subcontractorFilterYear">Year:</label>
          <select
            id="subcontractorFilterYear"
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
          <label htmlFor="subcontractorFilterMonth">Month:</label>
          <select
            id="subcontractorFilterMonth"
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
        <table className="subcontractor-table">
          <thead>
            <tr>
              <th>SUBCONTRACTOR</th>
              <th>CONTACT PERSON</th>
              <th>CONTACT NUMBER</th>
              <th>TOTAL CONTRACT PRICE</th>
              <th>DOWNPAYMENT</th>
              <th colSpan="5" className="progress-header">PROGRESS</th>
              <th>REMAINING BALANCE</th>
              <th>Action</th>
            </tr>
            <tr>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th>1ST</th>
              <th>2nd</th>
              <th>3rd</th>
              <th>4th</th>
              <th>5th</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subcontractors.map((sub) => {
              const remainingBalance = calculateRemainingBalance(
                sub.totalContractPrice,
                sub.downPayment,
                sub.progress
              );

              return (
                <tr key={sub.id}>
                  <td>
                    <input
                      type="text"
                      value={sub.subcontractor}
                      onChange={(e) => updateSubcontractor(sub.id, 'subcontractor', e.target.value)}
                      onBlur={() => saveSubcontractor(sub)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={sub.contactPerson}
                      onChange={(e) => updateSubcontractor(sub.id, 'contactPerson', e.target.value)}
                      onBlur={() => saveSubcontractor(sub)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={sub.contactNumber}
                      onChange={(e) => updateSubcontractor(sub.id, 'contactNumber', e.target.value)}
                      onBlur={() => saveSubcontractor(sub)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={sub.totalContractPrice === 0 ? '' : sub.totalContractPrice}
                      onChange={(e) => updateSubcontractor(sub.id, 'totalContractPrice', e.target.value)}
                      onBlur={() => saveSubcontractor(sub)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={sub.downPayment === 0 ? '' : sub.downPayment}
                      onChange={(e) => updateSubcontractor(sub.id, 'downPayment', e.target.value)}
                      onBlur={() => saveSubcontractor(sub)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                      placeholder="0"
                    />
                  </td>
                  {sub.progress.map((payment, index) => (
                    <td key={index}>
                      <input
                        type="number"
                        value={payment === 0 ? '' : payment}
                        onChange={(e) => updateProgress(sub.id, index, e.target.value)}
                        onBlur={() => saveSubcontractor(sub)}
                        onKeyDown={handleEnterSave}
                        className="input-field"
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className={remainingBalance < 0 ? 'negative' : 'positive'}>
                    ₱{remainingBalance.toFixed(2)}
                  </td>
                  <td>
                    <button
                      onClick={() => removeSubcontractor(sub.id)}
                      className="btn btn--danger btn--small"
                    >
                      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6v12m8-12v12M10 6V4h4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default Subcontractor;
