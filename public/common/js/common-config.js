const CommonConfig = {
    // 中台HOST
    REMOTE_API_HOST: 'http://8.134.162.189:40254',
    // 前台HOST
    REMOTE_FRONT_HOST: 'http://8.134.162.189:36816',

    get API_HOST() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '192.168.2.40') {
            return 'http://' + hostname + ':8080';
        }
        return this.REMOTE_API_HOST;
    },
    get PORTAL_HOST() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '192.168.2.40') {
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
