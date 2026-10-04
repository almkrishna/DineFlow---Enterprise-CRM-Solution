# DineFlow — Restaurant CRM & QR Ordering Platform

**DineFlow** is a full-stack restaurant management platform: customers scan a table QR code to browse the menu and order from their phone, the kitchen receives orders live on a display board, and the admin runs the whole restaurant — menu, orders, bills, analytics, and customer relationship management — from one dashboard.

*The bundled demo restaurant is branded "Spice Bistro"; each deployment carries the client restaurant's own name on the customer-facing pages.*

**Author:** Lakshmi Mohan Krishna Ammisetty
**Email:** almkrishna1@gmail.com

---

## Features

### Customer (QR ordering)
- Scan the table QR → mobile-first menu with categories, search, and a **Veg / Non-Veg / All** filter (FSSAI-style food marks on every dish)
- Item variants (Half/Full, sizes) and add-ons with a bottom-sheet customizer
- Live cart with per-item quantity steppers and a floating total bar
- **Live order tracking** — status stepper (Received → Preparing → Ready → Served) that updates automatically
- Ordering again at the same table **appends to the same order ID** — one combined bill per table
- If the kitchen cancels, the customer instantly sees an apology screen with the reason and can reorder
- "I'm done" closes the table with a final bill summary (payment settled offline: cash or the staff's UPI QR)

### Kitchen Display
- Secure chef login; live order board over an authenticated WebSocket (with automatic polling fallback)
- New-order beep, live elapsed timers with urgency colors (green → amber → red)
- Second-round items highlighted **NEW** with a round badge
- One-tap status flow and order cancellation with a reason sent to the customer

### Admin Dashboard
- **Orders & Bills** — live list with prep times (placed → completed), status filters, bill popup per order, **multi-select bulk bill printing**, and an editable PRINTED / NOT PRINTED mark
- **Menu Management** — add/edit products with categories, variants, add-ons, veg/non-veg, and availability toggles (sold-out items vanish from the customer menu instantly)
- **Analytics** — revenue trends, top sellers, busiest hours, kitchen prep-time trend and stage breakdown (accept / cooking / serving), cancellation reasons and lost revenue
- **CRM & Campaigns** — automatic RFM segmentation (Champions, Loyal, Potential, At Risk, Can't Lose, Lost), customer directory with search/filters, top spenders, repeat rate, revenue-at-risk, and targeted campaign suggestions
- **Table QR codes** — all 50 table QR cards generated locally (no internet needed), ready to print

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, Framer Motion, Recharts, Axios, qrcode.react |
| Backend | FastAPI (Python 3.13), SQLAlchemy, Pydantic v2, WebSockets, JWT auth (python-jose) |
| Database | SQLite (WAL mode) with automatic in-place migrations |
| Realtime | Authenticated WebSocket broadcast + polling safety net |

---

## Getting Started

### Prerequisites
- Python 3.11+ and Node.js 18+
- Create `backend/.env` (see keys in `backend/app/config.py`): `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `KITCHEN_USERNAME`, `KITCHEN_PASSWORD`, `SECRET_KEY`

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
On first start the database is created, migrated, and seeded with demo data automatically.

### 2. Frontend (development)
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```
Open `http://localhost:5173` — other devices on the same Wi-Fi use `http://<PC-IP>:5173`.

### 3. Production / single-domain mode
One server serves the app, API, and live updates — a single domain or IP works on every device:
```bash
cd frontend && npm run build
cd backend  && uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Then everything is at `http://<host>:8000`. Rebuild the frontend after any UI change in this mode.

### URLs & default logins
| Portal | Path | Login |
|---|---|---|
| Customer menu | `/menu?table=1` | — (name + phone asked at checkout) |
| Order tracking | `/track?order=<id>` | — (opened automatically) |
| Kitchen display | `/kitchen/login` | credentials set in `backend/.env` |
| Admin dashboard | `/admin/login` | credentials set in `backend/.env` |

> Credentials and `SECRET_KEY` live in `backend/.env` (never commit this file). Serve behind HTTPS when hosting publicly — the kitchen feed upgrades to `wss://` automatically.

---

## Project Structure
```
backend/
  app/
    main.py          # FastAPI app, SQLite migrations, SPA static serving
    config.py        # environment settings
    database.py      # engine (WAL mode), session
    models/          # SQLAlchemy models (menu, orders, customers, campaigns)
    routers/         # menu, orders, kitchen (WebSocket), billing, analytics, crm, auth
    schemas/         # Pydantic request/response models
    services/        # RFM engine, campaign engine
    seed.py          # demo data generator
frontend/
  src/
    pages/customer/  # MenuPage, CartPage, TrackOrderPage
    pages/kitchen/   # KitchenDashboard, KitchenLogin
    pages/admin/     # Orders & Bills, Menu, Analytics, CRM, Table QRs
    components/      # MenuCard, VariantModal, VegMark, DishImage, ErrorBoundary
    hooks/           # useCart, useWebSocket
    services/api.js  # API client + auth interceptors
```

## API Overview
- `GET /api/menu` · `GET /api/menu/admin` · `POST/PUT /api/menu/items` · availability & category endpoints
- `POST /api/orders` (create or append round) · `GET /api/orders/{id}/track` (public live tracking)
- `PATCH /api/orders/{id}/status` · `PATCH /api/orders/{id}/bill-printed`
- `WS /ws/kitchen?token=…` (live kitchen feed)
- `GET /api/analytics/summary | daily-sales | top-items | operations`
- `GET /api/crm/segments | customers | insights | campaigns` · `POST /api/crm/recalculate`
- Interactive docs at `/docs` when the backend is running

---

© 2026 Lakshmi Mohan Krishna Ammisetty · almkrishna1@gmail.com
