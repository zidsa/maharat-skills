# Delivery package — what the user receives with every theme

Every theme task ends with a delivery FOLDER, not a lone ZIP. Contents:

| File | Always? | Content |
|---|---|---|
| `<theme>-<date>.zip` | ✅ | upload-ready theme (package_theme.sh, root-valid: layout.jinja at ZIP root, never inside a parent folder) |
| `THEME_NAME_DESCRIPTION.txt` | ✅ | theme name (ar + en) + short description — the upload dialog REQUIRES both fields; the user copy-pastes them |
| `UPLOAD_INSTRUCTIONS.md` | ✅ | the exact steps below |
| `asset_manifest.json` | ✅ | per-slot record: file, source (store-media / user-upload / generated / placeholder), size — the images.md audit table as JSON |
| `ASSET_REQUIREMENTS.md` | if any slot unfilled | named request list (Path B) — see prompt-packs.md |
| `VISUAL_PROMPTS.md` / `VIDEO_PROMPTS.md` | if Path C used | generation prompt packs |
| `handover/category-images/` | if categories imageless | correctly sized tiles + dashboard path (images.md Phase D) |

## THEME_NAME_DESCRIPTION.txt format

```
اسم الثيم (عربي): <sector-appropriate Arabic name>
Theme name (English): <English name>
الوصف: <one paragraph: sector, identity, what's included — written to sell the theme to its own merchant>
```
Author these from the store profile — never generic ("ثيم مخصص"). Example shape: "مانجا فريم — ثيم عالم الأنمي: ثيم داكن سينمائي لمتاجر البوسترات والمقتنيات...".

## UPLOAD_INSTRUCTIONS.md — the exact template (matches the Zid dashboard flow)

```markdown
# طريقة رفع الثيم على منصة زد

> يتطلب باقة Professional أو خدمة الثيم المخصص المدفوعة.

1. **ادخل لوحة تحكم زد** ثم من القائمة الجانبية اختر: **المتجر الإلكتروني**.
2. من القائمة الفرعية اختر **الثيمات**، وانزل لقسم **«الثيمات المخصصة»**، ثم اضغط زر **«رفع ثيم جديد»**.
3. في النافذة اللي تفتح:
   - **الاسم**: انسخه من ملف THEME_NAME_DESCRIPTION.txt
   - **الوصف**: انسخه من نفس الملف
   - اسحب ملف **ZIP** المرفق وأفلته في مربع الرفع (أو اضغط «استعراض»)
   - اضغط **حفظ**
4. بعد اكتمال الرفع، فعّل مفتاح **«تفعيل الثيم»** أمام الثيم الجديد — وبكذا المتجر يشتغل بالثيم. (تقدر تضغط «معاينة» قبل التفعيل للتأكد.)
```

If the user provided dashboard screenshots for these steps, ship them in `handover/upload-steps/` numbered 1–4 and reference them from the instructions ("انظر الصورة رقم N"). Present the steps (and screenshots when available) in the final chat message too — in order.

## Final report (in chat, with the delivery)

State plainly: how many images were found in the store vs generated vs still pending prompts; whether videos are included or prompted; which pages were themed; whether the ZIP passed validation (root-valid, size); which deploy lane applies (vitrin push done / manual upload). Never claim an upload or generation that didn't happen.
