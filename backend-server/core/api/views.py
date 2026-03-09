from django.core.cache import cache
from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from core.models import (
    DecisionMaker,
    DecisionMakerAlias,
    GlossaryTerm,
    Institution,
    InstitutionMembership,
    Mechanism,
    MechanismReference,
    MechanismRole,
    Resource,
)
from core.serializers import (
    DecisionMakerAliasSerializer,
    DecisionMakerAliasWriteSerializer,
    DecisionMakerDetailSerializer,
    DecisionMakerListSerializer,
    DecisionMakerWriteSerializer,
    GlossaryTermSerializer,
    GlossaryTermWriteSerializer,
    GraphSerializer,
    InstitutionDetailSerializer,
    InstitutionListSerializer,
    InstitutionMembershipSerializer,
    InstitutionMembershipWriteSerializer,
    InstitutionWriteSerializer,
    MechanismDetailSerializer,
    MechanismListSerializer,
    MechanismReferenceSerializer,
    MechanismRoleSerializer,
    MechanismRoleWriteSerializer,
    MechanismWriteSerializer,
    ResourceSerializer,
)


class PublicReadAdminWriteViewSet(viewsets.ModelViewSet):
    """Base ViewSet: read endpoints are public, write endpoints require admin."""

    pagination_class = None
    cache_key = None  # Subclasses set this to enable list caching

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminUser()]
        return [AllowAny()]

    def list(self, request, *args, **kwargs):
        if self.cache_key and not request.query_params:
            cached = cache.get(self.cache_key)
            if cached is not None:
                return Response(cached)
        response = super().list(request, *args, **kwargs)
        if self.cache_key and not request.query_params:
            cache.set(self.cache_key, response.data)
        return response


class MechanismViewSet(PublicReadAdminWriteViewSet):
    queryset = Mechanism.objects.all()
    cache_key = "api:mechanisms"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["subcategory"]
    search_fields = ["name", "description"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MechanismWriteSerializer
        return MechanismDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("list", "retrieve"):
            return qs.prefetch_related(
                "references", "quotes", "timeline_entries", "resources",
                Prefetch("roles", queryset=MechanismRole.objects.select_related("mechanism", "decision_maker")),
                "glossary_terms",
            )
        return qs


class DecisionMakerViewSet(PublicReadAdminWriteViewSet):
    queryset = DecisionMaker.objects.all()
    cache_key = "api:decision-makers"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["authority_type"]
    search_fields = ["name", "description"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DecisionMakerWriteSerializer
        return DecisionMakerDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("list", "retrieve"):
            return qs.prefetch_related(
                Prefetch("mechanism_roles", queryset=MechanismRole.objects.select_related("mechanism", "decision_maker")),
                Prefetch("institution_memberships", queryset=InstitutionMembership.objects.select_related("institution", "decision_maker")),
                Prefetch("aliases_as_source", queryset=DecisionMakerAlias.objects.select_related("source", "target")),
                Prefetch("aliases_as_target", queryset=DecisionMakerAlias.objects.select_related("source", "target")),
            )
        return qs


class InstitutionViewSet(PublicReadAdminWriteViewSet):
    queryset = Institution.objects.all()
    cache_key = "api:institutions"
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return InstitutionWriteSerializer
        return InstitutionDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ("list", "retrieve"):
            return qs.prefetch_related(
                Prefetch("members", queryset=InstitutionMembership.objects.select_related("institution", "decision_maker")),
            )
        return qs


class MechanismRoleViewSet(PublicReadAdminWriteViewSet):
    queryset = MechanismRole.objects.select_related("mechanism", "decision_maker")
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["role_type", "mechanism", "decision_maker"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MechanismRoleWriteSerializer
        return MechanismRoleSerializer


class MechanismReferenceViewSet(PublicReadAdminWriteViewSet):
    queryset = MechanismReference.objects.select_related("mechanism")
    serializer_class = MechanismReferenceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mechanism", "category"]


class DecisionMakerAliasViewSet(PublicReadAdminWriteViewSet):
    queryset = DecisionMakerAlias.objects.select_related("source", "target")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DecisionMakerAliasWriteSerializer
        return DecisionMakerAliasSerializer


class InstitutionMembershipViewSet(PublicReadAdminWriteViewSet):
    queryset = InstitutionMembership.objects.select_related("institution", "decision_maker")
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["institution", "membership_type"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return InstitutionMembershipWriteSerializer
        return InstitutionMembershipSerializer


class ResourceViewSet(PublicReadAdminWriteViewSet):
    queryset = Resource.objects.select_related("mechanism")
    serializer_class = ResourceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["mechanism"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("general") == "true":
            return qs.filter(mechanism__isnull=True)
        return qs

    def list(self, request, *args, **kwargs):
        if request.query_params.get("general") == "true":
            cached = cache.get("api:resources:general")
            if cached is not None:
                return Response(cached)
        response = super(PublicReadAdminWriteViewSet, self).list(request, *args, **kwargs)
        if request.query_params.get("general") == "true":
            cache.set("api:resources:general", response.data)
        return response


class GlossaryTermViewSet(PublicReadAdminWriteViewSet):
    queryset = GlossaryTerm.objects.prefetch_related("mechanisms")
    cache_key = "api:glossary"
    filter_backends = [filters.SearchFilter]
    search_fields = ["term", "definition"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return GlossaryTermWriteSerializer
        return GlossaryTermSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def graph_view(request):
    cached = cache.get("api:graph")
    if cached is not None:
        return Response(cached)
    data = GraphSerializer().get_graph_data()
    cache.set("api:graph", data)
    return Response(data)
