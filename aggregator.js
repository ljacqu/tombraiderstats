var ljacqu = {};

/* ---------------------------------------------------
 * Configuration parameters 
 * --------------------------------------------------- */
ljacqu.config = function() {
  var classesToAggregate = ['enemy', 'item', 'hazard', 'secret', 'gold', 
    'silver', 'friendly'];
  
  /** Custom plural to singular forms. */
  var plurals = {
    gunmen: 'gunman',
    men: 'man',
    mercenaries: 'mercenary',
    mummies: 'mummy',
    switches: 'switch',
    tribesmen: 'tribesman',
    wolves: 'wolf'
  };
  
  return {
    classesToAggregate: classesToAggregate,
    plurals: plurals
  };
}();


/* ---------------------------------------------------
 * jQuery selectors for existing page elements
 * --------------------------------------------------- */
ljacqu.selector = function() {
  /**
   * Selector for all entities we want to extract
   * @param {String} clazz The entity class to match
   * @returns {String} The jQuery selector string
   */
  var entityClass = function(clazz) {
    return 'span.' + clazz;
  };
  
  /**
   * Selector for all links on an overview page leading to the walkthrough
   * pages.
   * @returns {String} The jQuery selector string for all relevant <a> elements
   */
  var walkthroughLinks = function() {
    return '[class^="walk-table"] a[href^="walks/"]';
  };
  
  return {
    entityClass: entityClass,
    walkthroughLinks: walkthroughLinks
  };
}();


/* ---------------------------------------------------
 * Status object
 * --------------------------------------------------- */
ljacqu.status = {
  mode: 'single',
  classes: {}
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
 * Text transformations / semantic extraction
 * --------------------------------------------------- */
ljacqu.texthelper = function() {
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
      'boxes of', 'bunches of', 'bundles of'];
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
  
  return {
    getSemanticInfo: getSemanticInfo,
    mergeEntities: mergeEntities
  };
}();


/* ---------------------------------------------------
 * Document retrieval (HTML extraction, loading)
 * --------------------------------------------------- */
