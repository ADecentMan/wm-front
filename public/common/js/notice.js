function notice(title, msg) {
    $('.notice-title').text(title);
    $('.prompt_text').text(msg);
    $('.mask').removeClass('hide');
}

/**
 * 获取指定参数值
 * @param {参数名称} name 
 * @returns 参数值
 */
function getParam(name) {
    let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    //search,查询？后面的参数，并匹配正则
    let r = location.search.substr(1).match(reg);
    return (r != null) ? decodeURI(decodeURI(r[2])).toString() : "";
}

function goBack() {
    window.history.back();
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookieValue(cookieName) {
    let name = cookieName + "=";
    let cookieArray = document.cookie.split(';');
    for(let i = 0; i < cookieArray.length; i++) {
        let currentCookie = cookieArray[i].trim();
        if (currentCookie.indexOf(name) === 0) {
            return currentCookie.substring(name.length, currentCookie.length);
        }
    }
    return "";
}