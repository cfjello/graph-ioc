import { TablesDefType, ColumnDefType } from "./interfaces.ts"
export let dataTables   = new Map<string,string>()
export let textTables   = new Map<string,TablesDefType>()
export let textInserts  = new Map<string,string>()

textTables.set( 'Station_list' ,{
    file: 'ghcnd-stations.txt',
    txt: 
       `ID            1-11   VARCHAR
        COUNTRY       1-2    VARCHAR
        NETC          3-3    VARCHAR
        STID          4-11   VARCHAR
        LATITUDE     13-20   REAL
        LONGITUDE    22-30   REAL
        ELEVATION    32-37   REAL
        STATE        39-40   VARCHAR
        NAME         42-71   VARCHAR
        GSN_FLAG     73-75   VARCHAR
        HCN_CRN_FLAG 77-79   VARCHAR
        WMO_ID       81-85   VARCHAR`,
    cols:    new Map<string,ColumnDefType>()
})


textTables.set( 'Countries', {
    file: 'ghcnd-countries.txt',
    txt: 
       `ID           1-2    VARCHAR
        NAME         4-50    VARCHAR`,
    cols:    new Map<string,ColumnDefType>()
})

textTables.set( 'States',  {
    file: 'ghcnd-states.txt',
    txt: 
       `ID           1-2    VARCHAR
        NAME         4-50    VARCHAR`,
    cols:    new Map<string,ColumnDefType>()
})

textTables.set( 'Inventory', {
    file: 'ghcnd-inventory.txt',
    txt: 
       `ID            1-11   VARCHAR
        LATITUDE     13-20   REAL
        LONGITUDE    22-30   REAL
        ELEMENT      32-35   VARCHAR
        FIRSTYEAR    37-40   SMALLINT
        LASTYEAR     42-45   SMALLINT`,
    cols:    new Map<string,ColumnDefType>()
})

// export let ghcnDatabase = `CREATE DATABASE ghcnDB OWNER ghcn`
dataTables.set( 'GHCN_CODES', `CREATE TABLE IF NOT EXISTS GHCN_CODES (
    CODE VARCHAR(4) PRIMARY KEY,
    DESCRIPTION VARCHAR(256)
)`
)

