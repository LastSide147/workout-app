module.exports = {
  presets: ['babel-preset-expo'],
  // Плагин react-native-reanimated ОБЯЗАТЕЛЬНО должен быть последним
  // в списке — так требует сама библиотека, иначе анимации в
  // CustomTabBar не заработают (не будет ошибки, просто тихо не
  // будет работать).
  plugins: ['react-native-reanimated/plugin'],
};
