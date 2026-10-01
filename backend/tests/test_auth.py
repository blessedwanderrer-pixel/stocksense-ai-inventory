import asyncio
import unittest
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr
from supabase_auth.errors import AuthInvalidJwtError

from app.api.router import api_router
from app.modules.auth.dependencies import (
    get_auth_service,
    require_manager,
    require_staff_or_manager,
)
from app.modules.auth.models import AuthenticatedUser, UserRole
from app.modules.auth.service import (
    InvalidAccessTokenError,
    ProfileAccessError,
    SupabaseAuthService,
)

MANAGER_ID = UUID("10000000-0000-4000-8000-000000000001")
STAFF_ID = UUID("10000000-0000-4000-8000-000000000002")
CREATED_AT = datetime(2026, 9, 30, 12, 0, tzinfo=UTC)


class FakeAuthService:
    async def authenticate(self, access_token: str) -> AuthenticatedUser:
        if access_token == "manager-token":
            return AuthenticatedUser(
                id=MANAGER_ID,
                email="manager@example.test",
                role=UserRole.MANAGER,
                profile_created_at=CREATED_AT,
                access_token=SecretStr(access_token),
            )
        if access_token == "staff-token":
            return AuthenticatedUser(
                id=STAFF_ID,
                email="staff@example.test",
                role=UserRole.STAFF,
                profile_created_at=CREATED_AT,
                access_token=SecretStr(access_token),
            )
        if access_token == "missing-profile-token":
            raise ProfileAccessError
        raise InvalidAccessTokenError


def create_test_app() -> FastAPI:
    test_app = FastAPI()
    test_app.include_router(api_router)

    @test_app.get("/test/manager")
    async def manager_only(
        user: AuthenticatedUser = Depends(require_manager),
    ) -> dict[str, str]:
        return {"role": user.role.value}

    @test_app.get("/test/authenticated")
    async def staff_or_manager(
        user: AuthenticatedUser = Depends(require_staff_or_manager),
    ) -> dict[str, str]:
        return {"role": user.role.value}

    test_app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
    return test_app


class AuthenticationEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(create_test_app())

    def test_me_requires_bearer_token(self) -> None:
        response = self.client.get("/api/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

    def test_me_rejects_invalid_token(self) -> None:
        response = self.client.get(
            "/api/me",
            headers={"Authorization": "Bearer invalid-token"},
        )

        self.assertEqual(response.status_code, 401)

    def test_me_rejects_non_bearer_authorization(self) -> None:
        response = self.client.get(
            "/api/me",
            headers={"Authorization": "Basic dXNlcjpwYXNz"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

    def test_me_rejects_authenticated_user_without_profile(self) -> None:
        response = self.client.get(
            "/api/me",
            headers={"Authorization": "Bearer missing-profile-token"},
        )

        self.assertEqual(response.status_code, 403)

    def test_me_returns_only_safe_manager_fields(self) -> None:
        response = self.client.get(
            "/api/me",
            headers={"Authorization": "Bearer manager-token"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.json()),
            {"id", "email", "role", "profile_created_at"},
        )
        self.assertEqual(response.json()["role"], "manager")
        self.assertNotIn("access_token", response.json())
        self.assertNotIn("user_metadata", response.json())

    def test_staff_is_forbidden_from_manager_dependency(self) -> None:
        response = self.client.get(
            "/test/manager",
            headers={"Authorization": "Bearer staff-token"},
        )

        self.assertEqual(response.status_code, 403)

    def test_manager_passes_manager_dependency(self) -> None:
        response = self.client.get(
            "/test/manager",
            headers={"Authorization": "Bearer manager-token"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"role": "manager"})

    def test_staff_passes_shared_authenticated_dependency(self) -> None:
        response = self.client.get(
            "/test/authenticated",
            headers={"Authorization": "Bearer staff-token"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"role": "staff"})


class FakeQuery:
    def __init__(self, data: list[dict[str, str]]) -> None:
        self.data = data
        self.selected_columns: str | None = None
        self.filters: list[tuple[str, str]] = []
        self.limit_value: int | None = None

    def select(self, columns: str) -> "FakeQuery":
        self.selected_columns = columns
        return self

    def eq(self, column: str, value: str) -> "FakeQuery":
        self.filters.append((column, value))
        return self

    def limit(self, value: int) -> "FakeQuery":
        self.limit_value = value
        return self

    async def execute(self) -> SimpleNamespace:
        return SimpleNamespace(data=self.data)


class FakeSupabaseClient:
    def __init__(
        self,
        profile_data: list[dict[str, str]],
        auth_error: Exception | None = None,
    ) -> None:
        self.query = FakeQuery(profile_data)
        self.requested_table: str | None = None
        self.auth = self.FakeAuth(auth_error)

    class FakeAuth:
        def __init__(self, auth_error: Exception | None) -> None:
            self.auth_error = auth_error
            self.received_token: str | None = None

        async def get_user(self, token: str) -> SimpleNamespace:
            self.received_token = token
            if self.auth_error is not None:
                raise self.auth_error
            return SimpleNamespace(
                user=SimpleNamespace(
                    id=STAFF_ID,
                    email="staff@example.test",
                )
            )

    def table(self, table_name: str) -> FakeQuery:
        self.requested_table = table_name
        return self.query


class SupabaseAuthServiceTests(unittest.TestCase):
    def test_service_verifies_token_and_loads_profile_with_user_context(self) -> None:
        fake_client = FakeSupabaseClient(
            profile_data=[
                {
                    "id": str(STAFF_ID),
                    "role": "staff",
                    "created_at": CREATED_AT.isoformat(),
                }
            ]
        )
        captured_options = None

        async def client_factory(url: str, key: str, options: object) -> object:
            nonlocal captured_options
            captured_options = options
            self.assertEqual(url, "https://project.supabase.co")
            self.assertEqual(key, "publishable-test-key")
            return fake_client

        service = SupabaseAuthService(
            "https://project.supabase.co/",
            "publishable-test-key",
            client_factory=client_factory,
        )
        result = asyncio.run(service.authenticate("verified-token"))

        self.assertEqual(result.role, UserRole.STAFF)
        self.assertNotIn("access_token", result.model_dump())
        self.assertEqual(fake_client.auth.received_token, "verified-token")
        self.assertEqual(fake_client.requested_table, "profiles")
        self.assertEqual(fake_client.query.selected_columns, "id,role,created_at")
        self.assertEqual(fake_client.query.filters, [("id", str(STAFF_ID))])
        self.assertEqual(fake_client.query.limit_value, 1)
        self.assertEqual(
            captured_options.headers["Authorization"],
            "Bearer verified-token",
        )

    def test_service_rejects_supabase_invalid_jwt(self) -> None:
        fake_client = FakeSupabaseClient(
            profile_data=[],
            auth_error=AuthInvalidJwtError("invalid JWT"),
        )

        async def client_factory(*args: object, **kwargs: object) -> object:
            return fake_client

        service = SupabaseAuthService(
            "https://project.supabase.co",
            "publishable-test-key",
            client_factory=client_factory,
        )

        with self.assertRaises(InvalidAccessTokenError):
            asyncio.run(service.authenticate("invalid-token"))

    def test_service_rejects_missing_or_unknown_profile_role(self) -> None:
        scenarios = (
            [],
            [
                {
                    "id": str(STAFF_ID),
                    "role": "administrator",
                    "created_at": CREATED_AT.isoformat(),
                }
            ],
        )

        for profile_data in scenarios:
            with self.subTest(profile_data=profile_data):
                fake_client = FakeSupabaseClient(profile_data=profile_data)

                async def client_factory(*args: object, **kwargs: object) -> object:
                    return fake_client

                service = SupabaseAuthService(
                    "https://project.supabase.co",
                    "publishable-test-key",
                    client_factory=client_factory,
                )

                with self.assertRaises(ProfileAccessError):
                    asyncio.run(service.authenticate("verified-token"))


if __name__ == "__main__":
    unittest.main()
