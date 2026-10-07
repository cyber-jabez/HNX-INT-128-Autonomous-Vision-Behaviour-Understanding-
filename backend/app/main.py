import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base
from app.api import api_router
from app.schemas.common import HealthCheckResponse
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown routines."""
    logger.info("Initializing HNX26PSI07 Autonomous Vision & Behaviour Understanding Backend...")
    # Ensure storage paths exist
    settings.ensure_directories()
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas initialized.")
    yield
    logger.info("Shutting down application...")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Autonomous Vision & Behaviour Understanding System - Phase 1 Foundation: "
        "High-performance modular backend for real-time video analytics, tracking, "
        "behaviour understanding, anomaly alerts, and natural language explanation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
origins = settings.BACKEND_CORS_ORIGINS
if isinstance(origins, list):
    cors_origins = origins
else:
    cors_origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if "*" not in cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Request / Response Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(
            f"{request.method} {request.url.path} completed with status {response.status_code} in {process_time:.2f}ms"
        )
        return response
    except Exception as exc:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"{request.method} {request.url.path} failed in {process_time:.2f}ms - error: {str(exc)}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "message": "Internal Server Error", "detail": str(exc)},
        )


# Global Validation Exception Handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.method} {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation Error",
            "errors": exc.errors(),
        },
    )


# Health Check Endpoint
@app.get("/health", response_model=HealthCheckResponse, tags=["Health"])
def health_check():
    """Verify backend health and database connectivity."""
    db_connected = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_connected = True
    except Exception as e:
        logger.error(f"Health check database ping failed: {e}")

    return HealthCheckResponse(
        status="healthy" if db_connected else "degraded",
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        version="1.0.0",
        database_connected=db_connected,
    )


# Root landing endpoint
@app.get("/", tags=["Health"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
    }


# Include versioned API router
app.include_router(api_router, prefix=settings.API_V1_STR)
