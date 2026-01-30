
export type UserRole = 'ADMIN';

export interface CompanyProfile {
  id: string;
  name: string;
  address: string;
  mobile: string;
  email: string;
  upi_id: string;
  updated_at?: string;
  alert_msg_standard?: string;
  alert_img_standard?: string;
  alert_msg_urgent?: string;
  alert_img_urgent?: string;
  alert_threshold_days?: number;
  features_config?: {
    ledger_penalties_enabled: boolean;
    ledger_auto_penalty_percent: number;
    ledger_advance_tracking: boolean;
    order_auto_inventory_sync: boolean;
    order_manual_manifest_allowed: boolean;
    inventory_low_stock_alerts: boolean;
    broadcast_auto_whatsapp: boolean;
  };
}

export interface Category {
  id: string;
  name: string;
  type: 'Hardware' | 'RCM';
}

export interface Company {
  id: string;
  name: string;
  type: 'Hardware' | 'RCM';
}

export interface Dealer {
  id: string;
  dealer_code: string;
  shop_name: string;
  owner_name: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  is_active: boolean;
  is_verified: boolean;
  status: string;
  created_at: string;
  cheques_number?: string;
  cheques_img_urls?: string[]; // Updated for multiple images
  profile_img?: string;
  ledger_balance?: number;
  category_access?: string[];
  payment_block?: boolean;
}

export interface CartItem {
  id: string;
  dealer_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  created_at: string;
  products?: Product;
  product_variants?: ProductVariant;
  dealers?: Dealer;
}

export interface ProductVariant {
  id?: string;
  product_id?: string;
  size: string;
  mrp: number;
  discount: number;
  final_price: number;
  expiry_date?: string;
  is_active?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  product_type: 'Hardware' | 'RCM';
  company_id?: string;
  company_name?: string;
  category_id?: string;
  category_name?: string;
  unit: string;
  price: number;
  is_active: boolean;
  image_url: string;
  created_at: string;
  product_variants?: ProductVariant[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  category_name?: string;
  company_name?: string;
  variant_info?: string;
  size?: string;
  unit?: string;
  quantity: number;
  mrp: number;
  rate: number;
  discount_amt: number;
  amount: number;
}

export interface Order {
  id: string;
  order_no: number;
  dealer_id: string;
  subtotal: number;
  discount: number;
  transport_charges: number;
  received_amount: number;
  final_total: number;
  status: string;
  payment_status: string;
  payment_mode: string;
  created_at: string;
  dealer_name?: string;
  items?: OrderItem[];
  created_by?: 'ADMIN' | 'DEALER';
  dealers?: Dealer;
}

export interface LedgerEntry {
  id: string;
  dealer_id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  narration?: string;
  date: string;
  images?: string[];
  created_at?: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  is_active: boolean;
  variants: any[];
  terms?: string[];
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  target_type: 'all' | 'dealer';
  target_id?: string;
  created_at: string;
}

export interface PaymentRequest {
  id: string;
  dealer_id: string;
  amount: number;
  utr_number: string;
  proof_img_url: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  remark?: string;
  created_at: string;
  dealers?: Dealer;
}

export interface InvoiceFooterConfig {
  paymentTerms: string;
  bankDetails: string;
  contactInfo: string;
}
