// Ensure we have mathtran and mathtran.editor objects.
try{ mathtran } catch(e) {mathtran = new Object()}
if(!mathtran.editor){mathtran.editor = new Object()}

// AN 12/30: Disable secondary editor 
var main_img_onclick = function () {};

// Create an image that can be added to the page.
/* mathtran._server = "http://www.mathtran.org/cgi-bin/toy"
mathtran._make_img = function(src, mag){
    if(mag == null) mag = 1
    var img = document.createElement('img')
    img.src = mathtran._server + '?D=' + mag + ';tex=' + encodeURIComponent(src)
    return img
} */

// AN 1/4/12: swap out MathTran engine for QuickLaTeX
mathtran._server = "http://www.problemsetmarmoset.com/latex/render.php";
mathtran._formulas = {};
mathtran._make_img = function(src) {
	var formula = escape(src.replace(/%/g,"[comment]").replace(/\+/g,"%2B"));
	
	var img_elt = document.createElement('img');
	if (src.indexOf('\\begin{') == 0) {
		img_elt.className = 'display'; // if we're beginning an environment, we probably want to use display mode
	}
	
	if (typeof mathtran._formulas[src] != "undefined") {
		img_elt.src = mathtran._formulas[src]; // return previously rendered image
	} else {
		// render new image
		console.log('Request: ' + formula);
		$.ajax({
			url:mathtran._server,
			type: 'POST',
			dataType: 'html',
			data: 'engine=quicklatex&input=' + formula,
			processData: false,
			timeout: 100000,
			success: function(data) {
				console.log('Response: ' + data);
				if(data.length > 0)
				{
					var url;
					if (data != "http://quicklatex.com/cache3/error.png") {
						url = data;
					} else {
						url = "images/blank.gif";
					}
					img_elt.src = url;
					mathtran._formulas[src] = url;
				}
			}
		});
	}
	
	return img_elt;
}

// Regexp for splitting text into paragraphs.
mathtran.editor._par_re = /\n\s*\n/

// Regexps for extracting a math expression from a paragraph.
// Minimal, delimiter, minimal, delimiter, remainder.
mathtran.editor._inline_re = /((?:.|\n)*?)\$((?:.|\n)*?)\$((?:.|\n)*)/m
mathtran.editor._display_re = /((?:.|\n)*?)\$\$((?:.|\n)*?)\$\$((?:.|\n)*)/m
mathtran.editor._split_into_pars = function(s){
    var pars = s.split(/\n\s*\n/)
    return pars
}

// Function for breaking a paragraph into pieces.
// Cannot pass re.exec as a parameter.  Strange.
mathtran.editor._re_split = function(s, re, a, b){

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
   return result
}


// Preview src in tgt_elt.
mathtran.editor.appendPars = function(src, tgt_elt){

    // For par in pars
    var pars = mathtran.editor._split_into_pars(src)
    for(var i=0; i < pars.length; i++){
        var par = pars[i]
        var p_elt = document.createElement('p')

        // For big_frag in par.
        var array1 = mathtran.editor._re_split(pars[i], mathtran.editor._display_re, 0, 1)
        for(var j=0; j < array1.length; j++){
            var big_frag = array1[j]

            if(big_frag[0]==0){

                // For small_frag in par.
                var array2 = mathtran.editor._re_split(big_frag[1], 
                                mathtran.editor._inline_re, 0, 1)
                for(var k=0; k < array2.length; k++){
                    var small_frag = array2[k]
                    var node
                    if(small_frag[0]==0){
                        node = document.createTextNode(small_frag[1])
                    }else{
                        node = mathtran._make_img(small_frag[1])
                        node.tex = small_frag[1]
                        node.onclick = main_img_onclick
                    }
                    p_elt.appendChild(node)
               }
           }else{
                img_elt = mathtran._make_img('\\displaystyle ' + big_frag[1])
                // See Heilmann's "JavaScript with DOM .. " page 127.
                img_elt.className = 'display';   // For IE6, setAttribute does not work here.
                p_elt.appendChild(img_elt)
                img_elt.onclick = main_img_onclick
                img_elt.tex = big_frag[1]
          }
      }
      tgt_elt.appendChild(p_elt)
    }
}

