# ITM (Israeli Transverse Mercator) to WGS84 Converter

A Zero dependency ITM to WGS84 coordinates converter

# Installation

```sh
npm install itm-to-wgs84-converter
```

# Usage

## Node

```js
// CommonJS
const ItmToWgs84Converter = require('itm-to-wgs84-converter');

// ES Module
import ItmToWgs84Converter from 'itm-to-wgs84-converter';
```

## Browser (CDN)

```js
// Classic
<script src="https://cdn.jsdelivr.net/gh/arikw/itm-to-wgs84-converter@1/src/index.js" />

// ES Module
import ItmToWgs84Converter from 'https://cdn.jsdelivr.net/gh/arikw/itm-to-wgs84-converter@1/dist/itm-to-wgs84-converter.browser.mjs';
```

# Usage Examples

```js
// ITM to WGS84
{
  const [ latitude, longitude ] = ItmToWgs84Converter.itm2wgs84(194140, 385060);
  // output: [29.553103541791266, 34.943293095766144]
}

// WGS84 to ITM
{
  const [ east, north ] = ItmToWgs84Converter.wgs842itm(29.553103541791266, 34.943293095766144);
  // output: [194140, 385060]
}

// ICS to WGS84
{
  const [ latitude, longitude ] = ItmToWgs84Converter.ics2wgs84(144140, 885060);
  // output: [29.553036125579155, 34.943337203496604]
}

// WGS84 to ICS
{
  const [ east, north ] = ItmToWgs84Converter.wgs842ics(29.553036125579155, 34.943337203496604);
  // output: [144140, 885060]
}

```

# About

This package is based on the work of Joseph Gray who created the original C++ version and Michael Siton who created the C# version.
