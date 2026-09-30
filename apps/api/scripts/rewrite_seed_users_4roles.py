"""Rewrite seed_users() body for 4-role demo accounts."""
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app" / "seed.py"
text = p.read_text(encoding="utf-8")
start = text.index("def seed_users(db) -> None:")
end = text.index("def _chw_for_facility")
new_fn = '''def seed_users(db) -> None:
    """Deterministic demo accounts: 1 SUPER_ADMIN, 1 RBC_ADMIN, HC per facility, many CHW."""
    users = [
        {
            "id": "user-chw-demo",
            "username": "chw.demo",
            "display_name": "CHW Demo (Nyamata)",
            "role": "CHW",
            "district": "Bugesera",
            "facility_id": "HC-BUG-01",
            "village": "Nyamata",
            "chw_code": "CHW-BUG-01-01",
            "phone": "+250780000001",
        },
        {
            "id": "user-chw-gisagara",
            "username": "chw.gisagara",
            "display_name": "CHW Demo (Gisagara)",
            "role": "CHW",
            "district": "Gisagara",
            "facility_id": "HC-GIS-01",
            "village": "Gisagara",
            "chw_code": "CHW-GIS-01-01",
            "phone": "+250780000010",
        },
        {
            "id": "user-hc-demo",
            "username": "health.center",
            "display_name": "Health Center Demo (Nyamata HC)",
            "role": "HEALTH_CENTER",
            "district": "Bugesera",
            "facility_id": "HC-BUG-01",
            "village": "",
            "chw_code": "",
            "phone": "+250780000002",
        },
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
    ]
    facilities = db.query(Facility).all()
    rng = random.Random(20260930)
    # One HEALTH_CENTER per facility (skip Nyamata — already have health.center)
    for i, fac in enumerate(facilities):
        if fac.facility_id == "HC-BUG-01":
            continue
        users.append(
            {
                "id": f"user-hc-{i:02d}",
                "username": f"hc.{fac.facility_id.lower().replace('-', '.')}",
                "display_name": f"HC Staff {fac.name}",
                "role": "HEALTH_CENTER",
                "district": fac.district,
                "facility_id": fac.facility_id,
                "village": "",
                "chw_code": "",
                "phone": f"+25079{100000 + i:06d}",
            }
        )
    # Extra CHWs (~40 total including demos)
    chw_needed = max(0, 40 - 2)
    for i in range(chw_needed):
        fac = facilities[i % len(facilities)] if facilities else None
        if not fac:
            break
        code = _chw_for_facility(fac.facility_id, (i % 4) + 1)
        users.append(
            {
                "id": f"user-chw-{i:03d}",
                "username": f"chw.synth.{i:03d}",
                "display_name": f"CHW {fac.sector} #{i + 1}",
                "role": "CHW",
                "district": fac.district,
                "facility_id": fac.facility_id,
                "village": fac.sector,
                "chw_code": code,
                "phone": f"+25078{100000 + i:06d}",
            }
        )

    pw = hash_password(settings.demo_password)
    for u in users:
        if db.query(User).filter(User.username == u["username"]).first():
            continue
        db.add(User(password_hash=pw, active=True, **u))
    _ = rng


'''
text = text[:start] + new_fn + text[end:]
# Update demo print at end
old_print = (
    'print(\n'
    '            f"Demo logins: chw.demo / health.center / nurse.demo / supervisor.demo / "\n'
    '            f"rbc.demo / rbc.admin / super.admin (password: {settings.demo_password})"\n'
    '        )'
)
new_print = '''print("=== Demo only accounts (password = ZM_DEMO_PASSWORD) ===")
        print(f"{'username':20} {'role':16} password")
        print(f"{'-'*20} {'-'*16} {'-'*12}")
        for u, r in (
            ("chw.demo", "CHW"),
            ("health.center", "HEALTH_CENTER"),
            ("rbc.admin", "RBC_ADMIN"),
            ("super.admin", "SUPER_ADMIN"),
        ):
            print(f"{u:20} {r:16} {settings.demo_password}")
        print("======================================================")'''
if old_print in text:
    text = text.replace(old_print, new_print)
else:
    # looser replace
    import re
    text = re.sub(
        r'print\(\s*f"Demo logins:.*?\)\s*',
        new_print + "\n",
        text,
        count=1,
        flags=re.S,
    )
p.write_text(text, encoding="utf-8")
print("seed_users rewritten")
