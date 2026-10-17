// 从同级 json 目录下的 endPoint.json 读取远程环境配置
let endPoint = {};
(function () {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', (document.currentScript.src || '').replace(/js\/common-config\.js(\?.*)?$/, 'json/endPoint.json'), false);
        xhr.send(null);
        if (xhr.status === 200 || xhr.status === 0) {
            endPoint = JSON.parse(xhr.responseText);
        }
    } catch (e) {
        console.error('加载 endPoint.json 失败:', e);
    }
})();

const CommonConfig = {
    // 中台HOST（配置在 endPoint.json 中）
    REMOTE_API_HOST: endPoint.REMOTE_API_HOST,
    // 前台HOST（配置在 endPoint.json 中）
    REMOTE_FRONT_HOST: endPoint.REMOTE_FRONT_HOST,

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
