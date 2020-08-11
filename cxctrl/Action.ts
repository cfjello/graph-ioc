import * as ctrl from "./Ctrl.ts"
import isUndefined from "https://raw.githubusercontent.com/lodash/lodash/master/isUndefined.js"
import uniq from "https://raw.githubusercontent.com/lodash/lodash/master/uniq.js"
import union from "https://raw.githubusercontent.com/lodash/lodash/master/union.js"
// import cloneDeep from "https://raw.githubusercontent.com/lodash/lodash/master/cloneDeep.js"
// import merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"
import { ActionDescriptor } from "./ActionDescriptor.ts"

export abstract class Action<S> { 
    //
    // member variables
    //
    /**
     * State is the data that the action will eventually publish for other actions to read
     */
    public state: S = {} as S

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
     * Store id for the state data object within the store
    */
    public _storeId: number = -100

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
        return ctrl.getState(storeName, idx) as S
    }

    /** 
     * Publish the changed state 
    */
    publish = (): void => {
        let self = this
        ctrl.publish(this as unknown as Action<any>)
        .then (() => {
            self._storeId = ctrl.store.getStoreId(self.className)
        })
    }
    
    /** 
    * Register the Action Object
    */
    private __cnt__ = 0
    register = async(): Promise<any> => { 
        let self = this
        await ctrl.addAction( this as Action<any>, ++this.__cnt__ )
        return new Promise<Action<S>>( function(resolve) {
            resolve( self )
        })
    } 

    
    __exec__ctrl__function__  = async (actionDesc: ActionDescriptor): Promise<any> => {
        try {
            let res = (this as any)[this.funcName]().then( (res:boolean)  => {
                actionDesc.storeId = ctrl.store.getStoreId(actionDesc.name)
                Promise.resolve(res as boolean)
            })
        }
        catch(err) {
            throw new Error(`Action.__exec__ctrl__function__  failed to call ${this.className}.${this.funcName}`)
        }
    }
    
    /**
     * Ping  of action - small test function
     */
    ping = () => 'action decorator ping() has been called'
}