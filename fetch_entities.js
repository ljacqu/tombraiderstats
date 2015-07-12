var plurals = {
  gunmen: 'gunman',
  men: 'men',
  switches: 'switch',
  tribesmen: 'tribesman',
  wolves: 'wolf'
};

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
    return {'name': '', 'number': 0};
  }
  // match "2 bats"
  var matchNumber = extractedName.match(/^(\d) (.*)$/);
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
    literalNumbers.unshift(0); // this way, [1] => one, [2] => two ... ;)
    return {name: literalMatch[2],
      number: literalNumbers.indexOf(literalMatch[1])};
  }
  // match "shark"
  return {name: extractedName, number: 1};
};

/**
 * Creates a regular expression to remove superfluous words in an entity, e.g.
 * to match things like "a second thug" or "more bats".
 * @returns {RegExp} pattern to recognize superfluous occurrences
 */
var getCardinalRegexp = function() {
  var cardinalWords = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
  var articles = ['the', 'a'];
  var adverbs = ['more', 'additional', 'another', 'sets of', 'boxes of', 
  'bunches of', 'bundles of'];
  var makeRegexpOr = function(arr) {
    return '(' + arr.join('\\s|') + '\\s)';
  };
  // (adverbs|(article? cardinal?)? (actualWord)
  return new RegExp('^(' + makeRegexpOr(adverbs) + '|' +
    makeRegexpOr(articles) + '?' +
    makeRegexpOr(cardinalWords) + '?)?(.*?)$', 'i');
};

/**
 * Replaces the plural with the singular form where applicable. Uses custom list
 * defined in "plurals" but also merges entries such as "bats" and "bat" into
 * "bat" if the no-s version exists.
 * @param {String} entity the name of the entity
 * @param {String} entityList the list of found entities
 * @returns {String} the singular version of entity
 */
var pluralToSingular = function(entity, entityList) {
  entity = entity.toLowerCase();
  if (plurals[entity] !== undefined) {
    return plurals[entity];
  } else if (entity.substr(entity.length - 1) === 's') {
    var singularName = entity.substr(0, entity.length - 1);
    if (entityList[singularName] !== undefined) {
      return singularName;
    }
  }
  return entity;
};

/**
 * Merges entries of an object (entityName: totalNumber) where the entity name
 * is the same, e.g. "more dogs", "a second dog" with "dog".
 * @param {String} entity The entity name to verify (potentially merge).
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
    if (entityList[noCardinalName] !== undefined) {
     entityList[noCardinalName] += entityList[entity];
    } else {
      entityList[noCardinalName] = entityList[entity];
    }
    delete entityList[entity];
  }
  return entityList;
};

var mergeEntities = function(entityList) {
  var mergedList = entityList;
  for (var key in entityList) {
    if (entityList.hasOwnProperty(key)) {
      mergedList = mergeEntityEntry(key, mergedList);
    }
  }
  return mergedList;
};

var fetchEntities = function(clazz, source) {
  source = source || document;
  var types = {};
  // Specifying span allows us to use the same class on <td>, which looks cool
  $.each($("span." + clazz, source), function() {
    var entry = getSemanticInfo($(this).text());
    if (entry.name === '') {
      return;
    } else if (types[entry.name] === undefined) {
      types[entry.name] = entry.number;
    } else {
      types[entry.name] += entry.number;
    }
  });
  return mergeEntities(mergeEntities(types));
};

var addDataToTable = function(table, entityList, clazz) {
  for (var key in entityList) {
    if (entityList.hasOwnProperty(key)) {
      table.append($('<tr>')
        .append('<td class="' + clazz + '">' + key + '</td>' +
        '<td style="text-align: right">' + entityList[key] + '</td>')
      );
    }
  }
};