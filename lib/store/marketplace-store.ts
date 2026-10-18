import {
  Profile,
  Category,
  Service,
  Order,
  OrderStatus,
  PaymentRecord,
  PaymentStatus,
  PaymentMethod,
  Review,
  VerificationRequest,
  NotificationItem,
  SellerEarnings,
  AdminAuditLog,
} from '@/types';

// Storage key
const STORAGE_KEY = 'skillbridge_v2_store';

export interface MarketplaceState {
  profiles: Profile[];
  categories: Category[];
  services: Service[];
  orders: Order[];
  payments: PaymentRecord[];
  reviews: Review[];
  verifications: VerificationRequest[];
  notifications: NotificationItem[];
  adminAuditLogs?: AdminAuditLog[];
}

export const SEED_PROFILES: Profile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@skillbridge.edu',
    full_name: 'Platform Administrator',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    college: 'SkillBridge Campus Governance',
    student_id_number: 'ADMIN-2024-001',
    verification_status: 'verified',
    verified_at: '2026-08-01T10:00:00Z',
    bio: 'Platform governance, trust & safety officer.',
    location: 'Pune',
    skills: ['Governance', 'Safety', 'Moderation', 'Operations'],
    capabilities: ['find', 'offer'],
    is_admin: true,
    rating: 5.0,
    reviews_count: 0,
    completed_orders_count: 0,
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-20T12:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000001',
    user_id: '10000000-0000-0000-0000-000000000001',
    email: 'alex.tech@example.com',
    full_name: 'Alex Sharma',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    college: 'MIT World Peace University, Pune',
    student_id_number: 'MITWPU-2023-CS-042',
    verification_status: 'verified',
    verified_at: '2026-08-01T10:00:00Z',
    bio: 'Full stack web developer, Next.js enthusiast, and competitive programmer. Happy to help peers build React apps and debug complex code.',
    location: 'Kothrud, Pune',
    skills: ['Next.js', 'React', 'TypeScript', 'Node.js', 'Supabase', 'Tailwind CSS', 'Python'],
    portfolio_links: [
      { title: 'Personal Portfolio', url: 'https://github.com' },
      { title: 'Campus Hackathon 1st Place App', url: 'https://github.com' },
    ],
    capabilities: ['find', 'offer'],
    rating: 4.9,
    reviews_count: 14,
    completed_orders_count: 18,
    created_at: '2026-08-01T08:00:00Z',
    updated_at: '2026-08-20T12:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    user_id: '10000000-0000-0000-0000-000000000002',
    email: 'priya.design@example.com',
    full_name: 'Priya Verma',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    college: 'COEP Technological University',
    student_id_number: 'COEP-DES-2024-118',
    verification_status: 'verified',
    verified_at: '2026-08-03T11:00:00Z',
    bio: 'Product & UI/UX Designer passionate about crafting modern interfaces and Figma systems. Built designs for 5+ college startups.',
    location: 'Shivajinagar, Pune',
    skills: ['Figma', 'UI/UX Design', 'Wireframing', 'Design Systems', 'Mobile App Design', 'Prototyping'],
    portfolio_links: [
      { title: 'Figma Community Files', url: 'https://figma.com' },
      { title: 'Behance Portfolio', url: 'https://behance.net' },
    ],
    capabilities: ['find', 'offer'],
    rating: 5.0,
    reviews_count: 19,
    completed_orders_count: 22,
    created_at: '2026-08-02T09:00:00Z',
    updated_at: '2026-08-21T14:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    user_id: '10000000-0000-0000-0000-000000000003',
    email: 'rohan.student@example.com',
    full_name: 'Rohan Kulkarni',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    college: 'PICT, Pune',
    student_id_number: 'PICT-CS-2024-089',
    verification_status: 'verified',
    verified_at: '2026-08-05T12:00:00Z',
    bio: 'Algorithms TA and competitive coder (Candidate Master). Helping students ace placement interviews, Graphs, DP, and core CS concepts.',
    location: 'Dhankawadi, Pune',
    skills: ['Data Structures', 'C++', 'Java', 'Algorithms', 'System Design', 'Interview Prep'],
    portfolio_links: [{ title: 'LeetCode Profile', url: 'https://leetcode.com' }],
    capabilities: ['find', 'offer'],
    rating: 4.8,
    reviews_count: 8,
    completed_orders_count: 11,
    created_at: '2026-08-03T10:00:00Z',
    updated_at: '2026-08-22T08:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    user_id: '10000000-0000-0000-0000-000000000004',
    email: 'sneha.video@example.com',
    full_name: 'Sneha Patil',
    avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&auto=format&fit=crop&q=80',
    college: 'Symbiosis Centre for Media & Communication',
    student_id_number: 'SCMC-2024-MC-033',
    verification_status: 'verified',
    verified_at: '2026-08-07T14:30:00Z',
    bio: 'Filmmaker and video editor. Experienced in Premiere Pro, After Effects, cinematic transitions, color grading, and viral Instagram reels.',
    location: 'Viman Nagar, Pune',
    skills: ['Premiere Pro', 'After Effects', 'Cinematic Editing', 'Color Grading', 'Reels / Shorts', 'Sound Design'],
    portfolio_links: [{ title: 'YouTube Channel', url: 'https://youtube.com' }],
    capabilities: ['find', 'offer'],
    rating: 4.9,
    reviews_count: 12,
    completed_orders_count: 15,
    created_at: '2026-08-04T11:00:00Z',
    updated_at: '2026-08-22T10:00:00Z',
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    user_id: '10000000-0000-0000-0000-000000000005',
    email: 'aarav.photo@example.com',
    full_name: 'Aarav Mehta',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    college: 'Fergusson College, Pune',
    student_id_number: 'FC-BA-2023-205',
    verification_status: 'pending',
    bio: 'Campus & portrait photographer with Sony Alpha equipment. Covering college fests, team portraits, headshots, and departmental functions.',
    location: 'FC Road, Pune',
    skills: ['Photography', 'Lightroom', 'Portrait Shoots', 'Event Coverage', 'Photoshop'],
    capabilities: ['find', 'offer'],
    rating: 4.7,
    reviews_count: 6,
    completed_orders_count: 7,
    created_at: '2026-08-05T12:00:00Z',
    updated_at: '2026-08-22T11:00:00Z',
  },
  {
    id: 'admin-user-0000-0000-000000000001',
    user_id: 'admin-user-0000-0000-000000000001',
    email: 'admin@skillbridge.edu',
    full_name: 'Campus Administrator',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    college: 'SkillBridge Admin Directorate',
    verification_status: 'verified',
    bio: 'SkillBridge platform administrator for user verification and marketplace integrity.',
    location: 'Central Campus Office',
    capabilities: ['find', 'offer'],
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-22T00:00:00Z',
  },
];

