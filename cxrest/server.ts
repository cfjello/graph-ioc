import { Application } from "https://deno.land/x/oak/mod.ts";
import router from "./routes.ts";


export let startServer = async ( port: number = 9999) => {
    const app = new Application()

    app.use(router.routes());
    app.use(router.allowedMethods())

    console.log(`Server running on port ${port}`)

    app.listen({ port })
}