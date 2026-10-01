from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StockMovementType(StrEnum):
    STOCK_IN = "stock_in"
    SALE = "sale"
    DAMAGED = "damaged"


class ProductCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category_id: int = Field(gt=0)
    sku: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None
    low_stock_threshold: int = Field(default=0, ge=0)
    selling_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    cost_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )


class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    category_id: int | None = Field(default=None, gt=0)
    sku: str | None = Field(default=None, min_length=1)
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    low_stock_threshold: int | None = Field(default=None, ge=0)
    selling_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    cost_price: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )

    @model_validator(mode="after")
    def require_a_change(self) -> "ProductUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one product field is required")
        if "cost_price" in self.model_fields_set and self.cost_price is None:
            raise ValueError("cost_price cannot be null")
        return self


class ProductResponse(BaseModel):
    id: int
    category_id: int
    sku: str
    name: str
    description: str | None
    current_stock: int
    low_stock_threshold: int
    selling_price: Decimal
    created_at: datetime
    cost_price: Decimal | None = None


class StockMovementCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: int = Field(gt=0)
    movement_type: StockMovementType
    quantity: int = Field(gt=0)
    supplier_id: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def supplier_is_only_for_stock_in(self) -> "StockMovementCreate":
        if (
            self.supplier_id is not None
            and self.movement_type is not StockMovementType.STOCK_IN
        ):
            raise ValueError("supplier_id is only valid for stock_in movements")
        return self


class MovementProduct(BaseModel):
    id: int
    sku: str
    name: str


class MovementUser(BaseModel):
    id: UUID


class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product: MovementProduct
    movement_type: StockMovementType
    quantity: int
    supplier_id: int | None
    performed_by: MovementUser
    occurred_at: datetime
