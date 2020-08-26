export interface StoreIntf  {
    register(key: string, objRef: any, threshold: number): Promise<number>
    unregister(key: string): Promise<boolean>
    size(): number
    get(key: string, storeId:number): {}
    hasStoreId(key: string, storeId:number): boolean 
    getStoreId( key: string, storeId: number): number
    set<T>(key: string, objRef: any, threshold: number): Promise<number>
    has (key: string): boolean
    isRegistered(key: string): boolean
    getState(): ReadonlyMap<string, {}> // TODO: check if these are compatible across backends
    getMeta():  ReadonlyMap<string, {}> // TODO: check if these are compatible across backends
}

export type StateMetaData = {    
    storeId: number 
    prevStoreId: number
    prevJobId: number
    prevTaskId: number
    threshold: number
}

/*
export type StoreEntry<T> = {
    storeId: number
    entry: T
}


import {Action} from "../Action"
export interface CtrlIntf {
    publish ( name: string, context: any ): void
    runAction(actionName:string , ...args): boolean
    getState(name:string, idx: number): any
    addGraphDependencies( objectName: string, dependencies: string[] ): void
    addAction( actionObj: Action<any> ): boolean
    getActionsToRun( actionName: string, actionsToRun: string[] ): string[]
    runAction( actionName: string ): boolean
    runDependants( actionName: string ): boolean
}


// Courtesy of Sandy Gifford
export type StringDictionary<T> = { [key: string]: T; }

export type StringDictionaryRO<T> = { readonly [key: string]: T; }

export type NodeData = { idx: number, dirty: boolean }

*/
