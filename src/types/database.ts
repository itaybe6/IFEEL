// Update the DeviceType type to match the database enum
export type DeviceType = string;

type ScentType = string;

export type BatteryType = 'AA' | 'DC';

export type UserRole = 'admin' | 'worker' | 'customer';

// -- App-level types used across the UI (kept as-is) --
export interface User {
  id: string;
  phone: string;
  role: UserRole;
  name: string;
  address?: string;
  created_at: string;
  password: string;
  price?: number;
}

export interface OneTimeCustomer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface ServicePoint {
  id: string;
  customer_id: string;
  scent_type: ScentType;
  device_type: DeviceType;
  refill_amount: number;
  notes?: string;
  created_at: string;
}

interface Customer extends User {
  service_points?: ServicePoint[];
}

export interface Job {
  id: string;
  customer_id?: string;
  one_time_customer_id?: string;
  worker_id: string;
  date: string;
  status: 'pending' | 'completed';
  notes?: string;
  order_number?: number;
  created_at: string;
}

export interface WorkTemplate {
  id: string;
  name: string;
  created_at: string;
}

export interface TemplateStation {
  id: string;
  template_id: string;
  customer_id: string;
  worker_id: string;
  order: number;
  created_at: string;
  customer?: User;
  worker?: User;
}

interface WorkSchedule {
  id: string;
  template_id: string;
  date: string;
  created_at: string;
  template?: WorkTemplate;
}

// -- Exact DB table row types (faithful to the Supabase schema) --
export interface Users {
  id: string;
  phone: string;
  password: string;
  role: UserRole;
  name: string;
  address: string | null;
  created_at: string | null;
  price: number | null;
}

export interface Customers {
  id: string; // FK to users.id
  scent_type: string;
  refill_amount: number;
  notes: string | null;
}

export interface Devices {
  id: string;
  name: string;
  created_at: string | null;
  refill_amount: number;
}

export interface JobServicePoints {
  id: string;
  job_id: string | null;
  service_point_id: string | null;
  image_url: string | null;
  completed_at: string | null;
  created_at: string | null;
  custom_refill_amount: number | null;
}

export interface Jobs {
  id: string;
  customer_id: string | null;
  worker_id: string;
  date: string;
  status: 'pending' | 'completed';
  created_at: string | null;
  notes: string | null;
  order_number: number | null;
  one_time_customer_id: string | null;
}

export interface OneTimeCustomers {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string | null;
}

export interface Scents {
  id: string;
  name: string;
  created_at: string | null;
}

export interface ServicePoints {
  id: string;
  customer_id: string;
  refill_amount: number;
  notes: string | null;
  created_at: string | null;
  device_type: string;
  scent_type: string | null;
}

export interface TemplateStations {
  id: string;
  template_id: string | null;
  customer_id: string | null;
  worker_id: string | null;
  order: number;
  created_at: string | null;
  scheduled_time: string | null; // time string, e.g. '09:00:00'
}

export interface WorkSchedules {
  id: string;
  template_id: string | null;
  date: string; // ISO date string (yyyy-mm-dd)
  created_at: string | null;
}

export interface WorkTemplates {
  id: string;
  name: string;
  created_at: string | null;
}

// -- Constants used by the app UI --
export const DEVICE_REFILL_AMOUNTS: Record<string, number> = {
  'Z30': 150,
  'טאבלט': 300,
  'DPM': 100,
  'דנקיו': 200,
  'ארינג': 500,
  'גמבו': 600,
  'מערכת דחסנית': 2000
};

export const SCENT_TYPES: string[] = [
  'בית מלון',
  'רויאל ביץ',
  'בלאק יסמין',
  'קסטרו',
  'בראשית',
  'יערות הכרמל',
  'גולד',
  'אמבר קומבי',
  'פרש תה-מלון אופרה',
  'פינוק',
  'קריד'
];

export const DEVICE_TYPES: string[] = [
  'Z30',
  'טאבלט',
  'DPM',
  'דנקיו',
  'ארינג',
  'גמבו',
  'מערכת דחסנית'
];

export const BATTERY_TYPES: BatteryType[] = ['AA', 'DC'];