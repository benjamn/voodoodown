
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

function MemoEntry(ans) {
    this.ans = ans;
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

function Recall(R, s) {
    var m = R.memo[s],
        h = Heads[s];
    if (!h) {
        return m;
    }
    if (!m && h.involvedSet[R] != R) {
        return new MemoEntry(fail);
    }
    if (h.evalSet[R] === R) {
        h.evalSet[R] = null;
        R.memo[s].ans = R.call(s);
    }
    return m;
}

function ApplyRule(R, s) {
    var m = Recall(R, s);
    if (m) {
        if (m.ans instanceof LR) {
            SetupLR(R, m.ans);
            return m.ans.seed;
        } else return m.ans;
    } else {
        var lr = new LR(fail, R, null, LRStack);
        LRStack = lr;
        m = new MemoEntry(lr);
        R.memo[s] = m;
        var ans = R.call(s);
        LRStack = LRStack.next;
        if (lr.head) {
            lr.seed = ans;
            return LRAnswer(R, s, m);
        } else {
            return m.ans = ans;
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

function LRAnswer(R, s, M) {
    var lr = M.ans,
        h = lr.head;
    if (h.rule != R)
        return M.ans.seed;
    else {
        M.ans = M.ans.seed;
        if (M.ans === fail)
            return fail;
        GrowLR(R, s, h);
        return R.memo[s].ans;
    }
}

function GrowLR(R, s, H) {
    Heads[s] = H;
    while (true) {
        H.evalSet = inherit(H.involvedSet);
        var ans = R.call(s);
        if (ans === fail)
            break;
        if ((ans+"").length >= (R.memo[s].ans+"").length)
            break;
        R.memo[s] = new MemoEntry(ans);
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
