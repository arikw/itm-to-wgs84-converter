//===================================================================================================
//  Israel Local Grids <==> WGS84 conversions
//===================================================================================================
//
// The Israel New Grid (ITM) is a Transverse Mercator projection of the GRS80 ellipsoid.
// The Israel Old Grid (ICS) is a Cassini-Soldner projection of the modified Clark 1880 ellipsoid.
//
// To convert from a local grid to WGS84 you first do a "UTM to Lat/Lon" conversion using the
// known formulas but with the local grid data (Central Meridian, Scale Factor and False
// Easting and Northing). This results in Lat/Long in the local ellipsoid coordinate system.
// Afterwards you do a Molodensky transformation from this ellipsoid to WGS84.
//
// To convert from WGS84 to a local grid you first do a Molodensky transformation from WGS84
// to the local ellipsoid, after which you do a Lat/Lon to UTM conversion, again with the data of
// the local grid instead of the UTM data.
//
// The UTM to Lat/Lon and Lat/Lon to UTM conversion formulas were taken as-is from the
// excellent article by Prof.Steven Dutch of the University of Wisconsin at Green Bay:
//    http://www.uwgb.edu/dutchs/UsefulData/UTMFormulas.htm
//
// The [abridged] Molodensky transformations were taken from
//    http://home.hiwaay.net/~taylorc/bookshelf/math-science/geodesy/datum/transform/molodensky/
// and can be found in many sources on the net.
//
// Additional sources:
// ===================
// 1. dX,dY,dZ values:  http://www.geo.hunter.cuny.edu/gis/docs/geographic_transformations.pdf
//
// 2. ITM data:  http://www.mapi.gov.il/geodesy/itm_ftp.txt
//    for the meridional arc false northing, the value is given at
//    http://www.mapi.gov.il/reg_inst/dir2b.doc
//    (this doc also gives a different formula for Lat/lon -> ITM, but not the reverse)
//
// 3. ICS data:  http://www.mapi.gov.il/geodesy/ics_ftp.txt
//    for the meridional arc false northing, the value is given at several places as the
//    correction value for Garmin GPS sets, the origin is unknown.
//    e.g. http://www.idobartana.com/etrexkb/etrexisr.htm
//
// Notes:
// ======
// 1. The conversions between ICS and ITM are
//      ITM Lat = ICS Lat - 500000
//      ITM Lon = ICS Lon + 50000
//    e.g. ITM 678000,230000 <--> ICS 1178000 180000
//
//    Since the formulas for ITM->WGS84 and ICS->WGS84 are different, the results will differ.
//    For the above coordinates we get the following results (WGS84)
//    ITM->WGS84 32.11'43.945" 35.18'58.782"
//    ICS->WGS84 32.11'43.873" 35.18'58.200"
//      Difference    ~3m            ~15m
//
// 2. If you have, or have seen, formulas that contain the term Sin(1"), I recommend you read
//    Prof.Dutch's enlightening explanation about it in his link above.
//
//===================================================================================================

class DATUM {
  a;    // a  Equatorial earth radius
  b;    // b  Polar earth radius
  f;    // f= (a-b)/a  Flatenning
  esq;  // esq = 1-(b*b)/(a*a)  Eccentricity Squared
  e;    // sqrt(esq)  Eccentricity

  // deltas to WGS84
  dX;
  dY;
  dZ;

  constructor(a, b, f, esq, e, dx, dy, dz) {
    this.a = a;
    this.b = b;
    this.f = f;
    this.esq = esq;
    this.e = e;
    this.dX = dx;
    this.dY = dy;
    this.dZ = dz;
  }
}

class GRID {
  lon0;
  lat0;
  k0;
  false_e;
  false_n;

  constructor(lon0, lat0, k0, false_e, false_n) {
    this.lon0 = lon0;
    this.lat0 = lat0;
    this.k0 = k0;
    this.false_n = false_n;
    this.false_e = false_e;
  }
}

class Converters {

  static eWGS84 = 0;
  static eGRS80 = 1;
  static eCLARK80M = 2;
  static gICS = 0;
  static gITM = 1;

