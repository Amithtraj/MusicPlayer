from django.urls import path
from django_distill import distill_path
from . import views

app_name = 'player'

def get_index():
    # No dynamic parameters for the index view, so return None.
    return None

urlpatterns = [
    # Use distill_path for static site generation of the index page.
    distill_path('', views.index, name='index', distill_func=get_index),
    
    # API endpoints remain dynamic.
    path('api/songs/', views.get_all_songs, name='get_all_songs'),
    path('api/songs/<str:song_id>/', views.get_song_file, name='get_song_file'),
    path('api/directories/add/', views.add_scan_directory, name='add_scan_directory'),
]
