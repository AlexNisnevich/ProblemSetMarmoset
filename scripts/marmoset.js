var editor;
var hlLine;

var flickrApiKey = "6a5d3736c4390041f83c017f48ddf42a";
var charCount = 0;
var charsForReward = 175;
var marmosetsEarned = 0;
var marmosetsShown = 0;
var nextMarmoset = {};
var marmosetList = [];
var warningShown = false;

$(function() {
    // Initialize CodeMirror editor

    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
	mode: "stex",
	lineNumbers: true,
	lineWrapping: true,
	extraKeys: {"F11": toggleFullscreenEditing, "Esc": toggleFullscreenEditing},
	onCursorActivity: onEdit
    });
    hlLine = editor.setLineClass(0, "activeline");

    // Initialize controls

    $("#marmosetEvery").change(function () {
	updateReward($(this).value);
    });

    $("#previewArrow").click(previewArrowClick);
    $("#editorArrow").click(editorArrowClick);

    $("#footer a").click(function (e) {
	e.preventDefault();
	var $page = $($(this).attr("href") + "Page");
	togglePage($page);
    });

    // Local storage

    loadFromStorage();
    localStorageWarning();

    // retrieve first marmoset

    getMarmoset();
});

// CodeMirror editor

function onEdit() {
    // save to local storage
    saveToStorage();

    // set highlighted line
    editor.setLineClass(hlLine, null);
    hlLine = editor.setLineClass(editor.getCursor().line, "activeline");

    // update count
    var contents = editor.getValue();
    charCount = contents.length;
    $('#count').text(charCount);
    marmosetsEarned = parseInt(charCount / charsForReward);

    // new marmoset?
    if (marmosetsShown < marmosetsEarned) {
	showMarmoset();
    }

    // preview/warning messages?
    if (charCount == 0) {
	$('#previewMessage').show();
	resetCount(); // e.g. new document
    } else {
	$('#previewMessage').hide();
	if (charCount >= 75) {
	    $("#localStorageWarning").fadeOut("slow");
	    warningShown = true;
	} else if (charCount >= 25 && !warningShown) {
	    $("#localStorageWarning").fadeIn("slow"); 
	}
    }

    // run MathTran
    var tgt_elt = document.getElementById('preview');
    tgt_elt.innerHTML = '';
    mathtran.editor.appendPars(contents, tgt_elt);
}

function toggleFullscreenEditing()
{
    var editorDiv = $('.CodeMirror-scroll');
    if (!editorDiv.hasClass('fullscreen')) {
	toggleFullscreenEditing.beforeFullscreen = { height: editorDiv.height(), width: editorDiv.width() }
	editorDiv.addClass('fullscreen');
	editorDiv.height('100%');
	editorDiv.width('100%');
	editor.refresh();
    } else {
	editorDiv.removeClass('fullscreen');
	editorDiv.height(toggleFullscreenEditing.beforeFullscreen.height);
	editorDiv.width(toggleFullscreenEditing.beforeFullscreen.width);
	editor.refresh();
    }
}

function editorMode(mode) {
    switch (mode) {
    case "both":
    default:
	$(".CodeMirror").removeClass("open").removeClass("closed");
	$("#previewArea").removeClass("open").removeClass("closed");
	break;
    case "editor":
	$(".CodeMirror").addClass("open").removeClass("closed");
	$("#previewArea").removeClass("open").addClass("closed");
	break;
    case "preview":
	$(".CodeMirror").removeClass("open").addClass("closed");
	$("#previewArea").addClass("open").removeClass("closed");
	break;
    }
    editor.refresh();
}

function previewArrowClick() {
    if ($("#previewArea").hasClass("closed")) {
	editorMode("both");
	$("#editorArrow").show();
    } else {
	editorMode("preview");
	$("#previewArrow").hide();
    }
}

function editorArrowClick() {
    if ($(".CodeMirror").hasClass("closed")) {
	editorMode("both");
	$("#previewArrow").show();
    } else {
	editorMode("editor");
	$("#editorArrow").hide();
    }
}

