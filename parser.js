
function state(input, pos) {
    pos = pos || 0;
    this.toString = function() input.slice(pos);
    this.at = function(i) input[pos + i];
    this.shift = function(by) new state(input, pos + by);
}

function inherit(obj, properties) {
    var ctor = function() {
        for (var k in properties)
            this[k] = properties[k];
    };
    ctor.prototype = obj;
    return new ctor;
}

function LR(seed, rule, head, next) {
    this.seed = seed;
    this.rule = rule;
    this.head = head;
    this.next = next;
}

function Head(rule) {
    this.rule = rule;
    this.involvedSet = {};
    this.evalSet = inherit(this.involvedSet);
}

var input;

const fail = { toString: function() "fail" };

var Heads = {};

var LRStack = null;

function store(R, s, ans) {
    R.memo[s] = ans;
}

function fetch(R, s) {
    return R.memo[s];
}

function Recall(R, s) {
    var m = fetch(R, s),
        h = Heads[s];
    if (!h) {
        return m;
    }
    if (!m && h.involvedSet[R] != R) {
        return fail;
    }
    if (h.evalSet[R] === R) {
        h.evalSet[R] = null;
        store(R, s, R.call(s));
    }
    return fetch(R, s);
}

function ApplyRule(R, s) {
    var m = Recall(R, s);
    if (m) {
        if (m instanceof LR) {
            SetupLR(R, m);
            return m.seed;
        } else return m;
    } else {
        var lr = new LR(fail, R, null, LRStack);
        LRStack = lr;
        store(R, s, lr);
        var ans = R.call(s);
        LRStack = LRStack.next;
        if (lr.head) {
            lr.seed = ans;
            return LRAnswer(R, s, lr);
        } else {
            store(R, s, ans);
            return ans;
        }
    }
}

function SetupLR(R, L) {
    L.head = L.head || new Head(R);
    for (var s = LRStack; s.head != L.head; s = s.next) {
        s.head = L.head;
        L.head.involvedSet[s.rule] = s.rule;
    }
}

function LRAnswer(R, s, lr) {
    var h = lr.head;
    if (h.rule != R)
        return lr.seed;
    else {
        store(R, s, lr.seed);
        if (lr.seed === fail)
            return fail;
        GrowLR(R, s, h);
        return fetch(R, s);
    }
}

function GrowLR(R, s, H) {
    Heads[s] = H;
    while (true) {
        H.evalSet = inherit(H.involvedSet);
        var ans = R.call(s);
        if (ans === fail)
            break;
        if ((ans+"").length >= (fetch(R, s)+"").length)
            break;
        store(R, s, ans);
    }
    delete Heads[s];
}

function memo(rule) {
    rule.memo = rule.memo || {};
    rule.parser = function(s) {
        return ApplyRule(rule, s);
    }
    rule.parser.toString = function() rule + "";
    return rule.parser;
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
    if (e === fail)
        return e;
    var d = dash(e);
    if (d === fail)
        return d;
    return digit(d);
});

var expr = memo(function() {
    var e = seq(this);
    if (e != fail)
        return e;
    return digit(this);
});

function parse(str) {
    return expr(new state(str));
}

var start = new Date().getTime();
console.log(parse("1-2-3-4-5-6-7"));
console.log(new Date().getTime() - start, "ms");
