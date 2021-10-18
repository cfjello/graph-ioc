import { Action, bootstrap, injectStubs } from "../cxctrl/mod.ts"
import { ActionConfigType } from '../cxctrl/interfaces.ts'
import { _ } from "../cxutil/mod.ts"

export async function actionFactory<S>(name: string, state: S, stubs: string[] = ['main']): Promise<any> {
    const funcName = stubs[0]
    //
    // Create a new Action class with some function stubs injected
    //
    @injectStubs(stubs)
    class FACTORY_CLASS extends Action<S> {}

    // Set the storeName of the class
    // Object.defineProperty (FACTORY_CLASS.constructor, 'storeName', {value: storeName});

    //
    // Now set some values
    // 
    let actionConfig: ActionConfigType<S> = { 
        name: name,
        init: false,
        state: state as S,
        ctrl: funcName
    }
    return bootstrap( FACTORY_CLASS , actionConfig)
}
