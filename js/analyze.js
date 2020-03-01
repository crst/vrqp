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

var analyze_alerts = function (tree) {
    // Simple rule based heuristics.

    for (node_id in tree) {
        var node = tree[node_id];

        alert = {'type': undefined, 'msg': ''};
        if (node['type'] === 'JOIN') {
            var rows_outer = tree[node['children'][0]]['estimates']['rows'];
            var size_outer = tree[node['children'][0]]['estimates']['output-size'];
            var rows_inner = tree[node['children'][1]]['estimates']['rows'];
            var size_inner = tree[node['children'][1]]['estimates']['output-size'];

            if (node['subtype'] === 'MRGE' && node['dist'].includes('NONE')) {
                alert['type'] = 'thumb_up';
                alert['msg'] = 'Matching dist and sort keys, great!';
            } else if (node['subtype'] === 'LOOP' && rows_outer > Math.pow(10, 5) && rows_inner > Math.pow(10, 5)) {
                alert['type'] = 'warning';
                alert['msg'] = 'Nested Loop join with large tables (both 100k+ rows), possibly review the join condition!';
            } else if (node['subtype'] === 'LOOP' && rows_inner > Math.pow(10, 4) && rows_inner > Math.pow(10, 4)) {
                alert['type'] = 'info';
                alert['msg'] = 'Nested Loop join with rather large tables (both 10k+ rows), possibly review the join condition!';
            } else if (node['subtype'] === 'LOOP') {
                alert['type'] = 'check';
                alert['msg'] = 'Nested Loop join with small table(s), probably fine.';
            } else if (node['dist'].includes('NONE')) {
                alert['type'] = 'thumb_up';
                alert['msg'] = 'No data redistribution, good!';
            } else if (node['dist'] === 'DS_DIST_INNER' || node['dist'] === 'DS_DIST_OUTER') {
                alert['type'] = 'check';
                alert['msg'] = 'Redistributing one table, should be fine.';
            } else if (node['dist'] === 'DS_DIST_ALL_INNER') {
                alert['type'] = 'info';
                alert['msg'] = 'Redistributing data to a single node, why?';
            } else if (node['dist'] === 'DS_DIST_BOTH') {
                alert['type'] = 'info';
                alert['msg'] = 'Redistributing both tables, why?';
            } else if (node['dist'] === 'DS_BCAST_INNER' && size_inner > Math.pow(1000, 4)) {
                alert['type'] = 'warning';
                alert['msg'] = 'Broadcasting a large table (1GB+), possibly review the join condition!';
            } else if (node['dist'] === 'DS_BCAST_INNER') {
                alert['type'] = 'check';
                alert['msg'] = 'Broadcasting a small table, this is probably fine.'
            }
        }

        if (node['type'] === 'SCAN' || node['type'] === 'SUBQ') {
            if (node['relation'].includes('volt_tt')) {
                alert['type'] = 'warning'
                alert['msg'] = 'Writes a temporary table to disk!';
            } else if (node['relation'].includes('volt_dt')) {
                alert['type'] = 'thumb_up';
                alert['msg'] = 'Temporary table in memory, good.'
            }
        }

        node['alert'] = alert;
    }
};


// ----------------------------------------------------------------------------
// UI functions.

var highlight_nodes = function (data) {
    for (const node of data) {
        $('#node-' + node['id'] + ' > .operator-content')
            .addClass('plan-alert-' + node['alert']['type'])
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
        .removeClass('plan-alert-none plan-alert-thumb_up plan-alert-check plan-alert-info plan-alert-warning');
};
var reset_edges = function () {
    $('.edge, .operator')
        .removeClass('x1 x2 x3 x4 x5 x6 x7 x8 x9 x10')
};


// ----------------------------------------------------------------------------
// Node analysis.

var show_node_alert = function (tree, highlight) {
    // Highlight heuristics computed by analyze_alerts.
    var highlight_data = [];
    for (node_id in tree) {
        var node = tree[node_id];
        highlight_data.push({'id': node_id, 'alert': node['alert'], 'emph': 1});
    }
    highlight_nodes(highlight_data);
}

var show_node_cost = function (tree, highlight) {
    // A slow node is simply an operator with high absolute cost.
    var total_cost = tree[0]['estimates']['cost-last'];
    var highlight_data = [];
    for (node_id in tree) {
        var measure = tree[node_id]['estimates']['cost-last-abs-rel'];
        highlight_data.push({'id': node_id, 'alert': {'type': 'none'}, 'emph': measure});
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
        highlight_data.push({'id': node_id, 'alert': {'type': 'none'}, 'emph': measure});
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
