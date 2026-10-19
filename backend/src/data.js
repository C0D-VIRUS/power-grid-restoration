const campus = {
  id:"campus-grid", name:"Campus Distribution Grid", description:"Campus substations with alternate feeder paths; weights represent illustrative restoration cost.",
  nodes:[{id:"S1",label:"Main Substation",type:"substation",x:75,y:170},{id:"J1",label:"North Junction",type:"junction",x:230,y:75},{id:"J2",label:"South Junction",type:"junction",x:230,y:265},{id:"J3",label:"East Junction",type:"junction",x:420,y:75},{id:"J4",label:"West Junction",type:"junction",x:420,y:265},{id:"S2",label:"Load Substation",type:"substation",x:600,y:170}],
  edges:[{id:"e1",from:"S1",to:"J1",weight:4,enabled:true},{id:"e2",from:"S1",to:"J2",weight:2,enabled:true},{id:"e3",from:"J1",to:"J2",weight:1,enabled:true},{id:"e4",from:"J1",to:"J3",weight:5,enabled:true},{id:"e5",from:"J2",to:"J4",weight:7,enabled:true},{id:"e6",from:"J3",to:"J4",weight:1,enabled:true},{id:"e7",from:"J3",to:"S2",weight:3,enabled:true},{id:"e8",from:"J4",to:"S2",weight:2,enabled:true}],
  jobs:[{id:"F1",label:"Repair feeder e4",urgency:"Critical",location:"J3",edgeId:"e4"},{id:"F2",label:"Repair feeder e7",urgency:"High",location:"S2",edgeId:"e7"},{id:"F3",label:"Repair connector e3",urgency:"Medium",location:"J2",edgeId:"e3"},{id:"F4",label:"Repair feeder e5",urgency:"High",location:"J4",edgeId:"e5"}], conflicts:[["F1","F2"],["F1","F4"],["F2","F4"],["F2","F3"]]
};
const city = {
  id:"city-grid", name:"City Distribution Grid", description:"A larger urban feeder with several branches and alternate connections to compare route changes after faults.",
  nodes:[{id:"S1",label:"Central Substation",type:"substation",x:65,y:170},{id:"J1",label:"North Feeder",type:"junction",x:190,y:65},{id:"J2",label:"West Feeder",type:"junction",x:190,y:270},{id:"J3",label:"City Junction A",type:"junction",x:355,y:65},{id:"J4",label:"City Junction B",type:"junction",x:355,y:170},{id:"J5",label:"East Feeder",type:"junction",x:500,y:270},{id:"S2",label:"Hospital Load",type:"substation",x:610,y:115}],
  edges:[{id:"e1",from:"S1",to:"J1",weight:3,enabled:true},{id:"e2",from:"S1",to:"J2",weight:4,enabled:true},{id:"e3",from:"J1",to:"J3",weight:2,enabled:true},{id:"e4",from:"J1",to:"J4",weight:5,enabled:true},{id:"e5",from:"J2",to:"J4",weight:2,enabled:true},{id:"e6",from:"J2",to:"J5",weight:6,enabled:true},{id:"e7",from:"J3",to:"J4",weight:2,enabled:true},{id:"e8",from:"J3",to:"S2",weight:6,enabled:true},{id:"e9",from:"J4",to:"J5",weight:2,enabled:true},{id:"e10",from:"J4",to:"S2",weight:4,enabled:true},{id:"e11",from:"J5",to:"S2",weight:3,enabled:true}],
  jobs:[{id:"F1",label:"Repair north feeder e1",urgency:"Critical",location:"J1",edgeId:"e1"},{id:"F2",label:"Repair hospital line e8",urgency:"Critical",location:"S2",edgeId:"e8"},{id:"F3",label:"Repair west feeder e2",urgency:"Medium",location:"J2",edgeId:"e2"},{id:"F4",label:"Repair east feeder e11",urgency:"High",location:"J5",edgeId:"e11"},{id:"F5",label:"Repair junction line e9",urgency:"High",location:"J4",edgeId:"e9"}], conflicts:[["F1","F2"],["F1","F5"],["F2","F4"],["F2","F5"],["F3","F5"],["F4","F5"]]
};
const industrial = {
  id:"industrial-grid", name:"Industrial Plant Grid", description:"A compact plant network linking critical production loads through redundant supply paths.",
  nodes:[{id:"S1",label:"Plant Supply",type:"substation",x:70,y:170},{id:"J1",label:"Switchgear A",type:"junction",x:220,y:70},{id:"J2",label:"Switchgear B",type:"junction",x:220,y:270},{id:"J3",label:"Process Hall",type:"junction",x:410,y:70},{id:"J4",label:"Cooling Plant",type:"junction",x:410,y:270},{id:"S2",label:"Critical Load",type:"substation",x:600,y:170}],
  edges:[{id:"e1",from:"S1",to:"J1",weight:2,enabled:true},{id:"e2",from:"S1",to:"J2",weight:3,enabled:true},{id:"e3",from:"J1",to:"J2",weight:4,enabled:true},{id:"e4",from:"J1",to:"J3",weight:2,enabled:true},{id:"e5",from:"J2",to:"J4",weight:2,enabled:true},{id:"e6",from:"J3",to:"J4",weight:3,enabled:true},{id:"e7",from:"J3",to:"S2",weight:5,enabled:true},{id:"e8",from:"J4",to:"S2",weight:2,enabled:true}],
  jobs:[{id:"F1",label:"Repair supply line e1",urgency:"Critical",location:"J1",edgeId:"e1"},{id:"F2",label:"Repair critical-load line e7",urgency:"Critical",location:"S2",edgeId:"e7"},{id:"F3",label:"Repair process line e4",urgency:"High",location:"J3",edgeId:"e4"},{id:"F4",label:"Repair cooling feeder e5",urgency:"High",location:"J4",edgeId:"e5"}], conflicts:[["F1","F2"],["F1","F3"],["F2","F4"],["F3","F4"]]
};
// Guarantee every physical line has a corresponding repair work order. This means
// any Dijkstra route (including alternate routes after faults) is fully repairable.
// Keep the scenario's existing jobs and conflict relationships unchanged; add jobs
// only for lines that do not already have a job.
for (const scenario of [campus, city, industrial]) {
  const assignedEdges = new Set(scenario.jobs.map(job => job.edgeId));
  for (const edge of scenario.edges) {
    if (assignedEdges.has(edge.id)) continue;
    const jobNumber = scenario.jobs.length + 1;
    scenario.jobs.push({
      id: `F${jobNumber}`,
      label: `Repair line ${edge.id}`,
      urgency: "Medium",
      location: edge.to,
      edgeId: edge.id
    });
    assignedEdges.add(edge.id);
  }
}

export const scenarios = [campus, city, industrial];
