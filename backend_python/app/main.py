from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import socketio
import os
import logging

from app.config import settings
from app.database import connect_db, close_db
from app.sockets.chat_socket import sio

from app.routes.user_routes import router as user_router
from app.routes.skill_routes import router as skill_router
from app.routes.transaction_routes import router as transaction_router
from app.routes.chat_routes import router as chat_router
from app.routes.message_routes import router as message_router
from app.routes.notification_routes import router as notification_router
from app.routes.ai_routes import router as ai_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("skillswap.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up SkillSwap Python Backend...")
    await connect_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    # Shutdown
    logger.info("Shutting down SkillSwap Python Backend...")
    await close_db()

fastapi_app = FastAPI(
    title="SkillSwap API",
    description="SkillSwap peer-to-peer exchange platform with real-time chat and Gen AI",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Supporting localhost on any port, 127.0.0.1 on any port, and production frontend domains
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://skillswapping11.netlify.app",
]
if settings.CORS_ORIGIN:
    for o in settings.CORS_ORIGIN.split(","):
        cleaned = o.strip()
        if cleaned and cleaned not in cors_origins:
            cors_origins.append(cleaned)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept"],
)

# Static files for avatars
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API Routers
fastapi_app.include_router(user_router)
fastapi_app.include_router(skill_router)
fastapi_app.include_router(transaction_router)
fastapi_app.include_router(chat_router)
fastapi_app.include_router(message_router)
fastapi_app.include_router(notification_router)
fastapi_app.include_router(ai_router)

@fastapi_app.get("/api/health")
async def health():
    return {"status": "ok", "message": "SkillSwap server is running! 🚀"}

# Mount frontend: Prefer the compiled modern React build, fallback to legacy frontend
react_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend_react", "dist"))
legacy_frontend = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))

if os.path.isdir(react_dist):
    fastapi_app.mount("/", StaticFiles(directory=react_dist, html=True), name="frontend")
elif os.path.isdir(legacy_frontend):
    fastapi_app.mount("/", StaticFiles(directory=legacy_frontend, html=True), name="frontend")
else:
    @fastapi_app.get("/")
    async def root():
        return "SkillSwap server is running! 🚀"

# Wrap FastAPI with python-socketio ASGIApp so both REST and Socket.io coexist seamlessly
app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=fastapi_app,
    socketio_path="/socket.io"
)
