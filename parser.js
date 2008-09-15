
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

function Recall(R, P) {
    R.memo = R.memo || {};
    var m = R.memo[P],
        h = Heads[P];
    if (!h) {
        return m;
    }
    if (!m && h.involvedSet[R] != R) {
        return new MemoEntry(fail, P);
    }
    if (h.evalSet[R] === R) {
        h.evalSet[R] = null;
        m.ans = R(new state(input, P));
        m.pos = m.ans === fail ? P : m.ans.pos;
    }
    return m;
}

function ApplyRule(R, P) {
    var m = Recall(R, P);
    if (m) {
        if (m.ans instanceof LR) {
            SetupLR(R, m.ans);
            return m.ans.seed;
        } else return m.ans;
    } else {
        var lr = new LR(fail, R, null, LRStack);
        LRStack = lr;
        m = new MemoEntry(lr, P);
        R.memo[P] = m;
        var ans = R(new state(input, m.pos = P));
        if (ans != fail)
            m.pos = ans.pos;
        LRStack = LRStack.next;
        if (lr.head) {
            lr.seed = ans;
            return LRAnswer(R, P, m);
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

function LRAnswer(R, P, M) {
    var h = M.ans.head;
    if (h.rule != R)
        return M.ans.seed;
    else {
        M.ans = M.ans.seed;
        if (M.ans === fail)
            return fail;
        return GrowLR(R, P, M, h);
    }
}

function GrowLR(R, P, M, H) {
    Heads[P] = H;
    while (true) {
        H.evalSet = inherit(H.involvedSet);
        var ans = R(new state(input, P));
        if (ans === fail)
            break;
        if (ans.pos <= M.pos)
            break;
        M.ans = ans;
        M.pos = ans.pos;
    }
    delete Heads[P];
    return M.ans;
}

function digit(s) {
    var ch = s.at(0);
    if (/[0-9]/.test(ch))
        return s.shift(1);
    return fail;
}

function dash(s) {
    var ch = s.at(0);
    if (ch == '-')
        return s.shift(1);
    return fail;
}

function seq(s) {
    var e = ApplyRule(expr, s.pos);
    if (e === fail)
        return e;
    var d = ApplyRule(dash, e.pos);
    if (d === fail)
        return d;
    return ApplyRule(digit, d.pos);
}

function expr(s) {
    var e = ApplyRule(seq, s.pos);
    if (e != fail)
        return e;
    return ApplyRule(digit, s.pos);
}

function parse(str) {
    input = str;
    return ApplyRule(expr, 0);
}

console.log(parse("1-2-3"));