# Startup

## Production / single-domain mode (recommended for client demos & hosting)

One server serves everything — the customer app, admin, kitchen, API, and live updates —
so **one domain/IP works on every device**.

```
cd "D:\crm main\DineFlow - Enterprise CRM Solution\frontend"
npm run build

cd "D:\crm main\DineFlow - Enterprise CRM Solution\backend"
.\venv\Scripts\Activate.bat
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Then every device opens the same address (`http://<PC-LAN-IP>:8000` on Wi-Fi, or your domain when hosted):

- Customer menu: `/menu?table=1` (QR codes in Admin → Table QR codes already use the current domain)
- Admin: `/admin/login` (admin / admin123)
- Kitchen: `/kitchen/login` (chef / chef123)

**Remember:** after changing frontend code, run `npm run build` again — this mode serves the built files.

## Development mode (hot reload while coding)

Backend:

```
cd "D:\crm main\DineFlow - Enterprise CRM Solution\backend"
.\venv\Scripts\Activate.bat
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```
cd "D:\crm main\DineFlow - Enterprise CRM Solution\frontend"
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173/...` (same paths as above). Other devices can use `http://<PC-LAN-IP>:5173`.

## Before real public hosting

- Change `ADMIN_PASSWORD`, `KITCHEN_PASSWORD`, and `SECRET_KEY` in `backend\.env`.
- Put the app behind HTTPS (reverse proxy such as Caddy/Nginx, or the host's built-in TLS); the
  kitchen live feed automatically switches to `wss://` on HTTPS.
- QR images on the Table QR page are generated via api.qrserver.com (needs internet).

## Notes

- Payments are settled fully offline (cash / waiter's UPI QR). The app does not track paid status; bills are record + print (Orders & Bills page).
- Re-ordering from the same table while an order is open appends to the same order ID (one bill).
- Admin → Menu manages products, veg/non-veg, and availability.
