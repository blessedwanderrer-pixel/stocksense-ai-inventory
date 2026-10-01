from typing import Annotated

from fastapi import Depends, HTTPException
from supabase import AsyncClient

from app.core.config import Settings, get_settings
from app.modules.ai.actions import PendingActionService
from app.modules.ai.interpreter import GroqIntentInterpreter
from app.modules.ai.service import AIChatService
from app.modules.auth.dependencies import get_user_supabase_client
from app.modules.reporting.dependencies import get_reporting_service
from app.modules.reporting.service import ReportingService


def get_groq_interpreter(
    settings: Annotated[Settings, Depends(get_settings)],
) -> GroqIntentInterpreter:
    if settings.groq_api_key is None:
        raise HTTPException(
            status_code=503,
            detail="AI assistant is not configured",
        )
    return GroqIntentInterpreter(
        api_key=settings.groq_api_key.get_secret_value(),
        model=settings.groq_model,
        timeout_seconds=settings.groq_timeout_seconds,
    )


def get_pending_action_service(
    client: Annotated[AsyncClient, Depends(get_user_supabase_client)],
) -> PendingActionService:
    return PendingActionService(client)


def get_ai_chat_service(
    interpreter: Annotated[GroqIntentInterpreter, Depends(get_groq_interpreter)],
    reporting: Annotated[ReportingService, Depends(get_reporting_service)],
    pending_actions: Annotated[
        PendingActionService,
        Depends(get_pending_action_service),
    ],
) -> AIChatService:
    return AIChatService(interpreter, reporting, pending_actions)
