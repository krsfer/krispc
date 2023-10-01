from django.db import models


# Create your models here.
class Contact(models.Model):
    firstname = models.CharField(max_length=100)
    surname = models.CharField(max_length=500)
    from_email = models.EmailField()
    message = models.TextField()

    def __str__(self):
        return f'From: {self.from_email} Message: {self.message}'
