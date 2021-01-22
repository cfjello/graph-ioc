import { exec, IExecResponse, OutputMode  } from "https://deno.land/x/exec/mod.ts";


export let denoInfo  = async () => {
    let response: IExecResponse = await exec('deno info', {output: OutputMode.Capture});

    let regexp = /"([^"]+)"[^"]+"([^"]+)"[^"]+"([^"]+)"/m
    let m = regexp.exec( response.output )

    let DENO_DIR = m![1].replace(/\\+/g, '/')
    let REMOTE_MODULES = m![2].replace(/\\+/g, '/')
    let TS_COMPILE_DIR = m![3].replace(/\\+/g, '/') 

    Deno.env.set('DENO_DIR',DENO_DIR )
    Deno.env.set('REMOTE_MODULES',REMOTE_MODULES )
    Deno.env.set('TS_COMPILE_DIR',TS_COMPILE_DIR )

    /*
    console.log( `ROOT_DIR: ${ctrl.__dirname}`)
    console.log( `DENO_DIR: ${Deno.env.get('DENO_DIR')}` )
    console.log( `REMOTE_MODULES: ${Deno.env.get('REMOTE_MODULES')}`)
    console.log( `TS_COMPILE_DIR: ${Deno.env.get('TS_COMPILE_DIR')}`)
    console.log( Deno.env.toObject() )
    */
}