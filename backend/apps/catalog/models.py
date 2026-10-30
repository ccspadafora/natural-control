from django.db import models

from apps.core.models import BaseModel


class Category(BaseModel):
    name = models.CharField(max_length=80)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.PROTECT, related_name="children")
    sort_order = models.IntegerField(default=0)

    class Meta:
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name


class Unit(models.TextChoices):
    L = "L", "Litro"
    KG = "KG", "Kilogramo"
    UNIDAD = "UNIDAD", "Unidad"
    GAL = "GAL", "Galón"


class Product(BaseModel):
    sku = models.CharField(max_length=40, unique=True)
    erp_code = models.CharField(max_length=40, unique=True, null=True, blank=True)
    name = models.CharField(max_length=160)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    active_ingredient = models.CharField(max_length=200, blank=True)
    presentation = models.CharField(max_length=80)
    unit = models.CharField(max_length=10, choices=Unit.choices)
    unit_size = models.DecimalField(max_digits=10, decimal_places=3)
    short_description = models.CharField(max_length=300, blank=True)
    usage = models.TextField(blank=True)
    target_crops = models.ManyToManyField("crm.CropType", blank=True, related_name="products")
    is_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.name} {self.presentation}"


class PriceList(BaseModel):
    """Lista pública de una zona. El cliente guarda cuál le aplica."""

    name = models.CharField(max_length=120)
    zone = models.ForeignKey("org.Zone", null=True, blank=True, on_delete=models.PROTECT, related_name="price_lists")
    is_default = models.BooleanField(default=False)
    valid_from = models.DateField()
    valid_to = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["zone"],
                condition=models.Q(is_default=True, is_deleted=False),
                name="one_default_price_list_per_zone",
            )
        ]

    def __str__(self) -> str:
        return self.name


class Price(BaseModel):
    price_list = models.ForeignKey(PriceList, on_delete=models.CASCADE, related_name="prices")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="prices")
    unit_price = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=3, default="COP")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["price_list", "product"], name="price_unique_product_in_list")
        ]


class TechSheet(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="tech_sheets")
    version = models.PositiveIntegerField()
    file = models.FileField(upload_to="techsheets/")
    sha256 = models.CharField(max_length=64)
    is_current = models.BooleanField(default=False)
    published_by = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="published_sheets")
    published_at = models.DateTimeField()
    changelog = models.CharField(max_length=300, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product"],
                condition=models.Q(is_current=True, is_deleted=False),
                name="one_current_tech_sheet",
            )
        ]