  static DatumList = [

    // WGS84 data
    new DATUM(
      6378137.0,              // a
      6356752.3142,           // b
      0.00335281066474748,    // f = 1/298.257223563
      0.006694380004260807,   // esq
      0.0818191909289062,     // e
      // deltas to WGS84
      0,
      0,
      0
    ),

    // GRS80 data
    new DATUM(
      6378137.0,             // a
      6356752.3141,          // b
      0.0033528106811823,    // f = 1/298.257222101
      0.00669438002290272,   // esq
      0.0818191910428276,    // e
      // deltas to WGS84
      -48,
      55,
      52
    ),

    // Clark 1880 Modified data
    new DATUM(
      6378300.789,           // a
      6356566.4116309,       // b
      0.003407549767264,     // f = 1/293.466
      0.006803488139112318,  // esq
      0.08248325975076590,   // e
      // deltas to WGS84
      -235,
      -85,
      264
    )
  ];
  static GridList = [
    new GRID(
      // ICS data
      0.6145667421719,      // lon0 = central meridian in radians of 35.12'43.490"
      0.5538644768276276,   // lat0 = central latitude in radians of 31.44'02.749"
      1.00000,              // k0 = scale factor
      170251.555,           // false_easting
      2385259.0             // false_northing
    ),

    // ITM data
    new GRID(
      0.614434732254689,    // lon0 = central meridian in radians 35.12'16.261"
      0.5538696546377418,   // lat0 = central latitude in radians 31.44'03.817"
      1.0000067,            // k0 = scale factor
      219529.584,           // false_easting
      2885516.9488          // false_northing = 3512424.3388-626907.390
      // MAPI says the false northing is 626907.390, and in another place
      // that the meridional arc at the central latitude is 3512424.3388
    )
  ];

  static #sin2(x) { return Math.sin(x) * Math.sin(x); }
  static #cos2(x) { return Math.cos(x) * Math.cos(x); }
  static #tan2(x) { return Math.tan(x) * Math.tan(x); }
  static #tan4(x) { return Converters.tan2(x) * Converters.tan2(x); }

  //=================================================
  // Israel New Grid (ITM) to WGS84 conversion
  //=================================================
  static itm2wgs84(E, N) {

    // 1. Local Grid (ITM) -> GRS80
    const [lat80, lon80] = Converters.Grid2LatLon(N, E, Converters.gITM, Converters.eGRS80);

    // 2. Molodensky GRS80->WGS84
    const [lat84, lon84] = Converters.Molodensky(lat80, lon80, Converters.eGRS80, Converters.eWGS84);

    // final results
    const lat = Math.round((lat84 * 180 / Math.PI) * 1e7) / 1e7;
    const lon = Math.round((lon84 * 180 / Math.PI) * 1e7) / 1e7;

    return [lat, lon];
  }

  //=================================================
  // WGS84 to Israel New Grid (ITM) conversion
  //=================================================
  static wgs842itm(lat, lon) {
    const latr = lat * Math.PI / 180;
    const lonr = lon * Math.PI / 180;

    // 1. Molodensky WGS84 -> GRS80
    const [lat80, lon80] = Converters.Molodensky(latr, lonr, Converters.eWGS84, Converters.eGRS80);

    // 2. Lat/Lon (GRS80) -> Local Grid (ITM)
    return Converters.LatLon2Grid(lat80, lon80, Converters.eGRS80, Converters.gITM);
  }

  //=================================================
  // Israel Old Grid (ICS) to WGS84 conversion
  //=================================================
  static ics2wgs84(E, N) {
    // 1. Local Grid (ICS) -> Clark_1880_modified
    const [lat80, lon80] = Converters.Grid2LatLon(N, E, Converters.gICS, Converters.eCLARK80M);

    // 2. Molodensky Clark_1880_modified -> WGS84
    const [lat84, lon84] = Converters.Molodensky(lat80, lon80, Converters.eCLARK80M, Converters.eWGS84);

    // final results
    const lat = Math.round((lat84 * 180 / Math.PI) * 1e7) / 1e7;
    const lon = Math.round((lon84 * 180 / Math.PI) * 1e7) / 1e7;

    return [lat, lon];
  }

