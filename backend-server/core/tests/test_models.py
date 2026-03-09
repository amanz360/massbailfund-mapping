import pytest
from django.db import IntegrityError
from core.models import (
    DecisionMaker,
    DecisionMakerAlias,
    Institution,
    InstitutionMembership,
    Mechanism,
    MechanismReference,
    MechanismRole,
)


@pytest.mark.django_db
class TestMechanism:
    def test_create(self):
        m = Mechanism.objects.create(
            name="Cash Bail",
            subcategory="Pretrial Condition of Release",
            description="A mechanism for pretrial release",
        )
        assert m.name == "Cash Bail"
        assert m.subcategory == "Pretrial Condition of Release"
        assert str(m) == "Cash Bail"
        assert m.id is not None

    def test_defaults(self):
        m = Mechanism.objects.create(name="GPS Monitoring")
        assert m.subcategory == ""
        assert m.description == ""


@pytest.mark.django_db
class TestDecisionMaker:
    def test_create(self):
        dm = DecisionMaker.objects.create(
            name="Judge",
            authority_type="Judicial Authority",
            description="A judicial decision maker",
        )
        assert dm.authority_type == "Judicial Authority"
        assert str(dm) == "Judge"

    def test_defaults(self):
        dm = DecisionMaker.objects.create(name="Clerk")
        assert dm.authority_type == ""
        assert dm.description == ""


@pytest.mark.django_db
class TestInstitution:
    def test_create(self):
        inst = Institution.objects.create(
            name="Trial Courts",
            description="The MA trial court system",
        )
        assert str(inst) == "Trial Courts"

    def test_defaults(self):
        inst = Institution.objects.create(name="Probation")
        assert inst.description == ""


@pytest.mark.django_db
class TestMechanismReference:
    def test_create(self):
        m = Mechanism.objects.create(name="Cash Bail")
        ref = MechanismReference.objects.create(
            mechanism=m,
            category="Legislative/Timeline",
            description="Timeline of cash bail legislation",
        )
        assert ref.mechanism == m
        assert ref.category == "Legislative/Timeline"
        assert ref.link == ""
        assert str(ref) == "Cash Bail — Legislative/Timeline"

    def test_with_link(self):
        m = Mechanism.objects.create(name="Cash Bail")
        ref = MechanismReference.objects.create(
            mechanism=m,
            category="Legal Memos / Reports",
            description="Legal memo",
            link="https://example.com/report.pdf",
        )
        assert ref.link == "https://example.com/report.pdf"
        assert m.references.count() == 1


@pytest.mark.django_db
class TestMechanismRole:
    def test_create(self):
        m = Mechanism.objects.create(name="Cash Bail")
        dm = DecisionMaker.objects.create(name="Judge")
        role = MechanismRole.objects.create(
            mechanism=m,
            decision_maker=dm,
            role_type="Decision Authority",
            description="Judge sets bail",
        )
        assert role.mechanism == m
        assert role.decision_maker == dm
        assert role.role_type == "Decision Authority"
        assert str(role) == "Cash Bail — Judge (Decision Authority)"

    def test_related_names(self):
        m = Mechanism.objects.create(name="Cash Bail")
        dm = DecisionMaker.objects.create(name="Judge")
        MechanismRole.objects.create(
            mechanism=m, decision_maker=dm,
            role_type="Decision Authority", description="",
        )
        assert m.roles.count() == 1
        assert dm.mechanism_roles.count() == 1


@pytest.mark.django_db
class TestDecisionMakerAlias:
    def test_create(self):
        clerk = DecisionMaker.objects.create(name="Clerks")
        magistrate = DecisionMaker.objects.create(name="Bail Magistrate")
        alias = DecisionMakerAlias.objects.create(
            source=clerk,
            target=magistrate,
            description="Clerks can act as Bail Magistrates",
        )
        assert str(alias) == "Clerks can act as Bail Magistrate"
        assert clerk.aliases_as_source.count() == 1
        assert magistrate.aliases_as_target.count() == 1

    def test_unique_constraint(self):
        clerk = DecisionMaker.objects.create(name="Clerks")
        magistrate = DecisionMaker.objects.create(name="Bail Magistrate")
        DecisionMakerAlias.objects.create(
            source=clerk, target=magistrate, description="",
        )
        with pytest.raises(IntegrityError):
            DecisionMakerAlias.objects.create(
                source=clerk, target=magistrate, description="duplicate",
            )


@pytest.mark.django_db
class TestInstitutionMembership:
    def test_create(self):
        inst = Institution.objects.create(name="Trial Courts")
        dm = DecisionMaker.objects.create(name="Judge")
        membership = InstitutionMembership.objects.create(
            institution=inst,
            decision_maker=dm,
            membership_type="Primary",
        )
        assert membership.institution == inst
        assert membership.decision_maker == dm
        assert str(membership) == "Judge in Trial Courts (Primary)"
        assert inst.members.count() == 1
        assert dm.institution_memberships.count() == 1

    def test_unique_constraint(self):
        inst = Institution.objects.create(name="Trial Courts")
        dm = DecisionMaker.objects.create(name="Judge")
        InstitutionMembership.objects.create(
            institution=inst, decision_maker=dm, membership_type="Primary",
        )
        with pytest.raises(IntegrityError):
            InstitutionMembership.objects.create(
                institution=inst, decision_maker=dm, membership_type="External",
            )
