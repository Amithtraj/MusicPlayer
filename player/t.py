import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from player.audio_classifier import classify_mood
mood = classify_mood("D:\\Amith\\Misc\\Psyvis\\Demo.mp3")


print(mood)
