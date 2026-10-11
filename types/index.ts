export type ServiceStatus = 'draft' | 'published' | 'paused' | 'archived' | 'moderated';
export type ServiceType = 'digital' | 'fixed' | 'consultation' | 'in_person' | 'hybrid';
export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled';
export type Capability = 'find' | 'offer' | 'buyer' | 'seller';
export type ActiveRole = 'buyer' | 'seller';

export interface PortfolioItem {
  id?: string;
  title: string;
  url: string;
  image_url?: string;
  description?: string;
}

export interface PricingPreferences {
  hourly_rate?: number;
  starting_price?: number;
  currency?: string;
  negotiable?: boolean;
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
}

export type VerificationStatus = 'not_verified' | 'pending' | 'verified' | 'rejected';

export interface Profile {
  id: string;
  user_id: string;
  email?: string | null;
  full_name: string;
  avatar_url: string | null;
  college: string | null;
  student_id_number?: string | null;
  is_admin?: boolean;
  verification_status: VerificationStatus;
  rejection_reason?: string | null;
  verified_at?: string | null;
  bio: string | null;
  location: string | null;
  skills?: string[];
  portfolio_links?: PortfolioItem[];
  preferred_categories?: string[];
  pricing_preferences?: PricingPreferences;
  social_links?: SocialLinks;
  capabilities: Capability[];
  active_role?: ActiveRole;
  onboarding_completed?: boolean;
  seller_onboarding_completed?: boolean;
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
  currency?: string;
  service_type?: ServiceType;
  cover_image_url?: string | null;
  portfolio_examples?: PortfolioItem[];
  availability_notes?: string | null;
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
  is_hidden?: boolean;
  moderation_status?: 'published' | 'flagged' | 'hidden';
  report_count?: number;
  created_at: string;
  updated_at: string;
  reviewer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'college' | 'email'> | null;
  service?: Pick<Service, 'id' | 'title'> | null;
}

export interface ReviewReport {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: 'inappropriate' | 'spam' | 'harassment' | 'false_information' | 'other' | string;
  notes?: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
  review?: Review | null;
  reporter?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'> | null;
}

export interface RatingBreakdown {
  averageRating: number;
  totalReviews: number;
  counts: { 1: number; 2: number; 3: number; 4: number; 5: number };
  percentages: { 1: number; 2: number; 3: number; 4: number; 5: number };
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
  | 'cancelled'
  | 'rejected';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

export interface OrderDeliverable {
  notes: string;
  file_url?: string;
  submitted_at: string;
}

export interface ConsultationDetails {
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes?: number;
  meeting_link?: string | null;
  location?: string | null;
  note?: string | null;
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
  order_type?: 'fixed_gig' | 'consultation';
  booking_id?: string | null;
  consultation_details?: ConsultationDetails | null;
  revisions_count?: number;
  max_revisions?: number;
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
  service_snapshot?: {
    id: string;
    title: string;
    description?: string;
    price: number;
    delivery_days: number;
    service_type?: string;
    location?: string | null;
  } | null;
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
  metadata?: Record<string, any>;
  created_at: string;
  paid_at?: string | null;
  refunded_at?: string | null;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes?: Record<string, any>;
  created_at: number;
}

export interface PaymentVerificationPayload {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentMethod?: PaymentMethod;
}


export interface VerificationRequest {
  id: string;
  user_id: string;
  full_name?: string | null;
  college_name: string;
  college_email?: string | null;
  student_id_number?: string | null;
  document_url?: string | null;
  document_path?: string | null;
  document_type: 'college_id_card' | 'student_email' | 'enrollment_cert';
  status: VerificationStatus;
  admin_notes?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  user?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email' | 'college'>;
}

export interface VerificationAuditLog {
  id: string;
  request_id: string;
  user_id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'resubmitted';
  admin_notes?: string | null;
  actor_id?: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at: string;
  actor?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
}

export interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  read: boolean;
  created_at: string;
  sender?: Pick<Profile, 'id' | 'user_id' | 'full_name' | 'avatar_url' | 'college'> | null;
  receiver?: Pick<Profile, 'id' | 'user_id' | 'full_name' | 'avatar_url' | 'college'> | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
    | 'order_created'
    | 'order_accepted'
    | 'order_rejected'
    | 'work_submitted'
    | 'revision_requested'
    | 'order_completed'
    | 'order_cancelled'
    | 'new_message'
    | 'review_received'
    | 'verification_status'
    | string;
  read: boolean;
  link?: string;
  dedup_key?: string | null;
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
