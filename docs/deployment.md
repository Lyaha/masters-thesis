# Запуск, розгортання й обслуговування

[Навігація](README.md) · [Безпека](security.md)

Команди нижче виконуються в PowerShell із кореня репозиторію. Приклади описують локальне середовище, не публічний сервер.

## Вимоги

- Для повного Docker-запуску: Docker Desktop із Linux containers, працездатною віртуалізацією/WSL 2, Docker Compose та PowerShell.
- Для роботи з кодом на хості: Node.js 22, pnpm 11.19.0 (версія `packageManager` у кореневому `package.json`).
- Порт 5173 має бути вільний; для dev додатково потрібні 3001 і 5432.
- Інтернет потрібен для першого завантаження образів/залежностей і live-джерел. «Тестові» можуть працювати без зовнішніх API після встановлення.

## Повний Docker-запуск

```powershell
Set-Location 'E:\Windows\Desktop\masters-thesis'
./scripts/setup.ps1
docker compose up -d --build --wait
docker compose ps
Invoke-RestMethod 'http://127.0.0.1:5173/api/health'
```

Адреса UI: `http://127.0.0.1:5173`. Очікується три `healthy`-сервіси. `/api/health` відповідає `status=ok`, але не перевіряє доступність ЄДЕБО/Eurostat.

На новому томі PostgreSQL виконає schema та seed; API застосує міграцію та створить адміністратора з `.env`. На наявному томі seed повторно не запускається. Для старого відомого пароля БД дотримуйтеся [процедури оновлення](security.md), не видаляйте том для «виправлення» запуску.

```powershell
# Подивитися останні журнали
docker compose logs --tail 100 api web db

# Оновити збірки після змін коду
docker compose up -d --build --wait

# Зупинити, зберігши іменований том
docker compose down
```

`docker compose down -v` видаляє БД; це не звичайна команда зупинки. Журнали перед передаванням третім особам перевіряйте на секрети/персональні дані.

## Налаштування оточення

| Змінна                          | Місце                                               | Призначення                                                               |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`             | Кореневий `.env`                                    | Пароль ролі `platform`, використовується Compose                          |
| `JWT_SECRET`                    | `.env` / `apps/api/.env`                            | Випадковий секрет >= 32 байтів; setup генерує 32 випадкові байти у hex    |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `.env` / `apps/api/.env`                            | Первинне створення адміністратора/обробка старого seed-пароля             |
| `DATABASE_URL`                  | У Docker складається Compose; у dev `apps/api/.env` | PostgreSQL connection string                                              |
| `PORT`                          | API                                                 | Типово 3001                                                               |
| `TRUST_PROXY`                   | API                                                 | У Compose `1` для одного nginx-hop; у прямому dev не задавати `1`         |
| `VITE_API_URL`                  | На етапі web-збірки                                 | Docker: `/api`; без налаштування web використовує `http://localhost:3001` |

Змінні `VITE_*` потрапляють у публічний JavaScript: не записуйте туди секрети. Зміна API URL потребує нової web-збірки. Кореневий `.env` для Compose і `apps/api/.env` для dotenv — окремі файли, їх значення не синхронізуються автоматично.

## Локальна розробка

Не запускайте одночасно Docker-web і Vite на 5173 або два API на 3001.

```powershell
./scripts/setup.ps1
docker compose stop web api
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db --wait
if (!(Test-Path 'apps/api/.env')) {
    Copy-Item 'apps/api/.env.example' 'apps/api/.env'
}
```

У редакторі заповніть `apps/api/.env`: перенесіть з кореневого `.env` JWT та admin-налаштування; задайте `DATABASE_URL` за шаблоном:

```text
postgresql://platform:<POSTGRES_PASSWORD>@127.0.0.1:5432/gender_platform
```

Це шаблон, не робочий пароль. Згенерований setup hex-пароль придатний для URL; довільний пароль зі спеціальними символами потребує URL-кодування.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Vite: `http://localhost:5173`, API: `http://localhost:3001/health`. Ctrl+C зупиняє dev-процеси; БД працює окремо. Для повернення до Docker спочатку зупиніть dev-процеси, потім виконайте повну Compose-команду без dev override. Це прибере публікацію БД, якщо Compose перестворить її з базовою конфігурацією; перевірте порти через `docker compose ps`.

