import os
os.environ['AEGIS_SENSOR_BOOT'] = '1'
import aegis_soc_agent

try:
    if hasattr(aegis_soc_agent, 'run_sensor'):
        aegis_soc_agent.run_sensor()
    elif hasattr(aegis_soc_agent, 'main'):
        aegis_soc_agent.main()
    elif hasattr(aegis_soc_agent, 'run_exfil_sentinel'):
        aegis_soc_agent.run_exfil_sentinel()
except Exception as e:
    print(f'[!] BOOTLOADER CRASH: {e}')
