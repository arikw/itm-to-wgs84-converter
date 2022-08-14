//*****************************************************************************************************
//*                                                                                                   *
//*  This code is free software; you can redistribute it and/or modify it at your will.               *
//*  It is our hope however that if you improve it in any way you will find a way to share it too.     *
//*                                                                                                   *
//*  Original C++ version by jgray77@gmail.com	3/2010								                  *
//*  Ported C# version by mikisiton2@gmail.com	5/2012								                  *
//*                                                                                                   *
//*  This program is distributed AS-IS in the hope that it will be useful, but WITHOUT ANY WARRANTY;  *
//*  without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.        * 
//*                                                                                                   *
//*****************************************************************************************************
//
//
//===================================================================================================
//	Israel Local Grids <==> WGS84 conversions
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
//		http://www.uwgb.edu/dutchs/UsefulData/UTMFormulas.htm
//
// The [abridged] Molodensky transformations were taken from
//		http://home.hiwaay.net/~taylorc/bookshelf/math-science/geodesy/datum/transform/molodensky/
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
//			ITM Lat = ICS Lat - 500000
//			ITM Lon = ICS Lon + 50000
//	  e.g. ITM 678000,230000 <--> ICS 1178000 180000
//
//	  Since the formulas for ITM->WGS84 and ICS->WGS84 are different, the results will differ.
//    For the above coordinates we get the following results (WGS84)
//		ITM->WGS84 32.11'43.945" 35.18'58.782"
//		ICS->WGS84 32.11'43.873" 35.18'58.200"
//      Difference    ~3m            ~15m
//
// 2. If you have, or have seen, formulas that contain the term Sin(1"), I recommend you read 
//    Prof.Dutch's enlightening explanation about it in his link above.
//
//===================================================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Coordinates
{
    static class Converters
    {
        public const int eWGS84 = 0;
        public const int eGRS80 = 1;
        public const int eCLARK80M = 2;

        public const int gICS = 0;
        public const int gITM = 1;

        static Converters()
        {
            DatumList = new List<DATUM>();
            GridList = new List<GRID>();
            // WGS84 data
            DatumList.Add(new DATUM(
            6378137.0,				// a
            6356752.3142,			// b
            0.00335281066474748,  	// f = 1/298.257223563
            0.006694380004260807,	// esq
            0.0818191909289062, 	// e
                // deltas to WGS84
            0,
            0,
            0
        ));

            // GRS80 data
            DatumList.Add(new DATUM(
                6378137.0,				// a
                6356752.3141,			// b
                0.0033528106811823,		// f = 1/298.257222101
                0.00669438002290272,	// esq
                0.0818191910428276,		// e
                // deltas to WGS84
                -48,
                55,
                52
            ));

            // Clark 1880 Modified data
            DatumList.Add(new DATUM(
                6378300.789,			// a
                6356566.4116309,		// b
                0.003407549767264,		// f = 1/293.466
                0.006803488139112318,	// esq
                0.08248325975076590,	// e
                // deltas to WGS84
                -235,
                -85,
                264
            ));

            GridList.Add(new GRID(
                // ICS data

                0.6145667421719,			// lon0 = central meridian in radians of 35.12'43.490"
                0.55386447682762762,		// lat0 = central latitude in radians of 31.44'02.749"
                1.00000,					// k0 = scale factor
                170251.555,					// false_easting
                2385259.0					// false_northing
            ));

            // ITM data
            GridList.Add(new GRID(
                0.61443473225468920,		// lon0 = central meridian in radians 35.12'16.261"
                0.55386965463774187,		// lat0 = central latitude in radians 31.44'03.817"
                1.0000067,					// k0 = scale factor
                219529.584,					// false_easting
                2885516.9488				// false_northing = 3512424.3388-626907.390
                // MAPI says the false northing is 626907.390, and in another place
                // that the meridional arc at the central latitude is 3512424.3388
            ));
        }

        public static double pi() { return 3.141592653589793; }
        public static double sin2(double x) { return Math.Sin(x) * Math.Sin(x); }
        public static double cos2(double x) { return Math.Cos(x) * Math.Cos(x); }
        public static double tan2(double x) { return Math.Tan(x) * Math.Tan(x); }
        public static double tan4(double x) { return tan2(x) * tan2(x); }


        public class DATUM
        {
            public double a;	// a  Equatorial earth radius
            public double b;	// b  Polar earth radius
            public double f;	// f= (a-b)/a  Flatenning
            public double esq;	// esq = 1-(b*b)/(a*a)  Eccentricity Squared
            public double e;	// sqrt(esq)  Eccentricity
            // deltas to WGS84
            public double dX;
            public double dY;
            public double dZ;

            public DATUM(double a, double b, double f, double esq, double e, double dx, double dy, double dz)
            {
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

        public class GRID
        {
            public double lon0;
            public double lat0;
            public double k0;
            public double false_e;
            public double false_n;

            public GRID(double lon0, double lat0, double k0, double false_e, double false_n)
            {
                this.lon0 = lon0;
                this.lat0 = lat0;
                this.k0 = k0;
                this.false_n = false_n;
                this.false_e = false_e;
            }
        };

        public static List<DATUM> DatumList;
        public static List<GRID> GridList;





        //=================================================
        // Israel New Grid (ITM) to WGS84 conversion
        //=================================================
        public static void itm2wgs84(int N, int E, out double lat, out double lon)
        {
            // 1. Local Grid (ITM) -> GRS80
            double lat80, lon80;
            Grid2LatLon(N, E, out lat80, out lon80, gITM, eGRS80);

            // 2. Molodensky GRS80->WGS84
            double lat84, lon84;
            Molodensky(lat80, lon80, out lat84, out lon84, eGRS80, eWGS84);

            // final results
            lat = lat84 * 180 / pi();
            lon = lon84 * 180 / pi();
        }

        //=================================================
        // WGS84 to Israel New Grid (ITM) conversion
        //=================================================
        public static void wgs842itm(double lat, double lon, out int N, out int E)
        {
            double latr = lat * pi() / 180;
            double lonr = lon * pi() / 180;

            // 1. Molodensky WGS84 -> GRS80
            double lat80, lon80;
            Molodensky(latr, lonr, out lat80, out lon80, eWGS84, eGRS80);

            // 2. Lat/Lon (GRS80) -> Local Grid (ITM)
            LatLon2Grid(lat80, lon80, out N, out E, eGRS80, gITM);
        }

        //=================================================
        // Israel Old Grid (ICS) to WGS84 conversion
        //=================================================
        public static void ics2wgs84(int N, int E, out double lat, out double lon)
        {
            // 1. Local Grid (ICS) -> Clark_1880_modified
            double lat80, lon80;
            Grid2LatLon(N, E, out lat80, out lon80, gICS, eCLARK80M);

            // 2. Molodensky Clark_1880_modified -> WGS84
            double lat84, lon84;
            Molodensky(lat80, lon80, out lat84, out lon84, eCLARK80M, eWGS84);

            // final results
            lat = lat84 * 180 / pi();
            lon = lon84 * 180 / pi();
        }

        //=================================================
        // WGS84 to Israel Old Grid (ICS) conversion
        //=================================================
        public static void wgs842ics(double lat, double lon, out int N, out int E)
        {
            double latr = lat * pi() / 180;
            double lonr = lon * pi() / 180;

            // 1. Molodensky WGS84 -> Clark_1880_modified
            double lat80, lon80;
            Molodensky(latr, lonr, out lat80, out lon80, eWGS84, eCLARK80M);

            // 2. Lat/Lon (Clark_1880_modified) -> Local Grid (ICS)
            LatLon2Grid(lat80, lon80, out N, out E, eCLARK80M, gICS);
        }

        //====================================
        // Local Grid to Lat/Lon conversion
        //====================================
        public static void Grid2LatLon(int N, int E, out double lat, out double lon, int from, int to)
        {
            //================
            // GRID -> Lat/Lon
            //================

            double y = N + GridList[from].false_n;
            double x = E - GridList[from].false_e;
            double M = y / GridList[from].k0;

            double a = DatumList[to].a;
            double b = DatumList[to].b;
            double e = DatumList[to].e;
            double esq = DatumList[to].esq;

            double mu = M / (a * (1 - e * e / 4 - 3 * Math.Pow(e, 4) / 64 - 5 * Math.Pow(e, 6) / 256));

            double ee = Math.Sqrt(1 - esq);
            double e1 = (1 - ee) / (1 + ee);
            double j1 = 3 * e1 / 2 - 27 * e1 * e1 * e1 / 32;
            double j2 = 21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32;
            double j3 = 151 * e1 * e1 * e1 / 96;
            double j4 = 1097 * e1 * e1 * e1 * e1 / 512;

            // Footprint Latitude
            double fp = mu + j1 * Math.Sin(2 * mu) + j2 * Math.Sin(4 * mu) + j3 * Math.Sin(6 * mu) + j4 * Math.Sin(8 * mu);

            double sinfp = Math.Sin(fp);
            double cosfp = Math.Cos(fp);
            double tanfp = sinfp / cosfp;
            double eg = (e * a / b);
            double eg2 = eg * eg;
            double C1 = eg2 * cosfp * cosfp;
            double T1 = tanfp * tanfp;
            double R1 = a * (1 - e * e) / Math.Pow(1 - (e * sinfp) * (e * sinfp), 1.5);
            double N1 = a / Math.Sqrt(1 - (e * sinfp) * (e * sinfp));
            double D = x / (N1 * GridList[from].k0);

            double Q1 = N1 * tanfp / R1;
            double Q2 = D * D / 2;
            double Q3 = (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eg2 * eg2) * (D * D * D * D) / 24;
            double Q4 = (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 3 * C1 * C1 - 252 * eg2 * eg2) * (D * D * D * D * D * D) / 720;
            // result lat
            lat = fp - Q1 * (Q2 - Q3 + Q4);

            double Q5 = D;
            double Q6 = (1 + 2 * T1 + C1) * (D * D * D) / 6;
            double Q7 = (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eg2 * eg2 + 24 * T1 * T1) * (D * D * D * D * D) / 120;
            // result lon
            lon = GridList[from].lon0 + (Q5 - Q6 + Q7) / cosfp;
        }

        //====================================
        // Lat/Lon to Local Grid conversion
        //====================================
        public static void LatLon2Grid(double lat, double lon, out int N, out int E, int from, int to)
        {
            // Datum data for Lat/Lon to TM conversion
            double a = DatumList[from].a;
            double e = DatumList[from].e; 	// sqrt(esq);
            double b = DatumList[from].b;

            //===============
            // Lat/Lon -> TM
            //===============
            double slat1 = Math.Sin(lat);
            double clat1 = Math.Cos(lat);
            double clat1sq = clat1 * clat1;
            double tanlat1sq = slat1 * slat1 / clat1sq;
            double e2 = e * e;
            double e4 = e2 * e2;
            double e6 = e4 * e2;
            double eg = (e * a / b);
            double eg2 = eg * eg;

            double l1 = 1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256;
            double l2 = 3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024;
            double l3 = 15 * e4 / 256 + 45 * e6 / 1024;
            double l4 = 35 * e6 / 3072;
            double M = a * (l1 * lat - l2 * Math.Sin(2 * lat) + l3 * Math.Sin(4 * lat) - l4 * Math.Sin(6 * lat));
            //double rho = a*(1-e2) / pow((1-(e*slat1)*(e*slat1)),1.5);
            double nu = a / Math.Sqrt(1 - (e * slat1) * (e * slat1));
            double p = lon - GridList[to].lon0;
            double k0 = GridList[to].k0;
            // y = northing = K1 + K2p2 + K3p4, where
            double K1 = M * k0;
            double K2 = k0 * nu * slat1 * clat1 / 2;
            double K3 = (k0 * nu * slat1 * clat1 * clat1sq / 24) * (5 - tanlat1sq + 9 * eg2 * clat1sq + 4 * eg2 * eg2 * clat1sq * clat1sq);
            // ING north
            double Y = K1 + K2 * p * p + K3 * p * p * p * p - GridList[to].false_n;

            // x = easting = K4p + K5p3, where
            double K4 = k0 * nu * clat1;
            double K5 = (k0 * nu * clat1 * clat1sq / 6) * (1 - tanlat1sq + eg2 * clat1 * clat1);
            // ING east
            double X = K4 * p + K5 * p * p * p + GridList[to].false_e;

            // final rounded results
            E = (int)(X + 0.5);
            N = (int)(Y + 0.5);
        }

        //======================================================
        // Abridged Molodensky transformation between 2 datums
        //======================================================
        public static void Molodensky(double ilat, double ilon, out double olat, out double olon, int from, int to)
        {
            // from->WGS84 - to->WGS84 = from->WGS84 + WGS84->to = from->to
            double dX = DatumList[from].dX - DatumList[to].dX;
            double dY = DatumList[from].dY - DatumList[to].dY;
            double dZ = DatumList[from].dZ - DatumList[to].dZ;

            double slat = Math.Sin(ilat);
            double clat = Math.Cos(ilat);
            double slon = Math.Sin(ilon);
            double clon = Math.Cos(ilon);
            double ssqlat = slat * slat;

            //dlat = ((-dx * slat * clon - dy * slat * slon + dz * clat)
            //        + (da * rn * from_esq * slat * clat / from_a)
            //        + (df * (rm * adb + rn / adb )* slat * clat))
            //       / (rm + from.h); 

            double from_f = DatumList[from].f;
            double df = DatumList[to].f - from_f;
            double from_a = DatumList[from].a;
            double da = DatumList[to].a - from_a;
            double from_esq = DatumList[from].esq;
            double adb = 1.0 / (1.0 - from_f);
            double rn = from_a / Math.Sqrt(1 - from_esq * ssqlat);
            double rm = from_a * (1 - from_esq) / Math.Pow((1 - from_esq * ssqlat), 1.5);
            double from_h = 0.0; // we're flat!

            double dlat = (-dX * slat * clon - dY * slat * slon + dZ * clat
                           + da * rn * from_esq * slat * clat / from_a +
                           +df * (rm * adb + rn / adb) * slat * clat) / (rm + from_h);

            // result lat (radians)
            olat = ilat + dlat;

            // dlon = (-dx * slon + dy * clon) / ((rn + from.h) * clat);
            double dlon = (-dX * slon + dY * clon) / ((rn + from_h) * clat);
            // result lon (radians)
            olon = ilon + dlon;
        }

    }
}
