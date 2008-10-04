with (combinators) {
    var html = inherit(c);
    
    html.start_tag = handle(seq("<", html.ident, ">"), 1);
    
    html.end_tag = handle(seq("</", html.ident, ">"), 1);
    
    html.normal_node = handle(seq(html.start_tag,
                                  rep0(html.lazy("node")),
                                  html.end_tag),
                              function(ast) {
                                  if (ast[0] != ast[2])
                                      throw ["mismatched tags", ast[0], ast[2]];
                                  var parent = document.createElement(ast[0]);
                                  for (var child, i = 0; child = ast[1][i]; ++i)
                                      parent.appendChild(child);
                                  return parent;
                              });
    
    html.single_tag = handle(seq("<", html.ident, "/>"),
                             function(ast) {
                                 return document.createElement(ast[1]);
                             });
    
    html.text_node = handle(rep1(handle(seq(not("<"), any), 1)),
                            function(ast) {
                                return document.createTextNode(ast.join(""));
                            });

    html.node = choice(html.normal_node,
                       html.single_tag,
                       html.text_node);
    
    html.entry_point = html.node;
}

function html_test() {
    return html.parse("<div>a<img/><span>b</span>c</div>");
}
