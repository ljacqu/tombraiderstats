/**
 * Lists all CSS classes used in <span> tags and the total of uses for a
 * walkthrough page. div#LayoutDiv1 is the main content container of the page.
 */
var classes = {};
$.each($('#LayoutDiv1 span'), function() {
  var itemClasses = ($(this).attr('class') || '').split(' ');
  for (var i = 0; i < itemClasses.length; i++) {
    if (typeof classes[itemClasses[i]] === 'undefined') {
      classes[ itemClasses[i] ] = 1;
    } else {
      classes[ itemClasses[i] ]++;
    }
  }
});
console.log(classes);