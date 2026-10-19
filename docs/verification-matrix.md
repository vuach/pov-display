# Матрица верификации

`PASS` обозначает физически зафиксированный результат. Расчёт, схема и
компиляция имеют самостоятельный статус и не считаются аппаратным испытанием.

| ID | Объект | Состояние | Доказательство |
|---|---|---|---|
| V-01 | Питание ESP32-C3 | PASS, 3,31–3,32 V | `tests/rev-c-power-stage-test-results.md` |
| V-02 | U2 MP1584 | PASS, 4,95–5,03 V | `tests/rev-c-power-stage-test-results.md` |
| V-03 | U3 MP1584 | PASS, 8,98 V | `tests/rev-c-power-stage-test-results.md` |
| V-04 | TX/RX при малой нагрузке | PASS, 5,31/5,25 V | `tests/rev-c-power-stage-test-results.md` |
| V-05 | Hall KY-003 | PASS, 3,29/0,01 V | `tests/bring-up-results.md` |
| V-06 | APA102, неподвижный тест | PASS, две ветви по 20 LED | `tests/bring-up-results.md` |
| V-07 | PWM ESC | PASS, 50 Hz и безопасный режим | `tests/rev-c-power-stage-test-results.md` |
| V-08 | A2212 без ротора | PASS, запуск на 1200 мкс в течение 3 с | `tests/rev-c-power-stage-test-results.md` |
| V-09 | Индуктивный канал при 0,7–0,8 A | Не подтверждено | — |
| V-10 | PCB-R2 и роторный C3 | Не изготовлены | — |
| V-11 | Статическая балансировка | Не выполнена | — |
| V-12 | Кожух | Не изготовлен | — |
| V-13 | Вращение собранного ротора | Не выполнено | — |
| V-14 | POV-синхронизация на вращении | Не выполнена | — |
