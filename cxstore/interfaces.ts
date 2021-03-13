
import { StateKeys } from "../cxctrl/interfaces.ts"
export type StateMetaData = {    
    storeId: number 
    prevStoreId?: number
    prevJobId?: number
    prevTaskId?: number
}

export type StoreEntry<T> = {
    data: T
    meta: StateKeys
}

export type IteratorType = {
    storeKey: string, 
    indexKeyId: number | string, 
    inObjectIterator?: boolean, 
    continuous?: boolean,
    indexCounter?: number, 
    prefix?: string 

}


export interface IterateIndexMap {
    [Symbol.iterator](): IterableIterator<number>;
}
  