var ljacqu = {};

/* ---------------------------------------------------
 * Configuration parameters 
 * --------------------------------------------------- */
ljacqu.config = function() {
  var classesToAggregate = ['enemy', 'item', 'secret', 'gold', 'silver'];
  
  /** Custom plural to singular forms. */
  var plurals = {
    gunmen: 'gunman',
    men: 'men',
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
 * jQuery-related utility
 * --------------------------------------------------- */
ljacqu.jquery = function() {
  /**
   * Waits on jQuery to load. Based on
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
  return {
    loadJquery: loadJquery
  };
}();


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
  
  /**
   * Extract all walkthroughs from a page (for table overviews).
   * @param {Callback} processFn Function to process the loaded document (HTML),
   *  taking the <a> element as second parameter.
   * @returns {undefined}
   */
  var loadAllWalkthroughs = function(processFn) {
    $.each($(ljacqu.selector.walkthroughLinks()), function() {
      var aElem = $(this);

      $.get(aElem.attr('href'), {}, function(data) {
        // `data` is a string at this point but is parsed into a document if
        // used as the context in a selector. This loads images (and with the
        // wrong path at that) so we replace the tag with something else.
        // Source: http://stackoverflow.com/questions/7587223/
        data = data.replace(/<img/g, '<cheese');
        var parsedDoc = $(data);
        processFn(parsedDoc, aElem);
      }, 'html');
    });
  };
  
  return {
    fetchEntities: fetchEntities,
    loadAllWalkthroughs: loadAllWalkthroughs
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
  
  var createContainer = function(id, title) {
    getBaseElement().before('<div id="' + id + '"><h1>' + title + 
      '</h1></div>');
    var container = $('#' + id);
    $('#' + id).find('h1').click(function() {
      container.find('h2, table').toggle();
    });
    return container;
  };
  
  var createSinglePageElem = function() {
    return {
      attr: function() {
        return 'results';
      },
      text: function() {
        return 'Statistics';
      }
    };
  };
  
  var getContainer = function(elem) {
    var containerId = getContainerId(elem.attr('href'));
    var container = $('#' + containerId);
    if (container.length === 0) {
      container = createContainer(containerId, elem.text());
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
  
  
  return {
    getSection: getSection
  };  
}();


/* ---------------------------------------------------
 * Display results
 * --------------------------------------------------- */
ljacqu.display = function() {
  /**
   * Helper function to turn a "style param" object into HTML. The object may
   * have a key "style" with content to put into a style attribute or a "class"
   * key for the content of a class attribute. Double quotes must be escaped.
   * @param {Object} styleParams The style paramters
   * @returns {String} The generated attribute(s) based on styleParams
   */
  var styleParamsToHtml = function(styleParams) {
    var htmlResult = '';
    if (styleParams.html) {
      htmlResult += 'style="' + styleParams.html + '"';
    }
    if (styleParams.class) {
      htmlResult += ' class="' + styleParams.class + '"';
    }
    htmlResult = htmlResult.trim();
    if (htmlResult.length === 0) {
      return '';
    }
    return ' ' + htmlResult;
  };
  
  /**
   * Adds rows to a given table based on an object. Left cell is the object's
   * key, while the right cell is the object's value for each entry.
   * @param {jQuery} table jQuery-selected table object to modify
   * @param {Object} entityList The object to display in the table
   * @param {Object} styleParams Object specifying the style of the table row;
   *  can have keys 'style' with CSS and/or 'class' for CSS class.
   */
  var addDataToTable = function(table, entityList, styleParams) {
    for (var key in entityList) {
      if (entityList.hasOwnProperty(key)) {
        table.append($('<tr' + styleParamsToHtml(styleParams) + '>')
          .append('<td>' + key + '</td>' + '<td style="text-align: right">' + 
            entityList[key] + '</td>')
        );
      }
    }
  };
  
  var resetTable = function(table) {
    table.html('<tr><th>Type</th><th>Total</th></tr>');
  };
  
  var displayEntities = function(entityList, clazz, aElem) {
    var section = ljacqu.container.getSection(clazz, aElem);
    var sectionTable = section.find('table');
    resetTable(sectionTable);
    addDataToTable(sectionTable, entityList, {'class': clazz});
  };
  
  return {
    displayEntities: displayEntities
  };
}();


/* ---------------------------------------------------
 * Entry points
 * --------------------------------------------------- */
ljacqu.run = function() {
  var singlePageRunner = function() {
    for (var i = 0; i < ljacqu.config.classesToAggregate.length; i++) {
      var currentClass = ljacqu.config.classesToAggregate[i];
      ljacqu.display.displayEntities(
        ljacqu.document.fetchEntities(currentClass), currentClass);
    }
  };
  
  var processLoadedWalkthrough = function(data, aElem) {
    for (var i = 0; i < ljacqu.config.classesToAggregate.length; i++) {
      var currentClass = ljacqu.config.classesToAggregate[i];
      var items = ljacqu.document.fetchEntities(currentClass, data);
      ljacqu.display.displayEntities(items, currentClass, aElem);
    }
  };
  
  var overviewPageRunner = function() {
    ljacqu.document.loadAllWalkthroughs(processLoadedWalkthrough);
  };
  
  return {
    singlePageRunner: singlePageRunner,
    overviewPageRunner: overviewPageRunner
  };
}();

ljacqu.jquery.loadJquery(function() {
  //ljacqu.run.singlePageRunner();
  ljacqu.run.overviewPageRunner();
});
