document.addEventListener('DOMContentLoaded', function() {
    // DOM elements (existing)
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

    // Visualization elements (new)
    const toggleVisualisationBtn = document.getElementById('toggle-visualisation');
    const fullscreenVisualisationBtn = document.getElementById('fullscreen-visualisation-btn');
    const visualisationSelect = document.getElementById('visualisation-select');
    const visualiserCanvas = document.getElementById('visualiser');
    const canvasCtx = visualiserCanvas.getContext('2d');

    // Player & visualization state
    let songs = Array.from(document.querySelectorAll('.song-item'));
    let currentSongIndex = -1;
    let isPlaying = false;
    let visualisationEnabled = false;
    
    // Visualization mode (preset selector)
    let currentVisualisationMode = visualisationSelect.value; // e.g., "fractal"

    // Set initial volume
    audioPlayer.volume = volumeControl.value;

    // Player event listeners (existing)
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    volumeControl.addEventListener('input', setVolume);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    progressBar.addEventListener('click', setProgress);
    audioPlayer.addEventListener('ended', playNext);
    searchInput.addEventListener('input', filterSongs);
    refreshBtn.addEventListener('click', refreshLibrary);

    // Modal event listeners (existing)
    addDirectoryBtn.addEventListener('click', openDirectoryModal);
    closeModalBtn.addEventListener('click', closeDirectoryModal);
    window.addEventListener('click', function(event) {
        if (event.target == directoryModal) closeDirectoryModal();
    });
    saveDirectoryBtn.addEventListener('click', saveDirectory);

    // Attach song listeners (existing)
    attachSongListeners();

    // ------------------------------
    // Audio Player Functions (existing)
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
    
    function playSong(index) {
        if (index < 0 || index >= songs.length) return;
        const song = songs[index];
        const songId = song.getAttribute('data-id');
        const title = song.getAttribute('data-title');
        const artist = song.getAttribute('data-artist');
        const album = song.getAttribute('data-album');
        const cover = song.getAttribute('data-cover');
        
        document.getElementById('song-title').textContent = title;
        document.getElementById('song-artist').textContent = artist;
        document.getElementById('song-album').textContent = album;
        if (cover) {
            document.getElementById('cover-image').src = cover;
        } else {
            document.getElementById('cover-image').src = '/static/player/img/default-cover.jpg';
        }
        
        songs.forEach(s => s.classList.remove('active'));
        song.classList.add('active');
        
        audioPlayer.src = `/api/songs/${songId}/`;
        audioPlayer.play().then(() => {
            isPlaying = true;
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
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
    // Visualization Setup
    // ------------------------------
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sourceNode = audioContext.createMediaElementSource(audioPlayer);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);

    // ------------------------------
    // Visualization Functions (Presets)
    // ------------------------------

    // Fractal visualization preset
    function drawFractalVisualisation() {
        requestAnimationFrame(drawVisualisation);
        analyser.getByteFrequencyData(dataArray);
        const avgAmplitude = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        canvasCtx.fillRect(0, 0, visualiserCanvas.width, visualiserCanvas.height);
        canvasCtx.save();
        canvasCtx.translate(visualiserCanvas.width / 2, visualiserCanvas.height);
        const initialLength = visualiserCanvas.height / 4 + (avgAmplitude / 255) * 150;
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

    // Bars visualization preset
    function drawBarsVisualisation() {
        requestAnimationFrame(drawVisualisation);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, visualiserCanvas.width, visualiserCanvas.height);
        const barWidth = (visualiserCanvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i];
            const hue = (i / bufferLength) * 360;
            canvasCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            canvasCtx.fillRect(x, visualiserCanvas.height - barHeight / 2, barWidth, barHeight / 2);
            x += barWidth + 1;
        }
    }

    // Waveform visualization preset (example)
    function drawWaveformVisualisation() {
        requestAnimationFrame(drawVisualisation);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        canvasCtx.fillRect(0, 0, visualiserCanvas.width, visualiserCanvas.height);
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'lime';
        canvasCtx.beginPath();
        const sliceWidth = visualiserCanvas.width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * visualiserCanvas.height / 2;
            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        canvasCtx.lineTo(visualiserCanvas.width, visualiserCanvas.height / 2);
        canvasCtx.stroke();
    }

    // Particles visualization preset (simple example)
    let particles = [];
    function initParticles() {
        particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * visualiserCanvas.width,
                y: Math.random() * visualiserCanvas.height,
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
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        canvasCtx.fillRect(0, 0, visualiserCanvas.width, visualiserCanvas.height);
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > visualiserCanvas.width) p.dx = -p.dx;
            if (p.y < 0 || p.y > visualiserCanvas.height) p.dy = -p.dy;
            canvasCtx.beginPath();
            canvasCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            canvasCtx.fillStyle = `hsl(${(dataArray[i % bufferLength] / 255) * 360}, 100%, 50%)`;
            canvasCtx.fill();
        }
    }

    // Main visualization function that calls the preset based on selection
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
