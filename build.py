import pathlib
src = pathlib.Path('src')
html = (src/'shell.html').read_text()
for tag, f in [('/*STYLE*/','style.css'),('/*DATA*/','data.js'),('/*ENGINE*/','engine.js'),('/*APP*/','app.js')]:
    html = html.replace(tag, (src/f).read_text())
assert '</script' not in (src/'app.js').read_text()
out = pathlib.Path("."); 
(out/'index.html').write_text(html)
print(len(html))
