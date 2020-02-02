// ----------------------------------------------------------------------------
// Parsing the non-verbose EXPLAIN query plan is relatively easy, each
// line is either:
//   - one of the operators described in [1].
//   - or some additional info about the previous operator.
//
// Operators start with "->", except for the root node. Each operator
// has the format "OPERATOR_TYPE [PARAMETERS] (PLANNER_COST_ESTIMATES)".
// The exact format of the additional info depends on the operator.
// Tree structure can be reconstructed from the indentation.
//
// [1]: https://docs.aws.amazon.com/redshift/latest/dg/c-the-query-plan.html
//
//
// Example plan:
//  ___________________________________________________________________________
// |1: XN HashAggregate  (cost=161.28..163.83 rows=340 width=15)               |
// |2:  ->  XN Merge Join DS_DIST_NONE  (cost=0.00..138.27 rows=4602 width=15) |
// |3:        Merge Cond: ("outer".customer_id = "inner".customer_id)          |
// |4:        ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=15)  |
// |5:        ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8) |
//  ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
// Line 1 is the root node, an aggregation without parameters (but with cost estimates).
// Line 2 is a child of the root node, a merge join with distribution parameter.
// Line 3 is additional info for the merge join from line 2.
// Line 4 is a child node for the merge join from line 2.
// Line 5 is another child node for the merge join from line 2.


var parse_plan = function (explain_output) {
    var steps = explain_output.split('\n').filter(step => step != '');
    steps[0] = '-> ' + steps[0]; // Avoid special case for the root node.

    var plan = {};
    var node_id = 0;
    for (const step of steps) {
        if (is_operator(step)) {
            // Parse the specific operator.
            var node = parse_operator(step);
            node['node-id'] = node_id;
            node_id += 1;
            node['level'] = get_indent(step);

            // Find the parent node to build the tree.
            for (var i=node_id-2; i>=0; i--) {
                // Most recent previous line with less indentation is the parent node.
                if (plan[i]['level'] < node['level']) {
                    var parent = plan[i];
                    node['parent'] = parent['node-id'];
                    parent['children'].push(node['node-id']);
                    break;
                }
            }
            plan[node['node-id']] = node;
        } else {
            // Add additional info to the most recent operator.
            // TODO: maybe add operator specific parsing later.
            plan[node_id-1]['info'].push(step.trim());
        }
    }

    return plan;
};

var get_indent = function (step) {
    return step.search(/\S|$/);
};

var is_operator = function (step) {
    return step.search(/\S*->/) != -1;
};

// Redshift operators
// Does not work in Firefox yet, due to https://github.com/tc39/proposal-regexp-named-groups
var R_SEQ_SCAN = /XN\s+(?<op>Seq\s+Scan)\s+on\s+(?<relation>\w+)/i;
var R_JOIN = /XN\s+(?<op>Nested\s+Loop|Hash\s+Join|Hash\s+NOT\s+IN\sJoin|Merge\s+Join)(\s+)(?<dist>\w+)/i;
var R_HASH = /XN\s+(?<op>Hash$)/i;
var R_AGGR = /XN\s+(?<op>Aggregate$|HashAggregate|GroupAggregate)/i;
var R_SORT = /XN\s+(?<op>Merge$|Sort$)/i;
var R_SUBQUERY = /XN\s+(?<op>Subquery\s+Scan)\s+"*(?<relation>[^"(]+)/i;
var R_APPEND = /XN\s+(?<op>Append)/i;
var R_INTERSECT = /XN\s(?<op>Hash\s+Intersect\s+Distinct)(\s+)(?<dist>\w+)/i;
var R_EXCEPT = /XN\s+(?<op>SetOp\s+Except)/i;
var R_UNIQUE = /XN\s+(?<op>Unique)/i;
var R_LIMIT = /XN\s+(?<op>Limit$)/i;
var R_WINDOW = /XN\s+(?<op>Window)/i;
var R_RESULT = /XN\s+(?<op>Result)/i;
//var R_SUBPLAN = /XN/i;
var R_NETWORK = /XN\s+(?<op>Network$)/i;
//var R_MATERIALIZE = /XN/i;
// TODO: Spectrum operators

var mk_operator = function (type, parser) {
    return {'type': type, 'parser': parser};
};

var OPERATORS = [
    mk_operator('SCAN', R_SEQ_SCAN),
    mk_operator('JOIN', R_JOIN),
    mk_operator('JOIN_AGGR', R_HASH),
    mk_operator('AGGR', R_AGGR),
    mk_operator('SORT', R_SORT),
    mk_operator('SUBQ', R_SUBQUERY),
    mk_operator('APND', R_APPEND),
    mk_operator('INTR', R_INTERSECT),
    mk_operator('EXCP', R_EXCEPT),
    mk_operator('UNIQ', R_UNIQUE),
    mk_operator('LIMT', R_LIMIT),
    mk_operator('WIND', R_WINDOW),
    mk_operator('RSLT', R_RESULT),
    //R_SUBPLAN,
    mk_operator('NETW', R_NETWORK),
    //R_MATERIALIZE
];

var parse_operator = function (step) {
    var node = {'children': [], 'info': []};
    var [op, planner_estimates] = step.split('(');

    // Get the operator.
    var parse_success = false;
    op = op.split('->')[1].trim();
    for (const operator of OPERATORS) {
        var parser = operator['parser'];
        let result = match_operator(op, parser);
        if (result['match']) {
            node['type'] = operator['type'];
            $.extend(node, result['result']);
            parse_success = true;
            break;
        }
    }
    if (!parse_success) {
        node['op'] = 'PARSER_FAIL';
    }

    // Get planner estimates.
    planner_estimates = planner_estimates.trim().replace(')', '');
    var [cost, rows, width] = planner_estimates.split(' ');
    node['estimates'] = {
        'cost-first': parseFloat(cost.split('=')[1].split('..')[0]),
        'cost-last': parseFloat(cost.split('=')[1].split('..')[1]),
        'rows': parseInt(rows.split('=')[1]),
        'width': parseInt(width.split('=')[1])
    }

    return node;
};

var match_operator = function (operator, regex) {
    var result = {'match': false};
    var match = operator.match(regex);
    if (match) {
        result['match'] = true;
        result['result'] = match['groups'];
    }
    return result;
};
