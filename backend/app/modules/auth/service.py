from collections.abc import Awaitable, Callable
from typing import Any

from postgrest.exceptions import APIError
from supabase import AClientOptions, AsyncClient, acreate_client
from supabase_auth.errors import AuthError, AuthRetryableError

from app.modules.auth.models import AuthenticatedUser, UserRole

AsyncClientFactory = Callable[..., Awaitable[AsyncClient]]


class InvalidAccessTokenError(Exception):
    """The supplied access token is absent, invalid, or expired."""


class ProfileAccessError(Exception):
    """The authenticated user has no authorized StockSense profile."""


class AuthenticationServiceError(Exception):
    """Supabase Auth or the Data API could not complete the request."""


class SupabaseAuthService:
    def __init__(
        self,
        supabase_url: str,
        publishable_key: str,
        client_factory: AsyncClientFactory = acreate_client,
    ) -> None:
        self._supabase_url = supabase_url.rstrip("/")
        self._publishable_key = publishable_key
        self._client_factory = client_factory

    async def authenticate(self, access_token: str) -> AuthenticatedUser:
        options = AClientOptions(
            headers={"Authorization": f"Bearer {access_token}"},
            auto_refresh_token=False,
            persist_session=False,
        )

        try:
            client = await self._client_factory(
                self._supabase_url,
                self._publishable_key,
                options=options,
            )
            user_response = await client.auth.get_user(access_token)
        except AuthRetryableError as exc:
            raise AuthenticationServiceError from exc
        except AuthError as exc:
            raise InvalidAccessTokenError from exc

        user = user_response.user
        if user is None:
            raise InvalidAccessTokenError

        try:
            profile_response = (
                await client.table("profiles")
                .select("id,role,created_at")
                .eq("id", str(user.id))
                .limit(1)
                .execute()
            )
        except APIError as exc:
            raise AuthenticationServiceError from exc

        profiles: list[dict[str, Any]] = profile_response.data or []
        if len(profiles) != 1:
            raise ProfileAccessError

        profile = profiles[0]
        try:
            role = UserRole(profile["role"])
            return AuthenticatedUser(
                id=user.id,
                email=user.email,
                role=role,
                profile_created_at=profile["created_at"],
                access_token=access_token,
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise ProfileAccessError from exc
