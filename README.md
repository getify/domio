# DOMIO

Companion lib to [Monio](https://github.com/getify/monio), providing a collection of helpers to manage/manipulate the DOM with IO monads, and listen for DOM events via IO-Event-Streams and route the event handling.

## Overview

**DOMIO** is a tightly-coupled companion to [Monio](https://github.com/getify/monio). It's a collection of helper utilities, which together (with Monio) form a sort of foundational, FP-friendly, loose "framework" for JS (especially browser-based) applications.

This "framework" is opinionated in the sense that you should use Monio's IO monad for managing *all* side-effects in a JS application, and thus standardizes around that as its guiding principle. Monio's IO supports "do" syntax, via JS generators, so you can still write more familiar looking (imperative-style) code while adhering to FP and monadic principles.

The four collections of helpers provided:

* `FP-Helpers`: a collection of typical FP utilities, including `eq(..)`, `listMap(..)`, `compose(..)`, etc; these aren't IO or even monad specific; if you already use a library like [Ramda](https://ramdajs.com/), you probably don't need most of these, but the rest of **DOMIO** uses them extensively

* `Misc-Helpers`: a collection of miscellaneous IO-specific helpers, including `log(..)` (for `console.log(..)`'ing) and basic local-state-management using `getState(..)`, `setState(..)`, `updateState(..)`, etc

* `DOM-Helpers`: a collection of DOM-focused IO-specific helpers, including `getElement(..)`, `addClass(..)`, etc

* `Event-Helpers`: a collection of Event-focused IO-specific helpers, for managing DOM events with streams and routers (via `manageDOMEvents(..)` and its returned API methods), sending events on a standard Event-Emitter (like [Node's EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) or [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) for the browser), waiting for one-time events, etc

## Details

More details coming soon.

## npm Package

To install this package from `npm`:

```
npm install domio
```

The files you'll need from DOMIO are included in the `dist/` directory. They come in two forms:

* [UMD (Univeral Module Definition)](https://github.com/umdjs/umd) for easy use in the browser in normal `<script src=..></script>` tags, or with AMD-compatible script loaders, from the `dist/umd/` directory.

    You'll likely deploy the single `bundle.js` file for **DOMIO**, as well Monio's `bundle.js` file (suggested: rename them!), for most convenience. You *can* however deploy individual files (assuming they're loaded in the correct order) from here if you choose, but it's not as recommended/optimal.

* [ESM (ES Modules)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) for use in modern browser applications, using `<script type=module src=..></script>` tags and `import` / `export` statements, from the `dist/esm-browser/` directory.

    You'll likely deploy all of the files in this directory, exactly as they appear in there, including the `monio` sub-directory and its files. The build for **DOMIO** uses [Import-Remap](https://github.com/getify/import-remap) to ensure all references to Monio's files in its `import` statements resolve properly to that relative location.

    In other words, you won't need to separately deploy Monio when using **DOMIO**, you'll just use the files it ships with.

## Browser Usage

Using the UMD-style files from `dist/`, loaded as normal scripts, you'll have automatic globals to interact with in your app:

```js
var { curry, compose } = FPHelpers;
var { log } = MiscHelpers;

IO;  // IO(..)
```

Or using them in an AMD-style module (assuming the **DOMIO** and Monio AMD files/bundles have already been loaded):

```js
define(
    ["FPHelpers","MiscHelpers","IO"],
    function def(FPHelpers,MiscHelpers,IO){
        var { curry, compose } = FPHelpers;
        var { log } = MiscHelpers;

        IO;  // IO(..)
    }
);
```

Or importing them into an ES module (in the browser):

```js
import {
    FPHelpers,
    MiscHelpers,
    DOMHelpers,
    EventHelpers,
} from "url/to/domio/index.mjs";

// or:
import FPHelpers from "url/to/domio/fp-helpers.mjs";
var { curry, compose } = FPHelpers;

// or:
import { log } from "url/to/domio/misc-helpers.mjs";

// you'll also want monio, which comes along
// with DOMIO automatically
import IO from "url/to/domio/monio/io";
```

When using ES modules in the browser, unless you use [import-maps](https://github.com/WICG/import-maps), which are [not currently supported in any/most browsers](https://caniuse.com/import-maps), you'll have to specify a URL (relative or absolute) to the **DOMIO** (and thus, Monio) files you deploy from the `dist/esm-browser/` directory, as in `url/to/domio/..` above. These URLs typically need a file extension, which for both **DOMIO** and Monio is always `.mjs`.

As explained earlier, and illustrated here, the path to use for Monio is relative to (aka, inside of) where you deploy **DOMIO** (`url/to/domio/monio/..`).

## Node Usage

You typically *won't* use DOMIO on the server, as it's heavily focused on browser-based environments (DOM, etc). However, should you wish to, here's how to require it in a Node script:

```js
var {
    FPHelpers,
    MiscHelpers,
    DOMHelpers,
    EventHelpers,
} = require("domio");

// or:
var FPHelpers = require("domio/fp-helpers");
var { curry, compose } = FPHelpers;

// or:
var { log } = require("domio/misc-helpers");

// you'll also want Monio's IO, which comes along
// with DOMIO automatically
var IO = require("monio/io");
```

Or in an ES module (in Node):

```js
import {
    FPHelpers,
    MiscHelpers,
    DOMHelpers,
    EventHelpers,
} from "domio/esm";

// or:
import FPHelpers from "domio/fp-helpers";
var { curry, compose } = FPHelpers;

// or:
import { log } from "domio/misc-helpers";

// you'll also want monio, which comes along
// with DOMIO automatically
import IO from "monio/esm/io";
```

## License

All code and documentation are (c) 2021 Kyle Simpson and released under the [MIT License](http://getify.mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
