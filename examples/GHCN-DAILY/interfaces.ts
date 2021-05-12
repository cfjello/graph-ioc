
export type FtpFetchObjectType = {
    ftpServer?: string,
    ftpPath?:   string,
    fileName:   string,
    fileInfo?:  Deno.FileInfo,
    data?:      Uint8Array,
    status?:    boolean
    info?:      string
}

export type FtpListType = {
    ftpServer: string,
    ftpPath:   string,
    fileList: string[]
}

export type HttpListType = {
    fileName:   string,
    timeStamp:  string,
    size:       string,
    status?:    boolean
}


export type ColumnDefType = {
    type:       string,
    length:     number,
    repeat?:    boolean
}

export type RepeatingGroupType = {
    colName:    string, 
    start:      number, 
    end:        number,
    colType:    string
}

export type ConnPoolConfigType = {
    applicationName:  string,
    user:             string,
    password:         string,
    database:         string,
    hostname:         string,
    port:             number,
    POOL_CONNECTIONS: number
}

export type RunConf = {
        keepTables:     boolean,
        keepFilelist:   boolean,
        keepTextTables: boolean
}

export type FtpConf = {
    server:     string,
    directory:  string
}

export type Staging = {
    stageDir:  string
    files:     string,
    textFiles: string
}

export type HttpConf = {
    url:    string,
    txtUrl: string
}

export type ConfigType = {
    // runConf:    RunConf
    dbConf :    ConnPoolConfigType, 
    ftpConf:    FtpConf,
    httpConf:   HttpConf,
    staging:    Staging
}

export type LoadListType = {
    id:       number,
    filepath: string,
    started?: Date,
    ended?:   Date,
    success?: boolean
}

export type HttpHeaderType = {
    STATION:   string,
    DATE:      string,
    LATITUDE:  number,
    LONGITUDE: number,
    ELEVATION: number,
    NAME:      string,
    COUNTRY:   string,
    FILE_ID:   number 
}

export type AirTempType = {
    TMAX:        number,
    TMIN:        number,
    TOBS:        number,
    TAVG:        number,
    TMAX_ATTRIBUTES: string
    TMIN_ATTRIBUTES: string
    TOBS_ATTRIBUTES: string
    TAVG_ATTRIBUTES: string
}


export type TablesDefType = { 
    file:           string, 
    txt:            string, 
    cols:           Map<string,ColumnDefType>, 
    initialized?:   boolean,
    readTmpl?:      string[],
    table?:         string,
    insert?:        string
}

export type TableStatus = {
    dropped: boolean,
    created: boolean,
    inserts: number,
    deletes: number
}

export type TablesType = {
    tableStatus: Map<string, Partial<TableStatus>>
    tableDefs:   Map<string,TablesDefType> 
}


