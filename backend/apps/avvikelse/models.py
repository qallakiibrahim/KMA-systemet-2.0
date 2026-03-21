from django.db import models

class Avvikelse(models.Model):
    titel = models.CharField(max_length=255)
    beskrivning = models.TextField()
    status = models.CharField(max_length=50, default='open')
    priority = models.CharField(max_length=50, default='Medium')
    author_uid = models.CharField(max_length=255)
    skapad_datum = models.DateTimeField(auto_now_add=True)
    uppdaterad_datum = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titel
