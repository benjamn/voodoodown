var calc = inherit(c);

with (combinators) {
    var expr = calc.lazy("expr");

    calc.additive = handle(seq(expr, cls("+-"), expr), function(ast) {
        var a = Number(ast[0]),
            b = Number(ast[2]);
        switch (ast[1]) {
        case "+": return a + b;
        case "-": return a - b;
        }
    });

    calc.multiplicative = handle(seq(expr, cls("*/"), expr), function(ast) {
        var a = Number(ast[0]),
            b = Number(ast[2]);
        switch (ast[1]) {
        case "*": return a * b;
        case "/": return a / b;
        }
    });

    // Note: (1) precedence is enforced by ordered choice
    //       (2) calc.expr is left-recursive
    calc.expr = choice(calc.multiplicative,
                       calc.additive,
                       calc.integer);

    calc.entry_point = calc.expr;
}

// Computes 7 without building an AST:
// calc.parse("1+2*3")

