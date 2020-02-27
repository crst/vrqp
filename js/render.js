// ----------------------------------------------------------------------------
// Rendering is mostly done via CSS, but we need to build container
// with the tree structure.

var render_plan = function (plan) {
    var buffer = [];
    var html = generate_plan_html(plan, plan[0], buffer);
    var width = get_tree_width(plan);
    $('#query-plan').css({'width': width}).html(html);
};

var meta_template, node_template;
$(document).ready(function () {
    meta_template = Handlebars.compile(`
<p>{{#each node.info}} {{this}}<br> {{/each}}</p>
<p>{{node.estimates.output-rows}} rows, {{output-size}}</p>
<p>Relative cost: {{cost}}%</p>
`);

    node_template = Handlebars.compile(`
<li id="edge-{{node.node-id}}" class="edge">
  <span id="node-{{node.node-id}}" class="operator" data-toggle="popover" data-placement="top" data-title="{{node.op}}" data-content="{{{meta_info}}}">
    <div class="operator-content">{{{node_main}}}</div>
  </span>
`);
});

var generate_plan_html = function (plan, node, buffer) {
    // Start a new list for the root node.
    if (node['node-id'] === 0) {
        buffer.push('<ul>');
    }

    // Add the node HTML.
    var node_html = render_node(node);
    buffer.push(node_html);

    if (node['children'].length > 0) {
        // Recursively build sublists.
        buffer.push('<ul>');
        for (const cid of node['children']) {
            var child = plan[cid];
            generate_plan_html(plan, child, buffer);
        }
        buffer.push('</ul>');
    }

    // Close the item opened via node_html.
    buffer.push('</li>');

    // Close main list from the root node.
    if (node['node-id'] === 0 ) {
        buffer.push('</ul>');
    }

    return buffer.join('');
};

var render_node = function (node) {
    // Generate node HTML with the operator.
    var operator_html = render_operator(node);
    var meta_ctx = {
        'node': node,
        'output-size': get_output_size(node['estimates']),
        'cost': get_cost(node['estimates'])
    }
    var node_ctx = {
        'node': node,
        'node_main': operator_html,
        'meta_info': meta_template(meta_ctx)
    };
    var node_html = node_template(node_ctx);
    return node_html;
};

var get_output_size = function (estimates) {
    var bytes = estimates['output-rows'] * estimates['output-width'];

    var result = {'name': 'bytes', 'value': bytes};
    var ranges = [
        {'name': 'kB', 'value': bytes / Math.pow(1000, 1)},
        {'name': 'MB', 'value': bytes / Math.pow(1000, 2)},
        {'name': 'GB', 'value': bytes / Math.pow(1000, 3)},
        {'name': 'TB', 'value': bytes / Math.pow(1000, 4)},
    ];
    for (const range of ranges) {
        if (range['value'] > 1) {
            result = range;
        }
    }
    var val = parseInt(10 * result['value']) / 10.0;
    return val + ' ' + result['name'];
};

var get_cost = function (estimates) {
    return parseInt(1000 * estimates['cost-last-abs-rel']) / 10.0;
};

var render_seq_scan = function (node) {
    return '<div>' + node['op'] + '</div><div class="operator-info">:' + node['relation'] + ':</div>';
};
var render_subq_scan = function (node) {
    return '<div>' + node['op'] + '</div><div class="operator-info">:' + node['relation'] + ':</div>';
};
var render_join = function (node) {
    return '<div>' + node['op'] + '</div><div class="operator-info">:' + node['dist'] + ':</div>';
};
var render_intersect = function (node) {
    return '<div>' + node['op'] + '</div><div class="operator-info">:' + node['dist'] + ':</div>';
};
var render_operator = function (node) {
    if (node['type'] in render_mapping) {
        return render_mapping[node['type']](node);
    }
    return '<div>' + node['op'] + '</div>';
};
var render_mapping = {
    'SCAN': render_seq_scan,
    'SUBQ': render_subq_scan,
    'JOIN': render_join,
    'INTR': render_intersect
};

var get_tree_width = function (plan) {
    var width = 1;
    for (let [k, v] of Object.entries(plan)) {
        width += Math.max(v['children'].length - 1, 0);
    }
    return width * 392;
};
