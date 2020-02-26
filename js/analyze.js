var analyze_plan = function (tree) {
    // Calculate "absolute relative" cost of the nodes from the
    // cumulative or total values.
    //
    // TODO: not entirely sure how cost from parallel operations are
    // actually accumulated. For now just assuming they simply sum up.

    var total_cost = tree[0]['estimates']['cost-last'];
    var max_output_size = 0;
    for (node_id in tree) {
        var node = tree[node_id];
        var output_size = node['estimates']['rows'] * node['estimates']['width'];
        var max_output_size = Math.max(max_output_size, output_size);
        node['estimates']['output-size'] = output_size;
        node['estimates']['cost-first-abs'] = node['estimates']['cost-first'];
        node['estimates']['cost-last-abs'] = node['estimates']['cost-last'];
        for (const child_id of node['children']) {
            var child = tree[child_id];
            node['estimates']['cost-first-abs'] -= child['estimates']['cost-first'];
            node['estimates']['cost-last-abs'] -= child['estimates']['cost-last'];
        }
    }

    // Normalize values.
    for (node_id in tree) {
        var est = tree[node_id]['estimates'];
        est['output-size-rel'] = est['output-size'] / Math.max(max_output_size, 0.1);
        est['cost-first-abs-rel'] = est['cost-first-abs'] / Math.max(total_cost, 0.1);
        est['cost-last-abs-rel'] = est['cost-last-abs'] / Math.max(total_cost, 0.1);

        est['max-input-size-rel'] = 0;
        for (const cid of tree[node_id]['children']) {
            var tmp = tree[cid]['estimates']['output-size'] / Math.max(max_output_size, 0.1);
            if (tmp > est['max-input-size-rel']) {
                est['max-input-size-rel'] = tmp;
            }
        }
    }
};

var reset_nodes = function () {
    $('.operator')
        .css({'opacity': 1.0})
        .removeClass('confidence-1 confidence-2 confidence-3 confidence-4');
}
var reset_edges = function () {
    $('.edge, .operator')
        .removeClass('x1 x2 x3 x4 x5 x6 x7 x8 x9 x10')
}

// ----------------------------------------------------------------------------
// Node analysis.

var show_node_confidence = function (tree) {
    // Simple rule based heuristics.
    // TODO: add more/better heuristics.
    for (node_id in tree) {
        var node = tree[node_id];
        var confidence = 3;
        if (node['type'] === 'JOIN') {
            if (node['op'] === 'Nested Loop' && node['estimates']['cost-last-abs-rel'] > 0.2) {
                // TODO: depends on the spelling of "Nested Loop",
                // should be encapsulated by the parser.
                confidence = 1;
            } else if (node['dist'] === 'DS_DIST_NONE' || node['dist'] === 'DS_DIST_ALL_NONE') {
                confidence = 4;
            } else if (node['dist'] === 'DS_DIST_BOTH') {
                confidence = 2;
            } else if (node['estimates']['cost-last-abs-rel'] > 0.9) {
                confidence = 1;
            } else {
                confidence = 2;
            }
        } else if (node['type'] === 'SCAN' || node['type'] === 'SUBQ') {
            if (node['relation'].includes('volt_tt')) {
                confidence = 1;
            }
        }
        $('#node-' + node_id).addClass('confidence-' + confidence);
    }
}

var show_slow_nodes = function (tree) {
    // A slow node is simply an operator with high absolute cost.
    var total_cost = tree[0]['estimates']['cost-last'];
    for (node_id in tree) {
        var measure = tree[node_id]['estimates']['cost-last-abs-rel'];
        $('#node-' + node_id).css({'opacity': get_opacity(measure)});
    }
};

var show_pipeline_blocker = function (tree) {
    // A pipeline blocker is an operator with high relative cost for
    // returning the first row.
    var total_cost = tree[0]['estimates']['cost-last'];
    for (node_id in tree) {
        var measure = tree[node_id]['estimates']['cost-first-abs-rel'];
        $('#node-' + node_id).css({'opacity': get_opacity(measure)});
    }
};


var get_opacity = function (measure) {
    // Avoid invisible nodes.
    return 0.2 + (measure * 0.8);
};

// ----------------------------------------------------------------------------
// Edge analysis.

var show_data_size = function (tree) {
    for (let [k, v] of Object.entries(tree)) {
        // Adjust output edge.
        var c = Math.round(1 + parseInt(100 * v['estimates']['output-size-rel']) / 11);
        $('#edge-' + k).addClass('x' + c);

        // Adjust input edge.
        var c = Math.round(1 + parseInt(100 * v['estimates']['max-input-size-rel']) / 11);
        $('#node-' + k).addClass('x' + c);
    }
};
