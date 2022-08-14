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
const converter = require('itm-to-wgs84-converter');

// ES Module
import converter from 'itm-to-wgs84-converter';
```

# Usage Examples

```js
// ITM to WGS84
{
  const [ latitude, longitude ] = converter.itm2wgs84(194140, 385060);
  // output: [29.553103541791266, 34.943293095766144]
}

// WGS84 to ITM
{
  const [ east, north ] = converter.wgs842itm(29.553103541791266, 34.943293095766144);
  // output: [194140, 385060]
}

// ICS to WGS84
{
  const [ latitude, longitude ] = converter.ics2wgs84(144140, 885060);
  // output: [29.553036125579155, 34.943337203496604]
}

// WGS84 to ICS
{
  const [ east, north ] = converter.wgs842ics(29.553036125579155, 34.943337203496604);
  // output: [144140, 885060]
}

```

# About

This package is based on the work of Joseph Gray who created the original C++ version and Michael Siton who created the C# version.
