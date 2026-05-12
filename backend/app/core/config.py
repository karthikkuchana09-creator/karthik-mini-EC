import os
from pydantic_settings import BaseSettings
from app.core.log import get_logger

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
logger = get_logger("config")

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = os.path.join(BASE_DIR, ".env")
        extra = "ignore"

settings = Settings()

logger.info("Configuration loaded")
logger.debug("ENV_PATH=%s", os.path.join(BASE_DIR, ".env"))
logger.debug("DATABASE_URL=%s", settings.DATABASE_URL)
logger.debug("ACCESS_TOKEN_EXPIRE_MINUTES=%d", settings.ACCESS_TOKEN_EXPIRE_MINUTES)