module.exports = {
  // babel-preset-expo сам проверяет, установлен ли react-native-worklets
  // (а он установлен — это зависимость reanimated 4.x), и если да —
  // САМ добавляет плагин worklets/reanimated в список плагинов последним.
  // Раньше (на bare RN CLI без Expo-пресета) плагин reanimated
  // действительно нужно было добавлять вручную — отсюда старый комментарий.
  // Но с babel-preset-expo это дублирование: плагин worklets отрабатывал
  // дважды на каждом файле — один раз через пресет, второй раз через эту
  // строку. Двойная трансформация одного и того же worklet-кода и роняла
  // Metro с ошибкой "Cannot read properties of undefined (reading
  // 'transformFile')" на файле, где реально используются анимации
  // (CustomTabBar).
  presets: ['babel-preset-expo'],
};
