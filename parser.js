
function state(input, pos) {
    pos = pos || 0;
    this.toString = function() input.slice(pos);
    this.at = function(i) input[pos + i];
    this.shift = function(by) new state(input, pos + by);
    this.pos = pos;
}

function inherit(obj, properties) {
    var ctor = function() {
        for (var k in properties)
            this[k] = properties[k];
    };
    ctor.prototype = obj;
    return new ctor;
}

function MemoEntry(ans, pos) {
    this.ans = ans;
    this.pos = pos;
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
        return new MemoEntry(fail, s.pos);
    }
    if (h.evalSet[R] === R) {
        h.evalSet[R] = null;
        m.ans = R.call(s);
        m.pos = fail === m.ans ? s.pos : m.ans.pos;
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
        m = new MemoEntry(lr, s.pos);
        R.memo[s] = m;
        var ans = R.call(s);
        m.pos = fail === ans ? s.pos : ans.pos;
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
    var h = M.ans.head;
    if (h.rule != R)
        return M.ans.seed;
    else {
        M.ans = M.ans.seed;
        if (M.ans === fail)
            return fail;
        return GrowLR(R, s, M, h);
    }
}

function GrowLR(R, s, M, H) {
    Heads[s] = H;
    while (true) {
        H.evalSet = inherit(H.involvedSet);
        var ans = R.call(s);
        if (ans === fail)
            break;
        if (ans.pos <= M.pos)
            break;
        M.ans = ans;
        M.pos = ans.pos;
    }
    delete Heads[s];
    return M.ans;
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
console.log(parse("1-2-3"));
console.log(new Date().getTime() - start, "ms");
