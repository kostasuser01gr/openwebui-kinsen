import { useState, useEffect } from 'react';
import type { Customer, Booking } from '../lib/types';

interface CustomerLookupProps {
  onClose: () => void;
  onInsertContext?: (text: string) => void;
}

export default function CustomerLookup({ onClose, onInsertContext }: CustomerLookupProps) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { customers: Customer[]; bookings: Booking[] };
        setCustomers(data.customers);
        setBookings(data.bookings);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const selectCustomer = (c: Customer) => {
    setSelected(c);
    setCustomerBookings(bookings.filter(b => b.customerId === c.id));
  };

  const tierColors: Record<string, string> = {
    bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2',
  };

  const statusColors: Record<string, string> = {
    reserved: '#f59e0b', active: '#10b981', completed: '#6b7280', cancelled: '#ef4444', 'no-show': '#dc2626',
  };

  return (
    <div className="side-panel customer-lookup-panel">
      <div className="side-panel-header">
        <h3>👤 Customer Lookup</h3>
        <button className="btn-small" onClick={onClose}>✕</button>
      </div>

      <div className="customer-search-bar">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Name, email, phone, booking ID, license..."
        />
        <button className="btn-primary btn-small" onClick={search}>Search</button>
      </div>

      {loading && <div className="loading-text">Searching...</div>}

      {!selected ? (
        <div className="customer-results">
          {customers.length > 0 && (
            <div className="result-section">
              <h4>Customers ({customers.length})</h4>
              {customers.map(c => (
                <div key={c.id} className="customer-card" onClick={() => selectCustomer(c)}>
                  <div className="customer-card-header">
                    <strong>{c.name}</strong>
                    <span className="loyalty-badge" style={{ backgroundColor: tierColors[c.loyaltyTier] }}>
                      {c.loyaltyTier}
                    </span>
                  </div>
                  <div className="customer-card-details">
                    <span>{c.email}</span>
                    <span>{c.phone}</span>
                    <span>{c.totalRentals} rentals</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {bookings.length > 0 && (
            <div className="result-section">
              <h4>Bookings ({bookings.length})</h4>
              {bookings.map(b => (
                <div key={b.id} className="booking-card">
                  <div className="booking-card-header">
                    <strong>{b.id}</strong>
                    <span className="status-badge" style={{ backgroundColor: statusColors[b.status] }}>{b.status}</span>
                  </div>
                  <div className="booking-card-details">
                    <span>{b.vehicleClass} — {b.vehiclePlate}</span>
                    <span>€{b.dailyRate}/day · Total: €{b.totalAmount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && customers.length === 0 && bookings.length === 0 && query && (
            <div className="no-results">No results found</div>
          )}
        </div>
      ) : (
        <div className="customer-detail">
          <button className="btn-small" onClick={() => setSelected(null)}>← Back</button>
          <div className="customer-detail-header">
            <h3>{selected.name}</h3>
            <span className="loyalty-badge" style={{ backgroundColor: tierColors[selected.loyaltyTier] }}>
              {selected.loyaltyTier.toUpperCase()}
            </span>
          </div>
          <div className="customer-detail-grid">
            <div><strong>ID:</strong> {selected.id}</div>
            <div><strong>Email:</strong> {selected.email}</div>
            <div><strong>Phone:</strong> {selected.phone}</div>
            <div><strong>License:</strong> {selected.driverLicense}</div>
            <div><strong>Nationality:</strong> {selected.nationality}</div>
            <div><strong>Total Rentals:</strong> {selected.totalRentals}</div>
          </div>
          {selected.notes && (
            <div className="customer-notes">
              <strong>Notes:</strong> {selected.notes}
            </div>
          )}
          {onInsertContext && (
            <button className="btn-primary btn-small" onClick={() => {
              onInsertContext(`Customer: ${selected.name} (${selected.id}), ${selected.loyaltyTier} tier, ${selected.totalRentals} rentals`);
            }}>Insert into Chat</button>
          )}
          <h4>Bookings ({customerBookings.length})</h4>
          {customerBookings.map(b => (
            <div key={b.id} className="booking-card">
              <div className="booking-card-header">
                <strong>{b.id}</strong>
                <span className="status-badge" style={{ backgroundColor: statusColors[b.status] }}>{b.status}</span>
              </div>
              <div className="booking-card-details">
                <span>{b.vehicleClass} — {b.vehiclePlate}</span>
                <span>{b.pickupBranch} → {b.returnBranch}</span>
                <span>{new Date(b.pickupDate).toLocaleDateString()} – {new Date(b.returnDate).toLocaleDateString()}</span>
                <span>€{b.dailyRate}/day · {b.insurancePackage}</span>
                {b.extras.length > 0 && <span>Extras: {b.extras.join(', ')}</span>}
              </div>
              {onInsertContext && (
                <button className="btn-small" onClick={() => {
                  onInsertContext(`Booking ${b.id}: ${b.vehicleClass} ${b.vehiclePlate}, ${b.pickupBranch}, ${new Date(b.pickupDate).toLocaleDateString()}-${new Date(b.returnDate).toLocaleDateString()}, €${b.dailyRate}/day, ${b.insurancePackage}`);
                }}>Use in Chat</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
