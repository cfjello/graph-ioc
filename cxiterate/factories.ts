import {assert, assertExists } from "https://deno.land/std@0.113.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { CxError, _ } from "../cxutil/mod.ts";
import { IteratorConfType, IteratorType } from "./interfaces.ts";
import { Action, ctrl } from "../cxctrl/mod.ts";
import { iterators } from "./iterate.ts";

const __filename = new URL('', import.meta.url).pathname
export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

export function iteratorConfFac( itorConf: Partial<IteratorConfType> ): IteratorConfType {
    try {
        //
        // Check configuration
        //
        if ( _.isUndefined(itorConf.requestObj) || ! ctrl.actions.has(itorConf.requestObj as string ) )
            throw Error("The configuration must as a minimum supply the name of an existing requesting Action")

        if ( _.isUndefined(itorConf.targetObj) || ! ctrl.actions.has(itorConf.targetObj as string ) )
            throw Error("The configuration must as a minimum supply the name of an existing target Action")

        let storeKey = ctrl.actions.get(itorConf.targetObj!)!.meta.name!

        if ( ! ctrl.store.has( storeKey ) )
            throw Error(`The configuration must as a minimum supply the name of an existing target Store object. Cannot find: ${storeKey}`)

        if ( iterators.has( storeKey ) )
            throw Error(`There already exists an iterator by the name: ${storeKey}`)
        //
        // Populate condiguration
        // 
        itorConf.storeKey = storeKey

        if ( _.isUndefined(itorConf.indexKey) || (typeof itorConf.indexKey === "number" && itorConf.indexKey === -1) ) 
            itorConf.indexKey = ctrl.actions.get(itorConf.targetObj as string)!.getJobId()

        if ( _.isUndefined(itorConf.nestedIterator) ) 
            itorConf.nestedIterator = false

        if ( _.isUndefined(itorConf.continuous) ) 
            itorConf.continuous = false

        if ( _.isUndefined(itorConf.indexOffset) ) 
            itorConf.indexOffset = 0

        if (_.isUndefined(itorConf.indexPrefix)) 
            itorConf.indexPrefix = "J"

        return itorConf as IteratorConfType 
    } catch (err) {
        throw new CxError(
          __filename,
          "iteratorConfFac()",
          "ITOR-0020",
          `Failed to create Iterator Configuration for ${JSON.stringify(itorConf)}`,
          err,
        );
      }
}