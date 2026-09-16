import type { Snapshot,ManualNote } from "../../../shared/src/schemas.js";
export type QueueItem={id:string;endpoint:"/api/snapshot"|"/api/manual-note";payload:Snapshot|ManualNote};
export type ServiceState="connected"|"disconnected"|"syncing"|"error";
