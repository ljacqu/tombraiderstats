var ljacqu = {};

/* ---------------------------------------------------
 * Configuration parameters 
 * --------------------------------------------------- */
ljacqu.config = function() {
  var classesToAggregate = ['enemy', 'item', 'hazard', 'secret', 'gold',
    'silver', 'friendly'];
  
  /** Custom plural to singular forms. */
  var plurals = {
    'cat mummies': 'cat mummy',
    'guard dog': 'dog',
    gunmen: 'gunman',
    'hk ammo': 'hk clips',
    'huskies': 'dog',
    'husky': 'dog',
    'large medipak': 'large medipack',
    men: 'man',
    mercenaries: 'mercenary',
    'mp5 ammo': 'mp5 clips',
    mummies: 'mummy',
    'shotgun ammo': 'shotgun shells',
    'small medipak': 'small medipack',
    'smg ammo': 'smg clips',
    switches: 'switch',
    tribesmen: 'tribesman',
    'wild boar': 'boar',
    'wolf\'s': 'wolf',
    wolves: 'wolf'
  };
  
  var maximumEntryLength = 100;
  
  /**
   * Returns the selector rule to extract all entities of the given class.
   * @param {String} clazz The entity class to match
   * @returns {String} The jQuery selector string
   */
  var selectEntities = function(clazz) {
    return 'span.' + clazz;
  };

  /**
   * Returns the selector rule for all links on an overview page leading to the 
   * walkthrough pages.
   * @returns {String} The jQuery selector string for all relevant <a> elements
   */
  var selectWalkthroughLinks = function() {
    return '[class^="walk-table"] a[href^="walks/"]';
  };
  
  
  return {
    classesToAggregate: classesToAggregate,
    maximumEntryLength: maximumEntryLength,
    plurals: plurals,
    selectEntities: selectEntities,
    selectWalkthroughLinks: selectWalkthroughLinks
  };
}();


/* ---------------------------------------------------
 * Status and total object
 * --------------------------------------------------- */
ljacqu.status = {
  // See run.initStatus()
};
ljacqu.total = {
  // See run.initStatus()
};

/* ---------------------------------------------------
 * jQuery loader single function
 * --------------------------------------------------- */
/**
 * Waits on jQuery to load. Based on
 * <http://neighborhood.org/core/sample/jquery/append-to-head.htm>.
 * @param {Callback} whenLoaded The function to execute once jQuery has loaded.
 *  This function is also called when jQuery did not have to be loaded manually,
 *  i.e. the function is always called exactly once (unless jQuery has to be
 *  loaded and there was an error).
 */
ljacqu.loadJquery = function(whenLoaded) {
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
    var jq = document.createElement('script');
    jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.6.3/jquery.min.js";
    document.getElementsByTagName('head')[0].appendChild(jq);
    waitForLoadedJquery();
  } else {
    whenLoaded();
  }
};


/* ---------------------------------------------------
 * Text transformations / semantic functions / HTML extraction
 * --------------------------------------------------- */
