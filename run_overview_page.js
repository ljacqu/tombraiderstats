// Test what links are matched
$('[class^="walk-table"] a[href^="walks/"]').attr('style', 'color: red');

var classesToAggregate = ['enemy', 'item', 'secret', 'gold', 'silver'];

/**
 * Takes the URL to a walkthrough and returns the file name only, without the
 * folder path or the ending .html. 
 * @param {string} url
 * @returns {string} shortened page name
 */
var getPageName = function(url) {
  var folders = url.split('/');
  return folders[ folders.length - 1 ].split('.')[0];
};

var getContainerId = function(url) {
  return 'p' + getPageName(url);
};

/**
 * Sets up a containing <div> with title for a page to include the statistics
 * afterwards.
 * @param {jQuery} elem a matched <a> tag to a walkthrough page
 */
var setupDataContainer = function(elem) {
  var containerId = getContainerId(elem.attr('href'));
  var container = $('#' + containerId);
  
  if (container.length === 0) {
    $('#wrap').before('<div id="' + containerId + '"><h1>' + elem.text() + 
      '</h1></div>');
    container = $('#' + containerId);
    $('#' + containerId).find('h1').click(function() {
      container.find('h2, table').toggle();
    });
  }
};

var displayDataInContainer = function(totalData, clazz, containerId) {
  var container = $('#' + containerId);
  var sectionClass = 'p' + clazz;
  var sectionSelector = '#' + containerId + ' .' + sectionClass;
  
  var section = $(sectionSelector);
  if (section.length === 0) {
    container.append('<div class="' + sectionClass + '"></div>');
    section = $(sectionSelector);
  }
  section.hide();
  section.html('<h2>' + clazz.charAt(0).toUpperCase() + clazz.substr(1) + 
    '</h2> <table></table> </div>');
  addDataToTable(section.find('table'), totalData, clazz);
  section.find('h2').click(function() {
    section.find('table').toggle();
    return true;
  });
  section.fadeIn();
};

var processLoadedWalkthrough = function(data, containerId) {
  for (var i = 0; i < classesToAggregate.length; i++) {
    var items = fetchEntities(classesToAggregate[i], data);
    displayDataInContainer(items, classesToAggregate[i], containerId);
  }
};

var loadAllWalkthroughs = function() {
  $.each($('[class^="walk-table"] a[href^="walks/"]'), function() {
    setupDataContainer($(this));
    var url = $(this).attr('href');

    $.get(url, {}, function(data) {
      processLoadedWalkthrough(data, getContainerId(url));
    }, 'html');
  });
};
