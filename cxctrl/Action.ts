import { ctrl } from "./mod.ts"
import { Mutex, ee, CxError, _ }    from "../cxutil/mod.ts"
import { RunIntf , ActionDescriptor } from "./interfaces.ts"
import { MetaType, StateKeys } from "./interfaces.ts"
import { StoreEntry } from "../cxstore/interfaces.ts"

export abstract class Action<S> { 
    
    constructor(  state: S = {} as S) {
        if ( ! _.isEmpty(state) ) {
            this.state = state 
            this.stateInit = true
        }
    }
    //
    //
    //
    // private static iterators - TODO implement this to be shared among bootstrapped master and swarm objects
    // 
    //
    // member variables
    //
    public currActionDesc: ActionDescriptor = {} as ActionDescriptor

    /*
    public getCollection( jobId: number | undefined, dataOnly: true ): Map<string, any>{
        try {
            if ( _.isUndefined( jobId ) ) {
                jobId = this.currActionDesc.jobId
            }
            return ctrl.store.getCollection(jobId!, undefined, dataOnly)
        }
        catch( err ) {
            throw new CxError('Action.ts', 'getCollection', 'ACT-0001', `Failed to fetch collection for  ${jobId}`, err)
        }
    }
    */ 

    /**
     * State is the data that the action will eventually publish for other actions to read
     */
    public state: S = {} as S 
    public stateInit: boolean = false

     /**
     * Meta is the meta-data this object and action
     */
    public meta: MetaType = {} as MetaType
    
    /**
     * Check if this Action object has a Swarm of child objects doing the work
     * 
     * @return boolean True if this object has a swarm of children
     */
    isSwarmMaster = () => !_.isUndefined(this.meta.swarmChildren) && this.meta.swarmChildren!.length > 0 

    //
    // member functions 
    //
    /**
     * Set the dependencies of this action
     * 
     * @param args An array of name dependencies for this action instance
     * @return The same list if succesful
     */
    setDependencies = (... args: string[] ): string [] => { 
        let dependencies = _.uniq( args ) 
        ctrl.addDependencies( this.meta.name!, dependencies )
        return dependencies
    }

    /**
     * Get a Map to named child states of a given run ( with the same jobId)
     * 
     * @param storeName The name of the store object 
     * @param idx The index of the requested state in the list of immutable stored states, -1 defualt returns the most recently published (current) state
     * @returns A copy of the state 
     */
    getChildState = (storeName: string ): StoreEntry<S>[] | undefined  => {
        return ctrl.store.getIndexState(storeName, this.currActionDesc.jobId ) as StoreEntry<S>[]
    }

    /**
     * Get a copy of the state of a named action
     * 
     * @param storeName The name of the store object 
     * @param idx The index of the requested state in the list of immutable stored states, -1 defualt returns the most recently published (current) state
     * @returns A copy of the state 
     */
    getState = (storeName: string, idx: number = -1, dataOnly: boolean = true ): StoreEntry<S> | S => {
        if ( dataOnly )
            return ctrl.getState(storeName, idx, dataOnly) as S
        else 
            return ctrl.getState(storeName, idx, dataOnly) as StoreEntry<S>
    }

     /** 
     * Run the promise chain for this controlled object
     * @return RunIntf  The promise chain RunIntf instance that has been executed
    */
   run = async (): Promise<RunIntf>   => {
    try {
        let promiseChain = ctrl.getPromiseChain(this.meta.name!)
        await promiseChain.run()
        return Promise.resolve(promiseChain)
    }
    catch ( err ) {
        throw new CxError('Action.ts', 'run',  'ACT-0004', `Failed to run ${this.meta.name} promise chain`, err)
    }
}
    /** 
     * Update the state using a Partial type - this allows you to supply an Partial object that only contains the properties you want to update
     * @param updState A Partial version of the state object, only containing the updates
    */
    update = ( updState: Partial<S> ): void  => {
        try {
            if (! _.isArray(this.state) ) {
                this.state = _.merge(this.state, updState)
            }
        }
        catch ( err ) {
            throw new CxError('Action.ts', 'update', 'ACT-0002', `Failed to update ${this.meta.name}.state`, err)
        }
    }

    /** 
     * Publish the changed state 
    */
    publish = () => {
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
        
        if ( name !== this.meta.name ) { 
            // This is a rename instance and we should not publish it's initial state to the store
            this.meta.name = name 
            this.meta.init = false   
        }

        ctrl.initCounts.set( name, ctrl.initCounts.has( name ) ? ctrl.initCounts.get(name)! + 1 : 1 )
        let _cnt_ = ctrl.initCounts.get(name)
        await ctrl.addAction( this as Action<S>, _cnt_ )
        return Promise.resolve(self)
    }

    __exec__ctrl__function__  = async (actionDesc: ActionDescriptor): Promise<any> => {
        let self = this
        let lock = `${actionDesc.name}_run`
        let res = false
        
        // The same async object should always execute sequencially 
        await Mutex.doAtomic( lock , async () => {
            try {
                self.currActionDesc = actionDesc
                // if ( this.isSwarmMaster() ) {
                //     res = true // Don't run, since the swarm children already been executed
                // }
                // else {
                    res = await (this as any)[self.meta.funcName!]()
                // }
            }
            catch(err) {
                throw new CxError('Action.ts', '__exec__ctrl__function__', 'ACT-0003', `Failed to call ${this.meta.className}.${self.meta.funcName}`, err)
            }
        })
        return Promise.resolve(res)
    }
    
    /**
     * Ping  of action - small test function
     */
    ping = () => 'action decorator ping() has been called'
}