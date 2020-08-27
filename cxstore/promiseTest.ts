
import { delay } from "https://raw.githubusercontent.com/denoland/deno/std/0.59.0/std/async/delay.ts"

function turnIntoNumber(str:string) : Promise<number> {
    return new Promise(async (resolve, reject) => {
      await delay(1000)
      let shouldbeNumber : number =  Number(str) + 1;
      resolve(shouldbeNumber);
    });
  }
turnIntoNumber('12').then ( (res ) => console.log(res))


async function turnIntoNumber2(str:string) : Promise<number> {
    let res = 0
    await new Promise((resolve, reject) => {
      let shouldbeNumber : number =  Number(str) + 1;
      res = shouldbeNumber
    })
    return res
  }

let res = 0

await turnIntoNumber('13').then( (_res) => {
    res = _res
})

console.log( res)

res = await turnIntoNumber('27')
console.log( res)