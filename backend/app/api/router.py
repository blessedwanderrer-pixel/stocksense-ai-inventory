from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.ai import router as ai_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.me import router as me_router
from app.api.routes.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(ai_router)
api_router.include_router(me_router)
api_router.include_router(inventory_router)
api_router.include_router(reports_router)
