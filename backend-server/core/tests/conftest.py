import pytest
from rest_framework.test import APIClient

from accounts.models import User
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


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        email="admin@test.com", password="testpass123"
    )


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def mechanism(db):
    return Mechanism.objects.create(
        name="Test Mechanism", subcategory="Test Category", description="Test description"
    )


@pytest.fixture
def decision_maker(db):
    return DecisionMaker.objects.create(
        name="Test Decision Maker", authority_type="Judicial", description="Test"
    )


@pytest.fixture
def institution(db):
    return Institution.objects.create(
        name="Test Institution", description="Test"
    )


@pytest.fixture
def mechanism_role(mechanism, decision_maker):
    return MechanismRole.objects.create(
        mechanism=mechanism,
        decision_maker=decision_maker,
        role_type="Enforcer",
        description="Test",
    )


@pytest.fixture
def mechanism_reference(mechanism):
    return MechanismReference.objects.create(
        mechanism=mechanism, category="Legal", description="Test reference"
    )


@pytest.fixture
def decision_maker_alias(decision_maker, db):
    target = DecisionMaker.objects.create(
        name="Alias Target", authority_type="Executive"
    )
    return DecisionMakerAlias.objects.create(
        source=decision_maker, target=target, description="Can act as"
    )


@pytest.fixture
def institution_membership(institution, decision_maker):
    return InstitutionMembership.objects.create(
        institution=institution,
        decision_maker=decision_maker,
        membership_type="Primary",
    )


@pytest.fixture
def resource(mechanism):
    return Resource.objects.create(
        mechanism=mechanism, title="Test Resource", url="https://example.com"
    )


@pytest.fixture
def general_resource(db):
    return Resource.objects.create(
        mechanism=None, title="General Resource", url="https://example.com/general"
    )


@pytest.fixture
def glossary_term(mechanism):
    term = GlossaryTerm.objects.create(term="Test Term", definition="Test definition")
    term.mechanisms.add(mechanism)
    return term
