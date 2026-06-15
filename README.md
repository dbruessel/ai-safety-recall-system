# Aegis Intelligence System

A production-grade, cloud-native intelligence engine for predictive vehicle safety and recall management. Aegis normalizes complex, inconsistent government vehicle data into actionable fleet safety intelligence.

## 📌 Overview
The Aegis Intelligence System automates the collection, normalization, and analysis of vehicle safety data from the National Highway Traffic Safety Administration (NHTSA). By transforming raw, unreliable datasets into a high-fidelity intelligence layer, Aegis enables fleet operators to proactively identify subassembly failure risks, schedule maintenance, and mitigate liability.

## 🚀 Key Capabilities
* **Predictive Safety Scoring:** Proprietary algorithms calculate hazard severity (0–100) by correlating recall summaries with environmental and mechanical stressors.
* **Automated Delta-Sync:** A resilient, timestamp-driven ingestion engine that operates continuously to update fleet risk profiles.
* **Production-Hardened Ingestion:** Fault-tolerant workers that sanitize inconsistent manufacturer nomenclature (VPIC) and handle API partial-failures without interrupting the broader pipeline.
* **Materialized Intelligence:** Data is pre-calculated at the ingestion layer, ensuring lightning-fast API response times for mission-critical fleet decisions.

## 🧱 Architecture
The system is designed for massive scale and reliability using a serverless infrastructure.



* **Ingestion:** Cloud Run Jobs (Python) perform throttled, fault-tolerant API calls.
* **Storage:** Google Cloud Firestore (NoSQL) stores normalized campaign data and ingestion checkpoints.
* **API Layer:** FastAPI provides high-performance, cached endpoints for vehicle recall verification.
* **Resiliency:** Built-in circuit breakers and chronological status-exclusion logic ensure consistent performance despite upstream API volatility.

## ⚙️ Quick Start

### Prerequisites
* Google Cloud SDK
* Python 3.12+
* Active GCP Project with Firestore enabled

### Installation
```bash
# Clone the repository
git clone [https://github.com/yourusername/aegis-intelligence](https://github.com/yourusername/aegis-intelligence)
cd aegis-intelligence/backend

# Install dependencies
pip install -r requirements.txt