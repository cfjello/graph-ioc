import {assert, assertExists } from "https://deno.land/std@0.113.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import { CxError, _ } from "../cxutil/mod.ts";
import { ActionDescriptorType, PromiseChainArgsType } from "./interfaces.ts";
import { ctrl } from "./mod.ts";

const __filename = new URL('', import.meta.url).pathname
export const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )

export function promiseChainArgsFac( pct: Partial<PromiseChainArgsType> ): PromiseChainArgsType {
    let facName = 'promiseChainFac'
    try {
        assertExists(pct.actionName, 'actionName must be defined')
        assert(ctrl.actions.has(pct.actionName!), `${pct.actionName} must be an registered action`)
        return {
            actionName: pct.actionName,
            runAll:     _.isUndefined(pct.runAll)   ? false : pct.runAll!, 
            runRoot:    _.isUndefined(pct.runRoot)  ? false : pct.runRoot!,
            jobId:      _.isUndefined(pct.jobId)    ? jobIdSeq().next().value  as number : pct.jobId!,
            children:   _.isUndefined(pct.children) ? []    : pct.children!
        }
    }
    catch(err) {
        throw new CxError(__filename, 'promiseChainFac()', 'FAC-0001',`Failed to create ${facName}`, err)
    }
}

import { ActionDescriptor } from "./interfaces.ts"
import { jobIdSeq, taskIdSeq } from "./generators.ts"

export function actionDescriptorFac( adf: Partial<ActionDescriptor> ): ActionDescriptorType {
    let facName = 'ActionDescriptorFac'
    try {
        assertExists(adf.rootName, 'rootName must be defined')
        return { 
            rootName:   adf.rootName!, // rootName
            storeName:  ! adf.storeName  ? adf.rootName! : adf.storeName,  // storeName
            actionName: ! adf.actionName ? adf.rootName! : adf.actionName, // actionName
            ident:      ! adf.ident      ? '00.00'       : adf.ident,      // ident
            jobId:      _.isUndefined(adf.jobId)  ? jobIdSeq().next().value  as number  : adf.jobId!,  // jobId
            taskId:     _.isUndefined(adf.taskId) ? taskIdSeq().next().value  as number : adf.taskId!, // taskId
            forceRunRoot: _.isUndefined(adf.forceRunRoot)  ? false : adf.forceRunRoot!,
            storeId:     _.isUndefined(adf.storeId)  ? -1 : adf.storeId!,
            children:    _.isUndefined(adf.children) ? [] : _.clone(adf.children),
            isDirty:     false,
            eventName:   "",                   
            ran:         false,
            success:     false,
            nodeConfig:  _.isUndefined(adf.nodeConfig) ? undefined : adf.nodeConfig,
            promise:     _.isUndefined(adf.promise)    ? undefined : adf.promise 
        }
    }
    catch(err) {
        throw new CxError(__filename, 'promiseChainFac()', 'FAC-0002',`Failed to create ${facName}`, err)
    }
}

