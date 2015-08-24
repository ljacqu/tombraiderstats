CSS Classes
===========
The walkthroughs on _tombraiders.net_ use different colors for different types 
of entities, e.g. enemies are shown in orange color and items are green.

These colors are defined with CSS classes in the HTML of walkthrough pages. 
For example, an enemy may be mentioned in the following way in the HTML markup:

```html
A <span class="enemy">dog</span> emerges
```

This is how the aggregator recognizes the entities on a page – it searches for 
the use of specific CSS classes.

This page contains a list of CSS classes and the entity type they stand for.

Basic classes
-------------
Classes present in all walkthroughs.

Class name | Example
---------- | -------------
enemy      | guards, tigers, rats
hazard     | fire, water current, lasers
item       | keys, ammo, guns
movable    | buttons, levers, blocks


Specific classes
----------------
Present only in some games; their meaning may vary.

Class name | Description
---------- | -----------
artifact   | TRA
bronze     | TRL: reward
crystal    | TR1, TR3: save crystal; AOD: upgrades; TRL, TRA: checkpoints
friendly   | Friendly entities (rare occurrence in most games :sweat_smile:)
gold       | TR2: secret; TRL: reward; TRU: relic
jade       | TR2: secret
relic      | TRA
rubbing    | TRA Wii: rewards
silver     | TR2: secret; TRL: reward; TRU: treasure


**Tomb Raider (2013)**

Self-descriptive classes.
- challenge
- document
- gps
- map
- objective
- relic
- salvage


**Guardian of Light and Temple of Osiris**

- ammo
- bronze: relic
- gem
- gold: artifact
- red