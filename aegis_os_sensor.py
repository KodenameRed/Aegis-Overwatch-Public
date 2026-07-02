import os
os.environ['AEGIS_SENSOR_BOOT'] = '1'
import aegis_os_sensor

try:
    if hasattr(aegis_os_sensor, 'run_sensor'):
        aegis_os_sensor.run_sensor()
    elif hasattr(aegis_os_sensor, 'main'):
        aegis_os_sensor.main()
    elif hasattr(aegis_os_sensor, 'run_exfil_sentinel'):
        aegis_os_sensor.run_exfil_sentinel()
except Exception as e:
    print(f'[!] BOOTLOADER CRASH: {e}')
