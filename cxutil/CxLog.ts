import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts"
// import { getMac } from 'https://cdn.depjs.com/mac/mod.ts'
import { _ } from '../cxutil/lodash.ts'

export type ErrLogType = {
  level: string,
  // mac:   string, 
  date:  string , 
  msg:   string, 
  args:  any[] 
}

/**
* Logger Singleton that can be imported across modules in a project
* Logger to be imported across modules in a project
**/
const __dirname = path.dirname( path.fromFileUrl(new URL('.', import.meta.url)) )
export const $logDir: string = path.resolve(`${__dirname}/logs`)

// let mac = (await getMac() as string).replace(/:/g,'')
        // you can change format of output message using any keys in `LogRecord`
        // formatter: "{levelName} {msg}",

await log.setup({
    handlers: {
      console:  new log.handlers.ConsoleHandler("INFO", {
        formatter: (logRecord) => {
          let msgJSON = logRecord.msg.match(/^\s*\{.*/) ? logRecord.msg : `{ "message": ${logRecord.msg}" }`
          let msg = JSON.parse( msgJSON )  
          let logEntry = _.merge ({ 
            level: logRecord.levelName, 
            date: logRecord.datetime.toISOString().replace(/[TZ\-:]/g , '')   , 
          }, msg )       
          return `${JSON.stringify(logEntry, undefined, 2 )!}` as string
        }
      }),
      ctrlFile: new log.handlers.FileHandler("DEBUG", {
        filename: path.resolve(`${$logDir}/ctrl.log`),
        mode: 'w',
        formatter: (logRecord) => {
          let dateEntry = logRecord.datetime.toISOString().replace(/[TZ\-:]/g , '')
          let msgJSON = logRecord.msg.match(/^\s*\{.*/) ? logRecord.msg : `{ "message": "${logRecord.msg}" }`
          let msg = JSON.parse( msgJSON )
          let logEntry = _.merge ( { 
            level: logRecord.levelName,
            // mac: mac, 
            date: dateEntry, 
          }, msg )       
          return `${JSON.stringify(logEntry)!}` as string
        }
      }),
      optimizeFile: new log.handlers.FileHandler("INFO", {
        filename: path.resolve(`${$logDir}/optimize.log`),
        mode: 'w',
        formatter: (optimizeRecord)  => {
          let dateEntry = optimizeRecord.datetime.toISOString().replace(/[TZ\-:]/g , '')
          let msgJSON = optimizeRecord.msg.match(/^\s*\{.*/) ? optimizeRecord.msg : `{ "message": "${optimizeRecord.msg}" }`
          let msg = JSON.parse( msgJSON )
          let logEntry  = _.merge ( { 
            level: optimizeRecord.levelName,
            date: dateEntry 
          }, msg )
          return `${JSON.stringify(logEntry)}`
        }
      }),
      perfFile: new log.handlers.FileHandler("INFO", {
        filename: path.resolve(`${$logDir}/perf.log`),
        mode: 'w',
        formatter: (perfRecord)  => {
          let dateEntry = perfRecord.datetime.toISOString().replace(/[TZ\-:]/g , '')
          let msg = JSON.parse(perfRecord.msg)
          let logEntry  = _.merge ( { 
            level: perfRecord.levelName,
            // mac: mac, 
            date: dateEntry 
          }, msg )
          return `${JSON.stringify(logEntry)}`
        }
      }),
    },
  
    loggers: {
      // configure default logger available via short-hand methods above
      default: {
        level: "DEBUG",
        handlers: ["console", "ctrlFile" ],
      },
      perf: {
        level: "INFO",
        handlers: ["perfFile"],
      },
      optimize: {
        level: "INFO",
        handlers: ["optimizeFile"],
      }
    },
  });
  
  let logger;
  
  // get default loggers
export const $log  = log.getLogger();
export const $plog = log.getLogger('perf');
export const $olog = log.getLogger('optimize');
