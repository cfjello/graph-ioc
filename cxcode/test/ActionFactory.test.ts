import { defineStateTypes, defineObjectTypes, Reflect } from "../../cxmeta/mod.ts"
import { actionFactory } from "../mod.ts"
import { expect }  from 'https://deno.land/x/expect/mod.ts'

export type EmployeesType = {
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

/*
Emp.main = function () {
    this.update( { lastName: "noHope", email: "bob.hope@hell.com"  })
    this.state.lastName = "noHope"
    this.
    this.publish()
}


*/ 

Deno.test ('01 - ActionFactory: Creation and naming should be correct',  async () => { 
    expect(empInst.meta.className).toEqual('Emp')
    expect(empInst.constructor.name).toEqual('FACTORY_CLASS')
})

Deno.test ('02 - ActionFactory: function stubs should have been injected',  async () => { 
    expect(typeof empInst.main).toEqual('function')
    expect(typeof empInst.init).toEqual('function')
})

empInst.main = function () {
    this.update( { lastName: "noHope", email: "bob.hope@hell.com"  })
    this.publish()
}

empInst.init = function( employee: EmployeesType ) {
    this.state = employee
    defineStateTypes('EmployeesType', this)
}


