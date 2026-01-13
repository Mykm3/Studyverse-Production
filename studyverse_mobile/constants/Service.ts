import AsyncStorage from '@react-native-async-storage/async-storage';

const setUserAuth = async (user: any) => {
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

const getUserAuth = async () => {
  return await AsyncStorage.getItem('user');
};

export default {
    setUserAuth,
    getUserAuth
}
