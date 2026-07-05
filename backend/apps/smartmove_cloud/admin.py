from django.contrib import admin
from .models import UserFolder, UserFile

admin.site.register(UserFolder)
admin.site.register(UserFile)
