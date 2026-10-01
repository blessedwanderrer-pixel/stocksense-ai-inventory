from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import AClientOptions, AsyncClient, acreate_client

from app.core.config import Settings, get_settings
from app.modules.auth.models import AuthenticatedUser, UserRole
from app.modules.auth.service import (
    AuthenticationServiceError,
    InvalidAccessTokenError,
    ProfileAccessError,
    SupabaseAuthService,
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_service(
    settings: Annotated[Settings, Depends(get_settings)],
) -> SupabaseAuthService:
    if settings.supabase_url is None or settings.supabase_publishable_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not configured",
        )

    return SupabaseAuthService(
        supabase_url=settings.supabase_url,
        publishable_key=settings.supabase_publishable_key.get_secret_value(),
    )


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    auth_service: Annotated[SupabaseAuthService, Depends(get_auth_service)],
) -> AuthenticatedUser:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        return await auth_service.authenticate(credentials.credentials)
    except InvalidAccessTokenError as exc:
        raise _unauthorized() from exc
    except ProfileAccessError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="StockSense profile access is required",
        ) from exc
    except AuthenticationServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable",
        ) from exc


async def get_user_supabase_client(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncClient:
    if settings.supabase_url is None or settings.supabase_publishable_key is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase data service is not configured",
        )

    access_token = user.access_token.get_secret_value()
    return await acreate_client(
        settings.supabase_url,
        settings.supabase_publishable_key.get_secret_value(),
        options=AClientOptions(
            headers={"Authorization": f"Bearer {access_token}"},
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


def require_roles(
    *allowed_roles: UserRole,
) -> Callable[..., AuthenticatedUser]:
    allowed = frozenset(allowed_roles)
    if not allowed:
        raise ValueError("At least one allowed role is required")

    async def role_dependency(
        current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> AuthenticatedUser:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role permissions",
            )
        return current_user

    return role_dependency


require_manager = require_roles(UserRole.MANAGER)
require_staff_or_manager = require_roles(UserRole.STAFF, UserRole.MANAGER)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