export const SEED_CATEGORIES: Category[] = [
  { id: '20000000-0000-0000-0000-000000000001', name: 'Web & App Development', description: 'Full-stack development, mobile apps, bug fixes, and API integrations.', created_at: '2026-08-01T00:00:00Z' },
  { id: '20000000-0000-0000-0000-000000000002', name: 'Graphic Design & Branding', description: 'UI/UX design, poster designs, logos, presentation decks, and branding.', created_at: '2026-08-01T00:00:00Z' },
  { id: '20000000-0000-0000-0000-000000000003', name: 'Academic Tutoring', description: 'Maths, Data Structures, Physics, Assignment assistance, and exam prep.', created_at: '2026-08-01T00:00:00Z' },
  { id: '20000000-0000-0000-0000-000000000004', name: 'Video & Content Creation', description: 'Video editing, Reels, YouTube shorts, scriptwriting, and voiceover.', created_at: '2026-08-01T00:00:00Z' },
  { id: '20000000-0000-0000-0000-000000000005', name: 'Event & Photography', description: 'Campus event coverage, portrait photoshoots, and event coordination.', created_at: '2026-08-01T00:00:00Z' },
  { id: '20000000-0000-0000-0000-000000000006', name: 'Writing & Resume Services', description: 'SOP writing, ATS resume reviews, assignment editing, and content creation.', created_at: '2026-08-01T00:00:00Z' },
  { id: '20000000-0000-0000-0000-000000000007', name: 'Music & Audio Production', description: 'Audio mixing, podcasts editing, guitar lessons, and custom background scores.', created_at: '2026-08-01T00:00:00Z' },
];

