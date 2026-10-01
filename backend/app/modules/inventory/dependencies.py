from typing import Annotated

from fastapi import Depends
from supabase import AsyncClient

from app.modules.auth.dependencies import get_user_supabase_client
from app.modules.inventory.service import InventoryService


async def get_inventory_service(
    client: Annotated[AsyncClient, Depends(get_user_supabase_client)],
) -> InventoryService:
    return InventoryService(client)
