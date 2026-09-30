# ZeroMalaria — Gemini image prompts

Nine images for the landing page and the sign-in pages. Each slot already exists in the code and shows a branded gradient until the photo is added.

**Where to put them:** `apps/web/public/images/landing/` using the **exact filenames** below. Export as JPG (quality ~82), ideally under 400 KB each. No code change is needed: the photos fade in automatically.

---

## 1. Style block (paste at the start of every prompt)

> Photorealistic editorial documentary photograph, shot on a full-frame camera with a 35mm or 50mm prime lens, natural light, shallow depth of field, gentle film grain. Colour grade matched to a brand palette: deep ocean-blue shadows (#0B3C5D), teal mid-tones (#14807A), warm amber highlights (#D97706). Mood: calm, dignified, capable, hopeful. Authentic rural Rwanda: green terraced hills of the Eastern Province, red-earth paths, banana plants, brick houses with corrugated-metal roofs, morning mist. Modern, minimal, Apple-style composition with generous negative space. People are Rwandan, dressed in everyday modern clothing, shown as competent professionals and caring families, not as victims.

## 2. Negative prompt (use with every image)

> no text, no letters, no numbers, no logos, no brand names, no watermarks, no readable phone screen, no needles or injections, no pills or medicine packaging, no blood, no visibly sick or suffering people, no poverty clichés, no flies, no saturated HDR look, no plastic AI skin, no extra fingers, no distorted hands, no uniforms with insignia

---

## 3. The images

### `hero-chw.jpg` · portrait 3:4 · 1080 × 1440
Hero card, shown behind the animated phone.

> A Rwandan community health worker, a woman in her 30s wearing a simple teal cardigan, sits on a low wooden bench outside a brick home in the early morning. She holds a smartphone at chest height, glancing at it with quiet focus. Beside her, a young mother holds a calm toddler wrapped in a patterned kitenge cloth. Soft golden side-light, misty green hills behind them in soft focus. Subject in the upper two-thirds, darker lower third for overlaid text.

### `problem-village.jpg` · portrait 4:5 · 1080 × 1350
Beside "The loop breaks between the village and the clinic."

> Wide elevated view of a Rwandan hillside village at dawn: terraced fields, scattered brick houses with metal roofs, banana groves, low mist in the valleys. A single red-earth path winds down the hill toward a small, distant health-centre building. One tiny figure walks the path, carrying a child on her back. Amber sunrise at the top of the frame fading into deep blue-teal shadows below. Calm, contemplative, vast.

### `step-triage.jpg` · square 1:1 · 1200 × 1200
How it works, step 1: **Triage**.

> Close-up at eye level: a community health worker's hands hold a smartphone (screen glowing, content not legible) while she speaks gently with a mother who holds a four-year-old child on her lap. The child is calm and curious. Inside a simple, clean home with soft window light from the left. Warm skin tones, teal and amber accents in the fabrics. Shallow depth of field, focus on the health worker's attentive face.

### `step-confirm.jpg` · square 1:1 · 1200 × 1200
How it works, step 2: **Confirm**.

> Over-the-shoulder view of a community health worker sitting at a small wooden table, reviewing her smartphone with a thoughtful, confident expression; a malaria rapid diagnostic test cassette (plain white plastic, no markings) lies on a clean cloth beside a notebook. Late-morning light, deep blue-teal background shadows, a hint of amber from a doorway. Conveys careful professional judgment.

### `step-handover.jpg` · square 1:1 · 1200 × 1200
How it works, step 3: **Hand over**.

> At the entrance of a small rural Rwandan health centre (painted cream walls, a teal door frame, a simple veranda), a nurse in a plain white coat greets a mother carrying her child. The community health worker stands beside them holding up her phone to the nurse. Warm, reassuring interaction, golden afternoon light, soft focus background of hills.

### `step-followup.jpg` · square 1:1 · 1200 × 1200
How it works, step 4: **Follow up**.

> A few days later: the same community health worker visits a family at home at golden hour. The child, now healthy and smiling, sits on the mother's lap on a doorstep; the health worker crouches at their level, smiling, phone held loosely in one hand. A long-lasting insecticidal mosquito net is visible folded inside the doorway. Warm amber light, hopeful, relieved mood.

### `voice-listening.jpg` · landscape 16:10 · 1600 × 1000
Voice section, "Vuga na Zero". Sits on a dark ocean-blue section.

> A community health worker, a man in his 40s, holds a smartphone slightly away from his face, listening intently to it read a question aloud, while his other hand gestures reassuringly to a mother seated opposite (slightly out of focus). Dusk light, strong teal-blue ambient tones with a single warm amber rim light. Subject on the right third, darker negative space on the left. Intimate, quiet, modern.

### `cta-community.jpg` · ultra-wide 21:9 · 2400 × 1030
Final call-to-action banner. Text sits on the **left**, so keep the left 45% darker and uncluttered.

> A hopeful community scene outside a rural Rwandan health post at sunset: health workers, mothers and children gathered in small groups on the right side of the frame, some laughing, a child running; mosquito nets hanging on a line; terraced hills and a glowing amber sky behind. The left side fades into deep ocean-blue shadow. Cinematic, warm, uplifting.

### `auth-side.jpg` · portrait 3:4 · 1200 × 1600
Left panel on Sign in, Request account and Forgot password. Text sits on the **bottom third**.

> A community health worker, a young woman, walks along a red-earth path on a green hillside at golden hour, a canvas bag over her shoulder and a phone in her hand, banana leaves framing the edge of the image. She is in the upper-middle of the frame, walking toward the viewer with calm confidence. The lower third falls into deep teal-blue shadow. Soft haze, amber backlight, cinematic depth.

---

## 4. Tips for consistent results

- Generate all nine in **one Gemini conversation** and say *"keep the same colour grade, lighting style and people as the previous images"* after the first one.
- If a phone screen shows readable text or a fake interface, regenerate with *"phone screen softly glowing, blurred, nothing legible"*.
- Check every image for hands, faces and anything that looks like a real clinical procedure. The site represents a health programme, so realism and dignity matter more than drama.
- Keep them synthetic: these are generated people. Don't swap in photos of real patients unless you have their written consent.