ljacqu.text = function() {
  /**
   * Low-level sanitation: replaces "SECRET #3"-like occurrences to "secret" and
   * removes any non-word characters (e.g. punctuation) from the beginning and
   * the end.
   * @param {String} extractedName The name to sanitize
   * @returns {String} Sanitized version of the entity
   */
  var sanitizeEntityName = function(extractedName) {
    if (extractedName.match(/^secret #\d+$/i)) {
      return 'secret';
    }
    return extractedName.replace(/^\W+/, '').replace(/\W+$/, '')
      .trim().toLowerCase();
  };

  /**
   * Attempts to extract the number of entities such as when "2 bats" are
   * mentioned.
   * @param {String} extractedName The name in the HTML to process
   * @returns {Object} number: number of occurrences;
   *  name: cleaned entity name.
   */
  var getSemanticInfo = function(extractedName) {
    extractedName = sanitizeEntityName(extractedName);
    if (extractedName === '') {
      return {name: '', number: 0};
    }
    // match "2 bats"
    var matchNumber = extractedName.match(/^(\d+) (.*)$/);
    if (matchNumber) {
      return {
        number: parseInt(matchNumber[1]),
        name: matchNumber[2]
      };
    }
    // match "three thugs"
    var literalNumbers = ['one', 'two', 'three', 'four', 'five', 'six'];
    var literalRegexp = new RegExp('^(' + literalNumbers.join('|') + ')' +
      '\\s(.*?)$');
    var literalMatch = extractedName.match(literalRegexp);
    if (literalMatch) {
      // push 0 to front so [1] -> one, [2] -> two, etc.
      literalNumbers.unshift(0);
      return {
        name: literalMatch[2],
        number: literalNumbers.indexOf(literalMatch[1])
      };
    }
    // match the rest, e.g. "shark"
    return {name: extractedName, number: 1};
  };
  
  /**
   * Replaces the plural with the singular form where applicable. Uses custom
   * list defined in "plurals" but also merges entries such as "bats" and "bat" 
   * into "bat" if the no-s ("bat") version exists.
   * @param {String} entity the name of the entity
   * @param {String} entityList the list of found entities
   * @returns {String} the singular version of entity
   */
  var pluralToSingular = function(entity, entityList) {
    entity = entity.toLowerCase();
    if (typeof ljacqu.config.plurals[entity] !== 'undefined') {
      return ljacqu.config.plurals[entity];
    } else if (entity.substr(entity.length - 1) === 's') {
      var singularName = entity.substr(0, entity.length - 1);
      if (typeof entityList[singularName] !== 'undefined') {
        return singularName;
      }
    }
    return entity;
  };
  
  /**
   * Creates a regular expression to remove superfluous words in an entity, e.g.
   * to match things like "a second thug" or "more bats".
   * @returns {RegExp} pattern to recognize superfluous occurrences
   */
  var getCardinalRegexp = function() {
    var cardinalWords = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth',
      'seventh', 'eighth', 'ninth', 'tenth'];
    var articles = ['the', 'a'];
    var adverbs = ['more', 'additional', 'another', 'other', 'sets of', 
      'boxes of', 'bunches of', 'bundles of', 'bundle of'];
    var makeRegexpOr = function(arr) {
      return '(' + arr.join('\\s|') + '\\s)';
    };
    // (adverbs|(article? cardinal?)? (actualWord)
    return new RegExp('^(' + makeRegexpOr(adverbs) + '|' +
      makeRegexpOr(articles) + '?' +
      makeRegexpOr(cardinalWords) + '?)?(.*?)$', 'i');
  };

  /**
   * Attempts to merge a given entry with another one if the same name exists in
   * singular or otherwise similar (e.g. "a second tiger" and "tiger").
   * @param {String} entity The entity name to examine (potentially merge)
   * @param {Object} entityList The entities discovered as object, where
   *  the key is the extracted name and the value the total number.
   * @returns {Object} Merged object
   */
  var mergeEntityEntry = function(entity, entityList) {
    var cardinalMatches = entity.match(getCardinalRegexp());
    var noCardinalName = cardinalMatches ?
      cardinalMatches[ cardinalMatches.length - 1 ] : entity;
    noCardinalName = pluralToSingular(noCardinalName, entityList);
    if (noCardinalName !== entity) {
      console.log(entity + " renamed to " + noCardinalName);
      if (typeof entityList[noCardinalName] !== 'undefined') {
       entityList[noCardinalName] += entityList[entity];
      } else {
        entityList[noCardinalName] = entityList[entity];
      }
      delete entityList[entity];
    }
    return entityList;
  };
  
  /**
   * Merges entity names (as keys in an object) together which designate the
   * same type of entity but have a different name (plural vs. singular,
   * "another goon" vs. "goon" etc.).
   * @param {Object} entityList The list of found entities where the key is the
   * entity name and the value the total number of occurrences.
   * @returns {Object} A merged entity list
   */
  var mergeEntities = function(entityList) {
    var mergedList = entityList;
    for (var key in entityList) {
      if (entityList.hasOwnProperty(key)) {
        mergedList = mergeEntityEntry(key, mergedList);
      }
    }
    return mergedList;
  };
  
  /**
   * Adds the entries of the entity list to the global total object in
   * ljacqu.total. Used for overview mode.
   * @param {Object} entityList The list of found entities
   * @param {String} clazz The entity class of the list's entries
   */
  var addToTotal = function(entityList, clazz) {
    for (var key in entityList) {
      if (entityList.hasOwnProperty(key)) {
        if (typeof ljacqu.total[clazz][key] !== 'undefined') {
          ljacqu.total[clazz][key] += entityList[key];
        } else {
          ljacqu.total[clazz][key] = entityList[key];
        }
      }
    }
  };
  
  /**
   * Takes the entity list object and returns a sorted array of "pairs" where
   * the first element is the entity name and the second is the number.
   * @param {Object} entityList
   * @returns {Array} Array where each entry is an array of two entries:
   *  [0] is the entity name, [1] is the number of occurrences of that entity
   */
  var createSortedPairArray = function(entityList) {
    var arrayList = [];
    for (var entity in entityList) {
      if (entityList.hasOwnProperty(entity)) {
        arrayList.push([entity, entityList[entity]]);
      }
    }
    arrayList.sort(function(a, b) {
      var numericDifference = b[1] - a[1];
      if (numericDifference !== 0) {
        return numericDifference;
      } else {
        // If both entries have same number, sort by entity name
        return a[0] > b[0] ? 1 : (a[0] < b[0] ? -1 : 0);
      }
    });
    return arrayList;
  };

  /**
   * Extracts all entities from a document and returns their total.
   * @param {String} clazz The CSS class to review
   * @param {?Document} source The document (jQuery context) to examine. Omit
   *  for current document.
   * @returns {Array} Sorted array of pairs with (entityName, number).
   */
  var fetchEntities = function(clazz, source) {
    source = source || document;
    var types = {};
    // Specifying span allows us to use the same class on <td>, which looks cool
    $.each($(ljacqu.config.selectEntities(clazz), source), function() {
      var entry = getSemanticInfo($(this).text());
      if (entry.name === '') {
        return;
      } else if (typeof types[entry.name] === 'undefined') {
        types[entry.name] = entry.number;
      } else {
        types[entry.name] += entry.number;
      }
    });
    
    var mergedList = mergeEntities(mergeEntities(types));
    if (ljacqu.status.mode === 'overview') {
      addToTotal(mergedList, clazz);
    }
    return createSortedPairArray(mergedList);
  };
  
  return {
    createdSortedPairArray: createSortedPairArray,
    fetchEntities: fetchEntities
  };
}();


