from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "PS128 Livestock Health & Outbreak Intelligence API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = Path(__file__).resolve().parents[1] / ".env"
        case_sensitive = True


settings = Settings()
