import  Mutex  from "https://deno.land/x/await_mutex@v1.0.1/mod.ts"
import { Action, ctrl} from "../cxctrl/mod.ts";
import { CxContinuous, CxIterator } from "../cxiterate/CxIterator.ts";
import { $log, _, CxError, ee, perf } from "../cxutil/mod.ts";
import { iteratorConfFac } from "./factories.ts";
import { IteratorConfType } from "./interfaces.ts";

const __filename = new URL("", import.meta.url).pathname;

export let iterators = new Map<string, Map<string, (CxIterator<any> | CxContinuous<any>)>>();

/**
 * Get an iterator for named stored object for a specific caller - the returned iterator will be exclusive to the requesting object ( and it's swarm objects )
 * 
 * @param calleeStoreKey  The Action storage storeName of the action requesting the iterator 
 * @param storeKey        The store storeName of that you request an iterator for
 * @param indexKey      The id of the index you want an iterator for - this will be prefixed with the indexPrefix (see below) to make up the index storeName
 * @param nestedIterator If set to true, then each object fetched via the index will in turn be considered a iterable object with a next() that will return these values
 * @param indexOffset    The index counter for accessing the index - setting this will allow you to traverse the index with an offset  
 * 
 * @return Iterator       An iterator for a list of a given type
 */

export function getIterator<T, E>(
  calleeStoreKey: string,
  storeKey: string,
  indexKey: number | string,
  nestedIterator: boolean = false,
  indexOffset: number = 0,
  indexPrefix: string = "J",
) {
  try {
    if (!iterators.has(calleeStoreKey)) {
      iterators.set(calleeStoreKey, new Map<string, CxIterator<T, E>>());
    }
    if (!iterators.get(calleeStoreKey)!.has(storeKey)) {
      iterators.get(calleeStoreKey)!.set(
        storeKey,
        new CxIterator({
          storeKey: storeKey,
          indexKey: indexKey,
          nestedIterator: nestedIterator,
          indexOffset: indexOffset,
          indexPrefix: indexPrefix,
        }),
      );
    }
    return iterators.get(calleeStoreKey)!.get(storeKey);
  } catch (err) {
    throw new CxError(
      __filename,
      "getIterator()",
      "ITOR-0001",
      `Failed to create Iterator for ${storeKey}`,
      err,
    );
  }
}

/**
 * Get an continous iterator for named stored object for a specific caller - the returned iterator will be exclusive to the requesting object ( and it's swarm objects )
 * 
 * @param calleeStoreKey  The Action storage storeName of the action requesting the iterator 
 * @param storeKey        The store storeName of that you request an iterator for
 * @param indexKey      The id of the index you want an iterator for - this will be prefixed with the indexPrefix (see below) to make up the index storeName
 * @param nestedIterator If set to true, then each object fetched via the index will in turn be considered a iterable object with a next() that will return these values
 * @param indexOffset    The index counter for accessing the index - setting this will allow you to traverse the index with an offset  
 * 
 * @return Iterator       An iterator for a list of a given type
 */
export async function getContinuous<T, E>(
  calleeStoreKey: string,
  storeKey: string,
  indexKey: number | string,
  nestedIterator: boolean = false,
  indexOffset = 0,
  indexPrefix: string = "J",
): Promise<CxContinuous<T, E>> {
  let mutex = new Mutex();
  const mutexLock = await mutex.acquire()
  try {
    if (!iterators.has(calleeStoreKey)) {
      iterators.set(calleeStoreKey, new Map<string, CxContinuous<T, E>>());
    }
    if (!iterators.get(calleeStoreKey)!.has(storeKey)) {
      iterators.get(calleeStoreKey)!.set(
        storeKey,
        await new CxContinuous({
          storeKey: storeKey,
          indexKey: indexKey,
          nestedIterator: nestedIterator,
          indexOffset: indexOffset,
          indexPrefix: indexPrefix,
        }),
      );
    }
    return Promise.resolve(iterators.get(calleeStoreKey)!.get(storeKey) as CxContinuous<T, E>)
  } catch (err) {
    throw new CxError(
      __filename,
      "getContinuous()",
      "ITOR-0002",
      `Failed to create Continuous Iterator for ${storeKey}`,
      err,
    );
  }
  finally {
    mutex.release(mutexLock)
  }
}


/** 
 * Get an iterator for named stored object which is assigned to a specific specific caller - the returned iterator will be exclusive to the requesting object and it's swarm objects.
 * 
 * @param itorConf              Iterator configuration
 *  requestObj: string           The Action storage storeName of the action requesting the iterator 
 *  targetObj:  string           The store storeName of that you request an iterator for
 *  indexKey: number | string   The id of the index you want an iterator for - this will be prefixed with the indexPrefix (see below) to make up the index storeName
 *  nestedIterator: boolean     If set to true, then each object fetched via the index will in turn be considered a iterable object with a next() that will return these values
 *  continuous: boolean         If set to true, then once the iterator has fetched the last entr, it will call main() on the iterable object to check for more items
 *  indexOffset: number         The index counter for accessing the index - setting this will allow you to traverse the index with an offset  
 *  indexPrefix: string
 * @return Continuous<T,E> | CxIterator<T,E>       An iterator for a list of a given type
 */

 export async function factory<T, E>(_iterConf: Partial<IteratorConfType>): Promise<CxContinuous<T, E> | CxIterator<T, E>> {
  let mutex = new Mutex();
  const nextMutex = await mutex.acquire()
  try {
    let conf = iteratorConfFac( _iterConf )
    
    if (conf.continuous) {
      return Promise.resolve(getContinuous<T, E>(
        conf.requestObj!,
        conf.targetObj!,
        conf.indexKey!,
        conf.nestedIterator,
        conf.indexOffset!,
        conf.indexPrefix!,
      ) as unknown as CxContinuous<T, E>);
    } else {
      return Promise.resolve(getIterator<T, E>(
        conf.requestObj!,
        conf.targetObj!,
        conf.indexKey!,
        conf.nestedIterator,
        conf.indexOffset!,
        conf.indexPrefix!,
      ) as CxIterator<T, E>);
    }
  } catch (err) {
    throw new CxError(
      __filename,
      "iteratorFactory()",
      "ITOR-0003",
      `Could not create Iterator for ${JSON.stringify(_iterConf)}`,
      err,
    );
  }
  finally {
    mutex.release(nextMutex)
  }
}

export function deleteIterator(
  obj: Action<any>,
  callee: string,
  target: string,
) {
  try {
    // The master is the last one to leave the swarm party, so it can dispose of the iterator
    if (obj.isSwarmMaster()) {
      iterators.get(callee)?.delete("LoadList");
    }
  } catch (err) {
    throw new CxError(
      __filename,
      "iteratorFactory()",
      "ITOR-0004",
      `Could not dispose of Iterator: ${callee}.${target} `,
      err,
    );
  }
}
