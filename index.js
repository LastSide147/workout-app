import {AppRegistry} from 'react-native';
// Настройки Firestore (офлайн-кэш) должны применяться до того, как
// любой экран обратится к базе — поэтому импорт первым.
import './src/firebase/firestoreConfig';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);