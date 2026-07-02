import os
os.environ['AEGIS_SENSOR_BOOT'] = '1'
import aegis_exfil_sentinel

try:
    if hasattr(aegis_exfil_sentinel, 'run_sensor'):
        aegis_exfil_sentinel.run_sensor()
    elif hasattr(aegis_exfil_sentinel, 'main'):
        aegis_exfil_sentinel.main()
    elif hasattr(aegis_exfil_sentinel, 'run_exfil_sentinel'):
        aegis_exfil_sentinel.run_exfil_sentinel()
except Exception as e:
    print(f'[!] BOOTLOADER CRASH: {e}')