  //=================================================
  // WGS84 to Israel Old Grid (ICS) conversion
  //=================================================
  static wgs842ics(lat, lon) {
    const latr = lat * Math.PI / 180;
    const lonr = lon * Math.PI / 180;

    // 1. Molodensky WGS84 -> Clark_1880_modified
    const [lat80, lon80] = Converters.Molodensky(latr, lonr, Converters.eWGS84, Converters.eCLARK80M);

    // 2. Lat/Lon (Clark_1880_modified) -> Local Grid (ICS)
    return Converters.LatLon2Grid(lat80, lon80, Converters.eCLARK80M, Converters.gICS);
  }

  //====================================
  // Local Grid to Lat/Lon conversion
  //====================================
  static Grid2LatLon(N, E, from, to) {
    //================
    // GRID -> Lat/Lon
    //================

    const y = N + Converters.GridList[from].false_n;
    const x = E - Converters.GridList[from].false_e;
    const M = y / Converters.GridList[from].k0;

    const a = Converters.DatumList[to].a;
    const b = Converters.DatumList[to].b;
    const e = Converters.DatumList[to].e;
    const esq = Converters.DatumList[to].esq;

    const mu = M / (a * (1 - e * e / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));

    const ee = Math.sqrt(1 - esq);
    const e1 = (1 - ee) / (1 + ee);
    const j1 = 3 * e1 / 2 - 27 * e1 * e1 * e1 / 32;
    const j2 = 21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32;
    const j3 = 151 * e1 * e1 * e1 / 96;
    const j4 = 1097 * e1 * e1 * e1 * e1 / 512;

    // Footprint Latitude
    const fp = mu + j1 * Math.sin(2 * mu) + j2 * Math.sin(4 * mu) + j3 * Math.sin(6 * mu) + j4 * Math.sin(8 * mu);

    const sinfp = Math.sin(fp);
    const cosfp = Math.cos(fp);
    const tanfp = sinfp / cosfp;
    const eg = (e * a / b);
    const eg2 = eg * eg;
    const C1 = eg2 * cosfp * cosfp;
    const T1 = tanfp * tanfp;
    const R1 = a * (1 - e * e) / Math.pow(1 - (e * sinfp) * (e * sinfp), 1.5);
    const N1 = a / Math.sqrt(1 - (e * sinfp) * (e * sinfp));
    const D = x / (N1 * Converters.GridList[from].k0);

    const Q1 = N1 * tanfp / R1;
    const Q2 = D * D / 2;
    const Q3 = (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eg2 * eg2) * (D * D * D * D) / 24;
    const Q4 = (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 3 * C1 * C1 - 252 * eg2 * eg2) * (D * D * D * D * D * D) / 720;

    // result lat
    const lat = fp - Q1 * (Q2 - Q3 + Q4);

    const Q5 = D;
    const Q6 = (1 + 2 * T1 + C1) * (D * D * D) / 6;
    const Q7 = (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eg2 * eg2 + 24 * T1 * T1) * (D * D * D * D * D) / 120;

    // result lon
    const lon = Converters.GridList[from].lon0 + (Q5 - Q6 + Q7) / cosfp;

    return [lat, lon];
  }

