class BaseMusicPlayer {
    constructor() {
        this.audioPlayer = null;
        this.currentSong = null;
        this.playlist = [];
        this.currentIndex = -1;
        this.playMode = 'list';
        this.isPlaying = false;
        this.currentLyrics = [];
        this.volume = 0.3;
        this.isMuted = false;
        this.previousVolume = 0.3;
        this.currentBlobUrl = null;

        this.playHistory = new PlayHistoryManager();
        this.favourites = new FavouriteManager();

        this.timerMinutes = 0;
        this.timerEndTime = null;
        this.timerInterval = null;

        try {
            this.audioCache = new AudioCache();
        } catch (e) {
            console.warn('AudioCache不可用:', e);
            this.audioCache = null;
        }

        this._historyIntercepted = false;
        this._audioUnlocked = false;
    }

    unlockAudio() {
        if (this._audioUnlocked || !this.audioPlayer) return;
        this._audioUnlocked = true;
        this.audioPlayer.play().then(() => {
            this.audioPlayer.pause();
        }).catch(() => {});
    }

    async loadAudio(song) {
        if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
        }

        if (this.audioCache) {
            try {
                const cached = await this.audioCache.get(song.id);
                if (cached) {
                    console.log('从缓存加载:', song.title);
                    this.currentBlobUrl = URL.createObjectURL(cached.blob);
                    this.audioPlayer.src = this.currentBlobUrl;
                    return;
                }
            } catch (e) {
                console.warn('缓存读取失败:', e);
            }
        }

        this.audioPlayer.src = song.mp3;

        if (this.audioCache) {
            this.cacheAudioInBackground(song);
        }
    }

    async cacheAudioInBackground(song) {
        try {
            const response = await fetch(song.mp3, { credentials: 'include' });
            const blob = await response.blob();
            await this.audioCache.set(song.id, blob);
            console.log('缓存完成:', song.title);
        } catch (e) {
            console.warn('缓存失败:', e);
        }
    }

    play() {
        if (!this.currentSong) return;

        this.audioPlayer.play().then(() => {
            this.isPlaying = true;
            this.onPlayStateChange(true);
        }).catch(error => {
            console.error('播放失败:', error);
            this.onError('播放失败，请检查音频文件');
        });
    }

    pause() {
        this.audioPlayer.pause();
        this.isPlaying = false;
        this.onPlayStateChange(false);
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audioPlayer.volume = this.volume;
        this.onVolumeChange(this.volume);
    }

    toggleMute() {
        if (this.isMuted) {
            this.volume = this.previousVolume;
            this.isMuted = false;
        } else {
            this.previousVolume = this.volume;
            this.volume = 0;
            this.isMuted = true;
        }
        this.audioPlayer.volume = this.volume;
        this.onVolumeChange(this.volume);
    }

    togglePlayMode() {
        const modes = ['list', 'random', 'single'];
        const currentModeIndex = modes.indexOf(this.playMode);
        this.playMode = modes[(currentModeIndex + 1) % modes.length];
        this.onPlayModeChange(this.playMode);
    }

    loadLyrics(lrcUrl) {
        if (!lrcUrl) {
            this.currentLyrics = [];
            return;
        }

        fetch(lrcUrl)
            .then(response => response.text())
            .then(text => {
                this.currentLyrics = MusicUtils.parseLyrics(text);
                this.onLyricsLoaded(this.currentLyrics);
            })
            .catch(error => {
                console.warn('歌词加载失败:', error);
                this.currentLyrics = [];
            });
    }

    getCurrentLyricIndex(currentTime) {
        if (!this.currentLyrics || this.currentLyrics.length === 0) return -1;

        for (let i = this.currentLyrics.length - 1; i >= 0; i--) {
            if (currentTime >= this.currentLyrics[i].time) {
                return i;
            }
        }
        return -1;
    }

    addToPlayHistory(song) {
        this.playHistory.add(song);
        this.onHistoryUpdate(this.playHistory.getAll());
    }

    toggleFavourite(song) {
        const isFavourite = this.favourites.toggle(song);
        this.onFavouriteUpdate(song.id, isFavourite);
        return isFavourite;
    }

    isFavourite(songId) {
        return this.favourites.exists(songId);
    }

    interceptGoBack() {
        if (this._historyIntercepted) return;
        this._historyIntercepted = true;
        history.pushState(null, '', location.href);
        window.addEventListener('popstate', () => {
            history.pushState(null, '', location.href);
        });
    }

    setTimer(minutes) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (minutes === 0) {
            this.timerMinutes = 0;
            this.timerEndTime = null;
            this.onTimerUpdate(0, null);
            return;
        }

        this.timerMinutes = minutes;
        this.timerEndTime = Date.now() + minutes * 60 * 1000;

        this.timerInterval = setInterval(() => {
            const remaining = this.timerEndTime - Date.now();

            if (remaining <= 0) {
                this.stopTimer();
                this.pause();
                this.onTimerEnd();
            } else {
                const remainingSeconds = Math.ceil(remaining / 1000);
                this.onTimerUpdate(remainingSeconds, this.timerEndTime);
            }
        }, 1000);

        this.onTimerUpdate(minutes * 60, this.timerEndTime);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.timerMinutes = 0;
        this.timerEndTime = null;
        this.onTimerUpdate(0, null);
    }

    getTimerRemaining() {
        if (!this.timerEndTime) return 0;
        return Math.max(0, Math.ceil((this.timerEndTime - Date.now()) / 60000));
    }

    showTimerOptions() {
        this.onShowTimerDialog();
    }

    onPlayStateChange(isPlaying) {}
    onVolumeChange(volume) {}
    onPlayModeChange(mode) {}
    onLyricsLoaded(lyrics) {}
    onHistoryUpdate(history) {}
    onFavouriteUpdate(songId, isFavourite) {}
    onError(message) {}
    onTimerUpdate(seconds, endTime) {}
    onTimerEnd() {}
    onShowTimerDialog() {}
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseMusicPlayer;
}