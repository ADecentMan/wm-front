let frontHost = CommonConfig.PORTAL_HOST;
let serverHost = CommonConfig.API_HOST;

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