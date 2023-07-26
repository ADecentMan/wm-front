function notice(title, msg) {
    $('.notice-title').text(title);
    $('.prompt_text').text(msg);
    $('.mask').removeClass('hide');
};

/**
 * 获取指定参数值
 * @param {参数名称} name 
 * @returns 参数值
 */
function getParam(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    //search,查询？后面的参数，并匹配正则
    var r = location.search.substr(1).match(reg);
    return (r != null) ? decodeURI(decodeURI(r[2])).toString() : "";
}