export const SEED_SERVICES: Service[] = [
  {
    id: '30000000-0000-0000-0000-000000000001',
    provider_id: '10000000-0000-0000-0000-000000000001',
    category_id: '20000000-0000-0000-0000-000000000001',
    title: 'Full-Stack Next.js Website & Portfolio Setup',
    description: 'Custom modern website built with Next.js, React, Tailwind CSS, and Supabase integration. Includes responsive UI, dark mode support, and deployment assistance.',
    price: 1500,
    delivery_days: 4,
    location: 'MITWPU Campus / Remote',
    status: 'published',
    tags: ['Web Development', 'Next.js', 'React', 'Tailwind', 'Frontend'],
    skills: ['Next.js', 'React', 'Tailwind CSS', 'Supabase'],
    rating: 4.9,
    reviews_count: 14,
    completed_orders_count: 18,
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000002',
    provider_id: '10000000-0000-0000-0000-000000000002',
    category_id: '20000000-0000-0000-0000-000000000002',
    title: 'UI/UX Design for Mobile Apps & Figma Prototypes',
    description: 'High-fidelity Figma screen designs, interactive prototypes, micro-animations, and modern design systems tailored for iOS and Android apps.',
    price: 1200,
    delivery_days: 3,
    location: 'COEP / Remote',
    status: 'published',
    tags: ['UI/UX', 'Figma', 'Mobile Design', 'Wireframing', 'Prototyping'],
    skills: ['Figma', 'UI/UX Design', 'Design Systems', 'Interactive Prototypes'],
    rating: 5.0,
    reviews_count: 19,
    completed_orders_count: 22,
    created_at: '2026-08-11T11:00:00Z',
    updated_at: '2026-08-21T11:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000003',
    provider_id: '10000000-0000-0000-0000-000000000003',
    category_id: '20000000-0000-0000-0000-000000000003',
    title: 'Data Structures & Algorithms (C++/Java) Tutoring',
    description: '1-on-1 peer tutoring sessions covering Trees, Graphs, Dynamic Programming, and LeetCode problem solving strategies for technical interviews.',
    price: 500,
    delivery_days: 1,
    location: 'PICT Library / Online',
    status: 'published',
    tags: ['DSA', 'Tutoring', 'LeetCode', 'C++', 'Java', 'Interview Prep'],
    skills: ['Data Structures', 'Algorithms', 'C++', 'Java'],
    rating: 4.8,
    reviews_count: 8,
    completed_orders_count: 11,
    created_at: '2026-08-12T12:00:00Z',
    updated_at: '2026-08-22T08:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000004',
    provider_id: '10000000-0000-0000-0000-000000000004',
    category_id: '20000000-0000-0000-0000-000000000004',
    title: 'Cinematic Video Editing & Viral Reels Creation',
    description: 'Professional video editing for YouTube videos, college event highlights, birthday montages, and Instagram Reels with sound design, dynamic transitions, and color grading.',
    price: 800,
    delivery_days: 2,
    location: 'Viman Nagar / Online',
    status: 'published',
    tags: ['Video Editing', 'Reels', 'Premiere Pro', 'After Effects', 'Cinematic'],
    skills: ['Premiere Pro', 'After Effects', 'Color Grading', 'Sound Design', 'Transitions'],
    rating: 4.9,
    reviews_count: 12,
    completed_orders_count: 15,
    created_at: '2026-08-13T13:00:00Z',
    updated_at: '2026-08-22T10:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000005',
    provider_id: '10000000-0000-0000-0000-000000000005',
    category_id: '20000000-0000-0000-0000-000000000005',
    title: 'Event & Fest Photography with High-Res Editing',
    description: 'High-quality photography coverage for college fests, societies, student team photoshoots, and portraits with professional color grading in Lightroom.',
    price: 1800,
    delivery_days: 3,
    location: 'FC Road / Pune Campuses',
    status: 'published',
    tags: ['Photography', 'Event Coverage', 'Portraits', 'Lightroom'],
    skills: ['Photography', 'Lightroom', 'Photo Editing'],
    rating: 4.7,
    reviews_count: 6,
    completed_orders_count: 7,
    created_at: '2026-08-14T14:00:00Z',
    updated_at: '2026-08-22T11:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000006',
    provider_id: '10000000-0000-0000-0000-000000000001',
    category_id: '20000000-0000-0000-0000-000000000001',
    title: 'React & Tailwind CSS Bug Fixes & Code Review',
    description: 'Fast debugging for college project code, fixing layout responsiveness, state management bugs, and API integration issues in React or Node.',
    price: 400,
    delivery_days: 1,
    location: 'Online / Remote',
    status: 'published',
    tags: ['React', 'Bug Fix', 'Debugging', 'JavaScript', 'Tailwind'],
    skills: ['React', 'JavaScript', 'CSS Debugging'],
    rating: 5.0,
    reviews_count: 7,
    completed_orders_count: 9,
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-08-22T09:00:00Z',
  },
  {
    id: '30000000-0000-0000-0000-000000000007',
    provider_id: '10000000-0000-0000-0000-000000000002',
    category_id: '20000000-0000-0000-0000-000000000002',
    title: 'Pitch Deck & Academic Presentation Design',
    description: 'Sleek, visually engaging PowerPoint/Google Slides pitch decks for startup competitions, hackathon demos, and semester project presentations.',
    price: 600,
    delivery_days: 2,
    location: 'Remote',
    status: 'published',
    tags: ['Pitch Deck', 'Presentation', 'PowerPoint', 'Design', 'Slides'],
    skills: ['Figma', 'Pitch Decks', 'Graphic Design'],
    rating: 4.8,
    reviews_count: 5,
    completed_orders_count: 6,
    created_at: '2026-08-16T15:00:00Z',
    updated_at: '2026-08-22T12:00:00Z',
  },
];

