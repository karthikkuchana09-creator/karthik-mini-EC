import os
from pydantic_settings import BaseSettings
from app.core.log import get_logger

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
logger = get_logger("config")

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    RESET_TOKEN_EXPIRE_MINUTES: int = 15
    FRONTEND_URL: str = "http://localhost:5173"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@karthik-ec.com"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN: int = 5
    RATE_LIMIT_LOGIN_WINDOW: int = 60
    RATE_LIMIT_REGISTER: int = 5
    RATE_LIMIT_REGISTER_WINDOW: int = 60
    RATE_LIMIT_FORGOT_PASSWORD: int = 3
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW: int = 60
    RATE_LIMIT_REFRESH: int = 10
    RATE_LIMIT_REFRESH_WINDOW: int = 60
    RATE_LIMIT_DEFAULT: int = 100
    RATE_LIMIT_DEFAULT_WINDOW: int = 60
    RATE_LIMIT_COMMENT: int = 30
    RATE_LIMIT_COMMENT_WINDOW: int = 60
    REDIS_URL: str = ""

    CACHE_ENABLED: bool = True
    CACHE_TTL_DEFAULT: int = 300
    CACHE_TTL_DASHBOARD: int = 120
    CACHE_TTL_AI: int = 600
    CACHE_TTL_NOTIFICATION: int = 30

    AI_SCHEDULER_ENABLED: bool = True
    AI_CACHE_WARM_INTERVAL_HOURS: int = 1
    AI_FULL_REFRESH_AT: str = "03:00"
    AI_CACHE_CLEANUP_AT: str = "04:30"

    class Config:
        env_file = os.path.join(BASE_DIR, ".env")
        extra = "ignore"

settings = Settings()

logger.info("Configuration loaded")
logger.debug("ENV_PATH=%s", os.path.join(BASE_DIR, ".env"))
logger.debug("DATABASE_URL=%s", settings.DATABASE_URL)
logger.debug("ACCESS_TOKEN_EXPIRE_MINUTES=%d", settings.ACCESS_TOKEN_EXPIRE_MINUTES)