"""Inline src/ into one self-contained index.html (fonts, paintings, data, code). Run: python3 build.py"""
import pathlib

root = pathlib.Path(__file__).resolve().parent
src = root / 'src'
CSS = ['fonts.css', 'style.css', 'ops.css']
JS = ['images.js', 'data.js', 'data_ops.js', 'engine.js', 'paint.js', 'app.js', 'live.js', 'ops.js', 'ops_boards.js', 'boot.js']

read = lambda name: (src / name).read_text(encoding='utf-8')
for name in JS:
    assert '</script' not in read(name), f'{name} contains a closing script tag'
html = read('shell.html')
html = html.replace('/*STYLE*/', ''.join(read(f) for f in CSS))
html = html.replace('/*SCRIPT*/', ''.join(read(f) for f in JS))
(root / 'index.html').write_text(html, encoding='utf-8')
print(f'index.html written: {len(html.encode("utf-8")):,} bytes')
