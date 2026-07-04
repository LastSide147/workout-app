import auth from '@react-native-firebase/auth';

export async function ensureSignedIn() {
  const currentUser = auth().currentUser;
  if (currentUser) {
    return currentUser.uid;
  }
  const result = await auth().signInAnonymously();
  return result.user.uid;
}