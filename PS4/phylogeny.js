function make_tree(edges) {
  edges.push({to: 1, from: null});
  let stratifier = d3.stratify(edges)
    .id(d => d.to)
    .parentId(d => d.from)
  tree_gen = d3.tree()
    .size([1200, 600]);
  return tree_gen(stratifier(edges));
}

function visualize(data) {
  [nodes, edges] = data
  // helper to look up country and date for each node ID.
  nodes_lookup = {}
  for (let i = 0; i < nodes.length; i++) {
    nodes_lookup[i + 1] = nodes[i]
  }

  let countries = get_country(nodes)
  let scale = make_scale(countries)

  tree = make_tree(edges)
  let link_gen = d3.linkVertical()
    .x(d => d.x)
    .y(d => d.y);

  d3.select("#tree")
    .selectAll("path")
    .data(tree.links()).enter()
    .append("path")
    .attrs({
      d: link_gen,
      "stroke-width": 0.5
    })

  d3.select("#tree")
    .selectAll("circle")
    .data(tree.descendants()).enter()
    .append("circle")
    .attrs({
      cx: d => d.x-1,
      cy: d => d.y-10,
      r: d => radius(d.depth),
      fill: d => make_color(nodes_lookup[parseInt(d.id)].country , scale),
      transform: "translate(0, 10)"
    })
  
  neighborhoods = d3.Delaunay.from(tree.descendants().map(d => [d.x, d.y]))
  d3.select("svg").on("mousemove", (ev) => update_labels(ev, neighborhoods, tree))
}

function focus_ids(cur_node) {
  ancestors = cur_node.ancestors().map(d => d.id)
  return ancestors
}

function highlight(d, i, ix, focus) {
  if (i == ix) {
    return 1
  } else if (focus.indexOf(d.id) != -1) {
    return 0
  }
  return -1
}

function update_labels(ev, neighborhoods, tree) {
  let pos = d3.pointer(ev),
    ix = neighborhoods.find(pos[0], pos[1]),
    cur_node = tree.descendants()[ix],
    focus = focus_ids(cur_node)

  d3.select("#tree")
    .selectAll("circle")
    .transition().duration(100)
    .attrs({
      r: (d, i) => {
        let relevance = highlight(d, i, ix, focus)
        return relevance == 1 ? radius(d.depth) : relevance == 0 ? radius(d.depth) : 0 * radius(d.depth)
      },
    })

  d3.select("#tree")
    .selectAll("path")
    .transition().duration(100)
    .attr("stroke-width", d => focus.indexOf(d.target.id) == -1 ? 0.1 : 1)

  d3.select("#labels")
    .selectAll("text")
    .text(d => nodes_lookup[parseInt(cur_node.id)].country)
    .attr("transform", `translate(${cur_node.x}, ${cur_node.y})`)
}

function get_country(data){
  let countries = [... new Set(data.map(d => d.country))]
  return countries
}

function make_scale(data){
  let scale = {
  point: d3.scalePoint()
    .domain(data)
    .range([10, data.length + 10]),
  fill: d3.scaleQuantize()
    .domain([1, data.length + 10])
    .range(d3.schemeReds[9])
  };
  return scale
}

function make_color(country , scale){
  if (country == 'NA') {
    return '#184059'
  } else {
      return scale.fill(scale.point(country))
  }
}

function radius(depth) {
  return 10 * Math.exp(.001 * depth)
}

Promise.all([
  d3.csv("covid-nodes.csv", d3.autoType),
  d3.csv("covid-edges.csv", d3.autoType)
]).then(visualize)
