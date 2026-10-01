import unittest
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.router import api_router
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.models import AuthenticatedUser, UserRole
from app.modules.auth.service import InvalidAccessTokenError
from app.modules.inventory.dependencies import get_inventory_service
from app.modules.inventory.models import (
    MovementProduct,
    MovementUser,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    StockMovementCreate,
    StockMovementResponse,
    StockMovementType,
)
from app.modules.inventory.service import InsufficientStockError, InventoryNotFoundError

MANAGER_ID = UUID("20000000-0000-4000-8000-000000000001")
STAFF_ID = UUID("20000000-0000-4000-8000-000000000002")
NOW = datetime(2026, 9, 30, 15, 0, tzinfo=UTC)


class FakeAuthService:
    async def authenticate(self, access_token: str) -> AuthenticatedUser:
        if access_token == "manager-token":
            role = UserRole.MANAGER
            user_id = MANAGER_ID
        elif access_token == "staff-token":
            role = UserRole.STAFF
            user_id = STAFF_ID
        else:
            raise InvalidAccessTokenError
        return AuthenticatedUser(
            id=user_id,
            email=f"{role.value}@example.test",
            role=role,
            profile_created_at=NOW,
            access_token=SecretStr(access_token),
        )


class InMemoryInventoryService:
    def __init__(self) -> None:
        self.products: dict[int, ProductResponse] = {
            1: ProductResponse(
                id=1,
                category_id=1,
                sku="LOW-001",
                name="Low Stock Product",
                description=None,
                current_stock=2,
                low_stock_threshold=2,
                selling_price=Decimal("12.00"),
                cost_price=Decimal("7.00"),
                created_at=NOW,
            ),
            2: ProductResponse(
                id=2,
                category_id=1,
                sku="OK-001",
                name="In Stock Product",
                description=None,
                current_stock=10,
                low_stock_threshold=2,
                selling_price=Decimal("20.00"),
                cost_price=Decimal("11.00"),
                created_at=NOW,
            ),
        }
        self.movements: list[StockMovementResponse] = []
        self.next_product_id = 3
        self.next_movement_id = 1

    async def list_products(
        self,
        user: AuthenticatedUser,
        *,
        low_stock_only: bool = False,
    ) -> list[ProductResponse]:
        products = list(self.products.values())
        if low_stock_only:
            products = [
                product
                for product in products
                if product.current_stock <= product.low_stock_threshold
            ]
        return [self._visible_product(product, user) for product in products]

    async def get_product(
        self,
        product_id: int,
        user: AuthenticatedUser,
    ) -> ProductResponse:
        product = self.products.get(product_id)
        if product is None:
            raise InventoryNotFoundError("Product not found")
        return self._visible_product(product, user)

    async def create_product(
        self,
        payload: ProductCreate,
        user: AuthenticatedUser,
    ) -> ProductResponse:
        product = ProductResponse(
            id=self.next_product_id,
            current_stock=0,
            created_at=NOW,
            **payload.model_dump(),
        )
        self.products[product.id] = product
        self.next_product_id += 1
        return self._visible_product(product, user)

    async def update_product(
        self,
        product_id: int,
        payload: ProductUpdate,
        user: AuthenticatedUser,
    ) -> ProductResponse:
        product = self.products.get(product_id)
        if product is None:
            raise InventoryNotFoundError("Product not found")
        updated = product.model_copy(
            update=payload.model_dump(exclude_unset=True)
        )
        self.products[product_id] = updated
        return self._visible_product(updated, user)

    async def create_stock_movement(
        self,
        payload: StockMovementCreate,
        user: AuthenticatedUser,
    ) -> StockMovementResponse:
        product = self.products.get(payload.product_id)
        if product is None:
            raise InventoryNotFoundError("Product not found")
        delta = (
            payload.quantity
            if payload.movement_type is StockMovementType.STOCK_IN
            else -payload.quantity
        )
        new_stock = product.current_stock + delta
        if new_stock < 0:
            raise InsufficientStockError("Insufficient stock for this movement")

        self.products[product.id] = product.model_copy(
            update={"current_stock": new_stock}
        )
        movement = StockMovementResponse(
            id=self.next_movement_id,
            product_id=product.id,
            product=MovementProduct(
                id=product.id,
                sku=product.sku,
                name=product.name,
            ),
            movement_type=payload.movement_type,
            quantity=payload.quantity,
            supplier_id=payload.supplier_id,
            performed_by=MovementUser(id=user.id),
            occurred_at=NOW,
        )
        self.movements.append(movement)
        self.next_movement_id += 1
        return movement

    async def list_stock_movements(self) -> list[StockMovementResponse]:
        return list(reversed(self.movements))

    @staticmethod
    def _visible_product(
        product: ProductResponse,
        user: AuthenticatedUser,
    ) -> ProductResponse:
        if user.role is UserRole.MANAGER:
            return product
        return product.model_copy(update={"cost_price": None})


