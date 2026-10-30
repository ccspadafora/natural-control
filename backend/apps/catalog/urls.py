from django.urls import path

from apps.catalog.manage_api import CategoryListView, PriceListAdminView, PriceSheetView, ProductAdminDetailView, ProductAdminView

urlpatterns = [
    path("catalog/products", ProductAdminView.as_view()),
    path("catalog/products/<uuid:product_id>", ProductAdminDetailView.as_view()),
    path("catalog/categories", CategoryListView.as_view()),
    path("catalog/price-lists", PriceListAdminView.as_view()),
    path("catalog/price-lists/<uuid:list_id>/prices", PriceSheetView.as_view()),
]
