from datetime import date
from decimal import Decimal

from apps.catalog.models import Price, PriceList, Product
from apps.crm.models import Client


def resolve_unit_price(client: Client, product: Product, on_date: date | None = None) -> Decimal | None:
    """Precio de la lista asignada al cliente. No hay una lista global por defecto."""
    price_list: PriceList | None = client.price_list
    if price_list is None or price_list.is_deleted:
        return None
    day = on_date or date.today()
    if price_list.valid_from and day < price_list.valid_from:
        return None
    if price_list.valid_to and day > price_list.valid_to:
        return None
    price = Price.objects.filter(price_list=price_list, product=product, is_deleted=False).first()
    if price is None:
        return None
    return price.unit_price
