# ADR-0023: Household Invite Tokens Hashed With SHA-256 In-Database

- **Статус:** Accepted (owner approval recorded 2026-07-24)
- **Дата:** 2026-07-24
- **Авторы:** Product owner + Data Access / Sharing
- **Связанные:** ADR-0006, ADR-0007, ADR-0008, ADR-0017, ADR-0018,
  `docs/plans/active/2026-07-23-household-invite-design.md`
- **Влияет на workstreams:** Auth | Data Access | Sharing | QA/Security

## Контекст

PUP-42 должен выдать владельцу одноразовую ссылку, по которой второй член семьи после OTP
входит в уже существующий household как caregiver. RLS запрещает клиенту напрямую создавать
invite и membership, поэтому создание, принятие и отзыв выполняют узкие authenticated-only
`SECURITY DEFINER` RPC с `search_path = ''`.

Секрет ссылки создаётся в Postgres как 256-bit CSPRNG token:
`encode(extensions.gen_random_bytes(32), 'hex')`. Пространство секрета имеет 256 бит энтропии и
не зависит от выбранного пользователем пароля.

Исходный CHECK принимал только Argon2id-строки. Argon2 нужен для замедления перебора
низкоэнтропийных паролей, но не вычисляется доступным в базе расширением `pgcrypto`. Передача
plaintext token во внешний сервис только ради Argon2 расширила бы доверенную границу и добавила
инфраструктуру.

## Рассмотренные варианты

### Вариант A — SHA-256 от 256-битного CSPRNG token в Postgres (chosen)

Хранить только `sha256:` + lowercase hex от `extensions.digest(token, 'sha256')`. Сопоставлять
фиксированный digest с колонкой `token_hash`; plaintext token returns once and is never stored or
logged.

Плюсы: полностью in-database, минимальная поверхность, 256-битная pre-image security, совместимо с
уже включённым `pgcrypto`. Минусы: SHA-256 не замедляет перебор, поэтому решение безопасно только
при неизменном CSPRNG-инварианте.

### Вариант B — Argon2id во внешней Edge Function

Плюсы: password-hash KDF. Минусы: не даёт практической защиты сверх 256-битной случайности,
выносит plaintext за пределы транзакции, требует нового deploy/runtime и усложняет атомарность.

### Вариант C — хранить plaintext token

Отклонён: чтение таблицы секретов немедленно превращалось бы в действующие приглашения.

## Решение

1. Token генерируется только как 32 байта из `extensions.gen_random_bytes`, кодируется в 64
   lowercase hex-символа и возвращается вызывающему ровно один раз.
2. В `app_private.invite_secret.token_hash` хранится только
   `sha256:` + `encode(extensions.digest(token, 'sha256'), 'hex')`.
3. CHECK `invite_secret_token_hash_format` продолжает принимать существующие
   `argon2id:` / `$argon2id$` значения и дополнительно принимает только точный формат
   `sha256:[0-9a-f]{64}`. Это спроектированное изменение контракта, а не ослабление ради зелёного
   теста.
4. Создание, принятие и отзыв доступны только через три `SECURITY DEFINER` RPC. Каждый проверяет
   `auth.uid()`, использует schema-qualified объекты, отзывает default EXECUTE у `PUBLIC` и `anon`
   и выдаёт EXECUTE только `authenticated`.
5. Invalid, unavailable и already-used имеют отдельные privacy-safe SQLSTATE. В сообщениях и логах
   нет token, email или иных пользовательских данных.
6. Принятие и создание сериализуются row locks; membership создаётся/реактивируется атомарным
   `INSERT ... ON CONFLICT`, а повторное открытие тем же принявшим пользователем идемпотентно.
7. Token-gated bootstrap из ADR-0017 обязан принять invite до обычного bootstrap, чтобы не создать
   пустой household. Выбор активного household после принятия фиксируется клиентским контрактом
   PUP-42.

## Последствия

- **Положительные:** plaintext не хранится; один SQL transaction атомарно связывает invite и
  membership; нет новой внешней инфраструктуры; существующие Argon2id-данные остаются валидными.
- **Отрицательные:** безопасность формата зависит от запрета низкоэнтропийных/пользовательских
  token; RPC являются привилегированной поверхностью и требуют pgTAP и статических guardrails.
- **Обратимость:** средняя — новые ссылки можно перестать выдавать, но сохранённые SHA-256 digests
  требуют совместимого CHECK до истечения/отзыва ссылок.
- **Триггеры пересмотра:** меняется генератор/длина token; invite становится вводимым человеком
  коротким кодом; появляется обязательная email binding; `pgcrypto` заменяется или добавляется
  проверяемый in-database KDF.

## Проверка

- Статические guardrails фиксируют формулу генерации/хеширования, сигнатуры, pinned `search_path`,
  grants и точный CHECK.
- pgTAP доказывает owner/non-owner, accept, expired/revoked/reused, direct-write denial и оба
  допустимых формата хеша.
- Plaintext token запрещён в fixtures, документации с evidence, логах и analytics.
