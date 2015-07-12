/**
 * Waits on jQuery to load. Based on
 * <http://neighborhood.org/core/sample/jquery/append-to-head.htm>.
 * @param {Callback} whenLoaded The function to execute once jQuery has loaded.
 *  This function is also called when jQuery did not have to be loaded manually.
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
    var script = document.createElement('script');
    script.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.6.3/jquery.min.js";
    document.getElementsByTagName('head')[0].appendChild(script);
    waitForLoadedJquery();
  } else {
    whenLoaded();
  }
};

