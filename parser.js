
function state(input, pos) {
    pos = pos || 0;
    this._pos = pos;
    var tos = pos + "." + state.input_id;
    this.toString = function() { return tos };
    this.at = function(i) { return input[pos + i] };
    this.shift = function(by) { return new state(input, pos + by) };
}

function inherit(obj) {
    function ctor() {}
    ctor.prototype = obj;
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

var fail = { toString: function() { return "fail" } };

var Heads = {};

var LRStack = new LR;

function Recall(R, s) {
    var cache = R.memo,
        m = cache[s],
        h = Heads[s];
    if (!h) {
        return m;
    }
    if (!m && h.involvedSet[R.id] != R) {
        return fail;
    }
    if (h.evalSet[R.id] == R) {
        h.evalSet[R.id] = null;
        cache[s] = R.call(s);
    }
    return cache[s];
}

function ApplyRule(R, s) {
    var m = Recall(R, s);
    if (m) {
        if (m instanceof LR) {
            SetupLR(R, m);
            return m.seed;
        } else return m;
    } else {
        var lr = new LR(fail, R, LRStack);
        R.memo[s] = LRStack = lr;
        var ans = R.call(s);
        LRStack = LRStack.next;
        if (lr.head) {
            lr.seed = ans;
            return LRAnswer(R, s, lr);
        } else {
            return R.memo[s] = ans;
        }
    }
}

function SetupLR(R, lr) {
    lr.head = lr.head || new Head(R);
    for (var s = LRStack; s != lr; s = s.next) {
        s.head = lr.head;
        lr.head.involvedSet[s.rule.id] = s.rule;
    }
}

function LRAnswer(R, s, lr) {
    var h = lr.head;
    if (h.rule != R)
        return lr.seed;
    else {
        R.memo[s] = lr.seed;
        if (lr.seed === fail)
            return fail;
        GrowLR(R, s, h);
        return R.memo[s];
    }
}

function GrowLR(R, s, H) {
    Heads[s] = H;
    while (true) {
        H.evalSet = inherit(H.involvedSet);
        var ans = R.call(s);
        if (ans === fail ||
            ans._pos <= R.memo[s]._pos)
            break;
        R.memo[s] = ans;
    }
    delete Heads[s];
}

var next_rule_id = 0;
function memo(rule) {
    rule.id = next_rule_id++;
    rule.memo = rule.memo || {};
    return function(s) {
        return ApplyRule(rule, s);
    }
}

var digit = memo(function() {
    var ch = this.at(0);
    if (/[0-9]/.test(ch))
        return this.shift(1);
    return fail;
});

var dash = memo(function() {
    var ch = this.at(0);
    if (ch == '-')
        return this.shift(1);
    return fail;
});

var seq = memo(function() {
    var e = expr(this);
    if (e == fail)
        return e;
    var d = dash(e);
    if (d == fail)
        return d;
    return digit(d);
});

var expr = memo(function() {
    var e = seq(this);
    if (e != fail)
        return e;
    return digit(this);
});

String.prototype.id = (function() {
    var ids = {}, next = 1;
    return function() {
        return ids[this] || (ids[this] = next++);
    };
})();

function parse(str) {
    state.input_id = str.id();
    return expr(new state(str));
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
console.log(parse(s));
console.log(new Date().getTime() - start, "ms");
