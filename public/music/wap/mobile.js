// 移动端音乐播放器核心功能
class MobileMusicPlayer extends BaseMusicPlayer {
    constructor() {
        super();

        this.currentTab = 'discover';
        this.audioPlayer = document.getElementById('audioPlayer');
        this.showLyrics = false;
        this.pauseLyricsAutoScroll = false;

        this.cloudRandomHistory = [];
        this.cloudRandomHistoryIndex = -1;

        this.currentPage = 1;
        this.pageSize = 100;
        this.searchKeyword = '';
        this.isLoading = false;
        this.hasMoreData = true;

        this.isFullScreen = false;

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
        // Tab导航事件
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });

        // 搜索事件
        this.bindSearchEvents();

        // 迷你播放器事件
        const miniPlayer = document.getElementById('miniPlayer');
        miniPlayer.addEventListener('click', (e) => {
            // 如果点击的是控制按钮，不打开全屏播放器
            if (e.target.closest('.mini-btn')) {
                return;
            }
            this.openFullScreenPlayer();
        });

        document.getElementById('miniTimer').addEventListener('click', () => this.showTimerOptions());
        document.getElementById('miniPlayPause').addEventListener('click', () => this.togglePlay());
        document.getElementById('miniNext').addEventListener('click', () => this.playNext());

        document.querySelectorAll('.mini-btn').forEach(btn => {
            btn.addEventListener('touchstart', () => btn.classList.add('pressed'), { passive: true });
            btn.addEventListener('touchend', () => setTimeout(() => btn.classList.remove('pressed'), 150));
            btn.addEventListener('touchcancel', () => btn.classList.remove('pressed'));
        });

        document.querySelectorAll('.full-btn, .back-btn, .tab-item').forEach(btn => {
            btn.addEventListener('touchstart', () => btn.classList.add('pressed'), { passive: true });
            btn.addEventListener('touchend', () => setTimeout(() => btn.classList.remove('pressed'), 150));
            btn.addEventListener('touchcancel', () => btn.classList.remove('pressed'));
        });

        // 全屏播放器事件
        document.getElementById('closeFullPlayer').addEventListener('click', () => this.closeFullScreenPlayer());
        document.getElementById('fullPlayPause').addEventListener('click', () => this.togglePlay());
        document.getElementById('fullPrev').addEventListener('click', () => this.playPrev());
        document.getElementById('fullNext').addEventListener('click', () => this.playNext());
        document.getElementById('fullPlayMode').addEventListener('click', () => this.togglePlayMode());
        document.getElementById('fullLikeBtn').addEventListener('click', () => this.toggleLike());

        this.bindPosterLyricsToggle();

        // 进度条拖拽事件
        this.bindProgressDrag();

        // 音频播放器事件
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateLyricsPosition()); // 歌词同步
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateTotalTime());
        this.audioPlayer.addEventListener('ended', () => this.onSongEnded());
        this.audioPlayer.addEventListener('error', (e) => this.handleError(e));

        // 滚动加载更多
        this.bindScrollLoad();

        // 键盘快捷键（ESC隐藏播放器）
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' && this.isFullScreen) {
                this.closeFullScreenPlayer();
            }
        });

        // 下滑手势关闭全屏播放器
        this.bindSwipeGesture();
        this.lockPortrait();
    }

    // 绑定下滑手势
    bindSwipeGesture() {
        const fullPlayer = document.getElementById('fullPlayer');
        let startY = 0;
        let currentY = 0;
        let isSwiping = false;

        fullPlayer.addEventListener('touchstart', (e) => {
            if (this.isFullScreen) {
                startY = e.touches[0].clientY;
                isSwiping = true;
            }
        });

        fullPlayer.addEventListener('touchmove', (e) => {
            if (!isSwiping || !this.isFullScreen) return;

            if (this.showLyrics && e.target.closest('#lyricsContent')) return;

            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            if (deltaY > 0) {
                fullPlayer.style.transform = `translateY(${deltaY}px)`;
            }
        });

        fullPlayer.addEventListener('touchend', (e) => {
            if (!isSwiping || !this.isFullScreen) return;

            const deltaY = currentY - startY;

            if (deltaY > 100) {
                this.closeFullScreenPlayer();
            } else {
                fullPlayer.style.transform = '';
            }

            isSwiping = false;
            startY = 0;
            currentY = 0;
        });
    }

    lockPortrait() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('portrait').catch(() => {});
        }

        const check = () => {
            if (window.innerWidth > window.innerHeight) {
                document.documentElement.classList.add('force-portrait');
            } else {
                document.documentElement.classList.remove('force-portrait');
            }
        };

        window.addEventListener('resize', check);
        window.addEventListener('orientationchange', check);
        check();
    }

    // 绑定搜索事件
    bindSearchEvents() {
        const searchInput = document.getElementById('searchInput');
        const searchInputFav = document.getElementById('searchInputFav');
        const searchInputHistory = document.getElementById('searchInputHistory');

        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchKeyword = e.target.value.trim();
                this.currentPage = 1;
                this.hasMoreData = true;
                this.loadMusicList();
            }, 500);
        });

        searchInputFav.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchKeyword = e.target.value.trim();
                this.currentPage = 1;
                this.hasMoreData = true;
                this.loadFavouriteList();
            }, 500);
        });

        searchInputHistory.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchKeyword = e.target.value.trim();
                this.loadHistoryList();
            }, 500);
        });
    }

    // 绑定滚动加载更多
    bindScrollLoad() {
        const containers = [
            { id: 'musicList', loader: 'loadMore', loaderFunc: this.loadMoreMusic },
            { id: 'favouriteList', loader: 'loadMoreFav', loaderFunc: this.loadMoreFavourite }
        ];

        containers.forEach(({ id, loader, loaderFunc }) => {
            const container = document.getElementById(id).parentElement;
            container.addEventListener('scroll', () => {
                const scrollTop = container.scrollTop;
                const scrollHeight = container.scrollHeight;
                const clientHeight = container.clientHeight;

                // 滚动到底部时加载更多
                if (scrollTop + clientHeight >= scrollHeight - 50) {
                    if (!this.isLoading && this.hasMoreData) {
                        loaderFunc.call(this);
                    }
                }
            });
        });
    }

    // 切换Tab
    switchTab(tab) {
        this.currentTab = tab;

        // 更新Tab激活状态
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => {
            if (item.dataset.tab === tab) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // 更新页面显示
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
        });

        const pageId = `page${tab.charAt(0).toUpperCase() + tab.slice(1)}`;
        document.getElementById(pageId).classList.add('active');

        // 根据Tab加载内容
        this.searchKeyword = '';
        this.currentPage = 1;
        this.hasMoreData = true;

        if (tab === 'discover') {
            document.getElementById('searchInput').value = '';
            this.loadMusicList();
        } else if (tab === 'cloud') {
            this.loadCloudRandom();
        } else if (tab === 'favourite') {
            document.getElementById('searchInputFav').value = '';
            this.loadFavouriteList();
        } else if (tab === 'history') {
            document.getElementById('searchInputHistory').value = '';
            this.loadHistoryList();
        }
    }

    // 加载音乐列表
    async loadMusicList() {
        try {
            this.isLoading = true;
            this.showLoadMore('loadMore');

            const list = await MusicApi.queryList(this.pageSize, this.currentPage, this.searchKeyword);
            this.playlist = list;

            this.renderMusicList('musicList');
            this.hasMoreData = this.playlist.length >= this.pageSize;
            this.interceptGoBack();

            return this.playlist.length > 0;
        } catch (error) {
            if (error.message === 'UNAUTHORIZED') return false;
            console.error('加载音乐列表失败:', error);
            this.showError('加载音乐列表失败，请检查网络连接');
            return false;
        } finally {
            this.isLoading = false;
            this.hideLoadMore('loadMore');
        }
    }

    // 加载更多音乐
    async loadMoreMusic() {
        if (this.isLoading || !this.hasMoreData) return;

        this.currentPage++;
        const oldList = this.playlist;

        await this.loadMusicList();

        // 合新旧列表
        if (this.playlist.length > 0) {
            this.playlist = [...oldList, ...this.playlist];
            this.renderMusicList('musicList');
        }
    }

    // 加载收藏列表
    async loadFavouriteList() {
        try {
            this.isLoading = true;
            this.showLoadMore('loadMoreFav');

            const list = await MusicApi.queryFavouriteList(this.pageSize, this.currentPage, this.searchKeyword);
            this.playlist = list;

            this.renderMusicList('favouriteList');
            this.hasMoreData = this.playlist.length >= this.pageSize;

            return this.playlist.length > 0;
        } catch (error) {
            if (error.message === 'UNAUTHORIZED') return false;
            console.error('加载收藏列表失败:', error);
            this.showError('加载收藏列表失败，请检查网络连接');
            return false;
        } finally {
            this.isLoading = false;
            this.hideLoadMore('loadMoreFav');
        }
    }

    // 加载更多收藏
    async loadMoreFavourite() {
        if (this.isLoading || !this.hasMoreData) return;

        this.currentPage++;
        const oldList = this.playlist;

        await this.loadFavouriteList();

        // 合新旧列表
        if (this.playlist.length > 0) {
            this.playlist = [...oldList, ...this.playlist];
            this.renderMusicList('favouriteList');
        }
    }

    // 加载历史列表
    loadHistoryList() {
        const history = this.getPlayHistory();

        // 如果有搜索关键词，过滤历史记录
        if (this.searchKeyword) {
            this.playlist = history.filter(song =>
                song.title.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
                song.artist.toLowerCase().includes(this.searchKeyword.toLowerCase())
            );
        } else {
            this.playlist = history;
        }

        this.renderMusicList('historyList', true);
    }

    // 加载随心听
    async loadCloudRandom() {
        // 如果当前没有播放歌曲，自动播放下一曲
        if (!this.currentSong) {
            await this.playCloudRandomNext();
        } else {
            this.updateCloudUI();
        }
    }

    // 渲染音乐列表
    renderMusicList(containerId, isHistory = false) {
        const container = document.getElementById(containerId);

        if (!Array.isArray(this.playlist)) {
            this.playlist = [];
        }

        if (this.playlist.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <i class="fas fa-music" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <p>暂无音乐数据</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.playlist.map((song, index) => {
            // 如果是播放历史，显示播放时间
            let statsHtml;
            if (isHistory && song.playTime) {
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
                     data-index="${index}">
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

        // 绑定点击事件
        container.querySelectorAll('.music-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.playSong(index);
            });
        });
    }


    async playSong(index) {
        if (index < 0 || index >= this.playlist.length) return;

        const song = this.playlist[index];
        this.currentSong = song;
        this.currentIndex = index;

        // 保持歌词显示状态
        const poster = document.getElementById('fullPoster');
        const lyrics = document.getElementById('fullLyrics');
        if (this.showLyrics) {
            poster.style.display = 'none';
            lyrics.style.display = 'block';
        } else {
            poster.style.display = 'block';
            lyrics.style.display = 'none';
        }

        // 加载歌词
        this.loadLyrics(song.lrc);

        // 更新迷你播放器UI
        this.updateMiniPlayer();

        // 更新全屏播放器UI
        this.updateFullScreenPlayer();

        // 更新音韵随心UI
        this.updateCloudUI();

        // 更新喜欢状态
        this.updateLikeButton();

        // 播放音频
        this.loadAudio(song);
        this.audioPlayer.play().then(() => {
            this.isPlaying = true;
            this.updatePlayButton();

            // 更新列表显示当前播放项
            if (this.currentTab !== 'cloud') {
                this.renderMusicList(this.currentTab === 'discover' ? 'musicList' :
                        this.currentTab === 'favourite' ? 'favouriteList' : 'historyList',
                    this.currentTab === 'history');
            }

            // 记录播放历史
            this.addToPlayHistory(song);
        }).catch(error => {
            console.error('播放失败:', error);
            this.showError('播放失败，请检查音频文件');
        });
    }

    // 更新迷你播放器
    updateMiniPlayer() {
        if (!this.currentSong) return;

        document.getElementById('miniTitle').textContent = this.currentSong.title;
        document.getElementById('miniArtist').textContent = this.currentSong.artist;

        const posterImg = document.querySelector('#miniPoster img');
        posterImg.src = this.currentSong.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'%3E%3Crect fill=\'%23ddd\' width=\'50\' height=\'50\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E';
    }

    // 更新全屏播放器
    updateFullScreenPlayer() {
        const posterImg = document.querySelector('#fullPoster img');

        if (!this.currentSong) {
            posterImg.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Crect fill=\'%23ddd\' width=\'300\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'80\'%3E🎵%3C/text%3E%3C/svg%3E';
            document.getElementById('fullTitle').textContent = '未选择歌曲';
            document.getElementById('fullArtist').textContent = '--';
            return;
        }

        document.getElementById('fullTitle').textContent = this.currentSong.title;
        document.getElementById('fullArtist').textContent = this.currentSong.artist;

        posterImg.src = this.currentSong.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Crect fill=\'%23ddd\' width=\'300\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'80\'%3E🎵%3C/text%3E%3C/svg%3E';
    }

    // 更新音韵随心UI
    updateCloudUI() {
        if (!this.currentSong) {
            document.querySelector('#cloudPoster img').src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Crect fill=\'%23ddd\' width=\'300\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'80\'%3E🎵%3C/text%3E%3C/svg%3E';
            document.querySelector('.cloud-title').textContent = '未选择歌曲';
            document.querySelector('.cloud-artist').textContent = '--';
            return;
        }

        document.querySelector('#cloudPoster img').src = this.currentSong.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Crect fill=\'%23ddd\' width=\'300\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'80\'%3E🎵%3C/text%3E%3C/svg%3E';
        document.querySelector('.cloud-title').textContent = this.currentSong.title;
        document.querySelector('.cloud-artist').textContent = this.currentSong.artist;
    }

    // 切换播放/暂停
    togglePlay() {
        if (!this.currentSong) {
            if (this.playlist.length > 0) {
                this.playSong(0);
            } else if (this.currentTab === 'cloud') {
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
        this.updateMiniPlayer();
        this.updateFullScreenPlayer();
        this.updateCloudUI();
    }

    // 更新播放按钮
    updatePlayButton() {
        const miniPlayBtn = document.getElementById('miniPlayPause');
        const miniIcon = miniPlayBtn.querySelector('i');
        const miniPosterImg = document.querySelector('#miniPoster img');

        const fullPlayBtn = document.getElementById('fullPlayPause');
        const fullIcon = fullPlayBtn.querySelector('i');

        if (this.isPlaying) {
            miniIcon.className = 'fas fa-pause';
            fullIcon.className = 'fas fa-pause';
            miniPosterImg.classList.add('rotating');
        } else {
            miniIcon.className = 'fas fa-play';
            fullIcon.className = 'fas fa-play';
            miniPosterImg.classList.remove('rotating');
        }
    }

    // 播放上一首
    async playPrev() {
        if (this.currentTab === 'cloud') {
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
        if (this.currentTab === 'cloud') {
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

            // 如果播放到最后一首，自动翻页
            if (newIndex >= this.playlist.length) {
                // 尝试加载下一页
                if (this.hasMoreData) {
                    if (this.currentTab === 'discover') {
                        await this.loadMoreMusic();
                    } else if (this.currentTab === 'favourite') {
                        await this.loadMoreFavourite();
                    }
                    newIndex = this.currentIndex + 1;
                }

                // 如果没有更多数据，跳转到第一首
                if (newIndex >= this.playlist.length) {
                    newIndex = 0;
                }
            }

            // 确保新列表有数据才播放
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

        const modeBtn = document.getElementById('fullPlayMode');
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

        document.getElementById('fullProgress').style.width = `${progress}%`;
        document.getElementById('fullCurrentTime').textContent = MusicUtils.formatTime(currentTime);
    }

    // 更新总时长
    updateTotalTime() {
        const duration = this.audioPlayer.duration;
        document.getElementById('fullTotalTime').textContent = MusicUtils.formatTime(duration);
    }

    // 跳转到指定位置
    seekTo(e) {
        if (!this.audioPlayer.duration) return;

        const progressBar = document.getElementById('fullProgressBar');
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * this.audioPlayer.duration;

        this.audioPlayer.currentTime = time;
    }

    // 绑定进度条拖拽事件
    bindProgressDrag() {
        const progressBar = document.getElementById('fullProgressBar');
        let isDragging = false;

        // 触摸事件
        progressBar.addEventListener('touchstart', (e) => {
            isDragging = true;
            this.handleProgressDrag(e.touches[0]);
        });

        progressBar.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
                this.handleProgressDrag(e.touches[0]);
            }
        });

        progressBar.addEventListener('touchend', () => {
            isDragging = false;
        });

        // 鼠标事件
        progressBar.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.handleProgressDrag(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.handleProgressDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // 处理进度条拖拽
    handleProgressDrag(e) {
        if (!this.audioPlayer.duration) return;

        const progressBar = document.getElementById('fullProgressBar');
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = percent * this.audioPlayer.duration;

        this.audioPlayer.currentTime = time;
    }

    // 设置音量（基础功能，无UI）
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audioPlayer.volume = this.volume;
    }

    bindPosterLyricsToggle() {
        const container = document.getElementById('posterContainer');
        let touchStartY = 0;
        let touchStartX = 0;
        let isTouching = false;

        container.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            isTouching = true;
        });

        container.addEventListener('touchend', (e) => {
            if (!isTouching) return;
            isTouching = false;

            const touch = e.changedTouches[0];
            const deltaY = Math.abs(touch.clientY - touchStartY);
            const deltaX = Math.abs(touch.clientX - touchStartX);
            const distance = Math.sqrt(deltaY * deltaY + deltaX * deltaX);

            if (distance > 10) {
                if (this.showLyrics) {
                    const lyricsContent = document.getElementById('lyricsContent');
                    const scrollTop = lyricsContent.scrollTop;
                    const containerHeight = lyricsContent.offsetHeight;
                    const centerPosition = scrollTop + containerHeight / 2;

                    const lines = lyricsContent.querySelectorAll('.lyrics-line');
                    let targetLine = null;

                    for (const line of lines) {
                        const lineTop = line.offsetTop;
                        const lineHeight = line.offsetHeight;

                        if (lineTop <= centerPosition && lineTop + lineHeight >= centerPosition) {
                            targetLine = line;
                            break;
                        }
                    }

                    if (targetLine) {
                        const time = parseFloat(targetLine.dataset.time);
                        if (time && this.audioPlayer.duration) {
                            this.audioPlayer.currentTime = time;
                        }
                    }
                }
            } else {
                this.toggleLyricsView();
            }
        });

        container.addEventListener('click', (e) => {
            if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
            this.toggleLyricsView();
        });
    }

    toggleLyricsView() {
        this.showLyrics = !this.showLyrics;
        const poster = document.getElementById('fullPoster');
        const lyrics = document.getElementById('fullLyrics');

        if (this.showLyrics) {
            poster.style.display = 'none';
            lyrics.style.display = 'block';
        } else {
            poster.style.display = 'block';
            lyrics.style.display = 'none';
        }
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
        const lyricsContent = document.getElementById('lyricsContent');

        if (this.currentLyrics.length === 0) {
            lyricsContent.innerHTML = '<div class="lyrics-line">暂无歌词</div>';
            return;
        }

        lyricsContent.innerHTML = this.currentLyrics.map((line, index) =>
            `<div class="lyrics-line" data-index="${index}" data-time="${line.time}">${line.text}</div>`
        ).join('');

        this.bindLyricsScrollSync();
    }

    // 绑定歌词滑动同步事件
    bindLyricsScrollSync() {
        const lyricsContent = document.getElementById('lyricsContent');
        let scrollTimeout = null;

        lyricsContent.addEventListener('touchstart', () => {
            this.pauseLyricsAutoScroll = true;
        });

        lyricsContent.addEventListener('touchend', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.pauseLyricsAutoScroll = false;
            }, 3000);
        });
    }

    // 更新歌词位置（与播放进度同步）
    updateLyricsPosition() {
        if (!this.showLyrics || this.currentLyrics.length === 0) return;

        // 如果用户正在滑动歌词，暂停自动滚动
        if (this.pauseLyricsAutoScroll) return;

        const currentTime = this.audioPlayer.currentTime;
        const lyricsContent = document.getElementById('lyricsContent');
        const lines = lyricsContent.querySelectorAll('.lyrics-line');

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
                const containerHeight = lyricsContent.offsetHeight;
                const scrollTop = line.offsetTop - containerHeight / 2 + lineHeight / 2;
                lyricsContent.scrollTop = Math.max(0, scrollTop);
            } else {
                line.classList.remove('active');
            }
        });
    }

    // 切换喜欢状态
    async toggleLike() {
        if (!this.currentSong) return;

        const likeBtn = document.getElementById('fullLikeBtn');
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
                if (this.currentTab === 'favourite') {
                    this.loadFavouriteList();
                }
            }
        } catch (error) {
            console.error('收藏操作失败:', error);
            this.showError('收藏操作失败');
        }
    }

    // 更新喜欢按钮
    updateLikeButton() {
        const likeBtn = document.getElementById('fullLikeBtn');
        const icon = likeBtn.querySelector('i');

        if (this.currentSong && this.currentSong.isFavourite === 1) {
            likeBtn.classList.add('liked');
            icon.className = 'fas fa-heart';
        } else {
            likeBtn.classList.remove('liked');
            icon.className = 'far fa-heart';
        }
    }

    // 打开全屏播放器
    openFullScreenPlayer() {
        this.isFullScreen = true;
        const fullPlayer = document.getElementById('fullPlayer');
        // 清除之前可能残留的transform
        fullPlayer.style.transform = '';
        fullPlayer.classList.add('active');
        this.updateFullScreenPlayer();
        this.updateLikeButton();
    }

    // 关闭全屏播放器
    closeFullScreenPlayer() {
        this.isFullScreen = false;
        const fullPlayer = document.getElementById('fullPlayer');

        // 清除transform，使用CSS动画
        fullPlayer.style.transform = '';

        // 添加关闭动画类
        fullPlayer.classList.add('closing');

        // 等动画结束后隐藏
        setTimeout(() => {
            fullPlayer.classList.remove('active');
            fullPlayer.classList.remove('closing');
        }, 300);
    }

    // 随心听下一曲
    async playCloudRandomNext() {
        try {
            this.isLoading = true;

            const song = await MusicApi.cloudRandom('next');

            if (song && song.id) {
                // 添加到历史记录
                this.cloudRandomHistory.push(song);
                this.cloudRandomHistoryIndex = this.cloudRandomHistory.length - 1;

                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song];
                this.currentIndex = 0;

                // 加载歌词
                this.loadLyrics(song.lrc);

                // 播放音频
                this.loadAudio(song);
                this.audioPlayer.play().then(() => {
                    this.isPlaying = true;
                    this.updatePlayButton();
                    this.updateMiniPlayer();
                    this.updateFullScreenPlayer();
                    this.updateCloudUI();
                    this.updateLikeButton();

                    // 记录播放历史
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
        } finally {
            this.isLoading = false;
        }
    }

    // 随心听上一曲
    async playCloudRandomPrevious() {
        try {
            // 如果有历史记录，优先从历史记录中获取
            if (this.cloudRandomHistoryIndex > 0) {
                this.cloudRandomHistoryIndex--;
                const song = this.cloudRandomHistory[this.cloudRandomHistoryIndex];

                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song];
                this.currentIndex = 0;

                // 加载歌词
                this.loadLyrics(song.lrc);

                // 播放歌曲
                this.loadAudio(song);
                this.audioPlayer.play().then(() => {
                    this.isPlaying = true;
                    this.updatePlayButton();
                    this.updateMiniPlayer();
                    this.updateFullScreenPlayer();
                    this.updateCloudUI();
                }).catch(error => {
                    console.error('播放失败:', error);
                    this.showError('播放失败，请检查音频文件');
                });

                return;
            }

            // 如果没有历史记录，调用接口
            this.isLoading = true;

            const song = await MusicApi.cloudRandom('previous');

            if (song && song.id) {
                // 添加到历史记录开头
                this.cloudRandomHistory.unshift(song);
                this.cloudRandomHistoryIndex = 0;

                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song];
                this.currentIndex = 0;

                // 加载歌词
                this.loadLyrics(song.lrc);

                // 播放歌曲
                this.loadAudio(song);
                this.audioPlayer.play().then(() => {
                    this.isPlaying = true;
                    this.updatePlayButton();
                    this.updateMiniPlayer();
                    this.updateCloudUI();

                    // 记录播放历史
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
        } finally {
            this.isLoading = false;
        }
    }

    // 显示加载更多
    showLoadMore(loaderId) {
        const loader = document.getElementById(loaderId);
        loader.classList.add('active');
    }

    // 隐藏加载更多
    hideLoadMore(loaderId) {
        const loader = document.getElementById(loaderId);
        loader.classList.remove('active');
    }

    // 格式化时间

    // 格式化播放时间（相对时间）
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

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.style.animation = 'fadeOut 0.3s ease-in';
            setTimeout(() => errorDiv.remove(), 300);
        }, 3000);
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
            });

            let scrollTimer = null;

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
        const miniTimer = document.getElementById('miniTimer');
        const icon = miniTimer.querySelector('i');
        const countdown = document.getElementById('timerCountdown');

        if (minutes > 0) {
            miniTimer.classList.add('active');
            icon.className = 'fas fa-clock';
            const h = Math.floor(minutes / 3600);
            const m = Math.floor((minutes % 3600) / 60);
            const s = minutes % 60;
            const mm = m.toString().padStart(2, '0');
            const ss = s.toString().padStart(2, '0');
            countdown.textContent = h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
        } else {
            miniTimer.classList.remove('active');
            icon.className = 'fas fa-clock';
            countdown.textContent = '';
        }
    }

    // 定时器结束
    onTimerEnd() {
        this.isPlaying = false;
        this.updatePlayButton();
        this.updateMiniPlayer();
        this.showError('定时关闭已生效，播放已停止');
    }

    // 添加到播放历史
    addToPlayHistory(song) {
        this.playHistory.add(song);
    }

    // 获取播放历史
    getPlayHistory() {
        return this.playHistory.getAll();
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    window.mobileMusicPlayer = new MobileMusicPlayer();
});