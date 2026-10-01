from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from postgrest.exceptions import APIError
from supabase import AsyncClient

from app.modules.reporting.models import (
    BestSellingProduct,
    InventorySummaryResponse,
    OperationalProductStock,
    ProductStockLookupResult,
    ReportDateRange,
)

OPERATIONAL_PRODUCT_COLUMNS = "id,sku,name,current_stock,low_stock_threshold"
SALE_MOVEMENT_COLUMNS = "product_id,quantity,occurred_at,products(id,sku,name)"


class ReportingAccessError(Exception):
    pass


class ReportingServiceError(Exception):
    pass


class ReportingService:
    """Reusable operational reporting for dashboards and the future AI layer."""

    def __init__(self, client: AsyncClient) -> None:
        self._client = client

    async def inventory_summary(self) -> InventorySummaryResponse:
        products = await self._load_products()
        return InventorySummaryResponse(
            total_products=len(products),
            total_units_in_stock=sum(product.current_stock for product in products),
            low_stock_products=sum(
                product.current_stock <= product.low_stock_threshold
                for product in products
            ),
            out_of_stock_products=sum(
                product.current_stock == 0 for product in products
            ),
        )

    async def low_stock_products(self) -> list[OperationalProductStock]:
        products = await self._load_products()
        return [
            product
            for product in products
            if product.current_stock <= product.low_stock_threshold
        ]

    async def best_selling_products(
        self,
        date_range: ReportDateRange,
    ) -> list[BestSellingProduct]:
        start = datetime.combine(date_range.start_date, datetime.min.time(), UTC)
        end_exclusive = datetime.combine(
            date_range.end_date + timedelta(days=1),
            datetime.min.time(),
            UTC,
        )
        try:
            response = (
                await self._client.table("stock_movements")
                .select(SALE_MOVEMENT_COLUMNS)
                .eq("movement_type", "sale")
                .gte("occurred_at", start.isoformat())
                .lt("occurred_at", end_exclusive.isoformat())
                .execute()
            )
        except APIError as exc:
            raise self._translate_error(exc) from exc

        totals: dict[int, int] = defaultdict(int)
        products: dict[int, dict[str, Any]] = {}
        for row in response.data or []:
            product = row.get("products")
            if not isinstance(product, dict):
                raise ReportingServiceError("Sale product data is unavailable")
            product_id = row["product_id"]
            totals[product_id] += row["quantity"]
            products[product_id] = product

        results = [
            BestSellingProduct(
                product_id=product_id,
                sku=products[product_id]["sku"],
                name=products[product_id]["name"],
                total_quantity_sold=quantity,
            )
            for product_id, quantity in totals.items()
        ]
        return sorted(
            results,
            key=lambda item: (-item.total_quantity_sold, item.name.casefold()),
        )

    async def lookup_product_stock(
        self,
        queries: list[str],
    ) -> list[ProductStockLookupResult]:
        products = await self._load_products()
        by_sku: dict[str, list[OperationalProductStock]] = defaultdict(list)
        by_name: dict[str, list[OperationalProductStock]] = defaultdict(list)
        for product in products:
            by_sku[product.sku.casefold()].append(product)
            by_name[product.name.casefold()].append(product)

        results = []
        for query in queries:
            key = query.casefold()
            matches = by_sku.get(key) or by_name.get(key) or []
            results.append(
                ProductStockLookupResult(
                    query=query,
                    found=bool(matches),
                    matches=matches,
                )
            )
        return results

    async def _load_products(self) -> list[OperationalProductStock]:
        try:
            response = (
                await self._client.table("products")
                .select(OPERATIONAL_PRODUCT_COLUMNS)
                .order("name")
                .execute()
            )
            return [
                OperationalProductStock(**row)
                for row in (response.data or [])
            ]
        except APIError as exc:
            raise self._translate_error(exc) from exc

    @staticmethod
    def _translate_error(exc: APIError) -> Exception:
        if exc.code == "42501":
            return ReportingAccessError("Database policy denied this report")
        return ReportingServiceError("Supabase reporting operation failed")

