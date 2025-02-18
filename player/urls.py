from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/songs/', views.get_all_songs, name='get_all_songs'),
    path('api/songs/<str:song_id>/', views.get_song_file, name='get_song_file'),
    path('api/songs/<str:song_id>/classify/', views.classify_song, name='classify_song'),
    path('api/songs/<str:song_id>/recommend/', views.recommend_song, name='recommend_song'),
    path('api/directories/add/', views.add_scan_directory, name='add_scan_directory'),
    path('api/online-songs/', views.get_online_songs, name='get_online_songs'),
    path('api/proxy-audio/', views.proxy_audio, name='proxy_audio'),
]
