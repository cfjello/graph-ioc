
import * as path from "https://deno.land/std@0.74.0/path/mod.ts"
import {ctrl, Action, action} from "../../../cxctrl/mod.ts"
import { ee } from "../../../cxutil/mod.ts"
            
import { ProductsType } from './Products.model.ts'
export type ProductlinesType = {
	productLine: string;
	textDescription?: string;
	htmlDescription?: string;
	image?: any;
} // End of productlinesType
            

@action({
    name: 'Productlines',
    state: [] as ProductlinesType[],
    init: false
  })
export class Productlines extends Action<ProductlinesType[]> {
    self = this
    filePath = path.resolve(ctrl.__dirname  + "/examples/dynamicRest/resources/" + "productlines.data");
    getProductsRef() : Readonly<ProductlinesType[]> { return ctrl.getState('Products') }

    populate( _filePath: string = this.filePath ) { 
        let dataArr = Deno.readTextFileSync(_filePath).split('\n')
        let jsonData: ProductlinesType[] = [] as ProductlinesType[]
        dataArr.forEach(  (_row, idx ) => {
            let row = _row.split(',')
            let obj: ProductlinesType = {} as ProductlinesType
            try {
              obj.productLine =    row[0].replace(/^['"](.+)['"]$/,'$1')
              obj.textDescription =   row[1] === 'NULL' ? undefined : row[1].replace(/^['"](.+)['"]$/,'$1')
              obj.htmlDescription =   row[2] === 'NULL' ? undefined : row[2].replace(/^['"](.+)['"]$/,'$1')
              obj.image =   row[3] === 'NULL' ? undefined : row[3]
              this.state.push(obj) 
            }
            catch(e)  { console.log(e) }
        }) // End of dataArr.forEach
    } // End of populate

    main() {
        this.populate()
        this.publish()
    } // End of main
} // End of Productlines
