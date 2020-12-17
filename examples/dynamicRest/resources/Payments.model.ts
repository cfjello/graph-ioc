
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { CustomersType } from './Customers.model.ts'
import { parse } from "https://deno.land/std/datetime/mod.ts"
            
export type PaymentsType = {
	customerNumber: number;
	checkNumber: string;
	paymentDate: Date;
	amount: number;
} // End of paymentsType
            

@action({
    name: 'Payments',
    state: [] as PaymentsType[],
    init: false
  })
export class Payments extends Action<PaymentsType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "payments.data");
    getCustomerRef() : Readonly<CustomersType> { return ctrl.getState('Customers') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: PaymentsType[] = [] as PaymentsType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: PaymentsType = {} as PaymentsType
            try {
              obj.customerNumber =    +row[0]
              obj.checkNumber =    row[1].replace(/^['"](.+)['"]$/,'$1')
              obj.paymentDate =    parse( row[2].replace(/^['"](.+)['"]$/,'$1') , "yyyy-MM-dd")
              obj.amount =    +row[3]
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Payments
