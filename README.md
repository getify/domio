# Domio

**Domio** (dä'me-yo) is a companion lib to [Monio](https://github.com/getify/monio), providing a collection of helpers to manage/manipulate the DOM with IO monads, and listen for DOM events via IO-Event-Streams and route the event handling.

## Overview

**Domio** is a tightly-coupled companion to [Monio](https://github.com/getify/monio). It's a collection of helper utilities, which together (with Monio) form a sort of foundational, FP-friendly, loose "framework" for JS (especially browser-based) applications.

This "framework" is opinionated in the sense that you should use Monio's IO monad for managing *all* side-effects in a JS application, and thus standardizes around that as its guiding principle. Monio's IO supports "do" syntax, via JS generators, so you can still write more familiar looking (imperative-style) code while adhering to FP and monadic principles.

The four collections of helpers provided:

* `FP-Helpers`: a collection of typical FP utilities, including `eq(..)`, `listMap(..)`, `compose(..)`, etc; these aren't IO or even monad specific; if you already use a library like [Ramda](https://ramdajs.com/), you probably don't need most of these, but the rest of **Domio** uses them extensively

* `Misc-Helpers`: a collection of miscellaneous IO-specific helpers, such as basic *State*-monad'ish capability (stored in IO's Reader env under `state`) using `getState(..)`, `setState(..)`, `updateState(..)`, etc

* `DOM-Helpers`: a collection of DOM-focused IO-specific helpers, including `getElement(..)`, `addClass(..)`, etc

* `Event-Helpers`: a collection of Event-focused IO-specific helpers, for managing DOM events with streams and routers (via `manageDOMEvents(..)` and its returned API methods), sending events on a standard Event-Emitter (like [Node's EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) or [EventEmitter2](https://github.com/EventEmitter2/EventEmitter2) for the browser), waiting for one-time events, etc

## Details

More details coming soon.

## npm Package

To install this package from `npm`:

```
npm install domio
```

The files you'll need from **Domio** are included in the `dist/` directory. They come in three forms:

* [UMD (Univeral Module Definition)](https://github.com/umdjs/umd) for use in the browser in classic `<script src=..></script>` tags, or with AMD-compatible script loaders, from the `dist/umd/` directory.

    You'll likely deploy the single `bundle.js` file for **Domio**, as well Monio's `bundle.js` file (suggested: rename them!), for most convenience. You *can* however deploy individual files (assuming they're loaded in the correct order) from here if you choose, but it's not as recommended/optimal.

* [Browser ESM (ES Modules)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) for use in modern browser applications, using `<script type=module src=..></script>` tags and `import` / `export` statements, from the `dist/esm-browser/` directory.

    You'll likely deploy all of the files in this directory, exactly as they appear in there, including the `monio` sub-directory and its files. The build for **Domio** uses [Import-Remap](https://github.com/getify/import-remap) to ensure all references to Monio's files in its `import` statements resolve properly to that relative location.

    In other words, you won't need to separately deploy Monio when using **Domio**, you'll just use the files it ships with.

* Plain ESM from the `dist/esm/` directory, for potential use in non-browser environments (ie, Node). These files may prove useful in some endeavors, and are provided for completeness sake. But **Domio** is definitely geared more for use in browsers.

## Browser Usage

Using the UMD-style files from `dist/umd/`, loaded as normal scripts, you'll have automatic globals to interact with in your app:

```js
var { curry, compose } = FPHelpers;
var { whenDOMReady } = DOMHelpers;

IO;  // IO(..)
```

Or using them in an AMD-style module (assuming the **Domio** and Monio AMD files/bundles have already been loaded):

```js
define(
    ["FPHelpers","DOMHelpers","IO"],
    function def(FPHelpers,DOMHelpers,IO){
        var { curry, compose } = FPHelpers;
        var { whenDOMReady } = DOMHelpers;

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
import { whenDOMReady } from "url/to/domio/dom-helpers.mjs";

// you'll also want Monio's IO, which comes along
// with Domio automatically
import IO from "url/to/domio/monio/io.mjs";
```

When using ES modules in the browser, unless you use [import-maps](https://github.com/WICG/import-maps), which are [not currently supported in any/most browsers](https://caniuse.com/import-maps), you'll have to specify a URL (relative or absolute) to the **Domio** (and thus, Monio) files you deploy from the `dist/esm-browser/` directory, as in `url/to/domio/..` above. These URLs typically need a file extension, which for both **Domio** and Monio is always `.mjs`.

As explained earlier, and illustrated here, the path to use for Monio is relative to (aka, inside of) where you deploy **Domio** (`url/to/domio/monio/..`).

## Node Usage

You typically *won't* use **Domio** on the server, as it's heavily focused on browser-based environments (DOM, etc). However, should you wish to, here's how to require it in a Node script:

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
var { whenDOMReady } = require("domio/dom-helpers");

// you'll also want Monio's IO, which comes along
// with Domio automatically
var IO = require("monio/io");
```

Or in a Node ES module:

```js
import {
    FPHelpers,
    MiscHelpers,
    DOMHelpers,
    EventHelpers,
} from "domio/esm";

// or:
import FPHelpers from "domio/esm/fp-helpers";
var { curry, compose } = FPHelpers;

// or:
import { whenDOMReady } from "domio/esm/dom-helpers";

// you'll also want monio, which comes along
// with Domio automatically
import IO from "monio/esm/io";
```

## License

All code and documentation are (c) 2021 Kyle Simpson and released under the [MIT License](http://getify.mit-license.org/). A copy of the MIT License [is also included](LICENSE.txt).
