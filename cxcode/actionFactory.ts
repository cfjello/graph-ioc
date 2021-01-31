import { Reflect } from "../cxmeta/mod.ts"
import { Action, bootstrap, injectStubs } from "../cxctrl/mod.ts"
import { ActionConfigType } from '../cxctrl/interfaces.ts'
import { _ } from "../cxutil/mod.ts"

// deno-lint-ignore no-explicit-any
// export type Constructor<T = unknown> = new (...args: any[]) => T;



export async function actionFactory<S>(name: string, state: S, stubs: string[] = ['main']): Promise<any> {
    const funcName = stubs[0]
    //
    // Create a new Action class with some function stubs injected
    //
    @injectStubs(stubs)
    class FACTORY_CLASS extends Action<S> {}

    // Set the name of the class
    // Object.defineProperty (FACTORY_CLASS.constructor, 'name', {value: name});

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
