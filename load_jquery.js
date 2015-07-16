/**
 * Makes sure that jQuery is loaded and executes a callback once done. Based on
 * <http://neighborhood.org/core/sample/jquery/append-to-head.htm>.
 * @param {Callback} whenLoaded The function to execute once jQuery has
 *  loaded. This function is also called when jQuery did not have to be loaded
 *  manually, i.e. the function is always called exactly once (unless jQuery
 *  has to be loaded and there was an error).
 */
var loadJquery = function(whenLoaded) {
  var attemptCount = 0;
  var waitForLoadedJquery = function() {
    attemptCount++;
    if (typeof jQuery !== 'undefined') {
      whenLoaded();
      return;
    }
    if (attemptCount < 100) {
      setTimeout(waitForLoadedJquery, 100);
    } else {
      console.error('Could not load jQuery!');
    }
  };

  if (typeof jQuery === 'undefined') {
    delete $;
    var script = document.createElement('script');
    script.src = 
           "https://ajax.googleapis.com/ajax/libs/jquery/1.6.3/jquery.min.js";
    document.getElementsByTagName('head')[0].appendChild(script);
    waitForLoadedJquery();
  } else {
    whenLoaded();
  }
};

loadJquery(function() {
  console.log('jQuery loaded!');
});

/* *******
 * Bookmarklet (399 chars)
 *
 * javascript:(function(){var a=0,u="undefined",w=function(){a++,u!=typeof jQuery?console.log("jQuery loaded"):99>a?setTimeout(w,99):console.error("jQuery load error")};if(u==typeof jQuery){delete $;var s=document.createElement("script");s.src="//ajax.googleapis.com/ajax/libs/jquery/1.6.3/jquery.min.js",document.getElementsByTagName("head")[0].appendChild(s),w()}else console.log("jQuery done");})();
 * ******* */