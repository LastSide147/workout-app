import auth from '@react-native-firebase/auth';

export function getCurrentUser() {
  return auth().currentUser;
}