/* ---------------------------------------------------
 * Animation effects and styling help
 * --------------------------------------------------- */
ljacqu.effects = function() {
  /**
   * Makes the user scroll to the top.
   */
  var scrollToTop = function() {
    $("html, body").animate({ scrollTop: 0 }, "slow");
  };
  
  /**
   * Styles a table showing the aggregated results of an entity type. In single
   * page mode, it adds the entity class to the left-hand side; in overview mode
   * the rows use alternating shades of gray.
   * @param {jQuery} table jQuery selector to the table to style
   * @param {String} clazz The class of the entities being shown
   */
  var styleTable = function(table, clazz) {
    if (ljacqu.status.mode === 'single') {
      table.find('tr:not(:last-child)').find('td:first').attr('class', clazz);
    } else {
      var widthCss = 'width: auto';
      if (typeof table.attr('style') === 'undefined' || 
        table.attr('style').indexOf(widthCss) === -1) {
        table.attr('style', widthCss);
      }
      // style by default, so it is commented out
      //table.find('tr:odd').attr('style', 'background:#292929;color:#B3B3B3');
      table.find('tr:even').attr('style', 'background:#343434;color:#BCBCBC');
      table.find('tr.agg_total').find('td')
        .attr('style', 'border-top: 1px solid #ccc');
    }
  };
  
  return {
    scrollToTop: scrollToTop,
    styleTable: styleTable
  };
}();


