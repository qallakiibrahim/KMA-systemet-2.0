from rest_framework import viewsets
from .models import Avvikelse
from .serializer import AvvikelseSerializer

class AvvikelseViewSet(viewsets.ModelViewSet):
    queryset = Avvikelse.objects.all().order_by('-skapad_datum')
    serializer_class = AvvikelseSerializer
