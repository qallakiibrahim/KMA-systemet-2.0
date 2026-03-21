from django.db import models

class Dokument(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    file_url = models.URLField(max_length=500, blank=True, null=True)
    category = models.CharField(max_length=100, default='general')
    uploaded_by = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
