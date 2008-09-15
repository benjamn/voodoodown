
function inherit(obj, properties) {
    var ctor = function() {
        for (var k in properties)
            this[k] = properties[k];
    };
    ctor.prototype = obj;
    return new ctor;
}

var Memo = (function(cache) {
    function Memo(R, P, m) {
        if (!(R in cache))
            cache[R] = {};
        return arguments.length > 2 
            ? cache[R][P] = m
            : cache[R][P];
    }
    Memo.clear = function() cache = {};
    return Memo;
})({});

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

var Pos = 0;

var fail = {};

var Heads = {};

var LRStack = null;

function Recall(R, P) {
    var m = Memo(R, P),
        h = Heads[P];
    if (!h) {
        return m;
    }
    if (!m && h.involvedSet[R] != R) {
        return new MemoEntry(fail, P);
    }
    if (h.evalSet[R] === R) {
        h.evalSet[R] = null;
        m.ans = R();
        m.pos = Pos;
    }
    return m;
}

function ApplyRule(R, P) {
    var m = Recall(R, P);
    if (m) {
        Pos = m.pos;
        if (m.ans instanceof LR) {
            SetupLR(R, m.ans);
            return m.ans.seed;
        } else return m.ans;
    } else {
        var lr = new LR(fail, R, null, LRStack);
        LRStack = lr;
        m = new MemoEntry(lr, P);
        Memo(R, P, m);
        var ans = R();
        LRStack = LRStack.next;
        m.pos = Pos;
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
        Pos = P;
        H.evalSet = inherit(H.involvedSet);
        var ans = R();
        if (ans === fail || Pos <= M.pos)
            break;
        M.ans = ans;
        M.pos = Pos;
    }
    delete Heads[P];
    Pos = M.pos;
    return M.ans;
}

function digit() {
    var ch = input[Pos];
    if (/[0-9]/.test(ch)) {
        Pos += 1;
        return +ch;
    }
    return fail;
}

function dash() {
    var ch = input[Pos];
    if (ch == '-') {
        Pos += 1;
        return ch;
    }
    return fail;
}

function seq() {
    var e = ApplyRule(expr, Pos);
    if (e === fail)
        return e;
    var d = ApplyRule(dash, Pos);
    if (d === fail)
        return d;
    d = ApplyRule(digit, Pos);
    if (d === fail)
        return d;
    return [e, d];
}

function expr() {
    var e = ApplyRule(seq, Pos);
    if (e != fail)
        return e;
    return ApplyRule(digit, Pos);
}

function parse(str) {
    input = str;
    Pos = 0;
    Memo.clear();
    return ApplyRule(expr, Pos);
}

console.log(parse("1-2-3"));