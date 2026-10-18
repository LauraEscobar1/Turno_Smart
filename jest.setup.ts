import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

// Sin el módulo nativo, SafeAreaProvider no conoce los bordes y no renderiza a sus hijos.
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
