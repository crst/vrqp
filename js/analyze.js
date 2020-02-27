// ----------------------------------------------------------------------------
// Calculate various additional node and edge measures.
var analyze_plan = function (tree) {

    var total_cost = tree[0]['estimates']['cost-last'];
    var measures = ['size', 'rows', 'width'];
    var max_values = {};
    for (const m of measures) { max_values[m] = 0; }

    // First pass: additional measures and max values.
    for (node_id in tree) {
        var node = tree[node_id];
        var est = node['estimates'];

        // Compute actual data size.
        var output_size = est['output-rows'] * est['output-width'];
        est['output-size'] = output_size;

        // Determine max values for each measure, so we can later
        // compute relative ones.
        for (const m of measures) {
            max_values[m] = Math.max(max_values[m], est['output-' + m]);
        }

        // Since cost measures are cumulative, we need to subtract
        // cost of the previous nodes to get the actual node cost.
        // TODO: not entirely sure how cost of parallel operators are
        // accumulated, but for now assume they simply add up.
        est['cost-first-abs'] = est['cost-first'];
        est['cost-last-abs'] = est['cost-last'];
        for (const child_id of node['children']) {
            var child = tree[child_id];
            est['cost-first-abs'] -= child['estimates']['cost-first'];
            est['cost-last-abs'] -= child['estimates']['cost-last'];
        }
    }

    // Second pass: normalize values in relation to total ones.
    for (node_id in tree) {
        var est = tree[node_id]['estimates'];

        for (const m of measures) {
            var max_val = max_values[m];
            est['output-' + m + '-rel'] = est['output-' + m] / Math.max(max_val, 0.1);

            // Get max input size from previous operators.
            est['max-input-' + m + '-rel'] = 0;
            for (const cid of tree[node_id]['children']) {
                var tmp = tree[cid]['estimates']['output-' + m] / Math.max(max_val, 0.1);
                if (tmp > est['max-input-' + m + '-rel']) {
                    est['max-input-' + m + '-rel'] = tmp;
                }
            }
        }

        est['cost-first-abs-rel'] = est['cost-first-abs'] / Math.max(total_cost, 0.1);
        est['cost-last-abs-rel'] = est['cost-last-abs'] / Math.max(total_cost, 0.1);
    }
};


// ----------------------------------------------------------------------------
// UI functions.

var highlight_nodes = function (data) {
    for (const node of data) {
        $('#node-' + node['id'] + ' > .operator-content')
            .addClass('alert-' + node['alert'])
            .css({'opacity': get_opacity(node['emph'])});
    }
};

var highlight_edges = function (data) {
    for (const node of data) {
        $('#node-' + node['id']).addClass('x' + node['input-val']);
        $('#edge-' + node['id']).addClass('x' + node['output-val']);
    }
};

var get_opacity = function (measure) {
    // Avoid invisible nodes.
    return 0.2 + (measure * 0.8);
};


var reset_nodes = function () {
    $('.operator-content')
        .css({'opacity': 1.0})
        .removeClass('alert-none alert-1 alert-2 alert-3 alert-4');
};
var reset_edges = function () {
    $('.edge, .operator')
        .removeClass('x1 x2 x3 x4 x5 x6 x7 x8 x9 x10')
};


// ----------------------------------------------------------------------------
// Node analysis.

var show_node_alert = function (tree, highlight) {
    // Simple rule based heuristics.
    // TODO: add more/better heuristics.
    var highlight_data = [];
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
        highlight_data.push({'id': node_id, 'alert': confidence, 'emph': 1});
    }
    highlight_nodes(highlight_data);
}

var show_node_cost = function (tree, highlight) {
    // A slow node is simply an operator with high absolute cost.
    var total_cost = tree[0]['estimates']['cost-last'];
    var highlight_data = [];
    for (node_id in tree) {
        var measure = tree[node_id]['estimates']['cost-last-abs-rel'];
        highlight_data.push({'id': node_id, 'alert': 'none', 'emph': measure});
    }
    highlight_nodes(highlight_data);
};

var show_node_blocker = function (tree, highlight) {
    // A pipeline blocker is an operator with high relative cost for
    // returning the first row.
    var total_cost = tree[0]['estimates']['cost-last'];
    var highlight_data = [];
    for (node_id in tree) {
        var measure = tree[node_id]['estimates']['cost-first-abs-rel'];
        highlight_data.push({'id': node_id, 'alert': 'none', 'emph': measure});
    }
    highlight_nodes(highlight_data);
};


// ----------------------------------------------------------------------------
// Edge analysis.

var show_edge = function (tree, highlight) {
    var highlight_data = [];
    for (let [k, v] of Object.entries(tree)) {
        var input = Math.round(1 + parseInt(100 * v['estimates']['max-input-' + highlight + '-rel']) / 11);
        var output = Math.round(1 + parseInt(100 * v['estimates']['output-' + highlight + '-rel']) / 11);

        highlight_data.push({'id': k, 'input-val': input, 'output-val': output});
    }
    highlight_edges(highlight_data);
};
