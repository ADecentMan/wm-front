var progress=progress || {};

progress.stepInit=function(){
	var stepLength=$('.progress-box .step').length;
	if(stepLength>2){
		$('.show-more.down').css({'display': 'block'});;
		for(var i=2; i<stepLength;i++){
			$('.progress-box .step').eq(i).addClass('hide');
		}
		$('.progress-box .step').eq(1).css({'padding-bottom':'0'});
	}
};

//点击更多和收起
progress.showAndHide=function(){
	$('.show-more.down').on('click',function(){
		$('.progress-box .step').removeClass('hide');
		$(this).css({'display': 'none'});
		$('.show-more.up').css({'display': 'block'});
		$('.progress-box .step').eq(1).css({'padding-bottom':'0.5rem'});
	});


	$('.show-more.up').on('click',function(){
		progress.stepInit();
		$(this).css({'display': 'none'});
		$('.show-more.down').css({'display': 'block'});
	})	
};

//点击我已拒收 
progress.refuseToAccept=function(){
	$('.delivery-btn .btn-reject').on('click',function(){
		 AlertBox({
            type: "doubleBtn",
            msg: "确认您已拒收所购宝贝？",
            confirmText: "确定",
            confirm: function(){
            	alert('确定');
            },
            cancel:function(){
				alert('取消');
            }
        });
	})
};

//点击填写物流信息
progress.toFillDelivery=function(){
	$('.delivery-btn .btn-deliv').on('click',function(){
		window.location.href="writeDelivery2.html";
	})
};

//点击取消申请
progress.cancelApply=function(){
	$('.edit-btn .btn-cancel').on('click',function(){
		 // AlertBox({
   //          type: "doubleBtn",
   //          msg: "是否取消本次退货/退款申请?",
   //          confirmText: "确定",
   //          confirm: function(){
   //          	alert('确定');
   //          },
   //          cancel:function(){
			// 	alert('取消');
   //          }
   //      });

   AlertBox({
            type: "onceConfirm",
            msg: "是否取消本次退货/退款申请?",
            confirmText: "确定",
            confirm: function(){
            	alert('确定');
            }
        });
	})
};

//倒计时
progress.timeCount=function(){
	function countDown(endTime){
		var startTime=(new Date()).getTime();
		var endTime=(new Date(endTime)).getTime();
		time=setInterval(function(){
			var delta=(endTime-startTime)/1000;
			if(delta<=0){
						clearInterval(time);
						$('.time-left .time-string').text("00天00时00分00秒");
					}else{
						var theTime = delta;
					    var theTime1 = 0;// 分
					    var theTime2 = 0;// 小时
					    var theTime3 = 0;// 天

					    theTime3 = parseInt(delta/3600/24);
					    theTime2 = parseInt(delta/3600%24);
					    theTime1 = parseInt(delta/60%60);
					    theTime = parseInt(delta%60);

					    theTime = theTime<10 ? '0'+theTime : theTime.toString();
					    theTime1 = theTime1<10 ? '0'+theTime1 : theTime1.toString();
					    theTime2 = theTime2<10 ? '0'+theTime2 : theTime2.toString();

						startTime=startTime+100;
						$('.time-left .time-string').text(theTime3+"天"+theTime2+"时"+theTime1+"分"+theTime+"秒");
					}
		},100)
	};

	countDown("2016/5/29 16:30:40");
};


progress.setCurrent = function() {
	$('.progress-box .step').first().find('.circle').addClass('current');
};


/* 图片放大 */
progress.imgzoom = function() {
	$('.pic-list li img').click(function() {
		var img = $(this),
			src = img.attr('data-big');

		if (!src) {
			return false;
		}

		var dom = [
			'<div style="position:fixed; top:0; left:0; display:table; width:100%; height:100%; background:rgba(0,0,0,1); text-align:center; z-index:100;">',
				'<div style="display:table-cell; vertical-align:middle;"><img src="' + src + '" style="max-width:100%; max-height:100%; vertical-align:middle;" />',
			'</div>',
		].join('');

		$(dom).appendTo('body').click(function() {
			$(this).remove();
		});
	});
};


