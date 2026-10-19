import test from 'node:test';
import assert from 'node:assert/strict';
import {runDijkstra,colorJobs,restoreRepairSlot} from '../src/algorithms.js';
import {scenarios} from '../src/data.js';

const sampleGraph = () => ({
  nodes:[{id:'A'},{id:'B'},{id:'C'}],
  edges:[
    {id:'ab',from:'A',to:'B',weight:2,enabled:true},
    {id:'bc',from:'B',to:'C',weight:3,enabled:true},
    {id:'ac',from:'A',to:'C',weight:9,enabled:true}
  ]
});

test('Dijkstra chooses the lowest-cost available route',()=>{
  const result=runDijkstra(sampleGraph(),'A','C');
  assert.deepEqual(result.path,['A','B','C']);
  assert.equal(result.distance,5);
  assert.equal(result.steps[0].type,'initialize');
  assert.equal(result.steps.at(-1).distances.C,5);
});

test('Dijkstra ignores disabled lines and reports an unreachable destination',()=>{
  const graph={nodes:[{id:'A'},{id:'B'}],edges:[{id:'ab',from:'A',to:'B',weight:1,enabled:false}]};
  const result=runDijkstra(graph,'A','B');
  assert.equal(result.distance,null);
  assert.deepEqual(result.path,[]);
  assert.equal(result.distances.B,null);
});

test('Dijkstra handles a source equal to its destination',()=>{
  const result=runDijkstra(sampleGraph(),'A','A');
  assert.equal(result.distance,0);
  assert.deepEqual(result.path,['A']);
});

test('Dijkstra handles zero-weight edges',()=>{
  const graph={nodes:[{id:'A'},{id:'B'},{id:'C'}],edges:[
    {id:'ab',from:'A',to:'B',weight:0,enabled:true},
    {id:'bc',from:'B',to:'C',weight:2,enabled:true}
  ]};
  const result=runDijkstra(graph,'A','C');
  assert.equal(result.distance,2);
  assert.deepEqual(result.path,['A','B','C']);
});

test('Dijkstra rejects negative, infinite, and non-numeric weights',()=>{
  for (const weight of [-1,Infinity,'2']) {
    const graph={nodes:[{id:'A'},{id:'B'}],edges:[{id:'ab',from:'A',to:'B',weight,enabled:true}]};
    assert.throws(()=>runDijkstra(graph,'A','B'),/non-negative numeric/);
  }
});

test('Dijkstra rejects unknown source or destination nodes',()=>{
  assert.throws(()=>runDijkstra(sampleGraph(),'Z','C'),/existing graph nodes/);
  assert.throws(()=>runDijkstra(sampleGraph(),'A','Z'),/existing graph nodes/);
});

test('graph coloring gives every conflicting pair different slots',()=>{
  const graph={jobs:[{id:'A',label:'A'},{id:'B',label:'B'},{id:'C',label:'C'}],conflicts:[['A','B'],['B','C']]};
  const result=colorJobs(graph), slots=Object.fromEntries(result.assignments.map(j=>[j.id,j.slot]));
  assert.notEqual(slots.A,slots.B);
  assert.notEqual(slots.B,slots.C);
  assert.equal(result.slotCount,2);
});

test('graph coloring handles a triangle conflict graph with three slots',()=>{
  const graph={jobs:[{id:'A'},{id:'B'},{id:'C'}],conflicts:[['A','B'],['B','C'],['A','C']]};
  const result=colorJobs(graph), slots=Object.fromEntries(result.assignments.map(j=>[j.id,j.slot]));
  assert.equal(result.slotCount,3);
  for (const [a,b] of graph.conflicts) assert.notEqual(slots[a],slots[b]);
});

test('every predefined repair job references an existing power line',()=>{
  for (const scenario of scenarios) {
    const edgeIds=new Set(scenario.edges.map(edge=>edge.id));
    for (const job of scenario.jobs) {
      assert.ok(job.edgeId,`${scenario.id}/${job.id} must map to a line`);
      assert.ok(edgeIds.has(job.edgeId),`${scenario.id}/${job.id} maps to missing line ${job.edgeId}`);
    }
  }
});

