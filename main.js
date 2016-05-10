window.addEventListener('message', function(e) {
	var opts = e.data.opts,
		data = e.data.data;

	return main(opts, data);
});

/* Default settings */
var defaults = {
	margin: {top: 30, right: 10, bottom: 20, left: 10},
	rootname: "TOP",
	format: ".2%",
	title: ""
};

defaults.width = $("#chart").innerWidth() - (defaults.margin.left + defaults.margin.right);
defaults.height = window.innerHeight * .90 - (defaults.margin.top + defaults.margin.bottom);

formatNumber = d3.format(defaults.format);

function main(o, data) {
	var root,
		opts = $.extend(true, {}, defaults, o),
		rname = opts.rootname,
		margin = opts.margin;

	// Set chart width and height
	$('#chart')
		.width(opts.width)
		.height(opts.height);

  var width = opts.width - margin.left - margin.right,
	  height = opts.height - margin.top - margin.bottom,
	  transitioning;
  
  // Set color palette
  var colorRange = colorbrewer.Paired[10];
  var color = d3.scale.ordinal()
	.range(colorRange);
  
  var x = d3.scale.linear()
	  .domain([0, width])
	  .range([0, width]);
  
  var y = d3.scale.linear()
	  .domain([0, height])
	  .range([0, height]);
  
  var treemap = d3.layout.treemap()
	  .children(function(d, depth) { return depth ? null : d._children; })
	  .sort(function(a, b) { return a.value - b.value; })
	  .ratio(1) // height / width * 1 * (1 + Math.sqrt(2))
	  .round(false);
  
	// Remove previous svg graph, if exists.
	d3.select("svg").remove();

	// Append svg graph
	var svg = d3.select("#chart")
		.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.bottom + margin.top)
			.style("margin-left", -margin.left + "px")
			.style("margin.right", -margin.right + "px")
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
			.style("shape-rendering", "crispEdges");
  
	var grandparent = svg.append("g")
		.attr("class", "grandparent");
  
	grandparent.append("rect")
		.attr("y", -margin.top)
		.attr("width", width)
		.attr("height", margin.top);
  
	grandparent.append("text")
		.attr("x", 9)
		.attr("y", 9 - margin.top)
		.attr("dy", ".75em");

	if (opts.title) {
		$("#chart").prepend("<p class='title'>" + opts.title + "</p>");
	}

	if (data instanceof Array) {
		root = { key: rname, values: data };
	} else {
		root = data;
	}
	
	initialize(root);
	accumulate(root);
	layout(root);
	display(root);

	if (window.parent !== window) {
		var myheight = document.documentElement.scrollHeight ||
			document.body.scrollHeight;
			window.parent.postMessage({height: myheight}, '*');
	}

	
	function initialize(root) {
		root.x = root.y = 0;
		root.dx = width;
		root.dy = height;
		root.depth = 0;
	}


	// Aggregate the values for internal nodes. This is normally done by the
	// treemap layout, but not here because of our custom implementation.
	// We also take a snapshot of the original children (_children) to avoid
	// the children being overwritten when when layout is computed.
	function accumulate(d) {
		return (d._children = d.values) ?
			d.value = d.values.reduce(function(p, v) {
				return p + accumulate(v);
			}, 0) :
			d.value;
	}


	// Compute the treemap layout recursively such that each group of siblings
	// uses the same size (1×1) rather than the dimensions of the parent cell.
	// This optimizes the layout for the current zoom state. Note that a wrapper
	// object is created for the parent node for each group of siblings so that
	// the parent’s dimensions are not discarded as we recurse. Since each group
	// of sibling was laid out in 1×1, we must rescale to fit using absolute
	// coordinates. This lets us use a viewport to zoom.
	function layout(d) {
		if (d._children) {
			treemap.nodes({_children: d._children});
			
			d._children.forEach(function(c) {
				c.x = d.x + c.x * d.dx;
				c.y = d.y + c.y * d.dy;
				c.dx *= d.dx;
				c.dy *= d.dy;
				c.parent = d;
				layout(c);
			});
		}
	}

	/*
	The 'display' function does a lot of the heavy lifting and is where our customizations 
	come in. A click event was added to the parent rectangle. A foreign object is 
	inserted instead of a SVG text object to allow text wrapping. SVG does not have 
	text wrapping natively, so we are using it's foreign object command to insert 
	divs. Divs wrap text by default. This also gives us easy control of text formatting 
	via CSS. Note that the text is inserted as HTML instead of text, this allows us to 
	place formatting in our json file (e.g. italics, newlines).
	 */
	// function display()
	//  show the treemap and writes the embedded transition function
	function display(d) {

		/* create grandparent bar at top */
		grandparent
			.datum(d.parent)
			.on("click", transition)
			.select("text")
			.text(name(d));

		var g1 = svg.insert("g", ".grandparent")
			.datum(d)
			.attr("class", "depth");

		/* add in data */
		var g = g1.selectAll("g")
			.data(d._children)
			.enter()
			.append("g");

		/* transition on child click */
		g.filter(function(d) { return d._children; })
			.classed("children", true)
			.on("click", transition);

		/* write children rectangles */
		var children = g.selectAll(".child")
			.data(function(d) { return d._children || [d]; })
			.enter()
			.append("g");

		/* write parent rectangle */
		g.append("rect")
			.attr("class", "parent")
			.call(rect);
		
		children.append("rect")
			.attr("class", "child")
			.call(rect)
			.call(rectColorFiller)
		.append("title")
			.text(function(d) {
				return d.key + " (" + formatNumber(d.value) + ")";
			});

		// check if it's not at leafs level
		if (typeof(d._children[0]._children) !== 'undefined') {
			children.append("text")
				.attr("class", "ctext")
				.call(text2);
		}

		var t = g.append("text")
			.attr("class", "ptext")
			.attr("font-size", "18px")
			.attr("dy", ".75em");

		t.append("tspan")
			.text(function(d) {
				return d.key;
			});

		t.append("tspan")
			.attr("dy", "1.0em")
			.attr("font-size", "12px")
			.text(function(d) { return formatNumber(d.value); });
		
		t.call(text);


		 /* create transition function for transitions */
		 function transition(d) {
			if (transitioning || !d) return;
			
			transitioning = true;

			var g2 = display(d),
				t1 = g1.transition().duration(750),
				t2 = g2.transition().duration(750);

			// Update the domain only after entering new elements.
			x.domain([d.x, d.x + d.dx]);
			y.domain([d.y, d.y + d.dy]);

			// Enable anti-aliasing during the transition.
			svg.style("shape-rendering", null);

			// Draw child nodes on top of parent nodes.
			svg.selectAll(".depth")
				.sort(function(a, b) { return a.depth - b.depth; });

			// Fade-in entering text.
			g2.selectAll("text")
				.style("fill-opacity", 0);

			// Transition to the new view.
			t1.selectAll(".ptext")
				.call(text)
				.style("fill-opacity", 0);
			t1.selectAll(".ctext")
				.call(text2)
				.style("fill-opacity", 0);
			t2.selectAll(".ptext")
				.call(text)
				.style("fill-opacity", 1);
			t2.selectAll(".ctext")
				.call(text2)
				.style("fill-opacity", 1);
			t1.selectAll("rect")
				.call(rect);
			t2.selectAll("rect")
				.call(rect);

			// Remove the old node when the transition is finished.
			t1.remove().each("end", function() {
				svg.style("shape-rendering", "crispEdges");
				transitioning = false;
			});
		} //end transition()

		return g;
	} //end display()

	function text(text) {
		text.each(function(d) {
			var textSel = d3.select(this);
			var rectWidth = x(d.x + d.dx) - x(d.x);
			var rectHeight = y(d.y + d.dy) - y(d.y);

			tspan = textSel.text(null)
				.attr("x", function(d) { return x(d.x) + 6; })
				.attr("y", function(d) { return y(d.y) + 6; }) 
				.append("tspan")
					.text(d.key);

			trimTxt = d.key;

			while (tspan.node().getComputedTextLength() > rectWidth - 4) {
				// El texto es más largo que el rectángulo

				if (trimTxt.lastIndexOf(" ") !== -1) {
					// Corto la última palabra
					trimTxt = trimTxt.substring(0, trimTxt.lastIndexOf(" "));
					trimTxt = trimTxt + "...";
				} else if (trimTxt.length > 2) {
					// Es la última palabra. Recorto letras de a una.
					trimTxt = trimTxt.substring(0, trimTxt.length - 1);
				} else {
					// No quedan más letras
					return textSel.text(null);
				}                

				tspan = textSel.text(null)
					.attr("x", function(d) { return x(d.x) + 6; })
					.attr("y", function(d) { return y(d.y) + 6; }) 
					.append("tspan")
					.text(trimTxt);
			}

			if (tspan.node().parentNode.getBBox().height >= rectHeight) {
				tspan.remove();

				return tspan;
			}

			tspan = textSel.append("tspan")
				.attr("x", function(d) { return x(d.x) + 6; })
				.attr("dy", "1.0em")
				.text(function(d) { return formatNumber(d.value); });

			// Verifico si tengo espacio para agregar porcentaje en sig. línea
			if (tspan.node().parentNode.getBBox().height >= rectHeight) {
				tspan.remove();
			}
			
			return tspan;
		});
	}


	function text2(text) {
		text.each(function(d) {
			var textSel = d3.select(this);
			var rectWidth = x(d.x + d.dx) - x(d.x);

			trimTxt = d.key + " (" + formatNumber(d.value) + ")";

			tspan = textSel.text(null)
				.attr("y", function(d) { return y(d.y + d.dy) - 6; }) 
				.append("tspan")
				.text(trimTxt)
				.attr("x", function(d) {
					return x(d.x + d.dx) - this.getComputedTextLength() - 6;
				});            

			while (tspan.node().getComputedTextLength() + 6 > rectWidth) {
				if (trimTxt.lastIndexOf(" ") == -1) {
					return textSel.text(null);
				}

				trimTxt = trimTxt.substring(0, trimTxt.lastIndexOf(" "));
				trimTxt = trimTxt + "...";

				tspan = textSel.text(null)
					.attr("y", function(d) { return y(d.y + d.dy) - 6; }) 
					.append("tspan")
					.text(trimTxt + " (" + formatNumber(d.value) + ")")
					.attr("x", function(d) {
						return x(d.x + d.dx) - this.getComputedTextLength() - 6;
					});
			} 
		});
	}

	function rect(rect) {
		rect.attr("x", function(d) { return x(d.x); })
			.attr("y", function(d) { return y(d.y); })
			.attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
			.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
	}

	function rectColorFiller(rect) {
		rect.style("fill", function(d) {
			return color(d.parent.key);
		});
	}

	function name(d) {    
		return d.parent ?
			d.key + " (" + formatNumber(d.value) + ")" + " ∈ " + name(d.parent) : 
			d.key + " (" + formatNumber(d.value) + ")";
	}
}

function load(datafile) {
	d3.csv(datafile, function(d) { // data conversion
		return {
			division: d.division.toLowerCase(),
			grupo: d.grupo.toLowerCase(),
			clase: d.clase.toLowerCase(),
			subclase: d.subclase.toLowerCase(),
			key: d.articulo.toLowerCase(),
			value: +d.porcentaje, // Convert string to number
			monto: +d.monto
		};
	}, function(err, res) { // data nesting
		if (!err) {
			var data = d3.nest()
			  .key(function(d) { return d.division; })
			  .key(function(d) { return d.grupo; })
			  .key(function(d) { return d.clase; })
			  .key(function(d) { return d.subclase; })
			  .entries(res);

			main({title: ""}, {key: "Total", values: data});
		}
	});
}

if (window.location.hash === "") {
	load("data/engh2012.csv");
}

$( document ).ready(function() {
	$('#encuestas-radio .btn-secondary').on('click', function() {
		value = $(this).find('input').attr('id');

		load("data/" + value + ".csv");
	});
});