Technical Description
=====================
This page contains some technical details about the aggregator. It is written 
in JavaScript and uses the [jQuery library](http://jquery.com/) to work with 
the DOM easily.

You can copy the entire contents of _aggregator.js_ and run it in your browser's
console to see the latest features and changes. The bookmarklet code loads a 
version from GitHub pages which isn't always updated after every change.

Terms
-----
An **_entity_** is any item, creature (friend or foe) or hazard in a walkthrough
that is highlighted. This is what the aggregator works with: it recognizes these
_entities_ and computes statistics for them.

Every entity has a **_class_**, which we define as the CSS class that is used to
highlight the _entity_ in the HTML mark-up of the walkthrough page:

```html
Once you pick up the <span class="item">shotgun</span>, 
a <span class="enemy">thug</span> will attack you.
```

The HTML fragment above contains two entities: "shotgun" and "thug", whose class
is "item" and "enemy", respectively.

The aggregator can be run on two different types of pages: on a specific 
walkthrough page where it will show the entities for that level, or on an 
overview page for a Tomb Raider game (containing links to the game's 
walkthroughs, such as the [Tomb Raider Anniversary Overview](http://tombraiders.net/stella/anniversary.html)).
In the latter case, it computes statistics for each level by loading every
walkthrough page before computing the total over all levels.

For some tasks, it is important to know on which type of page the aggregator is
being run, and so the first case is referred to as  **_single page mode_**, and 
the latter case is the **_overview mode_**.

Structure
---------
The aggregator is contained within the file `aggregator.js`. All of its
functions are saved in the variable `ljacqu`, which is an object with various
keys as to separate the functions by "topics."

The following topics exist:

- `config` – contains various configuration options
- `status` – keeps track of various information for when the aggregator runs
- `total` – stores data for the global total in overview mode
- `loadJquery` – single function to load jQuery when it isn't present
- `game` – game-specific functions (e.g. to handle differences on specific 
 pages)
- `text` – extracts the entities from a page and tries to understand the
 number of referenced entities
- `container` – manages the additional tables to display the results in
- `display` – handles the display logic of the computed statistics
- `run` – entry point functions; the _glue_ between all the other parts


Documentation (custom types)
----------------------------
All public functions and a good portion of the private ones are
documented in a traditional JSDoc manner. However, some custom types are
used as parameter and return type:

**`jQuery`**
<br />Any jQuery specific types, such as a set of matched DOM elements

**`aElem`**
<br />An object representing the walkthrough page it stands for. 
Contains the keys _url_ with the page's URL, and key _text_ with the link text 
to that walkthrough page.

```javascript
// A manual aElem object
var aElem = {url: 'link/to/walkthrough.html', text: 'Level 1: Something'};
// Generate an aElem object from a jQuery-matched <a> tag:
var matchedLink = $('a.someclass');
var newAElem = {url: matchedLink.attr('href'), text: matchedLink.text()};
```
**`entityList`**
<br />Is never used as a type in the documentation (simply `Object` or `Array` 
instead). It comes in two formats:

```javascript
// Object form of entityList
var objectEntityList = {
  dogs: 3,
  thug: 4,
  bear: 1
};
// Array form of entityList ("sorted pair array")
var arrayEntityList = [
  ['thug', 4], ['dogs', 3], ['bear', 1]
];
```

The object form is initially used as a map to compute the total of each entity. 
It is then transformed into the array form so it can be sorted by number and
iterated over more easily.

Separate files
--------------
The file _load_jquery.js_ shows the function used to load jQuery if it isn't
yet loaded. This code could be of use outside of the aggregator.

_classes_used.js_ contains code one can run on a single walkthrough page to see
which entity classes it contains.

A personal collection of todo's and text issues are saved in _issues.txt_. This
is more for myself to remember things than for anything else.

Tools used
----------
The aggregator code is regularly run through [JSHint](http://jshint.com/). The
bookmarklet loads a minimized version of the aggregator, which is created with
[JSCompress](http://jscompress.com/).
