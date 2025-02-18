document.addEventListener('DOMContentLoaded', function() {
    // ------------------------------
    // DOM Elements
    // ------------------------------
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const volumeControl = document.getElementById('volume');
    const progress = document.getElementById('progress');
    const progressBar = document.querySelector('.progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const songTitle = document.getElementById('song-title');
    const songArtist = document.getElementById('song-artist');
    const songAlbum = document.getElementById('song-album');
    const coverImage = document.getElementById('cover-image');
    const songList = document.getElementById('song-list');
    const searchInput = document.getElementById('search-input');
    const refreshBtn = document.getElementById('refresh-btn');
    const addDirectoryBtn = document.getElementById('add-directory-btn');
    const directoryModal = document.getElementById('directory-modal');
    const closeModalBtn = document.querySelector('.close');
    const saveDirectoryBtn = document.getElementById('save-directory-btn');
    const directoryPathInput = document.getElementById('directory-path');
    const directoryError = document.getElementById('directory-error');

    // New UI elements for mood & recommendation
    const songMoodEl = document.getElementById('song-mood');
    const recommendationBtn = document.getElementById('recommendation-btn');
    const nextSongTitleEl = document.getElementById('next-song-title');

    // Online search elements
    const loadOnlineBtn = document.getElementById('load-online-btn');
    const searchOnlineInput = document.getElementById('online-search-input');
    const searchOnlineBtn = document.getElementById('search-online-btn');

    // Visualization elements
    const toggleVisualisationBtn = document.getElementById('toggle-visualisation');
    const fullscreenVisualisationBtn = document.getElementById('fullscreen-visualisation-btn');
    const visualisationSelect = document.getElementById('visualisation-select');
    const visualiserCanvas = document.getElementById('visualiser');
    const canvasCtx = visualiserCanvas.getContext('2d');

    // ------------------------------
    // Global State
    // ------------------------------
    let songs = Array.from(document.querySelectorAll('.song-item'));
    let currentSongIndex = -1;
    let isPlaying = false;
    let visualisationEnabled = false;
    let currentVisualisationMode = visualisationSelect.value; // e.g., "fractal"

    // Set initial volume
    audioPlayer.volume = volumeControl.value;

    // ------------------------------
    // High-Quality Visualization Setup
    // ------------------------------
    // Define a constant for the CSS height (this value will be used in drawing)
    const canvasCSSHeight = 400;
    function resizeCanvas() {
        // Get container width to match the rest of the elements
        const container = document.querySelector('.container');
        if (container) {
            const dpr = window.devicePixelRatio || 1;
            const rect = container.getBoundingClientRect();
            visualiserCanvas.style.width = '100%';
            visualiserCanvas.style.height = canvasCSSHeight + 'px';
            visualiserCanvas.width = rect.width * dpr;
            visualiserCanvas.height = canvasCSSHeight * dpr;
            // Scale context for high DPI
            canvasCtx.scale(dpr, dpr);
        }
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Set up AudioContext, source, and analyser
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sourceNode = audioContext.createMediaElementSource(audioPlayer);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512; // Higher FFT size for improved detail
    const bufferLength = analyser.frequencyBinCount; // 256 bins
    const dataArray = new Uint8Array(bufferLength);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);

    // ------------------------------
    // Player Event Listeners
    // ------------------------------
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    volumeControl.addEventListener('input', setVolume);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    progressBar.addEventListener('click', setProgress);
    audioPlayer.addEventListener('ended', playNext);
    searchInput.addEventListener('input', filterSongs);
    refreshBtn.addEventListener('click', refreshLibrary);

    // Modal Event Listeners
    addDirectoryBtn.addEventListener('click', openDirectoryModal);
    closeModalBtn.addEventListener('click', closeDirectoryModal);
    window.addEventListener('click', function(event) {
        if (event.target == directoryModal) closeDirectoryModal();
    });
    saveDirectoryBtn.addEventListener('click', saveDirectory);

    // ------------------------------
    // Online Songs Loading & Search
    // ------------------------------
    loadOnlineBtn.addEventListener('click', function() {
        console.log("Load Online Songs button clicked");
        fetchOnlineSongs();
    });
    
    searchOnlineBtn.addEventListener('click', function() {
        const query = searchOnlineInput.value.trim();
        console.log("Searching online songs for:", query);
        fetchOnlineSongs(query);
    });
    
    function fetchOnlineSongs(query = '') {
        const url = query ? `/api/online-songs/?query=${encodeURIComponent(query)}` : '/api/online-songs/';
        fetch(url)
            .then(response => response.json())
            .then(data => {
                console.log("Received online songs data:", data);
                const songList = document.getElementById('song-list');
                songList.innerHTML = '';
                if (data.online_songs && data.online_songs.length > 0) {
                    data.online_songs.forEach(song => {
                        const tr = document.createElement('tr');
                        tr.className = 'song-item';
                        // Mark online songs by prefixing the id
                        tr.setAttribute('data-id', 'online-' + song.id);
                        tr.setAttribute('data-title', song.title);
                        tr.setAttribute('data-artist', song.artist);
                        tr.setAttribute('data-album', song.album);
                        tr.setAttribute('data-duration', song.duration);
                        tr.setAttribute('data-cover', song.cover_image);
                        tr.setAttribute('data-audio-url', song.audio_url);
                        tr.innerHTML = `
                            <td>${song.title}</td>
                            <td>${song.artist}</td>
                            <td>${song.album}</td>
                            <td>${formatTime(song.duration)}</td>
                        `;
                        songList.appendChild(tr);
                    });
                    songs = Array.from(document.querySelectorAll('.song-item'));
                    attachSongListeners();
                } else {
                    songList.innerHTML = '<tr><td colspan="4">No online songs found.</td></tr>';
                }
            })
            .catch(error => {
                console.error('Error fetching online songs:', error);
            });
    }

    // ------------------------------
    // Playback Functions
    // ------------------------------
    function togglePlay() {
        if (!audioPlayer.src) return;
        if (isPlaying) {
            audioPlayer.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        } else {
            audioPlayer.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
        isPlaying = !isPlaying;
    }
    
    function playPrevious() {
        if (songs.length === 0) return;
        currentSongIndex = (currentSongIndex > 0) ? currentSongIndex - 1 : songs.length - 1;
        playSong(currentSongIndex);
    }
    
    function playNext() {
        if (songs.length === 0) return;
        currentSongIndex = (currentSongIndex < songs.length - 1) ? currentSongIndex + 1 : 0;
        playSong(currentSongIndex);
    }
    
    function setVolume() {
        audioPlayer.volume = volumeControl.value;
    }
    
    function updateProgress() {
        const { currentTime, duration } = audioPlayer;
        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;
        currentTimeEl.textContent = formatTime(currentTime);
        durationEl.textContent = formatTime(duration);
    }
    
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audioPlayer.duration;
        audioPlayer.currentTime = (clickX / width) * duration;
    }
    
    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' + sec : sec}`;
    }
    
    // Updated playSong: handles both local and online songs.
    function playSong(index) {
        if (index < 0 || index >= songs.length) return;
        const song = songs[index];
        const songId = song.getAttribute('data-id');
        const title = song.getAttribute('data-title');
        const artist = song.getAttribute('data-artist');
        const album = song.getAttribute('data-album');
        const cover = song.getAttribute('data-cover');
        const audioUrl = song.getAttribute('data-audio-url'); // Present for online songs

        // Update UI for song info
        songTitle.textContent = title;
        songArtist.textContent = artist;
        songAlbum.textContent = album;
        coverImage.src = cover ? cover : '/static/player/img/default-cover.jpg';

        // Mark song as active in the list
        songs.forEach(s => s.classList.remove('active'));
        song.classList.add('active');

        // Set audio source:
        if (audioUrl) {
            // Use the proxy endpoint to bypass CORS issues for online songs
            audioPlayer.src = `/api/proxy-audio/?url=${encodeURIComponent(audioUrl)}`;
        } else {
            audioPlayer.src = `/api/songs/${songId}/`;
        }
        console.log("Playing song:", title, "from URL:", audioPlayer.src);
        audioPlayer.play().then(() => {
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            if (!audioUrl) {
                // For local songs, fetch mood and recommendation via API endpoints
                fetch(`/api/songs/${songId}/classify/`)
                  .then(response => response.json())
                  .then(data => {
                      songMoodEl.textContent = data.mood ? `Mood: ${data.mood}` : 'Mood: Unknown';
                  })
                  .catch(err => {
                      console.error('Error classifying mood:', err);
                      songMoodEl.textContent = 'Mood: Error';
                  });
                fetch(`/api/songs/${songId}/recommend/`)
                  .then(response => response.json())
                  .then(data => {
                      nextSongTitleEl.textContent = data.recommended_song ? data.recommended_song.title : 'None';
                  })
                  .catch(err => {
                      console.error('Error fetching recommendation:', err);
                      nextSongTitleEl.textContent = 'Error';
                  });
            } else {
                // For online songs, set next recommendation as next song in list (cyclic)
                let nextIndex = (currentSongIndex + 1) % songs.length;
                let nextOnlineSong = songs[nextIndex];
                nextSongTitleEl.textContent = nextOnlineSong ? nextOnlineSong.getAttribute('data-title') : 'None';
                songMoodEl.textContent = '';
            }
        }).catch(error => {
            console.error('Error playing song:', error);
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        currentSongIndex = index;
    }
    
    function filterSongs() {
        const query = searchInput.value.toLowerCase();
        songs.forEach(song => {
            const title = song.getAttribute('data-title').toLowerCase();
            const artist = song.getAttribute('data-artist').toLowerCase();
            const album = song.getAttribute('data-album').toLowerCase();
            song.style.display = (title.includes(query) || artist.includes(query) || album.includes(query)) ? '' : 'none';
        });
    }
    
    function refreshLibrary() {
        fetch('/api/songs/')
            .then(response => response.json())
            .then(data => {
                songList.innerHTML = '';
                if (data.songs.length > 0) {
                    data.songs.forEach(song => {
                        const tr = document.createElement('tr');
                        tr.className = 'song-item';
                        tr.setAttribute('data-id', song.id);
                        tr.setAttribute('data-path', song.path);
                        tr.setAttribute('data-title', song.title);
                        tr.setAttribute('data-artist', song.artist);
                        tr.setAttribute('data-album', song.album);
                        tr.setAttribute('data-duration', song.duration);
                        if (song.cover_image) {
                            tr.setAttribute('data-cover', song.cover_image);
                        }
                        if (song.mood) {
                            tr.setAttribute('data-mood', song.mood);
                        }
                        tr.innerHTML = `
                            <td>${song.title}</td>
                            <td>${song.artist}</td>
                            <td>${song.album}</td>
                            <td>${formatTime(song.duration)}</td>
                        `;
                        songList.appendChild(tr);
                    });
                } else {
                    const tr = document.createElement('tr');
                    tr.innerHTML = '<td colspan="4">No songs found. Add directories to scan.</td>';
                    songList.appendChild(tr);
                }
                songs = Array.from(document.querySelectorAll('.song-item'));
                attachSongListeners();
            })
            .catch(error => {
                console.error('Error refreshing library:', error);
            });
    }
    
    function attachSongListeners() {
        document.querySelectorAll('.song-item').forEach((item, index) => {
            item.addEventListener('click', function() {
                playSong(index);
            });
        });
    }
    
    function openDirectoryModal() {
        directoryModal.style.display = 'block';
    }
    
    function closeDirectoryModal() {
        directoryModal.style.display = 'none';
        directoryPathInput.value = '';
        directoryError.textContent = '';
    }
    
    function saveDirectory() {
        const directoryPath = directoryPathInput.value.trim();
        if (!directoryPath) {
            directoryError.textContent = 'Please enter a directory path';
            return;
        }
        fetch('/api/directories/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ directory: directoryPath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                closeDirectoryModal();
                refreshLibrary();
            } else {
                directoryError.textContent = data.error || 'Error adding directory';
            }
        })
        .catch(error => {
            console.error('Error adding directory:', error);
            directoryError.textContent = 'Error adding directory';
        });
    }
    
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    // ------------------------------
    // High-Quality Visualization Functions
    // ------------------------------
    function drawFractalVisualisation() {
        requestAnimationFrame(drawVisualisation);
        analyser.getByteFrequencyData(dataArray);
        const avgAmplitude = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        // Clear with a trailing effect using the canvasCSSHeight constant
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        canvasCtx.fillRect(0, 0, visualiserCanvas.width, canvasCSSHeight);
        canvasCtx.save();
        // Translate to the center-bottom of the canvas (using canvasCSSHeight)
        canvasCtx.translate(visualiserCanvas.width / 2, canvasCSSHeight);
        const initialLength = 100 + (avgAmplitude / 255) * 200;
        const maxDepth = 8;
        const baseBranchAngle = (15 + (avgAmplitude / 255) * 30) * (Math.PI / 180);
        drawFractalTree(0, 0, initialLength, -Math.PI / 2, maxDepth, baseBranchAngle);
        canvasCtx.restore();
    }

    function drawFractalTree(x, y, length, angle, depth, baseAngle) {
        if (depth === 0) return;
        const x2 = x + length * Math.cos(angle);
        const y2 = y + length * Math.sin(angle);
        const hue = (360 * depth / 8 + Math.random() * 30) % 360;
        canvasCtx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        canvasCtx.lineWidth = depth;
        canvasCtx.beginPath();
        canvasCtx.moveTo(x, y);
        canvasCtx.lineTo(x2, y2);
        canvasCtx.stroke();
        const randomOffset = (Math.random() - 0.5) * 0.3;
        drawFractalTree(x2, y2, length * 0.7, angle - baseAngle + randomOffset, depth - 1, baseAngle);
        drawFractalTree(x2, y2, length * 0.7, angle + baseAngle + randomOffset, depth - 1, baseAngle);
    }

    function drawBarsVisualisation() {
        requestAnimationFrame(drawVisualisation);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, visualiserCanvas.width, canvasCSSHeight);
        const barWidth = (visualiserCanvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i];
            const hue = (i / bufferLength) * 360;
            canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            canvasCtx.fillRect(x, canvasCSSHeight - barHeight / 2, barWidth, barHeight / 2);
            x += barWidth + 1;
        }
    }

    function drawWaveformVisualisation() {
        requestAnimationFrame(drawVisualisation);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.clearRect(0, 0, visualiserCanvas.width, canvasCSSHeight);
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        canvasCtx.fillRect(0, 0, visualiserCanvas.width, canvasCSSHeight);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'lime';
        canvasCtx.beginPath();
        const sliceWidth = visualiserCanvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvasCSSHeight / 2;
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        canvasCtx.lineTo(visualiserCanvas.width, canvasCSSHeight / 2);
        canvasCtx.stroke();
    }

    let particles = [];
    function initParticles() {
        particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * visualiserCanvas.width,
                y: Math.random() * canvasCSSHeight,
                r: Math.random() * 4 + 1,
                dx: (Math.random() - 0.5) * 2,
                dy: (Math.random() - 0.5) * 2
            });
        }
    }
    initParticles();
    function drawParticlesVisualisation() {
        requestAnimationFrame(drawVisualisation);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.clearRect(0, 0, visualiserCanvas.width, canvasCSSHeight);
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        canvasCtx.fillRect(0, 0, visualiserCanvas.width, canvasCSSHeight);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > visualiserCanvas.width) p.dx = -p.dx;
            if (p.y < 0 || p.y > canvasCSSHeight) p.dy = -p.dy;
            canvasCtx.beginPath();
            canvasCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            canvasCtx.fillStyle = `hsl(${(dataArray[i % bufferLength] / 255) * 360}, 100%, 50%)`;
            canvasCtx.fill();
        }
    }

    function drawVisualisation() {
        if (!visualisationEnabled) return;
        switch (currentVisualisationMode) {
            case 'fractal':
                drawFractalVisualisation();
                break;
            case 'bars':
                drawBarsVisualisation();
                break;
            case 'wave':
                drawWaveformVisualisation();
                break;
            case 'particles':
                drawParticlesVisualisation();
                break;
            default:
                drawFractalVisualisation();
        }
    }

    // ------------------------------
    // Visualization UI Controls
    // ------------------------------
    toggleVisualisationBtn.addEventListener('click', function() {
        visualisationEnabled = !visualisationEnabled;
        if (visualisationEnabled) {
            visualiserCanvas.style.display = 'block';
            if (audioContext.state === 'suspended') audioContext.resume();
            drawVisualisation();
        } else {
            visualiserCanvas.style.display = 'none';
        }
    });

    visualisationSelect.addEventListener('change', function() {
        currentVisualisationMode = this.value;
    });

    fullscreenVisualisationBtn.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            if (visualiserCanvas.requestFullscreen) {
                visualiserCanvas.requestFullscreen();
            } else if (visualiserCanvas.mozRequestFullScreen) {
                visualiserCanvas.mozRequestFullScreen();
            } else if (visualiserCanvas.webkitRequestFullscreen) {
                visualiserCanvas.webkitRequestFullscreen();
            } else if (visualiserCanvas.msRequestFullscreen) {
                visualiserCanvas.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
});
