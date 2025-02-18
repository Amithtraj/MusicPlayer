from django.db import models

class ScanDirectory(models.Model):
    """Model to store directories to scan for MP3 files"""
    path = models.CharField(max_length=500)
    
    def __str__(self):
        return self.path