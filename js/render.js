// ----------------------------------------------------------------------------
// Rendering is mostly done via CSS, but we need to build container
// with the tree structure.

var meta_template, node_template;
$(document).ready(function () {
    meta_template = Handlebars.compile(`
<p>{{#each node.info}} {{this}}<br> {{/each}}</p>
<p>{{node.estimates.rows}} rows, {{size}}</p>
<p>Relative cost: {{cost}}%</p>
`);

    node_template = Handlebars.compile(`
<span class="operator node-{{node.node-id}}" data-toggle="popover" data-placement="top" data-title="{{node.op}}" data-content="{{{meta_info}}}">
  {{{node_main}}}
</span>
`);
});

var render_plan = function (plan, node, buffer, siblings) {
    if (node['node-id'] > 0) {
        var leaf = '';
        if (!siblings) {
            leaf = ' only-child';
        }
        buffer.push('<div class="node' + leaf + ' node-' + node['node-id'] + '">');
    }

    var display = render_operator(node);
    if (node['type'] in render_mapping) {
        display = render_mapping[node['type']](node);
    }

    var meta_ctx = {
        'node': node,
        'size': get_size(node['estimates']),
        'cost': get_cost(node['estimates'])
    }
    var ctx = {
        'node': node,
        'node_main': display,
        'meta_info': meta_template(meta_ctx)
    };
    buffer.push(node_template(ctx));

    if (node['children'].length > 0) {
        siblings = node['children'].length > 1;
        buffer.push('<div class="branch">');
        for (const cid of node['children']) {
            var child = plan[cid];
            render_plan(plan, child, buffer, siblings);
        }
        buffer.push('</div>');
    }
    buffer.push('</div>');

    return buffer.join('');
};

var get_size = function (estimates) {
    var bytes = estimates['rows'] * estimates['width'];

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
    return node['op'] + '<br><span class="operator-info">:' + node['relation'] + ':</span>';
};
var render_subq_scan = function (node) {
    return node['op'] + '<br><span class="operator-info">:' + node['relation'] + ':</span>';
};
var render_join = function (node) {
    return node['op'] + '<br><span class="operator-info">:' + node['dist'] + ':</span>';
}
var render_intersect = function (node) {
    return node['op'] + '<br><span class="operator-info">:' + node['dist'] + ':</span>';
}
var render_operator = function (node) {
    return node['op'];
}
var render_mapping = {
    'SCAN': render_seq_scan,
    'SUBQ': render_subq_scan,
    'JOIN': render_join,
    'INTR': render_intersect
};

var adjust_edges = function (plan) {
    for (let [k, v] of Object.entries(plan)) {
        var w = Math.round(1 + parseInt(100 * v['estimates']['size-rel']) / 11);
        $('.node-' + k).parent().addClass('border-' + w + 'b');
        $('.node-' + k).addClass('border-' + w + 'n');
    }
};
