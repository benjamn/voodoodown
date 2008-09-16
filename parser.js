
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

const fail = { toString: function() "fail" };

var Heads = {};

var LRStack = null;

function Recall(R, s) {
    var m = R.memo[s],
        h = Heads[s];
    if (!h) {
        return m;
    }
    if (!m && h.involvedSet[R] != R) {
        return fail;
    }
    if (h.evalSet[R] === R) {
        h.evalSet[R] = null;
        R.memo[s] = R.call(s);
    }
    return R.memo[s];
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
    for (var s = LRStack; s.head != lr.head; s = s.next) {
        s.head = lr.head;
        lr.head.involvedSet[s.rule] = s.rule;
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
        if (ans === fail)
            break;
        if ((ans+"").length >= (R.memo[s]+"").length)
            break;
        R.memo[s] = ans;
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
