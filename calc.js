var calc = inherit(c);

with (combinators) {
    var expr = calc.lazy("expr");

    calc.additive = handle(seq(expr, cls("+-"), expr), function(ast) {
        switch (ast[1]) {
        case "+": return Number(ast[0]) + Number(ast[2]);
        case "-": return Number(ast[0]) - Number(ast[2]);
        default: return ast;
        }
    });

    calc.multiplicative = handle(seq(expr, cls("*/"), expr), function(ast) {
        switch (ast[1]) {
        case "*": return Number(ast[0]) * Number(ast[2]);
        case "/": return Number(ast[0]) / Number(ast[2]);
        default: return ast;
        }
    });

    // Ordered choice is convenient!
    calc.expr = choice(calc.multiplicative,
                       calc.additive,
                       calc.integer);

    calc.entry_point = calc.expr;
}

// calc.parse("1+2*3");

