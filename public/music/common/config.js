const MusicConfig = {
    API_HOST: 'http://192.168.2.40:8080',
    PORTAL_HOST: 'http://192.168.2.40:8081',

    get API_BASE_URL() {
        return this.API_HOST + '/entertainment/music/queryList';
    },
    get API_FAVOURITE_URL() {
        return this.API_HOST + '/entertainment/music/queryFavouriteList';
    },
    get API_CLOUD_RANDOM_URL() {
        return this.API_HOST + '/entertainment/music/cloudRandom';
    },
    get API_FAVOURITE_ACTION_URL() {
        return this.API_HOST + '/entertainment/music/favourite';
    },
    get API_EXT_ADD_URL() {
        return this.API_HOST + '/entertainment/music/extAdd';
    },

    redirectToLogin() {
        const currentUrl = window.location.href;
        const loginUrl = this.PORTAL_HOST + '/login?targetUrl=' + currentUrl;
        window.location.href = loginUrl;
    }
};