import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { expect }  from "https://deno.land/x/expect/mod.ts"
import { startServer } from "../../cxrest/server.ts"
        
import { ProductsType, Products } from './Products.model.ts'
import { ProductlinesType, Productlines } from './Productlines.model.ts'
import { PaymentsType, Payments } from './Payments.model.ts'
import { OrdersType, Orders } from './Orders.model.ts'
import { OrderdetailsType, Orderdetails } from './Orderdetails.model.ts'
import { OfficesType, Offices } from './Offices.model.ts'
import { EmployeesType, Employees } from './Employees.model.ts'
import { CustomersType, Customers } from './Customers.model.ts'

export let productsInst = await new Products().register()
export let productlinesInst = await new Productlines().register()
export let paymentsInst = await new Payments().register()
export let ordersInst = await new Orders().register()
export let orderdetailsInst = await new Orderdetails().register()
export let officesInst = await new Offices().register()
export let employeesInst = await new Employees().register()
export let customersInst = await new Customers().register()

ctrl.graph.addTopNode('T')
let promiseChainT = ctrl.getPromiseChain('T')
promiseChainT.run()
let actionStates = [
    "Products",
    "Productlines",
    "Payments",
    "Orders",
    "Orderdetails",
    "Offices",
    "Employees",
    "Customers",
]

Deno.test ({  
    name: 'The Application classes should be registered and have data loaded', 
    fn: () => {
        actionStates.forEach(element => {
            console.log('Checking: ' + element)
            expect(ctrl.store.isRegistered(element)).toBeTruthy()
            let state: any[] = ctrl.store.get(element) as any[]
            console.log(element + '.state has ' + state.length + ' rows')
            expect(state.length).toBeGreaterThan(6)
        });
    },
    sanitizeResources: false,
    sanitizeOps: false       
})

startServer()