export const SEED_ORDERS: Order[] = [
  {
    id: 'ord-8001-active-in-progress',
    service_id: '30000000-0000-0000-0000-000000000001',
    buyer_id: '10000000-0000-0000-0000-000000000003', // Rohan
    seller_id: '10000000-0000-0000-0000-000000000001', // Alex
    price: 1500,
    requirements: 'Need a responsive Next.js portfolio website showcasing my coding projects and LeetCode stats with a dark tech theme.',
    delivery_days: 4,
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'in_progress',
    payment_status: 'paid',
    payment_id: 'pay_rzp_mock_1001',
    payment_method: 'upi',
    timeline: [
      { status: 'pending_payment', title: 'Order Placed', description: 'Buyer initiated order checkout', timestamp: '2026-08-20T10:00:00Z' },
      { status: 'paid', title: 'Payment Confirmed', description: '₹1,500 held securely in SkillBridge Escrow via UPI', timestamp: '2026-08-20T10:02:00Z' },
      { status: 'accepted', title: 'Order Accepted', description: 'Alex Sharma accepted the requirements', timestamp: '2026-08-20T11:15:00Z' },
      { status: 'in_progress', title: 'Work Started', description: 'Developing components and Tailwind layout', timestamp: '2026-08-20T14:00:00Z' },
    ],
    created_at: '2026-08-20T10:00:00Z',
    accepted_at: '2026-08-20T11:15:00Z',
  },
  {
    id: 'ord-8002-delivered-awaiting-review',
    service_id: '30000000-0000-0000-0000-000000000004',
    buyer_id: '10000000-0000-0000-0000-000000000001', // Alex
    seller_id: '10000000-0000-0000-0000-000000000004', // Sneha
    price: 800,
    requirements: 'Edit our department hackathon recap video into a 60s fast-paced Instagram Reel with kinetic typography.',
    delivery_days: 2,
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'submitted',
    payment_status: 'paid',
    payment_id: 'pay_rzp_mock_1002',
    payment_method: 'card',
    deliverables: {
      notes: 'Completed the hackathon recap reel! Added speed-ramps, beat-synced transitions, and clean typography. Let me know if any tweaks are needed.',
      file_url: 'https://drive.google.com/sample-hackathon-reel-v1.mp4',
      submitted_at: '2026-08-22T08:00:00Z',
    },
    timeline: [
      { status: 'pending_payment', title: 'Order Placed', description: 'Buyer initiated order', timestamp: '2026-08-21T09:00:00Z' },
      { status: 'paid', title: 'Payment Confirmed', description: '₹800 secured in Escrow', timestamp: '2026-08-21T09:05:00Z' },
      { status: 'accepted', title: 'Order Accepted', description: 'Sneha started video editing', timestamp: '2026-08-21T10:00:00Z' },
      { status: 'submitted', title: 'Deliverable Submitted', description: 'Video submitted for buyer inspection', timestamp: '2026-08-22T08:00:00Z' },
    ],
    created_at: '2026-08-21T09:00:00Z',
    accepted_at: '2026-08-21T10:00:00Z',
    submitted_at: '2026-08-22T08:00:00Z',
  },
  {
    id: 'ord-8003-completed-sample',
    service_id: '30000000-0000-0000-0000-000000000002',
    buyer_id: '10000000-0000-0000-0000-000000000001', // Alex
    seller_id: '10000000-0000-0000-0000-000000000002', // Priya
    price: 1200,
    requirements: 'Mobile app onboarding Figma screens for our student food delivery club.',
    delivery_days: 3,
    due_date: '2026-08-18T18:00:00Z',
    status: 'completed',
    payment_status: 'paid',
    payment_id: 'pay_rzp_mock_1003',
    payment_method: 'upi',
    deliverables: {
      notes: 'All 6 screens exported and interactive Figma prototype link provided.',
      file_url: 'https://figma.com/sample-food-club-prototype',
      submitted_at: '2026-08-17T16:00:00Z',
    },
    timeline: [
      { status: 'paid', title: 'Payment Secured', description: '₹1,200 held in Escrow', timestamp: '2026-08-15T12:00:00Z' },
      { status: 'accepted', title: 'Order Accepted', description: 'Priya began UI design', timestamp: '2026-08-15T13:00:00Z' },
      { status: 'submitted', title: 'Design Delivered', description: 'Figma link provided', timestamp: '2026-08-17T16:00:00Z' },
      { status: 'completed', title: 'Order Completed', description: 'Buyer approved deliverables and released ₹1,200 payment', timestamp: '2026-08-18T10:00:00Z' },
    ],
    created_at: '2026-08-15T12:00:00Z',
    accepted_at: '2026-08-15T13:00:00Z',
    submitted_at: '2026-08-17T16:00:00Z',
    completed_at: '2026-08-18T10:00:00Z',
  },
];

export const SEED_REVIEWS: Review[] = [
  {
    id: 'rev-001',
    service_id: '30000000-0000-0000-0000-000000000001',
    order_id: 'ord-past-001',
    reviewer_id: '10000000-0000-0000-0000-000000000002',
    reviewee_id: '10000000-0000-0000-0000-000000000001',
    rating: 5,
    comment: 'Alex built my portfolio website in 2 days. Super fast, clean Tailwind components, and explained how to update it myself!',
    created_at: '2026-08-16T12:00:00Z',
    updated_at: '2026-08-16T12:00:00Z',
  },
  {
    id: 'rev-002',
    service_id: '30000000-0000-0000-0000-000000000002',
    order_id: 'ord-8003-completed-sample',
    reviewer_id: '10000000-0000-0000-0000-000000000001',
    reviewee_id: '10000000-0000-0000-0000-000000000002',
    rating: 5,
    comment: 'Priya is an incredible designer! The Figma prototype impressed our campus incubators and got us into the accelerator.',
    created_at: '2026-08-18T11:00:00Z',
    updated_at: '2026-08-18T11:00:00Z',
  },
  {
    id: 'rev-003',
    service_id: '30000000-0000-0000-0000-000000000004',
    order_id: 'ord-past-003',
    reviewer_id: '10000000-0000-0000-0000-000000000003',
    reviewee_id: '10000000-0000-0000-0000-000000000004',
    rating: 5,
    comment: 'Sneha delivered a cinematic masterpiece for our cultural fest. Seamless transitions and punchy audio!',
    created_at: '2026-08-19T14:00:00Z',
    updated_at: '2026-08-19T14:00:00Z',
  },
];

