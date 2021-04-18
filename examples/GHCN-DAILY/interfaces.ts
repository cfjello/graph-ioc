
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

export type TablesDefType = { 
    file:           string, 
    txt:            string, 
    cols:           Map<string,ColumnDefType>, 
    initialized?:   boolean,
    readTmpl?:      string[],
    table?:         string,
    insert?:        string
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
    dbConf : ConnPoolConfigType, 
    ftpConf: FtpConf,
    httpConf: HttpConf,
    staging: Staging
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
    ID:        number 
}
