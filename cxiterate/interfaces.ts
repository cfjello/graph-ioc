export type IteratorType = {
    storeKey:       string,
    indexKey:       number | string, // this will most often be the jobId
    nestedIterator: boolean,
    continuous:     boolean,
    indexOffset:    number,
    indexPrefix:    string
}

export type IteratorConfType = { requestObj: string, targetObj: string }  & IteratorType

export interface AsyncIterator<T> {
    next(value?: any):      Promise<IteratorResult<T>>;
    return?(value?: any):   Promise<IteratorResult<T>>;
    throw?(e?: any):        Promise<IteratorResult<T>>;
}

export interface IterateIndexMap {
    [Symbol.iterator](): IterableIterator<number>;
}
