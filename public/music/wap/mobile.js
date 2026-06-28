// 移动端音乐播放器核心功能
class MobileMusicPlayer {
    constructor() {
        // API配置（复用PC版本）
        this.apiBaseUrl = 'http://192.168.2.40:8080/entertainment/music/queryList';
        this.apiFavouriteUrl = 'http://192.168.2.40:8080/entertainment/music/queryFavouriteList';
        this.apiCloudRandomUrl = 'http://192.168.2.40:8080/entertainment/music/cloudRandom';
        this.apiFavouriteActionUrl = 'http://192.168.2.40:8080/entertainment/music/favourite';
        this.apiExtAddUrl = 'http://192.168.2.40:8080/entertainment/music/extAdd';
        
        // 当前Tab状态
        this.currentTab = 'discover'; // discover, cloud, favourite, history
        
        // 播放器状态
        this.audioPlayer = document.getElementById('audioPlayer');
        this.currentSong = null;
        this.playlist = [];
        this.currentIndex = -1;
        this.playMode = 'list'; // list, random, single
        this.isPlaying = false;
        
        // 歌词状态
        this.currentLyrics = []; // 解析后的歌词数组 [{time, text}]
        this.showLyrics = false; // 是否显示歌词
        this.pauseLyricsAutoScroll = false; // 用户滑动歌词时暂停自动滚动
        
        // 随心听历史记录（用于上一曲）
        this.cloudRandomHistory = [];
        this.cloudRandomHistoryIndex = -1;
        
        // 分页状态
        this.currentPage = 1;
        this.pageSize = 20;
        this.searchKeyword = '';
        this.isLoading = false;
        this.hasMoreData = true;
        
        // 音量状态
        this.volume = 0.3;
        this.isMuted = false;
        this.previousVolume = 0.3;
        
        // 全屏播放器状态
        this.isFullScreen = false;
        
        // 初始化
        this.init();
    }
    
