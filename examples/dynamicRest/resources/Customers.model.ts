
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { OrdersType } from './Orders.model.ts'
import { PaymentsType } from './Payments.model.ts'
import { EmployeesType } from './Employees.model.ts'
export type CustomersType = {
	customerNumber: number;
	customerName: string;
	contactLastName: string;
	contactFirstName: string;
	phone: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state?: string;
	postalCode?: string;
	country: string;
	salesRepEmployeeNumber?: number;
	creditLimit?: number;
} // End of customersType
            

@action({
    name: 'Customers',
    state: [] as CustomersType[],
    init: false
  })
export class Customers extends Action<CustomersType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "customers.data");
    getPaymentsRef() : Readonly<CustomersType[]> { return ctrl.getState('Payments') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: CustomersType[] = [] as CustomersType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: CustomersType = {} as CustomersType
            try {
              obj.customerNumber =    +row[0]
              obj.customerName =    row[1].replace(/^['"](.+)['"]$/,'$1')
              obj.contactLastName =    row[2].replace(/^['"](.+)['"]$/,'$1')
              obj.contactFirstName =    row[3].replace(/^['"](.+)['"]$/,'$1')
              obj.phone =    row[4].replace(/^['"](.+)['"]$/,'$1')
              obj.addressLine1 =    row[5].replace(/^['"](.+)['"]$/,'$1')
              obj.addressLine2 =   row[6] === 'NULL' ? undefined : row[6].replace(/^['"](.+)['"]$/,'$1')
              obj.city =    row[7].replace(/^['"](.+)['"]$/,'$1')
              obj.state =   row[8] === 'NULL' ? undefined : row[8].replace(/^['"](.+)['"]$/,'$1')
              obj.postalCode =   row[9] === 'NULL' ? undefined : row[9].replace(/^['"](.+)['"]$/,'$1')
              obj.country =    row[10].replace(/^['"](.+)['"]$/,'$1')
              obj.salesRepEmployeeNumber =   row[11] === 'NULL' ? undefined : +row[11]
              obj.creditLimit =   row[12] === 'NULL' ? undefined : +row[12]
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Customers
