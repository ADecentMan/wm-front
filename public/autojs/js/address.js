/**
 * Created by 15031493 on 2015/11/20.
 */
;(function(factory,d,w){
    if (typeof define == 'function' && define.cmd) { // CommonJS
        define(function (require,exports,module) {
            module.exports = factory(d,w);
        });
    }
    else { //正常使用
        w.address = factory.call(w,d,w);
    }
})(function (d,w)
{
    // 插件的代码
    var _uuid = 0;
    var isloadcss = false;
    var defaults = {
        open:"",//开关对象
        tarParent:"body",//父级对象
        columns:[{state: "prov",text: "请选择省",disable: false,id:""},
            {state: "city",text: "请选择市",disable: false,id:""},
            {state: "area",text: "请选择区",disable: false,id:""},
            {state: "town",text: "请选择乡",disable: false,id:""}],
        url:"http://www.suning.com/emall/SNAddressQueryCmd",
        callback: function () {//回调
        }
    };
    //样式
    var adsStyle = '.ui-m-address{position:fixed;top:0;left:100%;width:100%;height:100%;background:#FFF;z-index:100;overflow:auto;-webkit-transition:all .5s ease-out}.ui-m-address .address-box{width:100%;height:100%}.ui-m-address .address-tab{overflow:hidden;width:100%;position:absolute;top:1.76rem;bottom:0;left:0}.ui-m-address .address-tab-nav{height:1.86rem;background:#fff;line-height:1.76rem;text-align:center;box-shadow:0 -1px 0 #dcdcdc inset;display:-webkit-flex!important;display:-webkit-box}.ui-m-address .address-tab-nav li{-webkit-flex:1!important;-webkit-box-flex:1;font-size:.6rem}.ui-m-address .address-tab-nav li.cur{border-bottom:.12rem solid #eda200;color:#f29400;font-size:.65rem}.ui-m-address .address-tab-nav li.disabled{color:#cacaca}.ui-m-address .address-tab-content{position:absolute;top:1.86rem;bottom:0;left:0;-webkit-transition-property:all;-webkit-transition-duration:300ms;-webkit-transition-timing-function:cubic-bezier(.1,.57,.1,1)}.ui-m-address .city-list{height:100%;overflow-y:auto;background:#f2f2f2}.ui-m-address .city-list li{height:1.8rem;line-height:1.8rem;border-bottom:1px solid #dcdcdc;text-indent:.6rem}.ui-m-address .city-list li.cur,.city-list li:active,.city-list li:hover{background:#dcdcdc;color:#eda200}.ui-m-address .address-nav{position:relative;height:1.76rem;background:#f8f8f8;line-height:1.76rem;font-size:.6rem;border-bottom:1px solid #dcdcdc}.ui-m-address .address-back{position:absolute;left:.1rem;top:0;width:1.5rem;height:1.5rem;margin:0 .56rem}.ui-m-address .address-back:before{content:"";position:absolute;top:.6rem;left:0;display:inline-block;width:.48rem;height:.48rem;border:solid #353d44;border-width:1px 0 0 1px;-webkit-transform:rotate(-45deg)}.ui-m-address .address-nav-title{width:60%;margin:0 auto;color:#353d44;text-align:center}.ui-m-address.slideShow{-webkit-transition:all .5s ease-out;-webkit-transform:translateX(-100%);transform:translateX(-100%);}.ui-m-address-oh {overflow-y: hidden;} .wbox{display: -webkit-flex!important;} .wbox-flex{-webkit-flex:1;flex:1}';

    var address = function (opt){
        var opts = _extend(defaults,opt);
        if(opts.open.length == 0){
            alert("请绑定开关对象");
            return false;
        }
        //数据保存
        this.data = {prov:{name:"",id:"",code:""},city:{name:"",id:"",code:""},area:{name:"",id:"",code:""},town:{name:"",id:"",code:""}};
        this.columns = opts.columns;
        this.tarParent = opts.tarParent;
        this.open = opts.open;
        this.url = opts.url;
        this.callback = opts.callback;
        this.uuid = _uuid;
        _uuid ++;
        this.init();
    }

    address.prototype = {
        constructor : address,
        init: function () {
            var _self = this;
            _self.creatHtml();
            _self.$address = d.querySelector("#nn_address"+_self.uuid);
            _self.loadcss();
            _self.closeBind();
            _self.openBind();
            _self.navInit();
            _self.firstDataInit();
            _self.contBind();
        },
        loadcss: function () {
            if(isloadcss)return ;
            var style = d.createElement("style");
            style.type= "text/css";
            style.innerText = adsStyle;
            d.querySelector("head").appendChild(style);
            isloadcss = true;

        },
        //页面框架初始化
        creatHtml: function () {
            var _self = this;
            var _html = '<div id="nn_address'+_self.uuid+'" class="ui-m-address" >' +
                '<div class="address-nav">' +
                '<div class="address-back"></div>' +
                '<div class="address-nav-title">地址选择</div>' +
                '</div>' +
                '<div class="address-tab">' +
                '<ul class="address-tab-nav">' +
                '</ul>' +
                '<div class="address-tab-content wbox">' +
                '</div>' +
                '</div>' +
                '</div>';
            d.querySelector(_self.tarParent).insertAdjacentHTML("beforeend",_html);
        },
        //绑定关闭按钮
        closeBind: function () {
            var _self = this;
            var $back = _self.$address.querySelector(".address-back");
            $back.addEventListener("click", function () {
                _self.$address.classList.remove("slideShow");

                d.body.classList.remove("ui-m-address-oh");
                d.documentElement.classList.remove("ui-m-address-oh");
            });
        },
        //绑定打开按钮
        openBind: function () {
            var _self = this;
            var $open = d.querySelector(_self.open);
            var $nav = _self.$address.querySelector(".address-tab-nav");
            var $navs;
            $open.addEventListener("click", function () {
                $navs = $nav.querySelectorAll("li");
                _self.$address.classList.add("slideShow");
                if($navs && $navs.length != 0){
                    _eq(0,$navs).click();
                }

                d.body.classList.add("ui-m-address-oh");
                d.documentElement.classList.add("ui-m-address-oh");
            });
        },
        //导航头初始化
        navInit: function () {
            var _self = this;
            var $nav = _self.$address.querySelector(".address-tab-nav");
            var $cont = _self.$address.querySelector(".address-tab-content");
            var $navs;
            var len = _self.columns.length;

            for (var i = 0; i < len; i++) {
                //是否隐藏
                var className = "";
                var text = _self.columns[i].text;

                if(text.length == 0 ){
                    switch (_self.columns[i].state){
                        case "prov":
                            text = "请选择省";
                            break;
                        case "city":
                            text = "请选择市";
                            break;
                        case "area":
                            text = "请选择区";
                            break;
                        case "town":
                            text = "请选择乡";
                            break;
                    }
                }
                if(_self.columns[i].disable){
                    className = "disabled";
                }
                $nav.insertAdjacentHTML("beforeEnd","<li class='"+className+"' state='"+_self.columns[i].state+"' selectid='"+_self.columns[i].id+"' >"+text+"</li>");
                $cont.insertAdjacentHTML("beforeEnd","<div class='address-box wbox-flex'>" +
                    "<ul state='"+_self.columns[i].state+"' class='city-list'></ul>" +
                    "</div>");
            }

            $navs = $nav.querySelectorAll("li");

            //内容宽度
            var cw = $navs.length * 100 + "%";
            $cont.style.width = cw;
            var width = $cont.querySelector(".address-box").offsetWidth;
            //导航点击切换
            [].forEach.call($navs,function(elem){
                elem.addEventListener("click", function(){
                    var index = _indexof(this.parentNode.children,this);
                    if(_hasClass(this,"disabled")){
                        this.nextElementSibling.click();
                        return false;
                    };

                    [].forEach.call(this.parentNode.childNodes,function (ele) {
                        ele.classList.remove("cur");
                    });

                    this.classList.add("cur");
                    $cont.style.cssText = "width:"+cw + ";-webkit-transform: translateX(-"+width * index+"px);transform: translateX(-"+width * index+"px);";
                });
            })
        },
        //首次数据初始化
        firstDataInit: function () {
            var _self = this;
            var $nav = _self.$address.querySelector(".address-tab-nav");
            var $navs = $nav.querySelectorAll("li");
            var $cont = _self.$address.querySelector(".address-tab-content");

            function firstData(){
                for (var i = 0; i < $navs.length; i++) {
                    (function (i) {
                        var sid = _eq(i,$navs).getAttribute("selectid");
                        var text = _eq(i,$navs).innerHTML;
                        if(parseInt(sid) > 0){
                            switch (_eq(i,$navs).getAttribute("state"))
                            {
                                case "prov":
                                    _self.data.prov.id = sid;
                                    _self.data.prov.name = text;
                                    $cont.querySelector("li[selectid='"+sid+"']").classList.add("cur");
                                    if($navs.length == 1)return;
                                    stateEventBind("city",sid,$cont,function () {
                                        var curId = $nav.querySelector("li[state='city']").getAttribute("selectid");
                                        if(!curId){
                                            return false;
                                        }
                                        $cont.querySelector("li[selectid='"+curId+"']").classList.add("cur");
                                    });
                                    break;
                                case "city":
                                    _self.data.city.id = sid;
                                    _self.data.city.name = text;
                                    if($navs.length == 2)return;
                                    stateEventBind("area",sid, $cont,function () {
                                        var curId = $nav.querySelector("li[state='area']").getAttribute("selectid");
                                        if(!curId){
                                            return false;
                                        }
                                        $cont.querySelector("li[selectid='"+curId+"']").classList.add("cur");
                                    });
                                    break;
                                case "area":
                                    _self.data.area.id = sid;
                                    _self.data.area.name = text;
                                    if($navs.length == 3)return;
                                    stateEventBind("town",sid, $cont,function () {
                                        var curId = $nav.querySelector("li[state='town']").getAttribute("selectid");
                                        if(!curId){
                                            return false;
                                        }
                                        $cont.querySelector("li[selectid='"+curId+"']").classList.add("cur");
                                    });
                                    break;
                                case "town":
                                    _self.data.town.id = sid;
                                    _self.data.town.name = text;
                                    break;
                            }
                        }
                    })(i);
                }
            }
            stateEventBind("prov",0,$cont,firstData);
        },
        //内容点击绑定
        contBind : function () {
            var _self = this;
            var $nav = _self.$address.querySelector(".address-tab-nav");
            var $navs = $nav.querySelectorAll("li");
            var $cont = _self.$address.querySelector(".address-tab-content");
            var len = _self.columns.length;

            $cont.addEventListener("click", function (e) {
                //事件代理
                getEventTarget(e);
                var target = getEventTarget(e);
                if(target.tagName.toLowerCase() !='li') return;

                var index = _indexof(target.parentNode.parentNode.parentNode.childNodes,target.parentNode.parentNode);
                var state = target.parentNode.getAttribute("state");
                var selectId =  target.getAttribute("selectid");
                var codeId = target.getAttribute("code");
                [].forEach.call(target.parentNode.childNodes,function (ele) {
                    ele.classList.remove("cur");
                });
                target.classList.add("cur");

                //nav内容变换
                _eq(index,$navs).innerHTML = target.innerHTML;
                //点击跳转下一个
                if(index + 1 != len){
                    _eq(index+1,$navs).click();
                }
                //点击进行数据交互
                if(state == "prov"){
                    _self.data.prov.id = selectId;
                    _self.data.prov.name = target.innerHTML;
                    _self.data.prov.code = codeId;
                    if(len == 1){
                        closeAndCab();return false
                    };
                    stateEventBind("city",selectId, $cont,function () {
                        if( $cont.querySelector("ul[state='city']").querySelectorAll("li").length == 1){
                            $cont.querySelector("ul[state='city']").querySelectorAll("li")[0].click();
                        }
                    });
                }
                if(state == "city"){
                    _self.data.city.id = selectId;
                    _self.data.city.name = target.innerHTML;
                    _self.data.city.code = codeId;
                    if(len==2){closeAndCab();return false};
                    stateEventBind("area",selectId,$cont);
                }
                if(state == "area"){
                    _self.data.area.id = selectId;
                    _self.data.area.name = target.innerHTML;
                    _self.data.area.code = codeId;
                    if(len==3){closeAndCab();return false};
                    stateEventBind("town",selectId,$cont);
                }
                if(state == "town"){
                    _self.data.town.id = selectId;
                    _self.data.town.name = target.innerHTML;
                    _self.data.town.code = codeId;
                    closeAndCab();
                }
                //关闭然后回调
                function closeAndCab(){
                    _self.$address.classList.remove("slideShow");
                    //回调
                    _self.callback(_self.data);
                }
            });
        }
    };

    /************私有函数**************/

    //数据加载
    function stateEventBind(state,selectid,$cont,callback){
        var param = {
            state:state,
            selectId:selectid
        };
        function success(arr){
            var $ul = $cont.querySelector("ul[state='"+state+"']");
            $ul.innerHTML = "";
            $ul.insertAdjacentHTML("beforeend",buildList(arr));
            if(typeof callback != "undefined"){
                callback();
            };
        }
        _jsonp({param:param,url:defaults.url,success:success});
    }

    function buildList(arr){
        var str = "";
        for (var i = 0; i < arr.length; i++) {
            var obj = arr[i];
            str+="<li selectid="+obj.id+" code="+obj.code+" >"+obj.name+"</li>";
        }
        return str;
    }
    /************工具**************/

    function getEventTarget(e) {
        e = e || window.event;
        return e.target || e.srcElement;
    }

    function _extend(target,source){
        for(key in source){
            if (source[key] !== undefined) target[key] = source[key]
        }
        return target;
    }

    function _hasClass(_object,_clsname){
        var _clsname = _clsname.replace(".","");
        var _sCls = " "+(_object.className)+" ";
        return _sCls.indexOf(" "+_clsname+" ") != -1;
    }

    function _eq(idx,arr){
        return idx === -1 ? [].slice.call(arr,idx)[0] : [].slice.call(arr,idx, +idx + 1)[0]
    }
    function _indexof(arr,ele){
        return Array.prototype.indexOf.call(arr,ele);
    }
    function _siblings(ele){
        var arr = ele.parentNode.childNodes.filter(function (elem) {
            return elem != ele;
        })
        return arr;
    }

    //回调名称计数器
    var jsonpid = 0;
    function _jsonp(opts){

        var script = document.createElement("script"),
            callbackName = "callback"+jsonpid,
            head = d.querySelector("head"),
            param = "";
        for (key in opts.param){
            param +="&&" + key +"="+ opts.param[key]
        }
        script.type = "text/javascript";
        script.src = opts.url + "?callback="+callbackName+param;
        jsonpid ++;

        //添加回调函数
        w[callbackName] = function (items) {
            opts.success(items.data);
            clean();
        }

        //执行请求
        head.appendChild(script);

        //清除方法和标签
        function clean(){
            head.removeChild(script);
            delete w[callbackName];
        }

    }
    return address;

},document,window)
