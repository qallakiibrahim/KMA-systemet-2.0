from rest_framework import serializers
from .models import Avvikelse

class AvvikelseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avvikelse
        fields = '__all__'
