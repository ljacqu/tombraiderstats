Tomb Raider Statistics
======================
Bookmarkable JavaScript code to run on any individual walkthrough or overview 
page of _tombraiders.net_ to display how many enemies, pick-ups, secrets, etc. 
a level contains.

How to use
----------
Create a new bookmark and put the following text in the address field.
```
javascript:(function(){var el=document.createElement('script');el.src='https://ljacqu.github.io/tombraiderstats/aggregator.js';document.body.appendChild(el);})();
```

Click on the bookmark on any [tombraiders.net](http://tombraiders.net) page with
walkthrough content (game overview or an individual walkthrough page). 
For example, on the walkthrough for the 
[Tomb Raider Underworld level Bhogavati](http://tombraiders.net/stella/walks/TR8walk/07bhogavati.html),
or on the [Tomb Raider II overview](http://tombraiders.net/stella/tomb2.html).

About
-----
- [CSS Classes](https://github.com/ljacqu/tombraiderstats/blob/master/CLASSES.md)
— a list of the CSS classes used on tombraiders.net to highlight entities in the text

- [Technical documentation](https://github.com/ljacqu/tombraiderstats/blob/master/TECHNICAL.md)
— contains technical information about this script's implementation

Status
------
Working, and still being actively improved