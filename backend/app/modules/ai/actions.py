from typing import Any

from postgrest.exceptions import APIError
from supabase import AsyncClient

from app.modules.ai.models import (
    InterpretedIntent,
    PendingActionCancellation,
    PendingActionConfirmation,
    PendingActionPreview,
    StockActionType,
)
from app.modules.auth.models import AuthenticatedUser
from app.modules.reporting.models import OperationalProductStock

PENDING_ACTION_COLUMNS = "id,status,expires_at"


class PendingActionNotFoundError(Exception):
    pass


class PendingActionConflictError(Exception):
    pass


class PendingActionExpiredError(Exception):
    pass


class PendingActionInsufficientStockError(Exception):
    pass


class PendingActionServiceError(Exception):
    pass


class PendingActionService:
    """Persists previews and invokes atomic database Confirm/Cancel operations."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def create(
        self,
        intent: InterpretedIntent,
        product: OperationalProductStock,
        user: AuthenticatedUser,
    ) -> PendingActionPreview:
        supplier_id = await self._resolve_supplier(intent.supplier)
        quantity = intent.quantity or 0
        action_type = intent.action_type or StockActionType.STOCK_IN
        delta = quantity if action_type is StockActionType.STOCK_IN else -quantity
        expected_stock = product.current_stock + delta
        if expected_stock < 0:
            raise PendingActionInsufficientStockError(
                "The requested change would make stock negative"
            )

        try:
            response = (
                await self._client.table("ai_pending_actions")
                .insert(
                    {
                        "product_id": product.id,
                        "movement_type": action_type.value,
                        "quantity": quantity,
                        "supplier_id": supplier_id,
                        "current_stock_at_preview": product.current_stock,
                        "expected_stock_at_preview": expected_stock,
                    }
                )
                .select(PENDING_ACTION_COLUMNS)
                .execute()
            )
        except APIError as exc:
            raise PendingActionServiceError(
                "Unable to create pending action"
            ) from exc
        rows: list[dict[str, Any]] = response.data or []
        if len(rows) != 1:
            raise PendingActionServiceError("Pending action creation returned no row")
        row = rows[0]
        return PendingActionPreview(
            id=str(row["id"]),
            status="pending_confirmation",
            action_type=action_type,
            product_id=product.id,
            product=product.name,
            sku=product.sku,
            quantity=quantity,
            supplier=intent.supplier,
            current_stock=product.current_stock,
            expected_stock_after=expected_stock,
            expires_at=row["expires_at"],
        )

    async def confirm(
        self,
        action_id: str,
        user: AuthenticatedUser,
    ) -> PendingActionConfirmation:
        try:
            response = await self._client.rpc(
                "confirm_ai_pending_action",
                {"p_action_id": action_id},
            ).execute()
        except APIError as exc:
            raise self._translate_error(exc) from exc
        rows: list[dict[str, Any]] = response.data or []
        if len(rows) != 1:
            raise PendingActionServiceError("Confirmation returned no result")
        row = rows[0]
        return PendingActionConfirmation(
            id=str(row["action_id"]),
            status=row["action_status"],
            movement_id=row["movement_id"],
            product_id=row["product_id"],
            final_stock=row["final_stock"],
        )

    async def cancel(
        self,
        action_id: str,
        user: AuthenticatedUser,
    ) -> PendingActionCancellation:
        try:
            response = await self._client.rpc(
                "cancel_ai_pending_action",
                {"p_action_id": action_id},
            ).execute()
        except APIError as exc:
            raise self._translate_error(exc) from exc
        rows: list[dict[str, Any]] = response.data or []
        if len(rows) != 1:
            raise PendingActionServiceError("Cancellation returned no result")
        row = rows[0]
        return PendingActionCancellation(
            id=str(row["action_id"]),
            status=row["action_status"],
        )

    async def _resolve_supplier(self, supplier_name: str | None) -> int | None:
        if supplier_name is None:
            return None
        try:
            response = (
                await self._client.table("suppliers")
                .select("id,name")
                .execute()
            )
        except APIError as exc:
            raise PendingActionServiceError("Supplier lookup failed") from exc
        rows: list[dict[str, Any]] = response.data or []
        exact = [
            row for row in rows
            if str(row["name"]).casefold() == supplier_name.casefold()
        ]
        if len(exact) != 1:
            raise PendingActionNotFoundError(
                f"Supplier '{supplier_name}' could not be uniquely identified"
            )
        return int(exact[0]["id"])

    @staticmethod
    def _translate_error(exc: APIError) -> Exception:
        message = exc.message.lower()
        if "not found" in message:
            return PendingActionNotFoundError("Pending action not found")
        if "expired" in message:
            return PendingActionExpiredError("Pending action has expired")
        if "already" in message:
            return PendingActionConflictError(exc.message)
        if exc.code == "23514" and "negative" in message:
            return PendingActionInsufficientStockError(
                "Insufficient stock at confirmation time"
            )
        if exc.code == "42501":
            return PendingActionNotFoundError("Pending action not found")
        return PendingActionServiceError("Pending action operation failed")
