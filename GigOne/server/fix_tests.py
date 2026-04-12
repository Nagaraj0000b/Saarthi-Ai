import os
import re

# Fix dailyTargetNudge.test.js
path = 'tests/nudges/dailyTargetNudge.test.js'
with open(path, 'r', encoding='utf8') as f:
    target_code = f.read()

target_code = target_code.replace('query.date. && query.date..getTime()', 'query.date.$gte && query.date.$gte.getTime()')
with open(path, 'w', encoding='utf8') as f:
    f.write(target_code)

# Fix throttleService.test.js
path = 'tests/nudges/throttleService.test.js'
with open(path, 'r', encoding='utf8') as f:
    throttle = f.read()

# Replace mockLean with properly enclosed multi-line matches
throttle = re.sub(r'mockResolvedValueOnce\((.*?)\)', r'mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(\1) })', throttle, flags=re.DOTALL)
throttle = re.sub(r'mockResolvedValue\((.*?)\)', r'mockReturnValue({ lean: jest.fn().mockResolvedValue(\1) })', throttle, flags=re.DOTALL)

with open(path, 'w', encoding='utf8') as f:
    f.write(throttle)

print('Done python fixing')
