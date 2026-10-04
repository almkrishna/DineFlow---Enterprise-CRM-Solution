from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

IS_SQLITE = "sqlite" in settings.DATABASE_URL

engine = create_engine(
    settings.DATABASE_URL,
    # timeout: wait up to 15s for a locked database instead of failing instantly
    connect_args={"check_same_thread": False, "timeout": 15} if IS_SQLITE else {},
)

if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_connection, connection_record):
        """WAL mode lets simultaneous orders from several devices read/write
        without 'database is locked' errors."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
