let myPlaylist;
let playlist;
// 本地
let serverHost = "http://192.168.2.2:8080";
let frontHost = "http://192.168.2.2:8081";
let whiteName = true;
let blackNameMsg = "";
// 镇江
// let serverHost = "http://cn-js-zz.starryfrp.com:50337";
// 广东
// let serverHost = "http://cn-gd-sz-2.starryfrp.com:12400";
// 湖北
// let serverHost = "http://cn-hb-sy-1.xkfrp.top:45818";
let current = 0;
let keyword = "";

let playModeClassList = ["cycle-mode", "random-mode", "one-loop-mode"];

let cssSelector = {
    jPlayer: "#jquery_jplayer_1",
    cssSelectorAncestor: "#jp_container_1"
};
let token = window.localStorage.getItem("WM-ENTERTAINMENT-TOKEN");

$.ajax({
    type: "GET",
    url: serverHost + "/entertainment/music/queryList/500/1?keyword=" + keyword + "&token=" + token,
    dataType: "json",
    async: false,
    success: function (data) {
        if ('-2' == data.code) {
            let currentUrl = window.location.href;
            window.location.href = frontHost + "/login?targetUrl=" + currentUrl;
        } else {
            playlist = data;
        }
    },
    error: function (data) {
        console.log(data);
    }
});

let options = {
    ready: function () {
        myPlaylist.play();
    },
    error: function (event) {
        myPlaylist.next();
    },
    play: function (event) {
        current = myPlaylist.current;
        initSongInfo(event.jPlayer.status.media);
        $("#poster").addClass("play");
    },
    pause: function () {
        $("#poster").removeClass("play");
    },
    ended: function (event) {
        $("#poster").removeClass("play");
        listen(event.jPlayer.status.media.id);
        myPlaylist.select(current);
        nextSong();
    },
    swfPath: "../../dist/jplayer",
    supplied: "oga, mp3, flac, wav",
    wmode: "transparent",
    useStateClassSkin: true,
    autoBlur: false,
    smoothPlayBar: true,
    keyEnabled: true,
    autoPlay: true
};


$(document).ready(function () {
    if (whiteName == false) {
        $('.prompt_sure,.prompt_cancel,.audio-main').hide();
        notice("温馨提示", blackNameMsg);
        return;
    }
    myPlaylist = new jPlayerPlaylist(cssSelector, [], options);
    myPlaylist.setPlaylist(playlist);
    initSongInfo(playlist[0]);
    // 模式切换
    togglePlayMode();
    // 点赞
    like();
    // 分享
    share();
    // 通知事件
    closeNotice();
    // 添加歌曲
    addMusicToggle();
    // 提交歌曲
    submitMusic();
    // 上一曲下一曲
    nextAndPrevious();
    // 收展歌曲列表
    toggleMusicList();
    // 歌曲查询
    searchList();
    // 键盘监听事件
    keyboardListen();
});

function closeNotice() {
    $('.prompt_sure,.prompt_cancel').click(function () {
        $('.mask').addClass('hide');
    })
}

function keyboardListen() {
    $(document).keyup(function (e) {
        switch (e.keyCode) {
            case 13:
                resetList();
                return;
        }
    });
}

function searchList() {
    $("#search").blur(function () {
        resetList();

    });

}

function resetList() {
    let newKeyword = $("#search").val();
    if (newKeyword != keyword) {
        keyword = newKeyword;
        $.ajax({
            type: "GET",
            url: serverHost + "/entertainment/music/queryList/500/1?keyword=" + keyword + "&token=" + token,
            dataType: "json",
            async: false,
            success: function (data) {
                if ('-2' == data.code) {
                    let currentUrl = window.location.href;
                    window.location.href = frontHost + "/login?targetUrl=" + currentUrl;
                } else if ('-1' == data.code) {
                    notice("温馨提示", data.msg);
                } else {
                    playlist = data;
                    myPlaylist.setPlaylist(playlist);
                    initSongInfo(playlist[0]);
                }
            },
            error: function (data) {
                console.log(data)
            }
        });
    }
}

function toggleMusicList() {
    $(".music-list").click(function () {
        $(".jp-playlist").slideToggle(1000);
    });

}

function submitMusic() {
    $("#submit").click(function () {
        if (checkRequired()) {
            $.ajax({
                type: "post",
                url: serverHost + "/entertainment/music/addWish?token=" + token,
                contentType: "application/json",
                async: true,
                data: JSON.stringify({ "title": $("#title").val(), "artist": $("#artist").val(), "url": $("#url").val(), "remark": $("#remark").val() }),
                success: function (data) {
                    if ('-2' == data.code) {
                        let currentUrl = window.location.href;
                        window.location.href = frontHost + "/login?targetUrl=" + currentUrl;
                    } else if ("0" == data.code) {
                        clearAddForm();
                        notice("温馨提示", "你的请愿，朕收到了，退下吧！");
                    } else {
                        notice("温馨提示", data.msg);
                    }

                },
                error: function (data) {
                    console.log(data);
                }
            });
        }
    });
}

function checkRequired() {
    let title = $("#title").val();
    if ('' === title || '歌名(必填)' == title) {
        notice("眼瞎提示", "你瞎吗？歌名必填你看不到吗？？？");
        return false;
    }
    let artist = $("#artist").val();
    if ('' === artist || '歌手(必填)' == artist) {
        notice("眼瞎提示", "你瞎吗？歌手必填你看不到吗？？？");
        return false;
    }
    return true;
}

