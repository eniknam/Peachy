// Open or create our offline database vault named 'BarbieDreamDB'
let db;
const dbRequest = indexedDB.open('BarbieDreamDB', 1);

dbRequest.onupgradeneeded = function(event) {
    const database = event.target.result;
    // Create separate storage shelves for audio, video, and books if they don't exist yet
    if (!database.objectStoreNames.contains('audios')) {
        database.createObjectStore('audios', { keyPath: 'id', autoIncrement: true });
    }
    if (!database.objectStoreNames.contains('videos')) {
        database.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
    }
    if (!database.objectStoreNames.contains('books')) {
        database.createObjectStore('books', { keyPath: 'id', autoIncrement: true });
    }
};

dbRequest.onsuccess = function(event) {
    db = event.target.result;
    console.log("Storage vault opened successfully! ✨");
    // Once open, count everything to update our home screen stats
    updateHomeCounters();
    // Render our library items lists
    loadLibrary('audios', 'listAudio');
    loadLibrary('videos', 'listVideo');
    loadLibrary('books', 'listBook');
};

dbRequest.onerror = function() {
    alert("Could not open the offline storage vault.");
};
// Function to count all files on the storage shelves and show them on the Home Page
function updateHomeCounters() {
    const stores = ['audios', 'videos', 'books'];
    const targets = ['countAudio', 'countVideo', 'countBook'];
    
    stores.forEach((storeName, index) => {
        if (!db) return;
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const countRequest = store.count();
        
        countRequest.onsuccess = function() {
            document.getElementById(targets[index]).textContent = countRequest.result;
        };
    });
}

// Universal function to save a file permanently inside our app's storage vault
function saveFileToDB(storeName, fileData, listElementId) {
    if (!db) return;
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    const addRequest = store.add(fileData);
    
    addRequest.onsuccess = function() {
        updateHomeCounters();
        loadLibrary(storeName, listElementId);
        console.log("File saved to permanent offline database!");
    };
    
    addRequest.onerror = function() {
        alert("Failed to copy file into long-term memory.");
    };
}
// File Upload Triggers (Converts your files into offline-storable objects)
document.getElementById('fileAudio').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let file of files) {
        const fileData = { name: file.name, blob: file };
        saveFileToDB('audios', fileData, 'listAudio');
    }
});

document.getElementById('fileVideo').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let file of files) {
        const fileData = { name: file.name, blob: file };
        saveFileToDB('videos', fileData, 'listVideo');
    }
});

document.getElementById('fileBook').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(evt) {
            const fileData = { name: file.name, text: evt.target.result };
            saveFileToDB('books', fileData, 'listBook');
        };
        reader.readAsText(file);
    }
});

// Function to pull saved files from the vault and show them in your lists
function loadLibrary(storeName, listElementId) {
    if (!db) return;
    const listElement = document.getElementById(listElementId);
    listElement.innerHTML = ''; // Clear old lists
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.openCursor();
    
    request.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            const item = cursor.value;
            const row = document.createElement('div');
            row.className = 'media-item';
            row.innerHTML = `<span>✨ ${item.name}</span>`;
            
            // Setup clicks depending on whether it's an audio, video, or book
            row.onclick = function() {
                if (storeName === 'audios') playAudioItem(item);
                if (storeName === 'videos') playVideoItem(item);
                if (storeName === 'books') openBookItem(item);
            };
            
            listElement.appendChild(row);
            cursor.continue();
        }
    };
}

// Search bar filtering logic for Audio, Video, and Books
function setupSearch(inputId, listId) {
    document.getElementById(inputId).addEventListener('input', function(e) {
        const filter = e.target.value.toLowerCase();
        const items = document.getElementById(listId).getElementsByClassName('media-item');
        for (let item of items) {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(filter) ? 'flex' : 'none';
        }
    });
}
setupSearch('searchAudio', 'listAudio');
setupSearch('searchVideo', 'listVideo');
setupSearch('searchBook', 'listBook');
// Create a hidden browser audio player element
const audioPlayer = new Audio();
// Tell the player to preserve original vocal pitch when changing speeds
audioPlayer.preservesPitch = true; 

let currentAudioId = null;
const audioTimeline = document.getElementById('audioTimeline');
const audioWheel = document.getElementById('audioWheel');

// Function to activate and play a selected music track
function playAudioItem(item) {
    currentAudioId = item.id;
    document.getElementById('currentAudioTitle').textContent = "🎵 " + item.name;
    
    // Convert the raw stored data blob into a temporary track link
    const trackUrl = URL.createObjectURL(item.blob);
    audioPlayer.src = trackUrl;
    
    // Set the speed to match whatever is selected in your dropdown menu
    audioPlayer.playbackRate = parseFloat(document.getElementById('speedAudio').value);
    
    // Check if we have a saved memory bookmark position for this track
    const storedTime = localStorage.getItem('audio_time_' + currentAudioId);
    
    audioPlayer.play().then(() => {
        if (storedTime) {
            audioPlayer.currentTime = parseFloat(storedTime);
        }
        audioWheel.classList.add('spinning');
        document.getElementById('btnAudioPlay').textContent = "⏸ Pause";
    });
}

// Keep the slider moving in sync with the audio track timeline
audioPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(audioPlayer.duration)) {
        audioTimeline.max = Math.floor(audioPlayer.duration);
        audioTimeline.value = Math.floor(audioPlayer.currentTime);
        
        // Quietly bookmark your current timestamp so you never lose your spot
        if (currentAudioId) {
            localStorage.setItem('audio_time_' + currentAudioId, audioPlayer.currentTime);
        }
    }
});

