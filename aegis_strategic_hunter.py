import os
os.environ['AEGIS_SENSOR_BOOT'] = '1'
import aegis_strategic_hunter

try:
    if hasattr(aegis_strategic_hunter, 'run_sensor'):
        aegis_strategic_hunter.run_sensor()
    elif hasattr(aegis_strategic_hunter, 'main'):
        aegis_strategic_hunter.main()
    elif hasattr(aegis_strategic_hunter, 'run_exfil_sentinel'):
        aegis_strategic_hunter.run_exfil_sentinel()
except Exception as e:
    print(f'[!] BOOTLOADER CRASH: {e}')