def authorization(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class InventoryEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.inventory = InMemoryInventoryService()
        app = FastAPI()
        app.include_router(api_router)
        app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
        app.dependency_overrides[get_inventory_service] = lambda: self.inventory
        self.client = TestClient(app)

    def test_product_listing_and_staff_cost_isolation(self) -> None:
        staff_response = self.client.get(
            "/api/products", headers=authorization("staff-token")
        )
        manager_response = self.client.get(
            "/api/products", headers=authorization("manager-token")
        )

        self.assertEqual(staff_response.status_code, 200)
        self.assertEqual(len(staff_response.json()), 2)
        self.assertTrue(
            all("cost_price" not in product for product in staff_response.json())
        )
        self.assertEqual(manager_response.json()[0]["cost_price"], "7.00")

    def test_product_detail_returns_stock_fields(self) -> None:
        response = self.client.get(
            "/api/products/1", headers=authorization("staff-token")
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["current_stock"], 2)
        self.assertEqual(response.json()["low_stock_threshold"], 2)
        self.assertNotIn("cost_price", response.json())

    def test_staff_cannot_create_or_update_products(self) -> None:
        create_response = self.client.post(
            "/api/products",
            headers=authorization("staff-token"),
            json={
                "category_id": 1,
                "sku": "NEW-001",
                "name": "New Product",
                "low_stock_threshold": 1,
                "selling_price": "9.00",
            },
        )
        update_response = self.client.patch(
            "/api/products/1",
            headers=authorization("staff-token"),
            json={"name": "Changed"},
        )

        self.assertEqual(create_response.status_code, 403)
        self.assertEqual(update_response.status_code, 403)

    def test_manager_can_create_and_update_product(self) -> None:
        create_response = self.client.post(
            "/api/products",
            headers=authorization("manager-token"),
            json={
                "category_id": 1,
                "sku": "NEW-001",
                "name": "New Product",
                "low_stock_threshold": 3,
                "selling_price": "9.00",
                "cost_price": "4.00",
            },
        )
        product_id = create_response.json()["id"]
        update_response = self.client.patch(
            f"/api/products/{product_id}",
            headers=authorization("manager-token"),
            json={"name": "Updated Product", "cost_price": "4.50"},
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.json()["current_stock"], 0)
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["name"], "Updated Product")
        self.assertEqual(update_response.json()["cost_price"], "4.50")

    def test_stock_in_increases_stock(self) -> None:
        response = self._movement("stock_in", 5, supplier_id=1)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.inventory.products[1].current_stock, 7)

    def test_sale_decreases_stock(self) -> None:
        response = self._movement("sale", 2)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.inventory.products[1].current_stock, 0)

    def test_damaged_stock_decreases_stock(self) -> None:
        response = self._movement("damaged", 1)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.inventory.products[1].current_stock, 1)

    def test_overselling_returns_conflict_and_preserves_stock(self) -> None:
        stock_before = self.inventory.products[1].current_stock
        response = self._movement("sale", stock_before + 1)

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "Insufficient stock for this movement")
        self.assertEqual(self.inventory.products[1].current_stock, stock_before)
        self.assertEqual(self.inventory.movements, [])

    def test_history_contains_product_timestamp_and_safe_user(self) -> None:
        self._movement("stock_in", 3)
        response = self.client.get(
            "/api/stock-movements",
            headers=authorization("staff-token"),
        )

        self.assertEqual(response.status_code, 200)
        movement = response.json()[0]
        self.assertEqual(movement["product"]["sku"], "LOW-001")
        self.assertEqual(movement["movement_type"], "stock_in")
        self.assertEqual(movement["quantity"], 3)
        self.assertIn("occurred_at", movement)
        self.assertEqual(movement["performed_by"], {"id": str(STAFF_ID)})

    def test_movement_user_attribution_cannot_be_supplied_by_client(self) -> None:
        malicious_response = self.client.post(
            "/api/stock-movements",
            headers=authorization("staff-token"),
            json={
                "product_id": 1,
                "movement_type": "stock_in",
                "quantity": 1,
                "performed_by": str(MANAGER_ID),
                "occurred_at": "2000-01-01T00:00:00Z",
            },
        )
        valid_response = self._movement("stock_in", 1)

        self.assertEqual(malicious_response.status_code, 422)
        self.assertEqual(
            valid_response.json()["performed_by"],
            {"id": str(STAFF_ID)},
        )

    def test_low_stock_detection(self) -> None:
        response = self.client.get(
            "/api/products/low-stock",
            headers=authorization("staff-token"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([product["id"] for product in response.json()], [1])
        self.assertNotIn("cost_price", response.json()[0])

    def test_quantity_must_be_positive(self) -> None:
        response = self._movement("stock_in", 0)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.inventory.products[1].current_stock, 2)

    def _movement(
        self,
        movement_type: str,
        quantity: int,
        supplier_id: int | None = None,
    ):
        payload = {
            "product_id": 1,
            "movement_type": movement_type,
            "quantity": quantity,
        }
        if supplier_id is not None:
            payload["supplier_id"] = supplier_id
        return self.client.post(
            "/api/stock-movements",
            headers=authorization("staff-token"),
            json=payload,
        )


if __name__ == "__main__":
    unittest.main()

