from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DokumentViewSet

router = DefaultRouter()
router.register(r'', DokumentViewSet, basename='dokument')

urlpatterns = [
    path('', include(router.urls)),
]
