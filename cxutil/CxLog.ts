// import Logger from "https://deno.land/x/logger@v1.0.0/logger.ts"
import * as log from "https://deno.land/std/log/mod.ts";
import { perf } from "./mod.ts";

/**
* Logger Singleton that can be imported across modules in a project

const $logDir: string = '../logs'
export  { $logDir }

const $log = new Logger();
await $log.initFileLogger( '../logs/ctrl', { rotate: true } )
$log.enableConsole()
export { $log }

const $plog = new Logger();
await $plog.initFileLogger( '../logs/perf', { rotate: true } )
export { $plog }
*/
/**
* Logger to be imported across modules in a project
**/
export const $logDir: string = '../logs'

        // you can change format of output message using any keys in `LogRecord`
        // formatter: "{levelName} {msg}",

await log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler("DEBUG"),
      ctrlFile: new log.handlers.FileHandler("DEBUG", {
        filename: `${$logDir}/ctrl/ctrl.log`
      }),

      perfFile: new log.handlers.FileHandler("INFO", {
        filename: `${$logDir}/perf/perf.log`
      }),
    },
  
    loggers: {
      // configure default logger available via short-hand methods above
      ctrl: {
        level: "INFO",
        handlers: ["ctrlFile"],
      },
      perf: {
        level: "INFO",
        handlers: ["perfFile"],
      }
    },
  });
  
  let logger;
  
  // get default logger
export const $log  = log.getLogger('ctrl');
export const $plog = log.getLogger('perf');