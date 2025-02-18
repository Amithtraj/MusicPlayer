import os
import glob
import hashlib  # For deterministic hash
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC
import base64
from django.conf import settings
import time

def scan_for_mp3s(directories=None):
    """Scan specified directories or default music directories for MP3 files"""
    
    if not directories:
        # Default directories to scan on different operating systems
        if os.name == 'nt':  # Windows
            music_dirs = [
                os.path.join(os.environ['USERPROFILE'], 'Music'),
                os.path.join(os.environ['USERPROFILE'], 'Downloads')
            ]
        else:  # macOS/Linux
            music_dirs = [
                os.path.expanduser('~/Music'),
                os.path.expanduser('~/Downloads')
            ]
    else:
        music_dirs = directories
    
    # Use a dictionary to store songs by their deterministic ID to prevent duplicates.
    unique_songs = {}
    
    for directory in music_dirs:
        if os.path.exists(directory):
            # Find all MP3 files in the directory and its subdirectories
            mp3_pattern = os.path.join(directory, '**', '*.mp3')
            mp3_files = glob.glob(mp3_pattern, recursive=True)
            
            for mp3_file in mp3_files:
                try:
                    # Get basic metadata
                    audio = MP3(mp3_file)
                    
                    # Generate a deterministic ID based on the file path.
                    song_id = hashlib.md5(mp3_file.encode('utf-8')).hexdigest()
                    
                    # Skip if this song is already added
                    if song_id in unique_songs:
                        continue
                    
                    # Initialize with default values
                    song_info = {
                        'id': song_id,
                        'path': mp3_file,
                        'title': os.path.basename(mp3_file).replace('.mp3', ''),
                        'artist': 'Unknown Artist',
                        'album': 'Unknown Album',
                        'duration': int(audio.info.length),
                        'cover_image': None
                    }
                    
                    # Try to get ID3 tags if available
                    try:
                        id3 = ID3(mp3_file)
                        
                        # Get title
                        if id3.get('TIT2'):
                            song_info['title'] = str(id3['TIT2'])
                        
                        # Get artist
                        if id3.get('TPE1'):
                            song_info['artist'] = str(id3['TPE1'])
                        
                        # Get album
                        if id3.get('TALB'):
                            song_info['album'] = str(id3['TALB'])
                        
                        # Get cover art if available
                        if id3.get('APIC:'):
                            artwork = id3['APIC:'].data
                            song_info['cover_image'] = f"data:image/jpeg;base64,{base64.b64encode(artwork).decode('utf-8')}"
                    except Exception:
                        # If there's an error reading ID3 tags, just use the defaults
                        pass
                    
                    unique_songs[song_id] = song_info
                except Exception:
                    # Skip files that can't be processed
                    continue
    
    # Return a list of unique songs
    return list(unique_songs.values())
