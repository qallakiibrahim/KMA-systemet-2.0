from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AvvikelseViewSet

router = DefaultRouter()
router.register(r'', AvvikelseViewSet, basename='avvikelse')

urlpatterns = [
    path('', include(router.urls)),
]
