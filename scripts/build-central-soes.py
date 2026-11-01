"""Render the static directory from the reviewed, source-backed JSON catalogue."""
import html
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "static/central-soes"
data = json.loads((PAGE / "data.json").read_text())
esc = lambda value: html.escape(str(value), quote=True)


def link(url, label, cls="", title=""):
    if not url:
        return '<span class="unavailable">' + esc(label) + '待核实</span>'
    if not url.startswith(("https://", "http://")):
        raise ValueError("Only public HTTP links are allowed: " + url)
    return f'<a class="{cls}" href="{esc(url)}" target="_blank" rel="noopener noreferrer" title="{esc(title or label)}">{esc(label)} <span aria-hidden="true">↗</span></a>'


groups = {}
scopes = {name: {} for name in ("国资委监管央企", "中央金融企业", "其他中央企业")}
for item in data["companies"]:
    groups.setdefault(item["category"], []).append(item)
    scopes[item["scope"]].setdefault(item["category"], []).append(item)
sections = []
for major_number, (scope, industries) in enumerate(scopes.items(), 1):
    subsections = []
    for number, (category, companies) in enumerate(industries.items(), 1):
        cards = []
        for company in companies:
            keywords = " ".join([company["name"], company.get("aliases", ""), category, company["scope"]])
            links = link(company.get("website"), "官网", "website") + link(company.get("recruitment"), company.get("recruitmentLabel", "招聘入口"), "recruit")
            note = company.get("note", "")
            provenance = link(company.get("source"), "入口来源", "source") if company.get("source") else ""
            note_html = f'\n          <p class="note">{esc(note)}</p>' if note else ''
            cards.append(f'''<article class="company" data-search="{esc(keywords.lower())}" data-scope="{esc(company['scope'])}">
          <h4 class="company-name">{esc(company['name'])}</h4>{note_html}
          <div class="company-bottom"><div class="actions">{links}</div>{provenance}</div>
        </article>''')
        subsections.append(f'<section class="industry" data-category="{esc(category)}" id="industry-{major_number}-{number}"><div class="section-heading"><h3><span>{number:02d}</span> {esc(category)}</h3><span class="group-count">{len(companies)} 家</span></div><div class="company-grid">' + "\n".join(cards) + '</div></section>')
    count = sum(len(companies) for companies in industries.values())
    sections.append(f'<section class="major-category" data-major="{esc(scope)}" aria-labelledby="major-{major_number}"><div class="major-heading"><h2 id="major-{major_number}">{esc(scope)}</h2><span class="major-count">{count} 家 · {len(industries)} 个行业</span></div>' + "\n".join(subsections) + '</section>')

filters = ''.join(f'<button type="button" class="chip" data-category-filter="{esc(k)}" aria-pressed="false" title="再次点击取消筛选">{esc(k)} <span>{len(v)}</span></button>' for k, v in groups.items())
scope_filters = ''.join(f'<button type="button" class="scope-filter{" active" if i == 0 else ""}" data-scope-filter="{esc(scope)}" aria-pressed="{"true" if i == 0 else "false"}">{esc(scope)} <span>{sum(len(v) for v in industries.values())}</span></button>' for i, (scope, industries) in enumerate(scopes.items()))
sources = ''.join(f'<li>{link(s["url"], s["title"])}<span>{esc(s.get("note", ""))}</span></li>' for s in data['sources'])
total = len(data['companies'])
recruitment_total = sum(bool(x.get('recruitment')) for x in data['companies'])
output = (ROOT / "scripts/central-soes.template.html").read_text()
asset_version = hashlib.sha256((PAGE / "style.css").read_bytes() + (PAGE / "directory.js").read_bytes()).hexdigest()[:12]
for key, value in {"SECTIONS": '\n'.join(sections), "FILTERS": filters, "SCOPE_FILTERS": scope_filters, "SOURCES": sources, "TOTAL": str(total), "GROUPS": str(len(groups)), "RECRUITMENT_TOTAL": str(recruitment_total), "CHECKED_ON": data['checkedOn'], "ASSET_VERSION": asset_version}.items():
    output = output.replace('{{' + key + '}}', value)
(PAGE / 'index.html').write_text(output)
print(f"Rendered {total} companies in {len(groups)} categories; {recruitment_total} recruitment links.")
