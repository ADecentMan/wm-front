let host = window.location.hostname;
let env = (host == "localhost" || host == "127.0.0.1" || host == "192.168.2.2") ? "dev" : "pro"
let frontHost = env == "dev" ? "http://" + host + ":8081" : "http://43.157.13.112:36816";
let serverHost = env == "dev" ? "http://" + host + ":8080" : "http://43.157.13.112:40254";

$.ajax({
    type: "POST",
    url: serverHost + "/entertainment/user/checkStatus",
    headers:{"WM-ENTERTAINMENT-TOKEN":getCookieValue("WM-ENTERTAINMENT-TOKEN")},
    dataType: "json",
    async: false,
    xhrFields: { withCredentials: true },
    success: function (data) {
        if ('-2' == data.code) {
            jumpToLogin();
        }
    },
    error: function (data) {
        console.log(data);
    }
});

$(document).ready(function () {
    $('.prompt_sure,.prompt_cancel').click(function () {
        $('.mask').addClass('hide');
    })
    $("#gotoMusic").click(function () {
        window.location.href = frontHost + "/music-online";
    });
    $("#gotoAnswer").click(function () {
        window.location.href = frontHost + "/chickenQuestion";
    });
    $("#initMusicList").click(function () {
        $.ajax({
            type: "GET",
            url: serverHost + "/entertainment/music/initList?keyword=",
            headers:{"WM-ENTERTAINMENT-TOKEN":getCookieValue("WM-ENTERTAINMENT-TOKEN")},
            dataType: "json",
            async: false,
            xhrFields: { withCredentials: true },
            success: function (data) {
                if ('-2' == data.code) {
                    jumpToLogin();
                } else {
                    notice("温馨提示", data.msg);
                }
            },
            error: function (data) {
                console.log(data);
            }
        });
    });
    $("#initStoryList").click(function () {
        $.ajax({
            type: "GET",
            url: serverHost + "/entertainment/story/initList?keyword=",
            headers:{"WM-ENTERTAINMENT-TOKEN":getCookieValue("WM-ENTERTAINMENT-TOKEN")},
            dataType: "json",
            async: false,
            xhrFields: { withCredentials: true },
            success: function (data) {
                if ('-2' == data.code) {
                    jumpToLogin();
                } else {
                    notice("温馨提示", data.msg);
                }
            },
            error: function (data) {
                console.log(data);
            }
        });
    });
});


function jumpToLogin() {
    let currentUrl = window.location.origin + window.location.pathname;
    window.location.href = frontHost + "/login?targetUrl=" + currentUrl;
}