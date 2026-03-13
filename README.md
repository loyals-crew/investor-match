# InvestorMatch

A two-sided platform that connects investors with companies based on investment mandate, sector, stage, and fundraise criteria.

## Overview

**For Investors** — Define your mandate (sectors, stages, geography, ticket size), create individual funds, get automatically matched to companies raising rounds that fit your thesis, send structured inquiries, and track deals and portfolio per fund.

**For Companies** — Set up your company profile and active fundraise round, surface automatically in the feeds of matching investors, receive qualified inbound inquiries, and manage your investor pipeline in one place.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon serverless) |
| Auth | JWT |

---

## Project Structure

```
investor-match/
├── backend/           # Express API
│   ├── src/
│   │   ├── routes/    # API route handlers
│   │   ├── middleware/ # Auth middleware
│   │   └── db.js      # Neon DB client
│   ├── .env.example
│   └── package.json
└── frontend/          # React + Vite app
    ├── src/
    │   ├── pages/     # Page components
    │   ├── context/   # Auth context
    │   └── main.jsx
    ├── .env.example
    └── package.json
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/loyals-crew/investor-match.git
cd investor-match
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your Neon DATABASE_URL and JWT_SECRET
npm install
npm run dev
```

### 3. Set up the frontend

```bash
cd frontend
cp .env.example .env
# Edit .env if your API runs on a different port
npm install
npm run dev
```

### 4. Open the app

Visit [http://localhost:5173](http://localhost:5173)

---

## Key Features

- **Mandate-based matching** — investors define their thesis; companies surface only when they fit
- **Fund management** — multiple funds per investor, each with its own thesis and deal-size range
- **Structured inquiries** — request meetings, pitch decks, financials, or ask questions in threaded conversations
- **Deal tracking** — mark investment outcomes, log deal amounts, assign to funds
- **Portfolio view** — see all companies invested through each fund with amounts and round info
- **Two-sided discovery** — both sides qualify each other, reducing noise

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `PORT` | API port (default: 3001) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (default: http://localhost:3001) |
