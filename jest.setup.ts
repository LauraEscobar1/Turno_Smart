import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

// Sin el módulo nativo, SafeAreaProvider no conoce los bordes y no renderiza a sus hijos.
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

// AsyncStorage en memoria (mock oficial de la librería).
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
