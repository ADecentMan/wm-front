// 音乐播放器核心功能
class MusicPlayer {
    constructor() {
        // API配置
        this.apiBaseUrl = 'http://10.164.152.106:8080/entertainment/music/queryList';
        this.apiFavouriteUrl = 'http://10.164.152.106:8080/entertainment/music/queryFavouriteList';
        this.apiCloudRandomUrl = 'http://10.164.152.106:8080/entertainment/music/cloudRandom';
        
        // 当前菜单状态
        this.currentMenu = 'discover'; // discover, cloudRandom, favourite, history
        
        // 播放器状态
        this.audioPlayer = document.getElementById('audioPlayer');
        this.currentSong = null;
        this.playlist = [];
        this.currentIndex = -1;
        this.playMode = 'list'; // list, random, single
        this.isPlaying = false;
        
        // 随心听历史记录（用于上一曲）
        this.cloudRandomHistory = [];
        this.cloudRandomHistoryIndex = -1;
        
        // 分页状态
        this.currentPage = 1;
        this.pageSize = 20;
        this.searchKeyword = '';
        
        // 音量状态
        this.volume = 0.3;
        this.isMuted = false;
        this.previousVolume = 0.3;
        
        // 隐藏播放器状态
        this.isHidden = false;
        this.originalTitle = document.title;
        this.originalFavicon = document.querySelector('link[rel="icon"]').href;
        
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
        // 菜单点击事件
        const menuItems = document.querySelectorAll('.menu-item');
        const searchBar = document.querySelector('.search-bar');
        const searchIcon = document.querySelector('.search-bar i');
        const searchInput = document.getElementById('searchInput');
        
        menuItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                // 更新菜单激活状态
                menuItems.forEach(mi => mi.classList.remove('active'));
                item.classList.add('active');
                
                // 根据菜单切换内容
                if (index === 0) {
                    // 发现音乐
                    this.currentMenu = 'discover';
                    this.currentPage = 1;
                    this.searchKeyword = '';
                    searchInput.value = '';
                    // 显示搜索图标、恢复placeholder并启用输入
                    searchIcon.style.display = 'block';
                    searchInput.placeholder = '搜索音乐、歌手';
                    searchInput.disabled = false;
                    this.loadMusicList();
                } else if (index === 1) {
                    // 音韵随心
                    this.currentMenu = 'cloudRandom';
                    this.currentPage = 1;
                    this.searchKeyword = '';
                    searchInput.value = '';
                    // 隐藏搜索图标、清空placeholder并禁用输入
                    searchIcon.style.display = 'none';
                    searchInput.placeholder = '';
                    searchInput.disabled = true;
                    // 先渲染界面，然后自动播放一首歌
                    this.loadMusicList().then(() => {
                        // 如果当前没有播放歌曲，自动播放下一曲
                        if (!this.currentSong) {
                            this.playCloudRandomNext();
                        }
                    });
                } else if (index === 2) {
                    // 我的收藏
                    this.currentMenu = 'favourite';
                    this.currentPage = 1;
                    this.searchKeyword = '';
                    searchInput.value = '';
                    // 显示搜索图标、恢复placeholder并启用输入
                    searchIcon.style.display = 'block';
                    searchInput.placeholder = '搜索音乐、歌手';
                    searchInput.disabled = false;
                    this.loadMusicList();
                } else if (index === 3) {
                    // 播放历史
                    this.currentMenu = 'history';
                    this.currentPage = 1;
                    this.searchKeyword = '';
                    searchInput.value = '';
                    // 显示搜索图标、恢复placeholder并启用输入
                    searchIcon.style.display = 'block';
                    searchInput.placeholder = '搜索音乐、歌手';
                    searchInput.disabled = false;
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
        document.getElementById('likeBtn').addEventListener('click', () => this.toggleLike());
        
        // 进度条事件
        const progressBar = document.getElementById('progressBar');
        progressBar.addEventListener('click', (e) => this.seekTo(e));
        
        let isDraggingProgress = false;
        progressBar.addEventListener('mousedown', () => isDraggingProgress = true);
        document.addEventListener('mouseup', () => isDraggingProgress = false);
        progressBar.addEventListener('mousemove', (e) => {
            if (isDraggingProgress) this.seekTo(e);
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
        
        document.getElementById('volumeBtn').addEventListener('click', () => this.toggleMute());
        
        // 分页事件
        document.getElementById('prevPage').addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('nextPage').addEventListener('click', () => this.goToPage(this.currentPage + 1));
        
        // 音频播放器事件
        this.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateTotalTime());
        this.audioPlayer.addEventListener('ended', () => this.onSongEnded());
        this.audioPlayer.addEventListener('error', (e) => this.handleError(e));
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    // 加载音乐列表
    async loadMusicList() {
        console.log('=== loadMusicList 开始 ===');
        console.log('当前菜单:', this.currentMenu);
        console.log('搜索关键词:', this.searchKeyword);
        
        try {
            // 如果是随心听模式，显示特殊界面
            if (this.currentMenu === 'cloudRandom') {
                console.log('>>> 随心听模式，显示特殊界面');
                this.renderCloudRandomUI();
                // 随心听模式下不调用loadMusicList，而是直接调用playCloudRandomNext
                return true;
            }
            
            // 如果是播放历史菜单，从localStorage读取
            if (this.currentMenu === 'history') {
                console.log('>>> 检测到播放历史菜单，从localStorage读取');
                const history = this.getPlayHistory();
                console.log('播放历史记录数:', history.length);
                
                // 如果有搜索关键词，过滤历史记录
                if (this.searchKeyword) {
                    this.playlist = history.filter(song => 
                        song.title.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
                        song.artist.toLowerCase().includes(this.searchKeyword.toLowerCase())
                    );
                    console.log('过滤后的历史记录数:', this.playlist.length);
                } else {
                    this.playlist = history;
                }
                
                this.renderMusicList();
                this.updatePagination();
                console.log('=== 播放历史加载完成，不调用API ===');
                return this.playlist.length > 0;
            }
            
            console.log('>>> 不是播放历史菜单，调用API接口');
            
            // 根据当前菜单选择不同的API
            let apiUrl;
            if (this.currentMenu === 'favourite') {
                apiUrl = this.apiFavouriteUrl;
                console.log('使用收藏列表API:', apiUrl);
            } else {
                apiUrl = this.apiBaseUrl;
                console.log('使用发现音乐API:', apiUrl);
            }
            
            const url = `${apiUrl}/${this.pageSize}/${this.currentPage}?keyword=${encodeURIComponent(this.searchKeyword)}`;
            console.log('完整API URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include' // 包含cookie
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const data = await response.json();
            console.log('API返回数据:', data); // 调试日志
            
            // 检查是否未登录
            if (data && data.code === "-2") {
                console.log('用户未登录，跳转到登录页面');
                // 跳转到登录页面
                const loginUrl = 'http://10.164.152.106:8081/login?targetUrl=http://10.164.152.106:8081/music-online2';
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
                console.warn('数据格式不符合预期:', data);
            }
            
            this.renderMusicList();
            this.updatePagination();
            
            // 返回是否有数据
            return this.playlist.length > 0;
        } catch (error) {
            console.error('加载音乐列表失败:', error);
            this.showError('加载音乐列表失败，请检查网络连接');
            return false;
        }
    }
    
    // 渲染音乐列表
    renderMusicList() {
        const musicList = document.getElementById('musicList');
        
        // 确保playlist是数组
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
        
        musicList.innerHTML = this.playlist.map((song, index) => {
            // 如果是播放历史，显示播放时间
            let statsHtml;
            if (this.currentMenu === 'history' && song.playTime) {
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
                    <div class="music-number">${(this.currentPage - 1) * this.pageSize + index + 1}</div>
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
        musicList.querySelectorAll('.music-item').forEach(item => {
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
        
        // 更新底部播放栏UI
        document.getElementById('songTitle').textContent = song.title;
        document.getElementById('songArtist').textContent = song.artist;
        
        const posterImg = document.querySelector('#playerPoster img');
        posterImg.src = song.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E';
        
        // 更新喜欢状态
        this.updateLikeButton();
        
        // 播放音频
        this.audioPlayer.src = song.mp3;
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
        
        // 如果是随心听模式，更新随心听按钮
        if (this.currentMenu === 'cloudRandom') {
            this.updateCloudPlayButton();
        }
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
            
            // 如果播放到最后一首，自动翻页
            if (newIndex >= this.playlist.length) {
                // 尝试加载下一页
                const nextPage = this.currentPage + 1;
                const hasNextData = await this.goToPage(nextPage);
                
                // 如果下一页没有数据，跳转到第一页
                if (!hasNextData) {
                    await this.goToPage(1);
                }
                
                // 从新列表的第一首开始播放
                newIndex = 0;
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
        
        const modeBtn = document.getElementById('playMode');
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
    // 歌曲播放结束
    async onSongEnded() {
        // 调用播放统计接口
        if (this.currentSong) {
            try {
                const musicId = this.currentSong.id;
                const musicTitle = this.currentSong.title;
                const apiUrl = `http://10.164.152.106:8080/entertainment/music/extAdd?type=listen&id=${musicId}&musicTitle=${encodeURIComponent(musicTitle)}`;
                
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
        
        document.getElementById('progress').style.width = `${progress}%`;
        document.getElementById('progressHandle').style.left = `calc(${progress}% - 6px)`;
        document.getElementById('currentTime').textContent = this.formatTime(currentTime);
    }
    
    // 更新总时长
    updateTotalTime() {
        const duration = this.audioPlayer.duration;
        document.getElementById('totalTime').textContent = this.formatTime(duration);
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
    // 切换喜欢状态
    async toggleLike() {
        if (!this.currentSong) return;
        
        const likeBtn = document.getElementById('likeBtn');
        const icon = likeBtn.querySelector('i');
        const musicId = this.currentSong.id;
        const musicTitle = this.currentSong.title;
        
        try {
            let apiUrl;
            if (likeBtn.classList.contains('liked')) {
                // 取消收藏
                apiUrl = `http://10.164.152.106:8080/entertainment/music/favourite?type=remove&musicId=${musicId}&musicTitle=${encodeURIComponent(musicTitle)}`;
            } else {
                // 添加收藏
                apiUrl = `http://10.164.152.106:8080/entertainment/music/favourite?type=add&musicId=${musicId}&musicTitle=${encodeURIComponent(musicTitle)}`;
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
    
    // 分页功能
    async goToPage(page) {
        if (page < 1) return;
        
        this.currentPage = page;
        await this.loadMusicList();
    }
    
    // 更新分页状态
    updatePagination() {
        const pagination = document.getElementById('pagination');
        
        // 播放历史不需要分页，隐藏分页控件
        if (this.currentMenu === 'history') {
            pagination.style.display = 'none';
            return;
        }
        
        // 其他菜单显示分页控件
        pagination.style.display = 'flex';
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('prevPage').disabled = this.currentPage <= 1;
        document.getElementById('nextPage').disabled = this.playlist.length < this.pageSize;
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
        try {
            // 从localStorage获取播放历史
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
                playTime: Date.now() // 添加播放时间戳
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
                                    <span><i class="fas fa-play-circle"></i> ${this.formatNumber(this.currentSong.listenCount || 0)}</span>
                                    <span><i class="fas fa-heart"></i> ${this.formatNumber(this.currentSong.likeCount || 0)}</span>
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
        
        // 隐藏分页控件
        const pagination = document.getElementById('pagination');
        pagination.style.display = 'none';
    }
    
    // 随心听下一曲
    async playCloudRandomNext() {
        try {
            console.log('>>> 随心听下一曲，调用接口');
            
            const url = `${this.apiCloudRandomUrl}?type=next`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const data = await response.json();
            console.log('随心听下一曲接口原始返回:', data);
            // 返回的是数组，取第一个元素
            const song = Array.isArray(data) ? data[0] : data;
            console.log('随心听下一曲解析后歌曲:', song);
            
            // 检查是否未登录
            if (song && song.code === "-2") {
                console.log('用户未登录，跳转到登录页面');
                const loginUrl = 'http://10.164.152.106:8081/login?targetUrl=http://10.164.152.106:8000/';
                window.location.href = loginUrl;
                return;
            }
            
            // 检查返回的歌曲数据是否有效
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
                
                // 播放音频
                this.audioPlayer.src = song.mp3;
                this.audioPlayer.play().then(() => {
                    console.log('歌曲播放成功:', song.title);
                    this.isPlaying = true;
                    this.updatePlayButton();
                    
                    // 更新底部播放栏
                    document.getElementById('songTitle').textContent = song.title;
                    document.getElementById('songArtist').textContent = song.artist;
                    const posterImg = document.querySelector('#playerPoster img');
                    posterImg.src = song.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E';
                    posterImg.classList.add('rotating');
                    
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
                
                // 播放歌曲
                this.audioPlayer.src = song.mp3;
                this.audioPlayer.play().then(() => {
                    console.log('歌曲播放成功:', song.title);
                    this.isPlaying = true;
                    this.updatePlayButton();
                    
                    // 更新底部播放栏
                    document.getElementById('songTitle').textContent = song.title;
                    document.getElementById('songArtist').textContent = song.artist;
                    const posterImg = document.querySelector('#playerPoster img');
                    posterImg.src = song.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E';
                    posterImg.classList.add('rotating');
                }).catch(error => {
                    console.error('播放失败:', error);
                    this.showError('播放失败，请检查音频文件');
                });
                
                return;
            }
            
            // 如果没有历史记录，调用接口
            console.log('没有历史记录，调用接口获取上一曲');
            const url = `${this.apiCloudRandomUrl}?type=previous`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            
            const data = await response.json();
            console.log('随心听上一曲接口原始返回:', data);
            // 返回的是数组，取第一个元素
            const song = Array.isArray(data) ? data[0] : data;
            console.log('随心听上一曲解析后歌曲:', song);
            
            // 检查是否未登录
            if (song && song.code === "-2") {
                console.log('用户未登录，跳转到登录页面');
                const loginUrl = 'http://10.164.152.106:8081/login?targetUrl=http://10.164.152.106:8000/';
                window.location.href = loginUrl;
                return;
            }
            
            // 检查返回的歌曲数据是否有效
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
                
                // 播放歌曲
                this.audioPlayer.src = song.mp3;
                this.audioPlayer.play().then(() => {
                    console.log('歌曲播放成功:', song.title);
                    this.isPlaying = true;
                    this.updatePlayButton();
                    
                    // 更新底部播放栏
                    document.getElementById('songTitle').textContent = song.title;
                    document.getElementById('songArtist').textContent = song.artist;
                    const posterImg = document.querySelector('#playerPoster img');
                    posterImg.src = song.poster || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'%3E%3Crect fill=\'%23ddd\' width=\'60\' height=\'60\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23999\' font-size=\'20\'%3E🎵%3C/text%3E%3C/svg%3E';
                    posterImg.classList.add('rotating');
                    
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
        this.changeFavicon('./public/music2/fake-favicon.png');
        
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
            background-image: url('./public/music2/fake-bg.png');
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