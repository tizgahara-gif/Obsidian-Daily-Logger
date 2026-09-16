#!/usr/bin/env node
import { loadConfig } from "./config.js";
import { resolveDate } from "./time.js";
import { summarizeDate, summarizeScheduled } from "./summarizer.js";

async function main(){
  const [command,...args]=process.argv.slice(2);
  const scheduled=args.includes("--scheduled"),idx=args.indexOf("--date");
  if(command!=="summarize"||scheduled&&idx>=0||!scheduled&&idx<0)throw new Error("Usage: odl summarize (--scheduled | --date today|yesterday|YYYY-MM-DD)");
  const cfg=await loadConfig();
  const result=scheduled
    ?await summarizeScheduled(cfg)
    :await summarizeDate(resolveDate(args[idx+1]||"",cfg.timezone,cfg.summary.dayBoundaryHour),cfg);
  process.stdout.write(`${result.status}${result.path?` ${result.path}`:""}\n`);
}
main().catch(e=>{process.stderr.write(`${(e as Error).message}\n`);process.exitCode=1});
