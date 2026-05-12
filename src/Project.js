import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from './api';
import useRealtimeSync from './useRealtimeSync';
import './Project.css';

const API_URL = apiUrl('/api/projects');

function Project() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterYear, setFilterYear] = useState(null);
  const [filterMonth, setFilterMonth] = useState(null);

  // Fetch projects from database
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch projects');
      const data = await response.json();
      const formattedData = data.map(project => ({
        id: project.id,
        companyName: project.companyName || '',
        projectRequirements: project.projectRequirements || '',
        businessNameLocation: project.businessNameLocation || '',
        purchasedOrderNumber: project.purchasedOrderNumber || '',
        contractPerson: project.contractPerson || '',
        contactNumber: project.contactNumber || '',
        totalContractPrice: project.totalContractPrice || 0,
        downPayment: project.downPayment || 0,
        progress: [project.progress1 || 0, project.progress2 || 0, project.progress3 || 0, project.progress4 || 0, project.progress5 || 0],
        status: project.status || 'Ongoing',
        year: project.year || 2026,
        month: project.month || 1,
      }));
      setProjects(formattedData);
      setError(null);
    } catch (err) {
      setError('Error loading projects: ' + err.message);
      console.error(err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Add new project
  const addProject = async () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const newProject = {
      companyName: '',
      projectRequirements: '',
      businessNameLocation: '',
      purchasedOrderNumber: '',
      contractPerson: '',
      contactNumber: '',
      totalContractPrice: 0,
      downPayment: 0,
      progress1: 0,
      progress2: 0,
      progress3: 0,
      progress4: 0,
      progress5: 0,
      status: 'Ongoing',
      year: currentYear > 2035 ? 2035 : (currentYear < 2026 ? 2026 : currentYear),
      month: currentMonth,
    };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }
      await fetchProjects();
      setError(null);
    } catch (err) {
      setError('Error adding project: ' + err.message);
      console.error(err);
    }
  };

  // Remove project
  const removeProject = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }
      await fetchProjects();
      setError(null);
    } catch (err) {
      setError('Error removing project: ' + err.message);
      console.error(err);
    }
  };

  // Update project field
  const updateProject = (id, field, value) => {
    setProjects(projects.map(p =>
      p.id === id ? { 
        ...p, 
        [field]: ['totalContractPrice', 'downPayment', 'year', 'month'].includes(field) 
          ? (field === 'year' || field === 'month' ? parseInt(value) || 0 : (parseFloat(value) || 0))
          : value 
      } : p
    ));
  };

  // Save project to database
  const saveProject = async (project) => {
    try {
      // Validate before sending
      const totalPrice = parseFloat(project.totalContractPrice);
      const downPay = parseFloat(project.downPayment);
      const projectYear = parseInt(project.year);
      const projectMonth = parseInt(project.month);

      if (isNaN(totalPrice) || isNaN(downPay)) {
        setError('Contract price and down payment must be valid numbers');
        return;
      }

      if (totalPrice < 0 || downPay < 0) {
        setError('Prices cannot be negative');
        return;
      }

      if (downPay > totalPrice) {
        setError('Down payment cannot exceed total contract price');
        return;
      }

      if (isNaN(projectYear) || projectYear < 2026 || projectYear > 2035) {
        setError('Year must be between 2026 and 2035');
        return;
      }

      if (isNaN(projectMonth) || projectMonth < 1 || projectMonth > 12) {
        setError('Month must be between 1 and 12');
        return;
      }

      // Verify progress values
      const progressSum = project.progress.reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
      if (isNaN(progressSum)) {
        setError('Progress values must be valid numbers');
        return;
      }

      const response = await fetch(`${API_URL}/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: project.companyName || '',
          projectRequirements: project.projectRequirements || '',
          businessNameLocation: project.businessNameLocation || '',
          purchasedOrderNumber: project.purchasedOrderNumber || '',
          contractPerson: project.contractPerson || '',
          contactNumber: project.contactNumber || '',
          totalContractPrice: totalPrice || 0,
          downPayment: downPay || 0,
          progress1: parseFloat(project.progress[0]) || 0,
          progress2: parseFloat(project.progress[1]) || 0,
          progress3: parseFloat(project.progress[2]) || 0,
          progress4: parseFloat(project.progress[3]) || 0,
          progress5: parseFloat(project.progress[4]) || 0,
          status: project.status || 'Ongoing',
          year: projectYear,
          month: projectMonth,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save project');
      }

      setError(null);
    } catch (err) {
      setError('Error saving project: ' + err.message);
      console.error(err);
    }
  };

  // Update progress payment
  const updateProgress = (id, index, value) => {
    setProjects(projects.map(p => {
      if (p.id === id) {
        const newProgress = [...p.progress];
        newProgress[index] = parseFloat(value) || 0;
        return { ...p, progress: newProgress };
      }
      return p;
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

  // Filter projects based on year and month
  const getFilteredProjects = () => {
    return projects.filter(project => {
      if (filterYear && project.year !== filterYear) return false;
      if (filterMonth && project.month !== filterMonth) return false;
      return true;
    });
  };

  useRealtimeSync(() => fetchProjects(true), 5000);

  if (loading) {
    return <div className="project-container"><p>Loading projects...</p></div>;
  }

  return (
    <div className="project-container">
      {error && <p className="error-message">{error}</p>}

      <div className="project-header-row">
        <div className="page-title-block">
          <h1>Project Tracker</h1>
          <p className="page-subtitle">Monitor contract values, milestone payments, and live project balance.</p>
        </div>
        <div className="project-header-buttons">
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <button onClick={addProject} className="btn btn--primary btn-add">
            <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Add Project
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="year-filter">Year:</label>
          <select 
            id="year-filter"
            value={filterYear || ''} 
            onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : null)}
            className="filter-select"
          >
            <option value="">All Years</option>
            {Array.from({length: 10}, (_, i) => 2026 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="month-filter">Month:</label>
          <select 
            id="month-filter"
            value={filterMonth || ''} 
            onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : null)}
            className="filter-select"
          >
            <option value="">All Months</option>
            {Array.from({length: 12}, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>
                {new Date(2026, month - 1).toLocaleString('default', {month: 'long'})}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="table-wrapper">
      <table className="project-table">
        <thead>
          <tr>
            <th>YEAR</th>
            <th>MONTH</th>
            <th>COMPANY NAME</th>
            <th>PROJECTS REQUIREMENTS</th>
            <th>BUSINESS NAME & LOCATION</th>
            <th>PURCHASED ORDER NUMBER</th>
            <th>CONTRACT PERSON</th>
            <th>CONTACT NUMBER</th>
            <th>CONTRACT PRICE</th>
            <th>DOWN PAYMENT</th>
            <th colSpan="5" className="progress-header">PROGRESS</th>
            <th>REMAINING BALANCE</th>
            <th>STATUS</th>
            <th>Action</th>
          </tr>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th></th>
            <th>1ST</th>
            <th>2ND</th>
            <th>3RD</th>
            <th>4TH</th>
            <th>5TH</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {getFilteredProjects().map((project) => {
            const remainingBalance = calculateRemainingBalance(
              project.totalContractPrice,
              project.downPayment,
              project.progress
            );

            return (
              <tr key={project.id}>
                <td>
                  <select 
                    value={project.year} 
                    onChange={(e) => {
                      const nextYear = parseInt(e.target.value, 10) || 2026;
                      updateProject(project.id, 'year', nextYear);
                      saveProject({ ...project, year: nextYear });
                    }}
                    className="filter-select"
                  >
                    {Array.from({length: 10}, (_, i) => 2026 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <select 
                    value={project.month} 
                    onChange={(e) => {
                      const nextMonth = parseInt(e.target.value, 10) || 1;
                      updateProject(project.id, 'month', nextMonth);
                      saveProject({ ...project, month: nextMonth });
                    }}
                    className="filter-select"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>
                        {new Date(2026, month - 1).toLocaleString('default', {month: 'short'})}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={project.companyName}
                    onChange={(e) => updateProject(project.id, 'companyName', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={project.projectRequirements}
                    onChange={(e) => updateProject(project.id, 'projectRequirements', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={project.businessNameLocation}
                    onChange={(e) => updateProject(project.id, 'businessNameLocation', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={project.purchasedOrderNumber}
                    onChange={(e) => updateProject(project.id, 'purchasedOrderNumber', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={project.contractPerson}
                    onChange={(e) => updateProject(project.id, 'contractPerson', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={project.contactNumber}
                    onChange={(e) => updateProject(project.id, 'contactNumber', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={project.totalContractPrice === 0 ? '' : project.totalContractPrice}
                    onChange={(e) => updateProject(project.id, 'totalContractPrice', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                    placeholder="0"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={project.downPayment === 0 ? '' : project.downPayment}
                    onChange={(e) => updateProject(project.id, 'downPayment', e.target.value)}
                    onBlur={() => saveProject(project)}
                    onKeyDown={handleEnterSave}
                    className="input-field"
                    placeholder="0" 
                  />
                </td>
                {project.progress.map((payment, index) => (
                  <td key={index}>
                    <input
                      type="number"
                      value={payment === 0 ? '' : payment}
                      onChange={(e) => updateProgress(project.id, index, e.target.value)}
                      onBlur={() => saveProject(project)}
                      onKeyDown={handleEnterSave}
                      className="input-field"
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className={remainingBalance < 0 ? 'negative' : 'positive'}>
                  ₱{remainingBalance.toFixed(2)}
                </td>
                <td className={`status-cell status-${project.status.toLowerCase()}`}>
                  <select
                    value={project.status}
                    onChange={(e) => updateProject(project.id, 'status', e.target.value)}
                    onBlur={() => saveProject(project)}
                    className="status-select"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Complete">Complete</option>
                  </select>
                </td>
                <td>
                    <button
                      onClick={() => removeProject(project.id)}
                      className="btn btn--danger btn--small"
                    >
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

export default Project;
