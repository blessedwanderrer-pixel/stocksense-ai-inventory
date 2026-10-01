from datetime import date, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AIIntentType(StrEnum):
    STOCK_LOOKUP = "stock_lookup"
    LOW_STOCK = "low_stock"
    BEST_SELLING = "best_selling"
    STOCK_CHANGE = "stock_change"
    FINANCIAL = "financial"
    UNSUPPORTED = "unsupported"


class DatePeriod(StrEnum):
    TODAY = "today"
    THIS_WEEK = "this_week"
    CUSTOM = "custom"


class StockActionType(StrEnum):
    STOCK_IN = "stock_in"
    SALE = "sale"
    DAMAGED = "damaged"


class InterpretedIntent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    intent: AIIntentType
    product_queries: list[str] = Field(default_factory=list, max_length=100)
    action_type: StockActionType | None = None
    quantity: int | None = None
    supplier: str | None = None
    period: DatePeriod | None = None
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("product_queries")
    @classmethod
    def normalize_queries(cls, values: list[str]) -> list[str]:
        return [value.strip() for value in values if value.strip()]

    @model_validator(mode="after")
    def validate_intent_fields(self) -> "InterpretedIntent":
        if self.intent is AIIntentType.STOCK_LOOKUP and not self.product_queries:
            raise ValueError("stock lookup requires at least one product")
        if self.intent is AIIntentType.STOCK_CHANGE:
            if len(self.product_queries) != 1:
                raise ValueError("stock change requires exactly one product")
            if self.action_type is None or self.quantity is None or self.quantity <= 0:
                raise ValueError("stock change requires an action and positive quantity")
        if self.period is DatePeriod.CUSTOM:
            if self.start_date is None or self.end_date is None:
                raise ValueError("custom period requires start_date and end_date")
            if self.end_date < self.start_date:
                raise ValueError("end_date must be on or after start_date")
        return self


class AIChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be empty")
        return value


class PendingActionPreview(BaseModel):
    id: str
    status: Literal["pending_confirmation"] = "pending_confirmation"
    action_type: StockActionType
    product_id: int
    product: str
    sku: str
    quantity: int
    supplier: str | None = None
    current_stock: int
    expected_stock_after: int
    expires_at: datetime
    required_response: Literal["Confirm or Cancel"] = "Confirm or Cancel"


class PendingActionConfirmation(BaseModel):
    id: str
    status: Literal["confirmed"]
    movement_id: int
    product_id: int
    final_stock: int


class PendingActionCancellation(BaseModel):
    id: str
    status: Literal["cancelled"]


class AIChatResponse(BaseModel):
    type: Literal["answer", "refusal", "pending_action"]
    message: str
    data: Any | None = None
    pending_action: PendingActionPreview | None = None
