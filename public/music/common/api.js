function getCookieValue(cookieName) {
    let name = cookieName + "=";
    let cookieArray = document.cookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
        let currentCookie = cookieArray[i].trim();
        if (currentCookie.indexOf(name) === 0) {
            return currentCookie.substring(name.length, currentCookie.length);
        }
    }
    return "";
}

const MusicApi = {
    async request(url) {
        const token = getCookieValue("WM-ENTERTAINMENT-TOKEN");
        const headers = {};
        if (token) {
            headers['WM-ENTERTAINMENT-TOKEN'] = token;
        }
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        if (!response.ok) {
            throw new Error('网络请求失败');
        }
        const data = await response.json();
        if (data && data.code === '-2') {
            CommonConfig.redirectToLogin();
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
            CommonConfig.redirectToLogin();
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