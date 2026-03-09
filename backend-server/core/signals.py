from django.db.models.signals import post_save, post_delete

from core.cache import invalidate_api_caches
from core.models import (
    DecisionMaker,
    DecisionMakerAlias,
    GlossaryTerm,
    Institution,
    InstitutionMembership,
    Mechanism,
    MechanismQuote,
    MechanismReference,
    MechanismRole,
    MechanismTimelineEntry,
    Resource,
)

ALL_MODELS = [
    Mechanism,
    DecisionMaker,
    Institution,
    MechanismRole,
    MechanismReference,
    MechanismQuote,
    MechanismTimelineEntry,
    DecisionMakerAlias,
    InstitutionMembership,
    Resource,
    GlossaryTerm,
]


def _invalidate_cache(sender, **kwargs):
    invalidate_api_caches()


for _model in ALL_MODELS:
    post_save.connect(_invalidate_cache, sender=_model)
    post_delete.connect(_invalidate_cache, sender=_model)
