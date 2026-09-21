/*
# SkillBridge Seed Migration (10 Demo Users)

This migration populates Supabase with 10 realistic student test accounts:
- 10 Auth accounts in `auth.users` & `auth.identities` (Password: Password123!)
- 10 Profiles in `profiles` with avatars, bios, colleges, and locations
- 7 Categories in `categories`
- 15 Services in `services` (published, draft, paused)
- 10 Service Media items in `service_media`
- 10 Service Requests in `service_requests` across all lifecycle statuses
- 5 Reviews in `reviews`
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Insert 10 Auth Users into auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'alex.tech@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Alex Sharma"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'priya.design@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Priya Verma"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'rohan.student@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Rohan Kulkarni"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'sneha.video@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Sneha Patil"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000005',
  'authenticated',
  'authenticated',
  'aarav.photo@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Aarav Mehta"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000006',
  'authenticated',
  'authenticated',
  'tanvi.writer@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Tanvi Joshi"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000007',
  'authenticated',
  'authenticated',
  'vikram.cad@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Vikram Singh"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000008',
  'authenticated',
  'authenticated',
  'ananya.math@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Ananya Rao"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000009',
  'authenticated',
  'authenticated',
  'kabir.music@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Kabir Das"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000010',
  'authenticated',
  'authenticated',
  'diya.marketing@example.com',
  extensions.crypt('Password123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Diya Kapoor"}'::jsonb,
  false,
  now(),
  now(),
  NULL, NULL, '', '', '', '', ''
)
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at;

-- 2. Insert Auth Identities into auth.identities
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '{"sub": "10000000-0000-0000-0000-000000000001", "email": "alex.tech@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000001', now(), now(), now()),
('10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '{"sub": "10000000-0000-0000-0000-000000000002", "email": "priya.design@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000002', now(), now(), now()),
('10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '{"sub": "10000000-0000-0000-0000-000000000003", "email": "rohan.student@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000003', now(), now(), now()),
('10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', '{"sub": "10000000-0000-0000-0000-000000000004", "email": "sneha.video@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000004', now(), now(), now()),
('10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', '{"sub": "10000000-0000-0000-0000-000000000005", "email": "aarav.photo@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000005', now(), now(), now()),
('10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006', '{"sub": "10000000-0000-0000-0000-000000000006", "email": "tanvi.writer@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000006', now(), now(), now()),
('10000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000007', '{"sub": "10000000-0000-0000-0000-000000000007", "email": "vikram.cad@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000007', now(), now(), now()),
('10000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000008', '{"sub": "10000000-0000-0000-0000-000000000008", "email": "ananya.math@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000008', now(), now(), now()),
('10000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000009', '{"sub": "10000000-0000-0000-0000-000000000009", "email": "kabir.music@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000009', now(), now(), now()),
('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000010', '{"sub": "10000000-0000-0000-0000-000000000010", "email": "diya.marketing@example.com"}'::jsonb, 'email', '10000000-0000-0000-0000-000000000010', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Profiles
INSERT INTO profiles (
  id,
  user_id,
  full_name,
  avatar_url,
  college,
  bio,
  location,
  capabilities
) VALUES
(
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Alex Sharma',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'MIT World Peace University',
  'Full stack web developer, Next.js enthusiast, and competitive programmer. Happy to help peers build React apps and debug Python code.',
  'Kothrud, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'Priya Verma',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'COEP Technological University',
  'UI/UX designer & brand strategist. Creating sleek mobile app mockups, logos, and high-engagement social media content.',
  'Shivajinagar, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  'Rohan Kulkarni',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'Pune Institute of Computer Technology (PICT)',
  'CS Undergrad passionate about Data Structures, Algorithms, and ML model deployment. Offering peer tutoring and code reviews.',
  'Dhankawadi, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000004',
  'Sneha Patil',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'Vishwakarma Institute of Technology (VIT Pune)',
  'Motion designer and video editor specializing in Premiere Pro, After Effects, Reels, and YouTube Shorts editing.',
  'Bibwewadi, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000005',
  'Aarav Mehta',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'Symbiosis International University',
  'Freelance photographer covering campus events, model portfolios, and club fest shoots with professional mirrorless gear.',
  'Viman Nagar, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000006',
  'Tanvi Joshi',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&auto=format&fit=crop&q=80',
  'Fergusson College',
  'Literature major offering SOP editing, ATS resume optimization, assignment proofreading, and blog article writing.',
  'FC Road, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000007',
  'Vikram Singh',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
  'COEP Technological University',
  'Mechanical engineer skilled in SolidWorks, AutoCAD, 3D printing modeling, and structural analysis assistance.',
  'Shivajinagar, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000008',
  'Ananya Rao',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'MIT World Peace University',
  'Applied Mathematics student providing tutoring in Linear Algebra, Differential Equations, Calculus, and Probability.',
  'Kothrud, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000009',
  'Kabir Das',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
  'FLAME University',
  'Acoustic guitarist and Logic Pro X audio producer. Offering acoustic backing tracks, mixing, and beginner guitar lessons.',
  'Lavale, Pune',
  ARRAY['find', 'offer']
),
(
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000010',
  'Diya Kapoor',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
  'BMCC College',
  'Marketing student managing social media campaigns, campus ambassador outreach, and Instagram page growth strategy.',
  'Deccan, Pune',
  ARRAY['find', 'offer']
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  college = EXCLUDED.college,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  capabilities = EXCLUDED.capabilities;

-- 4. Insert Categories
INSERT INTO categories (id, name, description) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Web & App Development', 'Full-stack development, mobile apps, bug fixes, and API integrations.'),
  ('20000000-0000-0000-0000-000000000002', 'Graphic Design & Branding', 'UI/UX design, poster designs, logos, presentation decks, and branding.'),
  ('20000000-0000-0000-0000-000000000003', 'Academic Tutoring', 'Maths, Data Structures, Physics, Assignment assistance, and exam prep.'),
  ('20000000-0000-0000-0000-000000000004', 'Video & Content Creation', 'Video editing, Reels, YouTube shorts, scriptwriting, and voiceover.'),
  ('20000000-0000-0000-0000-000000000005', 'Event & Photography', 'Campus event coverage, portrait photoshoots, and event coordination.'),
  ('20000000-0000-0000-0000-000000000006', 'Writing & Resume Services', 'SOP writing, ATS resume reviews, assignment editing, and content creation.'),
  ('20000000-0000-0000-0000-000000000007', 'Music & Audio Production', 'Audio mixing, podcasts editing, guitar lessons, and custom background scores.')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- 5. Insert 15 Services
INSERT INTO services (
  id,
  provider_id,
  category_id,
  title,
  description,
  price,
  location,
  status,
  created_at
) VALUES
(
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Full-Stack Next.js Website & Portfolio Setup',
  'Custom modern website built with Next.js, React, Tailwind CSS, and Supabase integration. Includes responsive UI, dark mode support, and deployment assistance.',
  1500.00,
  'MITWPU Campus / Remote',
  'published',
  now() - interval '10 days'
),
(
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'UI/UX Design for Mobile Apps & Figma Prototypes',
  'High-fidelity Figma screen designs, interactive prototypes, micro-animations, and modern design systems tailored for iOS and Android apps.',
  1200.00,
  'COEP / Remote',
  'published',
  now() - interval '9 days'
),
(
  '30000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  'Data Structures & Algorithms (C++/Java) Tutoring',
  '1-on-1 peer tutoring sessions covering Trees, Graphs, Dynamic Programming, and LeetCode problem solving strategies for technical interviews.',
  500.00,
  'PICT Library / Online',
  'published',
  now() - interval '8 days'
),
(
  '30000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000004',
  'Professional Video Editing for Reels & Shorts',
  'Engaging vertical video editing with trendy captions, sound design, transitions, and color grading for Instagram Reels and YouTube Shorts.',
  800.00,
  'Remote',
  'published',
  now() - interval '7 days'
),
(
  '30000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000005',
  'Event Photography & High-Res Portrait Shoot',
  'Professional camera photography for college events, fests, club activities, or personal portraits. Includes color correction and 50+ edited images.',
  2000.00,
  'Pune Campus / On-site',
  'published',
  now() - interval '6 days'
),
(
  '30000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000006',
  'ATS Resume Review & Master SOP Proofreading',
  'Professional resume formatting, keyword optimization for tech & corporate ATS screeners, and SOP polishing for study abroad applications.',
  600.00,
  'Remote / Online',
  'published',
  now() - interval '5 days'
),
(
  '30000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000001',
  'SolidWorks 3D CAD Modeling & Assembly Drawings',
  'High-precision 3D CAD modeling, STL generation for 3D printing, and exploded view assembly diagrams for engineering capstone projects.',
  1800.00,
  'COEP Lab / Online',
  'published',
  now() - interval '4 days'
),
(
  '30000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000008',
  '20000000-0000-0000-0000-000000000003',
  'Engineering Mathematics & Calculus Coaching',
  'Concept clearing for Linear Algebra, Laplace Transforms, and Multivariable Calculus. Includes problem sets and previous year exam questions.',
  650.00,
  'MITWPU Campus / Google Meet',
  'published',
  now() - interval '3 days'
),
(
  '30000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000007',
  '1-on-1 Acoustic & Electric Guitar Lessons',
  'Beginner to intermediate guitar lessons covering chords, fingerpicking, rhythm techniques, and song covers.',
  400.00,
  'In Person / Online',
  'published',
  now() - interval '2 days'
),
(
  '30000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000002',
  'Social Media Branding & Canva Template Pack',
  'Custom branded social media post templates, story highlights, flyer designs, and banner graphics for college clubs and startups.',
  900.00,
  'Remote',
  'published',
  now() - interval '1 day'
),
(
  '30000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Python Scripting & Automation Bot Development',
  'Web scraping scripts using BeautifulSoup/Selenium, automated Excel reports, and Telegram/Discord bot creation.',
  1100.00,
  'Remote',
  'published',
  now() - interval '12 hours'
),
(
  '30000000-0000-0000-0000-000000000012',
  '10000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000004',
  'After Effects Motion Graphics & Intro Animations',
  'Custom logo animation intros, animated lower thirds, and video promo graphics for YouTube channels.',
  1400.00,
  'Remote',
  'published',
  now() - interval '6 hours'
),
(
  '30000000-0000-0000-0000-000000000013',
  '10000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000003',
  'Python & Machine Learning Assignment Guidance',
  'Step-by-step guidance on NumPy, Pandas, Scikit-learn, and model building for academic lab projects.',
  750.00,
  'Online',
  'draft',
  now()
),
(
  '30000000-0000-0000-0000-000000000014',
  '10000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'Vector Logo Design & Minimalist Brand Identity',
  'Original vector logo design with brand color palette, font recommendations, and high-res SVG export.',
  1000.00,
  'Remote',
  'paused',
  now()
),
(
  '30000000-0000-0000-0000-000000000015',
  '10000000-0000-0000-0000-000000000009',
  '20000000-0000-0000-0000-000000000007',
  'Podcast Audio Editing, Mixing & Noise Removal',
  'Clean audio editing, vocal EQ, background noise cancellation, and background music insertion for podcasts.',
  850.00,
  'Remote',
  'published',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  status = EXCLUDED.status;

-- 6. Insert Service Media
INSERT INTO service_media (id, service_id, media_url, media_type) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'image'),
  ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&auto=format&fit=crop&q=80', 'image')
ON CONFLICT (id) DO NOTHING;

-- 7. Insert 10 Service Requests across lifecycle statuses
INSERT INTO service_requests (
  id,
  service_id,
  customer_id,
  provider_id,
  message,
  status,
  requested_at,
  accepted_at,
  completed_at
) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  'Hi Alex, I need a portfolio website built using Next.js and Tailwind CSS. Are you available to start this week?',
  'pending',
  now() - interval '2 days',
  NULL, NULL
),
(
  '50000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000002',
  'Hey Priya, loved your Figma designs! We need a 5-screen mobile app mockup for our college hackathon entry.',
  'accepted',
  now() - interval '3 days',
  now() - interval '2 days',
  NULL
),
(
  '50000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  'Hey Rohan, looking for dynamic programming tutoring sessions to prepare for upcoming campus placements.',
  'in_progress',
  now() - interval '4 days',
  now() - interval '3 days',
  NULL
),
(
  '50000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000005',
  'Hi Aarav, we need photography coverage for our department cultural fest event on Friday evening.',
  'completed',
  now() - interval '6 days',
  now() - interval '5 days',
  now() - interval '1 day'
),
(
  '50000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000004',
  'Hi Sneha, can you edit 15 short reel clips within 24 hours?',
  'declined',
  now() - interval '5 days',
  NULL, NULL
),
(
  '50000000-0000-0000-0000-000000000006',
  '30000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000006',
  'Hello Tanvi, I would like an ATS resume check and assistance writing a cover letter for software engineer roles.',
  'pending',
  now() - interval '1 day',
  NULL, NULL
),
(
  '50000000-0000-0000-0000-000000000007',
  '30000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000007',
  'Hi Vikram, need a SolidWorks model for a robot chassis component for our robotics competition.',
  'accepted',
  now() - interval '2 days',
  now() - interval '1 day',
  NULL
),
(
  '50000000-0000-0000-0000-000000000008',
  '30000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000008',
  'Hi Ananya, need help preparing for Linear Algebra mid-term exams next week.',
  'completed',
  now() - interval '7 days',
  now() - interval '6 days',
  now() - interval '2 days'
),
(
  '50000000-0000-0000-0000-000000000009',
  '30000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000009',
  'Hey Kabir, want to take 4 acoustic guitar weekend classes to learn fingerstyle.',
  'in_progress',
  now() - interval '3 days',
  now() - interval '2 days',
  NULL
),
(
  '50000000-0000-0000-0000-000000000010',
  '30000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000010',
  'Hi Diya, need a poster & story pack designed for our upcoming photography workshop event.',
  'completed',
  now() - interval '5 days',
  now() - interval '4 days',
  now() - interval '1 day'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  message = EXCLUDED.message;

-- 8. Insert 5 Reviews
INSERT INTO reviews (
  id,
  service_id,
  reviewer_id,
  reviewee_id,
  rating,
  comment,
  created_at
) VALUES
(
  '60000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000005',
  5,
  'Aarav did an outstanding job! The event photos were delivered super fast and the quality was top notch.',
  now() - interval '1 day'
),
(
  '60000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000002',
  5,
  'Priya created an incredible design system for our hackathon app. Super responsive and easy to work with!',
  now() - interval '2 days'
),
(
  '60000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  4,
  'Very knowledgeable tutor. Explained DP and graph algorithms clearly with examples.',
  now() - interval '3 days'
),
(
  '60000000-0000-0000-0000-000000000004',
  '30000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000008',
  5,
  'Ananya is brilliant at math! Cleared all my multivariable calculus doubts in 2 sessions.',
  now() - interval '2 days'
),
(
  '60000000-0000-0000-0000-000000000005',
  '30000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000010',
  5,
  'Super creative branding work by Diya! The Canva template pack saved us tons of time for club marketing.',
  now() - interval '1 day'
)
ON CONFLICT (service_id, reviewer_id) DO UPDATE SET
  rating = EXCLUDED.rating,
  comment = EXCLUDED.comment;