textInserts.set( 'GHCN_CODES', `INSERT INTO GHCN_CODES ( CODE, DESCRIPTION ) 
VALUES 
('FIPS',  'Country code 2 characters'),
('NETC',  'Third character in the Station ID is a network code that identifies the station'),
('TMIN', 'Minimum temperature (tenths of degrees C)'),
('MDTN', 'Multiday minimum temperature (tenths of degrees C; use with DATN)'),
('DATN', 'Number of days included in the multiday minimum temperature (MDTN)'),
('TMAX', 'Maximum temperature (tenths of degrees C)'),
('MDTX', 'Multiday maximum temperature (tenths of degress C; use with DATX)'),
('DATX', 'Number of days included in the multiday maximum temperature (MDTX)'),
('TOBS', 'Temperature at the time of observation (tenths of degrees C)'),
('PSUN', 'Daily percent of possible sunshine (percent)'),
('SNOW', 'Snowfall (mm)'),
('SNWD', 'Snow depth (mm)'),
('MDSF', 'Multiday snowfall total'),
('DASF', 'Number of days included in the multiday snowfall total (MDSF)'),
('WESD', 'Water equivalent of snow on the ground (tenths of mm)'),
('WESF', 'Water equivalent of snowfall (tenths of mm)'),
('THIC', 'Thickness of ice on water (tenths of mm)'),
('ACMC', 'Average cloudiness midnight to midnight from 30-second ceilometer data (percent)'),
('ACMH', 'Average cloudiness midnight to midnight from manual observations (percent)'),
('ACSC', 'Average cloudiness sunrise to sunset from 30-second ceilometer data (percent)'),
('ACSH', 'Average cloudiness sunrise to sunset from manual observations (percent)'),
('AWDR', 'Average daily wind direction (degrees)'),
('AWND', 'Average daily wind speed (tenths of meters per second)'),
('PGTM', 'Peak gust time (hours and minutes, i.e., HHMM)'),
('FMTM', 'Time of fastest mile or fastest 1-minute wind (hours and minutes, i.e., HHMM)'),
('WDF1', 'Direction of fastest 1-minute wind (degrees)'),
('WDF2', 'Direction of fastest 2-minute wind (degrees)'),
('WDF5', 'Direction of fastest 5-second wind (degrees)'),
('WDFG', 'Direction of peak wind gust (degrees)'),
('WDFI', 'Direction of highest instantaneous wind (degrees)'),
('WDFM', 'Fastest mile wind direction (degrees)'),
('WDMV', '24-hour wind movement (km)'),
('WSF1', 'Fastest 1-minute wind speed (tenths of meters per second)'),
('WSF2', 'Fastest 2-minute wind speed (tenths of meters per second)'),
('WSF5', 'Fastest 5-second wind speed (tenths of meters per second)'),
('WSFG', 'Peak gust wind speed (tenths of meters per second)'),
('WSFI', 'Highest instantaneous wind speed (tenths of meters per second)'),
('WSFM', 'Fastest mile wind speed (tenths of meters per second)'),
('MDWM', 'Multiday wind movement (km)'),
('DAWM', 'Number of days included in the multiday wind movement (MDWM)'),
('MDEV', 'Multiday evaporation total (tenths of mm; use with DAEV)'),
('DAEV', 'Number of days included in the multiday evaporation total (MDEV)'),
('EVAP', 'Evaporation of water from evaporation pan (tenths of mm)'),
('MNPN', 'Daily minimum temperature of water in an evaporation pan (tenths of degrees C)'),
('MXPN', 'Daily maximum temperature of water in an evaporation pan (tenths of degrees C)'),
('PRCP', 'Precipitation (tenths of mm)'),
('MDPR', 'Multiday precipitation total (tenths of mm; use with DAPR and DWPR, if available)'),
('DAPR', 'Number of days included in the multiday precipiation total (MDPR)'),
('DWPR', 'Number of days with non-zero precipitation included in multiday precipitation total (MDPR)'),
('FRGB', 'Base of frozen ground layer (cm)'),
('FRGT', 'Top of frozen ground layer (cm)'),
('FRTH', 'Thickness of frozen ground layer (cm)'),
('GAHT', 'Difference between river and gauge height (cm)'),
 ('SN01', 'Minimum soil temperature (tenths of degrees C), unknown ground cover, 5 cm'),
 ('SN02', 'Minimum soil temperature (tenths of degrees C), unknown ground cover, 10 cm'),
 ('SN03', 'Minimum soil temperature (tenths of degrees C), unknown ground cover, 20 cm'),
 ('SN04', 'Minimum soil temperature (tenths of degrees C), unknown ground cover, 50 cm'),
 ('SN05', 'Minimum soil temperature (tenths of degrees C), unknown ground cover, 100 cm'),
 ('SN06', 'Minimum soil temperature (tenths of degrees C), unknown ground cover, 150 cm'),
 ('SN07', 'Minimum soil temperature (tenths of degrees C), unknown ground cover, 180 cm'),
 ('SN11', 'Minimum soil temperature (tenths of degrees C), grass ground cover, 5 cm'),
 ('SN12', 'Minimum soil temperature (tenths of degrees C), grass ground cover, 10 cm'),
 ('SN13', 'Minimum soil temperature (tenths of degrees C), grass ground cover, 20 cm'),
 ('SN14', 'Minimum soil temperature (tenths of degrees C), grass ground cover, 50 cm'),
 ('SN15', 'Minimum soil temperature (tenths of degrees C), grass ground cover, 100 cm'),
 ('SN16', 'Minimum soil temperature (tenths of degrees C), grass ground cover, 150 cm'),
 ('SN17', 'Minimum soil temperature (tenths of degrees C), grass ground cover, 180 cm'),
 ('SN21', 'Minimum soil temperature (tenths of degrees C), fallow ground cover, 5 cm'),
 ('SN22', 'Minimum soil temperature (tenths of degrees C), fallow ground cover, 10 cm'),
 ('SN23', 'Minimum soil temperature (tenths of degrees C), fallow ground cover, 20 cm'),
 ('SN24', 'Minimum soil temperature (tenths of degrees C), fallow ground cover, 50 cm'),
 ('SN25', 'Minimum soil temperature (tenths of degrees C), fallow ground cover, 100 cm'),
 ('SN26', 'Minimum soil temperature (tenths of degrees C), fallow ground cover, 150 cm'),
 ('SN27', 'Minimum soil temperature (tenths of degrees C), fallow ground cover, 180 cm'),
 ('SN31', 'Minimum soil temperature (tenths of degrees C), bare ground, 5 cm'),
 ('SN32', 'Minimum soil temperature (tenths of degrees C), bare ground, 10 cm'),
 ('SN33', 'Minimum soil temperature (tenths of degrees C), bare ground, 20 cm'),
 ('SN34', 'Minimum soil temperature (tenths of degrees C), bare ground, 50 cm'),
 ('SN35', 'Minimum soil temperature (tenths of degrees C), bare ground, 100 cm'),
 ('SN36', 'Minimum soil temperature (tenths of degrees C), bare ground, 150 cm'),
 ('SN37', 'Minimum soil temperature (tenths of degrees C), bare ground, 180 cm'),
 ('SN41', 'Minimum soil temperature (tenths of degrees C), brome grass ground cover, 5 cm'),
 ('SN42', 'Minimum soil temperature (tenths of degrees C), brome grass ground cover, 10 cm'),
 ('SN43', 'Minimum soil temperature (tenths of degrees C), brome grass ground cover, 20 cm'),
 ('SN44', 'Minimum soil temperature (tenths of degrees C), brome grass ground cover, 50 cm'),
 ('SN45', 'Minimum soil temperature (tenths of degrees C), brome grass ground cover, 100 cm'),
 ('SN46', 'Minimum soil temperature (tenths of degrees C), brome grass ground cover, 150 cm'),
 ('SN47', 'Minimum soil temperature (tenths of degrees C), brome grass ground cover, 180 cm'),
 ('SN51', 'Minimum soil temperature (tenths of degrees C), sod ground cover, 5 cm'),
 ('SN52', 'Minimum soil temperature (tenths of degrees C), sod ground cover, 10 cm'),
 ('SN53', 'Minimum soil temperature (tenths of degrees C), sod ground cover, 20 cm'),
 ('SN54', 'Minimum soil temperature (tenths of degrees C), sod ground cover, 50 cm'),
 ('SN55', 'Minimum soil temperature (tenths of degrees C), sod ground cover, 100 cm'),
 ('SN56', 'Minimum soil temperature (tenths of degrees C), sod ground cover, 150 cm'),
 ('SN57', 'Minimum soil temperature (tenths of degrees C), sod ground cover, 180 cm'),
 ('SN61', 'Minimum soil temperature (tenths of degrees C), straw multch ground cover, 5 cm'),
 ('SN62', 'Minimum soil temperature (tenths of degrees C), straw multch ground cover, 10 cm'),
 ('SN63', 'Minimum soil temperature (tenths of degrees C), straw multch ground cover, 20 cm'),
 ('SN64', 'Minimum soil temperature (tenths of degrees C), straw multch ground cover, 50 cm'),
 ('SN65', 'Minimum soil temperature (tenths of degrees C), straw multch ground cover, 100 cm'),
 ('SN66', 'Minimum soil temperature (tenths of degrees C), straw multch ground cover, 150 cm'),
 ('SN67', 'Minimum soil temperature (tenths of degrees C), straw multch ground cover, 180 cm'),
 ('SN71', 'Minimum soil temperature (tenths of degrees C), grass muck ground cover, 5 cm'),
 ('SN72', 'Minimum soil temperature (tenths of degrees C), grass muck ground cover, 10 cm'),
 ('SN73', 'Minimum soil temperature (tenths of degrees C), grass muck ground cover, 20 cm'),
 ('SN74', 'Minimum soil temperature (tenths of degrees C), grass muck ground cover, 50 cm'),
 ('SN75', 'Minimum soil temperature (tenths of degrees C), grass muck ground cover, 100 cm'),
 ('SN76', 'Minimum soil temperature (tenths of degrees C), grass muck ground cover, 150 cm'),
 ('SN77', 'Minimum soil temperature (tenths of degrees C), grass muck ground cover, 180 cm'),
 ('SN81', 'Minimum soil temperature (tenths of degrees C), bare muck ground cover, 5 cm'),
 ('SN82', 'Minimum soil temperature (tenths of degrees C), bare muck ground cover, 10 cm'),
 ('SN83', 'Minimum soil temperature (tenths of degrees C), bare muck ground cover, 20 cm'),
 ('SN84', 'Minimum soil temperature (tenths of degrees C), bare muck ground cover, 50 cm'),
 ('SN85', 'Minimum soil temperature (tenths of degrees C), bare muck ground cover, 100 cm'),
 ('SN86', 'Minimum soil temperature (tenths of degrees C), bare muck ground cover, 150 cm'),
 ('SN87', 'Minimum soil temperature (tenths of degrees C), bare muck ground cover, 180 cm'),
 ('SX01', 'Maximum soil temperature (tenths of degrees C), unknown ground cover, 5 cm'),
 ('SX02', 'Maximum soil temperature (tenths of degrees C), unknown ground cover, 10 cm'),
 ('SX03', 'Maximum soil temperature (tenths of degrees C), unknown ground cover, 20 cm'),
 ('SX04', 'Maximum soil temperature (tenths of degrees C), unknown ground cover, 50 cm'),
 ('SX05', 'Maximum soil temperature (tenths of degrees C), unknown ground cover, 100 cm'),
 ('SX06', 'Maximum soil temperature (tenths of degrees C), unknown ground cover, 150 cm'),
 ('SX07', 'Maximum soil temperature (tenths of degrees C), unknown ground cover, 180 cm'),
 ('SX11', 'Maximum soil temperature (tenths of degrees C), grass ground cover, 5 cm'),
 ('SX12', 'Maximum soil temperature (tenths of degrees C), grass ground cover, 10 cm'),
 ('SX13', 'Maximum soil temperature (tenths of degrees C), grass ground cover, 20 cm'),
 ('SX14', 'Maximum soil temperature (tenths of degrees C), grass ground cover, 50 cm'),
 ('SX15', 'Maximum soil temperature (tenths of degrees C), grass ground cover, 100 cm'),
 ('SX16', 'Maximum soil temperature (tenths of degrees C), grass ground cover, 150 cm'),
 ('SX17', 'Maximum soil temperature (tenths of degrees C), grass ground cover, 180 cm'),
 ('SX21', 'Maximum soil temperature (tenths of degrees C), fallow ground cover, 5 cm'),
 ('SX22', 'Maximum soil temperature (tenths of degrees C), fallow ground cover, 10 cm'),
 ('SX23', 'Maximum soil temperature (tenths of degrees C), fallow ground cover, 20 cm'),
 ('SX24', 'Maximum soil temperature (tenths of degrees C), fallow ground cover, 50 cm'),
 ('SX25', 'Maximum soil temperature (tenths of degrees C), fallow ground cover, 100 cm'),
 ('SX26', 'Maximum soil temperature (tenths of degrees C), fallow ground cover, 150 cm'),
 ('SX27', 'Maximum soil temperature (tenths of degrees C), fallow ground cover, 180 cm'),
 ('SX31', 'Maximum soil temperature (tenths of degrees C), bare ground, 5 cm'),
 ('SX32', 'Maximum soil temperature (tenths of degrees C), bare ground, 10 cm'),
 ('SX33', 'Maximum soil temperature (tenths of degrees C), bare ground, 20 cm'),
 ('SX34', 'Maximum soil temperature (tenths of degrees C), bare ground, 50 cm'),
 ('SX35', 'Maximum soil temperature (tenths of degrees C), bare ground, 100 cm'),
 ('SX36', 'Maximum soil temperature (tenths of degrees C), bare ground, 150 cm'),
 ('SX37', 'Maximum soil temperature (tenths of degrees C), bare ground, 180 cm'),
 ('SX41', 'Maximum soil temperature (tenths of degrees C), brome grass ground cover, 5 cm'),
 ('SX42', 'Maximum soil temperature (tenths of degrees C), brome grass ground cover, 10 cm'),
 ('SX43', 'Maximum soil temperature (tenths of degrees C), brome grass ground cover, 20 cm'),
 ('SX44', 'Maximum soil temperature (tenths of degrees C), brome grass ground cover, 50 cm'),
 ('SX45', 'Maximum soil temperature (tenths of degrees C), brome grass ground cover, 100 cm'),
 ('SX46', 'Maximum soil temperature (tenths of degrees C), brome grass ground cover, 150 cm'),
 ('SX47', 'Maximum soil temperature (tenths of degrees C), brome grass ground cover, 180 cm'),
 ('SX51', 'Maximum soil temperature (tenths of degrees C), sod ground cover, 5 cm'),
 ('SX52', 'Maximum soil temperature (tenths of degrees C), sod ground cover, 10 cm'),
 ('SX53', 'Maximum soil temperature (tenths of degrees C), sod ground cover, 20 cm'),
 ('SX54', 'Maximum soil temperature (tenths of degrees C), sod ground cover, 50 cm'),
 ('SX55', 'Maximum soil temperature (tenths of degrees C), sod ground cover, 100 cm'),
 ('SX56', 'Maximum soil temperature (tenths of degrees C), sod ground cover, 150 cm'),
 ('SX57', 'Maximum soil temperature (tenths of degrees C), sod ground cover, 180 cm'),
 ('SX61', 'Maximum soil temperature (tenths of degrees C), straw multch ground cover, 5 cm'),
 ('SX62', 'Maximum soil temperature (tenths of degrees C), straw multch ground cover, 10 cm'),
 ('SX63', 'Maximum soil temperature (tenths of degrees C), straw multch ground cover, 20 cm'),
 ('SX64', 'Maximum soil temperature (tenths of degrees C), straw multch ground cover, 50 cm'),
 ('SX65', 'Maximum soil temperature (tenths of degrees C), straw multch ground cover, 100 cm'),
 ('SX66', 'Maximum soil temperature (tenths of degrees C), straw multch ground cover, 150 cm'),
 ('SX67', 'Maximum soil temperature (tenths of degrees C), straw multch ground cover, 180 cm'),
 ('SX71', 'Maximum soil temperature (tenths of degrees C), grass muck ground cover, 5 cm'),
 ('SX72', 'Maximum soil temperature (tenths of degrees C), grass muck ground cover, 10 cm'),
 ('SX73', 'Maximum soil temperature (tenths of degrees C), grass muck ground cover, 20 cm'),
 ('SX74', 'Maximum soil temperature (tenths of degrees C), grass muck ground cover, 50 cm'),
 ('SX75', 'Maximum soil temperature (tenths of degrees C), grass muck ground cover, 100 cm'),
 ('SX76', 'Maximum soil temperature (tenths of degrees C), grass muck ground cover, 150 cm'),
 ('SX77', 'Maximum soil temperature (tenths of degrees C), grass muck ground cover, 180 cm'),
 ('SX81', 'Maximum soil temperature (tenths of degrees C), bare muck ground cover, 5 cm'),
 ('SX82', 'Maximum soil temperature (tenths of degrees C), bare muck ground cover, 10 cm'),
 ('SX83', 'Maximum soil temperature (tenths of degrees C), bare muck ground cover, 20 cm'),
 ('SX84', 'Maximum soil temperature (tenths of degrees C), bare muck ground cover, 50 cm'),
 ('SX85', 'Maximum soil temperature (tenths of degrees C), bare muck ground cover, 100 cm'),
 ('SX86', 'Maximum soil temperature (tenths of degrees C), bare muck ground cover, 150 cm'),
 ('SX87', 'Maximum soil temperature (tenths of degrees C), bare muck ground cover, 180 cm'),
('TAVG', 'Average temperature (tenths of degrees C) [Note that TAVG from source "S* corresponds to an average for the period ending at 2400 UTC rather than local midnight]'),
( '0', 'Unspecified (station identified by up to eight alphanumeric characters'),
( '1', 'Community Collaborative Rain, Hail,and Snow (CoCoRaHS) based identification number'),
( 'E', 'Identification number used in the ECA&D non-blended dataset'),
( 'M', 'World Meteorological Organization ID (last five characters of the GHCN-Daily ID)'),
( 'N',  'Identification number used in data supplied by a National Meteorological or Hydrological Center' ),
( 'R', 'U.S. Interagency Remote Automatic Weather Station (RAWS) identifier'),
( 'S', 'U.S. Natural Resources Conservation Service SNOwpack TELemtry (SNOTEL) station identifier'),
( 'W', 'WBAN identification number (last five characters of the GHCN-Daily ID'),
('WT01', 'Fog, ice fog, or freezing fog (may include heavy fog)'),
('WT02', 'Heavy fog or heaving freezing fog (not always distinquished from fog)'),
('WT03', 'Thunder'),
('WT04', 'Ice pellets, sleet, snow pellets, or small hail'), 
('WT05', 'Hail (may include small hail)'),
('WT06', 'Glaze or rime'),
('WT07', 'Dust, volcanic ash, blowing dust, blowing sand, or blowing obstruction'),
('WT08', 'Smoke or haze'), 
('WT09', 'Blowing or drifting snow'),
('WT10', 'Tornado, waterspout, or funnel cloud'), 
('WT11', 'High or damaging winds'),
('WT12', 'Blowing spray'),
('WT13', 'Mist'),
('WT14', 'Drizzle'),
('WT15', 'Freezing drizzle'), 
('WT16', 'Rain (may include freezing rain, drizzle, and freezing drizzle)'), 
('WT17', 'Freezing rain'), 
('WT18', 'Snow, snow pellets, snow grains, or ice crystals'),
('WT19', 'Unknown source of precipitation'), 
('WT21', 'Ground fog'),
('WT22', 'Ice fog or freezing fog'),
('WV01', 'Fog, ice fog, or freezing fog (may include heavy fog) in the Vicinity'),
('WV03', 'Thunder in the Vicinity'),
('WV07', 'Ash, dust, sand, or other blowing obstruction in the Vicinity'),
('WV18', 'Snow or ice crystals in the Vicinity'),
('WV20', 'Rain or snow shower in the Vicinity')`
)


