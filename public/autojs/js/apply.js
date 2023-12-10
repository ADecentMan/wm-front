let host = window.location.hostname;
let env = ( host == "localhost" || host == "127.0.0.1" || host == "192.168.2.2")? "dev" : "pro"
let frontHost = env == "dev" ? "http://192.168.2.2:8081" : "http://222.211.75.240:42876";
let serverHost = env == "dev" ? "http://192.168.2.2:8080" : "http://222.211.75.240:19526";
let token = getParam("token");
if (null == token || "" == token) {
    token = window.localStorage.getItem("token");
}

var apply = apply || {};


//选择银行模块
//流畅滚动模拟组件
;(function () {
    $.extend($.fn, {
        scrollTo: function (m) {
            var curST = $(this).scrollTop();
            var n = curST, timer = null, that = this;
            var scrollDis = m - curST;
            var smoothScroll = function (m) {
                //scrollDis>0：向上滚动，scrollDis<=0向下滚动
                var per = Math.round(scrollDis / 50); //每次滚动的距离
                n = n + per;
                if (curST == n) { //多次点击同一个节点的时候，去除死循环
                    window.clearInterval(timer);
                    return false;
                }
                if (scrollDis >= 0) {
                    if (n >= m) {
                        window.clearInterval(timer);
                        return false;
                    }
                } else {
                    if (n <= m) {
                        window.clearInterval(timer);
                        return false;
                    }
                }
                that.scrollTop(n);
            };
            timer = window.setInterval(function () {
                smoothScroll(m);
            }, 20);
        }
    })
})()

apply.submit = function () {
    $("#submit").on("click", function () {
        let answerList = [];
        if ($("#answer1").val().trim() !== '') {
            answerList.push($("#answer1").val());
        }
        if ($("#answer2").val().trim() !== '') {
            answerList.push($("#answer2").val());
        }
        if (0 === answerList.length) {
            notice("眼瞎提示", "你瞎吗？不填答案就提交？？？");
            return;
        }
        $.ajax({
            type: "POST",
            url: serverHost + "/entertainment/alipay/chickenAnswer/submit?token=" + token,
            contentType: "application/json",
            data: JSON.stringify({
                    "date": $("#date").val(),
                    "answerList": answerList
                }
            ),
            success: function (data) {
                if ('-2' == data.code) {
                    jumpToLogin();
                } else if ("0" == data.code) {
                    $("#answer1").val("");
                    $("#answer2").val("");
                    notice("温馨提示", "提交成功！");
                } else {
                    notice("温馨提示", data.msg);
                }
            },
            error: function (data) {
                console.log(data);
            }
        });
    })
}
apply.initDate = function () {
    let date = new Date();
    let dateValue = date.getDate();
    // 默认时间为明天的日期
    date.setDate(dateValue + 1)
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let formatTomorrow = year + '-' + month + '-' + day;
    $("#date").val(formatTomorrow);
};

apply.closeNotice = function () {
    $('.prompt_sure,.prompt_cancel').click(function () {
        $('.mask').addClass('hide');
    })
}

$(document).ready(
    function () {
        apply.initDate();
        apply.closeNotice();
        apply.submit();
    }
)

function jumpToLogin() {
    let currentUrl = window.location.origin + window.location.pathname;
    window.location.href = frontHost + "/login?targetUrl=" + currentUrl;
}