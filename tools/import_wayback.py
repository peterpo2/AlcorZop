#!/usr/bin/env python
import argparse
import csv
import json
import os
import re
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup

try:
    import lxml  # noqa: F401
    HTML_PARSER = "lxml"
except Exception:
    HTML_PARSER = "html.parser"

DATE_RE = re.compile(r"([0-9]{2}\.[0-9]{2}\.[0-9]{4})")
DATE_DOTTED_RE = re.compile(r"\b[0-9]{2}\.[0-9]{2}\.[0-9]{4}\b")
LABEL_PUBLISH_DATE = "Началната дата:"
LABEL_AOP = "Уникален номер в регистъра на АОП:"
LABEL_INTERNAL = "Вътрешен номер в системата:"
PUBLISHED_RE = re.compile(r"Публикувано на\s*:\s*(.+)")

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
}
ALLOWED_EXTENSIONS = (".pdf", ".doc", ".docx", ".xls", ".xlsx")


@dataclass
class CsvRow:
    url: str
    page_name: str
    subtopic: str


class Importer:
    def __init__(
        self,
        flask_base: str,
        auth_user: Optional[str],
        auth_pass: Optional[str],
        sleep_seconds: float,
        timeout: int,
        dry_run: bool,
    ) -> None:
        self.flask_base = flask_base.rstrip("/")
        self.sleep_seconds = sleep_seconds
        self.timeout = timeout
        self.dry_run = dry_run
        self.session = requests.Session()
        self.api_auth = (auth_user, auth_pass) if auth_user and auth_pass else None
        self.pages_cache = None
        self.entries_cache = None

    def log(self, message: str) -> None:
        print(message, flush=True)

    def sleep(self) -> None:
        if self.sleep_seconds > 0:
            time.sleep(self.sleep_seconds)

    def fetch(self, url: str, stream: bool = False, use_auth: bool = False) -> Optional[requests.Response]:
        try:
            resp = self.session.get(
                url,
                timeout=self.timeout,
                stream=stream,
                auth=self.api_auth if use_auth else None,
            )
            self.sleep()
            if resp.status_code != 200:
                self.log(f"  !! HTTP {resp.status_code} for {url}")
                return None
            return resp
        except requests.RequestException as exc:
            self.log(f"  !! Request failed for {url}: {exc}")
            return None

    def head_or_get(self, url: str) -> Optional[requests.Response]:
        try:
            resp = self.session.head(url, timeout=self.timeout, allow_redirects=True)
            if resp.status_code == 405 or resp.status_code >= 400:
                resp = self.session.get(url, timeout=self.timeout, stream=True, allow_redirects=True)
            return resp
        except requests.RequestException:
            try:
                resp = self.session.get(url, timeout=self.timeout, stream=True, allow_redirects=True)
                return resp
            except requests.RequestException:
                return None

    def is_working_file_url(self, url: str) -> bool:
        resp = self.head_or_get(url)
        self.sleep()
        if not resp or resp.status_code != 200:
            return False
        content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        final_url = resp.url or url
        if content_type in ALLOWED_CONTENT_TYPES:
            return True
        return final_url.lower().endswith(ALLOWED_EXTENSIONS)

    def get_pages(self) -> List[Dict]:
        if self.pages_cache is not None:
            return self.pages_cache
        url = f"{self.flask_base}/api/pages"
        resp = self.fetch(url, use_auth=True)
        if not resp:
            raise RuntimeError(f"Failed to fetch pages from {url}")
        self.pages_cache = resp.json()
        return self.pages_cache

    def get_entries(self) -> List[Dict]:
        if self.entries_cache is not None:
            return self.entries_cache
        url = f"{self.flask_base}/api/entries"
        resp = self.fetch(url, use_auth=True)
        if not resp:
            raise RuntimeError(f"Failed to fetch entries from {url}")
        self.entries_cache = resp.json()
        return self.entries_cache

    def ensure_page(self, page_name: str) -> int:
        pages = self.get_pages()
        normalized = page_name.strip().casefold()
        for page in pages:
            if str(page.get("name", "")).strip().casefold() == normalized:
                return int(page["id"])

        self.log(f"  -> Creating page: {page_name}")
        if self.dry_run:
            new_id = max([p.get("id", 0) for p in pages], default=0) + 1
            pages.append({"id": new_id, "name": page_name})
            return new_id

        url = f"{self.flask_base}/api/pages"
        resp = self.session.post(
            url,
            json={"name": page_name},
            timeout=self.timeout,
            auth=self.api_auth,
        )
        self.sleep()
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to create page {page_name}: {resp.text}")
        page = resp.json().get("page")
        pages.append(page)
        return int(page["id"])

    def entry_key(self, entry: Dict) -> Tuple[int, str, str]:
        page_id = int(entry.get("page_id", 0))
        title = entry.get("title") or ""
        publish_date = entry.get("publish_date") or ""
        heading = entry.get("heading") or ""
        return page_id, title, publish_date or heading

    def is_duplicate(self, page_id: int, title: str, publish_date: str) -> bool:
        entries = self.get_entries()
        key = (page_id, title, publish_date)
        for entry in entries:
            if self.entry_key(entry) == key:
                return True
        return False

    def add_entry_to_cache(self, entry: Dict) -> None:
        if self.entries_cache is None:
            self.entries_cache = []
        self.entries_cache.append(entry)

    def normalize_text(self, text: str) -> str:
        return " ".join((text or "").split())

    def normalize_for_compare(self, text: str) -> str:
        return self.normalize_text(text).casefold()

    def clean_aop_number(self, value: str) -> str:
        if not value:
            return ""
        if DATE_DOTTED_RE.search(value):
            return ""
        cleaned = "".join(ch for ch in value if ch.isdigit() or ch in "/-")
        if not any(ch.isdigit() for ch in cleaned):
            return ""
        return cleaned

    def extract_labeled_value(self, lines: List[str], label: str) -> Tuple[bool, str]:
        for idx, line in enumerate(lines):
            if label in line:
                remainder = line.split(label, 1)[1].strip()
                if remainder:
                    return True, self.normalize_text(remainder).strip(" ;:.-")
                if idx + 1 < len(lines):
                    return True, self.normalize_text(lines[idx + 1]).strip(" ;:.-")
                return True, ""
        return False, ""

    def extract_publish_date(self, lines: List[str]) -> str:
        found, remainder = self.extract_labeled_value(lines, LABEL_PUBLISH_DATE)
        if not found:
            return ""
        match = DATE_RE.search(remainder)
        if match:
            return match.group(1)
        return ""

    def normalize_file_url(self, href: str, base_url: str) -> str:
        if not href:
            return ""
        if href.startswith("/web/"):
            return f"https://web.archive.org{href}"
        if href.startswith("http://") or href.startswith("https://"):
            return href
        return urljoin(base_url, href)

    def extract_files(self, body_el, base_url: str) -> List[Dict]:
        files = []
        label = None
        for tag in body_el.find_all(["strong", "b"]):
            if self.normalize_text(tag.get_text(" ", strip=True)).casefold() == "файлове":
                label = tag
                break
        if not label:
            for node in body_el.find_all(string=True):
                if "Файлове" in self.normalize_text(str(node)):
                    label = node.parent
                    break

        files_list_el = None
        if label:
            candidate = label.find_next(["ul", "ol"])
            if candidate and body_el in candidate.parents:
                files_list_el = candidate
            else:
                siblings = []
                for sib in label.parent.next_siblings:
                    if getattr(sib, "name", None) in ["ul", "ol"]:
                        files_list_el = sib
                        break
                    if getattr(sib, "name", None) == "li":
                        siblings.append(sib)
                    if siblings and getattr(sib, "name", None) not in ["li", None]:
                        break
                if not files_list_el and siblings:
                    files_list_el = siblings

        if not files_list_el:
            return files

        list_items = []
        if isinstance(files_list_el, list):
            list_items = files_list_el
        else:
            list_items = files_list_el.find_all("li")

        for li in list_items:
            link = li.find("a", href=True)
            if not link:
                continue
            name = self.normalize_text(link.get_text(" ", strip=True))
            raw_url = (link.get("href") or "").strip()
            url = self.normalize_file_url(raw_url, base_url)
            li_text = self.normalize_text(li.get_text(" ", strip=True))
            published = ""
            match = PUBLISHED_RE.search(li_text)
            if match:
                published = self.normalize_text(match.group(1)).strip()
            if name or url:
                files.append({
                    "name": name,
                    "url": url,
                    "published_at": published,
                })

        return files

    def parse_offer_page(self, panel, soup, source_url: str, subtopic: str) -> Optional[Dict]:
        title_el = panel.select_one(".panel-heading .panel-title") or panel.select_one(".panel-title")
        title = self.normalize_text(title_el.get_text(" ", strip=True)) if title_el else ""
        if not title:
            self.log("  !! Missing title for panel, skipping")
            return None

        body_el = panel.select_one(".panel-collapse .panel-body") or panel.select_one(".panel-body")

        if not body_el:
            self.log(f"  !! Missing body for panel '{title}', skipping")
            return None

        body_text = body_el.get_text("\n", strip=True)
        lines = [self.normalize_text(line) for line in body_text.splitlines() if self.normalize_text(line)]
        publish_date = self.extract_publish_date(lines)
        _, aop_raw = self.extract_labeled_value(lines, LABEL_AOP)
        aop_number = self.clean_aop_number(aop_raw)
        _, internal_number = self.extract_labeled_value(lines, LABEL_INTERNAL)
        files = self.extract_files(body_el, source_url)

        heading = title
        if self.normalize_for_compare(heading) == self.normalize_for_compare(title):
            heading = ""

        content_lines = []
        if files:
            content_lines.append("Файлове:")
            for f in files:
                name = f.get("name") or ""
                if name:
                    content_lines.append(f"- {name}")
        content = "\n".join(content_lines)

        pdf_files = []
        for f in files:
            url = f.get("url") or ""
            name = f.get("name") or url
            if url and self.is_working_file_url(url):
                pdf_files.append({"name": name, "url": url})

        entry = {
            "title": title,
            "heading": heading,
            "publish_date": publish_date,
            "aop_number": aop_number,
            "internal_number": internal_number,
            "files": files,
            "content": content,
            "pdf_files": pdf_files,
            "source_url": source_url,
            "imported_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        return entry

    def validate_entry(self, entry: Dict) -> bool:
        required_keys = [
            "title",
            "heading",
            "publish_date",
            "aop_number",
            "internal_number",
            "files",
            "pdf_files",
            "source_url",
            "imported_at",
            "content",
        ]
        for key in required_keys:
            if key not in entry:
                self.log(f"  !! Validation failed: missing key '{key}'")
                return False
        if not entry.get("title"):
            self.log("  !! Validation failed: empty title")
            return False
        if not isinstance(entry.get("files"), list):
            self.log("  !! Validation failed: files is not a list")
            return False
        for item in entry.get("files", []):
            if not isinstance(item, dict):
                self.log("  !! Validation failed: file item is not a dict")
                return False
            for k in ["name", "url", "published_at"]:
                if k not in item:
                    self.log(f"  !! Validation failed: file item missing '{k}'")
                    return False
        if not isinstance(entry.get("pdf_files"), list):
            self.log("  !! Validation failed: pdf_files is not a list")
            return False
        for item in entry.get("pdf_files", []):
            if not isinstance(item, dict):
                self.log("  !! Validation failed: pdf_files item is not a dict")
                return False
            for k in ["name", "url"]:
                if k not in item:
                    self.log(f"  !! Validation failed: pdf_files item missing '{k}'")
                    return False
        return True

    def post_entry(self, page_id: int, entry: Dict) -> Optional[Dict]:
        payload = {
            "title": entry.get("title", ""),
            "heading": entry.get("heading", ""),
            "publish_date": entry.get("publish_date", ""),
            "aop_number": entry.get("aop_number", ""),
            "internal_number": entry.get("internal_number", ""),
            "content": entry.get("content", ""),
            "files": json.dumps(entry.get("files", []), ensure_ascii=False),
            "pdf_links": json.dumps(entry.get("pdf_files", []), ensure_ascii=False),
            "source_url": entry.get("source_url", ""),
            "imported_at": entry.get("imported_at", ""),
            "page_id": str(page_id),
        }

        if self.dry_run:
            self.log(
                f"  [dry-run] Would create entry: title='{entry.get('title','')}' "
                f"publish_date='{entry.get('publish_date','')}'"
            )
            fake_entry = {
                "id": -1,
                "page_id": page_id,
                **entry,
            }
            self.add_entry_to_cache(fake_entry)
            return fake_entry

        url = f"{self.flask_base}/api/entries"
        resp = self.session.post(url, data=payload, timeout=self.timeout, auth=self.api_auth)
        self.sleep()
        if resp.status_code != 200:
            self.log(f"  !! Failed to create entry '{entry.get('title','')}': {resp.text}")
            return None
        entry_resp = resp.json().get("entry")
        if entry_resp:
            self.add_entry_to_cache(entry_resp)
        return entry_resp

    def import_row(self, row: CsvRow) -> None:
        self.log(f"Processing: {row.url}")
        page_id = self.ensure_page(row.page_name)
        resp = self.fetch(row.url)
        if not resp:
            self.log("  !! Failed to fetch page, skipping")
            return
        resp.encoding = resp.apparent_encoding or "utf-8"
        html = resp.text

        soup = BeautifulSoup(html, HTML_PARSER)
        panels = soup.select(".panel.panel-default")
        if not panels:
            self.log("  !! No panels found, skipping page")
            return

        for panel in panels:
            entry = self.parse_offer_page(panel, soup, row.url, row.subtopic)
            if not entry:
                continue
            if not self.validate_entry(entry):
                self.log("  !! Entry failed validation, skipping")
                continue

            self.log(
                f"  -> Extracted: title='{entry.get('title','')}', "
                f"publish_date='{entry.get('publish_date','')}', "
                f"files={len(entry.get('files', []))}"
            )

            if self.is_duplicate(page_id, entry.get("title", ""), entry.get("publish_date", "")):
                self.log(
                    f"  == Duplicate found, skipping: '{entry.get('title','')}' / '{entry.get('publish_date','')}'"
                )
                continue

            created = self.post_entry(page_id, entry)
            if created:
                self.log(f"  ++ Created entry: '{entry.get('title','')}'")


def read_csv(csv_path: str, logger) -> List[CsvRow]:
    rows = []
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("CSV has no headers")
        required = {"url", "page_name"}
        missing = required - set([h.strip() for h in reader.fieldnames])
        if missing:
            raise ValueError(f"CSV missing required columns: {', '.join(sorted(missing))}")

        for i, row in enumerate(reader, start=2):
            url = (row.get("url") or "").strip()
            page_name = (row.get("page_name") or "").strip()
            subtopic = (row.get("subtopic") or "").strip()
            if not url or not page_name:
                logger(f"  !! Skipping row {i}: missing url or page_name -> {row}")
                continue
            rows.append(CsvRow(url=url, page_name=page_name, subtopic=subtopic))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Import Wayback accordion panels into the Flask app")
    parser.add_argument("--csv", default="urls.csv", help="Path to urls.csv")
    parser.add_argument("--url", default=None, help="Single Wayback URL to import")
    parser.add_argument("--page-name", default=None, help="Page name for --url mode")
    parser.add_argument("--subtopic", default="", help="Subtopic fallback for --url mode")
    parser.add_argument("--flask-base", default="http://localhost:5000", help="Flask base URL")
    parser.add_argument("--auth-user", default=None, help="Basic Auth username")
    parser.add_argument("--auth-pass", default=None, help="Basic Auth password")
    parser.add_argument("--sleep", type=float, default=1.0, help="Delay between external fetches")
    parser.add_argument("--timeout", type=int, default=60, help="Request timeout seconds")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without posting")
    args = parser.parse_args()

    if HTML_PARSER != "lxml":
        print("Warning: lxml not available, falling back to html.parser", file=sys.stderr)

    importer = Importer(
        flask_base=args.flask_base,
        auth_user=args.auth_user,
        auth_pass=args.auth_pass,
        sleep_seconds=args.sleep,
        timeout=args.timeout,
        dry_run=args.dry_run,
    )

    try:
        importer.get_entries()
    except Exception as exc:
        print(f"Failed to load entries: {exc}", file=sys.stderr)
        return 1

    if args.url:
        if not args.page_name:
            print("Missing --page-name for --url mode", file=sys.stderr)
            return 1
        row = CsvRow(url=args.url.strip(), page_name=args.page_name.strip(), subtopic=args.subtopic.strip())
        try:
            importer.import_row(row)
        except Exception as exc:
            importer.log(f"  !! Error importing {row.url}: {exc}")
            return 1
    else:
        csv_path = args.csv
        if not os.path.isfile(csv_path):
            print(f"CSV not found: {csv_path}", file=sys.stderr)
            return 1
        try:
            rows = read_csv(csv_path, importer.log)
        except Exception as exc:
            print(f"Failed to read CSV: {exc}", file=sys.stderr)
            return 1

        for row in rows:
            try:
                importer.import_row(row)
            except Exception as exc:
                importer.log(f"  !! Error importing {row.url}: {exc}")
                continue

    importer.log("Done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