export const SEED_VERIFICATIONS: VerificationRequest[] = [
  {
    id: 'ver-001',
    user_id: '10000000-0000-0000-0000-000000000005', // Aarav
    college_name: 'Fergusson College, Pune',
    college_email: 'aarav.mehta@fergusson.edu',
    document_url: 'https://images.unsplash.com/photo-1578852612716-854e527abf50?w=600&auto=format&fit=crop&q=80',
    document_type: 'college_id_card',
    status: 'pending',
    submitted_at: '2026-08-21T15:00:00Z',
  },
  {
    id: 'ver-002',
    user_id: '10000000-0000-0000-0000-000000000001', // Alex
    college_name: 'MIT World Peace University',
    college_email: 'alex.sharma@mitwpu.edu.in',
    document_type: 'student_email',
    status: 'verified',
    admin_notes: 'Verified via official student institutional domain',
    submitted_at: '2026-08-01T09:00:00Z',
    reviewed_at: '2026-08-01T10:00:00Z',
  },
];

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    user_id: '10000000-0000-0000-0000-000000000001', // Alex
    title: 'New Order Received! 🚀',
    message: 'Rohan Kulkarni requested "Full-Stack Next.js Website". Payment of ₹1,500 secured in Escrow.',
    type: 'order_created',
    read: false,
    link: '/orders/ord-8001-active-in-progress',
    created_at: '2026-08-20T10:02:00Z',
  },
  {
    id: 'notif-2',
    user_id: '10000000-0000-0000-0000-000000000001', // Alex
    title: 'Work Ready for Review 🎬',
    message: 'Sneha Patil submitted deliverables for your Reel editing request.',
    type: 'work_submitted',
    read: false,
    link: '/orders/ord-8002-delivered-awaiting-review',
    created_at: '2026-08-22T08:00:00Z',
  },
  {
    id: 'notif-3',
    user_id: '10000000-0000-0000-0000-000000000002', // Priya
    title: 'Order Completed & Payment Released 💰',
    message: 'Alex Sharma approved your Figma designs. ₹1,200 added to your completed earnings!',
    type: 'order_completed',
    read: true,
    link: '/orders/ord-8003-completed-sample',
    created_at: '2026-08-18T10:05:00Z',
  },
];

// Helper to populate linked objects
function populateService(svc: Service, profiles: Profile[], categories: Category[]): Service {
  const provider = profiles.find((p) => p.user_id === svc.provider_id);
  const category = categories.find((c) => c.id === svc.category_id);
  return {
    ...svc,
    provider: provider
      ? {
          id: provider.id,
          full_name: provider.full_name,
          avatar_url: provider.avatar_url,
          college: provider.college,
          location: provider.location,
          verification_status: provider.verification_status,
        }
      : null,
    category: category ?? null,
  };
}

function populateOrder(order: Order, services: Service[], profiles: Profile[], reviews: Review[]): Order {
  const service = services.find((s) => s.id === order.service_id);
  const buyer = profiles.find((p) => p.user_id === order.buyer_id);
  const seller = profiles.find((p) => p.user_id === order.seller_id);
  const review = reviews.find((r) => r.order_id === order.id);
  return {
    ...order,
    service: service ?? null,
    buyer: buyer ?? null,
    seller: seller ?? null,
    review: review ?? null,
  };
}

// Non-authoritative in-memory seed catalog for offline initial render
let inMemoryState: MarketplaceState | null = null;
const listeners: Array<() => void> = [];

/**
 * Returns read-only in-memory seed data.
 * NOTE: Supabase PostgreSQL is the sole authoritative store for all live business records.
 */
export function getMarketplaceState(): MarketplaceState {
  if (!inMemoryState) {
    inMemoryState = {
      profiles: SEED_PROFILES,
      categories: SEED_CATEGORIES,
      services: SEED_SERVICES,
      orders: SEED_ORDERS,
      payments: [],
      reviews: SEED_REVIEWS,
      verifications: SEED_VERIFICATIONS,
      notifications: SEED_NOTIFICATIONS,
    };
  }
  return inMemoryState;
}

/**
 * In-memory state notifier.
 * Strips sensitive transaction and financial data before saving harmless UI preferences.
 */
export function saveMarketplaceState(state: MarketplaceState): void {
  inMemoryState = state;
  if (typeof window !== 'undefined') {
    try {
      // Only persist harmless preferences, never transactions or account balances
      const harmlessPreferences = {
        lastVisitedTab: 'all',
        hasDismissedWelcomeBanner: true,
      };
      localStorage.setItem('skillbridge_ui_prefs', JSON.stringify(harmlessPreferences));
    } catch {
      // Non-critical UI preference persistence
    }
  }
  listeners.forEach((fn) => fn());
}

