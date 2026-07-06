const CommonConfig = {
    // 中台HOST
    REMOTE_API_HOST: 'https://my.r95674245.nyat.app:38973',
    // 前台HOST
    REMOTE_FRONT_HOST: 'https://www.r95674245.nyat.app:46195',

    get API_HOST() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '192.168.2.30' || hostname === '192.168.2.40') {
            return 'http://' + hostname + ':8080';
        }
        return this.REMOTE_API_HOST;
    },
    get PORTAL_HOST() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '192.168.2.30' || hostname === '192.168.2.40') {
            return 'http://' + hostname + ':8081';
        }
        return this.REMOTE_FRONT_HOST;
    },

    redirectToLogin() {
        const currentUrl = window.location.href;
        const loginUrl = this.PORTAL_HOST + '/login?targetUrl=' + currentUrl;
        window.location.href = loginUrl;
    }
};