/* ---------------------------------------------------
 * Container module (for result data)
 * --------------------------------------------------- */
ljacqu.container = function() {
  
  var getBaseElement = function() {
    // overview page has #wrap, single page has #LayoutDiv1
    var base = $('#wrap');
    if (base.length === 0) {
      base = $('#LayoutDiv1');
      if (base.length === 0) {
        throw new Error('Could not get base element!');
      }
    }
    return base;
  };
  
  var getContainerId = function(url) {
    var folders = url.split('/');
    return 'ctr_' + folders[ folders.length - 1 ].split('.')[0];
  };
  
  /**
   * Create a container for a given page.
   * @param {aElem} aElem The aElem of a page
   * @returns {jQuery} Selector of the page's container
   */
  var createContainer = function(aElem) {
    var id = getContainerId(aElem.url);
    if ($('#' + id).length !== 0) {
      return $('#' + id);
    }
    getBaseElement().before('<div id="' + id + '"><h1>' + aElem.text + 
      '</h1></div>');
    var container = $('#' + id);
    
    $('#' + id).find('h1').click(function() {
      if (container.find('div:visible').length > 0) {
        container.find('div').hide();
      } else {
        container.find('div').show();
      }
    });
    return container;
  };
  
  /**
   * Gets the container of a page.
   * @param {aElem} aElem The aElem object for a page
   * @returns {jQuery} Selector for the page's container
   */
  var getContainer = function(aElem) {
    var containerId = getContainerId(aElem.url);
    var container = $('#' + containerId);
    if (container.length === 0) {
      container = createContainer(aElem);
    }
    return container;
  };
  
  var getSectionClass = function(clazz) {
    return 'sec_' + clazz;
  };
  
  var createSection = function(sectionClass, aElem, title) {
    var container = getContainer(aElem);
    container.append('<div class="' + sectionClass + '">' + 
      '<h2>' + title + '</h2><table></table></div>');
    var section = container.find('.' + sectionClass);
    section.find('h2').click(function() {
      section.find('table').toggle();
    });
    return section;
  };
  
  /**
   * Gets a section or creates it if it doesn't exist.
   * @param {String} clazz The entity class to create a section for
   * @param {?aElem} aElem The aElem of the given page the section belongs to
   * @returns {jQuery} Selector of the section
   */
  var getSection = function(clazz, aElem) {
    aElem = aElem || {url: 'results', text: 'Statistics'};
    var container = getContainer(aElem);
    var sectionClass = getSectionClass(clazz);
    var section = container.find('.' + sectionClass);
    if (section.length === 0) {
      var title = clazz.charAt(0).toUpperCase() + clazz.substr(1);
      section = createSection(sectionClass, aElem, title);
    }
    return section;
  };
  
  /**
   * Get all sections that display a certain entity class.
   * @param {String} clazz The section classes to fetch
   * @returns {jQuery} Selector with all the sections
   */
  var getAllSections = function(clazz) {
    return $('div[id^="ctr"] div.sec_' + clazz);
  };
  
  /**
   * Removes all containers. Used for debug only.
   */
  var removeAll = function() {
    getBaseElement().prevAll('div').remove();
  };
  
  
  return {
    createContainer: createContainer,
    getContainer: getContainer,
    getSection: getSection,
    getAllSections: getAllSections,
    removeAll: removeAll
  };  
}();


/* ---------------------------------------------------
 * Display results
 * --------------------------------------------------- */
