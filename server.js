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

        // 2. 发起代理请求，关键修改：禁止自动重定向
        const response = await axios({
            method: 'get',
            url: targetUrl,
            headers: {
                Authorization: 'Basic bXVzaWM6bXVzaWM=' // 替换为实际Token
            },
            maxRedirects: 0, // 【关键】禁止 axios 自动跟随重定向
            validateStatus: function (status) {
                return status < 400; // 【关键】接受 301, 302 等重定向状态码为成功
            }
        });

        // 3. 如果是重定向，直接将重定向指令返回给客户端
        if (response.status === 301 || response.status === 302) {
            const redirectUrl = response.headers['location'];
            // 直接告诉用户的浏览器去新的地址下载
            return res.redirect(response.status, redirectUrl);
        }

        // 4. 如果不是重定向（理论上对于QuarkTV不会发生），则按原逻辑代理
        const filteredHeaders = { ...response.headers };
        delete filteredHeaders['www-authenticate'];
        
        res.writeHead(response.status, {
            'Content-Type': filteredHeaders['content-type'] || 'application/octet-stream',
            ...filteredHeaders
        });
        response.data.pipe(res);

    } catch (error) {
        // 错误处理
        const statusCode = error.response?.status || 502;
        if (statusCode === 401 || statusCode === 403) {
            res.status(200).send('Access denied');
        } else {
            res.status(statusCode).send('Proxy error');
        }
    }
});


app.use(express.json());

var server = app.listen(8081, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("应用实例，访问地址为 http://%s:%s", host, port)

})