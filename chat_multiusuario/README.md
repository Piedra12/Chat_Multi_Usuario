# Chat Multiusuario con FastAPI y WebSockets

Aplicación académica de chat en tiempo real para equipos conectados a una misma red local. No utiliza base de datos ni servicios externos.

## Requisitos
- Python 3.10 o posterior (recomendado Python 3.11+).
- VS Code o una terminal.
- Equipos conectados a la misma red local.

## Instalación en Windows
Abre una terminal en la carpeta del proyecto y ejecuta:

```powershell
py -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Si PowerShell impide activar el entorno, puedes omitir la activación y ejecutar:
```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

En el mismo equipo abre `http://127.0.0.1:8000`.

## Acceso desde otros equipos
1. En el equipo servidor abre CMD y ejecuta `ipconfig`.
2. Busca la dirección IPv4 del adaptador conectado a la red local, por ejemplo `192.168.1.25`.
3. En los demás equipos abre `http://192.168.1.25:8000`, reemplazando la IP por la real del servidor.
4. Si Windows Firewall pregunta, permite Python en redes privadas. No abras el puerto en redes públicas.
5. Cada participante ingresa un nombre y envía mensajes.

Todos los equipos deben estar en la misma red y poder comunicarse entre sí. Algunas redes de invitados aíslan los dispositivos.

## Pruebas
- Abre el chat en tres navegadores/equipos con nombres distintos.
- Envía mensajes desde cada participante y verifica que se muestren el remitente y la hora.
- Cierra una pestaña o pulsa “Salir del chat” y verifica el aviso de desconexión en los demás.
- Toma capturas reales con los tres usuarios conectados para anexarlas al informe.

## Arquitectura
Clientes (navegadores) -- WebSocket `/ws` --> Servidor FastAPI en la LAN.
El navegador obtiene la página por HTTP y mantiene una conexión WebSocket bidireccional para enviar/recibir eventos.

## Consideraciones
- Los mensajes no se guardan en una base de datos ni sobreviven al reinicio del servidor.
- Los nombres solo identifican visualmente; no hay autenticación y no deben usarse para información privada.
- El servidor genera la fecha/hora con `America/Mexico_City` por defecto. Se puede cambiar con `TZ_CHAT`.
- Para publicar en Internet se necesitarían medidas adicionales de seguridad, TLS y control de acceso.
