import * as ctrl from "./Ctrl.ts"
import { jobIdSeq } from "./generators.ts"
// import * as _ from "https://deno.land/x/lodash@4.17.19/lodash.js"
// import isUndefined from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import uniq from "https://raw.githubusercontent.com/lodash/lodash/master/uniq.js"
import union from "https://raw.githubusercontent.com/lodash/lodash/master/union.js"
// import cloneDeep from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
// import merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"
import { Mutex, ee, CxError }    from "../cxutil/mod.ts"
import { ActionDescriptor } from "./ActionDescriptor.ts"
import { MetaType, StateKeys } from "./interfaces.ts"

export abstract class Action<S> { 

    constructor() {
        // console.log('Running Action Constructor')
    }
    //
    // member variables
    //
    public currActionDesc: ActionDescriptor = {} as ActionDescriptor

    /**
     * State is the data that the action will eventually publish for other actions to read
     */
    public state: S & StateKeys  = {} as S & StateKeys

     /**
     * Meta is the meta-data this object and action
     */
    public meta: MetaType = {} as MetaType


    /**
     * The list og other object that this action instance and its state depends on
     */
    public dependencies:   string[] = []

    //
    // member functions 
    //
    /**
     * Set dependencies of action
     * 
     * @param args An array of name dependencies for this action instance
     * @return The same list if succesful
     */
    setDependencies = (... args: string[] ): string [] => { 
        this.dependencies = uniq( union( this.dependencies, args ) ) 
        ctrl.addDependencies( this.meta.name!, this.dependencies )
        return this.dependencies
    }

    /**
     * Get a Map to named child states of a given run ( with the same jobId)
     * 
     * @param storeName The name of the store object 
     * @param idx The index of the requested state in the list of immutable stored states, -1 defualt returns the most recently published (current) state
     * @returns A copy of the state 
     */
    getChildState = (storeName: string ): S & StateKeys | undefined  => {
        return ctrl.store.getIndexState(storeName, this.state.jobId ) as S & StateKeys
    }

    /**
     * Get a copy of the state of a named action
     * 
     * @param storeName The name of the store object 
     * @param idx The index of the requested state in the list of immutable stored states, -1 defualt returns the most recently published (current) state
     * @returns A copy of the state 
     */
    getState = (storeName: string, idx: number = -1 ): any => {
        return ctrl.getState(storeName, idx) as S & StateKeys
    }

    /** 
     * Publish the changed state 
    */
    publish = (): void => {
        let self = this
        ctrl.publish( this as unknown as Action<any> )
    }
    
    /** 
    * Register the Action Object
    */

    register = async(): Promise<any> => { 
        let self = this
        let name = this.meta.name! as string
        ctrl.initCounts.set( name, ctrl.initCounts.has( name ) ? ctrl.initCounts.get(name)! + 1 : 1 )
        let _cnt_ = ctrl.initCounts.get(name)
        await ctrl.addAction( this as Action<any>, _cnt_ )
        // return .then( (resolve) { resolve( self ) } )
        return new Promise<Action<S>>( function(resolve) { resolve( self ) })
    }

    __exec__ctrl__function__  = async (actionDesc: ActionDescriptor): Promise<any> => {
        let self = this
        let lock = `${actionDesc.name}_run`
        
        // The same async object should always execute sequencially 
        Mutex.doAtomic( lock , async () => {
            try {
                self.currActionDesc = actionDesc
                await (this as any)[self.meta.funcName!]()
            }
            catch(err) {
                throw new CxError('Action.ts', '__exec__ctrl__function__', 'ACT-0001', `Failed to call ${self.meta.className}.${self.meta.funcName}`, err)
            }
        })
        return Promise.resolve(true)
    }
    
    /**
     * Ping  of action - small test function
     */
    ping = () => 'action decorator ping() has been called'
}