// Sample customer and booking seed data for Kinsen Chat

import type { Customer, Booking, Vehicle } from './types';

export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-001', name: 'Maria Papadopoulos', email: 'maria.p@email.com',
    phone: '+30-210-555-0101', driverLicense: 'GR-AB-123456', nationality: 'Greek',
    totalRentals: 12, loyaltyTier: 'gold', notes: 'Prefers SUVs, always returns on time',
  },
  {
    id: 'CUST-002', name: 'John Smith', email: 'john.smith@email.com',
    phone: '+44-20-7946-0958', driverLicense: 'UK-SMITH-901234', nationality: 'British',
    totalRentals: 3, loyaltyTier: 'bronze', notes: 'Tourist customer, needs GPS always',
  },
  {
    id: 'CUST-003', name: 'Hans Mueller', email: 'hans.m@email.de',
    phone: '+49-30-555-0201', driverLicense: 'DE-M-789012', nationality: 'German',
    totalRentals: 7, loyaltyTier: 'silver', notes: 'Business traveler, prefers automatic',
  },
  {
    id: 'CUST-004', name: 'Sofia Rossi', email: 'sofia.r@email.it',
    phone: '+39-06-555-0301', driverLicense: 'IT-RM-345678', nationality: 'Italian',
    totalRentals: 1, loyaltyTier: 'bronze',
  },
  {
    id: 'CUST-005', name: 'Nikos Georgiou', email: 'nikos.g@email.gr',
    phone: '+30-2310-555-0401', driverLicense: 'GR-CD-901234', nationality: 'Greek',
    totalRentals: 25, loyaltyTier: 'platinum', notes: 'VIP, corporate account, priority service',
  },
  {
    id: 'CUST-006', name: 'Emma Wilson', email: 'emma.w@email.com',
    phone: '+1-212-555-0501', driverLicense: 'US-NY-567890', nationality: 'American',
    totalRentals: 2, loyaltyTier: 'bronze',
  },
  {
    id: 'CUST-007', name: 'Pierre Dubois', email: 'pierre.d@email.fr',
    phone: '+33-1-555-0601', driverLicense: 'FR-75-123789', nationality: 'French',
    totalRentals: 5, loyaltyTier: 'silver', notes: 'Requests child seat every time',
  },
  {
    id: 'CUST-008', name: 'Kostas Dimitriou', email: 'kostas.d@email.gr',
    phone: '+30-210-555-0701', driverLicense: 'GR-EF-456789', nationality: 'Greek',
    totalRentals: 18, loyaltyTier: 'gold', notes: 'Monthly corporate rental, invoiced',
  },
];

export const SAMPLE_BOOKINGS: Booking[] = [
  {
    id: 'BK-2025-001', customerId: 'CUST-001', vehicleId: 'VH-001',
    vehicleClass: 'SUV', vehiclePlate: 'YAB-1234',
    pickupDate: '2025-06-15T10:00:00Z', returnDate: '2025-06-20T10:00:00Z',
    pickupBranch: 'Athens Airport', returnBranch: 'Athens Airport',
    dailyRate: 75, insurancePackage: 'Full Coverage (€0 deductible)',
    status: 'active', totalAmount: 435, extras: ['GPS', 'Child Seat'],
  },
  {
    id: 'BK-2025-002', customerId: 'CUST-002', vehicleId: 'VH-003',
    vehicleClass: 'Economy', vehiclePlate: 'ZBA-5678',
    pickupDate: '2025-06-14T14:00:00Z', returnDate: '2025-06-21T14:00:00Z',
    pickupBranch: 'Athens Airport', returnBranch: 'Thessaloniki Airport',
    dailyRate: 35, insurancePackage: 'Basic (€1,200 deductible)',
    status: 'active', totalAmount: 295, extras: ['GPS', 'One-way fee'],
  },
  {
    id: 'BK-2025-003', customerId: 'CUST-005', vehicleId: 'VH-007',
    vehicleClass: 'Luxury', vehiclePlate: 'YMN-9012',
    pickupDate: '2025-06-16T09:00:00Z', returnDate: '2025-06-18T09:00:00Z',
    pickupBranch: 'Athens City Center', returnBranch: 'Athens City Center',
    dailyRate: 150, insurancePackage: 'Full Coverage (€0 deductible)',
    status: 'reserved', totalAmount: 300, extras: [],
  },
  {
    id: 'BK-2025-004', customerId: 'CUST-003', vehicleId: 'VH-005',
    vehicleClass: 'Midsize', vehiclePlate: 'ZCD-3456',
    pickupDate: '2025-06-10T08:00:00Z', returnDate: '2025-06-17T08:00:00Z',
    pickupBranch: 'Heraklion Airport', returnBranch: 'Heraklion Airport',
    dailyRate: 50, insurancePackage: 'Medium (€600 deductible)',
    status: 'active', totalAmount: 395, extras: ['Additional Driver'],
  },
  {
    id: 'BK-2025-005', customerId: 'CUST-007', vehicleId: 'VH-004',
    vehicleClass: 'Compact', vehiclePlate: 'YEF-7890',
    pickupDate: '2025-06-12T12:00:00Z', returnDate: '2025-06-19T12:00:00Z',
    pickupBranch: 'Rhodes Airport', returnBranch: 'Rhodes Airport',
    dailyRate: 40, insurancePackage: 'Full Coverage (€0 deductible)',
    status: 'active', totalAmount: 330, extras: ['Child Seat', 'Booster Seat'],
  },
  {
    id: 'BK-2025-006', customerId: 'CUST-004', vehicleId: 'VH-002',
    vehicleClass: 'Economy', vehiclePlate: 'ZGH-1234',
    pickupDate: '2025-06-08T10:00:00Z', returnDate: '2025-06-12T10:00:00Z',
    pickupBranch: 'Athens Airport', returnBranch: 'Athens Airport',
    dailyRate: 30, insurancePackage: 'Basic (€1,200 deductible)',
    status: 'completed', totalAmount: 120, extras: [],
  },
  {
    id: 'BK-2025-007', customerId: 'CUST-008', vehicleId: 'VH-009',
    vehicleClass: 'Premium', vehiclePlate: 'YIJ-5678',
    pickupDate: '2025-06-01T09:00:00Z', returnDate: '2025-06-30T09:00:00Z',
    pickupBranch: 'Athens City Center', returnBranch: 'Athens City Center',
    dailyRate: 85, insurancePackage: 'Full Coverage (€0 deductible)',
    status: 'active', totalAmount: 2550, extras: ['Monthly Corporate Rate'],
  },
  {
    id: 'BK-2025-008', customerId: 'CUST-006', vehicleId: 'VH-006',
    vehicleClass: 'Convertible', vehiclePlate: 'ZKL-9012',
    pickupDate: '2025-06-13T16:00:00Z', returnDate: '2025-06-15T16:00:00Z',
    pickupBranch: 'Santorini Airport', returnBranch: 'Santorini Airport',
    dailyRate: 120, insurancePackage: 'Full Coverage (€0 deductible)',
    status: 'cancelled', totalAmount: 0, extras: [],
  },
];

