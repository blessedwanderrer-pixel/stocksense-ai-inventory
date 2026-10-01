from decimal import Decimal
from typing import Any

from postgrest.exceptions import APIError
from supabase import AsyncClient

from app.modules.auth.models import AuthenticatedUser, UserRole
from app.modules.inventory.models import (
    MovementProduct,
    MovementUser,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    StockMovementCreate,
    StockMovementResponse,
)

PRODUCT_COLUMNS = (
    "id,category_id,sku,name,description,current_stock,"
    "low_stock_threshold,selling_price,created_at"
)
MOVEMENT_COLUMNS = (
    "id,product_id,movement_type,quantity,supplier_id,performed_by,"
    "occurred_at,products(id,sku,name)"
)


class InventoryNotFoundError(Exception):
    pass


class InventoryConflictError(Exception):
    pass


class InsufficientStockError(Exception):
    pass


class InventoryAccessError(Exception):
    pass


class InventoryServiceError(Exception):
    pass


class InventoryService:
    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def list_products(
        self,
        user: AuthenticatedUser,
        *,
        low_stock_only: bool = False,
    ) -> list[ProductResponse]:
        try:
            response = (
                await self._client.table("products")
                .select(PRODUCT_COLUMNS)
                .order("name")
                .execute()
            )
            rows: list[dict[str, Any]] = response.data or []
            if low_stock_only:
                rows = [
                    row
                    for row in rows
                    if row["current_stock"] <= row["low_stock_threshold"]
                ]
            costs = await self._load_costs(user, [row["id"] for row in rows])
            return [self._product_from_row(row, costs.get(row["id"])) for row in rows]
        except APIError as exc:
            raise self._translate_error(exc) from exc

    async def get_product(
        self,
        product_id: int,
        user: AuthenticatedUser,
    ) -> ProductResponse:
        try:
            response = (
                await self._client.table("products")
                .select(PRODUCT_COLUMNS)
                .eq("id", product_id)
                .limit(1)
                .execute()
            )
            rows: list[dict[str, Any]] = response.data or []
            if len(rows) != 1:
                raise InventoryNotFoundError("Product not found")
            costs = await self._load_costs(user, [product_id])
            return self._product_from_row(rows[0], costs.get(product_id))
        except APIError as exc:
            raise self._translate_error(exc) from exc

    async def create_product(
        self,
        payload: ProductCreate,
        user: AuthenticatedUser,
    ) -> ProductResponse:
        product_data = payload.model_dump(exclude={"cost_price"}, mode="json")
        try:
            response = (
                await self._client.table("products")
                .insert(product_data)
                .execute()
            )
            rows: list[dict[str, Any]] = response.data or []
            if len(rows) != 1:
                raise InventoryServiceError("Product creation returned no row")
            row = rows[0]

            if payload.cost_price is not None:
                try:
                    await self._client.table("product_financials").insert(
                        {
                            "product_id": row["id"],
                            "cost_price": str(payload.cost_price),
                        }
                    ).execute()
                except APIError:
                    await self._client.table("products").delete().eq(
                        "id", row["id"]
                    ).execute()
                    raise

            return self._product_from_row(row, payload.cost_price)
        except APIError as exc:
            raise self._translate_error(exc) from exc

    async def update_product(
        self,
        product_id: int,
        payload: ProductUpdate,
        user: AuthenticatedUser,
    ) -> ProductResponse:
        changes = payload.model_dump(
            exclude={"cost_price"},
            exclude_unset=True,
            mode="json",
        )
        try:
            if changes:
                response = (
                    await self._client.table("products")
                    .update(changes)
                    .eq("id", product_id)
                    .execute()
                )
                if not response.data:
                    raise InventoryNotFoundError("Product not found")
            else:
                await self.get_product(product_id, user)

            if "cost_price" in payload.model_fields_set:
                await self._client.table("product_financials").upsert(
                    {
                        "product_id": product_id,
                        "cost_price": str(payload.cost_price),
                    },
                    on_conflict="product_id",
                ).execute()

            return await self.get_product(product_id, user)
        except APIError as exc:
            raise self._translate_error(exc) from exc

    async def create_stock_movement(
        self,
        payload: StockMovementCreate,
        user: AuthenticatedUser,
    ) -> StockMovementResponse:
        await self.get_product(payload.product_id, user)
        movement_data = payload.model_dump(mode="json")
        try:
            response = (
                await self._client.table("stock_movements")
                .insert(movement_data)
                .select(MOVEMENT_COLUMNS)
                .execute()
            )
            rows: list[dict[str, Any]] = response.data or []
            if len(rows) != 1:
                raise InventoryServiceError("Movement creation returned no row")
            return self._movement_from_row(rows[0])
        except APIError as exc:
            if exc.code == "23514" and "negative" in exc.message.lower():
                raise InsufficientStockError(
                    "Insufficient stock for this movement"
                ) from exc
            raise self._translate_error(exc) from exc

    async def list_stock_movements(self) -> list[StockMovementResponse]:
        try:
            response = (
                await self._client.table("stock_movements")
                .select(MOVEMENT_COLUMNS)
                .order("occurred_at", desc=True)
                .execute()
            )
            return [
                self._movement_from_row(row)
                for row in (response.data or [])
            ]
        except APIError as exc:
            raise self._translate_error(exc) from exc

    async def _load_costs(
        self,
        user: AuthenticatedUser,
        product_ids: list[int],
    ) -> dict[int, Decimal]:
        if user.role is not UserRole.MANAGER or not product_ids:
            return {}
        response = (
            await self._client.table("product_financials")
            .select("product_id,cost_price")
            .in_("product_id", product_ids)
            .execute()
        )
        return {
            row["product_id"]: Decimal(str(row["cost_price"]))
            for row in (response.data or [])
        }

    @staticmethod
    def _product_from_row(
        row: dict[str, Any],
        cost_price: Decimal | None,
    ) -> ProductResponse:
        return ProductResponse(**row, cost_price=cost_price)

    @staticmethod
    def _movement_from_row(row: dict[str, Any]) -> StockMovementResponse:
        product = row.get("products")
        if not isinstance(product, dict):
            raise InventoryServiceError("Movement product data is unavailable")
        return StockMovementResponse(
            id=row["id"],
            product_id=row["product_id"],
            product=MovementProduct(**product),
            movement_type=row["movement_type"],
            quantity=row["quantity"],
            supplier_id=row.get("supplier_id"),
            performed_by=MovementUser(id=row["performed_by"]),
            occurred_at=row["occurred_at"],
        )

    @staticmethod
    def _translate_error(exc: APIError) -> Exception:
        if exc.code == "42501":
            return InventoryAccessError("Database policy denied this operation")
        if exc.code in {"23503", "23505"}:
            return InventoryConflictError(exc.message)
        return InventoryServiceError("Supabase inventory operation failed")

