from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PORT: int = 3000
    MONGO_URI: str = "mongodb://localhost:27017/skillswap"
    ACCESS_TOKEN_SECRET: str = "your-super-secret-key"
    ACCESS_TOKEN_EXPIRY_DAYS: int = 1
    CORS_ORIGIN: str = "http://localhost:5500,http://127.0.0.1:5500,https://skillswapping11.netlify.app"
    GEMINI_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> List[str]:
        origins = [
            "http://localhost:5500",
            "http://127.0.0.1:5500",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://skillswapping11.netlify.app",
        ]
        if self.CORS_ORIGIN:
            for item in self.CORS_ORIGIN.split(","):
                cleaned = item.strip()
                if cleaned and cleaned not in origins:
                    origins.append(cleaned)
        return origins

settings = Settings()