export const SAMPLE_VEHICLES: Vehicle[] = [
  { id: 'VH-001', plate: 'YAB-1234', make: 'Toyota', model: 'RAV4', year: 2024, class: 'SUV', color: 'White', status: 'rented', branch: 'Athens Airport', mileage: 15200, fuelLevel: 80, lastService: '2025-05-01', nextServiceDue: '2025-08-01', currentBookingId: 'BK-2025-001' },
  { id: 'VH-002', plate: 'ZGH-1234', make: 'Fiat', model: '500', year: 2023, class: 'Economy', color: 'Red', status: 'cleaning', branch: 'Athens Airport', mileage: 32100, fuelLevel: 45, lastService: '2025-04-15', nextServiceDue: '2025-07-15' },
  { id: 'VH-003', plate: 'ZBA-5678', make: 'VW', model: 'Polo', year: 2024, class: 'Economy', color: 'Silver', status: 'rented', branch: 'Athens Airport', mileage: 8700, fuelLevel: 90, lastService: '2025-05-20', nextServiceDue: '2025-08-20', currentBookingId: 'BK-2025-002' },
  { id: 'VH-004', plate: 'YEF-7890', make: 'Renault', model: 'Clio', year: 2024, class: 'Compact', color: 'Blue', status: 'rented', branch: 'Rhodes Airport', mileage: 12300, fuelLevel: 70, lastService: '2025-05-10', nextServiceDue: '2025-08-10', currentBookingId: 'BK-2025-005' },
  { id: 'VH-005', plate: 'ZCD-3456', make: 'Toyota', model: 'Corolla', year: 2024, class: 'Midsize', color: 'Grey', status: 'rented', branch: 'Heraklion Airport', mileage: 19800, fuelLevel: 60, lastService: '2025-04-25', nextServiceDue: '2025-07-25', currentBookingId: 'BK-2025-004' },
  { id: 'VH-006', plate: 'ZKL-9012', make: 'Mini', model: 'Cooper Convertible', year: 2023, class: 'Convertible', color: 'Black', status: 'available', branch: 'Santorini Airport', mileage: 22400, fuelLevel: 95, lastService: '2025-05-15', nextServiceDue: '2025-08-15' },
  { id: 'VH-007', plate: 'YMN-9012', make: 'BMW', model: '5 Series', year: 2025, class: 'Luxury', color: 'Black', status: 'reserved', branch: 'Athens City Center', mileage: 3200, fuelLevel: 100, lastService: '2025-06-01', nextServiceDue: '2025-09-01', currentBookingId: 'BK-2025-003' },
  { id: 'VH-008', plate: 'ZOP-3456', make: 'Hyundai', model: 'i20', year: 2024, class: 'Economy', color: 'White', status: 'available', branch: 'Athens Airport', mileage: 11500, fuelLevel: 85, lastService: '2025-05-25', nextServiceDue: '2025-08-25' },
  { id: 'VH-009', plate: 'YIJ-5678', make: 'Mercedes', model: 'C-Class', year: 2024, class: 'Premium', color: 'Silver', status: 'rented', branch: 'Athens City Center', mileage: 7600, fuelLevel: 75, lastService: '2025-05-18', nextServiceDue: '2025-08-18', currentBookingId: 'BK-2025-007' },
  { id: 'VH-010', plate: 'ZQR-7890', make: 'Nissan', model: 'Qashqai', year: 2023, class: 'SUV', color: 'Blue', status: 'maintenance', branch: 'Thessaloniki Airport', mileage: 41200, fuelLevel: 30, lastService: '2025-06-10', nextServiceDue: '2025-09-10', notes: 'Brake pad replacement in progress' },
  { id: 'VH-011', plate: 'YST-1234', make: 'Kia', model: 'Niro EV', year: 2024, class: 'SUV', color: 'Green', status: 'available', branch: 'Athens City Center', mileage: 5400, fuelLevel: 92, lastService: '2025-06-05', nextServiceDue: '2025-09-05', notes: 'Electric vehicle' },
  { id: 'VH-012', plate: 'ZUV-5678', make: 'Citroen', model: 'C3', year: 2023, class: 'Economy', color: 'Orange', status: 'damaged', branch: 'Heraklion Airport', mileage: 28700, fuelLevel: 50, lastService: '2025-04-20', nextServiceDue: '2025-07-20', notes: 'Front bumper damage, pending repair estimate' },
];
