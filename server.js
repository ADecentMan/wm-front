var express = require('express');
var app = express();

app.use('/public', express.static('public'));

app.get('/music-online', function (req, res) {
    res.sendFile(__dirname + "/" + "music.html");
});

app.get('/login', function (req, res) {
    res.sendFile(__dirname + "/" + "login.html");
});

app.get('/chickenQuestion', function (req, res) {
    res.sendFile(__dirname + "/" + "chickenQuestion.html");
});

app.use(express.json());

var server = app.listen(8081, function () {

    var host = server.address().address
    var port = server.address().port

    console.log("应用实例，访问地址为 http://%s:%s", host, port)

})