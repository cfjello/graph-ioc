import { defineStateTypes, defineObjectTypes, Reflect } from "../../cxmeta/mod.ts"
import { actionFactory } from "../mod.ts"
import { expect }  from 'https://deno.land/x/expect/mod.ts'

{
    type EmployeesType = {
        recId: Symbol,
        employeeNumber: bigint;
        lastName: string;
        firstName: string;
        extension: string;
        email: string;
        officeCode: string | undefined;
        reportsTo?: number | null;
        jobTitle: string;
        hired: Date;
        active: boolean;
        regexp: RegExp,
        tools: string[],
        error: Error,
        infinit: any;
        nan: any;
    } // End of employeesType

    let employee: EmployeesType = {
        recId: Symbol('REC-ID'),
        employeeNumber: BigInt(9007199254740991),
        lastName: "Hope",
        firstName: "Bob",
        extension: "A",
        email: "bob.hope@heaven.com",
        officeCode: undefined,
        reportsTo: null,
        jobTitle: "BS Manager",
        hired: new Date(2018, 11, 24, 10, 33, 30, 0),
        active: true,
        regexp: /^.*XXX.*$/,
        tools: ['pen', 'table', 'laptop'],
        error: new Error('Assigning blame'),
        infinit: Infinity,
        nan: NaN
    }

    let empInst = await actionFactory( 'Emp' , employee, [ 'main', 'init' ] )

    Deno.test ({
        name: '06 - ActionFactory: Creation and naming should be correct',  
        fn: async () => { 
            expect(empInst.meta.className).toEqual('Emp')
            expect(empInst.constructor.name).toEqual('FACTORY_CLASS')
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test ({
        name: '06 - ActionFactory: function stubs should have been injected',  
        fn: async () => { 
            expect(typeof empInst.main).toEqual('function')
            expect(typeof empInst.init).toEqual('function')
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test ({
        name: '06 - ActionFactory: function stubs can be overwritten',  
        fn: async () => { 
            empInst.main = function () {
                this.update( { lastName: "noHope", email: "bob.hope@hell.com"  })
                this.publish()
            }
            
            empInst.init = function( employee: EmployeesType ) {
                this.state = employee
                defineStateTypes('EmployeesType', this)
            }
            expect(typeof empInst.main).toEqual('function')
            expect(typeof empInst.init).toEqual('function')
        },
        sanitizeResources: false,
        sanitizeOps: false
    })

    Deno.test ({
        name: '06 - ActionFactory: class variables can be added',  
        fn: async () => { 
            empInst['counter'] = 0 as number
            empInst['show'] = function() {
                return `counter is: ${++empInst.counter}`
            }
            expect(typeof empInst.counter).toEqual('number')
            expect(++empInst.counter).toEqual(1)

            expect(empInst.show()).toEqual('counter is: 2')
        },
        sanitizeResources: false,
        sanitizeOps: false
    })
}
