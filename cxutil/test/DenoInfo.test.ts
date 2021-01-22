import { expect }  from 'https://deno.land/x/expect/mod.ts'
import { denoInfo } from "../DenoInfo.ts"
import { existsSync } from "https://deno.land/std/fs/mod.ts";

Deno.test( { 
    name: 'DenoInfo can read the Deno info output and set the evironment variables', 
    fn: async () => {
        await denoInfo()
        expect(Deno.env.get('DENO_DIR') as string).toBeDefined()
        expect(existsSync(Deno.env.get('DENO_DIR') as string)).toBeTruthy()
        expect(Deno.env.get('REMOTE_MODULES') as string).toBeDefined()
        expect(existsSync(Deno.env.get('REMOTE_MODULES') as string)).toBeTruthy()
        expect(Deno.env.get('TS_COMPILE_DIR') as string).toBeDefined()
        expect(existsSync(Deno.env.get('TS_COMPILE_DIR') as string)).toBeTruthy()
    },
    sanitizeResources: false,
    sanitizeOps: false
})