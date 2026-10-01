from typing import Annotated, Awaitable, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.auth.dependencies import require_staff_or_manager
from app.modules.auth.models import AuthenticatedUser
from app.modules.reporting.dependencies import get_reporting_service
from app.modules.reporting.models import (
    BestSellingProduct,
    InventorySummaryResponse,
    OperationalProductStock,
    ProductStockLookupRequest,
    ProductStockLookupResult,
    ReportDateRange,
)
from app.modules.reporting.service import (
    ReportingAccessError,
    ReportingService,
    ReportingServiceError,
)

router = APIRouter(prefix="/api/reports", tags=["reports"])
T = TypeVar("T")


@router.get("/inventory-summary", response_model=InventorySummaryResponse)
async def inventory_summary(
    _: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> InventorySummaryResponse:
    return await _run(service.inventory_summary())


@router.get("/best-selling", response_model=list[BestSellingProduct])
async def best_selling_products(
    date_range: Annotated[ReportDateRange, Query()],
    _: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> list[BestSellingProduct]:
    return await _run(service.best_selling_products(date_range))


@router.post(
    "/product-stock-lookup",
    response_model=list[ProductStockLookupResult],
)
async def product_stock_lookup(
    payload: ProductStockLookupRequest,
    _: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> list[ProductStockLookupResult]:
    return await _run(service.lookup_product_stock(payload.queries))


@router.get("/low-stock", response_model=list[OperationalProductStock])
async def low_stock_products(
    _: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[ReportingService, Depends(get_reporting_service)],
) -> list[OperationalProductStock]:
    return await _run(service.low_stock_products())


async def _run(operation: Awaitable[T]) -> T:
    try:
        return await operation
    except ReportingAccessError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ReportingServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail="Reporting service is temporarily unavailable",
        ) from exc

