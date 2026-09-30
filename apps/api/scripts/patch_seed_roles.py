from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app" / "seed.py"
text = p.read_text(encoding="utf-8")
repls = [
    ('"role": "chw"', '"role": "CHW"'),
    ('"role": "nurse"', '"role": "HEALTH_CENTER"'),
    ('"role": "supervisor"', '"role": "SUPERVISOR"'),
    ('"role": "rbc"', '"role": "RBC_OFFICER"'),
    ('sender_role="nurse"', 'sender_role="HEALTH_CENTER"'),
    ('"username": "nurse.demo"', '"username": "health.center"'),
    ('"Nurse Demo (Nyamata HC)"', '"Health Center Demo (Nyamata HC)"'),
    ('"Nurse ', '"HC Staff '),
    ('username": f"nurse.synth.', 'username": f"hc.synth.'),
    ('id": f"user-nurse-', 'id": f"user-hc-'),
    ("user-nurse-demo", "user-hc-demo"),
]
for a, b in repls:
    text = text.replace(a, b)

if "super.admin" not in text:
    insert = """
        {
            "id": "user-super-admin",
            "username": "super.admin",
            "display_name": "Super Admin Demo",
            "role": "SUPER_ADMIN",
            "district": "",
            "facility_id": "",
            "village": "",
            "chw_code": "",
            "phone": "+250780000099",
        },
        {
            "id": "user-rbc-admin",
            "username": "rbc.admin",
            "display_name": "RBC Admin Demo",
            "role": "RBC_ADMIN",
            "district": "",
            "facility_id": "",
            "village": "",
            "chw_code": "",
            "phone": "+250780000098",
        },
"""
    marker = "facilities = db.query(Facility).all()"
    text = text.replace(marker, f"users += [{insert}]\n    {marker}", 1)

# Also keep legacy nurse.demo alias account for transitional demo buttons
if "nurse.demo" not in text:
    alias = """
        {
            "id": "user-nurse-legacy",
            "username": "nurse.demo",
            "display_name": "Health Center Demo (legacy username)",
            "role": "HEALTH_CENTER",
            "district": "Bugesera",
            "facility_id": "HC-BUG-01",
            "village": "",
            "chw_code": "",
            "phone": "+250780000002",
        },
"""
    marker = "facilities = db.query(Facility).all()"
    text = text.replace(marker, f"users += [{alias}]\n    {marker}", 1)

p.write_text(text, encoding="utf-8")
print("seed patched OK")
