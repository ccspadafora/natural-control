from django.contrib.postgres.fields import ArrayField
from django.db import models

from apps.core.models import BaseModel


class Notification(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=60)
    title = models.CharField(max_length=120)
    body = models.CharField(max_length=300)
    link = models.CharField(max_length=250, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    channels_sent = ArrayField(models.CharField(max_length=16), default=list, blank=True)


class NotificationPreference(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notification_preferences")
    kind = models.CharField(max_length=60)
    push = models.BooleanField(default=True)
    email = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "kind"], name="notification_pref_unique")
        ]


class PushSubscription(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="push_subscriptions")
    device = models.ForeignKey("accounts.Device", on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(unique=True)
    p256dh = models.CharField(max_length=200)
    auth = models.CharField(max_length=100)
    failure_count = models.PositiveSmallIntegerField(default=0)
    disabled_at = models.DateTimeField(null=True, blank=True)