test('every power line in every scenario has exactly one linked repair job',()=>{
  for (const scenario of scenarios) {
    const counts=new Map();
    for (const job of scenario.jobs) counts.set(job.edgeId,(counts.get(job.edgeId)||0)+1);
    for (const edge of scenario.edges) assert.equal(counts.get(edge.id),1,`${scenario.id}/${edge.id} should have exactly one repair job`);
  }
});

test('all predefined conflict relationships reference distinct existing jobs',()=>{
  for (const scenario of scenarios) {
    const ids=new Set(scenario.jobs.map(job=>job.id));
    for (const [a,b] of scenario.conflicts) {
      assert.ok(ids.has(a),`${scenario.id} conflict has unknown job ${a}`);
      assert.ok(ids.has(b),`${scenario.id} conflict has unknown job ${b}`);
      assert.notEqual(a,b,`${scenario.id} has a self-conflict`);
    }
  }
});

test('all conflicting jobs receive different slots in every scenario',()=>{
  for (const scenario of scenarios) {
    const plan=colorJobs(scenario), slots=Object.fromEntries(plan.assignments.map(job=>[job.id,job.slot]));
    for (const [a,b] of scenario.conflicts) assert.notEqual(slots[a],slots[b],`${scenario.id}: ${a} and ${b} conflict but share Slot ${slots[a]}`);
  }
});

test('isolating the destination makes it unreachable in every predefined scenario',()=>{
  for (const scenario of scenarios) {
    const target=scenario.nodes.at(-1).id;
    const graph={...structuredClone(scenario),edges:scenario.edges.map(edge=>
      edge.from===target||edge.to===target?{...edge,enabled:false}:{...edge}
    )};
    const result=runDijkstra(graph,scenario.nodes[0].id,target);
    assert.equal(result.distance,null,`${scenario.id} should report the isolated destination as unreachable`);
    assert.deepEqual(result.path,[]);
  }
});

test('every single-line fault in every scenario returns a valid path or a clean unreachable result',()=>{
  for (const scenario of scenarios) {
    for (const failedEdge of scenario.edges) {
      const graph={...structuredClone(scenario),edges:scenario.edges.map(edge=>edge.id===failedEdge.id?{...edge,enabled:false}:{...edge})};
      const result=runDijkstra(graph,scenario.nodes[0].id,scenario.nodes.at(-1).id);
      if (result.distance===null) assert.deepEqual(result.path,[]);
      else {
        assert.equal(result.path[0],scenario.nodes[0].id);
        assert.equal(result.path.at(-1),scenario.nodes.at(-1).id);
        let cost=0;
        for (let i=0;i<result.path.length-1;i++) {
          const edge=graph.edges.find(e=>e.enabled&&((e.from===result.path[i]&&e.to===result.path[i+1])||(e.to===result.path[i]&&e.from===result.path[i+1])));
          assert.ok(edge,`${scenario.id}: route uses missing or disabled edge`);
          cost+=edge.weight;
        }
        assert.equal(cost,result.distance,`${scenario.id}/${failedEdge.id}: path cost mismatch`);
      }
    }
  }
});


test('repair-slot restoration only reports and enables failed lines actually repaired',()=>{
  const scenario=structuredClone(scenarios[0]);
  const targetJob=scenario.jobs.find(job=>job.edgeId==='e4');
  assert.ok(targetJob);
  const slot=colorJobs(scenario).assignments.find(job=>job.id===targetJob.id).slot;
  scenario.edges=scenario.edges.map(edge=>edge.id==='e4'?{...edge,enabled:false}:edge);
  const result=restoreRepairSlot(scenario,slot);
  assert.ok(result.repairedLines.includes('e4'));
  assert.ok(result.repairedJobs.some(job=>job.id===targetJob.id));
  assert.equal(result.graph.edges.find(edge=>edge.id==='e4').enabled,true);
  assert.deepEqual(result.repairedLines,result.repairedJobs.map(job=>job.edgeId));
});

test('repair-slot restoration refuses a slot with no failed linked lines',()=>{
  const scenario=structuredClone(scenarios[0]);
  const slot=colorJobs(scenario).assignments[0].slot;
  assert.throws(()=>restoreRepairSlot(scenario,slot),/No failed lines are linked/);
});
