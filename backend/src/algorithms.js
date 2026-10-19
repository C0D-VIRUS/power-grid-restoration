export function runDijkstra(graph, sourceId, targetId) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new Error("A graph with nodes and edges is required.");
  }
  const ids = graph.nodes.map(n => n.id);
  if (!ids.includes(sourceId) || !ids.includes(targetId)) {
    throw new Error("Source and destination must be existing graph nodes.");
  }
  const idSet = new Set(ids);
  for (const edge of graph.edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) {
      throw new Error(`Line ${edge.id} references an unknown node.`);
    }
    if (typeof edge.weight !== "number" || !Number.isFinite(edge.weight) || edge.weight < 0) {
      throw new Error("Dijkstra requires finite, non-negative numeric edge weights.");
    }
  }
  const dist=Object.fromEntries(ids.map(id=>[id,Infinity]));
  const prev=Object.fromEntries(ids.map(id=>[id,null])), visited=new Set(), steps=[];
  const adj=Object.fromEntries(ids.map(id=>[id,[]]));
  graph.edges.filter(e=>e.enabled).forEach(e=>{
    if(e.weight<0) throw new Error("Dijkstra requires non-negative edge weights.");
    adj[e.from].push({to:e.to,weight:e.weight,edgeId:e.id});
    adj[e.to].push({to:e.from,weight:e.weight,edgeId:e.id});
  });
  dist[sourceId]=0;
  const snapshot=(type,message,current,edgeId=null)=>steps.push({
    type,message,current,edgeId,distances:Object.fromEntries(ids.map(id=>[id,dist[id]===Infinity?null:dist[id]])),visited:[...visited]
  });
  snapshot("initialize",`Initialize ${sourceId}=0; all other distances are infinity.`,sourceId);
  while(visited.size<ids.length){
    let u=null,best=Infinity;
    for(const id of ids) if(!visited.has(id)&&dist[id]<best){best=dist[id];u=id;}
    if(u===null) break;
    visited.add(u); snapshot("visit",`Select ${u}, the unvisited node with minimum tentative distance ${dist[u]}.`,u);
    for(const e of adj[u]){
      if(visited.has(e.to)) continue;
      const candidate=dist[u]+e.weight, old=dist[e.to], changed=candidate<old;
      if(changed){dist[e.to]=candidate;prev[e.to]=u;}
      snapshot(changed?"relax":"check",changed
        ?`Relax ${u} → ${e.to}: ${dist[u]} + ${e.weight} = ${candidate}; update distance.`
        :`Check ${u} → ${e.to}: candidate ${candidate} is not better than ${old===Infinity?"∞":old}.`,u,e.edgeId);
    }
    if(u===targetId) break;
  }
  const path=[]; if(dist[targetId]!==Infinity){let p=targetId;while(p!==null){path.unshift(p);p=prev[p];}}
  return {source:sourceId,target:targetId,distance:dist[targetId]===Infinity?null:dist[targetId],path,
    distances:Object.fromEntries(ids.map(id=>[id,dist[id]===Infinity?null:dist[id]])),previous:prev,steps,
    complexity:"(O((V+E)log V)) using the simple array-based implementation"};
}
export function colorJobs(graph) {
  const adj=Object.fromEntries(graph.jobs.map(j=>[j.id,new Set()]));
  graph.conflicts.forEach(([a,b])=>{if(adj[a]&&adj[b]){adj[a].add(b);adj[b].add(a);}});
  const order=[...graph.jobs].sort((a,b)=>adj[b.id].size-adj[a.id].size), colors={},steps=[];
  for(const job of order){
    const used=new Set([...adj[job.id]].map(id=>colors[id]).filter(Boolean));let c=1;while(used.has(c))c++;
    colors[job.id]=c;steps.push({jobId:job.id,jobLabel:job.label,color:c,blockedColors:[...used],
      message:`${job.id} gets Slot ${c}; conflicting jobs already use ${used.size?[...used].join(", "):"no slots"}.`});
  }
  return {assignments:graph.jobs.map(j=>({...j,slot:colors[j.id]})),colors,steps,
    slotCount:Math.max(0,...Object.values(colors)),complexity:"O(J²) for this greedy implementation"};
}


export function restoreRepairSlot(graph, slot) {
  if (!Number.isInteger(slot) || slot < 1) throw new Error("Choose a valid repair time slot.");
  if (!Array.isArray(graph?.jobs) || !Array.isArray(graph?.conflicts)) {
    throw new Error("Repair jobs and conflicts are required.");
  }
  const plan = colorJobs(graph);
  const jobsInSlot = plan.assignments.filter(job => job.slot === slot);
  const jobEdgeIds = new Set(jobsInSlot.map(job => job.edgeId).filter(Boolean));
  const repaired = graph.edges.filter(edge => !edge.enabled && jobEdgeIds.has(edge.id));
  if (!repaired.length) {
    throw new Error(`No failed lines are linked to repair jobs in Slot ${slot}. Inject a fault on a line with a matching repair job first.`);
  }
  const repairedEdgeIds = new Set(repaired.map(edge => edge.id));
  const updatedGraph = {
    ...graph,
    edges: graph.edges.map(edge => repairedEdgeIds.has(edge.id) ? { ...edge, enabled: true } : edge)
  };
  return {
    graph: updatedGraph,
    repairedLines: repaired.map(edge => edge.id),
    repairedJobs: jobsInSlot.filter(job => repairedEdgeIds.has(job.edgeId))
  };
}
