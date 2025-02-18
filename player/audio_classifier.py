import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
import librosa
import os
import csv

# Load YAMNet model from TensorFlow Hub
YAMNET_MODEL_HANDLE = "https://tfhub.dev/google/yamnet/1"
yamnet_model = hub.load(YAMNET_MODEL_HANDLE)

# Define a custom mapping from YAMNet class indices to mood categories.
# These indices are illustrative. You may adjust these mappings after reviewing the YAMNet classes.
mood_mapping = {
    "Happy": [42, 44, 60],       # e.g., "Laughter", "Cheering", "Clapping"
    "Sad": [16, 47],             # e.g., "Sobbing", "Weeping"
    "Energetic": [50, 76],       # e.g., "Shouting", "Drums"
    "Calm": [1, 10, 38]          # e.g., "Silence", "Ambient sounds", "Wind"
}

def load_class_names_from_csv(csv_path):
    """
    Load class names from a CSV file.
    The CSV is expected to have a header and three columns:
    index, mid, display_name.
    Returns a list of display names.
    """
    class_names = []
    with open(csv_path, "r", newline="") as f:
        reader = csv.reader(f)
        next(reader)  # skip header row
        for row in reader:
            # row[2] should contain the display_name; remove any extra quotes.
            class_names.append(row[2].strip('"'))
    return class_names

# Build the absolute path to the CSV file (assumes it's in the same directory as this module)
current_dir = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(current_dir, "yamnet_class_map.csv")

# Load the class names (should be 521 items)
class_names = load_class_names_from_csv(CSV_PATH)

def classify_mood(audio_path):
    """
    Use YAMNet to classify the mood of the audio file.
    Returns a mood string (e.g., "Happy", "Sad", "Energetic", or "Calm").
    """
    # Load audio file: convert to mono, 16kHz sampling rate
    waveform, sr = librosa.load(audio_path, sr=16000)
    waveform = np.array(waveform, dtype=np.float32)
    
    # Run inference using YAMNet
    scores, embeddings, spectrogram = yamnet_model(waveform)
    mean_scores = np.mean(scores.numpy(), axis=0)  # shape: (num_classes,)
    
    # Get indices of the top 5 classes based on the mean scores
    top_indices = np.argsort(mean_scores)[-5:]
    
    # Build a list of top labels (defensive check to ensure valid indices)
    top_labels = []
    for i in top_indices:
        if i < len(class_names):
            top_labels.append(class_names[i])
        else:
            top_labels.append("Unknown")
    
    # Accumulate votes for each mood category using our custom mapping
    mood_votes = {"Happy": 0, "Sad": 0, "Energetic": 0, "Calm": 0}
    for idx in top_indices:
        for mood, indices in mood_mapping.items():
            if idx in indices:
                mood_votes[mood] += mean_scores[idx]
    
    # Choose the mood with the highest accumulated score
    predicted_mood = max(mood_votes, key=mood_votes.get)
    return predicted_mood