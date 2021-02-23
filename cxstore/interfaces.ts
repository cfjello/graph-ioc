
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

/*
interface Iterator<T> {
    next(value?: any): IteratorResult<T>;
    return?(value?: any): IteratorResult<T>;
    throw?(e?: any): IteratorResult<T>;
}


export interface IteratorResult<T> {
    done: boolean;
    value: T;
}
*/

export interface IterateIndexMap {
    [Symbol.iterator](): IterableIterator<number>;
}
  