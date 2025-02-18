from django.shortcuts import render
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from .models import ScanDirectory
from .utils import scan_for_mp3s
import json
import os
import requests

# Import the mood classification helper
from .audio_classifier import classify_mood

def index(request):
    """Main view for the music player"""
    directories = ScanDirectory.objects.values_list('path', flat=True)
    songs = scan_for_mp3s(directories)
    context = {
        'songs': songs,
    }
    return render(request, 'player/index.html', context)

def get_all_songs(request):
    """API endpoint to get all local songs"""
    directories = ScanDirectory.objects.values_list('path', flat=True)
    songs = scan_for_mp3s(directories)
    return JsonResponse({'songs': songs})

def get_song_file(request, song_id):
    """Stream a local MP3 file with HTTP Range support."""
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
    """Add a new directory to scan for local MP3 files."""
    if request.method == 'POST':
        data = json.loads(request.body)
        directory = data.get('directory', '')
        if os.path.exists(directory) and os.path.isdir(directory):
            ScanDirectory.objects.get_or_create(path=directory)
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'error': 'Invalid directory path'})
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

# ---------------------------
# Online Songs Endpoint (Jamendo)
# ---------------------------
# Your Jamendo API credentials:
JAMENDO_CLIENT_ID = "74df61b9"
JAMENDO_CLIENT_SECRET = "765d6617a6dce63c34d464011ebff81e"
JAMENDO_API_URL = "https://api.jamendo.com/v3.0/tracks"

def get_online_songs(request):
    """
    Fetch free online songs from Jamendo using your API credentials.
    Accepts an optional 'query' GET parameter to search for songs.
    Returns a JSON object with a list of songs.
    """
    query = request.GET.get('query', '')
    params = {
        "client_id": JAMENDO_CLIENT_ID,
        "client_secret": JAMENDO_CLIENT_SECRET,
        "format": "json",
        "limit": 20,  # Adjust as needed.
        "order": "popularity_total",
    }
    if query:
        params["name"] = query  # Filter tracks by name

    response = requests.get(JAMENDO_API_URL, params=params)
    if response.status_code == 200:
        data = response.json()
        tracks = []
        for track in data.get("results", []):
            tracks.append({
                "id": track["id"],
                "title": track["name"],
                "artist": track["artist_name"],
                "album": track.get("album_name", ""),
                "duration": int(track.get("duration", 0)),
                "audio_url": track.get("audio"),  # Direct URL for playback
                "cover_image": track.get("image"),  # Artwork URL
            })
        return JsonResponse({"online_songs": tracks})
    else:
        return JsonResponse({"error": "Unable to fetch online songs"}, status=500)


# ---------------------------
# AI-Powered Endpoints
# ---------------------------
def classify_song(request, song_id):
    """
    API endpoint to classify the mood of a local song using a pre-trained model.
    Returns a predicted mood label.
    """
    directories = ScanDirectory.objects.values_list('path', flat=True)
    songs = scan_for_mp3s(directories)
    file_path = None
    for song in songs:
        if song['id'] == song_id:
            file_path = song['path']
            break
    if file_path and os.path.exists(file_path):
        try:
            mood = classify_mood(file_path)
            return JsonResponse({'mood': mood})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return HttpResponse(status=404)

def recommend_song(request, song_id):
    """
    API endpoint to recommend the next local song based on the current song's mood.
    If no song with the same mood is found, it falls back to the next available song.
    """
    directories = ScanDirectory.objects.values_list('path', flat=True)
    songs = scan_for_mp3s(directories)
    current_song = None
    for song in songs:
        if song['id'] == song_id:
            current_song = song
            break
    if not current_song:
        return HttpResponse(status=404)
    # Try to obtain the mood from the song data; if missing, classify on the fly.
    current_mood = current_song.get('mood', None)
    if not current_mood:
        try:
            current_mood = classify_mood(current_song['path'])
        except Exception:
            current_mood = None
    # Find another song with the same mood.
    recommended = None
    if current_mood:
        for song in songs:
            if song['id'] != song_id and song.get('mood', None) == current_mood:
                recommended = song
                break
    # Fallback: choose the next song in the list if no matching mood found.
    if not recommended and songs:
        for song in songs:
            if song['id'] != song_id:
                recommended = song
                break
    return JsonResponse({'recommended_song': recommended})


def proxy_audio(request):
    """
    Proxy the audio from a given URL to bypass CORS restrictions.
    Expects a query parameter 'url' containing the target audio URL.
    """
    target_url = request.GET.get('url')
    if not target_url:
        return HttpResponse("No URL provided", status=400)

    try:
        # Stream the audio from the target URL
        r = requests.get(target_url, stream=True)
    except Exception as e:
        return HttpResponse(f"Error fetching audio: {e}", status=500)

    if r.status_code != 200:
        return HttpResponse(f"Error fetching audio: {r.status_code}", status=r.status_code)

    # Create a streaming response
    response = StreamingHttpResponse(r.iter_content(chunk_size=8192), content_type=r.headers.get('Content-Type', 'audio/mpeg'))
    response['Content-Length'] = r.headers.get('Content-Length', '')
    # Add CORS header
    response['Access-Control-Allow-Origin'] = '*'
    return response
