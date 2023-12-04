//命名空间
var hkReturn = hkReturn || {};

//功能项
hkReturn.tabclick=function(){
    $(".js-tab-list > li").on("click",function(){
        var index=$(this).index();
        $(this).addClass("checked").siblings().removeClass("checked");
        $(".js-tab-con").eq(index).removeClass("hide").siblings().addClass("hide");
    })
}
hkReturn.tabclick();


//报错信息
hkReturn.alertError=function(info){
    AlertBox({
        type:"mini",
        alertType:"fixed",
        title:"",
        msg:info ? info : "报错位置"
    })
}
//取消订单点击
hkReturn.cancelOrder=function(){
    $(".js-cancel-order").on("click",function(){
        AlertBox({
            type:"onceCancel",
            alertCls:"sn-color-box",
            alertType:"fixed",
            title:"温馨提示",
            cancelText:"返回",
            msg:"您的订单暂不支持在线提交取消订单申请"
        })
    })
    $(".js-submit-btn").on("click",function(){
        AlertBox({
            type:"doubleBtn",
            alertCls:"sn-double-box",
            alertType:"fixed",
            title:"",
            cancelText:"取消",
            confirmText:"继续",
            msg:"购买的商品为套餐商品,仅支持合并取消"
        })
    })
    $(".js-show-error-tips").on("click",function(){
        hkReturn.alertError();
    })
    //取消成功
    $(".js-cancel-success").click(function(){
        AlertBox({
            type:"onceCancel",
            alertCls:"sn-color-box",
            alertType:"fixed",
            title:"温馨提示",
            cancelText:"退货详情",
            cancel : function(){
                document.location.href="./back-details.html"
            },
            msg:"您的商品已取消成功"
        })
    })
    //合并取消提示
    $(".js-submit-sure").on("click",function(){
        AlertBox({
            type:"doubleBtn",
            alertCls:"sn-double-box",
            alertType:"fixed",
            title:"",
            cancelText:"取消操作",
            confirmText:"继续",
            msg:"您的订单中享有优惠活动，根据业务规则需要合并取消订单！",
            cancel:function(){
                alert("您点击了取消按钮")
            },
            confirm:function(){
                alert("您点击了继续按钮");
            }
        })
    })
}

hkReturn.cancelOrder();

//select选择 触发事件
hkReturn.selectClick=function(){
    $(".js-back-reason").change(function(){
        if($(this).find("option:selected").attr("rel") == "no-reason"){
            $("div[class*='no-reason']").show();
        }
        else{
            $("div[class*='no-reason']").hide();
        }
    })
}

hkReturn.selectClick();


/*
* Author ： 15061251
* Date   :  2015-07-16
*
* */
;(function(){
    $.extend($.fn, {
        scrollTo: function(m){
            var curST=$(this).scrollTop();
            var n = curST, timer = null, that = this;
            var scrollDis=m-curST;
            var smoothScroll = function(m){
                //scrollDis>0：向上滚动，scrollDis<=0向下滚动
                var per = Math.round(scrollDis / 50); //每次滚动的距离
                n = n + per;
                if(curST == n){ //多次点击同一个节点的时候，去除死循环
                    window.clearInterval(timer);
                    return false;
                }
                if(scrollDis >=0){
                    if(n >= m){
                        window.clearInterval(timer);
                        return false;
                    }
                }
                else{
                    if(n <= m){
                        window.clearInterval(timer);
                        return false;
                    }
                }
                that.scrollTop(n);
            };
            timer = window.setInterval(function(){
                smoothScroll(m);
            }, 20);
    }
    })
})()
//定位模块，银行卡选择页面
hkReturn.choiceMod=function(){
    $(".js-choice-bank").on("click",function(){
        _showBank();
        location.hash="bank";

    })
    $(".js-back-history").on("click",function(){
        _hideBank();
        location.hash="";
    })
    $(window).on("hashchange",function(){
        var hash =  location.hash;
        if(hash !=""){
            $(".js-choice-bank").click();
        }
        else{
            _hideBank();
            location.hash="";
        }
    })
    //选择银行
    $(".js-bank-list-box .bank-item a").on("click",function(){

        $(".js-choice-bank").text($(this).text()).siblings(".js-choice-bank").val($(this).data("bank"));

        alert("您选择的银行是"+$(this).text()+"编号是"+$(this).data("bank"));

        _hideBank();

    })
}
var _showBank = function(){
    $(".fix-fast-position").show();
    $(".js-sn-bank-choice").addClass("scroll-bank-left");
    setTimeout(function(){
        $("body,html").css("overflow","hidden");
    },500)
}
var _hideBank = function(){
    $(".fix-fast-position").hide();
    $("body,html").removeAttr("style");
    $(".js-sn-bank-choice").removeClass("scroll-bank-left");
}
$(".js-fast-pos a").each(function(){
    $(this).on("click",function(e){
        var targetdom=$(this).attr("rel");
        if($("#"+targetdom).length ==0) return;
        $(".js-sn-bank-choice").scrollTo($("#"+targetdom).length>=1 && $("#"+targetdom)[0].offsetTop);
    })
})