//香港站点击更多和收起
progress.stepInitHk=function(){
  var stepLength=$('.progress-box-wrapper .step').length;
  if(stepLength>5){
    $('.show-more-hk.down').css({'display': 'block'});;
    for(var i=5; i<stepLength;i++){
      $('.progress-box-wrapper .step').eq(i).addClass('hide');
    }
    $('.progress-box-wrapper .step').eq(4).css({'padding-bottom':'0'}).find('.step-content').css({'border':'none'});
  }
};
progress.showAndHideHk=function(){
  var stepLength=$('.progress-box-wrapper .step').length;
  $('.show-more-hk.down').on('click',function(){
    $('.progress-box-wrapper .step').removeClass('hide');
    $(this).css({'display': 'none'});
    $('.show-more-hk.up').css({'display': 'block'});
    $('.progress-box-wrapper .step').eq(4).css({'padding-bottom':'0.5rem'}).find('.step-content').css({'border-bottom':'1px solid #ddd;'});
    $('.progress-box-wrapper .step').eq(stepLength-1).find('.step-content').css({'border':'none'});
  });

  $('.show-more-hk.up').on('click',function(){
    progress.stepInitHk();
    $(this).css({'display': 'none'});
    $('.show-more-hk.down').css({'display': 'block'});
  })  
};

// 代检
progress.checkTipShowMore = function(){
  var packUp = $(".pack-up");
  var checkTipWrapper = $(".check-tip");
  var checkTipHeight = $(".check-tip").height();
  var tipContentValue = $(".check-tip .tip-content").text();
  var maxLen = $(".check-tip .tip-content").data("maxlength");
  var newTipValue = "";
  function initStyle() {
    if(packUp){
      $(".pack-up").remove();
    }
    if(tipContentValue && tipContentValue.length > maxLen){
      checkTipWrapper.append('<a class="show-more-txt" href="javascript:void(0);">查看更多</a>');
      newTipValue = tipContentValue.substring(0,maxLen);
      $(".check-tip .tip-content").text(newTipValue);
    }
  }
  initStyle();
  $(document).on("click",".show-more-txt",function() {
    checkTipWrapper.append('<a class="pack-up" href="javascript:void(0);">收起</a>');
    checkTipWrapper.find(".tip-content").text(tipContentValue);
    $(this).remove();
  });
  $(document).on("click",".pack-up",function() {
    initStyle();
  });
}

/*选择地址组件*/
progress.choiceAddress = function(){
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

// 揽件章程
progress.agreeRule = function() {
    $('.lanjian-agree>span').click(function(e) {
        $(this).find('i').toggleClass('checked');

        if (e.target.tagName.toLowerCase() == 'a') {
            $('.lanjian-agree-popup').show().addClass('lanjian-agree-popup-show');
        }
    });

    $('.lanjian-agree-popup .close').click(function() {
        $('.lanjian-agree-popup').removeClass('lanjian-agree-popup-show');
        setTimeout(function() {
            $('.lanjian-agree-popup').hide();
        }, 300);
    })
};


//tab切换
progress.tabSwitch=function(){
  $('.lanjian-desc .tab-btn').on('click',function(){
    var index=$(this).index() -1 ;
    $('.lanjian-desc .tab-btn').removeClass('current');
    $(this).addClass('current');
    $('.tab-content .tab-item').addClass('hide').eq(index).removeClass('hide');
  })
};

$(function(){
  progress.stepInit();
  progress.stepInitHk();
  progress.showAndHide();
  progress.showAndHideHk();
  progress.cancelApply();
  progress.refuseToAccept();
  progress.toFillDelivery();
  progress.timeCount();

  progress.imgzoom();
  progress.checkTipShowMore();
  progress.choiceAddress();
  progress.agreeRule();
  progress.tabSwitch();
})