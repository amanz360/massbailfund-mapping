from django_jsonform.models.fields import ArrayField
from django.db import models
from massbailfund.common.mixins import BaseModel


class Mechanism(BaseModel):
    name = models.CharField(max_length=255)
    subcategory = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class DecisionMaker(BaseModel):
    name = models.CharField(max_length=255)
    authority_type = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Institution(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class MechanismReference(BaseModel):
    mechanism = models.ForeignKey(
        Mechanism, on_delete=models.CASCADE, related_name="references"
    )
    category = models.CharField(max_length=255)
    description = models.TextField()
    link = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["mechanism", "category"]

    def __str__(self):
        return f"{self.mechanism.name} — {self.category}"


class MechanismQuote(BaseModel):
    mechanism = models.ForeignKey(
        Mechanism, on_delete=models.CASCADE, related_name="quotes"
    )
    speaker = models.CharField(max_length=255)
    quote = models.TextField()
    source_timestamp = models.CharField(max_length=100, blank=True, default="")
    link = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["mechanism", "speaker"]

    def __str__(self):
        return f"{self.mechanism.name} — {self.speaker}"


class MechanismTimelineEntry(BaseModel):
    mechanism = models.ForeignKey(
        Mechanism, on_delete=models.CASCADE, related_name="timeline_entries"
    )
    date = models.DateField(null=True, blank=True)
    title = models.CharField(max_length=500, blank=True, default="")
    description = models.TextField()
    link = models.URLField(blank=True, default="")

    class Meta:
        ordering = ["mechanism", "date"]
        verbose_name_plural = "mechanism timeline entries"

    def __str__(self):
        label = self.title or self.description[:50]
        return f"{self.mechanism.name} — {label}"


class MechanismRole(BaseModel):
    mechanism = models.ForeignKey(
        Mechanism, on_delete=models.CASCADE, related_name="roles"
    )
    decision_maker = models.ForeignKey(
        DecisionMaker, on_delete=models.CASCADE, related_name="mechanism_roles"
    )
    role_type = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["mechanism", "decision_maker"]

    def __str__(self):
        return f"{self.mechanism.name} — {self.decision_maker.name} ({self.role_type})"


class DecisionMakerAlias(BaseModel):
    source = models.ForeignKey(
        DecisionMaker, on_delete=models.CASCADE, related_name="aliases_as_source"
    )
    target = models.ForeignKey(
        DecisionMaker, on_delete=models.CASCADE, related_name="aliases_as_target"
    )
    description = models.TextField(blank=True, default="")

    class Meta:
        verbose_name_plural = "decision maker aliases"
        constraints = [
            models.UniqueConstraint(
                fields=["source", "target"],
                name="unique_dm_alias",
            )
        ]
        ordering = ["source", "target"]

    def __str__(self):
        return f"{self.source.name} can act as {self.target.name}"


class InstitutionMembership(BaseModel):
    institution = models.ForeignKey(
        Institution, on_delete=models.CASCADE, related_name="members"
    )
    decision_maker = models.ForeignKey(
        DecisionMaker, on_delete=models.CASCADE, related_name="institution_memberships"
    )
    membership_type = models.CharField(max_length=255)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["institution", "decision_maker"],
                name="unique_institution_decision_maker",
            )
        ]
        ordering = ["institution", "membership_type", "decision_maker"]

    def __str__(self):
        return f"{self.decision_maker.name} in {self.institution.name} ({self.membership_type})"


class Resource(BaseModel):
    mechanism = models.ForeignKey(
        Mechanism, on_delete=models.CASCADE, related_name="resources",
        null=True, blank=True,
    )
    url = models.URLField(max_length=2000, blank=True, default="")
    title = models.CharField(max_length=500, blank=True, default="")
    description = models.TextField(blank=True, default="")
    key_points = ArrayField(models.TextField(), blank=True, default=list)
    tags = models.CharField(max_length=500, blank=True, default="")
    image = models.ImageField(upload_to="resources/", blank=True, default="")

    class Meta:
        ordering = ["mechanism", "title"]

    def __str__(self):
        label = self.title or self.url or self.description[:50]
        if self.mechanism:
            return f"{self.mechanism.name} — {label}"
        return label


class GlossaryTerm(BaseModel):
    term = models.CharField(max_length=255, unique=True)
    definition = models.TextField()
    mechanisms = models.ManyToManyField(
        Mechanism, related_name="glossary_terms", blank=True,
    )

    class Meta:
        ordering = ["term"]

    def __str__(self):
        return self.term
