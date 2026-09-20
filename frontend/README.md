# RecallLogic — Commercial Auto Safety & Risk Intelligence

RecallLogic is an automated safety recall tracking and loss-control compliance platform built for **Commercial Insurance Brokers** and **Commercial Fleet Operators**. The platform continuously syncs vehicle VINs against official NHTSA recall databases, generates underwriter-ready Loss Control Risk Certificates, and drives a two-sided sales flywheel.

---

## 🚀 Key Platform Features

* **Dual-Persona Workspaces:**
  * **Insurance Brokers:** Access a macro Portfolio Command dashboard to monitor book safety scores, protect portfolio loss ratios, export loss control audit PDFs, and distribute co-branded client referral links.
  * **Fleet Operators:** Manage single-VIN or bulk fleet recall tracking, organize dealer repair logistics (Open, Scheduled, Cleared), and generate proof-of-remedy certificates for policy renewal discounts.
* **Non-Blocking Guided Product Tours:** Interactive, step-by-step contextual overlay tours on both Broker (`/audit/demo`) and Fleet (`/taskboard/demo`) demo routes to maximize conversion during cold outreach.
* **Instant Inbound Lead Capture:** Built-in "Request Agency Access" modal on the landing page that saves high-intent broker leads directly to Supabase.
* **Paywall & Stripe Checkout Sync:** Integrated with Stripe Checkout for seamless tier upgrades (`Standard $99/mo`, `Professional $249/mo`, `Enterprise $499/mo`) with automated post-checkout profile provision handlers.

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
* **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Auth Services)
* **Payment Engine:** Stripe Checkout API & Webhooks
* **Backend API:** Python / FastAPI / Node.js Engine (NHTSA Live Sync & PDF Export Generators)

---

## 🔗 Route Map & Testing URLs

| Target Persona | URL / Route | Description |
| :--- | :--- | :--- |
| **Root Homepage** | `https://recalllogic.ai/` | Direct VIN audit tool, broker value proposition section, and lead capture modal. |
| **Broker Portfolio Demo** | `https://recalllogic.ai/audit/demo` | Bypasses auth; loads interactive broker portfolio command with guided agency tour. |
| **Fleet Operator Demo** | `https://recalllogic.ai/taskboard/demo` | Bypasses auth; loads interactive vehicle taskboard with guided operational tour. |
| **Co-Branded Sign Up** | `https://recalllogic.ai/signup?broker_id=<ID>` | Custom referral onboarding route linking new fleet accounts to referring brokerages. |

---

## ⚙️ Environment Variables Setup

Create a `.env.local` file in the root directory and configure the following parameters:

```env
# Supabase Configuration
VITE_SUPABASE_URL=[https://your-supabase-project.supabase.co](https://your-supabase-project.supabase.co)
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Backend API Engine URL
VITE_API_URL=[https://ai-safety-recall-system.onrender.com](https://ai-safety-recall-system.onrender.com)

# Stripe Pricing Tier IDs
VITE_STRIPE_PRICE_STANDARD=price_1N...
VITE_STRIPE_PRICE_PRO=price_1N...
VITE_STRIPE_PRICE_ENTERPRISE=price_1N...


🗄️ Supabase Backend Requirements
Ensure the broker_leads table is active with proper public insert permissions for website lead collection:

-- 1. Create Inbound Broker Lead Storage Table
CREATE TABLE IF NOT EXISTS public.broker_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    brokerage_name TEXT NOT NULL,
    portfolio_size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Schema Grants and Row Level Security Setup
GRANT ALL ON TABLE public.broker_leads TO anon;
GRANT ALL ON TABLE public.broker_leads TO authenticated;

ALTER TABLE public.broker_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to broker_leads" ON public.broker_leads;
CREATE POLICY "Allow public insert to broker_leads" 
ON public.broker_leads 
FOR INSERT TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select to broker_leads" ON public.broker_leads;
CREATE POLICY "Allow public select to broker_leads" 
ON public.broker_leads 
FOR SELECT TO anon, authenticated 
USING (true);

💻 Local Development Setup
Clone the repository:
git clone [https://github.com/your-org/recalllogic-frontend.git](https://github.com/your-org/recalllogic-frontend.git)
cd recalllogic-frontend

Install dependencies:
npm install

Start the local development server:
npm run dev

Build for production:
npm run build

📄 License & Intellectual Property
Copyright © 2026 RecallLogic Inc. All Rights Reserved. Continuous Safety & Risk Intelligence.