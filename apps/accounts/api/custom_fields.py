from rest_framework import serializers, viewsets
from rest_framework.permissions import AllowAny
from apps.accounts.models import CustomField


class CustomFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomField
        fields = [
            'id', 'name', 'label', 'field_type', 'placeholder',
            'help_text_field', 'options', 'is_required', 'applies_to',
            'display_order'
        ]


class CustomFieldViewSet(viewsets.ReadOnlyModelViewSet):
    """Public read-only endpoint for WP plugin to fetch field definitions."""
    serializer_class = CustomFieldSerializer
    pagination_class = None
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = CustomField.objects.filter(is_active=True)
        applies_to = self.request.query_params.get('applies_to')
        if applies_to in ('transfer', 'trip'):
            qs = qs.filter(applies_to__in=[applies_to, 'both'])
        return qs.order_by('display_order', 'label')
