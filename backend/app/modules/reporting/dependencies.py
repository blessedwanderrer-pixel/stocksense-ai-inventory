from typing import Annotated

from fastapi import Depends
from supabase import AsyncClient

from app.modules.auth.dependencies import get_user_supabase_client
from app.modules.reporting.service import ReportingService


async def get_reporting_service(
    client: Annotated[AsyncClient, Depends(get_user_supabase_client)],
) -> ReportingService:
    return ReportingService(client)

