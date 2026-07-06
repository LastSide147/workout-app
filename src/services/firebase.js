import auth from '@react-native-firebase/auth';
export async function ensureSignedIn() {
  const user = auth().currentUser;
  return user ? user.uid : null;
}

export function getCurrentUser() {
  return auth().currentUser;
}