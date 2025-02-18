from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from .models import ScanDirectory
from .utils import scan_for_mp3s
import json
import os

def index(request):
    """Main view for the music player"""
    directories = ScanDirectory.objects.values_list('path', flat=True)
    songs = scan_for_mp3s(directories)
    
    context = {
        'songs': songs,
    }
    return render(request, 'player/index.html', context)

def get_all_songs(request):
    """API endpoint to get all songs"""
    directories = ScanDirectory.objects.values_list('path', flat=True)
    songs = scan_for_mp3s(directories)
    return JsonResponse({'songs': songs})

def get_song_file(request, song_id):
    """Stream the MP3 file with HTTP Range support"""
    directories = ScanDirectory.objects.values_list('path', flat=True)
    songs = scan_for_mp3s(directories)
    
    for song in songs:
        if song['id'] == song_id:
            file_path = song['path']
            if os.path.exists(file_path):
                file_size = os.path.getsize(file_path)
                range_header = request.META.get('HTTP_RANGE', '').strip()
                
                if range_header:
                    import re
                    range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
                    if range_match:
                        start = int(range_match.group(1))
                        end_str = range_match.group(2)
                        end = int(end_str) if end_str else file_size - 1
                        length = end - start + 1

                        with open(file_path, 'rb') as file:
                            file.seek(start)
                            data = file.read(length)

                        response = HttpResponse(data, status=206, content_type='audio/mpeg')
                        response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
                        response['Content-Length'] = str(length)
                        response['Accept-Ranges'] = 'bytes'
                        response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
                        return response

                with open(file_path, 'rb') as file:
                    data = file.read()
                response = HttpResponse(data, content_type='audio/mpeg')
                response['Content-Length'] = str(file_size)
                response['Accept-Ranges'] = 'bytes'
                response['Content-Disposition'] = f'inline; filename="{os.path.basename(file_path)}"'
                return response

    return HttpResponse(status=404)

def add_scan_directory(request):
    """Add a new directory to scan"""
    if request.method == 'POST':
        data = json.loads(request.body)
        directory = data.get('directory', '')
        if os.path.exists(directory) and os.path.isdir(directory):
            ScanDirectory.objects.get_or_create(path=directory)
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'error': 'Invalid directory path'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})
