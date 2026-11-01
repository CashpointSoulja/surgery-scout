#!/usr/bin/env python3
"""Build data.js v2 (Loop 1 contract) from NHS England CBT CSVs.
Roster + identity from existing data.js (Oct 2026 registration extract).
Per-month raw fields from the July/August/September 2026 telephony returns."""
import csv, glob, json, sys

BASE = '/tmp'
MONTHS = {
  '2026-07': ('cbt-day-jul', 'cbt-ans-jul'),
  '2026-08': ('cbt-day-aug', 'cbt-ans-aug'),
  '2026-09': ('cbt-daytime', 'cbt-answered'),
}
CORE_ALLDAY = ['08:00-09:59','10:00-11:59','12:00-13:59','14:00-15:59','16:00-17:59','18:00-18:29']
B_LE120 = {'1_30','31_60','61_90','91_120'}

old = json.loads(open('/home/sandbox/surgery-scout/site/data.js').read()[len('const DATA = '):].rstrip().rstrip(';'))
roster = {p['code']: p for p in old['practices']}
print('roster', len(roster), file=sys.stderr)

pcn_code = {}   # practice -> PCN_CODE from telephony
agg = {m: {} for m in MONTHS}  # month -> code -> dict

for month, (daydir, ansdir) in MONTHS.items():
    a = agg[month]
    for f in glob.glob(f'{BASE}/{daydir}/*_Y*.csv'):
        with open(f) as fh:
            for row in csv.DictReader(fh):
                c = row['PRACTICE_CODE']
                if c not in roster: continue
                pcn_code[c] = row['PCN_CODE']
                d = a.setdefault(c, {'inbound':0.0,'missed':0.0,'answered':0.0,'ans_le30':0.0,'ans_le120':0.0,'inbound_allday':0.0,'in_day':False,'in_ans':False})
                d['in_day'] = True
                v = float(row['Value'])
                if row['Indicator'] == 'CBT001':
                    if row['Time_Category'] == '08:00-09:59': d['inbound'] += v
                    if row['Time_Category'] in CORE_ALLDAY: d['inbound_allday'] += v
                elif row['Indicator'] == 'CBT004' and row['Time_Category'] == '08:00-09:59':
                    d['missed'] += v
    for f in glob.glob(f'{BASE}/{ansdir}/*_Y*.csv'):
        with open(f) as fh:
            for row in csv.DictReader(fh):
                c = row['PRACTICE_CODE']
                if c not in roster or row['Core_Category'] != 'Core_8_10': continue
                d = a.setdefault(c, {'inbound':0.0,'missed':0.0,'answered':0.0,'ans_le30':0.0,'ans_le120':0.0,'inbound_allday':0.0,'in_day':False,'in_ans':False})
                d['in_ans'] = True
                v = float(row['Value'])
                d['answered'] += v
                if row['Wait_Time'] == '1_30': d['ans_le30'] += v
                if row['Wait_Time'] in B_LE120: d['ans_le120'] += v
    print(month, 'practices in day file:', sum(1 for d in a.values() if d['in_day']), file=sys.stderr)

def i(x): return int(round(x))
practices = []
for code, p in roster.items():
    months = {}
    for m in MONTHS:
        d = agg[m].get(code)
        if not d or not d['in_day']:
            months[m] = None
        else:
            months[m] = {
                'inbound': i(d['inbound']), 'missed': i(d['missed']),
                'answered': i(d['answered']) if d['in_ans'] else None,
                'ans_le30': i(d['ans_le30']) if d['in_ans'] else None,
                'ans_le120': i(d['ans_le120']) if d['in_ans'] else None,
                'inbound_allday': i(d['inbound_allday']),
            }
    practices.append({
        'ods': code, 'name': p['name'], 'postcode': p['pc'],
        'pcn_code': pcn_code.get(code), 'pcn_name': p['pcn'],
        'patients': p['patients'],
        'months': months,
        # v1 fields retained for reference
        'v1': {k: p.get(k) for k in ('tier','inb810','missN','miss810','fast810','inbAll','missAll')},
    })

out = {
  'meta': {
    'months': list(MONTHS),
    'sources': {
      '2026-07': {'published':'2026-08-27','answeredUrl':'https://files.digital.nhs.uk/1F/05E5D4/Cloud%20Based%20Telephony%20Calls%20Answered%20Metric%20-%20July%202026.zip','dayTimeUrl':'https://files.digital.nhs.uk/EF/2D1C19/Cloud%20Based%20Telephony%20By%20Day%20and%20Time%20-%20July%202026.zip'},
      '2026-08': {'published':'2026-09-24','answeredUrl':'https://files.digital.nhs.uk/E8/E19F21/Cloud%20Based%20Telephony%20Calls%20Answered%20Metric%20-%20August%202026.zip','dayTimeUrl':'https://files.digital.nhs.uk/06/C9A9C1/Cloud%20Based%20Telephony%20By%20Day%20and%20Time%20-%20August%202026.zip'},
      '2026-09': {'published':'2026-10-29','answeredUrl':'https://files.digital.nhs.uk/DF/67D81E/Cloud%20Based%20Telephony%20Calls%20Answered%20Metric%20-%20September%202026.zip','dayTimeUrl':'https://files.digital.nhs.uk/7E/33E844/Cloud%20Based%20Telephony%20By%20Day%20and%20Time%20-%20September%202026.zip'},
    },
    'registration': {'extract':'2026-10','url':'https://files.digital.nhs.uk/FB/7851F6/gp-reg-pat-prac-all.zip'},
  },
  'icb': old['icb'],
  'practices': practices,
}
with open('/home/sandbox/surgery-scout/site/data.js','w') as fh:
    fh.write('const DATA = ' + json.dumps(out, separators=(',',':')) + ';\n')
print('written', len(practices), 'practices', file=sys.stderr)
# spot check Balfour
b = next(p for p in practices if p['ods']=='F86042')
print(json.dumps(b['months'], indent=1), file=sys.stderr)
