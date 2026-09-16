import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { dailySummarySchema, type Config, type DailySummary } from "../../shared/src/schemas.js";
import { dataRoot } from "./config.js";
import { loadDailyInput } from "./daily-log.js";
import { summaryToMarkdown } from "./markdown.js";
import { writeDailyNote } from "./obsidian.js";
import { OpenAIProvider } from "./providers/openai.js";
import type { SummaryProvider } from "./providers/provider.js";
import { atomicJson } from "./storage.js";
import { logicalDate } from "./time.js";

interface SummaryState { date:string; status:"success"; generated_at:string }
interface ActivityInfo { exists:boolean; lastActivityAt:number }
const dateFile=/^(\d{4}-\d{2}-\d{2})\.jsonl$/;

async function jsonl(directory:string,date:string):Promise<Record<string,unknown>[]>{
  try{return (await readFile(path.join(dataRoot(),"data",directory,`${date}.jsonl`),"utf8")).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line) as Record<string,unknown>)}
  catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return[];throw e}
}
function timestamp(value:unknown):number{return typeof value==="string"?Date.parse(value):Number.NaN}
function latestTimestamp(value:Record<string,unknown>):number{
  return Math.max(...["imported_at","updated_at","last_seen_at","first_seen_at","created_at","captured_at","detected_at"].map(key=>timestamp(value[key])).filter(Number.isFinite),0);
}
async function activityInfo(date:string):Promise<ActivityInfo>{
  const events=await jsonl("events",date);
  const active=events.filter(event=>event.baseline!==true&&event.activity_classification!=="baseline"&&(
    event.activity_classification==="active"||event.activity_classification==="manual_import"||event.type==="message_seen"||event.type==="message_updated"
  ));
  const notes=(await jsonl("manual-notes",date)).filter(note=>typeof note.content==="string"&&note.content.trim().length>0);
  const records=[...active,...notes];
  return{exists:records.length>0,lastActivityAt:Math.max(...records.map(latestTimestamp),0)};
}
async function activityDates():Promise<string[]>{
  const dates=new Set<string>();
  for(const directory of ["events","manual-notes"]){
    try{for(const file of await readdir(path.join(dataRoot(),"data",directory))){const match=dateFile.exec(file);if(match?.[1])dates.add(match[1])}}
    catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e}
  }
  return [...dates];
}
async function readSummaryState(date:string):Promise<SummaryState|null>{
  try{const state=JSON.parse(await readFile(path.join(dataRoot(),"data","summary-state",`${date}.json`),"utf8")) as SummaryState;return state.date===date&&state.status==="success"?state:null}
  catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT"||e instanceof SyntaxError)return null;throw e}
}

/** Select only the newest activity-bearing, incomplete (or dirty) date before today. */
export async function resolveScheduledDate(config:Config,now=new Date()):Promise<string|null>{
  const today=logicalDate(now,config.timezone,config.summary.dayBoundaryHour);
  const dates=(await activityDates()).filter(date=>date<today).sort().reverse();
  for(const date of dates){
    const activity=await activityInfo(date);
    if(!activity.exists)continue;
    const state=await readSummaryState(date);
    const summarizedAt=state?timestamp(state.generated_at):Number.NaN;
    if(!state||!Number.isFinite(summarizedAt)||activity.lastActivityAt>summarizedAt)return date;
  }
  return null;
}

export async function summarizeScheduled(config:Config,provider?:SummaryProvider,now=new Date()):Promise<{status:"OK"|"NO_DATA";summary?:DailySummary;path?:string}>{
  const date=await resolveScheduledDate(config,now);
  return date?summarizeDate(date,config,provider):{status:"NO_DATA"};
}

export async function summarizeDate(date:string,config:Config,provider?:SummaryProvider):Promise<{status:"OK"|"NO_DATA";summary?:DailySummary;path?:string}>{
  const input=await loadDailyInput(date,config.summary.includeSourceLinks);
  if(!input.manualNotes.length&&!input.conversations.length)return{status:"NO_DATA"};
  if(config.summary.provider==="none")throw new Error("CONFIG_ERROR: summary.provider is none");
  const p=provider||new OpenAIProvider(config.summary.model||process.env.OPENAI_MODEL||"");
  const summary=dailySummarySchema.parse(await p.summarize(input));
  await atomicJson(path.join(dataRoot(),"data","summaries",`${date}.json`),summary);
  const note=await writeDailyNote(config,date,summaryToMarkdown(summary,config.summary.includeSourceLinks));
  await atomicJson(path.join(dataRoot(),"data","summary-state",`${date}.json`),{date,status:"success",generated_at:new Date().toISOString()} satisfies SummaryState);
  return{status:"OK",summary,path:note};
}
