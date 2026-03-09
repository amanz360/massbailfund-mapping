from django import forms
from django.contrib import admin
from django.utils.html import escape
from django.utils.safestring import mark_safe

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


def truncate(text, length=80):
    if len(text) > length:
        return text[:length] + "..."
    return text


# ── Datalist widget ──────────────────────────────────────────────────────

class DatalistWidget(forms.TextInput):
    def __init__(self, model, field_name, attrs=None):
        self.model = model
        self.field_name = field_name
        super().__init__(attrs)

    def render(self, name, value, attrs=None, renderer=None):
        list_id = f"dl_{name}"
        attrs = {**(attrs or {}), "list": list_id}
        html = super().render(name, value, attrs, renderer)
        options = (
            self.model.objects
            .values_list(self.field_name, flat=True)
            .distinct()
            .order_by(self.field_name)
        )
        option_tags = "".join(f'<option value="{escape(o)}">' for o in options if o)
        html += mark_safe(f'<datalist id="{list_id}">{option_tags}</datalist>')
        return html


class DatalistMixin:
    """Mixin that auto-applies DatalistWidget to fields listed in `datalist_fields`.

    Usage:
        datalist_fields = {"field_name": Model}
    """
    datalist_fields = {}

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name in self.datalist_fields:
            model = self.datalist_fields[db_field.name]
            kwargs["widget"] = DatalistWidget(model, db_field.name)
            return db_field.formfield(**kwargs)
        return super().formfield_for_dbfield(db_field, request, **kwargs)


# ── Inlines ──────────────────────────────────────────────────────────────

class MechanismReferenceInline(DatalistMixin, admin.TabularInline):
    model = MechanismReference
    extra = 1
    fields = ["category", "description", "link"]
    datalist_fields = {"category": MechanismReference}


class MechanismQuoteInline(admin.TabularInline):
    model = MechanismQuote
    extra = 0
    fields = ["speaker", "quote", "source_timestamp", "link"]


class MechanismTimelineEntryInline(admin.TabularInline):
    model = MechanismTimelineEntry
    extra = 0
    fields = ["date", "title", "description", "link"]


class ResourceInline(admin.TabularInline):
    model = Resource
    extra = 0
    fields = ["title", "url", "image", "description", "key_points", "tags"]


class MechanismRoleInline(DatalistMixin, admin.TabularInline):
    model = MechanismRole
    fk_name = "mechanism"
    extra = 0
    fields = ["decision_maker", "role_type", "description"]
    datalist_fields = {"role_type": MechanismRole}


class MembershipInline(DatalistMixin, admin.TabularInline):
    model = InstitutionMembership
    fk_name = "institution"
    extra = 0
    fields = ["decision_maker", "membership_type"]
    datalist_fields = {"membership_type": InstitutionMembership}


class DecisionMakerRoleInline(admin.TabularInline):
    model = MechanismRole
    fk_name = "decision_maker"
    extra = 0
    fields = ["mechanism", "role_type", "description"]
    readonly_fields = ["mechanism", "role_type", "description"]
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


class AliasAsSourceInline(admin.TabularInline):
    model = DecisionMakerAlias
    fk_name = "source"
    extra = 0
    fields = ["target", "description"]
    verbose_name = "Can act as"
    verbose_name_plural = "Can act as"


class AliasAsTargetInline(admin.TabularInline):
    model = DecisionMakerAlias
    fk_name = "target"
    extra = 0
    fields = ["source", "description"]
    verbose_name = "Can be acted as by"
    verbose_name_plural = "Can be acted as by"


# ── Model admins ─────────────────────────────────────────────────────────

@admin.register(Mechanism)
class MechanismAdmin(DatalistMixin, admin.ModelAdmin):
    list_display = ("name", "subcategory")
    list_filter = ("subcategory",)
    search_fields = ("name", "description")
    inlines = [MechanismReferenceInline, MechanismQuoteInline, MechanismTimelineEntryInline, MechanismRoleInline, ResourceInline]
    datalist_fields = {"subcategory": Mechanism}


@admin.register(DecisionMaker)
class DecisionMakerAdmin(DatalistMixin, admin.ModelAdmin):
    list_display = ("name", "authority_type")
    list_filter = ("authority_type",)
    search_fields = ("name", "description")
    inlines = [DecisionMakerRoleInline, AliasAsSourceInline, AliasAsTargetInline]
    datalist_fields = {"authority_type": DecisionMaker}


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name", "description")
    inlines = [MembershipInline]


@admin.register(MechanismRole)
class MechanismRoleAdmin(DatalistMixin, admin.ModelAdmin):
    list_display = ("mechanism", "decision_maker", "role_type")
    list_filter = ("role_type",)
    list_select_related = ("mechanism", "decision_maker")
    search_fields = ("mechanism__name", "decision_maker__name", "description")
    autocomplete_fields = ("mechanism", "decision_maker")
    datalist_fields = {"role_type": MechanismRole}


@admin.register(MechanismReference)
class MechanismReferenceAdmin(DatalistMixin, admin.ModelAdmin):
    list_display = ("mechanism", "category", "short_description")
    list_filter = ("category",)
    list_select_related = ("mechanism",)
    search_fields = ("mechanism__name", "description")
    autocomplete_fields = ("mechanism",)
    datalist_fields = {"category": MechanismReference}

    @admin.display(description="Description")
    def short_description(self, obj):
        return truncate(obj.description)


@admin.register(MechanismQuote)
class MechanismQuoteAdmin(admin.ModelAdmin):
    list_display = ("mechanism", "speaker", "short_quote")
    list_filter = ("mechanism",)
    list_select_related = ("mechanism",)
    search_fields = ("mechanism__name", "speaker", "quote")
    autocomplete_fields = ("mechanism",)

    @admin.display(description="Quote")
    def short_quote(self, obj):
        return truncate(obj.quote)


@admin.register(MechanismTimelineEntry)
class MechanismTimelineEntryAdmin(admin.ModelAdmin):
    list_display = ("mechanism", "date", "title", "short_description")
    list_filter = ("mechanism",)
    list_select_related = ("mechanism",)
    search_fields = ("mechanism__name", "title", "description")
    autocomplete_fields = ("mechanism",)

    @admin.display(description="Description")
    def short_description(self, obj):
        return truncate(obj.description)


@admin.register(DecisionMakerAlias)
class DecisionMakerAliasAdmin(admin.ModelAdmin):
    list_display = ("source", "target")
    list_select_related = ("source", "target")
    search_fields = ("source__name", "target__name", "description")
    autocomplete_fields = ("source", "target")


@admin.register(InstitutionMembership)
class InstitutionMembershipAdmin(DatalistMixin, admin.ModelAdmin):
    list_display = ("institution", "decision_maker", "membership_type")
    list_filter = ("institution", "membership_type")
    list_select_related = ("institution", "decision_maker")
    autocomplete_fields = ("institution", "decision_maker")
    datalist_fields = {"membership_type": InstitutionMembership}


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("mechanism", "title", "url")
    list_filter = ("mechanism",)
    list_select_related = ("mechanism",)
    search_fields = ("mechanism__name", "title", "description", "tags")
    autocomplete_fields = ("mechanism",)


@admin.register(GlossaryTerm)
class GlossaryTermAdmin(admin.ModelAdmin):
    list_display = ("term",)
    search_fields = ("term", "definition")
    filter_horizontal = ("mechanisms",)
