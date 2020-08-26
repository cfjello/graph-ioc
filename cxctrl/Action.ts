import * as ctrl from "./Ctrl.ts"
import { jobIdSeq } from "./generators.ts"
import isUndefined from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import uniq from "https://raw.githubusercontent.com/lodash/lodash/master/uniq.js"
import union from "https://raw.githubusercontent.com/lodash/lodash/master/union.js"
// import cloneDeep from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
// import merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"
import { Mutex }    from "../cxutil/Mutex.ts"
import { ActionDescriptor } from "./ActionDescriptor.ts"
import { StateKeys } from "./interfaces.ts"

export abstract class Action<S> { 
    //
    // member variables
    //
    public currActionDesc: ActionDescriptor = {} as ActionDescriptor
    /**
     * State is the data that the action will eventually publish for other actions to read
     */
    public state: S & StateKeys  = {} as S & StateKeys

    /**
     * The common Name of both the action and the state data object in the store
     */
    public name: string = ''
    /**
     * The name of the controller Function to call within the action instance
     */
    public funcName: any;

    /**
     * Class name of action
     */
    public className: string = ''

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
        ctrl.addDependencies( this.name, this.dependencies )
        return this.dependencies
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
    protected _cnt_: number = 0
    register = async(): Promise<any> => { 
        let self = this
        ctrl.initCounts.set(this.name, ctrl.initCounts.has( this.name ) ? ctrl.initCounts.get(this.name)! + 1 : 1 )
        let _cnt_ = ctrl.initCounts.get(this.name)

        await ctrl.addAction( this as Action<any>,  _cnt_ )
        // this.state.jobId = this.currActionDesc.jobId
        // this.state.taskId = this.currActionDesc.taskId
        // this.state.storeId = this.currActionDesc.storeId

        return new Promise<Action<S>>( function(resolve) { resolve( self ) })
    }

    
    __exec__ctrl__function__  = async (actionDesc: ActionDescriptor): Promise<any> => {
        let self = this
        let lock = `${actionDesc.name}_run`
        let res = false
        try {
            // The same async object should always execute sequencially 
            Mutex.doAtomic( lock , async () => {
                self.currActionDesc = actionDesc
                let res = (this as any)[this.funcName]()
                // actionDesc.storeId = ctrl.store.getStoreId(actionDesc.name)
            })
        }
        catch(err) {
            throw new Error(`Action.__exec__ctrl__function__  failed to call ${this.className}.${this.funcName}`)
        }
        finally {
            Promise.resolve(res as boolean)
        }
    }
    
    /**
     * Ping  of action - small test function
     */
    ping = () => 'action decorator ping() has been called'
}