
import { StateKeys } from "../cxctrl/interfaces.ts"

export type StateMetaData = {
    storeId:        number
    prevStoreId?:   number
    prevJobId?:     number
    prevTaskId?:    number
}

export type StoreEntry<T> = {
    data: T
    meta: StateKeys
}

export type IteratorType = {
    storeKey:       string,
    indexKey:       number | string,
    nestedIterator: boolean,
    indexOffset:    number,
    indexPrefix:    string
}


export interface AsyncIterator<T> {
    next(value?: any):      Promise<IteratorResult<T>>;
    return?(value?: any):   Promise<IteratorResult<T>>;
    throw?(e?: any):        Promise<IteratorResult<T>>;
}

/*
interface AsyncIteratorResult<T> {
  done: boolean;
  value: T;
}

*/

export interface IterateIndexMap {
    [Symbol.iterator](): IterableIterator<number>;
}

