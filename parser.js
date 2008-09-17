
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

function LR(seed, rule, next) {
    this.seed = seed;
    this.rule = rule;
    this.next = next;
}

function Head(rule) {
    this.rule = rule;
    this.involvedSet = {};
    this.evalSet = inherit(this.involvedSet);
}

var fail = { toString: function() { return "fail" } },
    Heads = {},
    LRStack = null;

function idMethod() {
    var ids = {}, next = 1;
    return function() {
        return ids[this] || (ids[this] = next++);
    };
}

Function.prototype.id = idMethod();
String.prototype.id = idMethod();

function combinator(c) {
    c.id = c.id();
    return function() {
        var memo = {},
            // TODO convert all arguments to parsers?
            combinator_args = arguments;

        function Recall(s) {
            var m = memo[s],
                h = Heads[s];
            if (!h)
                return m;
            if (!m && h.involvedSet[c.id] != c)
                return fail;
            if (h.evalSet[c.id] == c) {
                h.evalSet[c.id] = null;
                memo[s] = c.apply(s, combinator_args);
            }
            return memo[s];
        }

        function LRAnswer(s, lr) {
            var h = lr.head;
            if (h.rule != c)
                return lr.seed;
            else {
                memo[s] = lr.seed;
                if (lr.seed == fail)
                    return fail;
                GrowLR(s, h);
                return memo[s];
            }
        }

        function GrowLR(s, H) {
            Heads[s] = H;
            while (true) {
                H.evalSet = inherit(H.involvedSet);
                var ans = c.apply(s, combinator_args);
                if (ans == fail ||
                    ans._pos <= memo[s]._pos)
                    break;
                memo[s] = ans;
            }
            delete Heads[s];
        }

        function SetupLR(lr) {
            var head = lr.head || (lr.head = new Head(c));
            for (var s = LRStack; s != lr; s = s.next) {
                s.head = head;
                head.involvedSet[s.rule.id] = s.rule;
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
                var lr = new LR(fail, c, LRStack);
                memo[s] = LRStack = lr;
                var ans = c.apply(s, combinator_args);
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
    }),
    cls: combinator(function(c) {
        var ch = this.at(0) || "";
        return new RegExp("[" + c + "]").test(ch)
            && this.shift(1);
    }),
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
        return state.ok && combinators.rep0(p)(state);
    })
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
    peg.production  = seq(peg.ident, peg.$, tok(':='), peg.$, choice(tok('u'), tok('v')), peg.$);
    peg.grammar     = rep1(peg.production);
    peg.entry_point = peg.grammar;

    var lr = inherit(c);
    lr.expr = choice(seq(lr.lazy('expr'), tok('-'), lr.digit), lr.digit);
    lr.entry_point = lr.expr;
}

if (!('console' in this))
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