За помилки `ERR_PNPM_UNEXPECTED_STORE` не видаляйте дані навмання: звірте версію pnpm та store, з якого вже підключено залежності. На цій робочій машині раніше використовувався локальний `.pnpm-store`; за потреби вкажіть той самий шлях через `--store-dir`.

## Резервна копія

Це інструкція для оператора; backup/restore не виконувалися під час написання документації. Архів містить персональні профілі й хеші паролів: зберігайте його поза Git з обмеженим доступом, бажано в зашифрованому сховищі.

```powershell
New-Item -ItemType Directory -Force 'work/backups' | Out-Null
$backupStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
docker compose exec -T db pg_dump -U platform -d gender_platform -Fc -f "/tmp/gender-$backupStamp.dump"
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }
docker compose cp "db:/tmp/gender-$backupStamp.dump" "work/backups/gender-$backupStamp.dump"
if ($LASTEXITCODE -ne 0) { throw 'Backup copy failed' }
docker compose exec -T db pg_restore --list "/tmp/gender-$backupStamp.dump"
```

Бінарний dump не перенаправляється через PowerShell `>`; файл створюється у контейнері й копіюється. Перелік архіву перевіряє читабельність, але не замінює відновлення. Зробіть також захищену копію конфігурації `.env` та зафіксуйте версію коду.

## Перевірка відновлення без перезапису робочої БД

Використайте значення `$backupStamp` із попереднього кроку або вкажіть ім'я конкретної наявної копії. Назва `gender_restore_check` має бути вільною; якщо БД вже існує, оберіть іншу, не видаляйте її автоматично.

```powershell
docker compose cp "work/backups/gender-$backupStamp.dump" 'db:/tmp/restore-check.dump'
if ($LASTEXITCODE -ne 0) { throw 'Restore copy failed' }
docker compose exec -T db createdb -U platform gender_restore_check
if ($LASTEXITCODE -ne 0) { throw 'Choose a new verification database name' }
docker compose exec -T db pg_restore --exit-on-error --no-owner -U platform -d gender_restore_check /tmp/restore-check.dump
if ($LASTEXITCODE -ne 0) { throw 'Restore verification failed' }
docker compose exec -T db psql -U platform -d gender_restore_check -c 'SELECT count(*) FROM gender_statistics;'
```

Порівняйте контрольні кількості й агрегати з моментом backup. Тестова БД та копії в контейнері залишаються; їх прибирання виконуйте окремо після перевірки точних назв. Відновлення робочої БД потребує зупинки записів, узгодженого перемикання та окремої резервної копії поточного стану; команди з `--clean` тут навмисно не наведені.

## Типові проблеми

| Симптом                                | Перевірка                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Docker не бачить virtualization/WSL    | Налаштування віртуалізації й компонентів Windows; після їх увімкнення потрібне перезавантаження |
| Docker engine pipe відсутній           | Запустіть Docker Desktop і дочекайтеся готовності Linux engine                                  |
| nginx завершився, API недоступний      | Запускайте `docker compose up -d --wait` для всього стеку, не лише web без залежностей          |
| Зайнято 5173                           | Зупиніть попередній Vite/інший web; не запускайте два режими одночасно                          |
| Password authentication failed         | Зміна env не змінює пароль у старому томі; див. security.md                                     |
| ЄДЕБО/Eurostat 502 або 503             | Активність/назва/URL вбудованого джерела, мережа, доступність провайдера                        |
| Порожньо у «Зареєстровані користувачі» | Перевірте поріг 5 профілів з однаковими ЗВО/спеціальністю/роком                                 |
| CSV отримує 413                        | Перевірте розмір JSON, не тільки файлу                                                          |
| Після web-зміни старий інтерфейс       | Перезберіть контейнер і оновіть вкладку                                                         |

## Перед публічним розгортанням

Локальний loopback Compose не публікує сайт для інших ПК. Не просто відкривайте порт: потрібні HTTPS, перевірений reverse proxy/trust proxy, обмеження CORS, керування секретами, політика персональних даних і видалення, backup/restore, моніторинг, оновлення залежностей та повторний аудит. Для кількох API-реплік потрібен спільний limiter; поточний кеш і лічильники в пам'яті не є розподіленими.
