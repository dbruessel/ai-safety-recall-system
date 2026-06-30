RecallLogic Intelligence System
A production-grade, cloud-native intelligence engine for predictive vehicle safety and recall management.

RecallLogic normalizes complex, inconsistent government vehicle data into actionable fleet safety intelligence, enabling fleet operators to proactively identify subassembly failure risks, schedule maintenance, and mitigate liability.

📌 Overview
The RecallLogic Intelligence System automates the collection, normalization, and analysis of vehicle safety data from the National Highway Traffic Safety Administration (NHTSA). By transforming raw, unreliable datasets into a high-fidelity intelligence layer, the system provides:

Fleet Recall Intelligence: Comprehensive monitoring of vehicle safety status.

Materialized Intelligence: Pre-calculated safety scoring (severity, regional climate vulnerability) performed during ingestion.

Predictive Risk Scoring: Actionable directives tailored for fleet dispatch managers.

Automated Delta Sync: Resilient 3:00 AM data ingestion ensuring data is always current.

🚀 Quick Start
Environment Setup: Ensure your monorepo is located at C:\dev\clean-repo.

Backend: Navigate to backend/ and run the FastAPI server:

Bash
uvicorn app.main:app --reload --port 8000
Frontend: Navigate to frontend/ and start the development server:

Bash
npm run dev
🧪 Testing & Agent Workflow Framework
To ensure enterprise reliability, RecallLogic employs a decoupled Replica Testing Architecture. This framework allows AI testing agents to safely interact with, stress-test, and validate product workflows without impacting production data.

The Replica Strategy
Isolated State: Agents operate within disposable, containerized environments (utilizing Docker-Compose mirrors) to prevent destructive updates on the live Supabase/PostgreSQL instance.

Deterministic Environment Provisioning: By using JSON-based "Task Matrices," we guarantee that every test run starts with the exact same data configuration, eliminating test flakiness.

Risk Mitigation (Blast Radius): The Sandbox Control Plane (/api/sandbox/reset) makes it physically impossible for testing agents to accidentally execute against production data.

Testing Tracks
Unit & Integration (Backend): pytest suite focused on core scoring algorithms, data filtering, and API endpoint verification.

Agent Workflows: A WorkflowExecutor parses JSON "Task Matrices" to simulate complex user behaviors (e.g., freemium limit enforcement, Stripe checkout interception, or CSV ingestion edge-cases).

End-to-End (E2E) UI: Playwright integration utilized by AI agents to validate UI dashboard behaviors, freemium guardrails, and compliance badge generation.

Observability
All agent actions are captured in an Audit Log, providing a traceable history of how the agent performed, rather than just simple pass/fail results. This allows for rapid debugging of complex ingestion workflows.

📄 License
MIT License.