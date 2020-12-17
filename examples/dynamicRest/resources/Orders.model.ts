
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { OrderdetailsType } from './Orderdetails.model.ts'
import { CustomersType } from './Customers.model.ts'
import { parse } from "https://deno.land/std/datetime/mod.ts"
            
export type OrdersType = {
	orderNumber: number;
	orderDate: Date;
	requiredDate: Date;
	shippedDate?: Date;
	status: string;
	comments?: string;
	customerNumber: number;
} // End of ordersType
            

@action({
    name: 'Orders',
    state: [] as OrdersType[],
    init: false
  })
export class Orders extends Action<OrdersType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "orders.data");
    getOrderdetailsRef() : Readonly<OrdersType[]> { return ctrl.getState('Orderdetails') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: OrdersType[] = [] as OrdersType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: OrdersType = {} as OrdersType
            try {
              obj.orderNumber =    +row[0]
              obj.orderDate =    parse( row[1].replace(/^['"](.+)['"]$/,'$1') , "yyyy-MM-dd")
              obj.requiredDate =    parse( row[2].replace(/^['"](.+)['"]$/,'$1') , "yyyy-MM-dd")
              obj.shippedDate =   row[3] === 'NULL' ? undefined : parse( row[3].replace(/^['"](.+)['"]$/,'$1') , "yyyy-MM-dd")
              obj.status =    row[4].replace(/^['"](.+)['"]$/,'$1')
              obj.comments =   row[5] === 'NULL' ? undefined : row[5].replace(/^['"](.+)['"]$/,'$1')
              obj.customerNumber =    +row[6]
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Orders
