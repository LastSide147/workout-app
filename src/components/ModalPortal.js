import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

// Свой собственный "портал" — без сторонних библиотек.
//
// ЗАЧЕМ ОН ПОНАДОБИЛСЯ. Встроенный <Modal> из react-native на Android
// рисует содержимое в ОТДЕЛЬНОМ системном окне (Android Dialog). У
// этого окна своя логика реакции на системную клавиатуру, которую
// нельзя настроить ни из JS, ни через app.json/AndroidManifest. Когда
// пользователь нажимает "Сохранить"/"Отмена" в модалке ввода
// повторений при открытой клавиатуре, происходит вот что: клавиатура
// начинает закрываться, и синхронно с этим системное окно диалога
// само сдвигается/меняет размер — ПРЯМО ВО ВРЕМЯ касания пальцем.
// Android в этот момент считает, что элемент под пальцем "уехал", и
// отменяет уже начавшееся нажатие. Поэтому первое нажатие пропадает
// впустую (клавиатура просто закрывается), а срабатывает только
// второе — когда всё уже устоялось. Это подтверждённое ограничение
// именно Dialog-окна на Android, ScrollView/keyboardShouldPersistTaps
// его не лечит (это лекарство от другой, JS-уровневой проблемы).
//
// КАК ЭТО РЕШАЕТ Portal. Здесь "поверх всего" — это НЕ отдельное
// системное окно, а обычный View с абсолютным позиционированием
// внутри одного общего контейнера (Host), один раз примонтированного
// в корне приложения (см. App.js). Раз это обычный View в общем
// дереве экрана — никакого отдельного Android-окна не создаётся,
// значит и гонки между закрытием клавиатуры и нажатием кнопки просто
// неоткуда взяться: кнопка Save/Cancel и поле ввода живут в одном и
// том же, никогда не пересоздающемся окне.
const PortalContext = createContext(null);

let nextPortalId = 0;

// Host монтируется ОДИН РАЗ у корня приложения (в App.js) и оборачивает
// вообще всё дерево экранов. Внутри себя он держит список активных
// порталов (обычно один — открытая модалка) и рисует их поверх
// остального содержимого через position: 'absolute'.
export function Host({children}) {
  const [portals, setPortals] = useState({});

  const contextValue = useMemo(
    () => ({
      addPortal: (id, node) => {
        setPortals(current => ({...current, [id]: node}));
      },
      removePortal: id => {
        setPortals(current => {
          const next = {...current};
          delete next[id];
          return next;
        });
      },
    }),
    [],
  );

  const portalIds = Object.keys(portals);

  return (
    <PortalContext.Provider value={contextValue}>
      <View style={styles.host}>
        {children}
        {portalIds.map(id => (
          <View key={id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {portals[id]}
          </View>
        ))}
      </View>
    </PortalContext.Provider>
  );
}

// Portal — то, что реально используется в компонентах с модалками
// (см. EditRepsModal в DayEditor.js). Сам он ничего не рисует на своём
// месте в дереве (возвращает null) — вместо этого регистрирует свои
// children в ближайшем Host, который и рисует их поверх всего экрана.
export function Portal({children}) {
  const context = useContext(PortalContext);
  const [id] = useState(() => {
    nextPortalId += 1;
    return `portal-${nextPortalId}`;
  });

  useEffect(() => {
    if (!context) {
      // Host не найден выше по дереву — значит забыли обернуть
      // корень приложения в <Host> (см. App.js). Явная ошибка в
      // консоли лучше, чем модалка, которая тихо нигде не появится.
      console.error('Portal использован без обёртки <Host> в корне приложения');
      return undefined;
    }
    context.addPortal(id, children);
    return () => context.removePortal(id);
  }, [context, id, children]);

  return null;
}

const styles = StyleSheet.create({
  host: {flex: 1},
});