// Allow you to drag your finger across the slider to scrub through time
audioTimeline.addEventListener('input', () => {
    audioPlayer.currentTime = audioTimeline.value;
});

// Control Action Buttons for Audio
document.getElementById('btnAudioPlay').addEventListener('click', () => {
    if (!audioPlayer.src) return;
    if (audioPlayer.paused) {
        audioPlayer.play();
        audioWheel.classList.add('spinning');
        document.getElementById('btnAudioPlay').textContent = "⏸ Pause";
    } else {
        audioPlayer.pause();
        audioWheel.classList.remove('spinning');
        document.getElementById('btnAudioPlay').textContent = "▶ Play";
    }
});

document.getElementById('btnAudioStop').addEventListener('click', () => {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioWheel.classList.remove('spinning');
    document.getElementById('btnAudioPlay').textContent = "▶ Play";
});

document.getElementById('btnAudioRewind').addEventListener('click', () => {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
});

document.getElementById('btnAudioForward').addEventListener('click', () => {
    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
});

document.getElementById('speedAudio').addEventListener('change', (e) => {
    audioPlayer.playbackRate = parseFloat(e.target.value);
});
// Grab our video player elements from the layout screen
const videoPlayer = document.getElementById('mainVideoPlayer');
videoPlayer.preservesPitch = true; // Protects voice pitch from sounding weird at 2x/3x speeds

let currentVideoId = null;
const videoTimeline = document.getElementById('videoTimeline');

// Function to load and play a selected video clip
function playVideoItem(item) {
    currentVideoId = item.id;
    document.getElementById('currentVideoTitle').textContent = "🎬 " + item.name;
    
    const videoUrl = URL.createObjectURL(item.blob);
    videoPlayer.src = videoUrl;
    videoPlayer.playbackRate = parseFloat(document.getElementById('speedVideo').value);
    
    // Check if we have a saved memory checkpoint for this clip
    const storedTime = localStorage.getItem('video_time_' + currentVideoId);
    
    videoPlayer.play().then(() => {
        if (storedTime) {
            videoPlayer.currentTime = parseFloat(storedTime);
        }
        document.getElementById('btnVideoPlay').textContent = "⏸ Pause";
    });
}

// Keep the video progress slider perfectly synced with the clip playback time
videoPlayer.addEventListener('timeupdate', () => {
    if (!isNaN(videoPlayer.duration)) {
        videoTimeline.max = Math.floor(videoPlayer.duration);
        videoTimeline.value = Math.floor(videoPlayer.currentTime);
        
        // Save your timestamp memory position quietly in the background
        if (currentVideoId) {
            localStorage.setItem('video_time_' + currentVideoId, videoPlayer.currentTime);
        }
    }
});

// Drag your finger to move to any point on the video timeline
videoTimeline.addEventListener('input', () => {
    videoPlayer.currentTime = videoTimeline.value;
});

// Control Action Buttons for Video
document.getElementById('btnVideoPlay').addEventListener('click', () => {
    if (!videoPlayer.src) return;
    if (videoPlayer.paused) {
        videoPlayer.play();
        document.getElementById('btnVideoPlay').textContent = "⏸ Pause";
    } else {
        videoPlayer.pause();
        document.getElementById('btnVideoPlay').textContent = "▶ Play";
    }
});

document.getElementById('btnVideoStop').addEventListener('click', () => {
    videoPlayer.pause();
    videoPlayer.currentTime = 0;
    document.getElementById('btnVideoPlay').textContent = "▶ Play";
});

document.getElementById('btnVideoRewind').addEventListener('click', () => {
    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 10);
});

document.getElementById('btnVideoForward').addEventListener('click', () => {
    videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 10);
});

document.getElementById('speedVideo').addEventListener('change', (e) => {
    videoPlayer.playbackRate = parseFloat(e.target.value);
});
let currentBookId = null;
const bookViewer = document.getElementById('mainBookViewer');

// Function to open and load a selected book text file
function openBookItem(item) {
    currentBookId = item.id;
    document.getElementById('currentBookTitle').textContent = "📖 " + item.name;
    
    // Set the book content inside the scrollable display area
    bookViewer.innerText = item.text;
    
    // Check if we have a saved scroll position memory for this specific book
    const savedScrollPos = localStorage.getItem('book_scroll_' + currentBookId);
    if (savedScrollPos) {
        // Wait a tiny fraction of a second for text to render, then jump to your spot
        setTimeout(() => {
            bookViewer.scrollTop = parseInt(savedScrollPos);
        }, 50);
    }
}

// Track when you scroll through the book and bookmark your layout position
bookViewer.addEventListener('scroll', () => {
    if (currentBookId) {
        localStorage.setItem('book_scroll_' + currentBookId, bookViewer.scrollTop);
    }
});

// Font size magnifier controller adjustments (1x up to 5x text)
document.getElementById('zoomBook').addEventListener('change', (e) => {
    const scale = e.target.value;
    if (scale === "1") bookViewer.style.fontSize = "16px";
    if (scale === "2") bookViewer.style.fontSize = "24px";
    if (scale === "3") bookViewer.style.fontSize = "32px";
    if (scale === "4") bookViewer.style.fontSize = "40px";
    if (scale === "5") bookViewer.style.fontSize = "48px";
});

// Toggle Button for Reader Dark Mode / Day Mode theme
document.getElementById('btnBookTheme').addEventListener('click', () => {
    bookViewer.classList.toggle('dark-mode-reader');
    const isDark = bookViewer.classList.contains('dark-mode-reader');
    document.getElementById('btnBookTheme').textContent = isDark ? "Toggle Mode ☀️" : "Toggle Mode 🌙";
});
