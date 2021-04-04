import { Action, action, swarm } from "../../cxctrl/mod.ts"
import FTPClient from "https://deno.land/x/ftpc@v1.1.0/mod.ts"
import { CxError, _  } from "../../cxutil/mod.ts"
import { config } from "./config.ts"
import { FtpFetchObjectType } from "./interfaces.ts"
import { PgTables  }  from "./PgTables.ts"
import { FtpList }    from "./FtpList.ts"
import { FtpFetch }   from "./FtpFetch.ts"
import { LoadList }   from "./PgLoadList.ts"
import { PgLoadData } from "./PgLoadData.ts"


const __filename = new URL('', import.meta.url).pathname;

try {
    //
    // Create the tables
    // 
    let pgTables = await new PgTables(true, true).register()
    let loadList = await new LoadList().register()

    //
    // Loading the temperature data files
    //
    let ftpList =  await new FtpList().register()
    let ftpFetch = await new FtpFetch().register()
    await ftpFetch.setDependencies('FtpList')
    
    swarm.setSwarmConf('FtpFetch', 4, 4)
    await swarm.addSwarm('FtpFetch', FtpFetch )
    ftpFetch.run()

    // 
    // Parse the files and load the data to the database
    // 
    let pgLoadData = await new PgLoadData().register()
    await pgLoadData.cleanup()
    
    pgLoadData.setDependencies('PgTables', 'LoadList')

    swarm.setSwarmConf('PgLoadData', 40, 40)
    await swarm.addSwarm('PgLoadData', PgLoadData )

    await pgLoadData.run()
}
catch(err) {
    throw new CxError( __filename, 'main', 'MAIN-0001',`Failed to run main script.`, err)
}
