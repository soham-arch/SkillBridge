export type ServiceStatus = 'draft' | 'published' | 'paused' | 'archived';
export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled';
export type Capability = 'find' | 'offer';

export type VerificationStatus = 'not_verified' | 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  email?: string | null;
  full_name: string;
  avatar_url: string | null;
  college: string | null;
  student_id_number?: string | null;
  verification_status: VerificationStatus;
  verified_at?: string | null;
  bio: string | null;
  location: string | null;
  skills?: string[];
  portfolio_links?: { title: string; url: string }[];
  capabilities: Capability[];
  rating?: number;
  reviews_count?: number;
  completed_orders_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon?: string;
  created_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  category_id: string | null;
  title: string;
  description: string;
  price: number;
  location: string | null;
  status: ServiceStatus;
  delivery_days: number;
  tags?: string[];
  skills?: string[];
  rating?: number;
  reviews_count?: number;
  completed_orders_count?: number;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  provider?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'college' | 'location' | 'verification_status'> | null;
}

export interface ServiceMedia {
  id: string;
  service_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  service_id: string;
  customer_id: string;
  provider_id: string;
  message: string;
  status: RequestStatus;
  requested_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  updated_at: string;
  service?: Pick<Service, 'id' | 'title' | 'price' | 'location'> | null;
  customer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  provider?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

export interface Review {
  id: string;
  service_id: string;
  order_id?: string | null;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  reviewer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'college'> | null;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

export interface AvailabilitySlot {
  id: string;
  provider_id: string;
  service_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  service_id: string;
  customer_id: string;
  provider_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  note: string;
  created_at: string;
  updated_at: string;
  service?: Pick<Service, 'id' | 'title' | 'price' | 'location'> | null;
  customer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  provider?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
}

/* =========================================================================
   SkillBridge V2 Order & Transaction Lifecycle Types
========================================================================= */

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'seller_pending'
  | 'accepted'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

export interface OrderDeliverable {
  notes: string;
  file_url?: string;
  submitted_at: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
  actor_id?: string;
}

export interface Order {
  id: string;
  service_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  requirements: string;
  delivery_days: number;
  due_date: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_id?: string | null;
  payment_method?: PaymentMethod | null;
  deliverables?: OrderDeliverable | null;
  revision_notes?: string | null;
  timeline: OrderTimelineEvent[];
  created_at: string;
  accepted_at?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  service?: Service | null;
  buyer?: Profile | null;
  seller?: Profile | null;
  review?: Review | null;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  gateway_order_id: string;
  gateway_payment_id?: string;
  signature?: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  error_message?: string | null;
  created_at: string;
  paid_at?: string | null;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  college_name: string;
  college_email?: string;
  document_url?: string;
  document_type: 'college_id_card' | 'student_email' | 'enrollment_cert';
  status: VerificationStatus;
  admin_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  user?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email' | 'college'>;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order_created' | 'order_accepted' | 'work_submitted' | 'revision_requested' | 'order_completed' | 'review_received' | 'verification_status';
  read: boolean;
  link?: string;
  created_at: string;
}

export interface SellerEarnings {
  total_earned: number;
  in_escrow: number;
  available_for_payout: number;
  completed_orders: number;
  pending_orders: number;
}

export interface AISearchResult {
  service: Service;
  relevance_score: number;
  match_reasons: string[];
  highlight_skills: string[];
}
