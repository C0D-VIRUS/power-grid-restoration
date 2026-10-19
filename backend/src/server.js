import express from "express";
import cors from "cors";
import {scenarios} from "./data.js";
import {runDijkstra,colorJobs,restoreRepairSlot} from "./algorithms.js";

const app=express();
app.use(cors());
app.use(express.json({limit:"1mb"}));

function validateGraph(graph){
  if(!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error("A graph with nodes and edges is required.");
  const ids=new Set(graph.nodes.map(n=>n.id));
  if(ids.size!==graph.nodes.length) throw new Error("Node IDs must be unique.");
  const edgeIds=new Set();
  for(const e of graph.edges){
    if(!e.id || edgeIds.has(e.id)) throw new Error("Power-line IDs must be present and unique.");
    edgeIds.add(e.id);
    if(!ids.has(e.from)||!ids.has(e.to)) throw new Error(`Line ${e.id} references an unknown node.`);
    if(typeof e.weight!=="number"||!Number.isFinite(e.weight)||e.weight<0) throw new Error(`Line ${e.id} must have a finite, non-negative numeric weight.`);
    if(typeof e.enabled!=="boolean") throw new Error(`Line ${e.id} must have an enabled/disabled status.`);
  }
  return true;
}
function endpoint(handler){return (req,res)=>{try{res.json(handler(req));}catch(e){res.status(400).json({error:e.message||"Invalid request."});}};}
app.get("/api/health",(_q,r)=>r.json({status:"ok",service:"GridRestore API"}));
app.get("/api/scenarios",(_q,r)=>r.json(scenarios));
app.post("/api/algorithms/dijkstra",endpoint(({body})=>{
  const {graph,sourceId,targetId}=body||{}; validateGraph(graph);
  if(!graph.nodes.some(n=>n.id===sourceId)||!graph.nodes.some(n=>n.id===targetId)) throw new Error("Choose a valid source and destination node.");
  return runDijkstra(graph,sourceId,targetId);
}));
app.post("/api/algorithms/coloring",endpoint(({body})=>{
  const {graph}=body||{};
  if(!graph||!Array.isArray(graph.jobs)||!Array.isArray(graph.conflicts)) throw new Error("A repair-job graph with jobs and conflicts is required.");
  const ids=new Set(graph.jobs.map(j=>j.id));
  if(ids.size!==graph.jobs.length) throw new Error("Repair job IDs must be unique.");
  for(const pair of graph.conflicts){if(!Array.isArray(pair)||pair.length!==2||pair[0]===pair[1]||!ids.has(pair[0])||!ids.has(pair[1])) throw new Error("Every conflict must connect two different existing repair jobs.");}
  return colorJobs(graph);
}));
app.post("/api/simulation/repair-slot",endpoint(({body})=>{
  const {graph,slot,sourceId,targetId}=body||{};
  validateGraph(graph);
  if(!Number.isInteger(slot)||slot<1) throw new Error("Choose a valid repair time slot.");
  if(!Array.isArray(graph.jobs)||!Array.isArray(graph.conflicts)) throw new Error("Repair jobs and conflicts are required.");
  if(!graph.nodes.some(n=>n.id===sourceId)||!graph.nodes.some(n=>n.id===targetId)) throw new Error("Choose a valid source and destination node.");
  const restoration=restoreRepairSlot(graph,slot);
  const route=runDijkstra(restoration.graph,sourceId,targetId);
  return {...restoration,route,crewPlan:colorJobs(restoration.graph),message:`Completed Slot ${slot}: restored ${restoration.repairedLines.map(id=>id.toUpperCase()).join(", ")}.`};
}));
app.post("/api/simulation",endpoint(({body})=>{
  const {graph,sourceId,targetId}=body||{}; validateGraph(graph);
  if(!graph.nodes.some(n=>n.id===sourceId)||!graph.nodes.some(n=>n.id===targetId)) throw new Error("Choose a valid source and destination node.");
  if(!Array.isArray(graph.jobs)||!Array.isArray(graph.conflicts)) throw new Error("Repair jobs and conflict relationships are required.");
  const route=runDijkstra(graph,sourceId,targetId);
  const crewPlan=colorJobs(graph);
  const failedLines=graph.edges.filter(e=>!e.enabled).map(e=>e.id.toUpperCase());
  const events=[
    failedLines.length?`Detected ${failedLines.length} unavailable line(s): ${failedLines.join(", ")}.`:`Network check: all ${graph.edges.length} lines are available.`,
    route.distance===null?"Dijkstra result: no available route connects the selected nodes.":`Dijkstra result: ${route.path.join(" → ")} (cost ${route.distance}).`,
    `Graph coloring assigned ${crewPlan.assignments.length} repair jobs across ${crewPlan.slotCount} slot(s).`
  ];
  return {route,crewPlan,events,failedLines,generatedAt:new Date().toISOString()};
}));
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`GridRestore API running on port ${PORT}`);
});
