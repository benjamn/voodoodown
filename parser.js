
function state(input, pos) {
    pos = pos || 0;

    this._pos = pos;
    var tos = pos + "." + state.input_id;

    this.toString = function() { return tos };
    this.at = function(i) { return input[pos + i] };
    this.shift = function(by) { return new state(input, pos + by) };
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

var fail = { toString: function() { return "fail" } },
    Heads = {},
    LRStack = null;

function counter(next) { return function() { return next++ } }

String.prototype.id = (function(idgen) {
    var ids = {};
    return function() {
        return ids[this] || (ids[this] = idgen());
    };
})(counter(1));

function combinator(c, skip_conversion) {
    return function() {
        var rule_id = combinators.idgen(),
            memo = {},
            c_args = arguments;
            
        if (!skip_conversion) {
            for (var i = 0; i < c_args.length; ++i) {
                switch (typeof c_args[i]) {
                case "function": break;
                default: case "string":
                    c_args[i] = combinators.tok(c_args[i]);
                }
            }
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
                memo[s] = c.apply(s, c_args);
            }
            return memo[s];
        }

        function LRAnswer(s, lr) {
            var seed = lr.seed,
                head = lr.head;
            if (head.rule_id != rule_id)
                return seed;
            else {
                memo[s] = seed;
                if (!seed.ok)
                    return seed;
                GrowLR(s, head);
                return memo[s];
            }
        }

        function GrowLR(s, H) {
            Heads[s] = H;
            while (true) {
                H.evalSet = inherit(H.involvedSet);
                var ans = c.apply(s, c_args);
                if (!ans.ok || ans._pos <= memo[s]._pos)
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

        return function(s) {
            var m = Recall(s);
            if (m) {
                if (m instanceof LR) {
                    SetupLR(m);
                    return m.seed;
                } else return m;
            } else {
                var lr = new LR(fail, rule_id, LRStack);
                memo[s] = LRStack = lr;
                var ans = c.apply(s, c_args);
                LRStack = LRStack.next;
                if (lr.head) {
                    lr.seed = ans;
                    return LRAnswer(s, lr);
                } else {
                    return memo[s] = ans;
                }
            }
        };
    };
}

var combinators = {
    tok: combinator(function(t) {
        var len = t.length;
        for (var i = 0; i < len; i++)
            if (this.at(i) != t[i])
                return fail;
        return this.shift(len);
    }, true),
    cls: combinator(function(c) {
        var ch = this.at(0) || "";
        if (new RegExp("[" + c + "]").test(ch))
            return this.shift(1);
        return fail;
    }, true),
    and: combinator(function(p) { return  p(this).ok && this }),
    opt: combinator(function(p) { return  p(this).ok || this }),
    not: combinator(function(p) { return !p(this).ok && this }),
    seq: combinator(function() {
        var p, state = this, i = 0;
        while (state.ok && (p = arguments[i++]))
            state = p(state);
        return state;
    }),
    choice: combinator(function() {
        var p, state = fail, i = 0;
        while ((p = arguments[i++]))
            if ((state = p(this)).ok)
                break;
        return state;
    }),
    rep0: combinator(function(p) {
        var next, state = this;
        while (state.ok && (next = p(state)).ok)
            state = next;
        return state;
    }),
    rep1: combinator(function(p) {
        var state = p(this);
        if (state.ok)
            return combinators.rep0(p)(state);
        return fail;
    }),
    
    idgen: counter(0)
};

var core = {
    parse: function(s) {
        state.input_id = s.id();
        return this.entry_point(new state(s));
    },
    lazy: function(name) {
        var obj = this;
        return function() {
            return obj[name].apply(this, arguments);
        }
    }
};

with (combinators) {
    var c = inherit(core);
    c.initial = cls("a-zA-Z_$");
    c.digit = cls("0-9");
    c.ident = seq(c.initial, rep0(choice(c.digit, c.initial)));
    c.$ = rep0(cls("\\s"));

    var peg = inherit(c);
    peg.production  = seq(peg.ident, peg.$, ":=", peg.$, choice("u", "v"), peg.$);
    peg.grammar     = rep1(peg.production);
    peg.entry_point = peg.grammar;

    var lr = inherit(c);
    lr.expr = choice(seq(lr.lazy("expr"), "-", lr.digit), lr.digit);
    lr.entry_point = lr.expr;
}

if (!("console" in this))
    this.console = {
        log: function() {
            return print.apply(this, arguments);
        }
    };

var s = "0-2-4-6-8";
for (var i = 0; i < 5; i++)
    s = [s,s,s,s].join("-");
console.log(s.length);
var start = new Date().getTime();
console.log(lr.parse(s));
console.log((new Date().getTime() - start) + "ms");
