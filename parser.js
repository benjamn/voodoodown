
function state(input, pos, ast) {
    this.pos = pos = pos || 0;
    this.ast = ast = ast || false;
    
    var tos = pos + "." + this.input_id;
    this.toString = function() { return tos };
    
    this.at = function(i) { return input[pos + i] };
    this.copy = function(gain, ast) {
        return new state(input, pos + (gain || 0), ast);
    };
}

// Quick way to distinguish states from the fail singleton:
state.prototype.ok = true;

function inherit(proto) {
    function ctor() {}
    proto && (ctor.prototype = proto);
    return new ctor;
}

function LR(seed, rule_id, next) {
    this.seed = seed;
    this.rule_id = rule_id;
    this.next = next;
}

function Head(rule_id) {
    this.rule_id = rule_id;
    this.involvedSet = {};
    this.evalSet = inherit(this.involvedSet);
}

var fail = {
    toString: function() { return "fail" },
    copy: Object.prototype.valueOf
},
    Heads = {},
    LRStack = null;

function counter(next) { return function() { return next++ } }

String.prototype.id = (function(idgen) {
    var ids = {};
    return function() {
        return ids[this] || (ids[this] = idgen());
    };
})(counter(1));

function combinator(c, no_conversion) {
    return function() {
        var rule_id = combinators.idgen(),
            memo = {},
            c_args = arguments;
            
        if (!no_conversion) {
            for (var i = 0; i < c_args.length; ++i) {
                switch (typeof c_args[i]) {
                case "undefined": throw [c_args, i];
                case "function": break;
                default: case "string":
                    c_args[i] = combinators.tok(c_args[i]);
                }
            }
        }

        function Eval(s) {
            var ans = c.apply(s, c_args);
            if (ans === s)
                ans = ans.copy();
            return ans;
        }

        function Recall(s) {
            var m = memo[s],
                h = Heads[s];
            if (!h)
                return m;
            if (!m && h.involvedSet[rule_id])
                return fail;
            if (h.evalSet[rule_id]) {
                h.evalSet[rule_id] = false;                
                memo[s] = Eval(s);
            }
            return memo[s];
        }

        function LRAnswer(s, lr) {
            var seed = lr.seed,
                head = lr.head;
            if (head.rule_id != rule_id)
                return seed;
            if (!(memo[s] = seed).ok)
                return fail;
            GrowLR(s, head);
            return memo[s];
        }

        function GrowLR(s, H) {
            Heads[s] = H;
            while (true) {
                H.evalSet = inherit(H.involvedSet);
                var ans = Eval(s);
                if (!ans.ok || ans.pos <= memo[s].pos)
                    break;
                memo[s] = ans;
            }
            delete Heads[s];
        }

        function SetupLR(lr) {
            var head = lr.head || (lr.head = new Head(rule_id));
            for (var s = LRStack; s != lr; s = s.next) {
                s.head = head;
                head.involvedSet[s.rule_id] = true;
            }
        }

        function parse(s) {
            var m = Recall(s);
            if (m instanceof LR) {
                SetupLR(m);
                return m.seed;
            } else if (m)
                return m;
            var lr = new LR(fail, rule_id, LRStack);
            memo[s] = LRStack = lr;
            var ans = Eval(s);
            LRStack = LRStack.next;
            if (!lr.head)
                return memo[s] = ans;
            lr.seed = ans;
            return LRAnswer(s, lr);
        }

        return parse;
    };
}

var combinators = {
    tok: combinator(function(t) {
        var len = t.length;
        for (var i = 0; i < len; i++)
            if (this.at(i) != t[i])
                return fail;
        return this.copy(len, t);
    }, true),
    cls: combinator(function(c) {
        var ch = this.at(0) || "";
        if (new RegExp("[" + c + "]").test(ch))
            return this.copy(1, ch);
        return fail;
    }, true),
    and: combinator(function(p) { return p(this).ok ? this : fail }),
    not: combinator(function(p) { return p(this).ok ? fail : this }),
    opt: combinator(function(p) {
        var state = p(this);
        return state.ok ? state : this;
    }),
    seq: combinator(function() {
        var p, state = this, i = 0, ast = [];
        while (state.ok && (p = arguments[i++]))
            if ((state = p(state)).ok)
                ast.push(state.ast);
        return state.copy(0, ast);
    }),
    choice: combinator(function() {
        var p, state = fail, i = 0;
        while ((p = arguments[i++]))
            if ((state = p(this)).ok)
                break;
        return state;
    }),
    rep0: combinator(function(p) {
        var next, state = this, ast = [];
        while (state.ok)
            if ((next = p(state)).ok)
                ast.push((state = next).ast);
        return state.copy(0, ast);
    }),
    rep1: combinator(function(p) {
        var next, state = p(this), ast = [state.ast];
        while (state.ok)
            if ((next = p(state)).ok)
                ast.push((state = next).ast);
        return state.copy(0, ast);
    }),
    idgen: counter(0)
};

combinators.handle = combinator(function(p, handler) {
    var state = p(this);
    if (state.ok)
        switch (typeof handler) {
        case "function":
            state.ast = handler(state.ast);
            break;
        case "number":
            state.ast = state.ast[handler];
            break;
        case "string":
            var ast = state.ast,
                args = [].slice.call(arguments, 2);
            state.ast = ast[handler].apply(ast, args);
            break;
        }
    return state;
}, true);

combinators.any = combinator(function() {
    return this.copy(1, this.at(0));
}, true)();

var core = {
    parse: function(s) {
        var s, start = +new Date, end;
        state.prototype.input_id = s.id();
        s = this.entry_point(new state(s));
        end = +new Date;
        console.log(s);
        console.log((end - start) + "ms");
        return s.ast;
    },
    lazy: function(name) {
        var obj = this;
        return function() {
            return obj[name].apply(this, arguments);
        }
    }
};

var c = inherit(core);
with (combinators) {
    c.initial = cls("a-zA-Z_$");
    c.digit = cls("0-9");
    c.ident = handle(seq(c.initial,
                         handle(rep0(choice(c.digit, c.initial)),
                                "join", "")),
                     "join", "");
    c.$ = handle(rep0(cls("\\s")), "join", "");
}

function stress_test() {
    var lr = inherit(c);
    
    with (combinators)
        lr.expr = choice(seq(lr.lazy("expr"), "-", lr.digit), lr.digit);
    
    lr.entry_point = lr.expr;
    
    var s = "0-2-4-6-8";
    for (var i = 0; i < 5; i++)
        s = [s,s,s,s].join("-");
    
    lr.parse(s);
}

if (!("console" in this)) {
    this.console = {
        log: function() {
            return print.apply(this, arguments);
        }
    };
    stress_test();
}
