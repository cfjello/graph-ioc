
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

export type ColumnDefType = {
    type:       string,
    length:     number,
    repeat?:    boolean
}

export type TablesDefType = { 
    file:       string, 
    txt:        string, 
    cols:       Map<string,ColumnDefType>, 
    readTmpl?:  string[],
    table?:    string,
    insert?:   string
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
        stageDir: string
}

export type ConfigType = {
    dbConf : ConnPoolConfigType, 
    ftpConf: FtpConf,
    staging: Staging
}

export type LoadListType = {
    id:       number,
    filepath: string,
    started?: Date,
    ended?:   Date,
    success?: boolean
}
