function turnIntoNumber(str:string) : Promise<number> {
    return new Promise((resolve, reject) => {
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