const express = require('express');
const axios = require('axios');
const app = express();

app.use('/music', express.static('F:/Audio/Music'));
app.use('/public', express.static('public'));
app.use('/css', express.static('public/navigate/css'));
app.use('/js', express.static('public/navigate/js'));
app.use('/lib', express.static('public/navigate/lib'));

app.get('/index', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
});

app.get('/login', function (req, res) {
    res.sendFile(__dirname + "/public/login/index.html");
});

app.get('/music-online', function (req, res) {
    res.sendFile(__dirname + "/public/music-old/index.html");
});

app.get('/pcMusic', function (req, res) {
    res.sendFile(__dirname + "/public/music/pc/index.html");
});

app.get('/wapMusic', function (req, res) {
    res.sendFile(__dirname + "/public/music/wap/index.html");
});

app.get('/story-online', function (req, res) {
    res.sendFile(__dirname + "/public/story/index.html");
});

app.get('/navigate', function (req, res) {
    res.sendFile(__dirname + "/public/navigate/index.html");
});

// 动态路径代理
app.get('/proxy/:path(*)', async (req, res) => {
    try {
        // 1. 构建目标URL
        const targetPath = req.params.path;
        const targetUrl = `http://192.168.2.30:5244/dav/${targetPath}`;

        // 2. 发起代理请求
        const response = await axios({
            method: 'get',
            url: targetUrl,
            headers: {
                Authorization: 'Basic bXVzaWM6bXVzaWM=', // 替换为实际Token
                // 【新增】伪装 Referer，防止网盘因防盗链拒绝图片请求
                Referer: 'https://pan.quark.cn/' 
            },
            responseType: 'stream', // 【关键】保持流式传输，节省内存
            maxRedirects: 0,        // 【关键】禁止 axios 自动跟随重定向
            validateStatus: function (status) {
                return status < 500; // 【修改】允许接收 4xx 状态码（如404），以便透传给前端
            }
        });

        // 3. 如果是重定向 (301/302)，直接将重定向指令返回给客户端
        // 这样浏览器会直接去夸克服务器下载，不占用你的服务器带宽
        if (response.status === 301 || response.status === 302) {
            const redirectUrl = response.headers['location'];
            // 直接告诉用户的浏览器去新的地址下载
            return res.redirect(response.status, redirectUrl);
        }

        // 4. 如果不是重定向（例如 OpenList 直接返回了文件流，或者返回了 404）
        // 【修复点】：此时必须正确设置响应头，否则图片会因为类型错误或跨域而失败
        
        // 获取上游返回的所有头信息
        const upstreamHeaders = response.headers;

        // 设置我们要发送给浏览器的头信息
        const finalHeaders = {
            // 【修复图片404关键】：允许跨域访问。
            // 很多播放器或网页加载图片需要这个头，否则会被浏览器拦截报网络错误
            'Access-Control-Allow-Origin': '*', 
            
            // 传递真实的文件类型 (image/jpeg, audio/mpeg 等)
            'Content-Type': upstreamHeaders['content-type'] || 'application/octet-stream',
            
            // 传递文件大小，利于进度条显示
            'Content-Length': upstreamHeaders['content-length'],
            
            // 传递缓存控制，避免重复请求
            'Cache-Control': upstreamHeaders['cache-control'] || 'public, max-age=3600'
        };

        // 移除不应该传递给客户端的头（如 hop-by-hop 头）
        delete finalHeaders['transfer-encoding'];
        delete finalHeaders['connection'];
        delete finalHeaders['keep-alive'];
        delete finalHeaders['www-authenticate'];

        // 发送状态码和头信息
        res.writeHead(response.status, finalHeaders);

        // 将上游的数据流管道传输给客户端
        // 如果上游是404，这里也会把404的内容（通常是HTML或JSON）传给前端
        response.data.pipe(res);

    } catch (error) {
        console.error('Proxy Error:', error.message);
        
        // 5. 增强错误处理
        // 只有当服务器彻底崩溃或无法连接 OpenList 时才由 Node.js 返回错误页
        if (!res.headersSent) {
            res.status(502).send('Server Proxy Error');
        }
    }
});



app.use(express.json());

var server = app.listen(8081, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("应用实例，访问地址为 http://%s:%s", host, port)

})