//文本域控制输入的文字字符个数
hkReturn.textAreaControl = function(){
    var chineseCode = /[\u4e00-\u9fa5]/;
    var englishCode = /\S*\s*/
    $(".back-reason").each(function(){
        var _this = $(this);
        var lenContrl =0;
        var contrlDom = '<div class="contrl-wrap"><span>0</span>/'
        if(_this.data("maxlength")){
            lenContrl = parseInt(_this.data("maxlength"),10);
            contrlDom += '<span>'+lenContrl+'</span></div>'
            _this.after(contrlDom)
            _this.on("input",function(e){
                var thisCL= 0, thisEl= 0,thisL=0;
                var tempStr = ""
                $.each(_this.val().split(''),function(a,b){
                    if(chineseCode.test(b)){
                        thisCL+=1;
                    }
                    else if(englishCode.test(b)){
                        thisEl+=0.5;
                    }
                })
                thisL= thisCL + Math.ceil(thisEl);
                if(thisL <= lenContrl){
                    thisL=thisCL + Math.ceil(thisEl);
                    tempStr = _this.val();
                    _this.data("top",tempStr);
                    _this.siblings(".contrl-wrap").find("span:first").text(thisL);
                }
                if(thisL > lenContrl){
                    thisL = lenContrl;
                    _this.val($.trim(_this.data("top")));
                    _this.siblings(".contrl-wrap").find("span:first").text(thisL);
                    return;
                }
            })
        }
    })
}

/*加载等待*/
var showLoadingDialog=function(){
    var loadDom='<div class="sn-mask-cover"><div class="mask-cell"><div class="sn-mask-loading"></div></div></div>';
    $("body").append(loadDom);
}
//删除加载状态
var completeLoading = function(){
    if($(".sn-mask-cover") & $(".sn-mask-cover").length>0){
        $(".sn-mask-cover").remove();
    }
}

//显示然后3s后影藏
function showTips(){
    $(".settimeouttips").show();
}
function hideTips(){
    setTimeout(function(){
        $(".settimeouttips").hide();
    },3000)
}

hkReturn.choiceMod();
hkReturn.textAreaControl();




// 全选
var checkAll = function() {
    var all = $('.order-list .choice-chk:not([disabled])');
    $('.choice-checkall').click(function() {
        all.prop('checked', this.checked);
    });
    all.click(function() {
        var flag = true;
        all.each(function() {
            if (!this.checked) {
                flag = false;
            }
        });
        $('.choice-checkall').prop('checked', flag);
    });
}
checkAll();

// 退款详情
hkReturn.returnMoreDetail = function() {
    $('.view-more-detail').click(function() {
        $('.return-more-detail').show();
    });
    $('.return-more-detail').click(function() {
        $(this).hide();
    });
};
hkReturn.returnMoreDetail();


// 收货方式切换-取消订单优化wap
hkReturn.changeWay = function() {
    $(document).on('change', 'input[name="server-type"]', function() {
        $('input[name="server-type"]').each(function(idx, dom) {
            $(dom).is(':checked') ? $(dom).next('label').addClass('checked') : $(dom).next('.checked').removeClass('checked');
        })
    })
}
hkReturn.changeWay();

//tab切换
hkReturn.tabSwitch=function(){
    $('.pay-type .tab-btn').on('click',function(){
        var index=$(this).index();
        $('.pay-type .tab-btn').removeClass('current');
        $(this).addClass('current');
        $('.tab-content .tab-item').addClass('hide').eq(index).removeClass('hide');
    })
};

hkReturn.tabSwitch();

hkReturn.choiceAddress = function(){
    $(document).on("click",".js-choiceAddr",function(){
        $(this).blur();
    });
    try{
        var a = new address({
            columns:[{state: "prov",text: "河北",disable: false,id:"60"},
                {state: "city",text: "邯郸市",disable: false,id:"9094"},
                {state: "area",text: "",disable: false,id:""},
                {state: "town",text: "",disable: false,id:""}],
            open:".js-choiceAddr",
            callback: function (result) {
                $(".js-choiceAddr").val(result.prov.name+" "+result.city.name+" "+result.area.name)
                alert(JSON.stringify(result));
            }
        });
    }
    catch(e){}
}
hkReturn.choiceAddress();

hkReturn.showIcon = function() {
    // 输入框获取焦点显示清空图标
    $(".input-focus").on("focus",function() {
        $(this).next(".empty-val").show();
    }).on("blur",function() {
        var $this = $(this);
        setTimeout(function(){
             $this.next(".empty-val").hide();
        },0);
    });

    // 点击清空图标清空输入框里的值
    $(".empty-val").on("click",function() {
        $(this).siblings(".input-focus").val("");
        $(this).hide();
    });
};
hkReturn.showIcon();

// 退款方式下拉
hkReturn.jsReturnType = function() {
    $(document).on('click','.js-return-type',function(){
        $(this).parents(".pay-type").siblings(".return-text-wrapper").toggle();
        $(this).find(".arrow-down").toggleClass("arrow-up");
    });
}
hkReturn.jsReturnType();

hkReturn.jsReturnTypeInput = function() {
    $(document).on('click','.return-text-wrapper .return-text',function(){
        var txtValue = $(this).text();
        var selectVal = $(this).attr('value');
        var sblNode = $(this).parents(".return-text-wrapper").siblings(".pay-type").find(".js-return-content");
        $(this).parents(".return-text-wrapper").hide();
        selectVal == "select" ? sblNode.text(txtValue).addClass("gray") : sblNode.text(txtValue).removeClass("gray");
        sblNode.siblings(".arrow-down").removeClass("arrow-up");
    });
}
hkReturn.jsReturnTypeInput();


// select值改变字体颜色改变
hkReturn.selectChangeColor = function() {
    $(document).on('change','.select-change-color',function(){
        var t = $(this);
        var defaultVal = "請選擇包裝情況" || "請選擇" || "請選擇退款原因";
        var selectVal = t.find("option").eq(t.attr("selectedIndex")).text();
        selectVal == defaultVal ? t.css("color","#999") : t.css("color","#222");
    });
}
hkReturn.selectChangeColor();