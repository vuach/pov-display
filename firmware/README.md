# Прошивки Rev C

| Среда PlatformIO | Контроллер | Назначение |
|---|---|---|
| `stationary-final-c3` | неподвижный ESP32-C3 SuperMini | Управление ESC кнопками ARM и STOP |
| `rotor-final-c3` | роторный ESP32-C3 SuperMini | Hall-синхронизация и вывод на 40 APA102 |

Обе среды используют `espressif32@6.8.1` и собираются в PlatformIO.

## Неподвижный контроллер

- GPIO6 — PWM ESC;
- GPIO20 — ARM;
- GPIO21 — STOP;
- PWM 50 Hz, безопасное состояние 1000 мкс;
- рабочий диапазон 1030–1120 мкс.

## Роторный контроллер

- GPIO4 — DATA в SN74AHCT125;
- GPIO5 — CLOCK в SN74AHCT125;
- GPIO6 — Hall;
- 40 APA102;
- при отсутствии корректного Hall-индекса LED выключаются.