ljacqu.display = function() {
  
  /**
   * Shortens a text if it exceeds the given length limit.
   * @param {String} text The text to potentially shorten
   * @param {Number} length The maximum allowed length
   * @returns {String} The length, shortened to `length` characters if it is 
   *  longer
   */
  var shortenEntry = function(text, length) {
    return text.length > length ? text.substr(0, length).trim() + '...' : text;
  };
  
  /**
   * Adds rows to a given table based on an object. Left cell is the object's
   * key, while the right cell is the object's value for each entry.
   * @param {jQuery} table jQuery-selected table object to modify
   * @param {Array} entityList The pair array to display in the table
   */
  var addDataToTable = function(table, entityList) {
    var total = 0;
    for (var i = 0; i < entityList.length; ++i) {
      total += entityList[i][1];
      table.append($('<tr>')
        .append('<td>' + shortenEntry(entityList[i][0], 
          ljacqu.config.maximumEntryLength) + '</td>' +
          '<td style="text-align: right">' + entityList[i][1] + '</td>')
      );
    }
    if (entityList.length >= 2) {
      table.append('<tr class="agg_total"><td>Total</td>' + 
        '<td style="text-align: right">' + total + '</td></tr>');
    }
  };
  
  /**
   * Adds the elements of the entity list to the according section.
   * @param {Array} entityList The list of found entities (sorted pair array)
   * @param {String} clazz The class of the entities
   * @param {aElem} aElem aElem object of the page
   */
  var displayEntities = function(entityList, clazz, aElem) {
    var section = ljacqu.container.getSection(clazz, aElem);
    var sectionTable = section.find('table');
    sectionTable.html('<tr><th>Type</th><th>Total</th></tr>');
    if (entityList.length > 0) {
      addDataToTable(sectionTable, entityList);
      ljacqu.effects.styleTable(sectionTable, clazz);
      ljacqu.status.classes[clazz] = true;
    } else {
      sectionTable.html('<tr><td>No entities found.</td></tr>');
    }
  };
  
  /**
   * Hides the sections for classes that are not present in the game, i.e. for
   * classes that are not used in this game's walkthrough or on this page.
   */
  var hideUnusedClasses = function() {
    for (var i = 0; i < ljacqu.config.classesToAggregate.length; i++) {
      var currentClass = ljacqu.config.classesToAggregate[i];
      if (typeof ljacqu.status.classes[currentClass] === 'undefined') {
        ljacqu.container.getAllSections(currentClass).remove();
      }
    }
  };
  
  /**
   * Adds the global container for overview mode, showing the global total of
   * all entity classes.
   */
  var addGlobalTotal = function() {
    var totalAElem = {url: '_total', text: 'Total'};
    ljacqu.container.createContainer(totalAElem);
    for (var key in ljacqu.total) {
      if (ljacqu.total.hasOwnProperty(key)) {
        displayEntities(ljacqu.text.createdSortedPairArray(ljacqu.total[key]), 
          key, totalAElem);
      }
    }
  };
  
  /**
   * Function that runs concluding tasks once after the aggregating tasks have
   * finished (in overview mode, when all pages have been loaded & processed).
   */
  var postProcess = function() {
    if (ljacqu.status.mode === 'single') {
      hideUnusedClasses();
    } else if (ljacqu.status.handledLinks === ljacqu.status.foundLinks) {
      addGlobalTotal();
      hideUnusedClasses();
    }
  };
  
  /**
   * Creates an error box and displays a given error message.
   * @param {String} message The error message to display
   */
  var displayError = function(message) {
    var errorBox = $('#agg_err');
    if (errorBox.length === 0) {
      $('body').prepend('<div id="agg_err" style="color:#300; display:block;' +
        ' border:1px solid #900; background-color:#fee; padding:10px;' + 
        ' margin:20px; z-index:2015; opacity:1"></div>');
      errorBox = $('#agg_err');
    }
    errorBox.hide();
    ljacqu.effects.scrollToTop();
    errorBox.html(message);
    errorBox.fadeIn();
  };
  
  return {
    displayEntities: displayEntities,
    displayError: displayError,
    postProcess: postProcess
  };
}();


/* ---------------------------------------------------
 * Entry points
 * --------------------------------------------------- */
