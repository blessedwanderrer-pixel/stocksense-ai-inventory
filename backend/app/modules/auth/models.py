from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr


class UserRole(StrEnum):
    MANAGER = "manager"
    STAFF = "staff"


class AuthenticatedUser(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    email: str | None = None
    role: UserRole
    profile_created_at: datetime
    access_token: SecretStr = Field(exclude=True, repr=False)


class MeResponse(BaseModel):
    """Safe authenticated-user fields returned by the API."""

    id: UUID
    email: str | None = None
    role: UserRole
    profile_created_at: datetime
