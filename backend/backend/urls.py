from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.norm_urls if hasattr(admin.site, 'norm_urls') else admin.site.urls),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/avvikelse/', include('apps.avvikelse.urls')),
    path('api/risk/', include('apps.risk.urls')),
    path('api/company/', include('apps.company.urls')),
    path('api/dokument/', include('apps.dokument.urls')),
    path('api/process/', include('apps.process.urls')),
    path('api/notification/', include('apps.notification.urls')),
    path('api/calendar/', include('apps.calendar.urls')),
    path('api/tasks/', include('apps.tasks.urls')),
    path('api/ai/', include('apps.ai_assistent.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
