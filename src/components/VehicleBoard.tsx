import { useState, useEffect } from 'react';
import type { Vehicle, VehicleStatus } from '../lib/types';

interface VehicleBoardProps {
  onClose: () => void;
}

const STATUS_CONFIG: Record<VehicleStatus, { color: string; icon: string; label: string }> = {
  available: { color: '#10b981', icon: '✅', label: 'Available' },
  rented: { color: '#3b82f6', icon: '🔑', label: 'Rented' },
  reserved: { color: '#f59e0b', icon: '📅', label: 'Reserved' },
  maintenance: { color: '#8b5cf6', icon: '🔧', label: 'Maintenance' },
  cleaning: { color: '#06b6d4', icon: '🧹', label: 'Cleaning' },
  damaged: { color: '#ef4444', icon: '⚠️', label: 'Damaged' },
};

export default function VehicleBoard({ onClose }: VehicleBoardProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<VehicleStatus>('available');

  useEffect(() => { loadVehicles(); }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterBranch) params.set('branch', filterBranch);
      if (filterStatus) params.set('status', filterStatus);
      if (filterClass) params.set('class', filterClass);
      const res = await fetch(`/api/vehicles?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { vehicles: Vehicle[]; summary: Record<string, number> };
        setVehicles(data.vehicles);
        setSummary(data.summary);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadVehicles(); }, [filterBranch, filterStatus, filterClass]);

  const updateStatus = async (id: string, status: VehicleStatus) => {
    await fetch('/api/vehicles', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setEditingId(null);
    loadVehicles();
  };

  const branches = [...new Set(vehicles.map(v => v.branch))];
  const classes = [...new Set(vehicles.map(v => v.class))];

  return (
    <div className="vehicle-board">
      <div className="vehicle-board-header">
        <h2>🚗 Fleet Status Board</h2>
        <button className="btn-small" onClick={onClose}>✕ Close</button>
      </div>

      {/* Summary cards */}
      <div className="vehicle-summary-grid">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div
            key={status}
            className={`vehicle-summary-card ${filterStatus === status ? 'active' : ''}`}
            style={{ borderColor: config.color }}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
          >
            <span className="vehicle-summary-icon">{config.icon}</span>
            <span className="vehicle-summary-count">{summary[status] || 0}</span>
            <span className="vehicle-summary-label">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="vehicle-filters">
        <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn-small" onClick={() => { setFilterBranch(''); setFilterStatus(''); setFilterClass(''); }}>
          Clear Filters
        </button>
        <span className="vehicle-count">{vehicles.length} vehicles</span>
      </div>

      {/* Vehicle grid */}
      {loading ? <div className="loading-text">Loading fleet...</div> : (
        <div className="vehicle-grid">
          {vehicles.map(v => {
            const sc = STATUS_CONFIG[v.status];
            return (
              <div key={v.id} className="vehicle-card" style={{ borderLeftColor: sc.color }}>
                <div className="vehicle-card-top">
                  <div className="vehicle-card-plate">{v.plate}</div>
                  {editingId === v.id ? (
                    <div className="vehicle-status-edit">
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value as VehicleStatus)}>
                        {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                          <option key={s} value={s}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                      <button className="btn-small" onClick={() => updateStatus(v.id, editStatus)}>✓</button>
                      <button className="btn-small" onClick={() => setEditingId(null)}>✗</button>
                    </div>
                  ) : (
                    <span
                      className="vehicle-status-badge"
                      style={{ backgroundColor: sc.color }}
                      onClick={() => { setEditingId(v.id); setEditStatus(v.status); }}
                      title="Click to change status"
                    >
                      {sc.icon} {sc.label}
                    </span>
                  )}
                </div>
                <div className="vehicle-card-info">
                  <strong>{v.make} {v.model}</strong> <span className="vehicle-year">{v.year}</span>
                </div>
                <div className="vehicle-card-meta">
                  <span>{v.class}</span>
                  <span>{v.color}</span>
                  <span>{v.branch}</span>
                </div>
                <div className="vehicle-card-stats">
                  <span>⛽ {v.fuelLevel}%</span>
                  <span>📏 {v.mileage.toLocaleString()} km</span>
                </div>
                {v.currentBookingId && (
                  <div className="vehicle-card-booking">Booking: {v.currentBookingId}</div>
                )}
                {v.notes && <div className="vehicle-card-notes">{v.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