ljacqu.document = function() {
  /**
   * Extracts all entities from a document and returns their total.
   * @param {String} clazz The CSS class to review
   * @param {?Document} source The document (jQuery context) to examine. Omit
   *  for current document.
   * @returns {Object} key = text of the entity, value = total occurrence of the
   *  entity.
   */
  var fetchEntities = function(clazz, source) {
    source = source || document;
    var types = {};
    // Specifying span allows us to use the same class on <td>, which looks cool
    $.each($(ljacqu.selector.entityClass(clazz), source), function() {
      var entry = ljacqu.texthelper.getSemanticInfo($(this).text());
      if (entry.name === '') {
        return;
      } else if (typeof types[entry.name] === 'undefined') {
        types[entry.name] = entry.number;
      } else {
        types[entry.name] += entry.number;
      }
    });
    
    return ljacqu.texthelper.mergeEntities(
      ljacqu.texthelper.mergeEntities(types)
    );
  };
  
  return {
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
   * Single page: move the top ad down a few paragraphs because the aggregation
   * result is right above it otherwise.
   */
  var moveTopAd = function() {
    var adBar = $('.adsense-flex-header:first');
    adBar.fadeOut(function() {
      $('div:first p.header1').parents('div:eq(1)')
        .siblings('p:eq(2)').after(adBar);
      adBar.fadeIn();
    });
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
      table.find('tr').find('td:first').attr('class', clazz);
    } else {
      table.attr('style', 'width: auto');
      //table.find('tr:odd').attr('style', 'background:#292929;color:#B3B3B3');
      table.find('tr:even').attr('style', 'background:#343434;color:#BCBCBC');
    }
  };
  
  return {
    moveTopAd: moveTopAd,
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
  
  var ucfirst = function(text) {
    return text.charAt(0).toUpperCase() + text.substr(1);
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
    var id = getContainerId(aElem.attr('href'));
    if ($('#' + id).length !== 0) {
      return $('#' + id);
    }
    getBaseElement().before('<div id="' + id + '"><h1>' + aElem.text() + 
      '</h1></div>');
    var container = $('#' + id);
    $('#' + id).find('h1').click(function() {
      container.find('h2, table').toggle();
    });
    return container;
  };
  
  /**
   * Creates a dummy aElem object for single page mode.
   * @returns {aElem} An aElem object to use in single page mode
   */
  var createSinglePageElem = function() {
    return {
      attr: function() { return 'results'; },
      text: function() { return 'Statistics'; }
    };
  };
  
  /**
   * Gets the container of a page.
   * @param {aElem} aElem The aElem object for a page
   * @returns {jQuery} Selector for the page's container
   */
  var getContainer = function(aElem) {
    var containerId = getContainerId(aElem.attr('href'));
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
  };
  
  /**
   * Gets a section or creates it if it doesn't exist.
   * @param {String} clazz The entity class to create a section for
   * @param {aElem} aElem The aElem of the given page the section belongs to
   * @returns {jQuery} Selector of the section
   */
  var getSection = function(clazz, aElem) {
    aElem = aElem || createSinglePageElem();
    var container = getContainer(aElem);
    var sectionClass = getSectionClass(clazz);
    var section = container.find('.' + sectionClass);
    if (section.length === 0) {
      createSection(sectionClass, aElem, ucfirst(clazz));
      section = container.find('.' + sectionClass);
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
   * Adds rows to a given table based on an object. Left cell is the object's
   * key, while the right cell is the object's value for each entry.
   * @param {jQuery} table jQuery-selected table object to modify
   * @param {Object} entityList The object to display in the table
   * @param {Object} styleParams Object specifying the style of the table row;
   *  can have keys 'style' with CSS and/or 'class' for CSS class.
   */
  var addDataToTable = function(table, entityList) {
    for (var key in entityList) {
      if (entityList.hasOwnProperty(key)) {
        table.append($('<tr>')
          .append('<td>' + key + '</td>' + '<td style="text-align: right">' + 
            entityList[key] + '</td>')
        );
      }
    }
  };
  
  var resetTable = function(table) {
    table.html('<tr><th>Type</th><th>Total</th></tr>');
  };
  
  /**
   * Adds the elements of the entity list to the according section.
   * @param {Object} entityList The list of found entities
   * @param {String} clazz The class of the entities
   * @param {aElem} aElem aElem object of the page
   */
  var displayEntities = function(entityList, clazz, aElem) {
    var section = ljacqu.container.getSection(clazz, aElem);
    var sectionTable = section.find('table');
    resetTable(sectionTable);
    addDataToTable(sectionTable, entityList);
    ljacqu.effects.styleTable(sectionTable, clazz);
    // TODO ------------
    //if (sectionTable.find('td').length === 0) {
    //  section.remove();
    //}
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
    displayError: displayError
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
   * @param {?Jquery} aElem The jQuery selector for the linking <a> element of
   *  the page we're processing (or empty for single page mode).
   */
  var processPage = function(source, aElem) {
    source = source || false;
    for (var i = 0; i < ljacqu.config.classesToAggregate.length; i++) {
      var currentClass = ljacqu.config.classesToAggregate[i];
      var entities = ljacqu.document.fetchEntities(currentClass, source);
      ljacqu.display.displayEntities(entities, currentClass, aElem);
    }
  };
  
  var makeAElem = function(href, text) {
    return {
      attr: function() { return href; },
      text: function() { return text; }
    };
  };
  
  /**
   * Entry point for overview mode: fetches the links, sends GET requests and
   * delegates the data to the other methods.
   */
  var overviewPageRunner = function() {
    var foundUrls = {};
    $.each($(ljacqu.selector.walkthroughLinks()), function() {
      var urlWithoutHash = $(this).attr('href').split('#')[0];
      var aElem = makeAElem(urlWithoutHash, $(this).text());
      
      if (typeof foundUrls[urlWithoutHash] !== 'undefined') {
        var containerTitle = ljacqu.container.getContainer(aElem).find('h1');
        // aggregator can be run many times, only append the additional title
        // once --> the containers are permanent
        if (containerTitle.text().indexOf(aElem.text()) === -1) {
          containerTitle.append('<span style="font-size: 0.8em"> + ' + 
            aElem.text() + '</span>');
        }
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
    processPage: processPage,
    overviewPageRunner: overviewPageRunner,
    checkWebsite: checkWebsite
  };
}();


ljacqu.loadJquery(function() {
  if (!ljacqu.run.checkWebsite()) {
    return;
  }
  if ($(ljacqu.selector.walkthroughLinks()).length > 0) {
    ljacqu.status.mode = 'overview';
    ljacqu.run.overviewPageRunner();
  } else {
    ljacqu.run.processPage();
  }
});