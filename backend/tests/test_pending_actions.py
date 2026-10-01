import unittest
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.router import api_router
from app.modules.ai.actions import (
    PendingActionConflictError,
    PendingActionExpiredError,
    PendingActionInsufficientStockError,
    PendingActionNotFoundError,
)
from app.modules.ai.dependencies import get_pending_action_service
from app.modules.ai.models import (
    InterpretedIntent,
    AIIntentType,
    PendingActionCancellation,
    PendingActionConfirmation,
    PendingActionPreview,
    StockActionType,
)
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.models import AuthenticatedUser, UserRole
from app.modules.auth.service import InvalidAccessTokenError
from app.modules.reporting.models import OperationalProductStock

OWNER_ID = UUID("60000000-0000-4000-8000-000000000001")
OTHER_ID = UUID("60000000-0000-4000-8000-000000000002")
NOW = datetime(2026, 9, 30, 16, 0, tzinfo=UTC)


class FakeAuthService:
    async def authenticate(self, access_token: str) -> AuthenticatedUser:
        if access_token == "owner-token":
            user_id = OWNER_ID
        elif access_token == "other-token":
            user_id = OTHER_ID
        else:
            raise InvalidAccessTokenError
        return AuthenticatedUser(
            id=user_id,
            email="staff@example.test",
            role=UserRole.STAFF,
            profile_created_at=NOW,
            access_token=SecretStr(access_token),
        )


