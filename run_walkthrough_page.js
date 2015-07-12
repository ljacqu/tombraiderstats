$('.adsense-flex-header').fadeOut();

var displayEntities = function(clazz) {
  var totalInfo = fetchEntities(clazz);
  var containerId = clazz + 'Total';
  var container = $('#' + containerId);
  if (container.length === 0) {
    $('#LayoutDiv1').before('<div id="' + containerId + '"></div>');
    container = $('#' + containerId);
  } else {
    container.html('');
  }
  container.hide();
  var title = clazz.charAt(0).toUpperCase() + clazz.substring(1);
  container.html('<h2>' + title + ' total</h2>' + 
    '<table><th>Type</th><th>Total</th></table>');
  var containerTable = container.find('table');
  addDataToTable(containerTable, totalInfo, clazz);
  container.fadeIn();
};

// run
var classesToDisplay = ['enemy', 'item', 'movable', 'hazard'];
for (var i = 0; i < classesToDisplay.length; i++) {
  displayEntities(classesToDisplay[i]);
}