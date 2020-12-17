import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts"
import { getMac } from 'https://cdn.depjs.com/mac/mod.ts'
import { LogRecord } from "https://deno.land/std@0.79.0/log/logger.ts";
import  merge from "https://raw.githubusercontent.com/lodash/lodash/master/merge.js"

export type ErrLogType = {
  level: string,
  mac:   string, 
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

let mac = (await getMac() as string).replace(/:/g,'')
        // you can change format of output message using any keys in `LogRecord`
        // formatter: "{levelName} {msg}",

// let logFmt = "[{levelName}] § {datetime} § {msg}"

let logFormat =  (logRecord: LogRecord)  => {
  let dateEntry = logRecord.datetime.toISOString().replace(/[TZ\-:]/g , '')
  let logEntry: ErrLogType = { 
    level: logRecord.levelName,
    mac: mac, 
    date: dateEntry, 
    msg: logRecord.msg, 
    args: logRecord.args 
  }
  return `${JSON.stringify(logEntry)}`
}

await log.setup({
    handlers: {
      console:  new log.handlers.ConsoleHandler("DEBUG"),
      ctrlFile: new log.handlers.FileHandler("DEBUG", {
        filename: path.resolve(`${$logDir}/ctrl/ctrl.log`),
        mode: 'a',
        formatter: (logRecord: LogRecord)  => {
          let dateEntry = logRecord.datetime.toISOString().replace(/[TZ\-:]/g , '')
          let logEntry: ErrLogType = { 
            level: logRecord.levelName,
            mac: mac, 
            date: dateEntry, 
            msg: logRecord.msg, 
            args: logRecord.args 
          }
          return `${JSON.stringify(logEntry)}`
        }
      }),
      perfFile: new log.handlers.FileHandler("INFO", {
        filename: path.resolve(`${$logDir}/perf/perf.log`),
        mode: 'a',
        formatter: (perfRecord )  => {
          let dateEntry = perfRecord.datetime.toISOString().replace(/[TZ\-:]/g , '')
          let msg = JSON.parse(perfRecord.msg)
          let logEntry  = merge ( { 
            level: perfRecord.levelName,
            mac: mac, 
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
      }
    },
  });
  
  let logger;
  
  // get default loggers
export const $log  = log.getLogger();
export const $plog = log.getLogger('perf');

/*
// get default logger
logger = log.getLogger();
logger.debug("fizz"); // logs to `console`, because `file` handler requires "WARNING" level
logger.warning(41256); // logs to both `console` and `file` handlers

$log.debug("fizz from $log"); // logs to `console`, because `file` handler requires "WARNING" level
$log.warning(41256 + " from $log"); // logs to both `console` and `file` handlers

*/