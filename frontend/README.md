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

git clone [https://github.com/your-org/recalllogic-frontend.git](https://github.com/your-org/recalllogic-frontend.git)
cd recalllogic-frontend

npm install

npm run dev