dataTables.set('LOAD_LIST', `CREATE UNLOGGED TABLE IF NOT EXISTS LOAD_LIST (
    ID       int GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    filepath VARCHAR(256),
    started  TIMESTAMP NULL,
    ended    TIMESTAMP   NULL, 
    success  BOOLEAN DEFAULT false
)`
)

dataTables.set('Stations', `CREATE UNLOGGED TABLE IF NOT EXISTS Stations ( 
    STATION    VARCHAR(11) PRIMARY KEY,
    LATITUDE   double precision ,
    LONGITUDE  double precision ,
    ELEVATION  double precision,
    NAME       VARCHAR(64),
    COUNTRY    VARCHAR(8),
    FILE_ID    integer
)
WITH (autovacuum_enabled=false) `
)

// CONSTRAINT STATIONS_FK FOREIGN KEY(FILE_ID) REFERENCES LOAD_LIST(ID) 

dataTables.set( 'MEASUREMENTS', `CREATE UNLOGGED TABLE IF NOT EXISTS MEASUREMENTS (
    STATION    VARCHAR(11) NOT NULL,
    MDATE      DATE NOT NULL,
    CODE       VARCHAR(4),
    VALUE      SMALLINT,
    MFLAG      CHAR(1),
    QFLAG      CHAR(1),
    SFLAG      CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set( 'Air', `CREATE UNLOGGED TABLE IF NOT EXISTS Air (
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    TMAX        SMALLINT,
    TMIN        SMALLINT,
    TOBS        SMALLINT,
    TAVG        SMALLINT,
    SFLAG       CHAR(1),
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    TAVG_SFLAG  CHAR(1),
    TAVG_MFLAG  CHAR(1),
    TAVG_QFLAG  CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Rain', `CREATE UNLOGGED TABLE IF NOT EXISTS Rain (
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    PRCP        SMALLINT, 
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Snow', `CREATE UNLOGGED TABLE IF NOT EXISTS Snow (
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    SNOW        SMALLINT,  
    SNWD        SMALLINT,
    WESD         SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Sun', `CREATE UNLOGGED TABLE IF NOT EXISTS Sun (
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    PSUN        SMALLINT, 
    TSUN        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Ice', `CREATE UNLOGGED TABLE IF NOT EXISTS Ice (
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    THIC        SMALLINT, 
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Evaporation', `CREATE UNLOGGED TABLE IF NOT EXISTS Evaporation (
    STATION    VARCHAR(11) NOT NULL,
    MDATE      DATE NOT NULL,
    MNPN       SMALLINT,
    MXPN       SMALLINT,
    EVAP       SMALLINT,
    SFLAG      CHAR(1),
    MFLAG      CHAR(1),
    QFLAG      CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Cloud', `CREATE UNLOGGED TABLE IF NOT EXISTS Cloud (
    STATION       VARCHAR(11) NOT NULL,
    MDATE         DATE NOT NULL,
    ACMC          SMALLINT,
    ACMH          SMALLINT,
    ACSC          SMALLINT,
    ACSH          SMALLINT,
    SFLAG       CHAR(1),
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Weather', `CREATE UNLOGGED TABLE IF NOT EXISTS Weather (
    STATION     VARCHAR(11)  NOT NULL,
    MDATE       DATE NOT NULL, 
    WT          CHAR(4),
    WT_MFLAG    CHAR(1),
    WT_QFLAG    CHAR(1),
    WT_SFLAG    CHAR(1),
    WV          CHAR(4),
    WV_MFLAG    CHAR(1),
    WV_QFLAG    CHAR(1),
    WV_SFLAG    CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Wind', `CREATE UNLOGGED TABLE IF NOT EXISTS Wind (
    STATION    VARCHAR(11)  NOT NULL,
    MDATE      DATE NOT NULL,
    AWDR          SMALLINT,
    AWND          SMALLINT,
    PGTM          TIME,
    WSF1          SMALLINT,
    WDF1          SMALLINT,
    WSF2          SMALLINT,
    WDF2          SMALLINT,
    WSF5          SMALLINT,
    WDF5          SMALLINT,
    WSFG          SMALLINT,
    WSFI          SMALLINT,
    WSFM          SMALLINT,
    FMTM          TIME,
    WDMV          SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Soil', `CREATE UNLOGGED TABLE IF NOT EXISTS Soil (
    STATION    VARCHAR(11)  NOT NULL,
    MDATE      DATE NOT NULL,
    SN_MIN      SMALLINT,
    SX_MAX      SMALLINT,
    COVER       SMALLINT,
    COVER_TXT   VARCHAR(16),
    COVER_DEPTH SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Air_MD',  `CREATE UNLOGGED TABLE IF NOT EXISTS Air_MD (
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    MDTN        SMALLINT,
    DATN        SMALLINT,
    MDTX        SMALLINT,
    DATX        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Rain_MD', `CREATE UNLOGGED TABLE IF NOT EXISTS Rain_MD (
    STATION     VARCHAR(11) NOT NULL,
    MDATE       DATE NOT NULL,
    MDPR        SMALLINT,
    DAPR        SMALLINT,
    DWPR        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Snow_MD', `CREATE UNLOGGED TABLE IF NOT EXISTS Snow_MD (
    STATION     VARCHAR(11),
    MDATE       DATE NOT NULL,
    MDSF        SMALLINT,
    DASF        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Wind_MD', `CREATE UNLOGGED TABLE IF NOT EXISTS Wind_MD (
    STATION     VARCHAR(11),
    MDATE       DATE NOT NULL,
    MDWM        SMALLINT,
    DAWM        SMALLINT,
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)

dataTables.set('Evaporation_MD', `CREATE UNLOGGED TABLE IF NOT EXISTS Evaporation_MD (
    STATION     VARCHAR(11),
    MDATE       DATE NOT NULL,
    MDEV        SMALLINT,
    DAEV        SMALLINT, 
    MFLAG       CHAR(1),
    QFLAG       CHAR(1),
    SFLAG       CHAR(1),
    FOREIGN KEY(STATION) REFERENCES Stations(STATION) ON DELETE CASCADE
)
WITH (autovacuum_enabled=false)`
)
