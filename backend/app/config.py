from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    KITCHEN_USERNAME: str = "chef"
    KITCHEN_PASSWORD: str = "chef123"
    SECRET_KEY: str

    class Config:
        env_file = ".env"

settings = Settings()
