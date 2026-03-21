from django.db import models

class Risk(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    likelihood = models.IntegerField(default=1)
    impact = models.IntegerField(default=1)
    status = models.CharField(max_length=50, default='open')
    category = models.CharField(max_length=100, default='general')
    risk_score = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.risk_score = self.likelihood * self.impact
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title