  //====================================
  // Lat/Lon to Local Grid conversion
  //====================================
  static LatLon2Grid(lat, lon, from, to) {

    // Datum data for Lat/Lon to TM conversion
    const a = Converters.DatumList[from].a;
    const e = Converters.DatumList[from].e;   // sqrt(esq);
    const b = Converters.DatumList[from].b;

    //===============
    // Lat/Lon -> TM
    //===============
    const slat1 = Math.sin(lat);
    const clat1 = Math.cos(lat);
    const clat1sq = clat1 * clat1;
    const tanlat1sq = slat1 * slat1 / clat1sq;
    const e2 = e * e;
    const e4 = e2 * e2;
    const e6 = e4 * e2;
    const eg = (e * a / b);
    const eg2 = eg * eg;

    const l1 = 1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256;
    const l2 = 3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024;
    const l3 = 15 * e4 / 256 + 45 * e6 / 1024;
    const l4 = 35 * e6 / 3072;
    const M = a * (l1 * lat - l2 * Math.sin(2 * lat) + l3 * Math.sin(4 * lat) - l4 * Math.sin(6 * lat));
    //let rho = a*(1-e2) / pow((1-(e*slat1)*(e*slat1)),1.5);
    const nu = a / Math.sqrt(1 - (e * slat1) * (e * slat1));
    const p = lon - Converters.GridList[to].lon0;
    const k0 = Converters.GridList[to].k0;
    // y = northing = K1 + K2p2 + K3p4, where
    const K1 = M * k0;
    const K2 = k0 * nu * slat1 * clat1 / 2;
    const K3 = (k0 * nu * slat1 * clat1 * clat1sq / 24) * (5 - tanlat1sq + 9 * eg2 * clat1sq + 4 * eg2 * eg2 * clat1sq * clat1sq);
    // ING north
    const Y = K1 + K2 * p * p + K3 * p * p * p * p - Converters.GridList[to].false_n;

    // x = easting = K4p + K5p3, where
    const K4 = k0 * nu * clat1;
    const K5 = (k0 * nu * clat1 * clat1sq / 6) * (1 - tanlat1sq + eg2 * clat1 * clat1);
    // ING east
    const X = K4 * p + K5 * p * p * p + Converters.GridList[to].false_e;

    // final rounded results
    const E = (parseInt)(X + 0.5);
    const N = (parseInt)(Y + 0.5);

    return [E, N];
  }

  //======================================================
  // Abridged Molodensky transformation between 2 datums
  //======================================================
  static Molodensky(ilat, ilon, from, to) {

    // from->WGS84 - to->WGS84 = from->WGS84 + WGS84->to = from->to
    const dX = Converters.DatumList[from].dX - Converters.DatumList[to].dX;
    const dY = Converters.DatumList[from].dY - Converters.DatumList[to].dY;
    const dZ = Converters.DatumList[from].dZ - Converters.DatumList[to].dZ;

    const slat = Math.sin(ilat);
    const clat = Math.cos(ilat);
    const slon = Math.sin(ilon);
    const clon = Math.cos(ilon);
    const ssqlat = slat * slat;

    //dlat = ((-dx * slat * clon - dy * slat * slon + dz * clat)
    //        + (da * rn * from_esq * slat * clat / from_a)
    //        + (df * (rm * adb + rn / adb )* slat * clat))
    //       / (rm + from.h);

    const from_f = Converters.DatumList[from].f;
    const df = Converters.DatumList[to].f - from_f;
    const from_a = Converters.DatumList[from].a;
    const da = Converters.DatumList[to].a - from_a;
    const from_esq = Converters.DatumList[from].esq;
    const adb = 1.0 / (1.0 - from_f);
    const rn = from_a / Math.sqrt(1 - from_esq * ssqlat);
    const rm = from_a * (1 - from_esq) / Math.pow((1 - from_esq * ssqlat), 1.5);
    const from_h = 0.0; // we're flat!

    const dlat = (-dX * slat * clon - dY * slat * slon + dZ * clat +
                      da * rn * from_esq * slat * clat / from_a +
                      +df * (rm * adb + rn / adb) * slat * clat) / (rm + from_h);

    // result lat (radians)
    const olat = ilat + dlat;

    // dlon = (-dx * slon + dy * clon) / ((rn + from.h) * clat);
    const dlon = (-dX * slon + dY * clon) / ((rn + from_h) * clat);
    // result lon (radians)
    const olon = ilon + dlon;

    return [ olat, olon ];
  }

}

const lib = {
  itm2wgs84: Converters.itm2wgs84,
  wgs842itm: Converters.wgs842itm,
  ics2wgs84: Converters.ics2wgs84,
  wgs842ics: Converters.wgs842ics
};

if (typeof window === 'object') {
  window.ItmToWgs84Converter = lib;
} else if (typeof module === 'object' && module.exports) {
  module.exports = lib;
}
