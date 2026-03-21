from rest_framework import viewsets
from .models import Dokument
from .serializer import DokumentSerializer

class DokumentViewSet(viewsets.ModelViewSet):
    queryset = Dokument.objects.all()
    serializer_class = DokumentSerializer
