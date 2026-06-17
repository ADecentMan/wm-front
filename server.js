const express = require('express');
const axios = require('axios');
const app = express();

app.use('/public', express.static('public'));
app.use('/css', express.static('public/navigate/css'));
app.use('/js', express.static('public/navigate/js'));
app.use('/lib', express.static('public/navigate/lib'));

app.get('/index', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
});

app.get('/login', function (req, res) {
    res.sendFile(__dirname + "/" + "login.html");
});

app.get('/music-online', function (req, res) {
    res.sendFile(__dirname + "/" + "music.html");
});

app.get('/story-online', function (req, res) {
    res.sendFile(__dirname + "/" + "story.html");
});

app.get('/chickenQuestion', function (req, res) {
    res.sendFile(__dirname + "/" + "chickenQuestion.html");
});

app.get('/navigate', function (req, res) {
    res.sendFile(__dirname + "/public/navigate/navigate.html");
});

app.get('/test', function (req, res) {
    res.sendFile(__dirname + "/test.html");
});

app.get('/test-navigate', function (req, res) {
    res.sendFile(__dirname + "/test-navigate.html");
});

// 动态路径代理
app.get('/proxy/:path(*)', async (req, res) => {
    try {
        // 1. 构建目标URL
        const targetPath = req.params.path;
        const targetUrl = `http://192.168.2.30:5244/dav/${targetPath}`;
        // const targetUrl = `http://101.126.83.165:5244/dav/${targetPath}`;

        // 2. 发起代理请求
        const response = await axios({
            method: 'get',
            url: targetUrl,
            headers: {
                Authorization: 'Basic bXVzaWM6bXVzaWM=' // 替换为实际Token
            },
            responseType: 'stream'
        });

        // 关键修改1：移除WWW-Authenticate头
        const filteredHeaders = { ...response.headers };
        delete filteredHeaders['www-authenticate'];

        // 关键修改2：强制覆盖状态码为200（即使源返回401/403）
        res.writeHead(200, {
            'Content-Type': filteredHeaders['content-type'] || 'application/octet-stream',
            ...filteredHeaders
        });

        // // 3. 动态设置响应头
        // const contentType = response.headers['content-type'];
        // res.set({
        //     'Content-Type': contentType || 'application/octet-stream',
        //     'Content-Length': response.headers['content-length']
        // });

        // 4. 管道传输数据
        response.data.pipe(res);

    } catch (error) {
        // 关键修改3：避免传递401/403状态码
        const statusCode = error.response?.status || 502;
        if (statusCode === 401 || statusCode === 403) {
            res.status(200).send('Access denied'); // 返回200但提示无权限
        } else {
            res.status(statusCode).send('Proxy error');
        }

        // // 5. 增强错误处理
        // console.error('代理错误:', error.message);
        // res.status(error.response?.status || 502).send(
        //     error.response?.statusText || 'Bad Gateway'
        // );
    }
});


app.use(express.json());

var server = app.listen(8081, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("应用实例，访问地址为 http://%s:%s", host, port)

})