class InMemoryPendingActionService:
    def __init__(self) -> None:
        self.stock = {1: 10}
        self.actions = {}
        self.history = []
        self.now = NOW

    async def create(self, intent, product, user):
        quantity = intent.quantity
        delta = quantity if intent.action_type is StockActionType.STOCK_IN else -quantity
        expected = self.stock[product.id] + delta
        if expected < 0:
            raise PendingActionInsufficientStockError
        action_id = str(uuid4())
        expires_at = self.now + timedelta(minutes=15)
        self.actions[action_id] = {
            "owner": user.id,
            "product_id": product.id,
            "movement_type": intent.action_type,
            "quantity": quantity,
            "supplier": intent.supplier,
            "status": "pending",
            "expires_at": expires_at,
        }
        return PendingActionPreview(
            id=action_id,
            action_type=intent.action_type,
            product_id=product.id,
            product=product.name,
            sku=product.sku,
            quantity=quantity,
            supplier=intent.supplier,
            current_stock=self.stock[product.id],
            expected_stock_after=expected,
            expires_at=expires_at,
        )

    async def confirm(self, action_id, user):
        action = self._owned_pending(action_id, user)
        delta = (
            action["quantity"]
            if action["movement_type"] is StockActionType.STOCK_IN
            else -action["quantity"]
        )
        final_stock = self.stock[action["product_id"]] + delta
        if final_stock < 0:
            raise PendingActionInsufficientStockError(
                "Insufficient stock at confirmation time"
            )
        movement_id = len(self.history) + 1
        self.stock[action["product_id"]] = final_stock
        self.history.append(
            {
                "id": movement_id,
                "product_id": action["product_id"],
                "movement_type": action["movement_type"],
                "quantity": action["quantity"],
                "performed_by": user.id,
            }
        )
        action["status"] = "confirmed"
        return PendingActionConfirmation(
            id=action_id,
            status="confirmed",
            movement_id=movement_id,
            product_id=action["product_id"],
            final_stock=final_stock,
        )

    async def cancel(self, action_id, user):
        action = self._owned_pending(action_id, user)
        action["status"] = "cancelled"
        return PendingActionCancellation(id=action_id, status="cancelled")

    def _owned_pending(self, action_id, user):
        action = self.actions.get(action_id)
        if action is None or action["owner"] != user.id:
            raise PendingActionNotFoundError("Pending action not found")
        if action["status"] != "pending":
            raise PendingActionConflictError(
                f"Pending action is already {action['status']}"
            )
        if action["expires_at"] <= self.now:
            raise PendingActionExpiredError("Pending action has expired")
        return action


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class PendingActionEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pending = InMemoryPendingActionService()
        app = FastAPI()
        app.include_router(api_router)
        app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
        app.dependency_overrides[get_pending_action_service] = lambda: self.pending
        self.client = TestClient(app)
        self.owner = self._user(OWNER_ID)
        self.product = OperationalProductStock(
            id=1,
            sku="TYPE-C-1",
            name="Type-C Cable",
            current_stock=10,
            low_stock_threshold=2,
        )

    @staticmethod
    def _user(user_id: UUID) -> AuthenticatedUser:
        return AuthenticatedUser(
            id=user_id,
            email="staff@example.test",
            role=UserRole.STAFF,
            profile_created_at=NOW,
            access_token=SecretStr("test-token"),
        )

    def _preview(self, action_type=StockActionType.STOCK_IN, quantity=4):
        intent = InterpretedIntent(
            intent=AIIntentType.STOCK_CHANGE,
            product_queries=["Type-C Cable"],
            action_type=action_type,
            quantity=quantity,
            supplier="Ali Traders" if action_type is StockActionType.STOCK_IN else None,
        )
        import asyncio
        return asyncio.run(self.pending.create(intent, self.product, self.owner))

    def test_preview_creates_no_stock_change(self) -> None:
        preview = self._preview()

        self.assertEqual(self.pending.stock[1], 10)
        self.assertEqual(self.pending.history, [])
        self.assertEqual(preview.expected_stock_after, 14)

    def test_cancel_creates_no_stock_change(self) -> None:
        preview = self._preview()
        response = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/cancel",
            headers=auth("owner-token"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "cancelled")
        self.assertEqual(self.pending.stock[1], 10)
        self.assertEqual(self.pending.history, [])

    def test_confirm_changes_stock_correctly(self) -> None:
        preview = self._preview()
        response = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["final_stock"], 14)
        self.assertEqual(self.pending.stock[1], 14)

    def test_confirm_creates_stock_history(self) -> None:
        preview = self._preview(StockActionType.SALE, 3)
        self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(len(self.pending.history), 1)
        self.assertEqual(self.pending.history[0]["movement_type"], StockActionType.SALE)
        self.assertEqual(self.pending.history[0]["quantity"], 3)

    def test_authenticated_user_is_recorded(self) -> None:
        preview = self._preview()
        self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(self.pending.history[0]["performed_by"], OWNER_ID)

    def test_repeated_confirm_does_not_double_apply(self) -> None:
        preview = self._preview()
        first = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )
        second = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 409)
        self.assertEqual(self.pending.stock[1], 14)
        self.assertEqual(len(self.pending.history), 1)

    def test_cancelled_action_cannot_be_confirmed(self) -> None:
        preview = self._preview()
        self.client.post(
            f"/api/ai/pending-actions/{preview.id}/cancel",
            headers=auth("owner-token"),
        )
        response = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.pending.stock[1], 10)

    def test_expired_action_cannot_be_confirmed(self) -> None:
        preview = self._preview()
        self.pending.now += timedelta(minutes=16)
        response = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(response.status_code, 410)
        self.assertEqual(self.pending.stock[1], 10)

    def test_another_user_cannot_confirm_action(self) -> None:
        preview = self._preview()
        response = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("other-token"),
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.pending.stock[1], 10)

    def test_changed_stock_is_revalidated_at_confirm(self) -> None:
        preview = self._preview(StockActionType.SALE, 4)
        self.pending.stock[1] = 8
        response = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["final_stock"], 4)
        self.assertNotEqual(response.json()["final_stock"], preview.expected_stock_after)

    def test_insufficient_stock_at_confirm_leaves_stock_unchanged(self) -> None:
        preview = self._preview(StockActionType.DAMAGED, 6)
        self.pending.stock[1] = 2
        response = self.client.post(
            f"/api/ai/pending-actions/{preview.id}/confirm",
            headers=auth("owner-token"),
        )

        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.pending.stock[1], 2)
        self.assertEqual(self.pending.history, [])
        self.assertEqual(self.pending.actions[preview.id]["status"], "pending")


if __name__ == "__main__":
    unittest.main()
