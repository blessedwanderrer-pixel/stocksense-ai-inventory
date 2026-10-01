from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.auth.dependencies import require_manager, require_staff_or_manager
from app.modules.auth.models import AuthenticatedUser
from app.modules.inventory.dependencies import get_inventory_service
from app.modules.inventory.models import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    StockMovementCreate,
    StockMovementResponse,
)
from app.modules.inventory.service import (
    InsufficientStockError,
    InventoryAccessError,
    InventoryConflictError,
    InventoryNotFoundError,
    InventoryService,
    InventoryServiceError,
)

router = APIRouter(prefix="/api", tags=["inventory"])


@router.get(
    "/products/low-stock",
    response_model=list[ProductResponse],
    response_model_exclude_none=True,
)
async def list_low_stock_products(
    user: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[InventoryService, Depends(get_inventory_service)],
) -> list[ProductResponse]:
    return await _run(service.list_products(user, low_stock_only=True))


@router.get(
    "/products",
    response_model=list[ProductResponse],
    response_model_exclude_none=True,
)
async def list_products(
    user: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[InventoryService, Depends(get_inventory_service)],
) -> list[ProductResponse]:
    return await _run(service.list_products(user))


@router.get(
    "/products/{product_id}",
    response_model=ProductResponse,
    response_model_exclude_none=True,
)
async def get_product(
    product_id: int,
    user: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[InventoryService, Depends(get_inventory_service)],
) -> ProductResponse:
    return await _run(service.get_product(product_id, user))


@router.post(
    "/products",
    response_model=ProductResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    payload: ProductCreate,
    user: Annotated[AuthenticatedUser, Depends(require_manager)],
    service: Annotated[InventoryService, Depends(get_inventory_service)],
) -> ProductResponse:
    return await _run(service.create_product(payload, user))


@router.patch(
    "/products/{product_id}",
    response_model=ProductResponse,
    response_model_exclude_none=True,
)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    user: Annotated[AuthenticatedUser, Depends(require_manager)],
    service: Annotated[InventoryService, Depends(get_inventory_service)],
) -> ProductResponse:
    return await _run(service.update_product(product_id, payload, user))


@router.post(
    "/stock-movements",
    response_model=StockMovementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_stock_movement(
    payload: StockMovementCreate,
    user: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[InventoryService, Depends(get_inventory_service)],
) -> StockMovementResponse:
    return await _run(service.create_stock_movement(payload, user))


@router.get(
    "/stock-movements",
    response_model=list[StockMovementResponse],
)
async def list_stock_movements(
    _: Annotated[AuthenticatedUser, Depends(require_staff_or_manager)],
    service: Annotated[InventoryService, Depends(get_inventory_service)],
) -> list[StockMovementResponse]:
    return await _run(service.list_stock_movements())


async def _run(operation: object) -> object:
    try:
        return await operation
    except InventoryNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except InsufficientStockError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InventoryConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InventoryAccessError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except InventoryServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail="Inventory service is temporarily unavailable",
        ) from exc
