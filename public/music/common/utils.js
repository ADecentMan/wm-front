const MusicUtils = {
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 100000000) {
            return (num / 100000000).toFixed(1) + '亿';
        }
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    },

    parseLyrics(lrcText) {
        if (!lrcText) return [];

        const lines = lrcText.split('\n');
        const lyrics = [];

        lines.forEach(line => {
            const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3]);
                const text = match[4].trim();

                const time = minutes * 60 + seconds + milliseconds / 1000;

                if (text) {
                    lyrics.push({ time, text });
                }
            }
        });

        return lyrics.sort((a, b) => a.time - b.time);
    },

    getDefaultPoster(size = 300) {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect fill='%23ddd' width='${size}' height='${size}'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='${size * 0.27}'%3E🎵%3C/text%3E%3C/svg%3E`;
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

class PlayHistoryManager {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.history = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem('playHistory');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('加载播放历史失败:', e);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem('playHistory', JSON.stringify(this.history));
        } catch (e) {
            console.warn('保存播放历史失败:', e);
        }
    }

    add(song) {
        if (!song || !song.id) return;

        this.history = this.history.filter(s => s.id !== song.id);
        this.history.unshift(song);

        if (this.history.length > this.maxSize) {
            this.history = this.history.slice(0, this.maxSize);
        }

        this.save();
    }

    remove(songId) {
        this.history = this.history.filter(s => s.id !== songId);
        this.save();
    }

    clear() {
        this.history = [];
        this.save();
    }

    getAll() {
        return this.history;
    }

    exists(songId) {
        return this.history.some(s => s.id === songId);
    }
}

class FavouriteManager {
    constructor() {
        this.favourites = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem('favourites');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('加载喜欢列表失败:', e);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem('favourites', JSON.stringify(this.favourites));
        } catch (e) {
            console.warn('保存喜欢列表失败:', e);
        }
    }

    add(song) {
        if (!song || !song.id) return;
        if (!this.exists(song.id)) {
            this.favourites.push(song);
            this.save();
        }
    }

    remove(songId) {
        this.favourites = this.favourites.filter(s => s.id !== songId);
        this.save();
    }

    toggle(song) {
        if (this.exists(song.id)) {
            this.remove(song.id);
            return false;
        } else {
            this.add(song);
            return true;
        }
    }

    exists(songId) {
        return this.favourites.some(s => s.id === songId);
    }

    getAll() {
        return this.favourites;
    }

    clear() {
        this.favourites = [];
        this.save();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MusicUtils, PlayHistoryManager, FavouriteManager };
}