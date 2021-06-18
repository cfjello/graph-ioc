import { Action, action, swarm } from "../../cxctrl/mod.ts"
import { CxError, _  } from "../../cxutil/mod.ts"
import { PgTables  }  from "./PgTables.ts"
import { FileList }   from "./FileList.ts"
import { LoadList }   from "./LoadList.ts"
import { PgLoadData } from "./PgLoadData.ts"
import { config } from "./config.ts"

const __filename = new URL('', import.meta.url).pathname;

try {
    //
    // Create the tables
    // 
    let pgTables = await new PgTables( 
        { 
            dailyTables:  'keep', 
            textTables:   'keep', 
            fileLoadList: 'keep',
            loadData: true
        } 
    ).register()

    // await pgTables.run(true)
    // 
    // Parse the files and load the data to the database
    // 
    let fileList = await new FileList().register()
    fileList.setDependencies( 'PgTables' )

    let loadList = await new LoadList().register()
    loadList.setDependencies( 'FileList' ) 

    let pgLoadData = await new PgLoadData().register()
    pgLoadData.setDependencies( 'LoadList' )

    swarm.setSwarmConf('PgLoadData', 580, 580 )
    await swarm.addSwarm('PgLoadData', PgLoadData )

    await pgLoadData.run()
}
catch(err) {
    throw new CxError( __filename, 'main', 'MAIN-0001',`Failed to run main script.`, err)
}
