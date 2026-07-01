const MusicApi = {
    async request(url) {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('网络请求失败');
        }
        const data = await response.json();
        if (data && data.code === '-2') {
            MusicConfig.redirectToLogin();
            throw new Error('UNAUTHORIZED');
        }
        return data;
    },

    extractList(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.list)) return data.list;
        if (data && Array.isArray(data.items)) return data.items;
        return [];
    },

    async queryList(pageSize, currentPage, keyword) {
        const url = `${MusicConfig.API_BASE_URL}/${pageSize}/${currentPage}?keyword=${encodeURIComponent(keyword)}`;
        const data = await this.request(url);
        return this.extractList(data);
    },

    async queryFavouriteList(pageSize, currentPage, keyword) {
        const url = `${MusicConfig.API_FAVOURITE_URL}/${pageSize}/${currentPage}?keyword=${encodeURIComponent(keyword)}`;
        const data = await this.request(url);
        return this.extractList(data);
    },

    async cloudRandom(type) {
        const url = `${MusicConfig.API_CLOUD_RANDOM_URL}?type=${type}`;
        const data = await this.request(url);
        const song = Array.isArray(data) ? data[0] : data;
        if (song && song.code === '-2') {
            MusicConfig.redirectToLogin();
            throw new Error('UNAUTHORIZED');
        }
        return song;
    },

    async extAdd(type, id, musicTitle) {
        const url = `${MusicConfig.API_EXT_ADD_URL}?type=${type}&id=${id}&musicTitle=${encodeURIComponent(musicTitle)}`;
        return this.request(url);
    },

    async favourite(action, musicId, musicTitle) {
        const url = `${MusicConfig.API_FAVOURITE_ACTION_URL}?type=${action}&musicId=${musicId}&musicTitle=${encodeURIComponent(musicTitle)}`;
        return this.request(url);
    }
};