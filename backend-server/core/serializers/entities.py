from rest_framework import serializers

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


# ── List serializers (lightweight, no description) ─────────────────────────

class MechanismListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mechanism
        fields = ["id", "name", "subcategory"]
        read_only_fields = fields


class DecisionMakerListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionMaker
        fields = ["id", "name", "authority_type"]
        read_only_fields = fields


class InstitutionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ["id", "name"]
        read_only_fields = fields


# ── Reference serializer ──────────────────────────────────────────────────

class MechanismReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MechanismReference
        fields = ["id", "mechanism", "category", "description", "link"]


# ── Quote serializer ─────────────────────────────────────────────────────

class MechanismQuoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MechanismQuote
        fields = ["id", "mechanism", "speaker", "quote", "source_timestamp", "link"]


# ── Timeline entry serializer ────────────────────────────────────────────

class MechanismTimelineEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MechanismTimelineEntry
        fields = ["id", "mechanism", "date", "title", "description", "link"]


# ── Resource serializer ───────────────────────────────────────────────────

class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = ["id", "mechanism", "url", "title", "description", "key_points", "tags", "image"]


# ── Glossary term serializers ─────────────────────────────────────────────

class GlossaryTermBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlossaryTerm
        fields = ["id", "term", "definition"]


class GlossaryTermSerializer(serializers.ModelSerializer):
    mechanisms = MechanismListSerializer(many=True, read_only=True)

    class Meta:
        model = GlossaryTerm
        fields = ["id", "term", "definition", "mechanisms"]


class GlossaryTermWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlossaryTerm
        fields = ["id", "term", "definition", "mechanisms"]


# ── MechanismRole serializers ─────────────────────────────────────────────

class MechanismRoleSerializer(serializers.ModelSerializer):
    mechanism = MechanismListSerializer(read_only=True)
    decision_maker = DecisionMakerListSerializer(read_only=True)

    class Meta:
        model = MechanismRole
        fields = ["id", "mechanism", "decision_maker", "role_type", "description"]
        read_only_fields = fields


class MechanismRoleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MechanismRole
        fields = ["id", "mechanism", "decision_maker", "role_type", "description"]


# ── DecisionMakerAlias serializers ────────────────────────────────────────

class DecisionMakerAliasSerializer(serializers.ModelSerializer):
    source = DecisionMakerListSerializer(read_only=True)
    target = DecisionMakerListSerializer(read_only=True)

    class Meta:
        model = DecisionMakerAlias
        fields = ["id", "source", "target", "description"]
        read_only_fields = fields


class DecisionMakerAliasWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionMakerAlias
        fields = ["id", "source", "target", "description"]


# ── Institution membership serializers ────────────────────────────────────

class InstitutionMembershipSerializer(serializers.ModelSerializer):
    institution = InstitutionListSerializer(read_only=True)
    decision_maker = DecisionMakerListSerializer(read_only=True)

    class Meta:
        model = InstitutionMembership
        fields = ["id", "institution", "decision_maker", "membership_type"]
        read_only_fields = fields


class InstitutionMembershipWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionMembership
        fields = ["id", "institution", "decision_maker", "membership_type"]


# ── Detail serializers ────────────────────────────────────────────────────

class MechanismDetailSerializer(serializers.ModelSerializer):
    references = MechanismReferenceSerializer(many=True, read_only=True)
    quotes = MechanismQuoteSerializer(many=True, read_only=True)
    timeline_entries = MechanismTimelineEntrySerializer(many=True, read_only=True)
    resources = ResourceSerializer(many=True, read_only=True)
    roles = MechanismRoleSerializer(many=True, read_only=True)
    glossary_terms = GlossaryTermBriefSerializer(many=True, read_only=True)

    class Meta:
        model = Mechanism
        fields = [
            "id", "name", "subcategory", "description",
            "references", "quotes", "timeline_entries",
            "resources", "roles", "glossary_terms",
        ]
        read_only_fields = fields


class DecisionMakerDetailSerializer(serializers.ModelSerializer):
    mechanism_roles = MechanismRoleSerializer(many=True, read_only=True)
    institution_memberships = InstitutionMembershipSerializer(many=True, read_only=True)
    aliases_as_source = DecisionMakerAliasSerializer(many=True, read_only=True)
    aliases_as_target = DecisionMakerAliasSerializer(many=True, read_only=True)

    class Meta:
        model = DecisionMaker
        fields = [
            "id", "name", "authority_type", "description",
            "mechanism_roles", "institution_memberships",
            "aliases_as_source", "aliases_as_target",
        ]
        read_only_fields = fields


class InstitutionDetailSerializer(serializers.ModelSerializer):
    members = InstitutionMembershipSerializer(many=True, read_only=True)

    class Meta:
        model = Institution
        fields = ["id", "name", "description", "members"]
        read_only_fields = fields


# ── Write serializers ─────────────────────────────────────────────────────

class MechanismWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mechanism
        fields = ["id", "name", "subcategory", "description"]


class DecisionMakerWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionMaker
        fields = ["id", "name", "authority_type", "description"]


class InstitutionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ["id", "name", "description"]


# ── Graph serializer ─────────────────────────────────────────────────────

class GraphSerializer:
    """Returns all entities as a unified graph payload.

    Nodes get a synthetic `primary_type` and `secondary_type` for frontend
    compatibility with the Cytoscape graph.
    """

    def get_graph_data(self):
        nodes = []

        for m in Mechanism.objects.all():
            nodes.append({
                "id": str(m.id),
                "name": m.name,
                "primary_type": "Mechanism",
                "secondary_type": m.subcategory,
                "description": m.description,
            })

        for dm in DecisionMaker.objects.all():
            nodes.append({
                "id": str(dm.id),
                "name": dm.name,
                "primary_type": "Decision Maker",
                "secondary_type": dm.authority_type,
                "description": dm.description,
            })

        for inst in Institution.objects.all():
            nodes.append({
                "id": str(inst.id),
                "name": inst.name,
                "primary_type": "Institution",
                "secondary_type": "",
                "description": inst.description,
            })

        edges = [
            {
                "id": str(r.id),
                "source": str(r.mechanism_id),
                "target": str(r.decision_maker_id),
                "relationship_type": r.role_type,
                "description": r.description,
            }
            for r in MechanismRole.objects.all()
        ]

        memberships = [
            {
                "id": str(m.id),
                "institution": str(m.institution_id),
                "member": str(m.decision_maker_id),
                "membership_type": m.membership_type,
            }
            for m in InstitutionMembership.objects.all()
        ]

        return {
            "nodes": nodes,
            "edges": edges,
            "memberships": memberships,
        }
