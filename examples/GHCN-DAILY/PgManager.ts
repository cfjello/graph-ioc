import { PgManager, PgClient, Configuration } from "https://deno.land/x/mandarine_postgres@v2.3.0/ts-src/mod.ts";
export { PgClient }

const configuration: Configuration = {
    host:           '204.2.195.225',
    username:       'ghcn',
    password:       'Strange67',
    dbname:         'ghcn',
    port:           21954,              // default = 5432
    poolSize:       10,                 // Max pool size, default = 25
    sslmode:        'Disable' ,         // other options are: | "Prefer" | "Require"
    // connectTimeout: 3600,            
    // keepalives:     true,
    // keepalivesIdle: 30                
}

const priorityConfig : Configuration = {
    host:           '204.2.195.225',
    username:       'ghcn',
    password:       'Strange67',
    dbname:         'ghcn',
    port:           21954,              // default = 5432
    poolSize:       3,                 // Max pool size, default = 25
    sslmode:        'Disable' ,         // other options are: | "Prefer" | "Require"
    // connectTimeout: 3600,              
    // keepalives:     true,
    // keepalivesIdle: 3600              
}

export const pgManager: PgManager = new PgManager( configuration );

// export const pgPriorityManager: PgManager = new PgManager( priorityConfig );
