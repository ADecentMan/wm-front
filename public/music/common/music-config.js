const MusicConfig = {
    get API_BASE_URL() {
        return CommonConfig.API_HOST + '/entertainment/music/queryList';
    },
    get API_FAVOURITE_URL() {
        return CommonConfig.API_HOST + '/entertainment/music/queryFavouriteList';
    },
    get API_CLOUD_RANDOM_URL() {
        return CommonConfig.API_HOST + '/entertainment/music/cloudRandom';
    },
    get API_FAVOURITE_ACTION_URL() {
        return CommonConfig.API_HOST + '/entertainment/music/favourite';
    },
    get API_EXT_ADD_URL() {
        return CommonConfig.API_HOST + '/entertainment/music/extAdd';
    }
};
