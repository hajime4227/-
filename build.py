"""src/ の部品ファイルから index.html を組み立てる。 使い方: python3 build.py"""
import pathlib
s = pathlib.Path(__file__).parent / "src"
css = (s / "style.css").read_text(encoding="utf-8")
parts = ["data.js", "app-core.js", "app-candidate.js", "app-admin.js", "app-main.js"]
js = "\n".join((s / p).read_text(encoding="utf-8") for p in parts)
tpl = (s / "index.template.html").read_text(encoding="utf-8")
out = tpl.replace("/*CSS*/", css).replace("/*JS*/", js)
(pathlib.Path(__file__).parent / "index.html").write_text(out, encoding="utf-8")
print("index.html を作成しました")
