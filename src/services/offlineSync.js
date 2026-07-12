// Центральный модуль для работы с Firestore в офлайне.
//
// ПРОБЛЕМА, которую он решает:
// У @react-native-firebase/firestore запись (.set/.update/.delete/
// batch.commit()) и чтение (.get()) возвращают Promise, который
// исполняется ТОЛЬКО когда приходит подтверждение с сервера. Если
// интернета нет, сервер не отвечает — и Promise «висит» вечно, пока
// не появится сеть. Это не баг конкретно нашего кода, а особенность
// SDK (задокументированная проблема в react-native-firebase).
//
// При этом сами данные применяются в локальный кэш Firestore
// СРАЗУ, ещё до ответа сервера — то есть работа с диском уже
// сделана, просто мы об этом не узнаём вовремя, если ждём Promise
// напрямую.
//
// РЕШЕНИЕ: ждать подтверждение не бесконечно, а с таймаутом. Если
// сервер не ответил за разумное время — считаем, что данные всё
// равно сохранены локально и будут досинхронизированы Firestore
// автоматически, когда сеть появится. Настоящие ошибки (нет прав,
// неверные данные и т.п.) почти всегда приходят от сервера быстро,
// поэтому таймаут их не маскирует.

const DEFAULT_WRITE_TIMEOUT_MS = 4000;
const DEFAULT_READ_TIMEOUT_MS = 6000;

/**
 * Оборачивает Promise записи в Firestore (например batch.commit()
 * или doc.set(...)), чтобы UI не «завис» в офлайне.
 *
 * Возвращает объект:
 *  - {synced: true}              — сервер подтвердил запись
 *  - {synced: false, pending: true} — сервер не ответил за timeoutMs,
 *      данные сохранены локально и будут отправлены сами, когда
 *      появится интернет
 *  - {synced: false, error}      — Firestore вернул настоящую ошибку
 *      (например, permission-denied) до истечения таймаута
 *
 * @param {Promise} writePromise результат вызова batch.commit()/set()/... (уже начатого)
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @param {(error: Error) => void} [options.onBackgroundError] — вызовется,
 *   если ошибка от сервера придёт уже ПОСЛЕ таймаута (мы успели
 *   сказать пользователю "сохранено", а сервер спустя время всё же
 *   отклонил запись — редкий случай, но его нужно залогировать).
 */
export function saveWithOfflineFallback(writePromise, options = {}) {
  const {timeoutMs = DEFAULT_WRITE_TIMEOUT_MS, onBackgroundError} = options;

  return new Promise(resolve => {
    let settled = false;

    writePromise
      .then(() => {
        if (!settled) {
          settled = true;
          resolve({synced: true});
        }
      })
      .catch(error => {
        if (!settled) {
          settled = true;
          resolve({synced: false, error});
        } else if (onBackgroundError) {
          onBackgroundError(error);
        }
      });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({synced: false, pending: true});
      }
    }, timeoutMs);
  });
}

/**
 * Оборачивает Firestore-запрос на чтение (query.get()), чтобы он не
 * висел бесконечно в офлайне. Если сервер не ответил за timeoutMs —
 * читаем последнюю версию из локального кэша Firestore явно через
 * {source: 'cache'}.
 *
 * Возвращает обычный QuerySnapshot/DocumentSnapshot. Проверить,
 * пришли ли данные из кэша (а не с сервера), можно через
 * snapshot.metadata.fromCache.
 *
 * @param {{get: Function}} query — collection(...).doc(...) или query с методом .get()
 */
export async function getWithOfflineFallback(query, timeoutMs = DEFAULT_READ_TIMEOUT_MS) {
  try {
    return await Promise.race([
      query.get(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OFFLINE_READ_TIMEOUT')), timeoutMs),
      ),
    ]);
  } catch (error) {
    // Сеть недоступна или сервер не ответил вовремя — берём то, что
    // уже есть на диске. Если кэша тоже нет (например, первый запуск
    // приложения офлайн), .get({source: 'cache'}) сам бросит ошибку
    // firestore/unavailable — даём ей уйти выше по стеку, вызывающий
    // код должен её обработать (например, показать "Нет данных офлайн").
    return query.get({source: 'cache'});
  }
}