import { ConfigType } from "./interfaces.ts"
export { config } from "./config.secret.ts"

/* 
* Example configuration for GHCN-DAILY
*/
/*
export let  config: ConfigType = {
    runConf: {
        dailyTables:    'create',
        textTables:     'create',
        fileLoadList:   'create',
        parseOnly:      false
    },
    dbConf: {
        applicationName: 'some_dw',
        user:            'yourUserName',
        password:        'yourPassword',
        database:        'yourDatabaseName',
        hostname:        'yourDatabaseIP',
        port:             99999, // Your Database Port
        POOL_CONNECTIONS: 30 
    },
    ftpConf: {
        server:          'ftp.ncdc.noaa.gov',
        directory:       'pub/data/ghcn/'
    },
    httpConf: {
        url:            'https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access',
        txtUrl:         'https://www1.ncdc.noaa.gov/pub/data/ghcn/daily/'
    },
    staging: {
        stageDir: 'D:/GHCN-DAILY',
        files: 'D:/GHCN-DAILY/files',
        textFiles: 'D:/GHCN-DAILY/textFiles',
    }
}
*/