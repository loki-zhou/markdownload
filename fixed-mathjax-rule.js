  // handle multiple lines math
  turndownService.addRule(\"mathjax\", {
    filter(node, options) {
      return article.math.hasOwnProperty(node.id);
    },
    replacement(content, node, options) {
      const math = article.math[node.id];
      let tex = math.tex.trim().replaceAll(\"\xa0\", \"\");

      if (math.inline) {
        tex = tex.replaceAll(\"\n\", \" \");
        return `$${tex}$`;
      }
      else
        return `$\n${tex}\n$`;
    }
  });
