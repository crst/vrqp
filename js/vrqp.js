var DEV = false;

$(document).ready(function () {
    render_example_plans();
    if (!DEV) {
        $('#newPlan').modal('show');
        $('#visualize').click(visualize);
    } else {
        var idx = 5;
        var idx = parseInt(Math.random() * example_plans.length);
        $('#explain-output').attr('placeholder', example_plans[idx]['plan']);
        visualize();
    }
});


var visualize = function () {
    var explain_output = $('#explain-output').val();
    if (explain_output.trim().length === 0) {
        explain_output = $('#explain-output').attr('placeholder');
    }


    try {
        var plan = parse_plan(explain_output);
        analyze_plan(plan);

        $('#show-node-confidence').click(mk_toggle(show_node_confidence, plan));
        $('#show-slow-nodes').click(mk_toggle(show_slow_nodes, plan));
        $('#show-pipeline-blocker').click(mk_toggle(show_pipeline_blocker, plan));

        var buffer = [];
        var html = render_plan(plan, plan[0], buffer);
        $('#query-plan').html(html);
        adjust_edges(plan);

        $(function () {
            $('[data-toggle="popover"]').popover({
                'html': true,
                'trigger': 'hover click'
            });
        });
    } catch (err) {
        if (DEV) {
            console.log(err);
        }
        $('#query-plan').html('Failed to render plan :/');
    }
};

var mk_toggle = function (fn, plan) {
    return function () {
        var was_active = $(this).hasClass('active');
        $('#analyze-buttons > .btn').removeClass('active');
        reset_nodes();
        if (was_active) {
            $(this).addClass('active');
        }

        $(this).button('toggle');
        if ($(this).hasClass('active')) {
            fn(plan);
        }
    };
};


var example_plan_template = `
<select id="select-example-plan" class="form-control">
  {{#each examples}}
  <option value="{{@index}}">{{this.name}}</option>
  {{/each}}
</select>
`;

var render_example_plans = function () {
    var ctx = {'examples': example_plans};
    var tpl = Handlebars.compile(example_plan_template)(ctx);
    $('#example-select').html(tpl);

    $('#select-example-plan').change(function () {
        var idx = parseInt($(this).val());
        $('#explain-output').attr('placeholder', example_plans[idx]['plan']);
    });

    var random_plan = parseInt(Math.random() * example_plans.length);
    $('#select-example-plan').val(random_plan).change();
};
