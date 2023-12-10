let host = window.location.hostname;
let env = (host == "localhost" || host == "127.0.0.1" || host == "192.168.2.2") ? "dev" : "pro"
let frontHost = env == "dev" ? "http://192.168.2.2:8081" : "http://222.211.75.240:42876";
let serverHost = env == "dev" ? "http://192.168.2.2:8080" : "http://222.211.75.240:19526";

let token = getParam("token");
if (null == token || "" == token) {
    token = window.localStorage.getItem("token");
}
$.ajax({
    type: "POST",
    url: serverHost + "/entertainment/user/checkStatus?token=" + token,
    dataType: "json",
    async: false,
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
        window.location.href = frontHost + "/music-online?token=" + token;
    });
    $("#gotoAnswer").click(function () {
        window.location.href = frontHost + "/chickenQuestion?token=" + token;
    });
    $("#initList").click(function () {
        $.ajax({
            type: "GET",
            url: serverHost + "/entertainment/music/initList?keyword=&token=" + token,
            dataType: "json",
            async: false,
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