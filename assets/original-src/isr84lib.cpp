//*****************************************************************************************************
//*                                                                                                   *
//*  This code is free software; you can redistribute it and/or modify it at your will.               *
//*  It is my hope however that if you improve it in any way you will find a way to share it too.     *
//*                                                                                                   *
//*  If you have any comments, questions, suggestions etc. mail me (jgray77@gmail.com)                *
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
#include <stdio.h>
#include <math.h>

double pi() { return 3.141592653589793; }
double sin2(double x) { return sin(x)*sin(x); }
double cos2(double x) { return cos(x)*cos(x); }
double tan2(double x) { return tan(x)*tan(x); }
double tan4(double x) { return tan2(x)*tan2(x); }

static enum eDatum {
	eWGS84=0,
	eGRS80=1,
	eCLARK80M=2
};

typedef struct _DTM {
	double a;	// a  Equatorial earth radius
	double b;	// b  Polar earth radius
	double f;	// f= (a-b)/a  Flatenning
	double esq;	// esq = 1-(b*b)/(a*a)  Eccentricity Squared
	double e;	// sqrt(esq)  Eccentricity
	// deltas to WGS84
	double dX;
	double dY;
	double dZ;
} DATUM,*PDATUM;

static DATUM Datum[3] = {

	// WGS84 data
	{
		6378137.0,				// a
		6356752.3142,			// b
		0.00335281066474748,  	// f = 1/298.257223563
		0.006694380004260807,	// esq
		0.0818191909289062, 	// e
		// deltas to WGS84
		0,
		0,
		0
	},

	// GRS80 data
	{
		6378137.0,				// a
		6356752.3141,			// b
		0.0033528106811823,		// f = 1/298.257222101
		0.00669438002290272,	// esq
		0.0818191910428276,		// e
		// deltas to WGS84
		-48,
		55,
		52
	},

	// Clark 1880 Modified data
	{
		6378300.789,			// a
		6356566.4116309,		// b
		0.003407549767264,		// f = 1/293.466
		0.006803488139112318,	// esq
		0.08248325975076590,	// e
		// deltas to WGS84
		-235,
		-85,
		264
	}
};

static enum gGrid {
	gICS=0,
	gITM=1
};

typedef struct _GRD {
	double lon0;
	double lat0; 
	double k0;
	double false_e;
	double false_n;
} GRID,*PGRID;
	
static GRID Grid[2] = {

	// ICS data
	{
		0.6145667421719,			// lon0 = central meridian in radians of 35.12'43.490"
		0.55386447682762762,		// lat0 = central latitude in radians of 31.44'02.749"
		1.00000,					// k0 = scale factor
		170251.555,					// false_easting
		2385259.0					// false_northing
	},

	// ITM data
	{
		0.61443473225468920,		// lon0 = central meridian in radians 35.12'16.261"
		0.55386965463774187,		// lat0 = central latitude in radians 31.44'03.817"
		1.0000067,					// k0 = scale factor
		219529.584,					// false_easting
		2885516.9488				// false_northing = 3512424.3388-626907.390
									// MAPI says the false northing is 626907.390, and in another place
									// that the meridional arc at the central latitude is 3512424.3388
	}
};

// prototypes of local Grid <=> Lat/Lon conversions
void Grid2LatLon(int N,int E,double& lat,double& lon,gGrid from,eDatum to);
void LatLon2Grid(double lat,double lon,int& N,int& E,eDatum from,gGrid to);
// prototype of Moldensky transformation function
void Molodensky(double ilat,double ilon,double& olat,double& olon,eDatum from,eDatum to);

//=================================================
// Israel New Grid (ITM) to WGS84 conversion
//=================================================
void itm2wgs84(int N,int E,double& lat,double &lon)
{
	// 1. Local Grid (ITM) -> GRS80
	double lat80,lon80;
	Grid2LatLon(N,E,lat80,lon80,gITM,eGRS80);

	// 2. Molodensky GRS80->WGS84
	double lat84,lon84;
	Molodensky(lat80,lon80,lat84,lon84,eGRS80,eWGS84);

	// final results
	lat = lat84*180/pi();
	lon = lon84*180/pi();
}

