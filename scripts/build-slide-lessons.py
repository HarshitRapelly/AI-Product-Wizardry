#!/usr/bin/env python3
# =============================================================================
# Builds slide-deck lessons from the PDF exports of the original PowerPoint decks.
# Nothing is paraphrased: every slide is the PDF page as drawn, and the slide text
# is the text visible on that page.
#
# Usage:
#   python scripts/build-slide-lessons.py <config.json> <pdf-dir> <out-dir>
#   e.g. python scripts/build-slide-lessons.py scripts/content/module1-topic1.json "C:/Users/me/Downloads" build/slides
#
# Writes:
#   <config "migration">            the content migration: course_subtopics rows (slide text, links) and
#                                   public.course_slide_images rows (one WebP per slide, 1600 x 900, base64)
#   <out-dir>/<lesson id>/NN.webp   the same images as files (for previewing; not uploaded anywhere)
#   <out-dir>/manifest.json         per slide: lesson, number, bytes, sha256, width, height
#   <out-dir>/verify_slides.sql     read-only check that the database holds exactly these images
#
# STOPS (writes nothing) when a PDF is missing or its sha256 differs from the config, a page is
# not 16:9, a lesson id / position / title is invalid, or a link is not https.
# Requires: pymupdf, pillow (pip install pymupdf pillow).
# =============================================================================
import base64
import hashlib
import io
import json
import os
import re
import sys

import pymupdf
from PIL import Image

WIDTH, HEIGHT = 1600, 900
QUALITY = 82
ID_RE = re.compile(r'^[a-z0-9][a-z0-9-]{1,79}$')
DOC_PATH_RE = re.compile(r'^[a-z0-9][a-z0-9/_.-]{1,200}$')
JSON_TAG = '$aiwjson$'


def stop(msg: str) -> None:
    print('STOP: ' + msg, file=sys.stderr)
    sys.exit(1)


def sql_text(v):
    if v is None:
        return 'null'
    return "'" + str(v).replace("'", "''") + "'"


def invisible(span, img: Image.Image, sx: float, sy: float) -> bool:
    """A span is invisible when (almost) every pixel under it has the span's own colour
    (e.g. white text on a light slide, kept in the deck for a later animation step)."""
    x0, y0, x1, y1 = span['bbox']
    box = (max(0, int(x0 * sx)), max(0, int(y0 * sy)), min(img.width, int(x1 * sx) + 1), min(img.height, int(y1 * sy) + 1))
    if box[2] - box[0] < 2 or box[3] - box[1] < 2:
        return False
    c = span.get('color', 0)
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    px = list(img.crop(box).getdata())
    same = sum(1 for (pr, pg, pb) in px if abs(pr - r) + abs(pg - g) + abs(pb - b) <= 48)
    return same / len(px) >= 0.97


def slide_text(page, img: Image.Image) -> str:
    """Visible text, one paragraph per text box. A line that continues a sentence (starts in lower case)
    is joined to the previous one; an exact repeat of a line already on the slide is dropped."""
    sx, sy = img.width / page.rect.width, img.height / page.rect.height
    paras, seen = [], set()
    for block in page.get_text('dict')['blocks']:
        if block.get('type') != 0:
            continue
        for line in block['lines']:
            parts = [s['text'] for s in line['spans'] if not s['text'].strip() or not invisible(s, img, sx, sy)]
            text = re.sub(r'\s+', ' ', ''.join(parts)).strip()
            if not text or text in seen:
                continue
            seen.add(text)
            if (paras and not paras[-1].endswith(('.', '?', '!', '"', '”', ':'))
                    and (text[0].islower() or paras[-1].endswith((',', '—', '-', ' and', ' or', ' the', ' a', ' to', ' of')))):
                paras[-1] += ' ' + text
            else:
                paras.append(text)
    return '\n'.join(paras)


