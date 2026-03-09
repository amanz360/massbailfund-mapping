from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.api.auth import LoginAPIView, LogoutAPIView
from core.api import (
    DecisionMakerAliasViewSet,
    DecisionMakerViewSet,
    GlossaryTermViewSet,
    InstitutionMembershipViewSet,
    InstitutionViewSet,
    MechanismReferenceViewSet,
    MechanismRoleViewSet,
    MechanismViewSet,
    ResourceViewSet,
    graph_view,
)

router = DefaultRouter()
router.register(r"mechanisms", MechanismViewSet)
router.register(r"decision-makers", DecisionMakerViewSet)
router.register(r"institutions", InstitutionViewSet)
router.register(r"mechanism-roles", MechanismRoleViewSet)
router.register(r"references", MechanismReferenceViewSet)
router.register(r"aliases", DecisionMakerAliasViewSet)
router.register(r"memberships", InstitutionMembershipViewSet)
router.register(r"resources", ResourceViewSet)
router.register(r"glossary", GlossaryTermViewSet)

urlpatterns = [
    path("login/", LoginAPIView.as_view(), name="login"),
    path("logout/", LogoutAPIView.as_view(), name="logout"),
    path("graph/", graph_view, name="graph"),
    path("", include(router.urls)),
]
