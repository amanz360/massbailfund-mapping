from django.db import models
import uuid


class BaseModel(models.Model):
    """Abstract model with UUID pk and timestamps on every model."""

    class Meta:
        abstract = True

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date_created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True, null=True, blank=True, db_index=True)