def main() -> None:
    if len(sys.argv) != 4:
        stop('usage: build-slide-lessons.py <config.json> <pdf-dir> <out-dir>')
    cfg_path, pdf_dir, out_dir = sys.argv[1:]
    cfg = json.load(open(cfg_path, encoding='utf-8'))
    module_id, topic, topic_title = cfg['module_id'], cfg['topic_number'], cfg['topic_title']
    lessons = cfg['lessons']
    if not (isinstance(module_id, int) and 2 <= module_id <= 12 and isinstance(topic, int) and topic >= 1 and topic_title.strip()):
        stop('module / topic invalid')
    if len({l['id'] for l in lessons}) != len(lessons) or len({l['position'] for l in lessons}) != len(lessons):
        stop('duplicate lesson id or position')

    built = []  # (lesson, slides, images)
    for l in lessons:
        if not ID_RE.match(l['id']) or not DOC_PATH_RE.match(l['source_document_path']):
            stop(f"bad id / source path for {l['id']}")
        if not (1 <= len(l['title'].strip()) <= 200 and 1 <= len(l['acknowledgment_text'].strip()) <= 500):
            stop(f"bad title / acknowledgment for {l['id']}")
        for link in l.get('links', []):
            if not re.match(r'^https://[^\s<>"]+$', link.get('url', '')):
                stop(f"link for {l['id']} is not an https URL: {link.get('url')!r}")
        pdf_file = os.path.join(pdf_dir, l['pdf'])
        if not os.path.isfile(pdf_file):
            stop(f'missing PDF: {pdf_file}')
        data = open(pdf_file, 'rb').read()
        if hashlib.sha256(data).hexdigest() != l['pdf_sha256']:
            stop(f"PDF does not match its sha256 (a different version?): {l['pdf']}")
        doc = pymupdf.open(stream=data, filetype='pdf')
        slides, images = [], []
        for i, page in enumerate(doc, start=1):
            if abs(page.rect.width / page.rect.height - 16 / 9) > 0.01:
                stop(f"{l['pdf']} page {i} is not 16:9")
            pix = page.get_pixmap(matrix=pymupdf.Matrix(WIDTH / page.rect.width, HEIGHT / page.rect.height), alpha=False)
            img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            buf = io.BytesIO()
            img.save(buf, 'WEBP', quality=QUALITY, method=6)
            slides.append({'n': i, 'w': img.width, 'h': img.height, 'text': slide_text(page, img)})
            images.append((f"{l['id']}/{i:02d}.webp", buf.getvalue()))
        built.append((l, slides, images))

    # ---- write preview images + manifest + read-only verification
    manifest = []
    for l, slides, images in built:
        os.makedirs(os.path.join(out_dir, l['id']), exist_ok=True)
        for (path, blob), s in zip(images, slides):
            with open(os.path.join(out_dir, path), 'wb') as f:
                f.write(blob)
            manifest.append({'lesson': l['id'], 'n': s['n'], 'bytes': len(blob), 'sha256': hashlib.sha256(blob).hexdigest(), 'w': s['w'], 'h': s['h']})
    with open(os.path.join(out_dir, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=1)

    values = ',\n'.join(f"  ({sql_text(m['lesson'])}, {m['n']}, {sql_text(m['sha256'])})" for m in manifest)
    ids_list = ', '.join(sql_text(l['id']) for l, _, _ in built)
    with open(os.path.join(out_dir, 'verify_slides.sql'), 'w', encoding='utf-8') as f:
        f.write(f"""-- READ-ONLY: does public.course_slide_images hold exactly the generated slide images (byte for byte)?
with expected(subtopic_id, slide_no, sha256) as (values
{values}
)
select (select count(*) from expected) as expected_slides,
       (select count(*) from public.course_slide_images i join expected e using (subtopic_id, slide_no)
         where i.sha256 = e.sha256 and encode(sha256(decode(i.data, 'base64')), 'hex') = e.sha256) as matching_slides,
       (select count(*) from public.course_slide_images i where i.subtopic_id in ({ids_list})
           and (i.subtopic_id, i.slide_no) not in (select subtopic_id, slide_no from expected)) as unexpected_slides;
""")

    # ---- write the migration
    rows, checks = [], []
    for l, slides, _ in built:
        body = [{'type': 'slides', 'title': l['title'], 'slides': slides}]
        if l.get('links'):
            body.append({'type': 'links', 'heading': 'Further reading', 'items': [
                {'title': k['title'], 'url': k['url'], **({'note': k['note']} if k.get('note') else {})} for k in l['links']]})
        body_json = json.dumps(body, ensure_ascii=False, separators=(',', ':'))
        if JSON_TAG in body_json:
            stop('dollar-quote tag found in content')
        rows.append(
            f"  ({sql_text(l['id'])}, {module_id}, {topic}, {sql_text(topic_title)}, {l['position']}, {sql_text(l['title'])},\n"
            f"   {sql_text(l['summary'])}, {l['reading_minutes']},\n   {JSON_TAG}{body_json}{JSON_TAG}::jsonb,\n"
            f"   {sql_text(l['acknowledgment_text'])}, null, {sql_text(l['source_document_path'])}, {sql_text(l['pdf'])}, {sql_text(l['pdf_sha256'])})")
        checks.append(f"({sql_text(l['id'])}, {l['position']}, {len(slides)}, {len(l.get('links', []))})")

    ids = ', '.join(sql_text(l['id']) for l, _, _ in built)
    total = sum(len(s) for _, s, _ in built)
    image_rows = []
    for l, _, images in built:
        for n, (_, blob) in enumerate(images, start=1):
            image_rows.append(f"  ({sql_text(l['id'])}, {n}, 'image/webp', '{base64.b64encode(blob).decode('ascii')}', '{hashlib.sha256(blob).hexdigest()}')")
    image_checks = ', '.join(f"({sql_text(m['lesson'])}, {m['n']}, {sql_text(m['sha256'])})" for m in manifest)
    sql = f"""-- =============================================================================
-- {os.path.basename(cfg['migration']).removesuffix('.sql')} — Module {module_id - 1}, Topic {topic}: {topic_title}
-- =============================================================================
-- GENERATED by scripts/build-slide-lessons.py from {cfg_path.replace(os.sep, '/')} — do not edit by hand.
-- {len(built)} slide-deck lessons, {total} slides. Each lesson body is a 'slides' block (per slide: number, size and
-- the slide's visible text) and, where configured, a 'links' block. The slide images (WebP) go into
-- public.course_slide_images. Requires 20261125001600_module1_slides.sql. Students see these lessons and
-- their slides only when Module {module_id - 1} is open for them AND Module {module_id - 2} is complete.
-- Re-runnable (lessons upserted by id; their slide images replaced).
-- ROLLBACK: supabase/rollback/{os.path.basename(cfg['migration']).replace('.sql', '.down.sql')}
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from public.course_subtopics
              where module_id = {module_id} and position in ({', '.join(str(l['position']) for l, _, _ in built)})
                and id not in ({ids})) then
    raise exception 'PRE-CHECK FAILED: other Module {module_id - 1} subtopics already use these positions';
  end if;
end $$;

insert into public.course_subtopics
  (id, module_id, topic_number, topic_title, position, title, summary, reading_minutes, body,
   acknowledgment_text, quiz_id, source_document_path, source_document_name, source_document_sha256)
values
{(',' + chr(10)).join(rows)}
on conflict (id) do update
  set module_id = excluded.module_id, topic_number = excluded.topic_number, topic_title = excluded.topic_title,
      position = excluded.position, title = excluded.title, summary = excluded.summary,
      reading_minutes = excluded.reading_minutes, body = excluded.body,
      acknowledgment_text = excluded.acknowledgment_text, quiz_id = excluded.quiz_id,
      source_document_path = excluded.source_document_path, source_document_name = excluded.source_document_name,
      source_document_sha256 = excluded.source_document_sha256;

delete from public.course_slide_images where subtopic_id in ({ids});
insert into public.course_slide_images (subtopic_id, slide_no, mime, data, sha256)
values
{(',' + chr(10)).join(image_rows)};

-- Self-checks: every lesson in place with its slide count and links; every slide image present and intact
-- (decoded bytes match the generated sha256); nothing else in this topic.
do $$
declare r record;
begin
  if (select count(*) from public.course_slide_images where subtopic_id in ({ids})) <> {total}
     or exists (select 1 from (values {image_checks}) as e(subtopic_id, slide_no, sha256)
                 where not exists (select 1 from public.course_slide_images i
                                    where i.subtopic_id = e.subtopic_id and i.slide_no = e.slide_no and i.sha256 = e.sha256
                                      and encode(sha256(decode(i.data, 'base64')), 'hex') = e.sha256)) then
    raise exception 'SELF-CHECK FAILED: slide images missing or damaged';
  end if;
  for r in select * from (values {', '.join(checks)}) as t(id, pos, slides, links) loop
    if not exists (
      select 1 from public.course_subtopics s
       where s.id = r.id and s.module_id = {module_id} and s.topic_number = {topic} and s.position = r.pos and s.quiz_id is null
         and s.body -> 0 ->> 'type' = 'slides'
         and jsonb_array_length(s.body -> 0 -> 'slides') = r.slides
         and coalesce((select jsonb_array_length(b -> 'items') from jsonb_array_elements(s.body) b where b ->> 'type' = 'links'), 0) = r.links) then
      raise exception 'SELF-CHECK FAILED: lesson % not as generated', r.id;
    end if;
  end loop;
  if (select count(*) from public.course_subtopics where module_id = {module_id} and topic_number = {topic}) <> {len(built)} then
    raise exception 'SELF-CHECK FAILED: unexpected subtopics in Module {module_id - 1} Topic {topic}';
  end if;
end $$;

commit;
"""
    with open(cfg['migration'], 'w', encoding='utf-8', newline='\n') as f:
        f.write(sql)
    for l, slides, _ in built:
        print(f"{l['id']:28s} {len(slides):3d} slides, {len(l.get('links', []))} links")
    print(f"{total} slides -> {out_dir}; migration -> {cfg['migration']}")


if __name__ == '__main__':
    main()