    init() {
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
        
        document.getElementById('miniPlayPause').addEventListener('click', () => this.togglePlay());
        document.getElementById('miniNext').addEventListener('click', () => this.playNext());
        
        // 全屏播放器事件
        document.getElementById('closeFullPlayer').addEventListener('click', () => this.closeFullScreenPlayer());
        document.getElementById('fullPlayPause').addEventListener('click', () => this.togglePlay());
        document.getElementById('fullPrev').addEventListener('click', () => this.playPrev());
        document.getElementById('fullNext').addEventListener('click', () => this.playNext());
        document.getElementById('fullPlayMode').addEventListener('click', () => this.togglePlayMode());
        document.getElementById('fullLikeBtn').addEventListener('click', () => this.toggleLike());
        
        // 海报点击切换歌词
        document.getElementById('posterContainer').addEventListener('click', () => this.toggleLyricsView());
        
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
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // 只有向下滑动才处理
            if (deltaY > 0) {
                // 移动播放器位置
                fullPlayer.style.transform = `translateY(${deltaY}px)`;
            }
        });
        
        fullPlayer.addEventListener('touchend', (e) => {
            if (!isSwiping || !this.isFullScreen) return;
            
            const deltaY = currentY - startY;
            
            // 如果滑动距离超过100px，关闭播放器
            if (deltaY > 100) {
                this.closeFullScreenPlayer();
            } else {
                // 否则恢复位置
                fullPlayer.style.transform = '';
            }
            
            isSwiping = false;
            startY = 0;
            currentY = 0;
        });
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
            
            const url = `${this.apiBaseUrl}/${this.pageSize}/${this.currentPage}?keyword=${encodeURIComponent(this.searchKeyword)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const data = await response.json();
            
            // 检查是否未登录
            if (data && data.code === "-2") {
                let currentUrl = window.location.origin + window.location.pathname;
                const loginUrl = 'http://192.168.2.40:8081/login?targetUrl='+currentUrl;
                window.location.href = loginUrl;
                return;
            }
            
            // 确保playlist是数组
            if (Array.isArray(data)) {
                this.playlist = data;
            } else if (data && Array.isArray(data.data)) {
                this.playlist = data.data;
            } else if (data && Array.isArray(data.list)) {
                this.playlist = data.list;
            } else if (data && Array.isArray(data.items)) {
                this.playlist = data.items;
            } else {
                this.playlist = [];
            }
            
            this.renderMusicList('musicList');
            this.hasMoreData = this.playlist.length >= this.pageSize;
            
            return this.playlist.length > 0;
        } catch (error) {
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
            
            const url = `${this.apiFavouriteUrl}/${this.pageSize}/${this.currentPage}?keyword=${encodeURIComponent(this.searchKeyword)}`;
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const data = await response.json();
            
            // 检查是否未登录
            if (data && data.code === "-2") {
                const loginUrl = 'http://192.168.2.40:8081/login?targetUrl=http://192.168.2.40:8000/';
                window.location.href = loginUrl;
                return;
            }
            
            // 确保playlist是数组
            if (Array.isArray(data)) {
                this.playlist = data;
            } else if (data && Array.isArray(data.data)) {
                this.playlist = data.data;
            } else if (data && Array.isArray(data.list)) {
                this.playlist = data.list;
            } else if (data && Array.isArray(data.items)) {
                this.playlist = data.items;
            } else {
                this.playlist = [];
            }
            
            this.renderMusicList('favouriteList');
            this.hasMoreData = this.playlist.length >= this.pageSize;
            
            return this.playlist.length > 0;
        } catch (error) {
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
                    <span class="stat-icon"><i class="fas fa-play-circle"></i> ${this.formatNumber(song.listenCount || 0)}</span>
                    <span class="stat-icon"><i class="fas fa-heart"></i> ${this.formatNumber(song.likeCount || 0)}</span>
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
    
    // 播放歌曲
    playSong(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        const song = this.playlist[index];
        this.currentSong = song;
        this.currentIndex = index;
        
        // 重置歌词显示状态
        this.showLyrics = false;
        const poster = document.getElementById('fullPoster');
        const lyrics = document.getElementById('fullLyrics');
        poster.style.display = 'block';
        lyrics.style.display = 'none';
        
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
        this.audioPlayer.src = song.mp3;
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
        if (!this.currentSong) return;
        
        document.getElementById('fullTitle').textContent = this.currentSong.title;
        document.getElementById('fullArtist').textContent = this.currentSong.artist;
        
        const posterImg = document.querySelector('#fullPoster img');
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
        // 迷你播放器按钮
        const miniPlayBtn = document.getElementById('miniPlayPause');
        const miniIcon = miniPlayBtn.querySelector('i');
        
        // 全屏播放器按钮
        const fullPlayBtn = document.getElementById('fullPlayPause');
        const fullIcon = fullPlayBtn.querySelector('i');

        // 控制迷你播放器海报旋转
        const miniPosterImg = document.querySelector('#miniPoster img');
        
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
        
        switch (this.playMode) {
            case 'list':
                icon.className = 'fas fa-list';
                modeBtn.title = '列表循环';
                break;
            case 'random':
                icon.className = 'fas fa-random';
                modeBtn.title = '随机播放';
                break;
            case 'single':
                icon.className = 'fas fa-redo';
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
                const apiUrl = `${this.apiExtAddUrl}?type=listen&id=${musicId}&musicTitle=${encodeURIComponent(musicTitle)}`;
                
                await fetch(apiUrl, {
                    method: 'GET',
                    credentials: 'include'
                });
                
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
        document.getElementById('fullCurrentTime').textContent = this.formatTime(currentTime);
    }
    
    // 更新总时长
    updateTotalTime() {
        const duration = this.audioPlayer.duration;
        document.getElementById('fullTotalTime').textContent = this.formatTime(duration);
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
    
    // 切换海报/歌词显示
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
            this.currentLyrics = this.parseLyrics(lrcText);
            this.renderLyrics();
        } catch (error) {
            console.error('加载歌词失败:', error);
            this.currentLyrics = [];
            this.renderLyrics();
        }
    }
    
    // 解析歌词文本
    parseLyrics(lrcText) {
        const lines = lrcText.split('\n');
        const lyrics = [];
        
        for (const line of lines) {
            // 匹配时间标签格式 [00:00.00] 或 [00:00]
            const match = line.match(/\[(\d{2}):(\d{2})\.?(\d{2})?\]/);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = match[3] ? parseInt(match[3]) : 0;
                const time = minutes * 60 + seconds + milliseconds / 100;
                const text = line.replace(/\[\d{2}:\d{2}\.\d{2}\]/, '').trim();
                
                if (text) {
                    lyrics.push({ time, text });
                }
            }
        }
        
        return lyrics;
    }
    
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
        
        // 绑定歌词点击事件
        lyricsContent.querySelectorAll('.lyrics-line').forEach(line => {
            line.addEventListener('click', (e) => {
                const time = parseFloat(e.target.dataset.time);
                if (time && this.audioPlayer.duration) {
                    this.audioPlayer.currentTime = time;
                }
            });
        });
        
        // 绑定歌词滑动同步事件
        this.bindLyricsScrollSync();
    }
    
    // 绑定歌词滑动同步事件
    bindLyricsScrollSync() {
        const lyricsContent = document.getElementById('lyricsContent');
        let isScrolling = false;
        let scrollTimeout = null;
        
        lyricsContent.addEventListener('touchstart', () => {
            isScrolling = true;
            // 暂停自动滚动
            this.pauseLyricsAutoScroll = true;
        });
        
        lyricsContent.addEventListener('touchend', () => {
            isScrolling = false;
            // 延迟恢复自动滚动，给用户时间查看
            scrollTimeout = setTimeout(() => {
                this.pauseLyricsAutoScroll = false;
            }, 3000);
        });
        
        lyricsContent.addEventListener('scroll', () => {
            if (isScrolling) {
                clearTimeout(scrollTimeout);
                // 根据滚动位置找到对应的歌词行
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
                
                // 如果找到了目标行，同步播放进度
                if (targetLine) {
                    const time = parseFloat(targetLine.dataset.time);
                    if (time && this.audioPlayer.duration) {
                        // 滑动时不立即同步，等松手后再同步
                        lyricsContent.addEventListener('touchend', () => {
                            this.audioPlayer.currentTime = time;
                        }, { once: true });
                    }
                }
            }
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
            let apiUrl;
            if (likeBtn.classList.contains('liked')) {
                // 取消收藏
                apiUrl = `${this.apiFavouriteActionUrl}?type=remove&musicId=${musicId}&musicTitle=${encodeURIComponent(musicTitle)}`;
            } else {
                // 添加收藏
                apiUrl = `${this.apiFavouriteActionUrl}?type=add&musicId=${musicId}&musicTitle=${encodeURIComponent(musicTitle)}`;
            }
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
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
            
            const url = `${this.apiCloudRandomUrl}?type=next`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const data = await response.json();
            const song = Array.isArray(data) ? data[0] : data;
            
            // 检查是否未登录
            if (song && song.code === "-2") {
                const loginUrl = 'http://192.168.2.40:8081/login?targetUrl=http://192.168.2.40:8000/';
                window.location.href = loginUrl;
                return;
            }
            
            // 检查返回的歌曲数据是否有效
            if (song && song.id) {
                // 添加到历史记录
                this.cloudRandomHistory.push(song);
                this.cloudRandomHistoryIndex = this.cloudRandomHistory.length - 1;
                
                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song];
                this.currentIndex = 0;
                
                // 播放音频
                this.audioPlayer.src = song.mp3;
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
                
                // 播放歌曲
                this.audioPlayer.src = song.mp3;
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
            
            const url = `${this.apiCloudRandomUrl}?type=previous`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const data = await response.json();
            const song = Array.isArray(data) ? data[0] : data;
            
            // 检查是否未登录
            if (song && song.code === "-2") {
                const loginUrl = 'http://192.168.2.40:8081/login?targetUrl=http://192.168.2.40:8000/';
                window.location.href = loginUrl;
                return;
            }
            
            // 检查返回的歌曲数据是否有效
            if (song && song.id) {
                // 添加到历史记录开头
                this.cloudRandomHistory.unshift(song);
                this.cloudRandomHistoryIndex = 0;
                
                // 设置当前歌曲
                this.currentSong = song;
                this.playlist = [song];
                this.currentIndex = 0;
                
                // 播放歌曲
                this.audioPlayer.src = song.mp3;
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
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // 格式化数字
    formatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    }
    
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
    
    // 添加到播放历史
    addToPlayHistory(song) {
        try {
            // 从localStorage获取播放历史（复用PC版本的存储）
            let history = this.getPlayHistory();
            
            // 创建历史记录项
            const historyItem = {
                id: song.id,
                title: song.title,
                artist: song.artist,
                mp3: song.mp3,
                poster: song.poster,
                listenCount: song.listenCount,
                likeCount: song.likeCount,
                isFavourite: song.isFavourite,
                playTime: Date.now()
            };
            
            // 移除已存在的相同歌曲（避免重复）
            history = history.filter(item => item.id !== song.id);
            
            // 添加到历史记录开头（最新的在前面）
            history.unshift(historyItem);
            
            // 只保留最近500条
            if (history.length > 500) {
                history = history.slice(0, 500);
            }
            
            // 保存到localStorage
            localStorage.setItem('playHistory', JSON.stringify(history));
            
            console.log('播放历史已更新，当前记录数:', history.length);
        } catch (error) {
            console.error('保存播放历史失败:', error);
        }
    }
    
    // 获取播放历史
    getPlayHistory() {
        try {
            const historyStr = localStorage.getItem('playHistory');
            if (historyStr) {
                return JSON.parse(historyStr);
            }
            return [];
        } catch (error) {
            console.error('读取播放历史失败:', error);
            return [];
        }
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    window.mobileMusicPlayer = new MobileMusicPlayer();
});