function clearAddForm() {
    $("#title").val("歌名(必填)");
    $("#artist").val("歌手(必填)");
    $("#remark").val("备注(选填)");
}

function addMusicToggle() {
    $(".add-music").click(function () {
        $(".audio-record-list").hide();
        $(".add").show();
        // 添加切换动画
        addAnimation($(".add"));
    });
    $(".back").click(function () {
        $(".add").hide();
        $(".audio-record-list").show();
        // 添加切换动画
        addAnimation($(".audio-record-list"));
    });
}

function togglePlayMode() {
    $("#play-mode").click(function () {
        $("#play-mode").val(($("#play-mode").val() + 1) % 3);
        $("#play-mode").attr("class", playModeClassList[$("#play-mode").val()]);
    });
}

function share() {
    $(".share").click(function () {
        notice("温馨提示", "想peach呢，不好好上班，还分享？");
    });
}

function initSongInfo(songInfo) {
    // id
    $("#song-id").val(songInfo.id);
    // 歌名
    $(".song-title").html(songInfo.title);
    // 歌手
    $(".artist").html(songInfo.artist);
    // 海报图片
    if (typeof songInfo.poster == 'undefined' || null == songInfo.poster || '' == songInfo.poster || songInfo.poster.length == 0) {
        $("#poster").attr("src", "./public/music/images/disc.png");
    } else {
        $("#poster").attr("src", songInfo.poster);
    }
    $("#poster").removeClass("play");
    // 点赞数量
    displayPlaylist(songInfo.id, "likeCount");
    // 收听数量
    displayPlaylist(songInfo.id, "listenCount");
}

function like() {
    $(".thumbs-up").click(function () {
        updatePlaylist($("#song-id").val(), 'likeCount');
        $.ajax({
            type: "GET",
            url: serverHost + "/entertainment/music/extAdd?type=like&id=" + $("#song-id").val() + "&token=" + token,
            contentType: "application/json",
            async: true,
            success: function (data) {
                console.log(data);
            },
            error: function (data) {
                console.log(data);
            }
        });
    });
}

function listen(id) {
    updatePlaylist(id, 'listenCount');
    $.ajax({
        type: "GET",
        url: serverHost + "/entertainment/music/extAdd?type=listen&id=" + $("#song-id").val() + "&token=" + token,
        contentType: "application/json",
        async: true,
        success: function (data) {
            console.log(data);
        },
        error: function (data) {
            console.log(data);
        }
    });
}

function updatePlaylist(id, field) {
    for (let i = 0; i < playlist.length; i++) {
        if (playlist[i].id == id) {
            if (field == 'listenCount') {
                playlist[i].listenCount = playlist[i].listenCount + 1;
                $(".listen").html(playlist[i].listenCount);
            }
            if (field == 'likeCount') {
                playlist[i].likeCount = playlist[i].likeCount + 1;
                $(".thumbs-up").html(playlist[i].likeCount);
            }
        }
    }
}

function displayPlaylist(id, field) {
    for (let i = 0; i < playlist.length; i++) {
        if (playlist[i].id == id) {
            if (field == 'listenCount') {
                $(".listen").html(playlist[i].listenCount);
            }
            if (field == 'likeCount') {
                $(".thumbs-up").html(playlist[i].likeCount);
            }
        }
    }
}

function nextAndPrevious() {
    $(".next-song").click(function () {
        nextSong();
    });
    $(".previous-song").click(function () {
        previousSong();
    });
}

function nextSong() {
    let playMode = $("#play-mode").val();
    if (0 == playMode) {
        // 全部循环
        if (current == playlist.length - 1) {
            myPlaylist.select(0);
            myPlaylist.play();
        } else {
            myPlaylist.next();
        }
    } else if (1 == playMode) {
        // 随机播放
        let nextOrder = Math.floor(Math.random() * playlist.length + 1);
        myPlaylist.select(nextOrder);
        myPlaylist.play();
    } else {
        // 单曲循环
        myPlaylist.select(current);
        myPlaylist.play();
    }
}

function previousSong() {
    let playMode = $("#play-mode").val();
    if (0 == playMode) {
        // 全部循环        
        if (current == 0) {
            myPlaylist.select(playlist.length - 1);
            myPlaylist.play();
        } else {
            myPlaylist.previous();
        }
    } else if (1 == playMode) {
        // 随机播放
        let nextOrder = Math.floor(Math.random() * playlist.length + 1);
        myPlaylist.select(nextOrder);
        myPlaylist.play();
    } else {
        // 单曲循环
        myPlaylist.select(current);
        myPlaylist.play();
    }
}

function addAnimation($selector) {
    $selector.css({
        '-webkit-animation-duration': '800ms',
        '-moz-animation-duration': '800ms',
        'animation-duration': '800ms'
    });
    $selector.addClass('pogoSlider-animation-' + $selector.data('transition') + 'In');
    setTimeout(function () {
        $selector.removeClass(function (index, classNames) {
            return (classNames.match(/pogoSlider-animation-[a-zA-Z1-9]+/ig) || []).join(' ');
        });
    }, 1050);
}