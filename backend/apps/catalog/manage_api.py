from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import requires
from apps.catalog.manage import create_product, list_categories, list_price_lists, list_products, price_sheet, set_prices, update_product


def _product(product):
    return {
        "id": str(product.id),
        "sku": product.sku,
        "name": product.name,
        "presentation": product.presentation,
        "category_id": str(product.category_id),
        "category_name": product.category.name,
        "unit": product.unit,
        "unit_size": str(product.unit_size),
        "is_active": product.is_active,
        "is_available": product.is_available,
    }


class ProductAdminView(APIView):
    def get_permissions(self):
        code = "catalog.view" if self.request.method == "GET" else "catalog.manage"
        return [requires(code)()]

    def get(self, request):
        return Response({"results": [_product(item) for item in list_products()]})

    def post(self, request):
        return Response(_product(create_product(request.user, request.data)), status=201)


class ProductAdminDetailView(APIView):
    permission_classes = [requires("catalog.manage")]

    def patch(self, request, product_id):
        return Response(_product(update_product(request.user, product_id, request.data)))


class CategoryListView(APIView):
    permission_classes = [requires("catalog.view")]

    def get(self, request):
        rows = list_categories()
        return Response({"results": [{"id": str(item.id), "name": item.name} for item in rows]})


def _list_row(price_list):
    return {
        "id": str(price_list.id),
        "name": price_list.name,
        "zone_name": price_list.zone.name if price_list.zone_id else "",
        "valid_from": price_list.valid_from.isoformat(),
        "is_default": price_list.is_default,
        "price_count": price_list.prices.filter(is_deleted=False).count(),
    }


class PriceListAdminView(APIView):
    permission_classes = [requires("catalog.view")]

    def get(self, request):
        return Response({"results": [_list_row(item) for item in list_price_lists()]})


class PriceSheetView(APIView):
    def get_permissions(self):
        code = "catalog.view" if self.request.method == "GET" else "catalog.manage"
        return [requires(code)()]

    def get(self, request, list_id):
        return Response(_sheet(list_id))

    def put(self, request, list_id):
        set_prices(request.user, list_id, request.data.get("prices") or [])
        return Response(_sheet(list_id))


def _sheet(list_id):
    price_list, current = price_sheet(list_id)
    products = []
    for product in list_products():
        amount = current.get(product.id)
        products.append(
            {
                "id": str(product.id),
                "sku": product.sku,
                "name": product.name,
                "presentation": product.presentation,
                "unit_price": str(amount) if amount is not None else None,
            }
        )
    return {
        "id": str(price_list.id),
        "name": price_list.name,
        "zone_name": price_list.zone.name if price_list.zone_id else "",
        "products": products,
    }
