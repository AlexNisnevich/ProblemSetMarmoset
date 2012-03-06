// Globals: editor
var editor;
var hlLine;
var contents = "";
var warningShown = false;

// Globals: marmosets
var flickrApiKey = "6a5d3736c4390041f83c017f48ddf42a";
var charCount = 0;
var charsForReward = 175;
var marmosetsEarned = 0;
var marmosetsShown = 0;
var nextMarmoset = {};
var marmosetList = [];

// Globals: renderer
var renderUrl = "http://www.problemsetmarmoset.com/latex/render.php";
var renderedFormulas = {};
var mathtranUtil = {};
var lastRenderContents = "";
var currentScroll = 0;

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
		updateReward($(this).val());
	});

	$("#renderButton").click(refreshPreview).hide();
	$("#previewArrow").click(previewArrowClick);
	$("#editorArrow").click(editorArrowClick);
	
	setTimeout(function () {
		positionRenderButton();
		$("#renderButton").fadeIn();
	}, 2000);
	

	$("#footer a").click(function (e) {
		e.preventDefault();
		var $page = $($(this).attr("href") + "Page");
		togglePage($page);
  });

  // Local storage

  loadFromStorage();
  localStorageWarning();

  // Retrieve first marmoset

  getMarmoset();
  
  // Start the refresh timer
  
  var refreshSec = 10;
  setInterval(refreshPreview, refreshSec * 1000);
	refreshPreview();
});

// CodeMirror editor

function onEdit() {
  // save to local storage
  saveToStorage();

  // set highlighted line
  editor.setLineClass(hlLine, null);
  hlLine = editor.setLineClass(editor.getCursor().line, "activeline");

  // update count
  contents = editor.getValue();
  charCount = contents.length;
  $('#count').text(charCount);
  marmosetsEarned = parseInt(charCount / charsForReward);

  // new marmoset?
  if (marmosetsShown < marmosetsEarned) {
		showMarmoset();
  }

    // local storage message
	if (charCount >= 75) {
		$("#localStorageWarning").fadeOut("slow");
		warningShown = true;
	} else if (charCount >= 25 && !warningShown) {
		$("#localStorageWarning").fadeIn("slow"); 
	}
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
  positionRenderButton();
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

// Preview

function refreshPreview() {
	if (contents != lastRenderContents) {
		var previewPane = document.getElementById('preview');
		currentScroll = previewPane.scrollTop;
		previewPane.innerHTML = '';
		
		if (contents.length == 0) {
			$('#previewMessage').show();
			resetCount(); // e.g. new document
		} else {
			$('#previewMessage').hide();
			renderPreview(contents, previewPane);
		}
		
		afterRefresh();
	}
  lastRenderContents = contents;
}

function afterRefresh() {
	// refresh scroll position after a second (to give image time to load)
	setTimeout(function () {
		$('#preview').scrollTop(currentScroll)
	}, 1000);
	
	positionRenderButton();
}

function positionRenderButton() {
	var preview = document.getElementById('preview'); // need real DOM Node, not jQuery wrapper
	
	if (preview.scrollHeight > preview.clientHeight) {
		$('#renderButtonContainer').addClass('verticalScrollbar');
	} else {
		$('#renderButtonContainer').removeClass('verticalScrollbar');
	}
	
	if (preview.scrollWidth > preview.clientWidth) {
		$('#renderButtonContainer').addClass('horizontalScrollbar');
	} else {
		$('#renderButtonContainer').removeClass('horizontalScrollbar');
	}
}

// Borrowed from MathTran demo

function renderPreview(src, targetElt) {
	// For par in pars
	var pars = mathtranUtil._split_into_pars(src)
	for(var i=0; i < pars.length; i++){
		var par = pars[i]
		var p_elt = document.createElement('p')

		// For big_frag in par.
		var array1 = mathtranUtil._re_split(pars[i], mathtranUtil.regex.display, 0, 1)
		for(var j=0; j < array1.length; j++){
			var big_frag = array1[j]

			if(big_frag[0] == 0){
				// For small_frag in par.
				var array2 = mathtranUtil._re_split(big_frag[1], mathtranUtil.regex.inline, 0, 1)
				for(var k=0; k < array2.length; k++) {
					var small_frag = array2[k];
					var node;
					if(small_frag[0]==0){
						node = document.createTextNode(small_frag[1]);
					} else {
						node = renderFormula(small_frag[1], false);
						node.tex = small_frag[1];
					}
					p_elt.appendChild(node)
			   }
			} else {
				img_elt = renderFormula('\\displaystyle ' + big_frag[1], true); // See Heilmann's "JavaScript with DOM .. " page 127.
				p_elt.appendChild(img_elt);
				img_elt.tex = big_frag[1];
			}
		}
		targetElt.appendChild(p_elt)
    }
}

function renderFormula(src, isDisplayMode) {
	var formula = escape(src.replace(/%/g,"[comment]").replace(/\+/g,"%2B"));
	
	var img_elt = document.createElement('img');
	if (isDisplayMode || 
			src.indexOf('\\begin{') == 0) { // if we're beginning an environment, we probably want to use display mode
		img_elt.className = 'display'; // For IE6, setAttribute does not work here
		img_elt.src = 'images/loader_big.gif';
	} else {
		img_elt.src = 'images/loader.gif';
	}
	
	if (typeof renderedFormulas[src] != "undefined") {
		img_elt.src = renderedFormulas[src]; // return previously rendered image
	} else {
		// render new image
		// console.log('Request: ' + formula);
		$.ajax({
			url: renderUrl,
			type: 'POST',
			dataType: 'html',
			data: 'engine=quicklatex&input=' + formula,
			processData: false,
			timeout: 100000,
			success: function(data) {
				// console.log('Response: ' + data);
				if(data.length > 0)
				{
					var url;
					if (data != 'http://quicklatex.com/cache3/error.png') {
						url = data;
					} else {
						url = 'images/blank.gif';
					}
					img_elt.src = url;
					renderedFormulas[src] = url;
					
					afterRefresh();
				}
			}
		});
	}
	
	return img_elt;
}

mathtranUtil.regex = {
	// Regexps for extracting a math expression from a paragraph.
	// Minimal, delimiter, minimal, delimiter, remainder
	
	inline: /((?:.|\n)*?)\$((?:.|\n)*?)\$((?:.|\n)*)/m,
	display: /((?:.|\n)*?)\$\$((?:.|\n)*?)\$\$((?:.|\n)*)/m
};

mathtranUtil._split_into_pars = function(s){ // break text into paragraphs
    var pars = s.split(/\n\s*\n/);
    return pars;
}

mathtranUtil._re_split = function(s, re, a, b) { // break a paragraph into pieces.
  var pending = s;
  var result = [];
  var m;
  while(pending){
     m = re.exec(pending)
     if(m){
       result.push([a, m[1]])
       result.push([b, m[2]])
       pending = m[3]
     } else {
       result.push([a, pending])
       break
     }
	}
	return result;
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