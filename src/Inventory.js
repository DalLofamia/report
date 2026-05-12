import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from './api';
import useRealtimeSync from './useRealtimeSync';
import './Inventory.css';

const API_URL = apiUrl('/api/inventory');

function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawingItemId, setWithdrawingItemId] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }
      const data = await response.json();
      setItems(
        data.map((item) => ({
          id: item.id,
          itemName: item.itemName,
          unit: item.unit || '',
          quantity: item.quantity ?? 0,
          location: item.location || '',
          remarks: item.remarks || '',
        }))
      );
      setError(null);
    } catch (err) {
      setError(`Error loading inventory: ${err.message}`);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const addItem = async () => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: 'New Item',
          unit: '',
          quantity: 0,
          location: '',
          remarks: '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create inventory item');
      }

      await fetchInventory();
    } catch (err) {
      setError(`Error adding inventory item: ${err.message}`);
    }
  };

  const removeItem = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete inventory item');
      }
      await fetchInventory();
    } catch (err) {
      setError(`Error removing inventory item: ${err.message}`);
    }
  };

  const updateItem = (id, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
              ? {
              ...item,
              [field]: ['quantity'].includes(field)
                ? value === ''
                  ? ''
                  : parseFloat(value) || 0
                : value,
            }
          : item
      )
    );
  };

  const saveItem = async (item) => {
    try {
      const response = await fetch(`${API_URL}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.itemName,
          unit: item.unit,
          quantity: item.quantity === '' ? 0 : item.quantity,
          location: item.location,
          remarks: item.remarks,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save inventory item');
      }
    } catch (err) {
      setError(`Error saving inventory item: ${err.message}`);
    }
  };

  // Press Enter to save: blur triggers onBlur save handlers
  const handleEnterSave = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const openWithdraw = (item) => {
    setWithdrawingItemId(item.id);
    setWithdrawAmount('');
  };

  const confirmWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    const item = items.find((i) => i.id === withdrawingItemId);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity - parseFloat(withdrawAmount));
    const updatedItem = { ...item, quantity: newQuantity };

    try {
      await saveItem(updatedItem);
      setItems((currentItems) =>
        currentItems.map((i) => (i.id === withdrawingItemId ? updatedItem : i))
      );
      setWithdrawingItemId(null);
      setWithdrawAmount('');
    } catch (err) {
      setError(`Error processing withdrawal: ${err.message}`);
    }
  };

  const cancelWithdraw = () => {
    setWithdrawingItemId(null);
    setWithdrawAmount('');
  };

  useRealtimeSync(() => fetchInventory(true), 5000);

  if (loading) {
    return (
      <div className="inventory-container">
        <p>Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      {error && <p className="error-message">{error}</p>}

      <div className="inventory-header-row">
        <div className="page-title-block">
          <h1>Inventory Sheet</h1>
          <p className="page-subtitle">Maintain stock levels, pricing, and computed total inventory value.</p>
        </div>
        <div className="inventory-header-buttons">
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <button className="btn btn--primary" onClick={addItem}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Add Item
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>ITEM NAME</th>
              <th>UNIT</th>
              <th>QUANTITY</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              
              return (
                <tr key={item.id}>
                  <td>
                    <input
                      type="text"
                      value={item.itemName}
                      onChange={(e) => updateItem(item.id, 'itemName', e.target.value)}
                      onBlur={() => saveItem(item)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      onBlur={() => saveItem(item)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      onBlur={() => saveItem(item)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn btn--primary btn--small" onClick={() => openWithdraw(item)}>
                        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Withdraw
                      </button>
                      <button className="btn btn--danger btn--small" onClick={() => removeItem(item.id)}>
                        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6v12m8-12v12M10 6V4h4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {withdrawingItemId && (
        <div className="inventory-modal-overlay" onClick={cancelWithdraw}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Withdraw Quantity</h2>
            <p>Enter the amount to withdraw:</p>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="0"
              className="input-field"
              autoFocus
            />
            <div className="inventory-modal-actions">
              <button className="btn btn--primary" onClick={confirmWithdraw}>
                Confirm
              </button>
              <button className="btn" onClick={cancelWithdraw} style={{ background: 'var(--surface-soft)', color: '#eaf5ff' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
