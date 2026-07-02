import os
os.environ['AEGIS_SENSOR_BOOT'] = '1'
import c2_socket

try:
    if hasattr(c2_socket, 'run_sensor'):
        c2_socket.run_sensor()
    elif hasattr(c2_socket, 'main'):
        c2_socket.main()
    elif hasattr(c2_socket, 'run_exfil_sentinel'):
        c2_socket.run_exfil_sentinel()
except Exception as e:
    print(f'[!] BOOTLOADER CRASH: {e}')
