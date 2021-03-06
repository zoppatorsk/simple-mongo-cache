# simple-mongo-cache

Simple caching lib that use a MongoDB as cache
Using the mongoose lib.

## Usage

const Cache = require("./SimpleMongoCache");

let cache = new Cache({ ttl: 120, checkPeriod: 60 });

### Options

ttl = In seconds. Time to live, how long the cached resource should be valid.

Default 10


checkPeriod = In seconds. Interval between validaton checks.

Default 5


flushOnCreate = boolean. Should cache collection be flushed when instance object.

Default false


cacheCollectionName = string. Name of the collection you want to use

Default "cache"


ignoreMongoError = boolean. Should errors thrown by mongo just be ignored and logged to console.

Default false


returnDbResults = boolean. Should the original results from mongo be returend, for exampel the count of deleted documents.

Default false


### Methods

set(key, item)
Sets the cache item and the key used to identify it.

get(key)
Get the item with specified key from the cache.

del(key)
Manually delete a cached item for specified key

flush()
flush the cache.