//=================================================
// WGS84 to Israel New Grid (ITM) conversion
//=================================================
void wgs842itm(double lat,double lon,int& N,int& E)
{
	double latr = lat*pi()/180;
	double lonr = lon*pi()/180;

	// 1. Molodensky WGS84 -> GRS80
	double lat80,lon80;
	Molodensky(latr,lonr,lat80,lon80,eWGS84,eGRS80);

	// 2. Lat/Lon (GRS80) -> Local Grid (ITM)
	LatLon2Grid(lat80,lon80,N,E,eGRS80,gITM);
}

//=================================================
// Israel Old Grid (ICS) to WGS84 conversion
//=================================================
void ics2wgs84(int N,int E,double& lat,double &lon)
{
	// 1. Local Grid (ICS) -> Clark_1880_modified
	double lat80,lon80;
	Grid2LatLon(N,E,lat80,lon80,gICS,eCLARK80M);

	// 2. Molodensky Clark_1880_modified -> WGS84
	double lat84,lon84;
	Molodensky(lat80,lon80,lat84,lon84,eCLARK80M,eWGS84);

	// final results
	lat = lat84*180/pi();
	lon = lon84*180/pi();
}

//=================================================
// WGS84 to Israel Old Grid (ICS) conversion
//=================================================
void wgs842ics(double lat,double lon,int& N,int& E)
{
	double latr = lat*pi()/180;
	double lonr = lon*pi()/180;

	// 1. Molodensky WGS84 -> Clark_1880_modified
	double lat80,lon80;
	Molodensky(latr,lonr,lat80,lon80,eWGS84,eCLARK80M);

	// 2. Lat/Lon (Clark_1880_modified) -> Local Grid (ICS)
	LatLon2Grid(lat80,lon80,N,E,eCLARK80M,gICS);
}

//====================================
// Local Grid to Lat/Lon conversion
//====================================
void Grid2LatLon(int N,int E,double& lat,double& lon,gGrid from,eDatum to)
{
	//================
	// GRID -> Lat/Lon
	//================

	double y = N + Grid[from].false_n;
	double x = E - Grid[from].false_e;
	double M = y / Grid[from].k0;

	double a = Datum[to].a;
	double b = Datum[to].b;
	double e = Datum[to].e;
	double esq = Datum[to].esq;

	double mu = M / (a*(1 - e*e/4 - 3*pow(e,4)/64 - 5*pow(e,6)/256));
	
	double ee = sqrt(1-esq);
	double e1 = (1-ee)/(1+ee);
	double j1 = 3*e1/2 - 27*e1*e1*e1/32;
	double j2 = 21*e1*e1/16 - 55*e1*e1*e1*e1/32;
	double j3 = 151*e1*e1*e1/96;
	double j4 = 1097*e1*e1*e1*e1/512;

	// Footprint Latitude
	double fp =  mu + j1*sin(2*mu) + j2*sin(4*mu) + j3*sin(6*mu) + j4*sin(8*mu); 

	double sinfp = sin(fp);
	double cosfp = cos(fp);
	double tanfp = sinfp/cosfp;
	double eg = (e*a/b);
	double eg2 = eg*eg;
	double C1 = eg2*cosfp*cosfp;
	double T1 = tanfp*tanfp;
	double R1 = a*(1-e*e) / pow(1-(e*sinfp)*(e*sinfp),1.5);
	double N1 = a / sqrt(1-(e*sinfp)*(e*sinfp));
	double D = x / (N1*Grid[from].k0);

	double Q1 = N1*tanfp/R1;
	double Q2 = D*D/2;
	double Q3 = (5 + 3*T1 + 10*C1 - 4*C1*C1 - 9*eg2*eg2)*(D*D*D*D)/24;
	double Q4 = (61 + 90*T1 + 298*C1 + 45*T1*T1 - 3*C1*C1 - 252*eg2*eg2)*(D*D*D*D*D*D)/720;
	// result lat
	lat = fp - Q1*(Q2-Q3+Q4);

	double Q5 = D;
	double Q6 = (1 + 2*T1 + C1)*(D*D*D)/6;
	double Q7 = (5 - 2*C1 + 28*T1 - 3*C1*C1 + 8*eg2*eg2 + 24*T1*T1)*(D*D*D*D*D)/120;
	// result lon
	lon = Grid[from].lon0 + (Q5 - Q6 + Q7)/cosfp;
}

