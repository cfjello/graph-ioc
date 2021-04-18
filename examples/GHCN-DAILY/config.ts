import { ConfigType } from "./interfaces.ts"


export let  config: ConfigType = {
    dbConf: {
        applicationName: 'ghcn_dw',
        user:            'ghcn',
        password:        'Strange67',
        database:        'ghcn',
        hostname:        '204.2.195.225',
        port:             21954,
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
