import { StyleSheet, Text, View } from 'react-native';

// Placeholder hasta que lleguen las pantallas reales (T4/T5).
export default function Inicio() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header">Diverso</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