//====================================
// Lat/Lon to Local Grid conversion
//====================================
void LatLon2Grid(double lat,double lon,int& N,int& E,eDatum from,gGrid to)
{
	// Datum data for Lat/Lon to TM conversion
	double a = Datum[from].a;
	double e = Datum[from].e; 	// sqrt(esq);
	double b = Datum[from].b;

	//===============
	// Lat/Lon -> TM
	//===============
	double slat1 = sin(lat);
	double clat1 = cos(lat);
	double clat1sq = clat1*clat1;
	double tanlat1sq = slat1*slat1 / clat1sq;
	double e2 = e*e;
	double e4 = e2*e2;
	double e6 = e4*e2;
	double eg = (e*a/b);
	double eg2 = eg*eg;

	double l1 = 1 - e2/4 - 3*e4/64 - 5*e6/256;
	double l2 = 3*e2/8 + 3*e4/32 + 45*e6/1024;
	double l3 = 15*e4/256 + 45*e6/1024;
	double l4 = 35*e6/3072;
	double M = a*(l1*lat - l2*sin(2*lat) + l3*sin(4*lat) - l4*sin(6*lat));
	//double rho = a*(1-e2) / pow((1-(e*slat1)*(e*slat1)),1.5);
	double nu = a / sqrt(1-(e*slat1)*(e*slat1));
	double p = lon - Grid[to].lon0;
	double k0 = Grid[to].k0;
	// y = northing = K1 + K2p2 + K3p4, where
	double K1 = M*k0; 
	double K2 = k0*nu*slat1*clat1/2; 
	double K3 = (k0*nu*slat1*clat1*clat1sq/24)*(5 - tanlat1sq + 9*eg2*clat1sq + 4*eg2*eg2*clat1sq*clat1sq);
	// ING north
	double Y = K1 + K2*p*p + K3*p*p*p*p - Grid[to].false_n;
 
	// x = easting = K4p + K5p3, where
	double K4 = k0*nu*clat1; 
	double K5 = (k0*nu*clat1*clat1sq/6)*(1 - tanlat1sq + eg2*clat1*clat1); 
	// ING east
	double X = K4*p + K5*p*p*p + Grid[to].false_e;

	// final rounded results
	E = (int)(X+0.5);
	N = (int)(Y+0.5);
}

//======================================================
// Abridged Molodensky transformation between 2 datums
//======================================================
static void Molodensky(double ilat,double ilon,double& olat,double& olon,eDatum from,eDatum to)
{
	// from->WGS84 - to->WGS84 = from->WGS84 + WGS84->to = from->to
	double dX = Datum[from].dX - Datum[to].dX;
	double dY = Datum[from].dY - Datum[to].dY;
	double dZ = Datum[from].dZ - Datum[to].dZ;

	double slat = sin(ilat);
	double clat = cos(ilat);
	double slon = sin(ilon);
	double clon = cos(ilon);
	double ssqlat = slat*slat;

	//dlat = ((-dx * slat * clon - dy * slat * slon + dz * clat)
	//        + (da * rn * from_esq * slat * clat / from_a)
	//        + (df * (rm * adb + rn / adb )* slat * clat))
	//       / (rm + from.h); 

	double from_f = Datum[from].f;
	double df = Datum[to].f - from_f;
	double from_a = Datum[from].a;
	double da = Datum[to].a - from_a;
	double from_esq = Datum[from].esq;
	double adb = 1.0 / (1.0 - from_f);
	double rn = from_a / sqrt(1 - from_esq * ssqlat);
	double rm = from_a * (1 - from_esq) / pow((1 - from_esq * ssqlat),1.5);
	double from_h = 0.0; // we're flat!

	double dlat = (-dX*slat*clon - dY*slat*slon + dZ*clat
				   + da*rn*from_esq*slat*clat/from_a +
				   + df*(rm*adb + rn/adb)*slat*clat) / (rm+from_h);

	// result lat (radians)
	olat = ilat+dlat;

	// dlon = (-dx * slon + dy * clon) / ((rn + from.h) * clat);
	double dlon = (-dX*slon + dY*clon) / ((rn+from_h)*clat);
	// result lon (radians)
	olon = ilon+dlon;
}
