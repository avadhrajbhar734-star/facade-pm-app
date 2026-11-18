# Facade PM
Facade project manager ke liye checklist + PM Skills app (Hinglish).
- Web/PWA: https://avadhrajbhar734-star.github.io/facade-pm-app/
- APK: https://github.com/avadhrajbhar734-star/facade-pm-app/releases/latest/download/FacadePM.apk
Content: `docs/data.json` (edit karte hi app me update; naye items `added_on` ke saath NEW highlight).

## Update kaise kare
`python3 tools/add_items.py new.json` (format file ke andar likha hai) -> `git commit -am "content update" && git push`.
Pages 1-2 min me live; app agli baar khulte hi naya data le leta hai. Naye items yellow + NEW badge + "Naya kya hai" tab me dikhte hain jab tak user "Sab dekh liya" na dabaye.
Category ids: daily, weekly, monthly, boq, variations, client_billing, contractor_billing, cashflow, material, glass, drawings, holdups, eot, team, safety, qaqc, handover, vendor, meetings, reports, formulas. Skill groups: must, good.
