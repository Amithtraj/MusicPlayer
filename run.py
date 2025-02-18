import threading
import time
from django.core.management import call_command
import webview
import os
import sys

def start_django():
    # Ensure that static files are collected or configured properly
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "musicplayer.settings")
    # Run the Django development server on localhost at port 8000
    call_command('runserver', '127.0.0.1:8000')

if __name__ == '__main__':
    # Start Django in a daemon thread so that it stops when the app closes.
    django_thread = threading.Thread(target=start_django, daemon=True)
    django_thread.start()

    # Wait briefly to ensure the server has started (adjust delay if needed)
    time.sleep(2)

    # Create and start a webview window pointing to the Django server
    window = webview.create_window("Music Player", "http://127.0.0.1:8000", width=1200, height=800)
    webview.start()