ljacqu.run = function() {
  /**
   * Entry point for single-page mode and for loaded walkthrough data.
   * @param {?String} source The HTML to extract the entities from, or empty for
   *  the current document.
   * @param {?aElem} aElem The jQuery selector for the linking <a> element of
   *  the page we're processing (or empty for single page mode).
   */
  var processPage = function(source, aElem) {
    source = source || false;
    for (var i = 0; i < ljacqu.config.classesToAggregate.length; i++) {
      var currentClass = ljacqu.config.classesToAggregate[i];
      var entities = ljacqu.text.fetchEntities(currentClass, source);
      ljacqu.display.displayEntities(entities, currentClass, aElem);
    }
    ljacqu.status.handledLinks++;
    ljacqu.display.postProcess();
  };
  
  /**
   * Initializes the ljacqu.status object, which keeps track of certain states
   * and numbers while the aggregator runs.
   * @param {String} mode The running mode (overview|single)
   */
  var initStatus = function(mode) {
    ljacqu.status = {
      /* Registers the mode we are in */
      mode: mode,
      /* Keeps track of what entity classes have content */
      classes: {},
      /* how many links were found for processing */
      foundLinks: 0,
      /* how many pages have been processeed */
      handledLinks: 0
    };
    /* For overview mode: global total of all entries */
    ljacqu.total = {};
    var classes = ljacqu.config.classesToAggregate;
    for (var i = 0; i < classes.length; ++i) {
      ljacqu.total[ classes[i] ] = {};
    }
  };
  
  /**
   * Entry point for overview mode: fetches the links, sends GET requests and
   * delegates the data to the other methods.
   */
  var overviewPageRunner = function() {
    // all the links found to walkthroughs... some may link to the same page
    var foundHtmlLinks = $(ljacqu.config.selectWalkthroughLinks());
    ljacqu.status.foundLinks = foundHtmlLinks.length;
    // object keeping track of all found URLs to prevent links/containers from
    // being created for the same page
    var foundUrls = {};
    
    $.each(foundHtmlLinks, function() {
      var urlWithoutHash = $(this).attr('href').split('#')[0];
      var aElem = {url: urlWithoutHash, text: $(this).text()};
      
      if (typeof foundUrls[urlWithoutHash] !== 'undefined') {
        var containerTitle = ljacqu.container.getContainer(aElem).find('h1');
        // aggregator can be run many times, only append the additional title
        // once --> the containers are permanent
        if (containerTitle.text().indexOf(aElem.text) === -1) {
          containerTitle.append('<span style="font-size: 0.8em"> + ' + 
            aElem.text + '</span>');
        }
        ljacqu.status.handledLinks++;
        ljacqu.display.removeEmptySections();
        return;
      }
      ljacqu.container.createContainer(aElem);
      foundUrls[urlWithoutHash] = true;

      $.get(urlWithoutHash, {}, function(data) {
        // `data` is a string at this point but is parsed into a document if
        // used as the context in a selector. This loads images (and with the
        // wrong path at that) so we replace the tag with something else.
        // Source: http://stackoverflow.com/questions/7587223/
        processPage(data.replace(/<img/g, '<cheese'), aElem);
      }, 'html');
    });
  };
  
  /**
   * Ensure that the page is on tombraiders.net or www.tombraiders.net.
   * @returns {boolean} True if the page is on tombraiders.net, false otherwise.
   */
  var checkWebsite = function() {
    var isRightWebsite = window.location.href
      .match(/^https?:\/\/(www\.)?tombraiders\.net(\/.*)?$/i);
    if (!isRightWebsite) {
      ljacqu.display.displayError('You are not on ' + 
        '<b><a href="http://tombraiders.net">tombraiders.net</a></b>');
    }
    return isRightWebsite;
  };

  return {
    initStatus: initStatus,
    processPage: processPage,
    overviewPageRunner: overviewPageRunner,
    checkWebsite: checkWebsite
  };
}();


ljacqu.loadJquery(function() {
  if (!ljacqu.run.checkWebsite()) {
    return;
  }
  if ($(ljacqu.config.selectWalkthroughLinks()).length > 0) {
    ljacqu.run.initStatus('overview');
    ljacqu.run.overviewPageRunner();
  } else {
    ljacqu.run.initStatus('single');
    ljacqu.run.processPage();
  }
});
