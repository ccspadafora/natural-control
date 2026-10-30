from django.contrib.gis.db import models

from apps.core.models import BaseModel


class Zone(BaseModel):
    name = models.CharField(max_length=80, unique=True)
    code = models.CharField(max_length=20, unique=True)
    municipalities = models.ManyToManyField("geo.Municipality", blank=True, related_name="zones")
    gps_tolerance_m = models.PositiveIntegerField(null=True, blank=True)
    leaders = models.ManyToManyField(
        "accounts.User", blank=True, related_name="led_zones", limit_choices_to={"role__code": "LIDER_ZONA"}
    )

    def __str__(self) -> str:
        return self.name


class Team(BaseModel):
    name = models.CharField(max_length=80)
    leader = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="led_teams")
    zone = models.ForeignKey(Zone, on_delete=models.PROTECT, related_name="teams")

    def __str__(self) -> str:
        return self.name
