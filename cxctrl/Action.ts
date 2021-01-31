import * as ctrl from "./Ctrl.ts"
import uniq from "https://raw.githubusercontent.com/lodash/lodash/master/uniq.js"
import union from "https://raw.githubusercontent.com/lodash/lodash/master/union.js"
import merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"
import isEmpty from "https://raw.githubusercontent.com/lodash/lodash/master/isEmpty.js"

import { Mutex, ee, CxError }    from "../cxutil/mod.ts"
import { ActionDescriptor } from "./interfaces.ts"
import { MetaType, StateKeys } from "./interfaces.ts"

export abstract class Action<S> { 
    
    constructor(  state: S = {} as S) {
        if ( ! isEmpty(state) ) {
            this.state = merge( state , { jobId: -1, taskId: -1 } ) 
            this.stateInit = true
        }
    }
    //
    // member variables
    //
    public currActionDesc: ActionDescriptor = {} as ActionDescriptor

    /**
     * State is the data that the action will eventually publish for other actions to read
     */
    public state: S & StateKeys  = {} as S & StateKeys
    public stateInit: boolean = false

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
     * Update the state using a Partial type - this allows you to supply an Partil object that only contains the properties you want to update
     * @param updState A Partial version of the state object, only containing the updates
    */
    update = ( updState: Partial<S> ): void  => {
        try {
            this.state = merge(this.state, updState)
        }
        catch ( err ) {
            throw new CxError('Action.ts', 'update', 'ACT-0002', `Failed to update ${this.meta.className}.state`, err)
        }
    }

    /** 
     * Publish the changed state 
    */
    publish = (): void => {
        ctrl.publish( this as unknown as Action<any> )
    }
    
    /** 
    * Register the Action Object
    *
    * @param storeName The name of the store object 
    * @returns The reference itself
    */

    register = async( name: string = this.meta.name as string ): Promise<any> => { 
        let self = this
        if ( name !== this.meta.name ) this.meta.name = name 

        ctrl.initCounts.set( name, ctrl.initCounts.has( name ) ? ctrl.initCounts.get(name)! + 1 : 1 )
        let _cnt_ = ctrl.initCounts.get(name)
        await ctrl.addAction( this as Action<any>, _cnt_ )
        return new Promise<Action<S>>( function(resolve) { resolve( self ) })
    }

    __exec__ctrl__function__  = async (actionDesc: ActionDescriptor): Promise<any> => {
        let self = this
        let lock = `${actionDesc.name}_run`
        let res = false
        
        // The same async object should always execute sequencially 
        await Mutex.doAtomic( lock , async () => {
            try {
                self.currActionDesc = actionDesc
                res = await (this as any)[self.meta.funcName!]()
            }
            catch(err) {
                throw new CxError('Action.ts', '__exec__ctrl__function__', 'ACT-0001', `Failed to call ${this.meta.className}.${self.meta.funcName}`, err)
            }
        })
        return Promise.resolve(res)
    }
    
    /**
     * Ping  of action - small test function
     */
    ping = () => 'action decorator ping() has been called'
}