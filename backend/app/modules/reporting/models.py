from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ReportDateRange(BaseModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def validate_order(self) -> "ReportDateRange":
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class InventorySummaryResponse(BaseModel):
    total_products: int
    total_units_in_stock: int
    low_stock_products: int
    out_of_stock_products: int


class OperationalProductStock(BaseModel):
    id: int
    sku: str
    name: str
    current_stock: int
    low_stock_threshold: int


class BestSellingProduct(BaseModel):
    product_id: int
    sku: str
    name: str
    total_quantity_sold: int


class ProductStockLookupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    queries: list[str] = Field(min_length=1, max_length=100)

    @field_validator("queries")
    @classmethod
    def normalize_queries(cls, values: list[str]) -> list[str]:
        normalized = [value.strip() for value in values]
        if any(not value for value in normalized):
            raise ValueError("Product lookup values cannot be empty")
        return normalized


class ProductStockLookupResult(BaseModel):
    query: str
    found: bool
    matches: list[OperationalProductStock]
