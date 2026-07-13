# 🪐 Project Omni-Sense

### Enterprise-Grade Agentic Banking Intelligence & Spatial Risk Cockpit

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688.svg?style=flat&logo=Fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2.0-20232A.svg?style=flat&logo=React&logoColor=61DAFB)](https://react.dev)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-10.16.4-FF00C4.svg?style=flat&logo=Framer&logoColor=white)](https://framer.com/motion)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.3.5-38B2AC.svg?style=flat&logo=Tailwind-CSS&logoColor=white)](https://tailwindcss.com)

**Omni-Sense** is a state-of-the-art enterprise banking intelligence platform that combines **9-Stage Agentic AI Swarms**, **Basel III Macro-Stress Simulators**, **Real-Time Entity Relationship Graphs (AML)**, and **Physical Digital Twins** (powered by satellite volumetric stockpiles and transit toll velocities) to predict and mitigate credit risk before it defaults.

---

## ⚡ Key Highlights & Core Upgrades

### 🤖 9-Stage Agentic Swarm Orchestrator (`AgentSwarmEngine`)
Unlike traditional simple chatbots, Omni-Sense utilizes a complete LangGraph-style cognitive pipeline:
```
User Request ➔ 1. Planner ➔ 2. Decomposer ➔ 3. Executors (Parallel Threads) ➔ 4. Memory ➔ 5. Knowledge Graph ➔ 6. Reasoning (Logits) ➔ 7. Decision (Sigmoid) ➔ 8. Reporter ➔ 9. Output Response
```
- **Parallel Executors**: Auditor (E-Courts, GST), Chaser (Fastag transit toll tracking), and Eye (SAR satellite volumetric depot analysis).
- **SQLite-Backed Short/Long-Term Memory**: Observational logs are persisted to track historical reasoning across sessions.

### 🏛️ Basel III Macro Scenario War Room
- **1,000-Trial Monte Carlo Simulations**: Inject inflation rates, interest rate spikes, and logistics fuel shocks to forecast a borrower's 12-month net cashflow confidence bands (P10, P50, P90).
- **Logit Default Risk Sigmoid**:
  $$\text{PD} = \frac{1}{1 + e^{-Z}}$$
  $$Z = -2.0 + (\text{litigations} \times 0.8) + (\text{idle fleet} \times 3.5) + (\text{depletion} \times 2.0)$$

### 🕸️ AML Entity Relationship Graph & Fraud Detector
- Scans direct corporate networks, directors list, shell suppliers, and identifies shared telephones or addresses linking target borrowers to potential fraud rings.
- Rendered in a high-fidelity vector graph cockpit.

### 🔒 Enterprise Auth & 2-Factor Sandbox (MFA)
- Armed with access tokens (30m) and refresh token rotation (30d).
- Implements two-stage login challenge requiring verification codes (`123456`) in a dedicated OTP challenge interface.

---

## ⚙️ Architecture & Tech Stack

### Backend execution mesh:
- **FastAPI**: Asynchronous high-performance routing.
- **SQLite**: Local relational database with enterprise tables.
- **Pydantic**: Data schema models.

### Frontend cockpit:
- **React 18**: Dynamic layouts.
- **Recharts**: Data viz with Monte Carlo confidence bands.
- **Framer Motion**: Ambient animations.
- **Tailwind CSS**: Light-themed banking design language.

---

## 📦 Project Structure

```
OMNI-SENSE/
├── backend/
│   ├── main.py              # FastAPI Router & API Endpoints
│   ├── engine.py            # 9-Stage Swarm Agent Engine
│   ├── database.py          # SQLite database connection & seed data
│   ├── auth.py              # Token validation & MFA challenge logic
│   ├── schemas.py           # Pydantic Request/Response models
│   ├── omnisense.db         # Preloaded seed SQLite database
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js                       # MFA OTP challenge screen
│   │   │   ├── Screen0_DashboardOverview.js   # Swarm cockpit (Graph, Monte Carlo, Twin)
│   │   │   ├── Screen1_TacticalCommand.js     # Map overlays
│   │   │   ├── Screen2_DiagnosticLogs.js      # Terminal log streams & counterfactuals
│   │   │   ├── Screen3_RestructuringSimulator.js # Restructuring copilot
│   │   │   └── Screen4_Help.js                # System architecture vector guide
│   │   ├── App.js           # Frontend Router & Permission rules
│   │   └── index.css        # Premium glass panels & skeleton animations
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Database Initialization
Omni-Sense comes with a pre-seeded `omnisense.db` file. To re-initialize or reset the database:
```bash
cd backend
python database.py
```

### 2. Run the Backend API Server
Using the local virtual environment:
```bash
cd backend
python -m venv venv
# Activate venv:
# - Windows: .\venv\Scripts\activate
# - Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```
Backend API will be running on `http://localhost:8000`.

### 3. Run the Frontend React Application
```bash
cd frontend
npm install
npm start
```
Frontend Web console will be running on `http://localhost:3000`.

---

## 🔑 Sandboxed Authentication & MFA Testing
Omni-Sense enforces enterprise role permissions. Use these preseeded credentials to test the interfaces:

| Username / Email | Password | Sandbox Role | Available Views / Permissions |
| :--- | :--- | :--- | :--- |
| `customer@omnisense.com` | `admin123` | **Customer** | Basic Accounts, Budget Planning, Loan Affordability |
| `credit_analyst@omnisense.com` | `admin123` | **Credit Analyst** | Swarm Risk Cockpit, Underwriting, Restructuring |
| `fraud_analyst@omnisense.com` | `admin123` | **Fraud Analyst** | Fraud Graphs, Suspicious Wires, Auditing |
| `admin@omnisense.com` | `admin123` | **Super Admin** | Platform Health, User Administration, Backups |

*During login, enter the mock 2-Factor OTP Code: `123456`.*

---

## 🗣️ Natural Language Command Interface (Chat & Voice)
The platform features an intelligent voice/text assistant responding directly to conversational inputs:
- *"Change the budget to 300000"* ➔ Directly updates SQLite budgets table.
- *"Set my monthly income to 150000"* ➔ Executes SQL updates on customer income parameters.
- *"Run tri-agent analysis"* ➔ Triggers execution swarms.
- *"Explain the risk factors"* ➔ Highlights SHAP credit scores.

---

## 📝 License
Distributed under the MIT License. See `LICENSE` for details.
