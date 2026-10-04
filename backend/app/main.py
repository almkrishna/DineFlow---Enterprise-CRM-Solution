from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from app.routers import menu, orders, kitchen, billing, analytics, crm, auth
from app.database import engine, Base
from app.seed import seed_data
from contextlib import asynccontextmanager

def run_sqlite_migrations():
    """Add newly introduced columns to an existing SQLite database in place."""
    if "sqlite" not in str(engine.url):
        return
    migrations = {
        "orders": [
            ("payment_method", "VARCHAR(20)"),
            ("cancel_reason", "VARCHAR(255)"),
            ("preparing_at", "DATETIME"),
            ("ready_at", "DATETIME"),
            ("completed_at", "DATETIME"),
            ("cancelled_at", "DATETIME"),
            ("bill_printed", "BOOLEAN DEFAULT 0"),
        ],
        "order_items": [
            ("round_number", "INTEGER DEFAULT 1"),
        ],
        "menu_items": [
            ("is_veg", "BOOLEAN DEFAULT 1"),
        ],
    }
    with engine.connect() as conn:
        for table, columns in migrations.items():
            existing = {row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")}
            if not existing:
                continue
            for name, ddl in columns:
                if name not in existing:
                    conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")
        conn.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_sqlite_migrations()
    seed_data()
    yield

app = FastAPI(title="DineFlow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(kitchen.router)
app.include_router(billing.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(crm.router, prefix="/api")
app.include_router(auth.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}


# ---- Single-domain hosting: serve the built frontend from this same server ----
# Build it with `npm run build` in frontend/; API lives under /api, the live feed
# under /ws, and every other path serves the React app (SPA client-side routing).
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith(("api/", "ws/")) or full_path in ("api", "ws"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file() and candidate.resolve().is_relative_to(FRONTEND_DIST):
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
