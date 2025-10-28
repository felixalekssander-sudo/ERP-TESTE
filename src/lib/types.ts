export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  drawing_url?: string;
  material?: string;
  unit_price: number;
  estimated_weight?: number;
  complexity: 'simple' | 'medium' | 'complex';
  notes?: string;
  created_at: string;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  status: 'draft' | 'quoted' | 'approved' | 'in_production' | 'completed' | 'cancelled';
  created_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  drawing_url?: string;
  special_requirements?: string;
  product?: Product;
}

export interface Proposal {
  id: string;
  sales_order_id: string;
  proposal_number: string;
  subtotal: number;
  discount: number;
  total: number;
  delivery_days: number;
  payment_terms: string;
  validity_days: number;
  terms_conditions?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  created_at: string;
}

export interface ProductionOrder {
  id: string;
  order_number: string;
  sales_order_id: string;
  sales_order_item_id: string;
  product_id: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  current_process?: string;
  created_at: string;
  updated_at: string;
  product?: Product;
  sales_order?: SalesOrder;
}

export interface ProductionProcess {
  id: string;
  production_order_id: string;
  process_type: 'turning' | 'milling' | 'drilling' | 'grinding';
  sequence_order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  estimated_minutes?: number;
  actual_minutes?: number;
  operator_name?: string;
  machine_used?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
}

export interface Purchase {
  id: string;
  production_order_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier?: string;
  status: 'requested' | 'ordered' | 'received';
  requested_at: string;
  received_at?: string;
  notes?: string;
}

export interface Inventory {
  id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  minimum_stock: number;
  location?: string;
  last_updated: string;
}

export interface InventoryMovement {
  id: string;
  inventory_id: string;
  movement_type: 'in' | 'out';
  quantity: number;
  reference_type?: 'purchase' | 'production_order';
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface QualityInspection {
  id: string;
  production_order_id: string;
  inspection_number: string;
  trigger_reason: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  inspector_name?: string;
  inspection_date?: string;
  result?: 'pass' | 'fail' | 'conditional';
  notes?: string;
  corrective_actions?: string;
  created_at: string;
  production_order?: ProductionOrder;
}

export interface InspectionCriteria {
  id: string;
  name: string;
  enabled: boolean;
  min_quantity?: number;
  min_weight?: number;
  complexity?: 'simple' | 'medium' | 'complex';
  specific_customer_id?: string;
  specific_machine?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'order_approved' | 'production_delayed' | 'inspection_required' | 'stock_low' | 'process_completed' | 'order_created';
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  active: boolean;
  created_at: string;
}
