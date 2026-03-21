from django.urls import path
from .views import AIAssistantView

urlpatterns = [
    path('chat/', AIAssistantView.as_view(), name='ai_chat'),
]
