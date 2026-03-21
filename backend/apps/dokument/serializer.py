from rest_framework import serializers
from .models import Dokument

class DokumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dokument
        fields = '__all__'
