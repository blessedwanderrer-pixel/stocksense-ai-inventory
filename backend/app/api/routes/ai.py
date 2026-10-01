from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.modules.ai.actions import (
    PendingActionConflictError,
    PendingActionExpiredError,
    PendingActionInsufficientStockError,
    PendingActionNotFoundError,
    PendingActionService,
    PendingActionServiceError,
)
from app.modules.ai.dependencies import get_ai_chat_service, get_pending_action_service
from app.modules.ai.models import (
    AIChatRequest,
    AIChatResponse,
    PendingActionCancellation,
    PendingActionConfirmation,
)
from app.modules.ai.service import AIAssistantUnavailable, AIChatService
from app.modules.auth.dependencies import require_staff_or_manager
from app.modules.auth.models import AuthenticatedUser
from app.modules.reporting.service import ReportingAccessError, ReportingServiceError

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=AIChatResponse)
async def chat(
    payload: AIChatRequest,
    user: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[AIChatService, Depends(get_ai_chat_service)],
) -> AIChatResponse:
    try:
        return await service.chat(payload.message, user)
    except AIAssistantUnavailable as exc:
        raise HTTPException(
            status_code=503,
            detail="AI assistant is temporarily unavailable",
        ) from exc
    except ReportingAccessError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ReportingServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail="Inventory data is temporarily unavailable",
        ) from exc
    except PendingActionServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail="Pending action service is temporarily unavailable",
        ) from exc


@router.post(
    "/pending-actions/{action_id}/confirm",
    response_model=PendingActionConfirmation,
)
async def confirm_pending_action(
    action_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[PendingActionService, Depends(get_pending_action_service)],
) -> PendingActionConfirmation:
    try:
        return await service.confirm(str(action_id), user)
    except PendingActionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PendingActionExpiredError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc
    except (PendingActionConflictError, PendingActionInsufficientStockError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PendingActionServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail="Pending action service is temporarily unavailable",
        ) from exc


@router.post(
    "/pending-actions/{action_id}/cancel",
    response_model=PendingActionCancellation,
)
async def cancel_pending_action(
    action_id: UUID,
    user: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[PendingActionService, Depends(get_pending_action_service)],
) -> PendingActionCancellation:
    try:
        return await service.cancel(str(action_id), user)
    except PendingActionNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PendingActionExpiredError as exc:
        raise HTTPException(status_code=410, detail=str(exc)) from exc
    except PendingActionConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PendingActionServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail="Pending action service is temporarily unavailable",
        ) from exc
