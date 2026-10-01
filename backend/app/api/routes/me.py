from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import AuthenticatedUser, MeResponse

router = APIRouter(prefix="/api", tags=["authentication"])


@router.get("/me", response_model=MeResponse)
async def get_me(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> MeResponse:
    return MeResponse(**current_user.model_dump())
