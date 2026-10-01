import asyncio
import unittest
from copy import deepcopy
from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.router import api_router
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.models import AuthenticatedUser, UserRole
from app.modules.auth.service import InvalidAccessTokenError
from app.modules.reporting.dependencies import get_reporting_service
from app.modules.reporting.models import ReportDateRange
from app.modules.reporting.service import ReportingService

STAFF_ID = UUID("30000000-0000-4000-8000-000000000001")


class FakeAuthService:
    async def authenticate(self, access_token: str) -> AuthenticatedUser:
        if access_token != "staff-token":
            raise InvalidAccessTokenError
        return AuthenticatedUser(
            id=STAFF_ID,
            email="staff@example.test",
            role=UserRole.STAFF,
            profile_created_at=datetime(2026, 9, 30, tzinfo=UTC),
            access_token=SecretStr(access_token),
        )


class FakeQuery:
    def __init__(self, rows: list[dict[str, object]], selections: list[str]) -> None:
        self.rows = deepcopy(rows)
        self.selections = selections
        self.filters: list[tuple[str, str, object]] = []

    def select(self, columns: str) -> "FakeQuery":
        self.selections.append(columns)
        return self

    def order(self, *args: object, **kwargs: object) -> "FakeQuery":
        return self

    def eq(self, column: str, value: object) -> "FakeQuery":
        self.filters.append(("eq", column, value))
        return self

    def gte(self, column: str, value: object) -> "FakeQuery":
        self.filters.append(("gte", column, value))
        return self

    def lt(self, column: str, value: object) -> "FakeQuery":
        self.filters.append(("lt", column, value))
        return self

    async def execute(self) -> SimpleNamespace:
        rows = self.rows
        for operator, column, value in self.filters:
            if operator == "eq":
                rows = [row for row in rows if row[column] == value]
            elif operator == "gte":
                threshold = datetime.fromisoformat(str(value))
                rows = [
                    row
                    for row in rows
                    if datetime.fromisoformat(str(row[column])) >= threshold
                ]
            elif operator == "lt":
                threshold = datetime.fromisoformat(str(value))
                rows = [
                    row
                    for row in rows
                    if datetime.fromisoformat(str(row[column])) < threshold
                ]
        return SimpleNamespace(data=rows)


class FakeSupabaseClient:
    def __init__(self) -> None:
        self.selections: list[str] = []
        self.products = [
            {
                "id": 1,
                "sku": "ALPHA-1",
                "name": "Alpha",
                "current_stock": 0,
                "low_stock_threshold": 2,
            },
            {
                "id": 2,
                "sku": "BETA-1",
                "name": "Beta",
                "current_stock": 5,
                "low_stock_threshold": 3,
            },
            {
                "id": 3,
                "sku": "GAMMA-1",
                "name": "Gamma",
                "current_stock": 2,
                "low_stock_threshold": 2,
            },
        ]
        self.movements = [
            self._movement(1, "sale", 3, "2026-09-01T10:00:00+00:00", "ALPHA-1", "Alpha"),
            self._movement(1, "sale", 2, "2026-09-05T10:00:00+00:00", "ALPHA-1", "Alpha"),
            self._movement(2, "sale", 10, "2026-09-03T10:00:00+00:00", "BETA-1", "Beta"),
            self._movement(2, "stock_in", 99, "2026-09-04T10:00:00+00:00", "BETA-1", "Beta"),
            self._movement(3, "sale", 100, "2026-08-31T10:00:00+00:00", "GAMMA-1", "Gamma"),
        ]

    @staticmethod
    def _movement(
        product_id: int,
        movement_type: str,
        quantity: int,
        occurred_at: str,
        sku: str,
        name: str,
    ) -> dict[str, object]:
        return {
            "product_id": product_id,
            "movement_type": movement_type,
            "quantity": quantity,
            "occurred_at": occurred_at,
            "products": {"id": product_id, "sku": sku, "name": name},
        }

    def table(self, name: str) -> FakeQuery:
        if name == "products":
            return FakeQuery(self.products, self.selections)
        if name == "stock_movements":
            return FakeQuery(self.movements, self.selections)
        raise AssertionError(f"Unexpected reporting table: {name}")


class ReportingServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = FakeSupabaseClient()
        self.service = ReportingService(self.client)

    def test_inventory_summary_calculations(self) -> None:
        summary = asyncio.run(self.service.inventory_summary())

        self.assertEqual(summary.total_products, 3)
        self.assertEqual(summary.total_units_in_stock, 7)

    def test_inventory_summary_low_stock_count(self) -> None:
        summary = asyncio.run(self.service.inventory_summary())

        self.assertEqual(summary.low_stock_products, 2)

    def test_inventory_summary_out_of_stock_count(self) -> None:
        summary = asyncio.run(self.service.inventory_summary())

        self.assertEqual(summary.out_of_stock_products, 1)

    def test_low_stock_report_uses_threshold_rule(self) -> None:
        products = asyncio.run(self.service.low_stock_products())

        self.assertEqual([product.sku for product in products], ["ALPHA-1", "GAMMA-1"])

    def test_best_selling_uses_sales_only_and_orders_by_quantity(self) -> None:
        results = asyncio.run(
            self.service.best_selling_products(
                ReportDateRange(start_date="2026-09-01", end_date="2026-09-05")
            )
        )

        self.assertEqual(
            [(item.sku, item.total_quantity_sold) for item in results],
            [("BETA-1", 10), ("ALPHA-1", 5)],
        )

    def test_best_selling_date_filter_is_inclusive_by_calendar_date(self) -> None:
        results = asyncio.run(
            self.service.best_selling_products(
                ReportDateRange(start_date="2026-09-05", end_date="2026-09-05")
            )
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].sku, "ALPHA-1")
        self.assertEqual(results[0].total_quantity_sold, 2)

    def test_multiple_product_lookup_supports_name_and_sku(self) -> None:
        results = asyncio.run(
            self.service.lookup_product_stock(["Alpha", "BETA-1"])
        )

        self.assertTrue(all(result.found for result in results))
        self.assertEqual(results[0].matches[0].current_stock, 0)
        self.assertEqual(results[1].matches[0].current_stock, 5)

    def test_nonexistent_product_is_explicitly_not_found(self) -> None:
        result = asyncio.run(
            self.service.lookup_product_stock(["DOES-NOT-EXIST"])
        )[0]

        self.assertFalse(result.found)
        self.assertEqual(result.matches, [])

    def test_missing_products_never_receive_invented_quantities(self) -> None:
        result = asyncio.run(
            self.service.lookup_product_stock(["Imaginary Product"])
        )[0]
        payload = result.model_dump(mode="json")

        self.assertEqual(payload, {
            "query": "Imaginary Product",
            "found": False,
            "matches": [],
        })

    def test_reports_never_select_or_return_cost_or_profit(self) -> None:
        summary = asyncio.run(self.service.inventory_summary())
        low_stock = asyncio.run(self.service.low_stock_products())
        best_selling = asyncio.run(
            self.service.best_selling_products(
                ReportDateRange(start_date="2026-09-01", end_date="2026-09-05")
            )
        )

        serialized = [summary.model_dump(), *[item.model_dump() for item in low_stock], *[item.model_dump() for item in best_selling]]
        self.assertTrue(
            all("cost" not in key and "profit" not in key for columns in self.client.selections for key in columns.split(","))
        )
        self.assertTrue(
            all("cost_price" not in item and "profit" not in item for item in serialized)
        )


class ReportingEndpointValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        client = FakeSupabaseClient()
        service = ReportingService(client)
        app = FastAPI()
        app.include_router(api_router)
        app.dependency_overrides[get_auth_service] = lambda: FakeAuthService()
        app.dependency_overrides[get_reporting_service] = lambda: service
        self.client = TestClient(app)

    def test_best_selling_rejects_reversed_date_range(self) -> None:
        response = self.client.get(
            "/api/reports/best-selling?start_date=2026-09-10&end_date=2026-09-01",
            headers={"Authorization": "Bearer staff-token"},
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()