// Local storage

function saveToStorage() {
    if (typeof localStorage != "undefined") {
	localStorage.text = editor.getValue();
    }
}

function loadFromStorage() {
    if (typeof localStorage != "undefined" && typeof localStorage.text != "undefined") {
	editor.setValue(localStorage.text);
	onEdit();
    }
}

function localStorageWarning() {
    $("#localStorageWarning").hide();
    if (typeof localStorage != "undefined") {
	$("#localStorageWarning").text("It looks like your browser supports local storage! That means that your work will be autosaved if you accidentally exit out of the page. However, we still recommend that you copy-paste your code into your own editor frequently. Good luck!");
    } else {
	$("#localStorageWarning").text("Important: It looks like your browser doesn't support local storage. That means we aren't able to save your work here if you accidentally exit out of the page. Please remember to copy-paste your code into your own editor regularly. Good luck!");
    }
}

// Marmosets

function getMarmoset() {
    var pageNum = Math.ceil(Math.random()*423/100);
    var flickrUrl = "http://api.flickr.com/services/rest/?format=json&sort=interestingness-desc&method=flickr.photos.search&license=1,2,4,6&extras=owner_name,license&tags=marmoset&tag_mode=all&api_key=" + flickrApiKey + "&page=" + pageNum + "&jsoncallback=?";
    
    $.getJSON(flickrUrl, function(data) {
	if (data.stat == "ok") {
	    var i;
	    var photo;
	    while (typeof photo == "undefined") {
		i = Math.ceil(Math.random() * 100);
		photo = data.photos.photo[i];
	    }
	    license = ["All rights reserved","CC BY-NC-SA","CC BY-NC", "CC BY-NC-ND", "CC BY", "CC BY-SA", "CC BY-ND"][photo.license]
	    nextMarmoset.imgUrl = "http://farm" + photo.farm + ".static.flickr.com/" + photo.server + "/" + photo.id + "_" + photo.secret + "_z.jpg";
	    nextMarmoset.pageUrl = "http://www.flickr.com/photos/" + photo.owner + "/" + photo.id;
	    nextMarmoset.alt = photo.title + " by " + photo.ownername + " (under " + license + ")";
	    $("#nextMarmoset").attr("src", nextMarmoset.imgUrl);

	    // has this marmoset already been shown?
	    if (marmosetList.length > 100) {marmosetList.shift(); } // only keep last 100 marmosets shown
	    if ($.inArray(marmosetList, nextMarmoset.imgUrl) > -1) {
		getMarmoset(); // if so, get another marmoset
	    } else {
		marmosetList.push(nextMarmoset.imgUrl);
	    }

	    // should a marmoset be shown now?
	    if ($("#marmoset").css("background-image") == "none" && marmosetsEarned > marmosetsShown) {
		showMarmoset();
	    }
	}
    });
}

function showMarmoset() {
    if (typeof nextMarmoset.imgUrl != "undefined") {
	$("#marmoset").css("background", "url(" + nextMarmoset.imgUrl + ") no-repeat center center");
	$("#marmosetCredit").html('<a href="' + nextMarmoset.pageUrl  + '" target="_blank">' + nextMarmoset.alt + '</a>');
	getMarmoset();
	marmosetsShown = marmosetsEarned;
    }
}

function updateReward(rwd) {
    charsForReward = rwd;
    marmosetsEarned = parseInt(charCount / charsForReward);
    marmosetsShown = marmosetsEarned;
}

function resetCount() {
    marmosetsEarned = 0;
    marmosetsShown = 0;
}

// Pages

function togglePage($page) {
    if ($page.hasClass("shown")) {
	$(".page").removeClass("shown");
	$page.addClass("shown").slideUp(1000, function () {$page.removeClass("shown").css("display","");});
	$("html, body").animate({ scrollTop: 40 }, 1000); // scroll up
    } else {
	$(".page").removeClass("shown");
	$page.addClass("shown");
	$("html, body").animate({ scrollTop: $("#footer").offset().top - 15 }, 1000); // scroll to bottom
    }    
}