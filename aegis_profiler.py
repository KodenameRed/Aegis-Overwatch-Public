import os
os.environ['AEGIS_SENSOR_BOOT'] = '1'
import aegis_profiler

try:
    if hasattr(aegis_profiler, 'run_sensor'):
        aegis_profiler.run_sensor()
    elif hasattr(aegis_profiler, 'main'):
        aegis_profiler.main()
    elif hasattr(aegis_profiler, 'run_exfil_sentinel'):
        aegis_profiler.run_exfil_sentinel()
except Exception as e:
    print(f'[!] BOOTLOADER CRASH: {e}')
