import type { DailySummary } from "../../../shared/src/schemas.js";
export interface SummaryMessage { role:"user"|"assistant"; content:string }
export interface SummaryThread { title:string; url?:string; messages:SummaryMessage[] }
export interface DailySummaryInput { date:string; manualNotes:string[]; conversations:SummaryThread[] }
export interface SummaryProvider { summarize(input:DailySummaryInput):Promise<DailySummary> }
