import * as Ctrl from "./Ctrl.ts"
import isUndefined from "https://deno.land/x/lodash/isUndefined.js"
import uniq from "https://deno.land/x/lodash/uniq.js"
import union from "https://deno.land/x/lodash/union.js"

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
        Ctrl.addDependencies( this.name, this.dependencies )
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
        return Ctrl.getState(storeName, idx) as S
    }

    /** 
     * Publish the changed state 
    */
    publish = (): void => {
        let self = this
        Ctrl.publish(this as Action<any>)
        .then (() => {
            self._storeId = Ctrl.store.getStoreId(self.className)
        })
    }

    /**
     * Ping  of action - small test function
     */
    ping = () => 'action decorator ping() has been called'
}