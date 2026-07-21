import {registerRootComponent} from 'expo';
// Настройки Firestore (офлайн-кэш) должны применяться до того, как
// любой экран обратится к базе — поэтому импорт первым.
import './src/firebase/firestoreConfig';
import App from './App';

registerRootComponent(App);