export function subscribeMarketplaceStore(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/* =========================================================================
   Store Operations
========================================================================= */

// SERVICES
export function getAllServices(options: {
  query?: string;
  categoryId?: string | null;
  sort?: string;
  verifiedOnly?: boolean;
  minPrice?: number;
  maxPrice?: number;
} = {}): Service[] {
  const state = getMarketplaceState();
  let list = state.services
    .filter((s) => s.status === 'published')
    .map((s) => populateService(s, state.profiles, state.categories));

  if (options.query) {
    const q = options.query.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q)) ||
        s.skills?.some((sk) => sk.toLowerCase().includes(q))
    );
  }

  if (options.categoryId) {
    list = list.filter((s) => s.category_id === options.categoryId);
  }

  if (options.minPrice !== undefined && !isNaN(options.minPrice)) {
    list = list.filter((s) => s.price >= options.minPrice!);
  }

  if (options.maxPrice !== undefined && !isNaN(options.maxPrice)) {
    list = list.filter((s) => s.price <= options.maxPrice!);
  }

  if (options.verifiedOnly) {
    list = list.filter((s) => s.provider?.verification_status === 'verified');
  }

  if (options.sort === 'price_low') {
    list.sort((a, b) => a.price - b.price);
  } else if (options.sort === 'price_high') {
    list.sort((a, b) => b.price - a.price);
  } else if (options.sort === 'rating') {
    list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else {
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return list;
}

export function getServiceDetail(id: string): Service | null {
  const state = getMarketplaceState();
  const svc = state.services.find((s) => s.id === id);
  if (!svc) return null;
  return populateService(svc, state.profiles, state.categories);
}

export function createNewService(data: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Service {
  const state = getMarketplaceState();
  const newService: Service = {
    ...data,
    id: 'srv-' + Date.now(),
    rating: 5.0,
    reviews_count: 0,
    completed_orders_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  state.services.unshift(newService);
  saveMarketplaceState(state);
  return populateService(newService, state.profiles, state.categories);
}

// ORDERS & PAYMENTS
export function getOrder(id: string): Order | null {
  const state = getMarketplaceState();
  const order = state.orders.find((o) => o.id === id);
  if (!order) return null;
  return populateOrder(order, state.services, state.profiles, state.reviews);
}

export function getOrdersForUser(userId: string, role?: 'buyer' | 'seller'): Order[] {
  const state = getMarketplaceState();
  let list = state.orders;
  if (role === 'buyer') {
    list = list.filter((o) => o.buyer_id === userId);
  } else if (role === 'seller') {
    list = list.filter((o) => o.seller_id === userId);
  } else {
    list = list.filter((o) => o.buyer_id === userId || o.seller_id === userId);
  }

  return list
    .map((o) => populateOrder(o, state.services, state.profiles, state.reviews))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function createOrderWithEscrow(params: {
  serviceId: string;
  buyerId: string;
  requirements: string;
  paymentMethod: PaymentMethod;
  paymentSuccess?: boolean;
}): { order: Order; payment: PaymentRecord } {
  const state = getMarketplaceState();
  const svc = state.services.find((s) => s.id === params.serviceId);
  if (!svc) throw new Error('Service not found');

  const buyer = state.profiles.find((p) => p.user_id === params.buyerId);
  if (!buyer) throw new Error('Buyer not found');

  const orderId = 'ord-' + Date.now();
  const paymentId = 'pay_rzp_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const dueDate = new Date(Date.now() + (svc.delivery_days || 3) * 24 * 60 * 60 * 1000).toISOString();

  const isSuccess = params.paymentSuccess !== false;

  const paymentRecord: PaymentRecord = {
    id: 'rec-' + Date.now(),
    order_id: orderId,
    buyer_id: params.buyerId,
    seller_id: svc.provider_id,
    amount: svc.price,
    currency: 'INR',
    gateway_order_id: 'order_rzp_' + Math.random().toString(36).substring(2, 9),
    gateway_payment_id: paymentId,
    signature: 'sig_' + Math.random().toString(36).substring(2, 12),
    payment_method: params.paymentMethod,
    status: isSuccess ? 'paid' : 'failed',
    error_message: isSuccess ? null : 'Payment authorization failed by bank simulation.',
    created_at: now,
    paid_at: isSuccess ? now : null,
  };

  const initialStatus: OrderStatus = isSuccess ? 'seller_pending' : 'pending_payment';

  const orderRecord: Order = {
    id: orderId,
    service_id: svc.id,
    buyer_id: params.buyerId,
    seller_id: svc.provider_id,
    price: svc.price,
    requirements: params.requirements,
    delivery_days: svc.delivery_days || 3,
    due_date: dueDate,
    status: initialStatus,
    payment_status: isSuccess ? 'paid' : 'failed',
    payment_id: paymentId,
    payment_method: params.paymentMethod,
    timeline: [
      {
        status: 'pending_payment',
        title: 'Order Placed',
        description: `Requirements submitted by ${buyer.full_name}`,
        timestamp: now,
        actor_id: params.buyerId,
      },
      ...(isSuccess
        ? [
            {
              status: 'paid' as OrderStatus,
              title: 'Payment Secured',
              description: `₹${svc.price.toLocaleString('en-IN')} held securely in Escrow via ${params.paymentMethod.toUpperCase()}`,
              timestamp: now,
            },
          ]
        : [
            {
              status: 'pending_payment' as OrderStatus,
              title: 'Payment Failed',
              description: 'Payment was declined by payment gateway test simulation',
              timestamp: now,
            },
          ]),
    ],
    created_at: now,
  };

  state.orders.unshift(orderRecord);
  state.payments.unshift(paymentRecord);

  // Send Notification to Seller if paid
  if (isSuccess) {
    state.notifications.unshift({
      id: 'notif-' + Date.now(),
      user_id: svc.provider_id,
      title: 'New Order Received! 🚀',
      message: `${buyer.full_name} ordered "${svc.title}". ₹${svc.price} held in escrow.`,
      type: 'order_created',
      read: false,
      link: `/orders/${orderId}`,
      created_at: now,
    });
  }

  saveMarketplaceState(state);
  return {
    order: populateOrder(orderRecord, state.services, state.profiles, state.reviews),
    payment: paymentRecord,
  };
}

export function updateOrderStatusAction(
  orderId: string,
  action: 'accept' | 'start_work' | 'submit_work' | 'request_revision' | 'complete' | 'cancel',
  payload?: { notes?: string; fileUrl?: string; reason?: string }
): Order {
  const state = getMarketplaceState();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const now = new Date().toISOString();

  switch (action) {
    case 'accept':
      order.status = 'accepted';
      order.accepted_at = now;
      order.timeline.push({
        status: 'accepted',
        title: 'Order Accepted',
        description: 'Seller accepted the project requirements and started scheduling.',
        timestamp: now,
      });
      state.notifications.unshift({
        id: 'notif-' + Date.now(),
        user_id: order.buyer_id,
        title: 'Order Accepted! ⚡',
        message: `The provider accepted your order for "${order.service?.title ?? 'Service'}".`,
        type: 'order_accepted',
        read: false,
        link: `/orders/${orderId}`,
        created_at: now,
      });
      break;

    case 'start_work':
      order.status = 'in_progress';
      order.timeline.push({
        status: 'in_progress',
        title: 'Work In Progress',
        description: 'Seller is actively working on the deliverables.',
        timestamp: now,
      });
      break;

    case 'submit_work':
      order.status = 'submitted';
      order.submitted_at = now;
      order.deliverables = {
        notes: payload?.notes ?? 'Completed project deliverables.',
        file_url: payload?.fileUrl,
        submitted_at: now,
      };
      order.timeline.push({
        status: 'submitted',
        title: 'Work Delivered',
        description: payload?.notes ? `Deliverable submitted: ${payload.notes}` : 'Seller submitted final deliverables for review.',
        timestamp: now,
      });
      state.notifications.unshift({
        id: 'notif-' + Date.now(),
        user_id: order.buyer_id,
        title: 'Work Delivered! 🎉',
        message: 'Your project deliverable has been submitted for review. Please inspect and approve.',
        type: 'work_submitted',
        read: false,
        link: `/orders/${orderId}`,
        created_at: now,
      });
      break;

    case 'request_revision':
      order.status = 'revision_requested';
      order.revision_notes = payload?.notes ?? 'Requested revision.';
      order.timeline.push({
        status: 'revision_requested',
        title: 'Revision Requested',
        description: `Buyer feedback: ${payload?.notes ?? 'Changes requested'}`,
        timestamp: now,
      });
      state.notifications.unshift({
        id: 'notif-' + Date.now(),
        user_id: order.seller_id,
        title: 'Revision Requested ✍️',
        message: `Buyer requested adjustments on order #${order.id.slice(-4)}: ${payload?.notes}`,
        type: 'revision_requested',
        read: false,
        link: `/orders/${orderId}`,
        created_at: now,
      });
      break;

    case 'complete':
      order.status = 'completed';
      order.completed_at = now;
      order.timeline.push({
        status: 'completed',
        title: 'Order Completed & Payment Released',
        description: `Buyer approved deliverables. ₹${order.price.toLocaleString('en-IN')} escrow released to seller earnings.`,
        timestamp: now,
      });

      // Increment seller completed orders
      const sellerProfile = state.profiles.find((p) => p.user_id === order.seller_id);
      if (sellerProfile) {
        sellerProfile.completed_orders_count = (sellerProfile.completed_orders_count ?? 0) + 1;
      }
      const svc = state.services.find((s) => s.id === order.service_id);
      if (svc) {
        svc.completed_orders_count = (svc.completed_orders_count ?? 0) + 1;
      }

      state.notifications.unshift({
        id: 'notif-' + Date.now(),
        user_id: order.seller_id,
        title: 'Payment Released! 💰',
        message: `Order #${order.id.slice(-4)} completed! ₹${order.price} has been released to your earnings.`,
        type: 'order_completed',
        read: false,
        link: `/orders/${orderId}`,
        created_at: now,
      });
      break;

    case 'cancel':
      order.status = 'cancelled';
      order.cancelled_at = now;
      order.cancellation_reason = payload?.reason ?? 'Order cancelled.';
      order.payment_status = 'refunded';
      order.timeline.push({
        status: 'cancelled',
        title: 'Order Cancelled & Refunded',
        description: `Reason: ${payload?.reason ?? 'Cancelled by user'}. Escrow refunded.`,
        timestamp: now,
      });
      break;
  }

  saveMarketplaceState(state);
  return populateOrder(order, state.services, state.profiles, state.reviews);
}

// REVIEWS
export function createReview(params: {
  orderId: string;
  serviceId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string;
}): Review {
  const state = getMarketplaceState();

  const newReview: Review = {
    id: 'rev-' + Date.now(),
    service_id: params.serviceId,
    order_id: params.orderId,
    reviewer_id: params.reviewerId,
    reviewee_id: params.revieweeId,
    rating: params.rating,
    comment: params.comment,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  state.reviews.unshift(newReview);

  // Recalculate average rating on Service and Profile
  const allServiceReviews = state.reviews.filter((r) => r.service_id === params.serviceId);
  const avgServiceRating = allServiceReviews.reduce((sum, r) => sum + r.rating, 0) / allServiceReviews.length;
  const svc = state.services.find((s) => s.id === params.serviceId);
  if (svc) {
    svc.rating = Number(avgServiceRating.toFixed(1));
    svc.reviews_count = allServiceReviews.length;
  }

  const allSellerReviews = state.reviews.filter((r) => r.reviewee_id === params.revieweeId);
  const avgSellerRating = allSellerReviews.reduce((sum, r) => sum + r.rating, 0) / allSellerReviews.length;
  const seller = state.profiles.find((p) => p.user_id === params.revieweeId);
  if (seller) {
    seller.rating = Number(avgSellerRating.toFixed(1));
    seller.reviews_count = allSellerReviews.length;
  }

  // Notify seller
  state.notifications.unshift({
    id: 'notif-' + Date.now(),
    user_id: params.revieweeId,
    title: 'New Review Received! ⭐',
    message: `Received ${params.rating} stars: "${params.comment.slice(0, 60)}..."`,
    type: 'review_received',
    read: false,
    link: `/orders/${params.orderId}`,
    created_at: new Date().toISOString(),
  });

  saveMarketplaceState(state);
  return newReview;
}

// EARNINGS
export function getSellerEarnings(sellerId: string): SellerEarnings {
  const state = getMarketplaceState();
  const sellerOrders = state.orders.filter((o) => o.seller_id === sellerId);

  const completed = sellerOrders.filter((o) => o.status === 'completed');
  const escrow = sellerOrders.filter((o) => o.payment_status === 'paid' && o.status !== 'completed' && o.status !== 'cancelled');

  const totalEarned = completed.reduce((sum, o) => sum + o.price, 0);
  const inEscrow = escrow.reduce((sum, o) => sum + o.price, 0);

  return {
    total_earned: totalEarned,
    in_escrow: inEscrow,
    available_for_payout: totalEarned, // clear separation as requested in Master Prompt Section 18
    completed_orders: completed.length,
    pending_orders: escrow.length,
  };
}

// VERIFICATIONS
export function submitVerificationRequest(params: {
  userId: string;
  collegeName: string;
  collegeEmail?: string;
  documentUrl?: string;
  documentType: 'college_id_card' | 'student_email';
}): VerificationRequest {
  const state = getMarketplaceState();
  const req: VerificationRequest = {
    id: 'ver-' + Date.now(),
    user_id: params.userId,
    college_name: params.collegeName,
    college_email: params.collegeEmail,
    document_url: params.documentUrl,
    document_type: params.documentType,
    status: 'pending',
    submitted_at: new Date().toISOString(),
  };

  state.verifications.unshift(req);
  const prof = state.profiles.find((p) => p.user_id === params.userId);
  if (prof) {
    prof.verification_status = 'pending';
    prof.college = params.collegeName;
  }

  saveMarketplaceState(state);
  return req;
}

export function reviewVerification(requestId: string, approve: boolean, notes?: string): void {
  const state = getMarketplaceState();
  const req = state.verifications.find((v) => v.id === requestId);
  if (!req) return;

  req.status = approve ? 'verified' : 'rejected';
  req.admin_notes = notes;
  req.reviewed_at = new Date().toISOString();

  const prof = state.profiles.find((p) => p.user_id === req.user_id);
  if (prof) {
    prof.verification_status = approve ? 'verified' : 'rejected';
    if (approve) prof.verified_at = new Date().toISOString();
  }

  // Notify user
  state.notifications.unshift({
    id: 'notif-' + Date.now(),
    user_id: req.user_id,
    title: approve ? 'Student Badge Verified! 🎓' : 'Verification Update',
    message: approve
      ? `Congratulations! Your student verification for ${req.college_name} was approved.`
      : `Your verification request was reviewed: ${notes ?? 'Documents could not be validated.'}`,
    type: 'verification_status',
    read: false,
    created_at: new Date().toISOString(),
  });

  saveMarketplaceState(state);
}

// NOTIFICATIONS
export function getUserNotifications(userId: string): NotificationItem[] {
  const state = getMarketplaceState();
  return state.notifications
    .filter((n) => n.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function markNotificationRead(id: string): void {
  const state = getMarketplaceState();
  const n = state.notifications.find((item) => item.id === id);
  if (n) {
    n.read = true;
    saveMarketplaceState(state);
  }
}

export function markAllNotificationsRead(userId: string): void {
  const state = getMarketplaceState();
  state.notifications.forEach((n) => {
    if (n.user_id === userId) n.read = true;
  });
  saveMarketplaceState(state);
}

// ADMIN AUDIT LOGS
export function getAdminAuditLogs(): AdminAuditLog[] {
  const state = getMarketplaceState();
  return (state.adminAuditLogs || []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function appendAdminAuditLog(entry: AdminAuditLog): void {
  const state = getMarketplaceState();
  if (!state.adminAuditLogs) {
    state.adminAuditLogs = [];
  }
  state.adminAuditLogs.unshift(entry);
  saveMarketplaceState(state);
}
