import re
from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta

from app.modules.ai.actions import (
    PendingActionInsufficientStockError,
    PendingActionNotFoundError,
    PendingActionService,
)
from app.modules.ai.interpreter import AIInterpreterUnavailable, GroqIntentInterpreter
from app.modules.ai.models import (
    AIChatResponse,
    AIIntentType,
    DatePeriod,
    InterpretedIntent,
)
from app.modules.auth.models import AuthenticatedUser, UserRole
from app.modules.reporting.models import ReportDateRange
from app.modules.reporting.service import ReportingService

FINANCIAL_TERMS = re.compile(
    r"\b(cost(?:\s+price)?|profit|margin|revenue|financials?)\b",
    re.IGNORECASE,
)


class AIAssistantUnavailable(Exception):
    pass


class AIChatService:
    def __init__(
        self,
        interpreter: GroqIntentInterpreter,
        reporting: ReportingService,
        pending_actions: PendingActionService,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        self._interpreter = interpreter
        self._reporting = reporting
        self._pending_actions = pending_actions
        self._clock = clock

    async def chat(
        self,
        message: str,
        user: AuthenticatedUser,
    ) -> AIChatResponse:
        # This backend check runs before Groq, so prompt injection cannot change the role.
        if user.role is UserRole.STAFF and FINANCIAL_TERMS.search(message):
            return self._financial_refusal()

        today = self._clock().date()
        try:
            intent = await self._interpreter.interpret(message, today)
        except AIInterpreterUnavailable as exc:
            raise AIAssistantUnavailable from exc

        if intent.intent is AIIntentType.FINANCIAL:
            if user.role is UserRole.STAFF:
                return self._financial_refusal()
            return AIChatResponse(
                type="refusal",
                message="Financial AI reporting is not available in this version.",
            )
        if intent.intent is AIIntentType.STOCK_LOOKUP:
            return await self._stock_lookup(intent)
        if intent.intent is AIIntentType.LOW_STOCK:
            return await self._low_stock()
        if intent.intent is AIIntentType.BEST_SELLING:
            return await self._best_selling(intent, today)
        if intent.intent is AIIntentType.STOCK_CHANGE:
            return await self._stock_change_preview(intent, user)
        return AIChatResponse(
            type="answer",
            message="I can answer stock, low-stock, and best-selling questions or prepare a stock-change preview.",
        )

    async def _stock_lookup(self, intent: InterpretedIntent) -> AIChatResponse:
        results = await self._reporting.lookup_product_stock(intent.product_queries)
        lines = []
        for result in results:
            if not result.found:
                lines.append(f"{result.query}: product not found.")
            else:
                lines.extend(
                    f"{product.name} ({product.sku}): {product.current_stock} units in stock."
                    for product in result.matches
                )
        return AIChatResponse(
            type="answer",
            message=" ".join(lines),
            data=[result.model_dump(mode="json") for result in results],
        )

    async def _low_stock(self) -> AIChatResponse:
        products = await self._reporting.low_stock_products()
        message = "No products are currently low on stock."
        if products:
            message = "Low-stock products: " + "; ".join(
                f"{item.name} ({item.sku}) has {item.current_stock} units"
                for item in products
            ) + "."
        return AIChatResponse(
            type="answer",
            message=message,
            data=[item.model_dump(mode="json") for item in products],
        )

    async def _best_selling(
        self,
        intent: InterpretedIntent,
        today: date,
    ) -> AIChatResponse:
        date_range = self._resolve_date_range(intent, today)
        products = await self._reporting.best_selling_products(date_range)
        message = "No sales were found for that date range."
        if products:
            message = "Best-selling products: " + "; ".join(
                f"{item.name} ({item.sku}) sold {item.total_quantity_sold} units"
                for item in products
            ) + "."
        return AIChatResponse(
            type="answer",
            message=message,
            data={
                "start_date": date_range.start_date.isoformat(),
                "end_date": date_range.end_date.isoformat(),
                "products": [item.model_dump(mode="json") for item in products],
            },
        )

    async def _stock_change_preview(
        self,
        intent: InterpretedIntent,
        user: AuthenticatedUser,
    ) -> AIChatResponse:
        result = (await self._reporting.lookup_product_stock(intent.product_queries))[0]
        if not result.found:
            return AIChatResponse(
                type="answer",
                message=f"{result.query}: product not found. No action was created.",
                data=result.model_dump(mode="json"),
            )
        if len(result.matches) != 1:
            return AIChatResponse(
                type="answer",
                message="That product name matches multiple products. Use an exact SKU; no action was created.",
            )

        product = result.matches[0]
        try:
            preview = await self._pending_actions.create(intent, product, user)
        except PendingActionNotFoundError as exc:
            return AIChatResponse(
                type="answer",
                message=f"{exc}. No action was created.",
            )
        except PendingActionInsufficientStockError:
            return AIChatResponse(
                type="answer",
                message="The requested change would make stock negative. No action was created.",
            )
        return AIChatResponse(
            type="pending_action",
            message="Review this pending action, then choose Confirm or Cancel. No stock has been changed.",
            pending_action=preview,
        )

    @staticmethod
    def _resolve_date_range(intent: InterpretedIntent, today: date) -> ReportDateRange:
        if intent.period is DatePeriod.CUSTOM:
            return ReportDateRange(start_date=intent.start_date, end_date=intent.end_date)
        if intent.period is DatePeriod.TODAY:
            return ReportDateRange(start_date=today, end_date=today)
        start = today - timedelta(days=today.weekday())
        return ReportDateRange(start_date=start, end_date=today)

    @staticmethod
    def _financial_refusal() -> AIChatResponse:
        return AIChatResponse(
            type="refusal",
            message="Your authenticated staff role cannot access cost or profit information.",
        )
