from django.contrib.gis.db import models

from apps.core.models import BaseModel


class Department(BaseModel):
    code = models.CharField(max_length=2, unique=True)
    name = models.CharField(max_length=80)

    def __str__(self) -> str:
        return self.name


class Municipality(BaseModel):
    code = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=80)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="municipalities")
    centroid = models.PointField(geography=True, srid=4326, null=True, blank=True)

    class Meta:
        verbose_name_plural = "municipalities"

    def __str__(self) -> str:
        return self.name
