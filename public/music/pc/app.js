// 音乐播放器核心功能
class MusicPlayer extends BaseMusicPlayer {
    constructor() {
        super();

        this.currentMenu = 'discover';
        this.audioPlayer = document.getElementById('audioPlayer');
        this.showLyricsPanel = false;
        this.pauseLyricsAutoScroll = false;

        this.cloudRandomHistory = [];
        this.cloudRandomHistoryIndex = -1;

        this.currentPage = 1;
        this.pageSize = 100;
        this.searchKeyword = '';
        this.isLoading = false;
        this.hasMoreData = true;

        this.isHidden = false;
        this.originalTitle = document.title;
        this.originalFavicon = document.querySelector('link[rel="icon"]').href;

        this.init();
    }

    init() {
        if (this.audioCache) {
            this.audioCache.init().then(() => {
                console.log('音频缓存初始化完成');
            }).catch(err => {
                console.warn('音频缓存初始化失败，将使用在线播放:', err);
                this.audioCache = null;
            });
        }
        this.bindEvents();
        this.loadMusicList();
        this.setVolume(this.volume);
    }

    // 绑定事件
    bindEvents() {
        // 菜单点击事件
        const menuItems = document.querySelectorAll('.menu-item');
        const searchBar = document.querySelector('.search-bar');
        const searchIcon = document.querySelector('.search-bar i');
        const searchInput = document.getElementById('searchInput');

        menuItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                menuItems.forEach(mi => mi.classList.remove('active'));
                item.classList.add('active');

                this.currentPage = 1;
                this.searchKeyword = '';
                searchInput.value = '';

                if (index === 1) {
                    this.currentMenu = 'cloudRandom';
                    searchIcon.style.display = 'none';
                    searchInput.placeholder = '';
                    searchInput.disabled = true;
                    this.loadMusicList().then(() => {
                        if (!this.currentSong) {
                            this.playCloudRandomNext();
                        }
                    });
                } else {
                    searchIcon.style.display = 'block';
                    searchInput.placeholder = '搜索音乐、歌手';
                    searchInput.disabled = false;

                    if (index === 0) {
                        this.currentMenu = 'discover';
                    } else if (index === 2) {
                        this.currentMenu = 'favourite';
                    } else if (index === 3) {
                        this.currentMenu = 'history';
                    }
                    this.loadMusicList();
                }
            });
        });

        // 搜索事件
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchKeyword = e.target.value.trim();
                this.currentPage = 1;
                this.loadMusicList();
            }, 500);
        });

        // 播放控制事件
        document.getElementById('playPause').addEventListener('click', () => this.togglePlay());
        document.getElementById('prevSong').addEventListener('click', () => this.playPrev());
        document.getElementById('nextSong').addEventListener('click', () => this.playNext());
        document.getElementById('playMode').addEventListener('click', () => this.togglePlayMode());
        document.getElementById('timerBtn').addEventListener('click', () => this.showTimerOptions());
        document.getElementById('likeBtn').addEventListener('click', () => this.toggleLike());

        // 进度条事件
        const progressBar = document.getElementById('progressBar');
        progressBar.addEventListener('click', (e) => this.seekTo(e));

        let isDraggingProgress = false;
        progressBar.addEventListener('mousedown', (e) => {
            isDraggingProgress = true;
            this.seekTo(e);
        });
        document.addEventListener('mouseup', () => isDraggingProgress = false);
        document.addEventListener('mousemove', (e) => {
            if (isDraggingProgress) this.seekTo(e);
        });

        progressBar.addEventListener('touchstart', (e) => {
            isDraggingProgress = true;
            this.seekTo(e.touches[0]);
        });
        document.addEventListener('touchend', () => isDraggingProgress = false);
        progressBar.addEventListener('touchmove', (e) => {
            if (isDraggingProgress) {
                e.preventDefault();
                this.seekTo(e.touches[0]);
            }
        });

        // 音量控制事件
        const volumeBar = document.getElementById('volumeBar');
        volumeBar.addEventListener('click', (e) => this.setVolumeByClick(e));

        let isDraggingVolume = false;
        volumeBar.addEventListener('mousedown', () => isDraggingVolume = true);
        document.addEventListener('mouseup', () => isDraggingVolume = false);
        volumeBar.addEventListener('mousemove', (e) => {
            if (isDraggingVolume) this.setVolumeByClick(e);
        });

        // 触摸事件支持
        volumeBar.addEventListener('touchstart', (e) => {
            isDraggingVolume = true;
            this.setVolumeByClick(e.touches[0]);
        });
        document.addEventListener('touchend', () => isDraggingVolume = false);
        volumeBar.addEventListener('touchmove', (e) => {
            if (isDraggingVolume) {
                e.preventDefault();
                this.setVolumeByClick(e.touches[0]);
            }
        });

        document.getElementById('volumeBtn').addEventListener('click', () => this.toggleMute());

        // 滚动懒加载事件
        const contentArea = document.querySelector('.content-area');
        contentArea.addEventListener('scroll', () => {
            const scrollTop = contentArea.scrollTop;
            const scrollHeight = contentArea.scrollHeight;
            const clientHeight = contentArea.clientHeight;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                if (!this.isLoading && this.hasMoreData && this.currentMenu !== 'cloudRandom' && this.currentMenu !== 'history') {
                    this.loadMoreMusic();
                }
            }
        });

        // 歌词面板事件
        document.getElementById('playerPoster').addEventListener('click', () => this.toggleLyricsPanel());
        document.getElementById('closeLyricsPanel').addEventListener('click', () => this.closeLyricsPanel());
        document.getElementById('lyricsBtn').addEventListener('click', (e) => {
            this.toggleLyricsPanel();
            e.currentTarget.blur();
        });

        // 音频播放器事件
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateLyricsPosition()); // 歌词同步
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateTotalTime());
        this.audioPlayer.addEventListener('ended', () => this.onSongEnded());
        this.audioPlayer.addEventListener('error', (e) => this.handleError(e));

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    // 加载音乐列表
    async loadMusicList(append = false) {
        try {
            if (this.currentMenu === 'cloudRandom') {
                this.renderCloudRandomUI();
                return true;
            }

            if (this.currentMenu === 'history') {
                const history = this.getPlayHistory();

                if (this.searchKeyword) {
                    this.playlist = history.filter(song =>
                        song.title.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
                        song.artist.toLowerCase().includes(this.searchKeyword.toLowerCase())
                    );
                } else {
                    this.playlist = history;
                }

                this.renderMusicList();
                return this.playlist.length > 0;
            }

            this.isLoading = true;
            this.showLoadMore();

            let list;
            if (this.currentMenu === 'favourite') {
                list = await MusicApi.queryFavouriteList(this.pageSize, this.currentPage, this.searchKeyword);
            } else {
                list = await MusicApi.queryList(this.pageSize, this.currentPage, this.searchKeyword);
            }

            if (append) {
                this.playlist = [...this.playlist, ...list];
            } else {
                this.playlist = list;
            }

            this.lastLoadedCount = list.length;
            this.hasMoreData = list.length >= this.pageSize;
            this.renderMusicList(append);
            this.interceptGoBack();

            return list.length > 0;
        } catch (error) {
            if (error.message === 'UNAUTHORIZED') return false;
            console.error('加载音乐列表失败:', error);
            this.showError('加载音乐列表失败，请检查网络连接');
            return false;
        } finally {
            this.isLoading = false;
            this.hideLoadMore();
        }
    }

    async loadMoreMusic() {
        if (this.isLoading || !this.hasMoreData) return;
        this.currentPage++;
        await this.loadMusicList(true);
    }

    showLoadMore() {
        const loader = document.getElementById('loadMore');
        if (loader) loader.classList.add('active');
    }

    hideLoadMore() {
        const loader = document.getElementById('loadMore');
        if (loader) loader.classList.remove('active');
    }

    // 渲染音乐列表
    renderMusicList(append = false) {
        const musicList = document.getElementById('musicList');

        if (!Array.isArray(this.playlist)) {
            this.playlist = [];
        }

        if (this.playlist.length === 0) {
            musicList.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <i class="fas fa-music" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <p>暂无音乐数据</p>
                </div>
            `;
            return;
        }

        const startIndex = append ? this.playlist.length - this.lastLoadedCount : 0;
        const itemsHtml = this.playlist.slice(startIndex).map((song, index) => {
            const globalIndex = startIndex + index;
            let statsHtml;
            if (this.currentMenu === 'history' && song.playTime) {
                const playTimeStr = this.formatPlayTime(song.playTime);
                statsHtml = `<span class="stat-icon"><i class="fas fa-clock"></i> ${playTimeStr}</span>`;
            } else {
                statsHtml = `
                    <span class="stat-icon"><i class="fas fa-play-circle"></i> ${MusicUtils.formatNumber(song.listenCount || 0)}</span>
                    <span class="stat-icon"><i class="fas fa-heart"></i> ${MusicUtils.formatNumber(song.likeCount || 0)}</span>
                `;
            }

            return `
                <div class="music-item ${this.currentSong && this.currentSong.id === song.id ? 'playing' : ''}" 
                     data-index="${globalIndex}">
                    <div class="music-number">${globalIndex + 1}</div>
                    <div class="music-poster">
                        <img src="${song.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E'}" 
                             alt="${song.title}"
                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E'">
                        <div class="poster-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="music-info">
                        <div class="music-title">${song.title}</div>
                        <div class="music-artist">${song.artist}</div>
                    </div>
                    <div class="music-stats">
                        ${statsHtml}
                    </div>
                </div>
            `;
        }).join('');

        if (append) {
            musicList.insertAdjacentHTML('beforeend', itemsHtml);
        } else {
            musicList.innerHTML = itemsHtml;
        }

        musicList.querySelectorAll('.music-item:not([data-bound])').forEach(item => {
            item.setAttribute('data-bound', 'true');
            item.addEventListener('click', () => {
                this.unlockAudio();
                const index = parseInt(item.dataset.index);
                this.playSong(index);
            });
        });
    }


    // 播放歌曲
    async playSong(index) {
        if (index < 0 || index >= this.playlist.length) return;

        const song = this.playlist[index];
        this.currentSong = song;
        this.currentIndex = index;

        // 更新底部播放栏UI
        document.getElementById('songTitle').textContent = song.title;

        const posterImg = document.querySelector('#playerPoster img');
        posterImg.src = song.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E';

        // 更新喜欢状态
        this.updateLikeButton();

        // 加载歌词
        this.loadLyrics(song.lrc);

        // 更新歌词面板信息
        if (this.showLyricsPanel) {
            this.updateLyricsPanelInfo();
        }

        // 播放音频
        await this.loadAudio(song);
        this.audioPlayer.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();
            this.renderMusicList(); // 更新列表显示当前播放项

            // 添加旋转动画
            posterImg.classList.add('rotating');

            // 记录播放历史
            this.addToPlayHistory(song);
        }).catch(error => {
            console.error('播放失败:', error);
            this.showError('播放失败，请检查音频文件');
        });
    }

    // 切换播放/暂停
    togglePlay() {
        if (!this.currentSong) {
            if (this.playlist.length > 0) {
                this.playSong(0);
            } else if (this.currentMenu === 'cloudRandom') {
                // 随心听模式下如果没有歌曲，自动播放下一曲
                this.playCloudRandomNext();
            }
            return;
        }

        if (this.isPlaying) {
            this.audioPlayer.pause();
        } else {
            this.audioPlayer.play().catch(error => {
                console.error('播放失败:', error);
            });
        }

        this.isPlaying = !this.isPlaying;
        this.updatePlayButton();
    }

    // 更新播放按钮
    updatePlayButton() {
        const playBtn = document.getElementById('playPause');
        const icon = playBtn.querySelector('i');

        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
            document.querySelector('.player-poster img').classList.add('rotating');
        } else {
            icon.className = 'fas fa-play';
            document.querySelector('.player-poster img').classList.remove('rotating');
        }
    }

    // 播放上一首
    async playPrev() {
        // 如果是随心听模式，调用随心听上一曲接口
        if (this.currentMenu === 'cloudRandom') {
            await this.playCloudRandomPrevious();
            return;
        }

        if (this.playlist.length === 0) return;

        let newIndex;
        if (this.playMode === 'random') {
            newIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            newIndex = this.currentIndex - 1;
            if (newIndex < 0) newIndex = this.playlist.length - 1;
        }

        this.playSong(newIndex);
    }

    // 播放下一首
    async playNext() {
        // 如果是随心听模式，调用随心听下一曲接口
        if (this.currentMenu === 'cloudRandom') {
            await this.playCloudRandomNext();
            return;
        }

        if (this.playlist.length === 0) return;

        let newIndex;
        if (this.playMode === 'random') {
            newIndex = Math.floor(Math.random() * this.playlist.length);
            this.playSong(newIndex);
        } else {
            newIndex = this.currentIndex + 1;

            if (newIndex >= this.playlist.length) {
                if (this.hasMoreData && this.currentMenu !== 'history') {
                    await this.loadMoreMusic();
                    newIndex = this.currentIndex + 1;
                }

                if (newIndex >= this.playlist.length) {
                    newIndex = 0;
                }
            }

            if (this.playlist.length > 0) {
                this.playSong(newIndex);
            }
        }
    }

    // 切换播放模式
    togglePlayMode() {
        const modes = ['list', 'random', 'single'];
        const currentModeIndex = modes.indexOf(this.playMode);
        this.playMode = modes[(currentModeIndex + 1) % modes.length];

        const modeBtn = document.getElementById('playMode');
        const icon = modeBtn.querySelector('i');
        icon.innerHTML = '';

        switch (this.playMode) {
            case 'list':
                icon.className = 'fas fa-redo';
                modeBtn.title = '列表循环';
                break;
            case 'random':
                icon.className = 'fas fa-random';
                modeBtn.title = '随机播放';
                break;
            case 'single':
                icon.className = '';
                icon.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><text x="12" y="15" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor" stroke="none">1</text></svg>';
                modeBtn.title = '单曲循环';
                break;
        }
    }

    // 歌曲播放结束
    async onSongEnded() {
        // 调用播放统计接口
        if (this.currentSong) {
            try {
                const musicId = this.currentSong.id;
                const musicTitle = this.currentSong.title;
                await MusicApi.extAdd('listen', musicId, musicTitle);

                console.log('播放统计已记录');
            } catch (error) {
                console.error('播放统计失败:', error);
            }
        }

        // 根据播放模式继续播放
        if (this.playMode === 'single') {
            this.playSong(this.currentIndex);
        } else {
            this.playNext();
        }
    }

    // 更新进度条
    updateProgress() {
        if (!this.audioPlayer.duration) return;

        const currentTime = this.audioPlayer.currentTime;
        const duration = this.audioPlayer.duration;
        const progress = (currentTime / duration) * 100;

        document.getElementById('progress').style.width = `${progress}%`;
        document.getElementById('currentTime').textContent = MusicUtils.formatTime(currentTime);
    }

    // 更新总时长
    updateTotalTime() {
        const duration = this.audioPlayer.duration;
        document.getElementById('totalTime').textContent = MusicUtils.formatTime(duration);
    }

    // 跳转到指定位置
    seekTo(e) {
        if (!this.audioPlayer.duration) return;

        const progressBar = document.getElementById('progressBar');
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * this.audioPlayer.duration;

        this.audioPlayer.currentTime = time;
    }

    // 设置音量
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audioPlayer.volume = this.volume;

        const volumeLevel = document.getElementById('volumeLevel');
        const volumeHandle = document.getElementById('volumeHandle');

        volumeLevel.style.width = `${this.volume * 100}%`;
        volumeHandle.style.left = `calc(${this.volume * 100}% - 6px)`;

        this.updateVolumeIcon();
    }

    // 通过点击设置音量
    setVolumeByClick(e) {
        const volumeBar = document.getElementById('volumeBar');
        const rect = volumeBar.getBoundingClientRect();
        const volume = (e.clientX - rect.left) / rect.width;
        this.setVolume(volume);
    }

    // 切换静音
    toggleMute() {
        if (this.isMuted) {
            this.setVolume(this.previousVolume);
            this.isMuted = false;
        } else {
            this.previousVolume = this.volume;
            this.setVolume(0);
            this.isMuted = true;
        }
    }

    // 更新音量图标
    updateVolumeIcon() {
        const volumeBtn = document.getElementById('volumeBtn');
        const icon = volumeBtn.querySelector('i');

        if (this.volume === 0 || this.isMuted) {
            icon.className = 'fas fa-volume-mute';
        } else if (this.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    // 切换喜欢状态
    async toggleLike() {
        if (!this.currentSong) return;

        const likeBtn = document.getElementById('likeBtn');
        const icon = likeBtn.querySelector('i');
        const musicId = this.currentSong.id;
        const musicTitle = this.currentSong.title;

        try {
            const action = likeBtn.classList.contains('liked') ? 'remove' : 'add';
            const response = await MusicApi.favourite(action, musicId, musicTitle);

            if (response) {
                // 更新UI
                if (likeBtn.classList.contains('liked')) {
                    likeBtn.classList.remove('liked');
                    icon.className = 'far fa-heart';
                    this.currentSong.isFavourite = 0;
                } else {
                    likeBtn.classList.add('liked');
                    icon.className = 'fas fa-heart';
                    this.currentSong.isFavourite = 1;
                }

                // 刷新列表（如果在收藏页面）
                if (this.currentMenu === 'favourite') {
                    this.loadMusicList();
                }
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            this.showError('收藏操作失败');
        }
    }

    // 更新喜欢按钮
    updateLikeButton() {
        const likeBtn = document.getElementById('likeBtn');
        const icon = likeBtn.querySelector('i');

        if (this.currentSong && this.currentSong.isFavourite === 1) {
            likeBtn.classList.add('liked');
            icon.className = 'fas fa-heart';
        } else {
            likeBtn.classList.remove('liked');
            icon.className = 'far fa-heart';
        }
    }

    // 键盘快捷键
    handleKeyboard(e) {
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.playPrev();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.playNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.setVolume(this.volume + 0.1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.setVolume(this.volume - 0.1);
                break;
            case 'KeyM':
                this.toggleMute();
                break;
            case 'Escape':
                e.preventDefault();
                this.toggleHidePlayer();
                break;
        }
    }

    // 格式化时间
    formatPlayTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;
        const month = 30 * day;

        if (diff < minute) {
            return '刚刚';
        } else if (diff < hour) {
            const minutes = Math.floor(diff / minute);
            return `${minutes}分钟前`;
        } else if (diff < day) {
            const hours = Math.floor(diff / hour);
            return `${hours}小时前`;
        } else if (diff < week) {
            const days = Math.floor(diff / day);
            return `${days}天前`;
        } else if (diff < month) {
            const weeks = Math.floor(diff / week);
            return `${weeks}周前`;
        } else {
            const date = new Date(timestamp);
            const year = date.getFullYear();
            const monthNum = (date.getMonth() + 1).toString().padStart(2, '0');
            const dayNum = date.getDate().toString().padStart(2, '0');
            return `${year}-${monthNum}-${dayNum}`;
        }
    }

    // 错误处理
    handleError(e) {
        console.error('音频加载错误:', e);
        this.showError('音频加载失败，请检查音频文件格式');
    }

    // 显示错误提示
    showError(message) {
        // 创建错误提示元素
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        `;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4d4f;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
    }

    // 添加到播放历史
    addToPlayHistory(song) {
        this.playHistory.add(song);
    }

    getPlayHistory() {
        return this.playHistory.getAll();
    }

    // 清空播放历史
    clearPlayHistory() {
        localStorage.removeItem('playHistory');
        console.log('播放历史已清空');
    }

    // 渲染随心听界面
    renderCloudRandomUI() {
        const musicList = document.getElementById('musicList');

        // 随心听模式下显示特殊界面（去除图标和控制器）
        musicList.innerHTML = `
            <div class="cloud-random-container">
                <div class="cloud-random-current" id="cloudRandomCurrent">
                    ${this.currentSong ? `
                        <div class="current-song-card">
                            <div class="current-poster">
                                <img src="${this.currentSong.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'60\'%3E🎵%3C/text%3E%3C/svg%3E'}" 
                                     alt="${this.currentSong.title}"
                                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'60\'%3E🎵%3C/text%3E%3C/svg%3E'">
                            </div>
                            <div class="current-info">
                                <h2>${this.currentSong.title}</h2>
                                <p>${this.currentSong.artist}</p>
                                <div class="current-stats">
                                    <span><i class="fas fa-play-circle"></i> ${MusicUtils.formatNumber(this.currentSong.listenCount || 0)}</span>
                                    <span><i class="fas fa-heart"></i> ${MusicUtils.formatNumber(this.currentSong.likeCount || 0)}</span>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="no-song-tip">
                            <i class="fas fa-music"></i>
                            <p>正在为您推荐歌曲...</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        this.hideLoadMore();
    }

    updatePlayerBar(song) {
        document.getElementById('songTitle').textContent = song.title;
        const posterImg = document.querySelector('#playerPoster img');
        posterImg.src = song.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E';
        posterImg.classList.add('rotating');
    }

    // 随心听下一曲
    async playCloudRandomNext() {
        try {
            const song = await MusicApi.cloudRandom('next');

            if (song && song.id) {
                console.log('获取到有效歌曲，开始播放:', song.title);

                // 添加到历史记录
                this.cloudRandomHistory.push(song);
                this.cloudRandomHistoryIndex = this.cloudRandomHistory.length - 1;

                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song]; // 随心听模式下只有一个歌曲
                this.currentIndex = 0;

                // 更新界面显示当前歌曲
                this.renderCloudRandomUI();

                // 加载歌词
                this.loadLyrics(song.lrc);
                if (this.showLyricsPanel) {
                    this.updateLyricsPanelInfo();
                }

                // 播放音频
                await this.loadAudio(song);
                this.audioPlayer.play().then(() => {
                    console.log('歌曲播放成功:', song.title);
                    this.isPlaying = true;
                    this.updatePlayButton();
                    this.updatePlayerBar(song);
                    this.addToPlayHistory(song);
                }).catch(error => {
                    console.error('播放失败:', error);
                    this.showError('播放失败，请检查音频文件');
                });
            } else {
                console.warn('接口返回的歌曲数据无效:', song);
                this.showError('获取歌曲失败，请稍后重试');
            }
        } catch (error) {
            console.error('随心听下一曲失败:', error);
            this.showError('获取歌曲失败，请检查网络连接');
        }
    }

    // 随心听上一曲
    async playCloudRandomPrevious() {
        try {
            console.log('>>> 随心听上一曲');

            // 如果有历史记录，优先从历史记录中获取
            if (this.cloudRandomHistoryIndex > 0) {
                this.cloudRandomHistoryIndex--;
                const song = this.cloudRandomHistory[this.cloudRandomHistoryIndex];
                console.log('从历史记录获取歌曲:', song.title);

                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song];
                this.currentIndex = 0;

                // 更新界面显示当前歌曲
                this.renderCloudRandomUI();

                // 加载歌词
                this.loadLyrics(song.lrc);
                if (this.showLyricsPanel) {
                    this.updateLyricsPanelInfo();
                }

                // 播放歌曲
                await this.loadAudio(song);
                this.audioPlayer.play().then(() => {
                    console.log('歌曲播放成功:', song.title);
                    this.isPlaying = true;
                    this.updatePlayButton();
                    this.updatePlayerBar(song);
                }).catch(error => {
                    console.error('播放失败:', error);
                    this.showError('播放失败，请检查音频文件');
                });

                return;
            }

            // 如果没有历史记录，调用接口
            console.log('没有历史记录，调用接口获取上一曲');
            const song = await MusicApi.cloudRandom('previous');

            if (song && song.id) {
                console.log('获取到有效歌曲，开始播放:', song.title);

                // 添加到历史记录开头
                this.cloudRandomHistory.unshift(song);
                this.cloudRandomHistoryIndex = 0;

                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song];
                this.currentIndex = 0;

                // 更新界面显示当前歌曲
                this.renderCloudRandomUI();

                // 加载歌词
                this.loadLyrics(song.lrc);
                if (this.showLyricsPanel) {
                    this.updateLyricsPanelInfo();
                }

                // 播放歌曲
                await this.loadAudio(song);
                this.audioPlayer.play().then(() => {
                    console.log('歌曲播放成功:', song.title);
                    this.isPlaying = true;
                    this.updatePlayButton();
                    this.updatePlayerBar(song);
                    this.addToPlayHistory(song);
                }).catch(error => {
                    console.error('播放失败:', error);
                    this.showError('播放失败，请检查音频文件');
                });
            } else {
                console.warn('接口返回的歌曲数据无效:', song);
                this.showError('获取歌曲失败，请稍后重试');
            }
        } catch (error) {
            console.error('随心听上一曲失败:', error);
            this.showError('获取歌曲失败，请检查网络连接');
        }
    }

    // 切换隐藏播放器
    toggleHidePlayer() {
        if (this.isHidden) {
            // 还原播放器显示
            this.showPlayer();
        } else {
            // 隐藏播放器
            this.hidePlayer();
        }
    }

    // 隐藏播放器
    hidePlayer() {
        this.isHidden = true;

        // 隐藏播放器容器
        const container = document.querySelector('.container');
        container.style.display = 'none';

        // 显示伪装背景
        this.createFakeBackground();

        // 更改favicon
        this.changeFavicon('/public/music/pc/fake-favicon.png');

        // 更改页面标题
        document.title = 'Welcome to W3 Workplace';

        console.log('播放器已隐藏，显示伪装页面');
    }

    // 显示播放器
    showPlayer() {
        this.isHidden = false;

        // 显示播放器容器
        const container = document.querySelector('.container');
        container.style.display = 'flex';

        // 移除伪装背景
        this.removeFakeBackground();

        // 还原favicon
        this.changeFavicon(this.originalFavicon);

        // 还原页面标题
        document.title = this.originalTitle;

        console.log('播放器已还原显示');
    }

    // 创建伪装背景
    createFakeBackground() {
        // 创建伪装背景元素
        const fakeBg = document.createElement('div');
        fakeBg.id = 'fake-background';
        fakeBg.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('/public/music/pc/fake-bg.png');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            z-index: 9999;
        `;

        document.body.appendChild(fakeBg);
    }

    // 移除伪装背景
    removeFakeBackground() {
        const fakeBg = document.getElementById('fake-background');
        if (fakeBg) {
            fakeBg.remove();
        }
    }

    // 更改favicon
    changeFavicon(iconPath) {
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            favicon.href = iconPath;
        }
    }

    // 切换歌词面板
    toggleLyricsPanel() {
        this.showLyricsPanel = !this.showLyricsPanel;
        const panel = document.getElementById('lyricsPanel');
        const lyricsBtn = document.getElementById('lyricsBtn');

        if (this.showLyricsPanel) {
            panel.classList.add('active');
            lyricsBtn.classList.add('active');
            this.updateLyricsPanelInfo();
        } else {
            panel.classList.remove('active');
            lyricsBtn.classList.remove('active');
        }
    }

    // 关闭歌词面板
    closeLyricsPanel() {
        this.showLyricsPanel = false;
        const panel = document.getElementById('lyricsPanel');
        const lyricsBtn = document.getElementById('lyricsBtn');
        panel.classList.remove('active');
        lyricsBtn.classList.remove('active');
    }

    // 更新歌词面板信息
    updateLyricsPanelInfo() {
        if (!this.currentSong) return;

        document.getElementById('lyricsSongTitle').textContent = this.currentSong.title;
        document.getElementById('lyricsSongArtist').textContent = this.currentSong.artist;
    }

    // 加载歌词
    async loadLyrics(lrcUrl) {
        if (!lrcUrl) {
            this.currentLyrics = [];
            this.renderLyrics();
            return;
        }

        try {
            const response = await fetch(lrcUrl);
            if (!response.ok) {
                throw new Error('歌词加载失败');
            }

            const lrcText = await response.text();
            this.currentLyrics = MusicUtils.parseLyrics(lrcText);
            this.renderLyrics();
        } catch (error) {
            console.error('加载歌词失败:', error);
            this.currentLyrics = [];
            this.renderLyrics();
        }
    }

    // 解析歌词文本

    // 渲染歌词
    renderLyrics() {
        const lyricsText = document.getElementById('lyricsText');

        if (this.currentLyrics.length === 0) {
            lyricsText.innerHTML = '<div class="lyrics-line no-lyrics">暂无歌词</div>';
            return;
        }

        lyricsText.innerHTML = this.currentLyrics.map((line, index) =>
            `<div class="lyrics-line" data-index="${index}" data-time="${line.time}">${line.text}</div>`
        ).join('');

        // 绑定歌词点击事件
        lyricsText.querySelectorAll('.lyrics-line').forEach(line => {
            line.addEventListener('click', (e) => {
                const time = parseFloat(e.target.dataset.time);
                if (time && this.audioPlayer.duration) {
                    this.audioPlayer.currentTime = time;
                }
            });
        });

        // 绑定歌词滑动同步
        this.bindLyricsScrollSync();
    }

    // 显示定时器选择对话框
    onShowTimerDialog() {
        const existingDialog = document.getElementById('timerDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        const ITEM_HEIGHT = 40;
        const VISIBLE_COUNT = 5;
        const COPIES = 3;
        const PADDING = (VISIBLE_COUNT - 1) / 2 * ITEM_HEIGHT;

        function generateItems(count, pad) {
            let html = '';
            for (let c = 0; c < COPIES; c++) {
                for (let i = 0; i < count; i++) {
                    const display = pad && i < 10 ? '0' + i : '' + i;
                    html += `<div class="timer-picker-item" data-value="${i}">${display}</div>`;
                }
            }
            return html;
        }

        const dialog = document.createElement('div');
        dialog.id = 'timerDialog';
        dialog.className = 'timer-dialog';
        dialog.innerHTML = `
            <div class="timer-dialog-content">
                <h3>定时关闭</h3>
                <div class="timer-picker">
                    <div class="timer-picker-column">
                        <div class="timer-picker-label">小时</div>
                        <div class="timer-picker-scroll-wrapper">
                            <div class="timer-picker-indicator"></div>
                            <div class="timer-picker-scroll" id="timerHourScroll" data-count="24">
                                ${generateItems(24, false)}
                            </div>
                        </div>
                    </div>
                    <div class="timer-picker-separator">:</div>
                    <div class="timer-picker-column">
                        <div class="timer-picker-label">分钟</div>
                        <div class="timer-picker-scroll-wrapper">
                            <div class="timer-picker-indicator"></div>
                            <div class="timer-picker-scroll" id="timerMinuteScroll" data-count="60">
                                ${generateItems(60, true)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="timer-dialog-buttons">
                    <button class="timer-close-btn">取消</button>
                    <button class="timer-confirm-btn">确定</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const hourScroll = dialog.querySelector('#timerHourScroll');
        const minuteScroll = dialog.querySelector('#timerMinuteScroll');

        function initScroll(scrollEl, defaultVal) {
            const count = parseInt(scrollEl.dataset.count);
            const oneSetHeight = count * ITEM_HEIGHT;

            scrollEl.scrollTop = oneSetHeight + defaultVal * ITEM_HEIGHT;

            const items = scrollEl.querySelectorAll('.timer-picker-item');
            items.forEach((item, i) => {
                item.classList.toggle('active', (i % count) === defaultVal);
                item.addEventListener('click', () => {
                    const val = i % count;
                    scrollEl.scrollTop = oneSetHeight + val * ITEM_HEIGHT;
                });
            });

            let scrollTimer = null;
            let isDragging = false;
            let startY = 0;
            let startScrollTop = 0;

            scrollEl.addEventListener('mousedown', (e) => {
                isDragging = true;
                startY = e.clientY;
                startScrollTop = scrollEl.scrollTop;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const deltaY = e.clientY - startY;
                scrollEl.scrollTop = startScrollTop - deltaY;
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });

            scrollEl.addEventListener('scroll', () => {
                clearTimeout(scrollTimer);

                const index = Math.round(scrollEl.scrollTop / ITEM_HEIGHT) % count;
                const items = scrollEl.querySelectorAll('.timer-picker-item');
                items.forEach((item, i) => {
                    item.classList.toggle('active', (i % count) === index);
                });

                scrollTimer = setTimeout(() => {
                    const rawIndex = Math.round(scrollEl.scrollTop / ITEM_HEIGHT);
                    const realIndex = ((rawIndex % count) + count) % count;

                    if (scrollEl.scrollTop < oneSetHeight || scrollEl.scrollTop >= oneSetHeight * 2) {
                        scrollEl.scrollTop = oneSetHeight + realIndex * ITEM_HEIGHT;
                    }
                }, 100);
            });
        }

        function getSelectedValue(scrollEl) {
            const count = parseInt(scrollEl.dataset.count);
            const rawIndex = Math.round(scrollEl.scrollTop / ITEM_HEIGHT);
            return ((rawIndex % count) + count) % count;
        }

        initScroll(hourScroll, 0);
        initScroll(minuteScroll, 30);

        dialog.querySelector('.timer-confirm-btn').addEventListener('click', () => {
            const selectedHours = getSelectedValue(hourScroll);
            const selectedMinutes = getSelectedValue(minuteScroll);
            const totalMinutes = selectedHours * 60 + selectedMinutes;

            if (totalMinutes === 0) {
                this.stopTimer();
            } else {
                this.setTimer(totalMinutes);
            }
            dialog.remove();
        });

        dialog.querySelector('.timer-close-btn').addEventListener('click', () => {
            dialog.remove();
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }

    // 更新定时器状态显示
    onTimerUpdate(minutes, endTime) {
        const timerBtn = document.getElementById('timerBtn');
        const icon = timerBtn.querySelector('i');
        const countdown = document.getElementById('timerCountdown');

        if (minutes > 0) {
            timerBtn.classList.add('active');
            timerBtn.title = `定时关闭：${Math.ceil(minutes / 60)}分钟后`;
            icon.className = 'fas fa-clock';
            const h = Math.floor(minutes / 3600);
            const m = Math.floor((minutes % 3600) / 60);
            const s = minutes % 60;
            const mm = m.toString().padStart(2, '0');
            const ss = s.toString().padStart(2, '0');
            countdown.textContent = h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
        } else {
            timerBtn.classList.remove('active');
            timerBtn.title = '定时关闭';
            icon.className = 'fas fa-clock';
            countdown.textContent = '';
        }
    }

    // 定时器结束
    onTimerEnd() {
        this.isPlaying = false;
        this.updatePlayButton();
        document.querySelector('.player-poster img').classList.remove('rotating');
        this.showError('定时关闭已生效，播放已停止');
    }

    // 绑定歌词滑动同步
    bindLyricsScrollSync() {
        const lyricsContent = document.getElementById('lyricsPanelContent');
        let scrollTimeout = null;

        lyricsContent.addEventListener('scroll', () => {
            this.pauseLyricsAutoScroll = true;

            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.pauseLyricsAutoScroll = false;
            }, 3000);
        });
    }

    // 更新歌词位置（与播放进度同步）
    updateLyricsPosition() {
        if (!this.showLyricsPanel || this.currentLyrics.length === 0) return;

        // 如果用户正在滑动歌词，暂停自动滚动
        if (this.pauseLyricsAutoScroll) return;

        const currentTime = this.audioPlayer.currentTime;
        const lyricsText = document.getElementById('lyricsText');
        const lines = lyricsText.querySelectorAll('.lyrics-line');

        // 找到当前应该高亮的歌词行
        let currentLineIndex = -1;
        for (let i = 0; i < this.currentLyrics.length; i++) {
            if (this.currentLyrics[i].time <= currentTime) {
                currentLineIndex = i;
            } else {
                break;
            }
        }

        // 更新高亮状态
        lines.forEach((line, index) => {
            if (index === currentLineIndex) {
                line.classList.add('active');
                // 滚动到当前行
                const lineHeight = line.offsetHeight;
                const containerHeight = document.getElementById('lyricsPanelContent').offsetHeight;
                const scrollTop = line.offsetTop - containerHeight / 2 + lineHeight / 2;
                document.getElementById('lyricsPanelContent').scrollTop = Math.max(0, scrollTop);
            } else {
                line.classList.remove('active');
            }
        });
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});