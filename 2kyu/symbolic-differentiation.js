let tokenize = (t) => t.match(/(\()|(\))|([0-9\-]+)|x|[\+\-\*\/\^]|(cos)|(sin)|(tan)|(exp)|(ln)/g);
let immediate = (t) => t.constructor.name === "String";
let constant = (t) => immediate(t) && t !== "x";
let derive = (t) => (constant(t) ? derivations["imm"] : derivations[t[0]])(t);
let render = (t) => immediate(t) ? t : "(" + t[0] + " " + render(t[1]) + (t[2] ? (" " + render(t[2])) : "") + ")";
let diff = (expr) => render(optimize(derive(parse(tokenize(expr)))));

let parse = (t) => {
    let els = [];
    let next = undefined;
    while ((next = t.shift()) !== undefined) {
        if (next === "(") els.push(parse(t));
        else if (next === ")") break;
        else els.push(next);
    }
    return els.length === 1 ? els[0] : els;
};

let derivations = {
    "imm": () => "0",
    "x": () => "1",
    "+": ([_, a, b]) => ["+", derive(a), derive(b)],
    "-": ([_, a, b]) => ["-", derive(a), derive(b)],
    "*": ([_, a, b]) => ["+", ["*", derive(a), b], ["*", derive(b), a]],
    "/": ([_, a, b]) => ["/", ["-", ["*", derive(a), b], ["*", a, derive(b)]], ["^", b, "2"]],
    "^": ([_, a, b]) => ["*", derive(a), ["*", b, ["^", a, ["-", b, "1"]]]], // Assuming b is constant
    "sin": ([_, x]) => ["*", derive(x), ["cos", x]],
    "cos": ([_, x]) => ["*", derive(x), ["*", "-1", ["sin", x]]],
    "tan": ([_, x]) => ["/", derive(x), ["^", ["cos", x], "2"]],
    "exp": ([_, x]) => ["*", derive(x), ["exp", x]],
    "ln": ([_, x]) => ["/", derive(x), x],
};


let optimize = (t) => {
    if (immediate(t)) return t;

    if (t[1]) t[1] = optimize(t[1]);
    if (t[2]) t[2] = optimize(t[2]);

    if (constant(t[1]) && constant(t[2]) && "-*/^+".includes(t[0]))
        return eval(t[1] + t[0].replace("^", "**") + t[2]).toString();

    if (t[0] == "+" && t[1] == "0") return t[2];
    if (t[0] == "+" && t[2] == "0") return t[1];
    if (t[0] == "-" && t[2] == "0") return t[1];
    if (t[0] == "*" && t[1] == "1") return t[2];
    if (t[0] == "*" && t[2] == "1") return t[1];
    if (t[0] == "*" && t[1] == "0") return "0";
    if (t[0] == "*" && t[2] == "0") return "0";
    if (t[0] == "/" && t[1] == "0") return "0";
    if (t[0] == "/" && t[2] == "1") return t[1];
    if (t[0] == "/" && t[1] == t[2]) return "1";
    if (t[0] == "^" && t[2] == "1") return t[1];
    if (t[0] == "^" && t[2] == "0") return "1";

    if (t[0] == "*" && t[1][0] == "/" && constant(t[1][1])) return optimize(["/", ["*", t[2], t[1][1]], t[1][2]]); // Optimizing (1/x)*-1 -> (1*-1)/x -> -1/x
    if (t[0] == "*" && t[2][0] == "/" && constant(t[2][1])) return optimize(["/", ["*", t[1], t[2][1]], t[2][2]]);

    for (let i = 1; i <= 2; i++)
        for (let j = 1; j <= 2; j++)
            if (t[0] == "*" && t[i][0] == "*" && constant(t[i][j])) return optimize(["*", ["*", t[3 - i], t[i][j]], t[i][3 - j]]);
    
    return t;
};
