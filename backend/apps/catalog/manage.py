from decimal import Decimal, InvalidOperation

from django.db import transaction

from apps.audit.services import record
from apps.catalog.models import Category, Price, PriceList, Product, Unit
from apps.core.exceptions import NcError


def _guard(user, code: str) -> None:
    if not user.has_perm_code(code):
        raise NcError("auth.forbidden", "No tienes permiso para esta acción.", status=403)


def list_products():
    return Product.objects.filter(is_deleted=False).select_related("category").order_by("name", "presentation")


def list_categories():
    return Category.objects.filter(is_deleted=False).order_by("sort_order", "name")


def _clean(data: dict, current: Product | None = None) -> dict:
    sku = (data.get("sku") if "sku" in data else (current.sku if current else "")).strip()
    name = (data.get("name") if "name" in data else (current.name if current else "")).strip()
    presentation = (data.get("presentation") if "presentation" in data else (current.presentation if current else "")).strip()
    unit = data.get("unit") if "unit" in data else (current.unit if current else "")
    if len(sku) < 2 or len(name) < 2 or not presentation:
        raise NcError("product.invalid", "Escribe el código, el nombre y la presentación.", status=400)
    if unit not in Unit.values:
        raise NcError("product.invalid", "Elige la unidad.", status=400)
    if Product.objects.filter(sku=sku, is_deleted=False).exclude(id=getattr(current, "id", None)).exists():
        raise NcError("product.duplicate", "Ya hay un producto con ese código.", status=409)
    category_id = data.get("category_id") if "category_id" in data else (current.category_id if current else None)
    category = Category.objects.filter(id=category_id, is_deleted=False).first()
    if category is None:
        raise NcError("product.invalid", "Elige una categoría.", status=400)
    try:
        size = Decimal(str(data.get("unit_size") if "unit_size" in data else current.unit_size))
    except (InvalidOperation, TypeError) as exc:
        raise NcError("product.invalid", "El tamaño de la presentación tiene que ser un número.", status=400) from exc
    if size <= 0:
        raise NcError("product.invalid", "El tamaño de la presentación tiene que ser mayor que cero.", status=400)
    return {
        "sku": sku,
        "name": name,
        "presentation": presentation,
        "unit": unit,
        "unit_size": size,
        "category": category,
        "is_active": bool(data.get("is_active") if "is_active" in data else (current.is_active if current else True)),
        "is_available": bool(data.get("is_available") if "is_available" in data else (current.is_available if current else True)),
    }


@transaction.atomic
def create_product(actor, data: dict) -> Product:
    _guard(actor, "catalog.manage")
    fields = _clean(data)
    product = Product.objects.create(**fields, created_by=actor, updated_by=actor)
    record(actor, "product.create", product, after={"sku": product.sku})
    return product


@transaction.atomic
def update_product(actor, product_id, data: dict) -> Product:
    _guard(actor, "catalog.manage")
    product = Product.objects.filter(id=product_id, is_deleted=False).select_related("category").first()
    if product is None:
        raise NcError("resource.not_found", "No encontramos ese producto.", status=404)
    fields = _clean(data, product)
    for key, value in fields.items():
        setattr(product, key, value)
    product.updated_by = actor
    product.save()
    record(actor, "product.update", product, after={"sku": product.sku, "is_active": product.is_active})
    return product


def list_price_lists():
    return PriceList.objects.filter(is_deleted=False).select_related("zone").order_by("name")


def price_sheet(list_id):
    price_list = PriceList.objects.filter(id=list_id, is_deleted=False).select_related("zone").first()
    if price_list is None:
        raise NcError("resource.not_found", "No encontramos esa lista de precios.", status=404)
    current = {
        row.product_id: row.unit_price
        for row in Price.objects.filter(price_list=price_list, is_deleted=False)
    }
    return price_list, current


@transaction.atomic
def set_prices(actor, list_id, rows: list) -> PriceList:
    _guard(actor, "catalog.manage")
    price_list, _current = price_sheet(list_id)
    seen = set()
    for row in rows:
        product = Product.objects.filter(id=row.get("product_id"), is_deleted=False).first()
        if product is None:
            raise NcError("product.invalid", "Hay un producto que no existe.", status=400)
        raw = row.get("unit_price")
        price = Price.objects.filter(price_list=price_list, product=product).first()
        if raw in (None, ""):
            if price is not None and not price.is_deleted:
                price.is_deleted = True
                price.updated_by = actor
                price.save(update_fields=["is_deleted", "updated_by", "updated_at"])
            continue
        try:
            amount = Decimal(str(raw))
        except (InvalidOperation, TypeError) as exc:
            raise NcError("price.invalid", "El precio tiene que ser un número.", status=400) from exc
        if amount < 0:
            raise NcError("price.invalid", "El precio no puede ser negativo.", status=400)
        amount = amount.quantize(Decimal("0.01"))
        if price is None:
            Price.objects.create(
                price_list=price_list,
                product=product,
                unit_price=amount,
                currency="COP",
                created_by=actor,
                updated_by=actor,
            )
        else:
            price.unit_price = amount
            price.is_deleted = False
            price.updated_by = actor
            price.save(update_fields=["unit_price", "is_deleted", "updated_by", "updated_at"])
        seen.add(product.id)
    record(actor, "price.update", price_list, after={"products": len(seen)})
    return price_list
