export const BREEDS = [
  'Holstein-Friesian', 'Jersey', 'Brown Swiss', 'Ayrshire', 'Guernsey',
  'Sahiwal', 'Gir', 'Tharparkar', 'Murrah (Buffalo)', 'Surti (Buffalo)',
  'HF Cross', 'Jersey Cross', 'Other'
];

export const HEALTH_STATUSES = [
  { value: 'healthy', label: 'Healthy', color: 'green' },
  { value: 'sick', label: 'Sick', color: 'red' },
  { value: 'pregnant', label: 'Pregnant', color: 'purple' },
  { value: 'dry', label: 'Dry', color: 'yellow' },
  { value: 'sold', label: 'Sold', color: 'gray' },
  { value: 'deceased', label: 'Deceased', color: 'gray' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food', subs: ['Hay', 'Silage', 'Concentrate', 'Minerals', 'Water'] },
  { value: 'medical', label: 'Medical', subs: ['Vaccination', 'Deworming', 'Treatment', 'Surgery', 'Lab Tests'] },
  { value: 'maintenance', label: 'Maintenance', subs: ['Equipment Repair', 'Shed Repair', 'Cleaning Supplies'] },
  { value: 'labor', label: 'Labor', subs: ['Milker Salary', 'Vet Visit Fee', 'Casual Labor'] },
  { value: 'equipment', label: 'Equipment', subs: ['New Purchase', 'Accessories'] },
  { value: 'utilities', label: 'Utilities', subs: ['Electricity', 'Water Bill', 'Fuel'] },
  { value: 'other', label: 'Other', subs: ['Transport', 'Insurance', 'Miscellaneous'] },
];

export const MILK_SESSIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'evening', label: 'Evening' },
  { value: 'full_day', label: 'Full Day' },
];

export const QUALITY_GRADES = [
  { value: 'A', label: 'Grade A' },
  { value: 'B', label: 'Grade B' },
  { value: 'C', label: 'Grade C' },
];

export const HEALTH_RECORD_TYPES = [
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'checkup', label: 'Checkup' },
  { value: 'deworming', label: 'Deworming' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'other', label: 'Other' },
];

export const NOTIFICATION_TYPES = [
  { value: 'estrus_alert', label: 'Estrus Alert' },
  { value: 'health_alert', label: 'Health Alert' },
  { value: 'expense_alert', label: 'Expense Alert' },
  { value: 'low_milk', label: 'Low Milk' },
  { value: 'system', label: 'System' },
];

export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'blue' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
];

export const CYCLE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'observed', label: 'Observed' },
  { value: 'missed', label: 'Missed' },
  { value: 'confirmed_pregnancy', label: 'Confirmed Pregnancy' },
];

export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'worker', label: 'Worker' },
];
