from django.db import models

from apps.core.models import BaseModel


class ErpEntity(models.TextChoices):
    CUSTOMERS = "CUSTOMERS", "Clientes"
    PRODUCTS = "PRODUCTS", "Productos"
    PRICES = "PRICES", "Precios"
    INVENTORY = "INVENTORY", "Inventario"
    SALES = "SALES", "Ventas"


class SyncStatus(models.TextChoices):
    RUNNING = "RUNNING", "En curso"
    OK = "OK", "Correcta"
    PARTIAL = "PARTIAL", "Parcial"
    FAILED = "FAILED", "Fallida"


class ErpSyncRun(BaseModel):
    entity = models.CharField(max_length=16, choices=ErpEntity.choices)
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=SyncStatus.choices, default=SyncStatus.RUNNING)
    cursor_in = models.CharField(max_length=120, null=True, blank=True)
    cursor_out = models.CharField(max_length=120, null=True, blank=True)
    records_read = models.PositiveIntegerField(default=0)
    records_upserted = models.PositiveIntegerField(default=0)
    records_failed = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True)


class ErpSale(BaseModel):
    erp_document = models.CharField(max_length=60)
    erp_line = models.CharField(max_length=20)
    date = models.DateField()
    client = models.ForeignKey("crm.Client", null=True, blank=True, on_delete=models.SET_NULL, related_name="erp_sales")
    erp_customer_code = models.CharField(max_length=40, blank=True)
    seller = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="erp_sales")
    erp_seller_code = models.CharField(max_length=40, blank=True)
    product = models.ForeignKey("catalog.Product", null=True, blank=True, on_delete=models.SET_NULL, related_name="erp_sales")
    erp_product_code = models.CharField(max_length=40, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    net_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    raw = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["erp_document", "erp_line"], name="erp_sale_unique_line")
        ]
        indexes = [
            models.Index(fields=["seller", "date"]),
            models.Index(fields=["client", "date"]),
            models.Index(fields=["product", "date"]),
        ]


class WebhookProvider(models.TextChoices):
    WHATSAPP = "WHATSAPP", "WhatsApp"
    SES = "SES", "SES"


class RawWebhookEvent(models.Model):
    id = models.BigAutoField(primary_key=True)
    provider = models.CharField(max_length=16, choices=WebhookProvider.choices)
    payload = models.JSONField()
    headers = models.JSONField(default=dict)
    received_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    error = models.TextField(blank=True)


class ErpUnmatched(BaseModel):
    entity = models.CharField(max_length=16, choices=ErpEntity.choices)
    erp_code = models.CharField(max_length=40)
    payload = models.JSONField(default=dict)
    resolved_to_id = models.UUIDField(null=True, blank=True)
    resolved_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL)
    resolved_at = models.DateTimeField(null=True, blank=True)
