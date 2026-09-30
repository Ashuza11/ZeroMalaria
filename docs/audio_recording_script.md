# Audio recording script (phrase catalog)

Record MP3 files as `apps/web/public/audio/{lang}/{phrase_id}.mp3` (served at `/audio/{lang}/{phrase_id}.mp3`).

Native speakers should review all `TODO_REVIEW_RW` strings in `apps/web/src/voice/phrases.ts` before final recording.

| phrase_id | English (en) | Kinyarwanda (rw) |
|-----------|--------------|------------------|
| age | How old is the patient, in months? | TODO_REVIEW_RW: Umurwayi afite imyaka ingahe, mu mezi? |
| sex | Is the patient female or male? | TODO_REVIEW_RW: Umurwayi ni umugore cyangwa umugabo? |
| fever | Does the patient have fever? | TODO_REVIEW_RW: Umurwayi afite ubushyuhe? |
| fever_days | How many days has the fever lasted? | TODO_REVIEW_RW: Ubushyuhe bwamaze iminsi ingahe? |
| temperature | What is the body temperature in degrees Celsius? | TODO_REVIEW_RW: Ubushyuhe bw'umubiri ni bungana iki mu Celsius? |
| convulsions | Convulsions or fits — yes or no? | TODO_REVIEW_RW: Gusetsa cyangwa fits — yego cyangwa oya? |
| unable_to_drink | Unable to drink or feed — yes or no? | TODO_REVIEW_RW: Ntashobora kunywa cyangwa kurya — yego cyangwa oya? |
| vomiting_everything | Vomiting everything — yes or no? | TODO_REVIEW_RW: Araruka byose — yego cyangwa oya? |
| lethargy | Lethargy or unconsciousness — yes or no? | TODO_REVIEW_RW: Yacitse intege cyangwa ntabona — yego cyangwa oya? |
| severe_breathing_difficulty | Severe breathing difficulty — yes or no? | TODO_REVIEW_RW: Agorwa cyane n'uruhuha — yego cyangwa oya? |
| tdr | What is the malaria rapid test result: positive, negative, or invalid? | TODO_REVIEW_RW: Ikizamini cy'uburozi cy'umusaraba: cyiza, cyangwa nabi, cyangwa nticyemewe? |
| result_treat_at_home | Recommendation: treat at home with community follow-up. | TODO_REVIEW_RW: Icyifuzo: kuvura mu rugo hamwe no gukurikirana mu mudugudu. |
| result_refer | Recommendation: refer the patient to a health center. | TODO_REVIEW_RW: Icyifuzo: ohereza umurwayi ku kigo nderabuzima. |
| result_urgent_refer | Urgent recommendation: refer immediately to a health center. | TODO_REVIEW_RW: Icyifuzo cyihutirwa: ohereze vuba ku kigo nderabuzima. |
| reason_convulsions | Convulsions (fits) reported | Gusetsa (fits) byavuzwe |
| reason_unable_to_drink | Unable to drink or feed | Ntashobora kunywa cyangwa kurya |
| reason_vomiting_everything | Vomiting everything | Araruka byose |
| reason_lethargy | Lethargy or unconsciousness | Yacitse intege cyangwa ntabona |
| reason_severe_breathing_difficulty | Severe breathing difficulty | Agorwa cyane n'uruhuha |
| reason_infant_age_referral | Age under 2 months (placeholder young-infant rule) | Imyaka iri munsi ya 2 amezi (amategeko ya placeholder) |
| reason_invalid_tdr_refer | Invalid TDR — refer for repeat testing / assessment | TDR ntabwo yemewe — ohereze gukorera ikizamini cyangwa gusuzumwa |
| reason_persistent_fever_negative_tdr | Fever for 3+ days with negative TDR (placeholder follow-up) | Ubushyuhe bw'iminsi 3+ hamwe na TDR mbi (placeholder) |
| reason_default_treat_at_home | No placeholder danger sign or referral rule triggered | Nta ikimenyetso cy'akaga cyangwa itegeko ryo kohereza ryabonetse |
| next_treat_at_home | Give home care advice, schedule follow-up, and confirm the decision before closing. | TODO_REVIEW_RW: Tanga inama zo kwita mu rugo, teganya gukurikirana, wemeze icyemezo mbere yo gufunga. |
| next_refer | Prepare a referral handover and help the patient reach the health center. | TODO_REVIEW_RW: Tegeka kohereza umurwayi kandi umufashe kugera ku kigo nderabuzima. |
| next_urgent_refer | Refer urgently now. Stay with the patient if possible and call for transport help. | TODO_REVIEW_RW: Ohereze vuba. Guma hafi y'umurwayi niba bishoboka kandi hamagara ubufasha bwo gutwara. |
| confirm_reminder | Please confirm this recommendation on screen before you finish. | TODO_REVIEW_RW: Nyamuneka wemeze icyo cyifuzo kuri ekrani mbere yo kurangiza. |
| disclaimer | Decision support tool. Not a replacement for clinical judgment. | TODO_REVIEW_RW: Iyi ni igikoresho cy'ubufasha mu gufata icyemezo. Si ahantu ho gusimbura ubuvuzi. |
| prevention_nets | Sleep under an insecticide-treated bed net every night. | TODO_REVIEW_RW: Rya munsi y'urutoki rw'ibisabwa buri joro. |
| prevention_exposure | Reduce mosquito bites: cover arms and legs in the evening, clear standing water near homes. | TODO_REVIEW_RW: Gabanya ibitotsi by'inzige: ukinge intoki n'amaguru nimugoroba, kuraho amazi ahagaze hafi y'urugo. |
| prevention_early_test | Test early when fever starts — do not wait many days. | TODO_REVIEW_RW: Kora ikizamini vuba ubushyuhe buhera — ntugere ute iminsi myinshi. |
| prevention_early_care | Seek care quickly if danger signs appear or the child worsens. | TODO_REVIEW_RW: Shakira ubuvuzi vuba niba ibimenyetso by'akaga bihagaze cyangwa umwana agenda ababaye. |
| why_generic | Here is why this recommendation was made, based on the rules that were triggered. | TODO_REVIEW_RW: Dore impamvu icyifuzo cyakozwe, hashingiwe ku mategeko yabonetse. |
| what_now_generic | Here is what to do next for this recommendation. | TODO_REVIEW_RW: Dore icyo ugomba gukora ubu kuri iyi recommendation. |
| slower_hint | I will speak more slowly. | TODO_REVIEW_RW: Nzavuga buhoro. |
| repeat_hint | I will repeat the recommendation. | TODO_REVIEW_RW: Nzongera gusubiramo icyifuzo. |

**Recording tips:** 44.1 kHz mono MP3, neutral pace, ~1 s silence at start/end. Filename must match `phrase_id` exactly.
