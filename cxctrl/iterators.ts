import { Action, ctrl } from "../cxctrl/mod.ts";
import { CxContinuous, CxIterator, CxStore } from "../cxstore/mod.ts";
import { $log, _, CxError, ee, perf } from "../cxutil/mod.ts";
import { IteratorConfType } from "./interfaces.ts";

const __filename = new URL("", import.meta.url).pathname;

export let iterators = new Map<
  string,
  Map<string, (CxIterator<any> | CxContinuous<any>)>
>();

/**
 * Get an iterator for named stored object for a specific callee - the returned iterator will be exclusive to the requesting object ( and it's swarm objects )
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
      "CTRL-0010",
      `Failed to create Iterator for ${storeKey}`,
      err,
    );
  }
}

/**
 * Get an continous iterator for named stored object for a specific callee - the returned iterator will be exclusive to the requesting object ( and it's swarm objects )
 * 
 * @param calleeStoreKey  The Action storage storeName of the action requesting the iterator 
 * @param storeKey        The store storeName of that you request an iterator for
 * @param indexKey      The id of the index you want an iterator for - this will be prefixed with the indexPrefix (see below) to make up the index storeName
 * @param nestedIterator If set to true, then each object fetched via the index will in turn be considered a iterable object with a next() that will return these values
 * @param indexOffset    The index counter for accessing the index - setting this will allow you to traverse the index with an offset  
 * 
 * @return Iterator       An iterator for a list of a given type
 */
export function getContinuous<T, E>(
  calleeStoreKey: string,
  storeKey: string,
  indexKey: number | string,
  nestedIterator: boolean = false,
  indexOffset = 0,
  indexPrefix: string = "J",
): CxContinuous<T, E> {
  try {
    if (!iterators.has(calleeStoreKey)) {
      iterators.set(calleeStoreKey, new Map<string, CxContinuous<T, E>>());
    }
    if (!iterators.get(calleeStoreKey)!.has(storeKey)) {
      iterators.get(calleeStoreKey)!.set(
        storeKey,
        new CxContinuous({
          storeKey: storeKey,
          indexKey: indexKey,
          nestedIterator: nestedIterator,
          indexOffset: indexOffset,
          indexPrefix: indexPrefix,
        }),
      );
    }
    return iterators.get(calleeStoreKey)!.get(storeKey) as CxContinuous<T, E>;
  } catch (err) {
    throw new CxError(
      __filename,
      "getContinuous()",
      "CTRL-0010",
      `Failed to create Continuous Iterator for ${storeKey}`,
      err,
    );
  }
}

/**
 * Get an iterator for named stored object for a specific callee - the returned iterator will be exclusive to the requesting object ( and it's swarm objects )
 * 
 * @param itorConf              Iterator configuration
 *  callee: string      The Action storage storeName of the action requesting the iterator 
 *  target: string            The store storeName of that you request an iterator for
 *  indexKey: number | string   The id of the index you want an iterator for - this will be prefixed with the indexPrefix (see below) to make up the index storeName
 *  nestedIterator: boolean     If set to true, then each object fetched via the index will in turn be considered a iterable object with a next() that will return these values
 *  continuous: boolean         If set to true, then once the iterator has fetched the last entr, it will call main() on the iterable object to check for more items
 *  indexOffset: number         The index counter for accessing the index - setting this will allow you to traverse the index with an offset  
 *  indexPrefix: string
 * @return Continuous<T,E> | CxIterator<T,E>       An iterator for a list of a given type
 */

export function iteratorFactory<T, E>(
  itorConf: Partial<IteratorConfType>,
): CxContinuous<T, E> | CxIterator<T, E> {
  try {
    if (
      (_.isUndefined(itorConf.callee) ||
        !ctrl.store.has(itorConf.callee as string)) ||
      (_.isUndefined(itorConf.target) ||
        !ctrl.store.has(itorConf.target as string))
    ) {
      throw new Error(
        "Caller must as a minimum supply the name of an existing requesting Action, the name of an existing iterator target Store object.",
      );
    }

    if (
      _.isUndefined(itorConf.indexKey) ||
      (typeof itorConf.indexKey === "number" && itorConf.indexKey === -1)
    ) {
      itorConf.indexKey = ctrl.actions.get(itorConf.callee as string)!
        .getJobId();
    }
    if (_.isUndefined(itorConf.nestedIterator)) itorConf.nestedIterator = false;
    if (_.isUndefined(itorConf.continuous)) itorConf.continuous = false;
    if (_.isUndefined(itorConf.indexOffset)) itorConf.indexOffset = 0;
    if (_.isUndefined(itorConf.indexPrefix)) itorConf.indexPrefix = "J";
    if (itorConf.continuous) {
      return getContinuous<T, E>(
        itorConf.callee!,
        itorConf.target!,
        itorConf.indexKey!,
        itorConf.nestedIterator,
        itorConf.indexOffset!,
        itorConf.indexPrefix!,
      ) as CxContinuous<T, E>;
    } else {
      return getIterator<T, E>(
        itorConf.callee!,
        itorConf.target!,
        itorConf.indexKey!,
        itorConf.nestedIterator,
        itorConf.indexOffset!,
        itorConf.indexPrefix!,
      ) as CxIterator<T, E>;
    }
  } catch (err) {
    throw new CxError(
      __filename,
      "iteratorFactory()",
      "ITOR-0011",
      `Could not create Iterator for ${JSON.stringify(itorConf)}`,
      err,
    );
  }
}

export function deleteIterator(
  obj: Action<any>,
  callee: string,
  target: string,
) {
  try {
    // The master is the last one to leave the swarm party, so it can dispose of the iterator
    if (obj.swarm.isMaster()) {
      iterators.get(callee)?.delete("LoadList");
    }
  } catch (err) {
    throw new CxError(
      __filename,
      "iteratorFactory()",
      "ITOR-0012",
      `Could not dispose of Iterator: ${callee}.${target} `,
      err,
    );
  }
}
